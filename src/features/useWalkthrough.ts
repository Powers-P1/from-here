import { useState } from 'react';
import type { PublicJob } from '../../shared/contracts';
import type { WorkflowState } from '../workflow/reducer';
import { guideArtifactKey, guideObjective } from './guide-objectives';

const checkedKey = (job: PublicJob | null) => job?.phase === 'passed' && job.report?.passed &&
  job.artifactHash && job.report.checkedArtifactHash === job.artifactHash
  ? guideArtifactKey(job.id, job.artifactHash) : null;

export function useWalkthrough(state: WorkflowState) {
  const [enabled, setEnabled] = useState(() => new URLSearchParams(window.location.search).get('walkthrough') === '1');
  const [checksInspectedFor, setChecksInspectedFor] = useState<string | null>(null);
  const [pdfDownloadedFor, setPdfDownloadedFor] = useState<string | null>(null);
  const job = state.job;
  const step = guideObjective({
    jobId: job?.id ?? null, hasFacts: Boolean(job?.facts), phase: job?.phase ?? null,
    artifactHash: job?.artifactHash ?? null, checkedArtifactHash: job?.report?.checkedArtifactHash ?? null,
    passed: job?.report?.passed === true, checksInspectedFor, pdfDownloadedFor,
  });
  const exit = () => {
    setEnabled(false);
    const url = new URL(window.location.href); url.searchParams.delete('walkthrough');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  };
  return {
    enabled, step, exit,
    inspectChecks: () => { if (enabled) setChecksInspectedFor(checkedKey(job)); },
    recordPdfDownload: (exportedJob: PublicJob) => { if (enabled) setPdfDownloadedFor(checkedKey(exportedJob)); },
  };
}
