import { afterAll,afterEach,beforeAll,describe,expect,it,vi } from 'vitest';
import express from 'express';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { emptyFacts } from '../shared/contracts.js';
const mock=vi.hoisted(()=>({extract:vi.fn()}));
vi.mock('../server/agent/prompts.js',()=>({extractNotice:mock.extract,planLayout:vi.fn(),readSign:vi.fn()}));
import { apiRouter } from '../server/api.js';
import { jobs } from '../server/jobs.js';

let server:Server,url:string;
beforeAll(async()=>{const app=express();app.use('/api',apiRouter());server=await new Promise<Server>(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});const address=server.address();if(!address||typeof address==='string')throw Error('No port');url=`http://127.0.0.1:${address.port}/api`;});
afterEach(()=>{for(const job of jobs.values())job.controller?.abort();jobs.clear();vi.resetAllMocks();});
afterAll(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));});
async function upload(name='sample.png',data?:Buffer){const form=new FormData();form.set('distance','3');form.set('file',new Blob([new Uint8Array(data||await readFile('public/samples/school-pickup.png'))]),name);return fetch(url+'/jobs',{method:'POST',body:form});}
describe('HTTP boundaries without any live model calls',()=>{
  it('rejects a PDF without discarding an existing source',async()=>{
    const valid=await(await upload()).json();
    const invalid=await upload('notice.pdf',Buffer.from('%PDF-1.4 test'));
    expect(invalid.status).toBe(400);expect((await invalid.json()).error).toContain('JPG or PNG');
    expect((await fetch(url+'/jobs/'+valid.id)).status).toBe(200);
  });
  it('does not allow an unchecked PDF export',async()=>{
    const job=await(await upload()).json();
    const response=await fetch(`${url}/jobs/${job.id}/download?format=pdf`);
    expect(response.status).toBe(409);
  });
  it('keeps cancellation safe when the reading returns late',async()=>{
    let complete:(value:unknown)=>void=()=>{};
    mock.extract.mockReturnValue(new Promise(resolve=>{complete=resolve;}));
    const job=await(await upload()).json();
    expect((await fetch(`${url}/jobs/${job.id}/read`,{method:'POST'})).status).toBe(202);
    await fetch(`${url}/jobs/${job.id}/cancel`,{method:'POST'});
    complete({value:{facts:emptyFacts(),supported:true,language:'english',reason:''},receipts:[]});
    await new Promise(resolve=>setTimeout(resolve,15));
    const result=await(await fetch(`${url}/jobs/${job.id}`)).json();
    expect(result.phase).toBe('uploaded');expect(result.facts).toBeNull();
  });
  it('blocks unreadable facts and invalidates an old checked result on edit',async()=>{
    const response=await upload();const data=await response.json();const stored=jobs.get(data.id)!;
    const facts=emptyFacts();facts.what={value:'Pickup',status:'known'};facts.time={value:'',status:'unreadable'};facts.timeMeaning='from';
    stored.facts=facts;stored.extraction={supported:true,language:'english',reason:''};stored.phase='review';
    expect((await fetch(`${url}/jobs/${data.id}/design`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({factsVersion:0})})).status).toBe(422);
    stored.phase='passed';stored.context.stage='done';stored.context.report={passed:true} as any;stored.context.sign={hash:'old'} as any;
    facts.time={value:'16:30',status:'known'};
    const updated=await(await fetch(`${url}/jobs/${data.id}/facts`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({facts})})).json();
    expect(updated.phase).toBe('review');expect(updated.report).toBeNull();expect(updated.artifactHash).toBeNull();expect(updated.factsVersion).toBe(1);
  });
});
