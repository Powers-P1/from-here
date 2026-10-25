import { useEffect, useRef } from 'react';
import { useWorkflow } from './workflow/useWorkflow';
import { errorMessage, exportNotice } from './workflow/api';
import { activePhase } from './workflow/reducer';
import { Header, Modal } from './ui/Controls';
import { Upload } from './features/Upload';
import { EditFact, Facts } from './features/Facts';
import { Progress } from './features/Progress';
import { Result } from './features/Result';
import { Checks } from './features/Checks';
import { DownloadDialog, ResetDialog } from './features/Dialogs';
import { SourceViewer } from './features/SourceViewer';
import { Glance } from './features/Glance';

export function App() {
  const workflow = useWorkflow();
  const { state, dispatch, act, reset } = workflow;
  const { job, view, overlay } = state;
  const fileInput = useRef<HTMLInputElement>(null);
  const downloadController = useRef<AbortController | null>(null);
  const downloadId = useRef(0);
  const glanceAttempts = useRef(new Set<string>());
  const source = () => dispatch({ type: 'SOURCE', open: true });
  const closeOverlay = () => {
    if (state.pending === 'facts') return;
    ++downloadId.current; downloadController.current?.abort(); dispatch({ type: 'OVERLAY', overlay: overlay?.kind === 'reset' ? overlay.opener ?? null : null });
  };
  const replace = () => fileInput.current?.click();
  const newNotice = () => dispatch({ type: 'OVERLAY', overlay: { kind: 'reset' } });

  useEffect(() => () => { ++downloadId.current; downloadController.current?.abort(); }, []);
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (view !== 'upload') heading?.focus({ preventScroll: true });
  }, [view]);

  const download = async (format: 'pdf' | 'svg', draft = false) => {
    if (!job) return;
    const id = ++downloadId.current;
    downloadController.current?.abort();
    const controller = new AbortController();
    downloadController.current = controller;
    dispatch({ type: 'OVERLAY', overlay: { kind: 'download', status: 'preparing', format, draft } });
    try {
      const file = await exportNotice(job, format, controller.signal, draft);
      if (controller.signal.aborted || id !== downloadId.current) return;
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      dispatch({ type: 'OVERLAY', overlay: { kind: 'download', status: 'started', format, draft, filename: file.filename } });
    } catch (error) {
      if (!controller.signal.aborted && id === downloadId.current) dispatch({ type: 'OVERLAY', overlay: { kind: 'download', status: 'error', format, draft, message: errorMessage(error) } });
    }
  };

  const review = async () => {
    if (job?.phase === 'interrupted' || activePhase(job)) { await act('cancel'); return; }
    dispatch({ type: 'VIEW', view: job?.facts ? 'facts' : 'upload' });
  };
  const back = () => {
    if (state.fileIssue) { dispatch({ type: 'FILE_ISSUE', issue: null }); return; }
    if (view === 'checks') { dispatch({ type: 'VIEW', view: 'result' }); return; }
    if (view === 'progress') { void review(); return; }
    if (view === 'facts') { dispatch({ type: 'VIEW', view: 'upload' }); return; }
    if (view === 'result' && job?.facts) { dispatch({ type: 'VIEW', view: 'facts' }); return; }
    if (job) newNotice();
  };
  const showNew = Boolean(job && (view === 'result' || view === 'checks' || view === 'progress'));
  const editorOverlay = overlay?.kind === 'edit' ? overlay : overlay?.kind === 'reset' && overlay.opener?.kind === 'edit' ? overlay.opener : null;

  return <div className="app-shell">
    {view === 'glance' && job ? <Glance job={job} priorAttempt={glanceAttempts.current.has(job.id)} onStart={() => glanceAttempts.current.add(job.id)} onResult={() => dispatch({ type: 'VIEW', view: 'result' })} /> : <>
      <Header onBack={job || state.fileIssue ? back : undefined} onNew={showNew ? newNotice : undefined} />
      <main id="main-content">
        {view === 'upload' ? <Upload job={job} distance={state.distance} pending={state.pending} issue={state.fileIssue} error={state.error} onFile={workflow.selectFile} onSample={workflow.loadSample} onRead={() => void act('read')} onDistance={distance => dispatch({ type: 'DISTANCE', distance })} onClearIssue={() => dispatch({ type: 'FILE_ISSUE', issue: null })} onSource={source} /> : null}
        {view === 'facts' && job?.facts ? <Facts job={job} pending={Boolean(state.pending)} error={state.error} onEdit={field => dispatch({ type: 'OVERLAY', overlay: { kind: 'edit', field } })} onDesign={() => void act('design')} onSource={source} onReplace={replace} onSave={workflow.saveFacts} /> : null}
        {view === 'progress' && job ? <Progress job={job} pending={Boolean(state.pending)} connectionError={state.connectionError} error={state.error} onCancel={() => void act('cancel')} onRetry={() => void act('retry')} onReview={() => void review()} onDraft={() => void download('svg', true)} onSource={source} onReplace={replace} /> : null}
        {view === 'result' && job ? <Result job={job} tab={state.tab} pending={Boolean(state.pending)} onTab={tab => dispatch({ type: 'TAB', tab })} onDownload={download} onDetails={() => dispatch({ type: 'VIEW', view: 'checks' })} onSource={source} /> : null}
        {view === 'checks' && job ? <Checks job={job} onResult={() => dispatch({ type: 'VIEW', view: 'result' })} onGlance={() => dispatch({ type: 'VIEW', view: 'glance' })} onDownload={() => void download('pdf')} /> : null}
      </main>
    </>}
    <input type="file" ref={fileInput} hidden aria-hidden="true" data-testid="replacement-file-input" tabIndex={-1} accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void workflow.selectFile(file); }} />
    {editorOverlay && job ? <EditFact key={`${job.id}-${editorOverlay.field}`} job={job} field={editorOverlay.field} pending={Boolean(state.pending)} error={state.error} onSave={workflow.saveFacts} onClose={closeOverlay} onSource={source} onReplace={replace} /> : null}
    {overlay?.kind === 'reset' ? <ResetDialog replacement={Boolean(overlay.file)} pending={Boolean(state.pending)} error={state.error} onConfirm={() => void reset(overlay.file)} onClose={closeOverlay} /> : null}
    {overlay?.kind === 'download' ? <DownloadDialog download={overlay} returnLabel={view === 'checks' ? 'Back to checks' : overlay.draft ? 'Back to draft' : 'Back to result'} onClose={closeOverlay} onRetry={() => void download(overlay.format, overlay.draft)} onSvg={() => void download('svg', overlay.draft)} /> : null}
    {state.sourceOpen && job ? <SourceViewer job={job} onClose={() => dispatch({ type: 'SOURCE', open: false })} /> : null}
    {state.fileIssue && view !== 'upload' ? <Modal title="Choose a photo instead" onDismiss={() => dispatch({ type: 'FILE_ISSUE', issue: null })} fullscreen className="replacement-error"><Header onBack={() => dispatch({ type: 'FILE_ISSUE', issue: null })} /><Upload job={job} distance={state.distance} pending={state.pending} issue={state.fileIssue} error={state.error} onFile={workflow.selectFile} onSample={workflow.loadSample} onRead={() => void act('read')} onDistance={distance => dispatch({ type: 'DISTANCE', distance })} onClearIssue={() => dispatch({ type: 'FILE_ISSUE', issue: null })} onSource={source} /></Modal> : null}
  </div>;
}
