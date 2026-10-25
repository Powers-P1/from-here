import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { NoticeFacts, PublicJob } from '../../shared/contracts';
import { command, deleteNotice, errorMessage, jobRequest, sourceUrl, updateFacts, uploadNotice, validateImage } from './api';
import { activePhase, initialState, workflowReducer } from './reducer';

export function useWorkflow() {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const epoch = useRef(0);
  const validationEpoch = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const currentJob = useRef(state.job);
  currentJob.current = state.job;

  const run = useCallback(async <T,>(label: string, action: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
    const requestId = ++epoch.current;
    for (const active of controllers.current) active.abort();
    controllers.current.clear();
    const controller = new AbortController();
    controllers.current.add(controller);
    dispatch({ type: 'BEGIN', requestId, label });
    try {
      const result = await action(controller.signal);
      if (requestId !== epoch.current || controller.signal.aborted) return;
      return result;
    } catch (error) {
      if (!controller.signal.aborted && requestId === epoch.current) dispatch({ type: 'ERROR', message: errorMessage(error) });
      return;
    } finally {
      controllers.current.delete(controller);
      dispatch({ type: 'FINISH', requestId });
    }
  }, []);

  useEffect(() => {
    if (!activePhase(state.job) || state.pending || state.connectionError) return;
    const id = state.job!.id;
    const requestId = state.requestId;
    const controller = new AbortController();
    controllers.current.add(controller);
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await jobRequest(`/api/jobs/${id}`, { signal: controller.signal });
        if (controller.signal.aborted || requestId !== epoch.current || currentJob.current?.id !== id) return;
        dispatch({ type: 'JOB', job: next, requestId });
        if (activePhase(next)) timer = setTimeout(poll, 600);
      } catch (error) {
        if (!controller.signal.aborted && requestId === epoch.current) dispatch({ type: 'ERROR', message: errorMessage(error), connection: true });
      }
    };
    timer = setTimeout(poll, 600);
    return () => { clearTimeout(timer); controller.abort(); controllers.current.delete(controller); };
  }, [state.job?.id, state.job?.phase, state.requestId, state.pending, state.connectionError]);

  useEffect(() => () => { ++epoch.current; ++validationEpoch.current; for (const active of controllers.current) active.abort(); controllers.current.clear(); }, []);

  const upload = async (file: File) => {
    const previous = currentJob.current;
    const next = await run('upload', signal => uploadNotice(file, state.distance, signal));
    if (next) {
      dispatch({ type: 'JOB', job: next });
      dispatch({ type: 'OVERLAY', overlay: null });
      if (previous && previous.id !== next.id) {
        // The replacement is already valid; remove the previous transient job only now.
        const controller = new AbortController();
        controllers.current.add(controller);
        void deleteNotice(previous.id, controller.signal).catch(() => {}).finally(() => controllers.current.delete(controller));
      }
    }
  };

  const selectFile = async (file: File) => {
    const validationId = ++validationEpoch.current;
    try { await validateImage(file); }
    catch (error) { if (validationId === validationEpoch.current) dispatch({ type: 'FILE_ISSUE', issue: { name: file.name, message: errorMessage(error) } }); return; }
    if (validationId !== validationEpoch.current) return;
    dispatch({ type: 'FILE_ISSUE', issue: null });
    if (currentJob.current) dispatch({ type: 'OVERLAY', overlay: { kind: 'reset', file } });
    else await upload(file);
  };

  const act = async (action: 'read' | 'design' | 'retry' | 'cancel') => {
    const job = currentJob.current;
    if (!job) return;
    const next = await run(action, async signal => {
      if (action === 'read' && job.distance !== state.distance) {
        const source = await fetch(sourceUrl(job), { signal });
        if (!source.ok) throw new Error('The original photo could not be reopened. Please try again.');
        const file = new File([await source.blob()], job.name, { type: source.headers.get('Content-Type')?.split(';')[0] ?? 'image/png' });
        const replacement = await uploadNotice(file, state.distance, signal);
        // Store the new source before starting the reading, so failure preserves it.
        if (!signal.aborted) dispatch({ type: 'JOB', job: replacement });
        await deleteNotice(job.id, signal);
        return command(replacement.id, 'read', signal);
      }
      return action === 'retry' && job.phase !== 'interrupted'
        ? jobRequest(`/api/jobs/${job.id}`, { signal })
        : command(job.id, action, signal, action === 'design' ? job.factsVersion : undefined);
    });
    if (next) dispatch({ type: 'JOB', job: next });
  };

  const saveFacts = async (facts: NoticeFacts) => {
    const job = currentJob.current;
    if (!job) return false;
    const next = await run('facts', signal => updateFacts(job.id, facts, signal));
    if (!next) return false;
    dispatch({ type: 'JOB', job: next });
    dispatch({ type: 'OVERLAY', overlay: null });
    return true;
  };

  const reset = async (replacement?: File) => {
    ++validationEpoch.current;
    if (replacement) { await upload(replacement); return; }
    const job = currentJob.current;
    if (!job) { dispatch({ type: 'RESET', requestId: epoch.current }); return; }
    const deleted = await run('reset', async signal => { await deleteNotice(job.id, signal); return true; });
    if (deleted) dispatch({ type: 'RESET', requestId: epoch.current });
  };

  const loadSample = async () => {
    const sample = await run('sample', async signal => {
      const response = await fetch('/samples/school-pickup.png', { signal });
      if (!response.ok) throw new Error('The sample could not be opened. Please try again.');
      return new File([await response.blob()], 'school-pickup.png', { type: 'image/png' });
    });
    if (sample) await selectFile(sample);
  };

  return { state, dispatch, selectFile, loadSample, act, saveFacts, reset };
}
