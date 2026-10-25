import { FIELD_LABELS, type PublicJob } from '../../shared/contracts';
import { BackLink, Button, Heading, TextButton } from '../ui/Controls';
import { CHECK_EXPLANATION } from './Progress';

export function Checks({ job, onResult, onGlance, onDownload }: { job: PublicJob; onResult: () => void; onGlance: () => void; onDownload: () => void }) {
  const report = job.report!;
  const hasQuestion = job.facts?.where.status === 'known' || job.facts?.what.status === 'known';
  return <section className="checks-view" data-view="M14" data-desktop-view="D06">
    <div className="checks-toolbar desktop-only"><BackLink guideTarget="back-result" onClick={onResult}>Back to comparison</BackLink><Button onClick={onDownload}>Download PDF</Button></div>
    <div className="checks-layout"><div className="checks-content"><Heading title="What was checked" />
      <div className="mobile-check-sections"><details><summary>Important details and conditions · {report.content ? 'Matched' : 'Needs review'}</summary><p>The sign keeps the confirmed details and their conditions.</p></details><details><summary>Layout · {report.layout ? 'Passed' : 'Needs review'}</summary><p>{report.layout ? 'The text fits the A3 page, with margins and no overlapping text.' : 'The layout needs another review.'}</p></details></div>
      <div className="checks-summary desktop-only"><span>Important details and conditions: <strong>{report.content ? 'Matched' : 'Needs review'}</strong></span><span>Layout: <strong>{report.layout ? 'Passed' : 'Needs review'}</strong></span></div>
      <details className="readback-details" open><summary>AI read from the sign · {report.matched} of {report.total}</summary><div className="evidence-table-wrap"><table className="evidence-table"><thead><tr><th>Detail</th><th>Your details</th><th>AI read from the sign</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.key}><th scope="row">{FIELD_LABELS[row.key]}</th><td>{row.expected || 'Not stated'}</td><td className={!row.passed ? 'warning-text' : ''}>{row.observed || 'Not read'}{!row.passed ? <span className="sr-only"> — did not match</span> : null}</td></tr>)}</tbody></table></div></details>
    </div><aside className="changes-section"><h2>Changes made</h2><ol className="changes-list">{job.history.map(event => <li key={event.id}><span className={`event-dot event-${event.type}`} aria-hidden="true" /><div><p>{event.text}</p><span className="help-text">{new Date(event.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}{event.attempt ? ` · Layout ${event.attempt}` : ''}</span></div></li>)}</ol><div className="checks-explanation"><p className="help-text">{CHECK_EXPLANATION}</p>{hasQuestion ? <TextButton onClick={onGlance}>Try a memory check</TextButton> : null}</div></aside></div>
    <Button data-guide-target="back-result" className="mobile-only back-result-button" onClick={onResult}>Back to result</Button>
  </section>;
}
