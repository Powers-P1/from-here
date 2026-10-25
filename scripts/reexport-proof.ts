import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exportPdf,closeRenderBrowser } from '../server/render/renderer.js';
try {
  const base=resolve('../outputs/from-here/product-qa/kernel');
  await writeFile(resolve(base,'sign-A3.pdf'),await exportPdf(await readFile(resolve(base,'sign.svg'),'utf8')));
  console.log('Re-exported the same checked SVG to an exact A3 page.');
} finally {await closeRenderBrowser();}
