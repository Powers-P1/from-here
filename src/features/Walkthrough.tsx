import { useEffect, useId, useRef } from 'react';
import type { JobPhase } from '../../shared/contracts';
import type { MainView } from '../workflow/reducer';
import { useWalkthroughTarget } from './useWalkthroughTarget';
import './walkthrough.css';

const steps = [
  ['Choose a notice.', 'Use the sample, or choose your own English PNG or JPG. You perform every step yourself.'],
  ['Let AI read the photo.', 'Choose Find key details. Wait for the actual photo to be read; this is a live AI run.'],
  ['Confirm what matters.', 'Compare the facts with the photo, especially any exception. Edit if needed, then choose Confirm & redesign. If a check stops, follow the recovery message.'],
  ['Inspect the check.', 'Open Details (on mobile) or View checks and changes. Compare the five readings, including the conditional instruction.'],
  ['Download your sign.', 'Choose Back to result, then Download PDF. Keep the file: this demo does not save projects.'],
  ['Your PDF download has started.', 'Keep the downloaded file. Print at Actual size on A3 paper. AI checks do not replace checking the sign with its readers.'],
] as const;

export function Walkthrough({ step, onExit, view, phase, blocked, tab }: { step: 0 | 1 | 2 | 3 | 4 | 5; onExit: () => void; view: MainView; phase?: JobPhase; blocked: boolean; tab: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const taskId = useId();
  const target = useWalkthroughTarget(step, view, phase, blocked, taskId, tab);
  const working = ['reading', 'planning', 'rendering', 'checking', 'repairing'].includes(phase ?? '');
  const [title, task] = phase === 'interrupted' ? ['Reconnect to continue.', 'Use Try again to resume. Your notice and details are kept; an interrupted run does not complete this step.']
    : phase === 'stopped' ? ['Review the check.', 'Automatic checks did not pass. Review the confirmed details or choose a clearer photo. An unchecked draft does not complete this walkthrough.']
    : working ? [phase === 'reading' ? 'Reading the actual photo.' : 'Checking the new sign.', 'Wait for the real AI run to finish. A failed or interrupted check will not complete this step.'] : steps[step];
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (document.querySelector('dialog[open]')) return;
      heading.current?.focus({ preventScroll: true });
      heading.current?.closest('aside')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || document.querySelector('dialog[open]')) return;
      event.preventDefault(); onExit();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onExit]);
  return <aside className="walkthrough" aria-label="Guided walkthrough">
    <div className="walkthrough-top"><span>{step === 5 ? 'Walkthrough complete' : `Walkthrough · ${step + 1} of 5`}</span>
      <button type="button" className="text-button" onClick={onExit}>{step === 5 ? 'Finish' : 'Exit walkthrough'}</button></div>
    <div aria-live="polite" aria-atomic="true"><h2 ref={heading} tabIndex={-1}>{title}</h2><p id={taskId}>{task}</p></div>
    {target.available ? <button type="button" className="text-button walkthrough-target-link" onClick={target.show}>Show me where</button> : null}
  </aside>;
}
