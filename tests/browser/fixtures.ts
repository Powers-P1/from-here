import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Page, Route } from '@playwright/test';
import { factGroups, type NoticeFacts, type PublicJob } from '../../shared/contracts';

export const evidenceRoot = resolve(process.env.FROM_HERE_QA_DIR || '../outputs/from-here/product-qa/browser');
export const workshopFile = resolve('public/samples/community-workshop.png');
export const unclearFile = resolve('public/samples/school-pickup-unclear.png');
const kernel = resolve('tests/fixtures/checked-workshop');
const saved = JSON.parse(await readFile(resolve(kernel, 'report.json'), 'utf8')) as { facts: NoticeFacts };
const image = await readFile(resolve(kernel, 'sign.png'));
const pdf = await readFile(resolve(kernel, 'sign-A3.pdf'));
const svg = await readFile(resolve(kernel, 'sign.svg'));
const workshopSource = await readFile(workshopFile);
const unclearSource = await readFile(unclearFile);

export type Scenario = 'pass' | 'unknown' | 'stopped' | 'interrupted' | 'repair';
const unknownFacts: NoticeFacts = {
  who: { status: 'known', value: 'Parents Â· Grades 1â€“3' },
  what: { status: 'known', value: 'Child pickup' },
  where: { status: 'known', value: 'East Entrance' },
  date: { status: 'known', value: 'Monday, October 26, 2026' },
  time: { status: 'unreadable', value: '' }, timeMeaning: 'from',
  exception: { status: 'known', condition: 'Wheelchair-accessible pickup', instruction: 'Main Entrance' },
};

