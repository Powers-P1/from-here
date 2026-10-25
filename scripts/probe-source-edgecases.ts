import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractNotice } from '../server/agent/prompts.js';
import { blockingFacts } from '../shared/contracts.js';
import { semanticFactIssues } from '../server/agent/checks.js';

const out=resolve('../outputs/from-here/product-qa/source-edgecases');await mkdir(out,{recursive:true});
for(const name of ['school-pickup-unclear','library-closure']){
  const result=await extractNotice(await readFile(resolve('public/samples',name+'.png')));
  await writeFile(resolve(out,name+'.json'),JSON.stringify(result,null,2));
  console.log(name,JSON.stringify(result.value));
  if(semanticFactIssues(result.value.facts).length)throw new Error('Inconsistent statuses in '+name);
  if(name==='school-pickup-unclear'){
    if(result.value.facts.time.status!=='unreadable'||result.value.facts.time.value||!blockingFacts(result.value.facts).length)throw new Error('Obscured time was not safely blocked.');
  }else if(result.value.facts.time.status!=='not_stated'||result.value.facts.exception.status!=='not_stated')throw new Error('Absent facts were invented.');
}
console.log('Real local source edge cases passed.');
