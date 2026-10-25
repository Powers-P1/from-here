import { describe,it,expect } from 'vitest';
import { blockingFacts,formatTime,type NoticeFacts } from '../shared/contracts.js';
import { compareFacts,normalizeText,semanticFactIssues } from '../server/agent/checks.js';

export const facts = (): NoticeFacts => ({
  who:{value:'Parents · Grades 1–3',status:'known'},what:{value:'Child pickup',status:'known'},where:{value:'East Entrance',status:'known'},
  date:{value:'Mon 26 Oct 2026',status:'known'},time:{value:'4:30 PM',status:'known'},timeMeaning:'from',
  exception:{status:'known',condition:'Wheelchair-accessible pickup',instruction:'Main Entrance'},
});
describe('Meaning is more important than a five-word match',()=>{
  it('accepts case and unambiguous time/date format differences',()=>{
    const expected=facts(),read=facts();
    read.who.value='PARENTS - GRADES 1-3';read.date.value='Monday, October 26, 2026';read.time.value='16:30';
    expect(compareFacts(expected,read).rows.every(r=>r.passed)).toBe(true);
  });
  it('does not collapse numeric ranges into a different grade',()=>{
    const expected=facts(),read=facts();expected.who.value='Grades 1–2';read.who.value='Grades 12';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='who')?.passed).toBe(false);
    expect(normalizeText('Room 1/2')).not.toBe(normalizeText('Room 12'));
  });
  it('keeps a complete time range rather than only its first hour',()=>{
    const expected=facts(),read=facts();expected.time.value='8:00–10:00';read.time.value='8:00 AM';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='when')?.passed).toBe(false);
  });
  it('keeps a complete date range',()=>{
    const expected=facts(),read=facts();expected.date.value='26–28 October 2026';read.date.value='26 October 2026';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='when')?.passed).toBe(false);
  });
  it('does not invent a meridiem for a bare hour',()=>{
    expect(formatTime('3:00')).toBe('3:00');expect(formatTime('15:00')).toBe('15:00');
    const expected=facts(),read=facts();expected.time.value='3:00';read.time.value='3:00 AM';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='when')?.passed).toBe(false);
  });
  it('rejects losing FROM or reversing the exception',()=>{
    const expected=facts(),read=facts();read.timeMeaning='at';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='when')?.passed).toBe(false);
    read.timeMeaning='from';read.exception.condition='General pickup';read.exception.instruction='East Entrance';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='exception')?.passed).toBe(false);
  });
  it('rejects an incorrect explicit weekday',()=>{
    const expected=facts(),read=facts();read.date.value='Tuesday 26 October 2026';
    expect(compareFacts(expected,read).rows.find(r=>r.key==='when')?.passed).toBe(false);
  });
  it('does not force an absent field, but blocks an unreadable one',()=>{
    const value=facts();value.time={value:'',status:'not_stated'};value.timeMeaning='not_stated';
    value.exception={condition:'',instruction:'',status:'not_stated'};
    expect(blockingFacts(value)).toEqual([]);
    value.time.status='unreadable';value.timeMeaning='unreadable';
    expect(blockingFacts(value)).toContain('Start time needs confirming.');
  });
  it('detects inconsistent model statuses and extra readback facts',()=>{
    const value=facts();value.exception.status='not_stated';
    expect(semanticFactIssues(value)).toContain('exception status conflicts with its values');
    value.exception={status:'not_stated',condition:'',instruction:''};
    expect(compareFacts(value,facts()).extra).toHaveLength(1);
  });
});
