import type { JobPhase } from '../../shared/contracts';

export interface GuideProgress {
  jobId: string | null;
  hasFacts: boolean;
  phase: JobPhase | null;
  artifactHash: string | null;
  checkedArtifactHash: string | null;
  passed: boolean;
  checksInspectedFor: string | null;
  pdfDownloadedFor: string | null;
}

export const guideArtifactKey = (jobId: string, hash: string) => `${jobId}:${hash}`;

/** Progress follows completed product outcomes, never a Next click or a timer. */
export function guideObjective(progress: GuideProgress): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!progress.jobId) return 0;
  if (!progress.hasFacts) return 1;
  if (progress.phase !== 'passed' || !progress.passed || !progress.artifactHash ||
      progress.artifactHash !== progress.checkedArtifactHash) return 2;
  const key = guideArtifactKey(progress.jobId, progress.artifactHash);
  if (progress.checksInspectedFor !== key) return 3;
  if (progress.pdfDownloadedFor !== key) return 4;
  return 5;
}
