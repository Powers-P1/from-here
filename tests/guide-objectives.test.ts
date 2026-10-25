import { describe, expect, it } from 'vitest';
import { guideObjective, guideArtifactKey, type GuideProgress } from '../src/features/guide-objectives';

const passed: GuideProgress = {
  jobId: 'notice-a', hasFacts: true, phase: 'passed', artifactHash: 'svg-a',
  checkedArtifactHash: 'svg-a', passed: true,
  checksInspectedFor: null, pdfDownloadedFor: null,
};

describe('the walkthrough follows real outcomes', () => {
  it('cannot skip upload, extraction or a successful check', () => {
    expect(guideObjective({ ...passed, jobId: null })).toBe(0);
    expect(guideObjective({ ...passed, hasFacts: false })).toBe(1);
    for (const phase of ['review', 'planning', 'checking', 'stopped', 'interrupted'] as const)
      expect(guideObjective({ ...passed, phase })).toBe(2);
    expect(guideObjective({ ...passed, passed: false })).toBe(2);
    expect(guideObjective({ ...passed, checkedArtifactHash: 'older-svg' })).toBe(2);
  });

  it('requires inspecting and exporting this job and this checked artifact', () => {
    const key = guideArtifactKey('notice-a', 'svg-a');
    expect(guideObjective(passed)).toBe(3);
    expect(guideObjective({ ...passed, pdfDownloadedFor: key })).toBe(3);
    expect(guideObjective({ ...passed, checksInspectedFor: key })).toBe(4);
    expect(guideObjective({ ...passed, checksInspectedFor: key, pdfDownloadedFor: key })).toBe(5);
    expect(guideObjective({ ...passed, checksInspectedFor: guideArtifactKey('notice-b', 'svg-a') })).toBe(3);
    expect(guideObjective({ ...passed, checksInspectedFor: key, pdfDownloadedFor: guideArtifactKey('notice-a', 'older-svg') })).toBe(4);
  });
});
