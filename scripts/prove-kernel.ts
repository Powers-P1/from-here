import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { extractNotice } from '../server/agent/prompts.js';
import { semanticFactIssues } from '../server/agent/checks.js';
import { blockingFacts } from '../shared/contracts.js';
import { newDesignContext,designAndCheck } from '../server/agent/pipeline.js';
import { closeRenderBrowser,exportPdf } from '../server/render/renderer.js';
import { ModelError } from '../server/agent/provider.js';

const out = resolve(process.env.PROOF_OUTPUT_DIR || '../outputs/from-here/product-qa/kernel');
await mkdir(out,{recursive:true});
try {
  const path = resolve(process.argv[2] || 'public/samples/community-workshop.png');
  const image = await readFile(path);
  const cachedPath = resolve('../outputs/from-here/product-qa/vision-probe.json');
  const extraction = process.env.USE_RECORDED_EXTRACTION === '1' ? JSON.parse(await readFile(cachedPath,'utf8')) : await extractNotice(image);
  const issues = semanticFactIssues(extraction.value.facts);
  if (!extraction.value.supported || issues.length || blockingFacts(extraction.value.facts).length) throw new Error(`Source cannot proceed: ${JSON.stringify({supported:extraction.value.supported,issues,blocking:blockingFacts(extraction.value.facts)})}`);
  // The author-confirmation boundary is explicit in this technical proof.
  // It uses the independently read facts unchanged; there is no expected-value override.
  const confirmed = structuredClone(extraction.value.facts);
  await writeFile(resolve(out,'source.png'),image);
  await writeFile(resolve(out,'extraction.json'),JSON.stringify(extraction,null,2));
  const context = newDesignContext();
  await designAndCheck(confirmed,3,context,{update:(phase,text)=>console.log(`${phase}: ${text}`)});
  await writeFile(resolve(out,'sign.svg'),context.sign!.svg);
  await writeFile(resolve(out,'sign.png'),context.sign!.png);
  await writeFile(resolve(out,'report.json'),JSON.stringify({
    realLocalInference:true,
    sourceHash:createHash('sha256').update(image).digest('hex'),
    confirmation:'Technical proof confirms the actual extracted facts unchanged; participant interaction is not claimed.',
    extractionWasReused:process.env.USE_RECORDED_EXTRACTION==='1',
    facts:confirmed,plan:context.plan,readback:context.readbackFacts,readbackTranscript:context.readbackTranscript,
    report:context.report,repairCount:context.repairCount,history:context.history,
    receipts:[...extraction.receipts,...context.receipts],
  },null,2));
  if (!context.report!.passed) throw new Error('Actual checks stopped without passing; retained the real evidence.');
  await writeFile(resolve(out,'sign-A3.pdf'),await exportPdf(context.sign!.svg));
  console.log(JSON.stringify({status:'PASS',path:out,repairs:context.repairCount,artifact:context.sign!.hash},null,2));
} catch(error) {
  console.error(error instanceof ModelError ? {message:error.message,details:error.details} : String(error));
  process.exitCode=1;
} finally {await closeRenderBrowser();}
