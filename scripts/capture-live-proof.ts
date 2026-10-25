import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {PublicJob} from '../shared/contracts.js';

const id=process.argv[2];
if(!id||!/^[a-f0-9-]{36}$/i.test(id))throw new Error('Usage: npx tsx scripts/capture-live-proof.ts <observed-job-id> [output-dir]');
const base=(process.env.PROOF_BASE_URL||'http://127.0.0.1:4176').replace(/\/$/,'');
const out=resolve(process.argv[3]||'../outputs/from-here/product-qa/live-ui');
await mkdir(out,{recursive:true});
const jobResponse=await fetch(`${base}/api/jobs/${id}`);
if(!jobResponse.ok)throw new Error(`Job HTTP ${jobResponse.status}`);
const job=await jobResponse.json() as PublicJob;
if(job.phase!=='passed'||!job.report?.passed||job.artifactHash!==job.report.checkedArtifactHash)throw new Error('The observed job is not a checked final artifact.');
await writeFile(resolve(out,'job.json'),JSON.stringify(job,null,2));
for(const [endpoint,name] of [['source','source.png'],['preview','sign.png'],['sign.svg','sign.svg'],['download?format=pdf','sign-A3.pdf']] as const){
  const response=await fetch(`${base}/api/jobs/${id}/${endpoint}`);
  if(!response.ok)throw new Error(`${endpoint} HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(endpoint==='sign.svg'&&createHash('sha256').update(bytes).digest('hex')!==job.artifactHash)throw new Error('Export differs from the checked SVG.');
  await writeFile(resolve(out,name),bytes);
}
await writeFile(resolve(out,'capture.json'),JSON.stringify({capturedAt:new Date().toISOString(),jobId:id,factsVersion:job.factsVersion,artifactHash:job.artifactHash,matched:job.report.matched,total:job.report.total,repairCount:job.repairCount,method:'Actual UI journey, then read-only HTTP artifact capture. No model response was substituted.'},null,2));
console.log(JSON.stringify({out,status:'PASS',matched:job.report.matched,total:job.report.total,repairs:job.repairCount,artifactHash:job.artifactHash}));
