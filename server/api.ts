import express from 'express';
import multer from 'multer';
import Ajv from 'ajv';
import { factsSchema,type NoticeFacts } from '../shared/contracts.js';
import { providerInfo } from './agent/provider.js';
import { createJob,getJob,publicJob,startReading,startDesign,updateFacts,cancelJob,retryJob,removeJob,AppError } from './jobs.js';
import { exportPdf } from './render/renderer.js';

const validateFacts=new Ajv({allErrors:true,strict:false}).compile(factsSchema);
export function apiRouter(){
  const api=express.Router();
  api.use(express.json({limit:'100kb'}));
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:2}});
  api.get('/health',(_req,res)=>res.json({ok:true,vision:providerInfo('vision'),text:providerInfo('text')}));
  api.post('/jobs',upload.single('file'),async(req,res)=>{
    if(!req.file)throw new AppError('Choose a PNG or JPG photo.');
    const job=await createJob(req.file,req.body.distance);res.status(201).json(publicJob(job));
  });
  api.get('/jobs/:id',(req,res)=>res.json(publicJob(getJob(String(req.params.id)))));
  api.get('/jobs/:id/source',(req,res)=>{const job=getJob(String(req.params.id));res.set('Cache-Control','private, max-age=3600').type(job.mime).send(job.original);});
  api.get('/jobs/:id/preview',(req,res)=>{const job=getJob(String(req.params.id));if(!job.context.sign)throw new AppError('The preview is not ready yet.',404);res.set('Cache-Control','no-store').type('png').send(job.context.sign.png);});
  api.get('/jobs/:id/sign.svg',(req,res)=>{const job=getJob(String(req.params.id));if(!job.context.sign)throw new AppError('The sign is not ready yet.',404);res.set('Cache-Control','no-store').type('image/svg+xml').send(job.context.sign.svg);});
  api.post('/jobs/:id/read',(req,res)=>{const job=getJob(String(req.params.id));startReading(job);res.status(202).json(publicJob(job));});
  api.put('/jobs/:id/facts',(req,res)=>{
    const job=getJob(String(req.params.id));if(!validateFacts(req.body?.facts))throw new AppError('The details have an invalid format. Review the fields.');
    updateFacts(job,req.body.facts as NoticeFacts);res.json(publicJob(job));
  });
  api.post('/jobs/:id/design',(req,res)=>{const job=getJob(String(req.params.id));startDesign(job,req.body?.factsVersion);res.status(202).json(publicJob(job));});
  api.post('/jobs/:id/cancel',(req,res)=>{const job=getJob(String(req.params.id));cancelJob(job);res.json(publicJob(job));});
  api.post('/jobs/:id/retry',(req,res)=>{const job=getJob(String(req.params.id));retryJob(job);res.status(202).json(publicJob(job));});
  api.delete('/jobs/:id',(req,res)=>{removeJob(getJob(String(req.params.id)));res.status(204).end();});
  api.get('/jobs/:id/download',async(req,res)=>{
    const job=getJob(String(req.params.id));const format=req.query.format;
    if(format!=='pdf'&&format!=='svg')throw new AppError('Choose PDF or SVG.');
    const sign=job.context.sign;
    const checked=job.phase==='passed'&&job.context.report?.passed&&job.context.report.checkedArtifactHash===sign?.hash;
    const draft=job.phase==='stopped'&&format==='svg'&&req.query.draft==='1';
    if(!sign || (!checked&&!draft))throw new AppError('This sign has not passed the current checks. Review the notice first.',409);
    const version=job.factsVersion;
    const stem=job.name.replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]/gi,'-').slice(0,80)||'notice';
    let data:Buffer;
    if(format==='pdf'){
      data=job.pdf||await exportPdf(sign.svg);
      if(job.factsVersion!==version||job.context.sign?.hash!==sign.hash||job.phase!=='passed')throw new AppError('The details changed before the file was ready. Confirm and check again.',409);
      job.pdf=data;
    }else data=Buffer.from(sign.svg,'utf8');
    const filename=`${stem}-A3${draft?'-unchecked':''}.${format}`;
    res.set('Content-Disposition',`attachment; filename="${filename}"`);
    res.set('Cache-Control','no-store');res.type(format==='pdf'?'application/pdf':'image/svg+xml').send(data);
  });
  api.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    if(error instanceof multer.MulterError){res.status(400).json({error:error.code==='LIMIT_FILE_SIZE'?'This photo is over 10 MB. Choose a smaller PNG or JPG.':'Choose one PNG or JPG photo.'});return;}
    const status=error instanceof AppError?error.status:500;
    const message=error instanceof AppError?error.message:'This step could not finish. Your current notice is kept. Please try again.';
    res.status(status).json({error:message});
  });
  return api;
}
