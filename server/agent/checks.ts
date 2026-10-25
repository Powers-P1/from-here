import { factGroups, whenText, type CheckReport, type NoticeFacts } from '../../shared/contracts.js';
import type { RenderedSign } from '../render/renderer.js';
import { literalsKept } from '../../shared/sign-text.js';

export function normalizeText(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[–—−]/g,'-')
    .replace(/\b(?:please|the)\b/g,'').replace(/^\s*use\s+/,'')
    .replace(/(\d)\s*(?:-|to|through)\s*(?=\d)/g,'$1range')
    .replace(/(\d)\s*:\s*(?=\d)/g,'$1colon')
    .replace(/(\d)\s*\/\s*(?=\d)/g,'$1slash')
    .replace(/(\d)\s*,\s*(?=\d)/g,'$1comma')
    .replace(/(\d)\s*\.\s*(?=\d)/g,'$1decimal')
    .replace(/[^\p{L}\p{N}]/gu,'');
}

function dateParts(value: string): string {
  const clean = value.toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g,'$1').replace(/^\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*,?\s*/,'').trim();
  const iso = clean.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${Number(iso[2])}-${Number(iso[3])}`;
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const dmy = clean.match(/^(\d{1,2})\s+([a-z]+)\s*,?\s*(20\d{2})$/);
  const mdy = clean.match(/^([a-z]+)\s+(\d{1,2})\s*,?\s*(20\d{2})$/);
  const monthName = dmy?.[2] || mdy?.[1];
  const month = months.indexOf(monthName?.slice(0,3) || '');
  const year = dmy?.[3] || mdy?.[3];
  const day = dmy?.[1] || mdy?.[2];
  // Only canonicalize a complete single date; preserve ranges and lists in full.
  return month>=0 && year && day ? `${year}-${month+1}-${Number(day)}` : `literal:${normalizeText(value)}`;
}
function weekday(value: string): string | undefined {
  return value.toLowerCase().match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/)?.[1];
}
function timeParts(value: string): string {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!match) return `literal:${normalizeText(value)}`;
  let h = Number(match[1]);
  if (h>23 || Number(match[2])>59) return `invalid:${normalizeText(value)}`;
  if (!match[3] && h>=1 && h<=12) return `unspecified:${h}:${match[2]}`;
  if (match[3]) { h %= 12; if (match[3].startsWith('p')) h += 12; }
  return `clock:${h}:${match[2]}`;
}

export function compareFacts(expected: NoticeFacts, observed: NoticeFacts) {
  const expectedGroups = factGroups(expected);
  const observedGroups = factGroups(observed);
  const rows = expectedGroups.filter(g=>g.status==='known').map(group=>{
    const actual = observedGroups.find(g=>g.key===group.key)!;
    let passed = actual.status==='known' && normalizeText(group.value)===normalizeText(actual.value);
    if (group.key==='when') {
      const dateOk = expected.date.status === 'known' ? observed.date.status==='known' && dateParts(expected.date.value)===dateParts(observed.date.value) &&
        (!weekday(expected.date.value) || !weekday(observed.date.value) || weekday(expected.date.value)===weekday(observed.date.value)) : observed.date.status!=='known';
      const timeOk = expected.time.status==='known' ? observed.time.status==='known' && timeParts(expected.time.value)===timeParts(observed.time.value) && expected.timeMeaning===observed.timeMeaning : observed.time.status!=='known';
      passed = dateOk && timeOk;
    }
    if (group.key==='exception') passed = observed.exception.status==='known' && normalizeText(expected.exception.condition)===normalizeText(observed.exception.condition) && normalizeText(expected.exception.instruction)===normalizeText(observed.exception.instruction);
    passed = passed && literalsKept(group.value,actual.value);
    return {key:group.key,expected:group.value,observed:actual.value,passed};
  });
  const extra = expectedGroups.filter(g=>g.status!=='known' && observedGroups.find(v=>v.key===g.key)?.status==='known').map(g=>`The AI read an extra ${g.key} detail that was not in the confirmed facts.`);
  return {rows,extra};
}

export function checkSign(facts: NoticeFacts, observed: NoticeFacts, sign: RenderedSign): CheckReport {
  const {rows,extra} = compareFacts(facts,observed);
  const visible = sign.blocks.map(b=>b.text).join(' ');
  const content = factGroups(facts).filter(g=>g.status==='known').every(g=>normalizeText(visible).includes(normalizeText(g.value)) && literalsKept(g.value,visible));
  const issues = [...sign.issues,...extra];
  if (!content) issues.push('The rendered layout did not keep all confirmed details.');
  const names = {who:'the audience',what:'the main instruction',where:'the general destination',when:'the date or time qualifier',exception:'the conditional pickup or access note'};
  for (const row of rows) if (!row.passed) issues.push(`The AI check could not recover ${names[row.key]} exactly enough to match your confirmed details.`);
  const semanticIssues = semanticFactIssues(observed);
  if (semanticIssues.length) issues.push('The AI reading contained an inconsistent detail. Review the sign.');
  const readback = rows.every(row=>row.passed) && extra.length===0 && semanticIssues.length===0;
  return {passed:content && sign.layoutPassed && readback,content,layout:sign.layoutPassed,readback,
    matched:rows.filter(r=>r.passed).length,total:rows.length,issues,rows,checkedArtifactHash:sign.hash};
}

export function semanticFactIssues(facts: NoticeFacts): string[] {
  const errors: string[] = [];
  for (const key of ['who','what','where','date','time'] as const) {
    const field = facts[key];
    if (field.status==='known' && !field.value.trim()) errors.push(`${key} marked known without a value`);
    if (field.status!=='known' && field.value.trim()) errors.push(`${key} has an unconfirmed value`);
  }
  const exception = facts.exception;
  if (exception.status==='known' && (!exception.condition.trim() || !exception.instruction.trim())) errors.push('exception relation incomplete');
  if (exception.status!=='known' && (exception.condition.trim() || exception.instruction.trim())) errors.push('exception status conflicts with its values');
  if (facts.time.status==='known' && !['from','at','until'].includes(facts.timeMeaning)) errors.push('time qualifier missing');
  if (facts.time.status==='not_stated' && facts.timeMeaning!=='not_stated') errors.push('time absent but qualifier present');
  if (facts.time.status==='unreadable' && facts.timeMeaning!=='unreadable' && facts.timeMeaning!=='from' && facts.timeMeaning!=='at' && facts.timeMeaning!=='until') errors.push('unreadable time has no supported qualifier');
  return errors;
}
