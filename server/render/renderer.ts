import { chromium, type Browser } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { factGroups, type LayoutPlan, type NoticeFacts } from '../../shared/contracts.js';
import { signText } from '../../shared/sign-text.js';

let browserPromise: Promise<Browser> | undefined;
const ROOT = resolve(import.meta.dirname, '../..');
let fontsPromise: Promise<string> | undefined;
export const xml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&apos;' }[c]!));

export async function renderBrowser(): Promise<Browser> {
  browserPromise ||= chromium.launch({ headless: true, args: ['--disable-gpu'] }).catch((error) => { browserPromise = undefined; throw error; });
  return browserPromise;
}
export async function closeRenderBrowser() {
  if (browserPromise) { const browser = await browserPromise; browserPromise = undefined; await browser.close(); }
}
async function fontStyle() {
  fontsPromise ||= (async () => {
    const [display, body, semi] = await Promise.all([
      readFile(resolve(ROOT, 'node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff2')),
      readFile(resolve(ROOT, 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2')),
      readFile(resolve(ROOT, 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2')),
    ]);
    return `@font-face{font-family:Sign;src:url(data:font/woff2;base64,${display.toString('base64')}) format('woff2');font-weight:900;font-style:normal;font-display:block}
@font-face{font-family:UI;src:url(data:font/woff2;base64,${body.toString('base64')}) format('woff2');font-weight:400;font-style:normal;font-display:block}
@font-face{font-family:UI;src:url(data:font/woff2;base64,${semi.toString('base64')}) format('woff2');font-weight:600;font-style:normal;font-display:block}`;
  })();
  return fontsPromise;
}

export interface PositionedText { key: string; text: string; lines: string[]; x: number; y: number; width: number; height: number; font: number; family: string; weight: number }
export interface RenderedSign { svg: string; png: Buffer; hash: string; layoutPassed: boolean; issues: string[]; blocks: PositionedText[]; minimumFontMm: number }

function wrapText(text: string, maxWidth: number, font: number, widths: Record<string,number>, family: string): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  const measure = (value: string) => [...value].reduce((s,c) => s+(widths[`${family}:${c}`] ?? .5), 0) * font;
  for (const paragraph of paragraphs) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate) > maxWidth) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function renderSign(facts: NoticeFacts, plan: LayoutPlan, distance: 1 | 3 | 5): Promise<RenderedSign> {
  const browser = await renderBrowser();
  const page = await browser.newPage({ viewport: { width: 1123, height: 1588 }, deviceScaleFactor: 1 });
  try {
    const style = await fontStyle();
    await page.setContent(`<html><head><style>${style}</style></head><body><span style="font-family:Sign;font-weight:900">W</span><span style="font-family:UI;font-weight:600">W</span></body></html>`);
    await page.evaluate(async () => { await document.fonts.ready; await document.fonts.load('900 100px Sign'); await document.fonts.load('600 100px UI'); });
    const groups = factGroups(facts).filter((g) => g.status === 'known' && g.value.trim());
    const texts = groups.flatMap((g) => g.key === 'exception' ? [facts.exception.condition+':', signText(facts.exception.instruction)] : [signText(g.value)]);
    const widths = await page.evaluate((strings) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const chars = [...new Set(strings.join('')+' ')];
      const output: Record<string,number> = {};
      for (const family of ['Sign','UI']) {
        ctx.font = `${family === 'Sign' ? 900 : 600} 100px ${family}`;
        for (const char of chars) output[`${family}:${char}`] = ctx.measureText(char).width / 100;
      }
      return output;
    }, texts);
    const margin = plan.margin;
    const width = 297 - 2*margin;
    const allBlocks: PositionedText[] = [];
    const types = groups.flatMap((g) => {
      if (g.key === 'when') return signText(g.value).split('\n').filter(Boolean).map((value,i) => ({ key: `when-${i}`, text: value, weight: .85, family: 'Sign', maxLines: 1, scale: plan.scale }));
      if (g.key === 'exception') return [
        { key: 'exception-condition', text: facts.exception.condition+':', weight: .55, family: 'UI', maxLines: 2, scale: plan.exceptionScale },
        { key: 'exception-instruction', text: signText(facts.exception.instruction), weight: 1.25, family: 'Sign', maxLines: 2, scale: plan.exceptionScale },
      ];
      return [{ key: g.key, text: signText(g.value), weight: g.key === 'who' ? .85 : g.key === 'what' ? (plan.emphasis === 'action' ? 3.4 : 2.5) : (plan.emphasis === 'destination' ? 3.8 : 2.8), family: 'Sign', maxLines: g.key === 'who' ? 2 : 3, scale: plan.scale }];
    });
    const gaps = (types.length-1)*2.5 + (facts.exception.status === 'known' ? 7 : 0);
    const usableHeight = 420 - margin*2 - gaps;
    const totalWeight = types.reduce((sum,b) => sum+b.weight, 0);
    let y = margin;
    const issues: string[] = [];
    const minimumFontMm = ({ 1: 5, 3: 7, 5: 10 })[distance];
    let ruleY = 0;
    for (const block of types) {
      if (block.key === 'exception-condition') { ruleY = y+1; y += 7; }
      const height = usableHeight*block.weight/totalWeight;
      let font = Math.min(block.family === 'UI' ? 13*block.scale : 112*block.scale, height/(block.family === 'UI' ? .8 : .72));
      let lines: string[] = [];
      for (; font >= 3; font -= .25) {
        lines = wrapText(block.text, width - (block.key.startsWith('exception') ? 6 : 0), font, widths, block.family);
        const widest = Math.max(...lines.map(line => [...line].reduce((sum,char) => sum+(widths[`${block.family}:${char}`] || .5),0)*font));
        if (lines.length <= block.maxLines && lines.length*font*(block.family === 'UI' ? 1.03 : .86) <= height && widest <= width) break;
      }
      if (font < minimumFontMm) issues.push(`The ${block.key.startsWith('exception') ? 'conditional note' : block.key} is too small for the selected layout settings.`);
      const lineHeight = font*(block.family === 'UI' ? 1.03 : .86);
      const placed = { key: block.key, text: block.text, lines, x: margin+(block.key.startsWith('exception') ? 6 : 0), y: y+font*.72, width, height, font: Math.round(font*100)/100, family: block.family, weight: block.family === 'UI' ? 600 : 900 };
      allBlocks.push(placed);
      y += Math.max(height, lines.length*lineHeight)+2.5;
    }
    const content = allBlocks.map(b => `<text data-block="${b.key}" x="${b.x}" y="${b.y}" fill="#17282B" font-family="${b.family}" font-weight="${b.weight}" font-size="${b.font}" letter-spacing="-0.15">${b.lines.map((line,i) => `<tspan x="${b.x}" dy="${i ? b.font*(b.family === 'UI' ? 1.03 : .86) : 0}">${xml(line)}</tspan>`).join('')}</text>`).join('');
    const exceptionBottom = Math.max(...allBlocks.filter(b=>b.key.startsWith('exception')).map(b=>b.y+b.height));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="420mm" viewBox="0 0 297 420" role="img"><title>${xml(facts.what.value)}</title><style>${style}</style><rect width="297" height="420" fill="#FFFFFF"/>${ruleY ? `<path d="M${margin} ${ruleY}H${297-margin}" stroke="#17282B" stroke-width="0.8"/><rect x="${margin}" y="${ruleY+6}" width="2.8" height="${Math.min(420-margin-ruleY-6,exceptionBottom-ruleY)}" fill="#F1E36A"/>` : ''}${content}</svg>`;
    await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:white}svg{display:block;width:1122.52px;height:1587.4px}</style></head><body>${svg}</body></html>`);
    await page.evaluate(async () => { await document.fonts.ready; });
    // SVG text getBBox includes the font's unpainted em-cell. Inspect actual ink
    // bounds instead, with the very same loaded font and letter spacing.
    const measurements = await page.evaluate((blocks)=>{
      const ctx = document.createElement('canvas').getContext('2d')!;
      return blocks.flatMap(block=>block.lines.map((line,i)=>{
        ctx.font = `${block.weight} 100px ${block.family}`;
        ctx.letterSpacing = `${-0.15*100/block.font}px`;
        const metric = ctx.measureText(line);
        const baseline = block.y+i*block.font*(block.family==='UI' ? 1.03 : .86);
        return { key:block.key, x:block.x-metric.actualBoundingBoxLeft*block.font/100,
          right:block.x+metric.actualBoundingBoxRight*block.font/100,
          y:baseline-metric.actualBoundingBoxAscent*block.font/100,
          bottom:baseline+metric.actualBoundingBoxDescent*block.font/100 };
      }));
    },allBlocks);
    for (const box of measurements) if (box.x < margin-.5 || box.right > 297-margin+.5 || box.y < margin-.5 || box.bottom > 420-margin+.5) issues.push(`The ${box.key} does not fit inside the print margins.`);
    for (let i=0;i<measurements.length;i++) for (let j=i+1;j<measurements.length;j++) {
      const a=measurements[i],b=measurements[j];
      if (a.x < b.right && b.x < a.right && a.y < b.bottom-.2 && b.y < a.bottom-.2) issues.push(`The ${a.key} and ${b.key} text overlap.`);
    }
    const png = await page.locator('svg').screenshot({ type: 'png' });
    return { svg, png, hash: createHash('sha256').update(svg).digest('hex'), layoutPassed: issues.length === 0, issues, blocks: allBlocks, minimumFontMm };
  } finally { await page.close(); }
}

export async function exportPdf(svg: string): Promise<Buffer> {
  const browser = await renderBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(`<!doctype html><html><head><style>@page{size:A3 portrait;margin:0}html,body{width:297mm;height:420mm;margin:0;padding:0}svg{display:block;width:297mm;height:420mm;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body>${svg}</body></html>`);
    await page.evaluate(async ()=>{await document.fonts.ready;});
    const raw = await page.pdf({ format: 'A3', preferCSSPageSize: true, printBackground: true, margin: { top:0,bottom:0,left:0,right:0 }, tagged: true });
    // Chromium rounds physical CSS paper dimensions to device pixels. Normalize
    // the final page box/content so the deliverable is exactly 297 × 420 mm.
    const pdfDoc = await PDFDocument.load(raw);
    if (pdfDoc.getPageCount() !== 1) throw new Error('The sign did not fit on one A3 page.');
    const printedPage = pdfDoc.getPage(0);
    const targetWidth=297*72/25.4,targetHeight=420*72/25.4;
    printedPage.scale(targetWidth/printedPage.getWidth(),targetHeight/printedPage.getHeight());
    return Buffer.from(await pdfDoc.save());
  } finally { await page.close(); }
}
