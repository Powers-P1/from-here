import type { FactGroup, PublicJob } from '../../shared/contracts';

export type MainView = 'upload' | 'facts' | 'progress' | 'result' | 'checks' | 'glance';
export type ResultTab = 'original' | 'redesigned';
type EditOverlay = { kind: 'edit'; field: FactGroup };
type DownloadOverlay = { kind: 'download'; status: 'preparing' | 'started' | 'error'; format: 'pdf' | 'svg'; draft: boolean; filename?: string; message?: string };
export type Overlay = EditOverlay | DownloadOverlay | { kind: 'reset'; file?: File; opener?: EditOverlay | DownloadOverlay };
export interface WorkflowState {
  job: PublicJob | null;
  distance: 1 | 3 | 5;
  view: MainView;
  tab: ResultTab;
  overlay: Overlay | null;
  sourceOpen: boolean;
  pending: string | null;
  requestId: number;
  error: string | null;
  connectionError: string | null;
  fileIssue: { name: string; message: string } | null;
}
export const initialState: WorkflowState = { job: null, distance: 3, view: 'upload', tab: 'redesigned', overlay: null,
  sourceOpen: false, pending: null, requestId: 0, error: null, connectionError: null, fileIssue: null };

export type Action =
  | { type: 'BEGIN'; requestId: number; label: string }
  | { type: 'JOB'; job: PublicJob; requestId?: number; navigate?: boolean }
  | { type: 'FINISH'; requestId: number }
  | { type: 'ERROR'; message: string | null; connection?: boolean }
  | { type: 'VIEW'; view: MainView }
  | { type: 'DISTANCE'; distance: 1 | 3 | 5 }
  | { type: 'TAB'; tab: ResultTab }
  | { type: 'OVERLAY'; overlay: Overlay | null }
  | { type: 'SOURCE'; open: boolean }
  | { type: 'FILE_ISSUE'; issue: WorkflowState['fileIssue'] }
  | { type: 'RESET'; requestId: number };

export function phaseView(job: PublicJob): MainView {
  if (job.phase === 'uploaded') return 'upload';
  if (job.phase === 'review') return 'facts';
  if (job.phase === 'passed') return 'result';
  return 'progress';
}
export function activePhase(job: PublicJob | null) {
  return job !== null && ['reading', 'planning', 'rendering', 'checking', 'repairing'].includes(job.phase);
}
export function workflowReducer(state: WorkflowState, action: Action): WorkflowState {
  switch (action.type) {
    case 'BEGIN': return { ...state, pending: action.label, requestId: action.requestId, error: null, connectionError: null };
    case 'JOB':
      if (action.requestId !== undefined && action.requestId !== state.requestId) return state;
      return { ...state, job: action.job, distance: action.job.distance, view: action.navigate === false ? state.view : phaseView(action.job), fileIssue: null, connectionError: null };
    case 'FINISH': return action.requestId === state.requestId ? { ...state, pending: null } : state;
    case 'ERROR': return action.connection ? { ...state, connectionError: action.message } : { ...state, error: action.message };
    case 'VIEW': return { ...state, view: action.view, error: null, fileIssue: null };
    case 'DISTANCE': return { ...state, distance: action.distance };
    case 'TAB': return { ...state, tab: action.tab };
    case 'OVERLAY': return { ...state, overlay: action.overlay?.kind === 'reset' && state.overlay && state.overlay.kind !== 'reset'
      ? { ...action.overlay, opener: state.overlay } : action.overlay, error: null };
    case 'SOURCE': return { ...state, sourceOpen: action.open };
    case 'FILE_ISSUE': return { ...state, fileIssue: action.issue, error: null };
    case 'RESET': return { ...initialState, distance: state.distance, requestId: action.requestId };
  }
}
