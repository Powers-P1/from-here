import { createHash,randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { blockingFacts, type HistoryEvent, type JobPhase, type NoticeFacts, type PublicJob } from '../shared/contracts.js';
import { extractNotice } from './agent/prompts.js';
import { semanticFactIssues } from './agent/checks.js';
import { ModelError } from './agent/provider.js';
import { designAndCheck,newDesignContext,type DesignContext } from './agent/pipeline.js';

export class AppError extends Error {
  constructor(message: string,public status=400) { super(message);this.name='AppError'; }
}
interface StoredJob extends PublicJob {
  original: Buffer;
  mime: string;
  normalized: Buffer;
  sourceHash: string;
  context: DesignContext;
  controller: AbortController | null;
  token: number;
  task: Promise<void> | null;
  baseHistory: HistoryEvent[];
  baseReceipts: PublicJob['receipts'];
  pdf: Buffer | null;
}
export const jobs=new Map<string,StoredJob>();
const working=new Set<JobPhase>(['reading','planning','rendering','checking','repairing']);

function event(job:StoredJob,type:HistoryEvent['type'],text:string) {
  job.baseHistory.push({id:randomUUID(),type,text,at:new Date().toISOString(),attempt:job.context.repairCount});
}

export async function createJob(file:{buffer:Buffer;originalname:string},distance:unknown):Promise<StoredJob> {
  if (![1,3,5].includes(Number(distance))) throw new AppError('Choose a viewing distance of 1, 3 or 5 metres.');
  if (file.buffer.length>10*1024*1024) throw new AppError('This photo is over 10 MB. Choose a smaller PNG or JPG.');
  const isPng=file.buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isJpg=file.buffer[0]===255 && file.buffer[1]===216 && file.buffer[2]===255;
  if (!isPng && !isJpg) throw new AppError('This file is not a JPG or PNG. Choose a photo instead.');
  let normalized:Buffer;
  try {
    const image=sharp(file.buffer,{limitInputPixels:24_000_000});
    const meta=await image.metadata();
    if (!meta.width || !meta.height) throw new Error('No image dimensions');
    normalized=await image.rotate().resize({width:1400,height:1800,fit:'inside',withoutEnlargement:true}).png().toBuffer();
  } catch { throw new AppError('This photo could not be opened. Choose another PNG or JPG.'); }
  const maximumJobs=Number(process.env.MAX_JOBS||24);
  if (jobs.size>=maximumJobs) {
    const oldest=[...jobs.values()].find(j=>!working.has(j.phase));
    if (oldest) jobs.delete(oldest.id);else throw new AppError('The app is busy with other notices. Please try again shortly.',503);
  }
  const id=randomUUID();
  const job:StoredJob={id,name:file.originalname.replace(/[\r\n/\\]/g,'').slice(0,160)||'notice.png',distance:Number(distance) as 1|3|5,
    phase:'uploaded',facts:null,factsVersion:0,extraction:null,artifactHash:null,repairCount:0,report:null,history:[],receipts:[],
    error:null,interruptedPhase:null,createdAt:new Date().toISOString(),original:file.buffer,mime:isPng?'image/png':'image/jpeg',normalized,
    sourceHash:createHash('sha256').update(file.buffer).digest('hex'),context:newDesignContext(),controller:null,token:0,task:null,
    baseHistory:[],baseReceipts:[],pdf:null};
  jobs.set(id,job);return job;
}
export function getJob(id:string):StoredJob {
  const job=jobs.get(id);if(!job)throw new AppError('This notice is no longer available. Add the photo again.',404);return job;
}
export function publicJob(job:StoredJob):PublicJob {
  return {id:job.id,name:job.name,distance:job.distance,phase:job.phase,facts:job.facts,factsVersion:job.factsVersion,extraction:job.extraction,
    artifactHash:job.context.sign?.hash||null,repairCount:job.context.repairCount,report:job.context.report,
    history:[...job.baseHistory,...job.context.history].sort((a,b)=>a.at.localeCompare(b.at)),
    receipts:[...job.baseReceipts,...job.context.receipts],error:job.error,interruptedPhase:job.interruptedPhase,createdAt:job.createdAt};
}
function startTask(job:StoredJob,phase:JobPhase,work:(signal:AbortSignal,token:number)=>Promise<void>) {
  if(job.task || working.has(job.phase))return;
  const maximumActive=Number(process.env.MAX_ACTIVE_JOBS||24);
  if([...jobs.values()].filter(active=>active.task).length>=maximumActive)throw new AppError('The demo is busy with other notices. Your photo is kept. Please try again shortly.',503);
  job.controller=new AbortController();const controller=job.controller;const token=++job.token;
  job.phase=phase;job.error=null;job.interruptedPhase=null;
  const task=work(controller.signal,token).catch(error=>{
    if(token!==job.token||controller.signal.aborted)return;
    job.interruptedPhase=job.phase;job.phase='interrupted';
    job.error=error instanceof ModelError ? error.message : 'This step could not finish. Your notice and details are kept.';
    event(job,'interrupted',job.error);
    // Log only safe diagnostic metadata; never the image, prompt or a credential.
    console.error(`[${job.id}] ${error instanceof Error?error.name:'TaskError'}: ${job.error}`);
  }).finally(()=>{if(token===job.token){job.task=null;job.controller=null;}});
  job.task=task;
}
export function startReading(job:StoredJob) {
  if(job.task)return;
  if(job.facts && job.extraction?.supported){job.phase='review';return;}
  startTask(job,'reading',async(signal,token)=>{
    const result=await extractNotice(job.normalized,signal);
    if(signal.aborted||token!==job.token)return;
    const inconsistencies=semanticFactIssues(result.value.facts);
    if(inconsistencies.length)throw new ModelError('The AI could not separate these details reliably. Please retry the reading.');
    job.facts=result.value.facts;job.factsVersion+=1;
    job.extraction={language:result.value.language,supported:result.value.supported,reason:result.value.reason};
    job.baseReceipts.push(...result.receipts);job.phase='review';
    event(job,'read','Notice details read');
  });
}
export function updateFacts(job:StoredJob,facts:NoticeFacts) {
  if(job.task || working.has(job.phase))throw new AppError('Cancel the current action before editing these details.',409);
  const issues=semanticFactIssues(facts);
  if(issues.length)throw new AppError('Check each value and whether it is known, unreadable or not stated.');
  job.facts=structuredClone(facts);job.factsVersion+=1;job.context=newDesignContext();job.pdf=null;job.phase='review';job.error=null;job.interruptedPhase=null;
  job.baseHistory=job.baseHistory.filter(e=>e.type==='read');
}
export function startDesign(job:StoredJob,expectedVersion?:number) {
  if(job.task)return;
  if(expectedVersion!==undefined && expectedVersion!==job.factsVersion)throw new AppError('The details changed. Confirm the current values again.',409);
  if(!job.facts)throw new AppError('Read and confirm the notice details first.');
  if(job.extraction?.supported===false||job.extraction?.language!=='english')throw new AppError('Choose a readable English notice with one main instruction.');
  const blocks=blockingFacts(job.facts);if(blocks.length)throw new AppError(blocks[0],422);
  if(job.context.stage==='done'){job.phase=job.context.report?.passed?'passed':'stopped';return;}
  const locked=structuredClone(job.facts);
  const phase=job.context.stage==='readback'?'checking':job.context.stage==='render'?'rendering':job.context.stage==='repair'?'repairing':'planning';
  startTask(job,phase,async(signal,token)=>{
    await designAndCheck(locked,job.distance,job.context,{signal,update:(next)=>{if(token===job.token&&!signal.aborted)job.phase=next;}});
    if(signal.aborted||token!==job.token)return;
    job.phase=job.context.report?.passed?'passed':'stopped';
  });
}
export function cancelJob(job:StoredJob) {
  job.token+=1;job.controller?.abort();job.controller=null;job.task=null;
  job.phase=job.facts?'review':'uploaded';job.error=null;job.interruptedPhase=null;
  event(job,'cancelled','Action cancelled; notice kept');
}
export function retryJob(job:StoredJob) {
  if(job.phase!=='interrupted')return;
  const phase=job.interruptedPhase;job.phase=job.facts?'review':'uploaded';
  if(phase==='reading'||!job.facts)startReading(job);else startDesign(job,job.factsVersion);
}
export function removeJob(job:StoredJob){cancelJob(job);jobs.delete(job.id);}
export function stopJobs(){for(const job of jobs.values())job.controller?.abort();}
const expiry=setInterval(()=>{
  const cutoff=Date.now()-60*60*1000;
  for(const job of jobs.values())if(!job.task&&Date.parse(job.createdAt)<cutoff)jobs.delete(job.id);
},5*60*1000);expiry.unref();