export async function mockApi(page: Page, scenario: Scenario = 'pass', pdfFailures = 0) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const facts = structuredClone(scenario === 'unknown' ? unknownFacts : saved.facts);
  let job: PublicJob;
  let sequence: PublicJob['phase'][] = [];
  let uploaded = 0;
  let delayedPoll = false;
  let heldFacts: { wait: Promise<void>; signalStarted: () => void } | null = null;
  const artifactHash = 'browser-fixture-artifact';
  const event = (type: PublicJob['history'][number]['type'], text: string) => ({ id: `fixture-event-${job.history.length}`, type, text, at: '2026-10-25T15:00:00.000Z', attempt: job.repairCount });
  const setReport = (passed: boolean) => {
    job.report = { passed, content: true, layout: true, readback: passed, matched: passed ? 5 : 4, total: 5,
      checkedArtifactHash: artifactHash, issues: passed ? [] : ['The AI check could not read the conditional instruction.'],
      rows: factGroups(job.facts!).map(group => ({ key: group.key, expected: group.value, observed: !passed && group.key === 'exception' ? '' : group.value.toUpperCase(), passed: passed || group.key !== 'exception' })) };
  };
  const applyPhase = (phase: PublicJob['phase']) => {
    job.phase = phase;
    if (['checking','repairing','passed','stopped','interrupted'].includes(phase)) job.artifactHash = artifactHash;
    if (phase === 'repairing') {
      job.repairCount = 1; setReport(false); job.history.push(event('check', 'The conditional instruction needs review'), event('repair', 'The conditional instruction was enlarged'));
    }
    if (phase === 'stopped') {
      job.repairCount = 2; setReport(false); job.history.push(event('stopped', 'Automatic checks not passed after two revisions'));
    }
    if (phase === 'interrupted') {
      job.repairCount = 1; setReport(false); job.interruptedPhase = 'checking'; job.error = 'The AI service did not respond.'; job.history.push(event('interrupted', job.error));
    }
    if (phase === 'passed') { setReport(true); job.history.push(event('passed', 'Automated checks passed')); }
  };

  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    let body: unknown;
    try { body = request.postDataJSON(); } catch { body = undefined; }
    calls.push({ method, path: url.pathname + url.search, body });
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

    if (path === '/api/jobs' && method === 'POST') {
      uploaded++;
      const form = request.postDataBuffer()?.toString('utf8') ?? '';
      const distance = Number(form.match(/name="distance"\r?\n\r?\n([135])/)?.[1] ?? '3') as 1 | 3 | 5;
      job = { id: `browser-fixture-${uploaded}`, name: scenario === 'unknown' ? 'school-pickup-unclear.png' : 'community-workshop.png', distance, phase: 'uploaded', facts: null, factsVersion: 0,
        extraction: null, artifactHash: null, repairCount: 0, report: null, history: [], receipts: [], error: null, interruptedPhase: null, createdAt: '2026-10-25T15:00:00.000Z' };
      return json(job, 201);
    }
    if (!job) return json({ error: 'No browser fixture was uploaded.' }, 404);
    if (path.endsWith('/source')) return route.fulfill({ contentType: 'image/png', body: scenario === 'unknown' ? unclearSource : workshopSource });
    if (path.endsWith('/preview')) return route.fulfill({ contentType: 'image/png', body: image });
    if (path.endsWith('/sign.svg')) return route.fulfill({ contentType: 'image/svg+xml', body: svg });
    if (path.endsWith('/download')) {
      const format = url.searchParams.get('format');
      const draft = url.searchParams.get('draft') === '1';
      if (job.phase !== 'passed' && !(job.phase === 'stopped' && draft && format === 'svg')) return json({ error: 'This fixture has not passed.' }, 409);
      if (format === 'pdf' && pdfFailures-- > 0) return json({ error: 'Injected browser-test export interruption.' }, 503);
      const filename = `community-workshop-A3${draft ? '-unchecked' : ''}.${format}`;
      return route.fulfill({ contentType: format === 'pdf' ? 'application/pdf' : 'image/svg+xml', body: format === 'pdf' ? pdf : svg,
        headers: { 'Content-Disposition': `attachment; filename="${filename}"` } });
    }
    if (path.endsWith('/read') && method === 'POST') { job.phase = 'reading'; sequence = ['review']; return json(job, 202); }
    if (path.endsWith('/facts') && method === 'PUT') {
      job.facts = structuredClone((body as { facts: NoticeFacts }).facts); job.factsVersion++; job.phase = 'review'; job.artifactHash = null; job.report = null; job.repairCount = 0; job.history = [];
      if (heldFacts) { const hold = heldFacts; heldFacts = null; hold.signalStarted(); await hold.wait; }
      return json(job);
    }
    if (path.endsWith('/design') && method === 'POST') {
      job.phase = 'planning'; job.history.push(event('plan', 'First layout planned'));
      sequence = scenario === 'repair' ? ['repairing'] : ['rendering','checking', scenario === 'stopped' ? 'stopped' : scenario === 'interrupted' ? 'interrupted' : 'passed'];
      return json(job, 202);
    }
    if (path.endsWith('/retry') && method === 'POST') {
      job.error = null; job.interruptedPhase = null; job.phase = 'checking'; sequence = ['passed']; return json(job, 202);
    }
    if (path.endsWith('/cancel') && method === 'POST') {
      job.phase = job.facts ? 'review' : 'uploaded'; job.error = null; job.interruptedPhase = null; sequence = []; job.history.push(event('cancelled', 'Action cancelled; notice kept'));
      return json(job);
    }
    if (method === 'DELETE') { sequence = []; return route.fulfill({ status: 204 }); }
    if (method === 'GET' && path === `/api/jobs/${job.id}`) {
      const next = sequence.shift();
      if (next === 'review') { job.facts = structuredClone(facts); job.factsVersion = 1; job.extraction = { language: 'english', supported: true, reason: '' }; job.phase = 'review'; job.history.push(event('read', 'Notice details read')); }
      else if (next) applyPhase(next);
      if (delayedPoll) {
        delayedPoll = false;
        const stale = { ...structuredClone(job), phase: 'passed' as const };
        await new Promise(resolve => setTimeout(resolve, 1300));
        try { return await json(stale); } catch { return; }
      }
      return json(job);
    }
    return json({ error: `Unexpected mocked route ${method} ${path}` }, 500);
  });

  return { calls, current: () => structuredClone(job), uploaded: () => uploaded, delayNextPoll: () => { delayedPoll = true; },
    holdNextFactsSave: () => {
      let release!: () => void; let signalStarted!: () => void;
      const wait = new Promise<void>(resolve => { release = resolve; });
      const started = new Promise<void>(resolve => { signalStarted = resolve; });
      heldFacts = { wait, signalStarted };
      return { started, release };
    },
    setPassed: () => { applyPhase('passed'); sequence = ['passed']; } };
}
