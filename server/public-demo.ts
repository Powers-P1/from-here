import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from './jobs.js';

// The single-instance public demo keeps each visitor's jobs private to that browser.
// This is an anonymous, short-lived session, not an account or a project library.
export function publicDemoPolicy() {
  const enabled=process.env.PUBLIC_DEMO==='1';
  const signingKey=randomBytes(32);
  const owners=new Map<string,{visitor:string;created:number}>();
  const limits=new Map<string,{count:number;until:number}>();
  const sign=(value:string)=>createHmac('sha256',signingKey).update(value).digest('base64url');
  function limited(key:string,max:number,window:number){
    const now=Date.now();let bucket=limits.get(key);
    if(!bucket||bucket.until<=now){bucket={count:0,until:now+window};limits.set(key,bucket);}
    if(bucket.count>=max)return true;
    bucket.count++;return false;
  }
  function boundary(req:Request,res:Response,next:NextFunction){
    if(!enabled){next();return;}
    res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
    const cookie=(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith('from_here_session='))?.slice('from_here_session='.length)||'';
    const [candidate,signature]=cookie.split('.');
    const expected=candidate&&/^[a-zA-Z0-9_-]{32}$/.test(candidate)?sign(candidate):'';
    const valid=Boolean(expected&&signature&&Buffer.byteLength(signature)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected)));
    const visitor=valid?candidate:randomBytes(24).toString('base64url');
    res.locals.visitor=visitor;
    if(!valid)res.append('Set-Cookie',`from_here_session=${visitor}.${sign(visitor)}; Path=/api; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`);
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      const origin=req.get('Origin');
      if(origin){try{if(new URL(origin).host!==req.get('host'))throw new Error('Cross-site');}catch{next(new AppError('Open the application directly to use this action.',403));return;}}
      const address=createHmac('sha256',signingKey).update(req.ip||'unknown').digest('hex');
      if(limited(`action:${address}`,60,60*60*1000)){
        res.set('Retry-After','3600');next(new AppError('This demo has handled many actions from your network. Please try again later.',429));return;
      }
      if(req.method==='POST'&&req.path==='/jobs'&&limited(`upload:${address}`,20,60*60*1000)){
        res.set('Retry-After','3600');next(new AppError('This demo has reached the upload limit for your network. Please try again later.',429));return;
      }
    }
    // Bound the anonymous bookkeeping along with the existing one-hour job lifetime.
    const cutoff=Date.now()-60*60*1000;
    for(const [id,owner]of owners)if(owner.created<cutoff)owners.delete(id);
    for(const [key,bucket]of limits)if(bucket.until<Date.now())limits.delete(key);
    next();
  }
  function authorize(req:Request,res:Response,next:NextFunction){
    if(enabled&&owners.get(String(req.params.id))?.visitor!==res.locals.visitor){next(new AppError('This notice is no longer available in this browser. Add the photo again.',404));return;}
    next();
  }
  return {boundary,authorize,register:(id:string,visitor:string)=>{if(enabled)owners.set(id,{visitor,created:Date.now()});},remove:(id:string)=>owners.delete(id)};
}
