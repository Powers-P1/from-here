import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readSign } from '../server/agent/prompts.js';
import { ModelError } from '../server/agent/provider.js';
if(!process.argv[2])throw new Error('Usage: npx tsx scripts/probe-readback.ts <rendered-sign-image> [output-dir]');
const out=resolve(process.argv[3]||'../outputs/from-here/product-qa/readback-diagnostic');await mkdir(out,{recursive:true});
const image=await readFile(resolve(process.argv[2]));await writeFile(resolve(out,'sign.png'),image);
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
  const response=await originalFetch(input,init);
  if(String(input).endsWith('/chat/completions')&&response.ok){
    const raw=await response.clone().json() as any;
    await writeFile(resolve(out,'provider-response.json'),JSON.stringify({choices:raw.choices,usage:raw.usage},null,2));
  }
  return response;
};
try{
  const result=await readSign(image);
  await writeFile(resolve(out,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}catch(error){
  const result=error instanceof ModelError?{message:error.message,details:error.details}:{error:String(error)};
  await writeFile(resolve(out,'error.json'),JSON.stringify(result,null,2));
  console.error(result);process.exitCode=1;
}
