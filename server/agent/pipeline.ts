import { randomUUID } from 'node:crypto';
import { blockingFacts, type NoticeFacts, type LayoutPlan, type CheckReport, type ModelReceipt, type HistoryEvent, type JobPhase } from '../../shared/contracts.js';
import { planLayout, readSign } from './prompts.js';
import { renderSign, type RenderedSign } from '../render/renderer.js';
import { checkSign } from './checks.js';

export interface DesignContext {
  stage: 'plan' | 'render' | 'readback' | 'repair' | 'done';
  plan: LayoutPlan | null;
  sign: RenderedSign | null;
  report: CheckReport | null;
  repairCount: number;
  receipts: ModelReceipt[];
  history: HistoryEvent[];
  readbackFacts: NoticeFacts | null;
  readbackTranscript: string | null;
}
export const newDesignContext = (): DesignContext => ({ stage:'plan',plan:null,sign:null,report:null,repairCount:0,receipts:[],history:[],readbackFacts:null,readbackTranscript:null });

export async function designAndCheck(facts: NoticeFacts, distance: 1|3|5, context: DesignContext, options: { signal?: AbortSignal; update?: (phase: JobPhase,text: string)=>void } = {}): Promise<DesignContext> {
  const errors = blockingFacts(facts);
  if (errors.length) throw new Error(errors[0]);
  const event = (type: HistoryEvent['type'], phase: JobPhase, text: string) => {
    context.history.push({id:randomUUID(),type,text,at:new Date().toISOString(),attempt:context.repairCount});
    options.update?.(phase,text);
  };
  for (;;) {
    options.signal?.throwIfAborted();
    if (context.stage==='plan') {
      options.update?.('planning','Planning a clear hierarchy…');
      const plan = await planLayout(facts,distance,undefined,undefined,options.signal);
      options.signal?.throwIfAborted();
      context.plan=plan.value; context.receipts.push(plan.receipt); context.stage='render';
      event('plan','rendering','First layout planned');
    }
    if (context.stage==='render') {
      options.update?.(context.repairCount ? 'repairing' : 'rendering',context.repairCount ? 'Rendering the updated sign…' : 'Rendering the preview…');
      const rendered = await renderSign(facts,context.plan!,distance);
      options.signal?.throwIfAborted();
      context.sign=rendered; context.report=null; context.stage='readback';
      event('render','checking',context.repairCount ? 'Updated sign rendered' : 'Sign rendered');
    }
    if (context.stage==='readback') {
      options.update?.('checking','Reading the actual sign image…');
      const reading = await readSign(context.sign!.png,options.signal);
      options.signal?.throwIfAborted();
      context.receipts.push(...reading.receipts); context.readbackFacts=reading.value; context.readbackTranscript=reading.transcript;
      context.report=checkSign(facts,reading.value,context.sign!);
      event('check','checking',context.report.passed ? 'Required details recovered from the sign' : context.report.issues[0] || 'A detail needs review');
      if (context.report.passed) { context.stage='done'; event('passed','passed','Automated checks passed'); return context; }
      if (context.repairCount>=2) { context.stage='done'; event('stopped','stopped','Automatic checks not passed after two revisions'); return context; }
      context.stage='repair';
    }
    if (context.stage==='repair') {
      options.update?.('repairing',`Adjusting the layout · revision ${context.repairCount+1} of 2…`);
      const adjusted = await planLayout(facts,distance,context.plan!,context.report!.issues,options.signal);
      options.signal?.throwIfAborted();
      context.plan=adjusted.value; context.receipts.push(adjusted.receipt); context.repairCount+=1;
      event('repair','repairing',adjusted.value.reason);
      context.stage='render';
    }
    if (context.stage==='done') return context;
  }
}
