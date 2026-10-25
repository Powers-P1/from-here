import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractNotice } from '../server/agent/prompts.js';
import { blockingFacts } from '../shared/contracts.js';
import { ModelError } from '../server/agent/provider.js';

// Explicit live-model probe: this consumes the configured provider's API/compute budget.
const out=resolve(process.env.PROOF_OUTPUT_DIR || '../outputs/from-here/product-qa/source-boundaries');
await mkdir(out,{recursive:true});
try{
  for(const name of ['school-pickup-unclear','library-closure']){
    const result=await extractNotice(await readFile(`public/samples/${name}.png`));
    await writeFile(resolve(out,`${name}.json`),JSON.stringify(result,null,2));
    const facts=result.value.facts;
    const passed=name==='school-pickup-unclear'
      ? facts.time.status==='unreadable' && facts.time.value==='' && blockingFacts(facts).length>0
      : [facts.who,facts.time].every(field=>field.status==='not_stated'&&field.value==='') && facts.exception.status==='not_stated';
    console.log(JSON.stringify({sample:name,passed,supported:result.value.supported,time:facts.time,timeMeaning:facts.timeMeaning,blockingFacts:blockingFacts(facts)}));
    if(!passed)throw new Error(`The live source boundary failed for ${name}; evidence retained.`);
  }
}catch(error){console.error(error instanceof ModelError?{message:error.message,details:error.details}:String(error));process.exitCode=1;}
