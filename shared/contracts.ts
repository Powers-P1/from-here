export type FieldStatus = 'known' | 'unreadable' | 'not_stated';
export interface FactField { value: string; status: FieldStatus }
export type TimeMeaning = 'from' | 'at' | 'until' | 'not_stated' | 'unreadable';
export interface NoticeFacts {
  who: FactField;
  what: FactField;
  where: FactField;
  date: FactField;
  time: FactField;
  timeMeaning: TimeMeaning;
  exception: { status: FieldStatus; condition: string; instruction: string };
}
export interface Extraction {
  language: 'english' | 'other' | 'unreadable';
  supported: boolean;
  reason: string;
  sourceText: string;
  facts: NoticeFacts;
}
export interface LayoutPlan {
  emphasis: 'destination' | 'action';
  scale: number;
  exceptionScale: number;
  margin: number;
  reason: string;
}
export type FactGroup = 'who' | 'what' | 'where' | 'when' | 'exception';
export interface ReadbackRow { key: FactGroup; expected: string; observed: string; passed: boolean }
export interface CheckReport {
  passed: boolean;
  content: boolean;
  layout: boolean;
  readback: boolean;
  matched: number;
  total: number;
  issues: string[];
  rows: ReadbackRow[];
  checkedArtifactHash: string;
}
export interface HistoryEvent {
  id: string;
  type: 'read' | 'plan' | 'render' | 'check' | 'repair' | 'passed' | 'stopped' | 'interrupted' | 'cancelled';
  text: string;
  at: string;
  attempt: number;
}
export type JobPhase = 'uploaded' | 'reading' | 'review' | 'planning' | 'rendering' | 'checking' | 'repairing' | 'passed' | 'stopped' | 'interrupted';
export interface ModelReceipt {
  provider: string;
  model: string;
  operation: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  requestHash: string;
  finishReason?: string;
  isolation?: { input: 'rendered_image' | 'rendered_image_transcript'; sourceIncluded: false; answerKeyIncluded: false; priorHistoryIncluded: false };
}
export interface PublicJob {
  id: string;
  name: string;
  distance: 1 | 3 | 5;
  phase: JobPhase;
  facts: NoticeFacts | null;
  factsVersion: number;
  extraction: { language: Extraction['language']; supported: boolean; reason: string } | null;
  artifactHash: string | null;
  repairCount: number;
  report: CheckReport | null;
  history: HistoryEvent[];
  receipts: ModelReceipt[];
  error: string | null;
  interruptedPhase: JobPhase | null;
  createdAt: string;
}

const status = { type: 'string', enum: ['known', 'unreadable', 'not_stated'] };
const field = { anyOf: [
  { type:'object',additionalProperties:false,properties:{value:{type:'string',minLength:1,maxLength:240},status:{type:'string',const:'known'}},required:['value','status'] },
  { type:'object',additionalProperties:false,properties:{value:{type:'string',const:''},status:{type:'string',enum:['unreadable','not_stated']}},required:['value','status'] },
] };
export const factsSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    who: field, what: field, where: field, date: field, time: field,
    timeMeaning: { type: 'string', enum: ['from', 'at', 'until', 'not_stated', 'unreadable'] },
    exception: { anyOf:[
      {type:'object',additionalProperties:false,properties:{status:{type:'string',const:'known'},condition:{type:'string',minLength:1,maxLength:200},instruction:{type:'string',minLength:1,maxLength:240}},required:['status','condition','instruction']},
      {type:'object',additionalProperties:false,properties:{status:{type:'string',enum:['unreadable','not_stated']},condition:{type:'string',const:''},instruction:{type:'string',const:''}},required:['status','condition','instruction']},
    ] },
  }, required: ['who', 'what', 'where', 'date', 'time', 'timeMeaning', 'exception'],
};
export const extractionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    language: { type: 'string', enum: ['english', 'other', 'unreadable'] },
    supported: { type: 'boolean' }, reason: { type: 'string', maxLength: 400 },
    sourceText: { type: 'string', maxLength: 5000 }, facts: factsSchema,
  }, required: ['language', 'supported', 'reason', 'sourceText', 'facts'],
};
export const layoutSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    emphasis: { type: 'string', enum: ['destination', 'action'] },
    scale: { type: 'number', minimum: 0.8, maximum: 1.15 },
    exceptionScale: { type: 'number', minimum: 0.85, maximum: 1.5 },
    margin: { type: 'number', minimum: 14, maximum: 22 },
    reason: { type: 'string', maxLength: 360 },
  }, required: ['emphasis', 'scale', 'exceptionScale', 'margin', 'reason'],
};

