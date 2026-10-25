import { useEffect, useState, type FormEvent } from 'react';
import { isKnown, type NoticeFacts, type PublicJob } from '../../shared/contracts';
import { previewUrl } from '../workflow/api';
import { Button, ErrorMessage, Header, Heading, Paper, TextButton } from '../ui/Controls';

type Stage = 'intro' | 'countdown' | 'exposure' | 'question' | 'correct' | 'wrong';

function questionFor(facts: NoticeFacts) {
  const where = isKnown(facts.where);
  const pickup = /pickup|collection/i.test(facts.what.value);
  const entrance = where && /entrance/i.test(facts.where.value);
  return { where, answer: where ? facts.where.value : facts.what.value,
    title: where ? entrance ? 'Which entrance?' : 'Where should people go?' : 'What should people do?',
    subtitle: where ? pickup ? 'Where does general pickup take place?' : 'What location did the sign give?' : 'What was the main instruction on the sign?',
    success: where ? entrance ? 'You recalled the entrance.' : 'You recalled the location.' : 'You recalled the instruction.',
    label: where ? pickup ? 'General pickup:' : 'Location:' : 'Instruction:',
    explanation: where ? pickup ? 'Matches the general pickup location.' : 'Matches the location on the sign.' : 'Matches the main instruction on the sign.' };
}

const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\b(the|at|to)\b/g, '').replace(/\s+/g, ' ').trim();
function matchesAnswer(answer: string, expected: string) {
  const entered = normalize(answer);
  const confirmed = normalize(expected);
  if (entered === confirmed) return true;
  // A direction or room number is enough when the repeated location noun is omitted.
  const identifiers = confirmed.split(' ').filter(word => !['entrance', 'room', 'hall'].includes(word));
  return identifiers.length > 0 && identifiers.join(' ') === entered;
}

export function Glance({ job, priorAttempt, onStart, onResult }: { job: PublicJob; priorAttempt: boolean; onStart: () => void; onResult: () => void }) {
  const [stage, setStage] = useState<Stage>('intro');
  const [remaining, setRemaining] = useState(3);
  const [answer, setAnswer] = useState('');
  const [practice, setPractice] = useState(priorAttempt);
  const [ready, setReady] = useState(false);
  const [imageError, setImageError] = useState('');
  const question = questionFor(job.facts!);

  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.onload = () => { if (alive) setReady(true); };
    image.onerror = () => { if (alive) setImageError('The sign could not be opened. Return to the result and try again.'); };
    image.src = previewUrl(job);
    return () => { alive = false; image.onload = null; image.onerror = null; };
  }, [job.id, job.artifactHash]);

  useEffect(() => {
    if (stage !== 'countdown' && stage !== 'exposure') return;
    const timer = setTimeout(() => {
      if (remaining > 1) setRemaining(value => value - 1);
      else if (stage === 'countdown') { setRemaining(2); setStage('exposure'); }
      else { setStage('question'); setRemaining(0); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [stage, remaining]);

  const start = () => { onStart(); setRemaining(3); setAnswer(''); setStage('countdown'); };
  const repeat = () => { setPractice(true); start(); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (answer.trim()) setStage(matchesAnswer(answer, question.answer) ? 'correct' : 'wrong'); };
  const focused = ['countdown', 'exposure', 'question'].includes(stage);
  const view = ({ intro: 'M18', countdown: 'M24', exposure: 'M19', question: 'M20', correct: 'M21', wrong: 'M22' } as const)[stage];

  return <div className={`glance-page stage-${stage}`} data-view={view} data-desktop-view={stage === 'question' ? 'D08' : undefined}>
    <Header onBack={!focused ? onResult : undefined} onClose={focused ? onResult : undefined} timer={stage === 'exposure' ? `${remaining} s` : undefined} solo={focused} />
    {stage === 'intro' ? <main className="glance-intro"><Heading title="A quick memory check." /><p className="two-seconds">2 seconds</p><p>Show the sign to someone who has not seen it. Then ask one question.</p><p className="muted">{practice ? 'You have already seen this sign. This repeat is practice.' : 'If you already know it, this is practice.'}</p><div className="glance-intro-actions"><ErrorMessage>{imageError}</ErrorMessage><Button icon="arrow" onClick={start} disabled={!ready}>Show the sign</Button><TextButton className="center-link" onClick={onResult}>Back to result</TextButton></div></main>
      : stage === 'countdown' ? <main className="glance-countdown"><h1>Get ready</h1><strong aria-live="polite">{remaining}</strong><p>The sign appears next.</p>{practice ? <p className="help-text">Practice</p> : null}</main>
      : stage === 'exposure' ? <main className="glance-exposure"><Paper src={previewUrl(job)} alt="Read the sign" /></main>
      : stage === 'question' ? <main className="glance-question"><Heading title={question.title} subtitle={question.subtitle} />{practice ? <p className="help-text">Practice</p> : null}<form onSubmit={submit}><label className="sr-only" htmlFor="glance-answer">Your answer</label><input id="glance-answer" autoFocus value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Type your answer" autoComplete="off" maxLength={240} /><Button type="submit" disabled={!answer.trim()}>Check answer</Button></form><TextButton onClick={onResult}>End check</TextButton></main>
      : <main className="glance-feedback"><Heading title={stage === 'correct' ? question.success : 'One detail to revisit.'} /><dl className="answer-rows"><div><dt>Your answer:</dt><dd>{answer}</dd></div>{stage === 'wrong' ? <div><dt>{question.label}</dt><dd>{question.answer}</dd></div> : null}</dl><p>{stage === 'correct' ? question.explanation : question.where && job.facts!.exception.status === 'known' ? `${job.facts!.exception.instruction} applies to ${job.facts!.exception.condition.toLowerCase()}.` : 'Review the sign and its main instruction before trying again.'}</p><Button icon={stage === 'wrong' ? 'arrow' : undefined} onClick={stage === 'correct' ? onResult : repeat}>{stage === 'correct' ? 'Back to result' : 'View the sign again'}</Button><TextButton className="center-link" onClick={stage === 'correct' ? repeat : onResult}>{stage === 'correct' ? 'Try again as practice' : 'Back to result'}</TextButton><p className="help-text center-text">{stage === 'correct' ? 'This is a memory check on this screen.' : 'You now know the answer. A repeat is practice.'}</p></main>}
  </div>;
}
