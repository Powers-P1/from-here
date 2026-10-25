import express from 'express';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { apiRouter } from './api.js';
import { closeRenderBrowser } from './render/renderer.js';
import { stopJobs } from './jobs.js';

if(existsSync('.env.local'))loadEnvFile('.env.local');
else if(existsSync('.env'))loadEnvFile('.env');
const production=process.argv.includes('--production');
const app=express();const http=createServer(app);
app.disable('x-powered-by');app.use('/api',apiRouter());
let vite:{close:()=>Promise<void>}|undefined;
if(production){
  app.use(express.static(resolve('dist')));
  app.use((req,res,next)=>{if(req.method==='GET'&&!req.path.startsWith('/api/'))res.sendFile(resolve('dist/index.html'));else next();});
}else{
  const {createServer:createVite}=await import('vite');
  const dev=await createVite({server:{middlewareMode:true,ws:{server:http}},appType:'spa'});
  vite=dev;app.use(dev.middlewares);
}
const port=Number(process.env.PORT||4176);const host=process.env.HOST||'127.0.0.1';
http.listen(port,host,()=>console.log(`FROM HERE ${production?'production':'development'} · http://${host}:${port} · pid ${process.pid}`));
let closing=false;
async function shutdown(){
  if(closing)return;closing=true;stopJobs();
  await Promise.allSettled([closeRenderBrowser(),vite?.close()||Promise.resolve()]);
  http.close(()=>process.exit(0));
  setTimeout(()=>process.exit(0),3000).unref();
}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
