import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import express from 'express';
import type {Server} from 'node:http';
import {readFile} from 'node:fs/promises';
const mock=vi.hoisted(()=>({extract:vi.fn()}));
vi.mock('../server/agent/prompts.js',()=>({extractNotice:mock.extract,planLayout:vi.fn(),readSign:vi.fn()}));
import {apiRouter} from '../server/api.js';
import {jobs} from '../server/jobs.js';

let server:Server,url:string;
beforeEach(async()=>{
  vi.stubEnv('PUBLIC_DEMO','1');vi.stubEnv('MAX_ACTIVE_JOBS','2');
  const app=express();app.use('/api',apiRouter());
  server=await new Promise<Server>(resolve=>{const listener=app.listen(0,'127.0.0.1',()=>resolve(listener));});
  const address=server.address();if(!address||typeof address==='string')throw Error('No port');url=`http://127.0.0.1:${address.port}/api`;
});
afterEach(async()=>{for(const job of jobs.values())job.controller?.abort();jobs.clear();vi.resetAllMocks();vi.unstubAllEnvs();await new Promise<void>(resolve=>server.close(()=>resolve()));});
async function upload(cookie?:string,origin?:string){
  const form=new FormData();form.set('distance','3');form.set('file',new Blob([new Uint8Array(await readFile('public/samples/school-pickup.png'))]),'school.png');
  return fetch(url+'/jobs',{method:'POST',body:form,headers:{...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})}});
}
function session(response:Response){return response.headers.get('set-cookie')!.split(';')[0];}

it('lets each anonymous visitor reopen only their own notice and protects all job routes',async()=>{
  const created=await upload();expect(created.status).toBe(201);const cookie=session(created);const job=await created.json();
  expect(created.headers.get('set-cookie')).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  expect((await fetch(`${url}/jobs/${job.id}`,{headers:{Cookie:cookie}})).status).toBe(200);
  expect((await fetch(`${url}/jobs/${job.id}/source`,{headers:{Cookie:cookie}})).status).toBe(200);
  for(const suffix of ['','/source','/preview','/sign.svg','/download?format=pdf'])expect((await fetch(`${url}/jobs/${job.id}${suffix}`)).status).toBe(404);
  const other=await upload();const otherCookie=session(other);
  expect((await fetch(`${url}/jobs/${job.id}/cancel`,{method:'POST',headers:{Cookie:otherCookie}})).status).toBe(404);
  expect(jobs.has(job.id)).toBe(true);
});

it('rejects forged sessions and cross-site mutations before processing a notice',async()=>{
  const created=await upload();const cookie=session(created);const job=await created.json();
  expect((await fetch(`${url}/jobs/${job.id}`,{headers:{Cookie:cookie+'x'}})).status).toBe(404);
  const size=jobs.size;const crossSite=await upload(cookie,'https://unrelated.example');expect(crossSite.status).toBe(403);expect(jobs.size).toBe(size);
});

it('limits concurrent AI work while preserving another visitor’s uploaded photo',async()=>{
  mock.extract.mockImplementation(()=>new Promise(()=>{}));
  for(let i=0;i<2;i++){
    const created=await upload();const cookie=session(created);const job=await created.json();
    expect((await fetch(`${url}/jobs/${job.id}/read`,{method:'POST',headers:{Cookie:cookie}})).status).toBe(202);
  }
  const created=await upload();const cookie=session(created);const job=await created.json();
  const busy=await fetch(`${url}/jobs/${job.id}/read`,{method:'POST',headers:{Cookie:cookie}});expect(busy.status).toBe(503);
  expect((await(await fetch(`${url}/jobs/${job.id}`,{headers:{Cookie:cookie}})).json()).phase).toBe('uploaded');
  expect(mock.extract).toHaveBeenCalledTimes(2);
});

it('rate-limits uploads without charging an AI call',async()=>{
  for(let i=0;i<20;i++)expect((await upload()).status).toBe(201);
  const limited=await upload();expect(limited.status).toBe(429);expect(limited.headers.get('retry-after')).toBe('3600');expect(mock.extract).not.toHaveBeenCalled();
});
