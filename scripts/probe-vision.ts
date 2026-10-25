import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractNotice } from '../server/agent/prompts.js';
import { providerInfo, ModelError } from '../server/agent/provider.js';

const out = resolve('../outputs/from-here/product-qa');
await mkdir(out,{recursive:true});
const image = await readFile(resolve('public/samples/community-workshop.png'));
console.log('Checking vision capability:',JSON.stringify(providerInfo()));
try {
  const result = await extractNotice(image);
  await writeFile(resolve(out,'vision-probe.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} catch (error) {
  console.error(error instanceof ModelError ? { message:error.message,details:error.details } : String(error));
  process.exitCode=1;
}