export const FIELD_LABELS: Record<FactGroup, string> = { who: 'Who', what: 'What', where: 'Where', when: 'When', exception: 'Exception' };
export const isKnown = (field: FactField) => field.status === 'known' && Boolean(field.value.trim());

export function formatTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2})[:.](\d{2})\s*([ap]\.?m\.?)?$/i);
  if (!match) return value.trim();
  const hour = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || hour > 23) return value.trim();
  if (match[3]) return `${hour}:${match[2]} ${match[3].replaceAll('.', '').toUpperCase()}`;
  // A bare hour in a source is not permission to invent AM or PM.
  return value.trim();
}

export function whenText(facts: NoticeFacts): string {
  const date = isKnown(facts.date) ? facts.date.value.trim() : '';
  const time = isKnown(facts.time) ? formatTime(facts.time.value) : '';
  const prefix = ({ from: 'From', at: 'At', until: 'Until' } as Record<string,string>)[facts.timeMeaning] || '';
  return [date, time ? `${prefix} ${time}`.trim() : ''].filter(Boolean).join('\n');
}

export function factGroups(facts: NoticeFacts): { key: FactGroup; value: string; status: FieldStatus }[] {
  return [
    { key: 'who', value: facts.who.value, status: facts.who.status },
    { key: 'what', value: facts.what.value, status: facts.what.status },
    { key: 'where', value: facts.where.value, status: facts.where.status },
    { key: 'when', value: whenText(facts), status: facts.date.status === 'unreadable' || facts.time.status === 'unreadable' || facts.timeMeaning === 'unreadable' ? 'unreadable' : whenText(facts) ? 'known' : 'not_stated' },
    { key: 'exception', value: [facts.exception.condition, facts.exception.instruction].filter(Boolean).join(': '), status: facts.exception.status },
  ];
}

export function blockingFacts(facts: NoticeFacts): string[] {
  const errors: string[] = [];
  for (const key of ['who','what','where','date','time'] as const) {
    const item = facts[key];
    if (item.status === 'unreadable') errors.push(`${key === 'time' ? 'Start time' : key[0].toUpperCase()+key.slice(1)} needs confirming.`);
    if (item.status === 'known' && !item.value.trim()) errors.push(`${key} cannot be empty when confirmed.`);
  }
  if (facts.exception.status === 'unreadable') errors.push('The conditional instruction needs confirming.');
  if (facts.exception.status === 'known' && (!facts.exception.condition.trim() || !facts.exception.instruction.trim())) errors.push('Keep both the condition and its instruction.');
  if (isKnown(facts.time) && !['from','at','until'].includes(facts.timeMeaning)) errors.push('Confirm what the time means.');
  if (!isKnown(facts.what)) errors.push('Confirm the main action or instruction.');
  return errors;
}

export const emptyFacts = (): NoticeFacts => ({
  who: { value: '', status: 'not_stated' }, what: { value: '', status: 'unreadable' }, where: { value: '', status: 'not_stated' },
  date: { value: '', status: 'not_stated' }, time: { value: '', status: 'not_stated' }, timeMeaning: 'not_stated',
  exception: { status: 'not_stated', condition: '', instruction: '' },
});
