import type { PublicJob } from '../../shared/contracts';
import { previewUrl, sourceUrl } from '../workflow/api';
import { Button, ErrorMessage, Heading, Paper, Spinner, Step, TextButton } from '../ui/Controls';
import { SourceSummary } from './Facts';

export const CHECK_EXPLANATION = 'This checks AI reading. It does not show how people will read the sign.';

export function failedDetail(job: PublicJob) {
  const row = job.report?.rows.find(item => !item.passed);
  if (!row) return job.report?.issues[0] ?? 'The sign did not pass all automatic checks.';
  const detail = row.key === 'exception' ? /wheelchair/i.test(row.expected) ? 'the wheelchair pickup note' : 'the conditional instruction'
    : row.key === 'when' ? 'the date and time' : row.key === 'who' ? 'who the notice is for' : row.key === 'where' ? 'the destination' : 'the main instruction';
  return `The AI check could not read ${detail}.`;
}

export function Progress({ job, pending, connectionError, error, onCancel, onRetry, onReview, onDraft, onSource, onReplace }: { job: PublicJob; pending: boolean; connectionError: string | null; error: string | null; onCancel: () => void; onRetry: () => void; onReview: () => void; onDraft: () => void; onSource: () => void; onReplace: () => void }) {
  const interrupted = job.phase === 'interrupted' || Boolean(connectionError);
  const stopped = job.phase === 'stopped';
  const reading = job.phase === 'reading';
  const unsupported = job.extraction !== null && !job.extraction.supported;
  const repairing = (job.phase === 'repairing' || job.repairCount > 0) && !interrupted && !stopped;
  const latestCheck = job.history.findLastIndex(event => event.type === 'check');
  const latestRepair = job.history.findLastIndex(event => event.type === 'repair');
  const repairNumber = job.phase === 'repairing' && latestCheck > latestRepair ? Math.min(2, job.repairCount + 1) : job.repairCount;
  const failedException = job.report?.rows.some(row => row.key === 'exception' && !row.passed);
  const title = interrupted ? (job.interruptedPhase === 'reading' || !job.facts ? 'Reading was interrupted.' : 'The check was interrupted.')
    : stopped ? 'This needs your review.' : reading ? 'Reading your notice.' : repairing ? failedException ? 'Making the exception clearer.' : 'Making the sign clearer.' : 'Creating your sign.';

  if (interrupted) return <section className="interrupted-view" data-view="M11"><Heading title={title} subtitle="This step could not finish. Your notice and details are kept." />
    <SourceSummary job={job} onSource={onSource} /><ErrorMessage>{connectionError ?? job.error ?? error}</ErrorMessage>
    <div className="recovery-actions"><Button data-guide-target="retry" onClick={onRetry} disabled={pending}>{pending ? 'Reconnecting…' : 'Try again'}</Button><TextButton className="center-link" onClick={onReview}>{job.facts ? 'Back to details' : 'Back to notice'}</TextButton></div>
  </section>;

  if (reading) return <section className="reading-view" data-view="M04"><Heading title={title} /><div className="reading-layout"><div><Paper src={sourceUrl(job)} alt={`Original notice: ${job.name}`} /><p className="reading-filename">{job.name}</p></div><div className="reading-status"><p>Finding the important details…</p><div className="indeterminate-progress" role="status" aria-label="Finding the important details" /><ErrorMessage>{error}</ErrorMessage><TextButton onClick={onCancel} disabled={pending}>Cancel</TextButton></div></div></section>;

  return <section className={`progress-view ${stopped ? 'stopped-view' : ''}`} data-view={stopped ? 'M10' : repairing ? 'M09' : 'M08'} data-desktop-view={stopped ? 'D04' : 'D03'}>
    <p className="sr-only" role="status">{stopped ? 'Automatic checks not passed.' : job.phase === 'checking' ? 'Checking the details on the sign.' : job.phase === 'rendering' ? 'Rendering the preview.' : job.phase === 'repairing' ? `Repair ${repairNumber} of 2. Adjusting the layout.` : 'Planning the layout.'}</p>
    <Heading title={title} subtitle={stopped || repairing ? unsupported ? job.extraction!.reason : failedDetail(job) : undefined} />
    <div className="progress-layout"><div className="progress-media">{stopped ? <h2 className="desktop-only section-label">Current A3 draft</h2> : null}
      {job.artifactHash ? <Paper src={previewUrl(job)} alt="Current generated A3 sign, checks in progress" /> : <div className="awaiting-artifact"><Spinner label="Preparing the sign" /><p>{unsupported ? 'This source needs another photo.' : 'Preparing your A3 sign…'}</p><TextButton onClick={onSource}>View original</TextButton></div>}
    </div><div className="progress-details">
      {stopped ? <><h2 className="check-stop-title">Automatic checks not passed</h2>{job.report ? <dl className="report-summary"><div><dt>Important details and conditions</dt><dd>{job.report.content ? 'Matched' : 'Needs review'}</dd></div><div><dt>AI read from the sign</dt><dd>{job.report.matched} of {job.report.total} answers</dd></div></dl> : null}<p className="help-text">{CHECK_EXPLANATION}</p><ErrorMessage>{error}</ErrorMessage><Button data-guide-target="review" onClick={unsupported ? onReplace : onReview} disabled={pending}>{unsupported ? 'Choose another photo' : 'Review confirmed details'}</Button>{job.artifactHash ? <TextButton className="center-link" onClick={onDraft}>Download draft SVG (unchecked)</TextButton> : null}</>
        : <>{repairing ? <><h2 className="repair-count">Repair {repairNumber} of 2</h2><p className="muted">Updating the layout before checking again.</p></> : null}
          <ol className="progress-steps" aria-label="Creating the sign"><Step status={job.phase === 'planning' || job.phase === 'repairing' ? 'active' : 'complete'}>{job.phase === 'planning' ? 'Planning the layout…' : job.phase === 'repairing' ? 'Adjusting the layout…' : 'Layout prepared'}</Step><Step status={job.phase === 'rendering' ? 'active' : job.phase === 'checking' ? 'complete' : 'waiting'}>{job.phase === 'checking' ? 'Preview rendered' : 'Rendering the preview…'}</Step><Step status={job.phase === 'checking' ? 'active' : 'waiting'}>Checking the details{job.phase === 'checking' ? '…' : ''}</Step></ol>
          <ErrorMessage>{error}</ErrorMessage><TextButton className="center-link" onClick={onCancel} disabled={pending}>Cancel and review details</TextButton>
        </>}
    </div></div>
  </section>;
}
