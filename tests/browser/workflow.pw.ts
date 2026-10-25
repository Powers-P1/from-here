import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { evidenceRoot, mockApi, unclearFile, workshopFile } from './fixtures';

// These are application regressions with intercepted API responses. They do not
// execute a model and are not evidence of extraction, readback or print quality.
const diagnostics = new WeakMap<Page, { runtime: string[]; console: { text: string; url: string }[] }>();
test.beforeAll(async () => { await mkdir(evidenceRoot, { recursive: true }); });
test.beforeEach(async ({ page }) => {
  const log = { runtime: [] as string[], console: [] as { text: string; url: string }[] };
  diagnostics.set(page, log);
  page.on('pageerror', error => log.runtime.push(error.message));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') log.console.push({ text: message.text(), url: message.location().url }); });
});
test.afterEach(async ({ page }, testInfo) => {
  const log = diagnostics.get(page)!;
  await testInfo.attach('console-health', { body: JSON.stringify(log, null, 2), contentType: 'application/json' });
  expect(log.runtime, 'No unhandled application exceptions').toEqual([]);
  const unexpected = log.console.filter(message => !(message.url.includes('/download?format=pdf') && /Failed to load resource.*status of 503/.test(message.text)));
  expect(unexpected, 'Only deliberately injected API HTTP errors are allowed').toEqual([]);
});

async function openAndRead(page: Page, source = workshopFile) {
  await page.goto('/');
  await expect(page).toHaveTitle('FROM HERE — A clearer sign');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.getByTestId('notice-file-input').setInputFiles(source);
  await expect(page.locator('[data-view="M02"]')).toBeVisible();
  await page.getByRole('button', { name: 'Find key details', exact: true }).click();
  await expect(page.locator('[data-view="M05"], [data-view="M06"]')).toBeVisible();
}
async function passedResult(page: Page) {
  await openAndRead(page);
  await page.getByRole('button', { name: 'Confirm & redesign', exact: true }).click();
  await expect(page.locator('[data-view="M12"]')).toBeVisible();
}
async function shot(page: Page, name: string) {
  const modalOpen = await page.locator('dialog[open]').count() > 0;
  await page.screenshot({ path: resolve(evidenceRoot, name + '.png'), fullPage: !modalOpen });
}
async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
}

test('laptop: accessible upload, all fact editors, source replacement and the main checked result', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Choose a notice photo, PNG or JPG', exact: true })).toBeVisible();
  for (const input of await page.locator('input[type="file"]').all()) {
    await expect(input).toHaveAttribute('hidden', ''); await expect(input).toHaveAttribute('aria-hidden', 'true');
  }
  const initialAX = await page.locator('body').ariaSnapshot();
  expect(initialAX).not.toContain('Replace the notice photo');
  expect(initialAX).not.toContain('textbox');
  await shot(page, 'laptop-upload');
  await openAndRead(page);
  const primary = page.getByRole('button', { name: 'Confirm & redesign', exact: true });
  const primaryBox = await primary.boundingBox();
  expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(720);
  await expect(page.getByRole('button', { name: 'Change photo', exact: true })).toBeVisible();
  await shot(page, 'laptop-facts-1259x720');

  await page.getByRole('button', { name: 'Edit Who', exact: true }).click();
  await expect(page.locator('#edit-who')).toBeFocused();
  await page.locator('#edit-who').fill('WORKSHOP ATTENDEES');
  const heldSave = api.holdNextFactsSave();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await heldSave.started;
  try {
    await expect(page.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    await expect(page.locator('dialog.edit-modal').getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancel editing', exact: true })).toBeDisabled();
    await expect(page.locator('#edit-who')).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.edit-modal')).toBeVisible();
    await expect(page.locator('dialog.edit-modal')).toContainText('Saving your confirmed details…');
    await shot(page, 'laptop-saving-cannot-dismiss');
  } finally { heldSave.release(); }
  await expect(page.getByRole('button', { name: 'Edit Who', exact: true })).toContainText('WORKSHOP ATTENDEES');
  expect(api.current().factsVersion).toBe(2);
  expect(api.current().artifactHash).toBeNull();

  for (const group of ['What','Where','When','Exception']) {
    const opener = page.getByRole('button', { name: `Edit ${group}`, exact: true });
    await opener.click();
    await expect(page.locator('dialog.edit-modal')).toBeVisible();
    if (group === 'When') { await expect(page.locator('#edit-time')).toHaveValue('6:00 PM'); await expect(page.locator('#edit-time-meaning')).toHaveValue('from'); }
    if (group === 'Exception') { await expect(page.locator('#exception-condition')).toHaveValue('step-free access'); await expect(page.locator('#exception-instruction')).toHaveValue('use the West Door'); }
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.edit-modal')).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
  await page.getByRole('button', { name: 'Edit What', exact: true }).click();
  await page.locator('#edit-what').fill('Discard this unsaved change');
  await page.locator('dialog.edit-modal').getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(api.current().factsVersion).toBe(2);
  await expect(page.getByRole('button', { name: 'Edit What', exact: true })).toContainText('community workshop');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Change photo', exact: true }).click();
  await expect(page.locator('[data-view="M17"]')).toHaveCount(0);
  await (await chooser).setFiles(workshopFile);
  await expect(page.locator('[data-view="M17"]')).toBeVisible();
  await page.getByRole('button', { name: 'Keep working', exact: true }).click();
  expect(api.uploaded()).toBe(1);
  await expect(page.getByRole('button', { name: 'Edit Who', exact: true })).toContainText('WORKSHOP ATTENDEES');
  await page.getByRole('button', { name: 'Edit Exception', exact: true }).click();
  await page.locator('#exception-status').selectOption('unreadable');
  await expect(page.locator('#exception-condition')).toHaveValue('');
  await expect(page.locator('#exception-instruction')).toHaveValue('');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('[data-view="M06"]')).toBeVisible();
  await expect(primary).toBeDisabled();
  expect(api.current().facts!.exception).toEqual({ status: 'unreadable', condition: '', instruction: '' });
  const unreadablePut = api.calls.findLast(call => call.method === 'PUT')!.body as { facts: { exception: unknown } };
  expect(unreadablePut.facts.exception).toEqual({ status: 'unreadable', condition: '', instruction: '' });
  await page.getByRole('button', { name: 'Edit Exception', exact: true }).click();
  await page.locator('#exception-status').selectOption('known');
  await page.locator('#exception-condition').fill('step-free access');
  await page.locator('#exception-instruction').fill('use the West Door');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(primary).toBeEnabled();
  await primary.click();
  await expect(page.locator('[data-view="M12"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your message, clearer.' })).toBeVisible();
  await noHorizontalOverflow(page);
  await shot(page, 'laptop-passed-result');
  await page.getByRole('button', { name: 'View checks and changes', exact: false }).click();
  await expect(page.getByRole('columnheader', { name: 'Your details', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Changes made', exact: true })).toBeVisible();
});

test('unknown time stays blank and blocked; source, invalid replacement and reset cancel retain the edit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await mockApi(page, 'unknown');
  await openAndRead(page, unclearFile);
  await expect(page.getByRole('button', { name: 'Confirm & redesign', exact: true })).toBeDisabled();
  expect(await page.locator('body').innerText()).not.toContain('4:30');
  await shot(page, 'mobile-unknown-time');
  await page.getByRole('button', { name: 'Confirm the time', exact: true }).click();
  await expect(page.locator('#edit-time')).toHaveValue('');
  await expect(page.locator('#edit-time')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Confirm time', exact: true })).toBeDisabled();
  expect(await page.locator('dialog.edit-modal').innerText()).not.toContain('4:30');
  await page.locator('#edit-time').fill('5:15 PM');
  const editor = page.locator('dialog.edit-modal');
  await editor.getByRole('button', { name: 'View original', exact: true }).click();
  await expect(page.locator('dialog.source-viewer')).toBeVisible();
  const sourceWidth = await page.locator('.source-viewport img').evaluate(element => element.getBoundingClientRect().width);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect(await page.locator('.source-viewport img').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(sourceWidth);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#edit-time')).toHaveValue('5:15 PM');
  await expect(editor.getByRole('button', { name: 'View original', exact: true })).toBeFocused();

  const invalidChooser = page.waitForEvent('filechooser');
  await editor.getByRole('button', { name: 'Use a clearer photo', exact: true }).click();
  await (await invalidChooser).setFiles({ name: 'not-a-photo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 browser fixture') });
  await expect(page.locator('dialog.replacement-error')).toBeVisible();
  await expect(page.locator('dialog.replacement-error')).toContainText('This file is not a JPG or PNG.');
  await page.locator('dialog.replacement-error').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#edit-time')).toHaveValue('5:15 PM');
  expect(api.uploaded()).toBe(1);
  expect(api.current().factsVersion).toBe(1);
  expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(0);

  const validChooser = page.waitForEvent('filechooser');
  await editor.getByRole('button', { name: 'Use a clearer photo', exact: true }).click();
  await (await validChooser).setFiles(unclearFile);
  await expect(page.locator('[data-view="M17"]')).toBeVisible();
  await page.getByRole('button', { name: 'Keep working', exact: true }).click();
  await expect(page.locator('#edit-time')).toHaveValue('5:15 PM');
  await shot(page, 'mobile-time-edit-retained');
  await page.getByRole('button', { name: 'Confirm time', exact: true }).click();
  await expect(page.locator('[data-view="M05"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm & redesign', exact: true })).toBeEnabled();
  expect(api.current().facts!.time.value).toBe('5:15 PM');
  expect(api.current().factsVersion).toBe(2);
  expect(api.calls.some(call => call.path.endsWith('/design'))).toBe(false);
  await noHorizontalOverflow(page);
});

test('cancel ignores a delayed response and preserves the consumed repair budget', async ({ page }) => {
  const api = await mockApi(page, 'repair');
  await openAndRead(page);
  await page.getByRole('button', { name: 'Confirm & redesign', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Repair 1 of 2', exact: true })).toBeVisible();
  api.delayNextPoll();
  const previousGets = api.calls.filter(call => call.method === 'GET' && /\/api\/jobs\/browser-fixture-1$/.test(call.path)).length;
  await expect.poll(() => api.calls.filter(call => call.method === 'GET' && /\/api\/jobs\/browser-fixture-1$/.test(call.path)).length).toBeGreaterThan(previousGets);
  await page.getByRole('button', { name: 'Cancel and review details', exact: true }).click();
  await expect(page.locator('[data-view="M05"]')).toBeVisible();
  await page.waitForTimeout(1500); // Deliberately later than the stale intercepted poll response.
  await expect(page.locator('[data-view="M12"]')).toHaveCount(0);
  await expect(page.locator('[data-view="M05"]')).toBeVisible();
  expect(api.current().repairCount).toBe(1);
  expect(api.calls.filter(call => call.path.endsWith('/cancel'))).toHaveLength(1);
});

test('service outage resumes checking with Retry and retains its repair budget', async ({ page }) => {
  const api = await mockApi(page, 'interrupted');
  await openAndRead(page);
  await page.getByRole('button', { name: 'Confirm & redesign', exact: true }).click();
  await expect(page.locator('[data-view="M11"]')).toBeVisible();
  await expect(page.getByText('This step could not finish. Your notice and details are kept.', { exact: true })).toBeVisible();
  await expect(page.getByText('Automatic checks not passed', { exact: true })).toHaveCount(0);
  await shot(page, 'desktop-service-interrupted');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('[data-view="M12"]')).toBeVisible();
  expect(api.current().repairCount).toBe(1);
  expect(api.calls.filter(call => call.path.endsWith('/read'))).toHaveLength(1);
  expect(api.calls.filter(call => call.path.endsWith('/design'))).toHaveLength(1);
  expect(api.calls.filter(call => call.path.endsWith('/retry'))).toHaveLength(1);
});

test('quality stop stays unchecked after draft export and reset cancel preserves its context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await mockApi(page, 'stopped');
  await openAndRead(page);
  await page.getByRole('button', { name: 'Confirm & redesign', exact: true }).click();
  await expect(page.locator('[data-view="M10"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review confirmed details', exact: true })).toBeVisible();
  await shot(page, 'mobile-quality-stop');
  const draft = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download draft SVG (unchecked)', exact: true }).click();
  const file = await draft;
  expect(file.suggestedFilename()).toBe('community-workshop-A3-unchecked.svg');
  await file.saveAs(resolve(evidenceRoot, file.suggestedFilename()));
  await expect(page.locator('[data-view="M15"]')).toContainText('Unchecked draft');
  await page.getByRole('button', { name: 'Back to draft', exact: true }).click();
  await expect(page.locator('[data-view="M10"]')).toBeVisible();
  expect(api.current().phase).toBe('stopped'); expect(api.current().repairCount).toBe(2);
  await page.getByRole('button', { name: 'New notice', exact: true }).click();
  await page.getByRole('button', { name: 'Keep working', exact: true }).click();
  await expect(page.locator('[data-view="M10"]')).toBeVisible();
  expect(api.current().phase).toBe('stopped');
  await page.getByRole('button', { name: 'New notice', exact: true }).click();
  await page.getByRole('button', { name: 'Start new notice', exact: true }).click();
  await expect(page.locator('[data-view="M01"]')).toBeVisible();
  expect(api.calls.filter(call => call.method === 'DELETE')).toHaveLength(1);
});

test('Original exports the redesigned SVG/PDF, recovers export failure and returns to Original', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await mockApi(page, 'pass', 1);
  await passedResult(page);
  await page.getByRole('tab', { name: 'Original', exact: true }).click();
  await expect(page.locator('[data-view="M13"]')).toBeVisible();
  await page.getByRole('button', { name: 'Download redesigned PDF', exact: true }).click();
  await expect(page.locator('[data-view="M16"]')).toBeVisible();
  await shot(page, 'mobile-export-error-original');
  const svgDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download editable SVG', exact: true }).click();
  expect((await svgDownload).suggestedFilename()).toBe('community-workshop-A3.svg');
  await page.getByRole('button', { name: 'Back to result', exact: true }).click();
  await expect(page.locator('[data-view="M13"]')).toBeVisible();
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download redesigned PDF', exact: true }).click();
  const file = await pdfDownload; expect(file.suggestedFilename()).toBe('community-workshop-A3.pdf');
  await file.saveAs(resolve(evidenceRoot, file.suggestedFilename()));
  await page.getByRole('button', { name: 'Back to result', exact: true }).click();
  await expect(page.locator('[data-view="M13"]')).toBeVisible();
  expect(api.current().phase).toBe('passed');
  expect(api.calls.filter(call => call.path.includes('/download?format=pdf'))).toHaveLength(2);
  expect(api.calls.filter(call => call.path.includes('/download?format=svg'))).toHaveLength(1);
  await page.getByRole('tab', { name: 'Original', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Redesigned', exact: true })).toBeFocused();
  await expect(page.locator('[data-view="M12"]')).toBeVisible();
});

test('memory exercise counts down, exposes for two seconds, hides answers, and labels repeats as practice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await mockApi(page);
  await passedResult(page);
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: 'Try a memory check', exact: true }).click();
  await expect(page.locator('[data-view="M18"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show the sign', exact: true })).toBeEnabled();
  await page.clock.install();
  await page.getByRole('button', { name: 'Show the sign', exact: true }).click();
  await expect(page.locator('[data-view="M24"] strong')).toHaveText('3');
  await page.clock.runFor(1000); await expect(page.locator('[data-view="M24"] strong')).toHaveText('2');
  await page.clock.runFor(1000); await expect(page.locator('[data-view="M24"] strong')).toHaveText('1');
  await page.clock.runFor(1000); await expect(page.locator('[data-view="M19"]')).toBeVisible();
  await expect(page.getByAltText('Read the sign', { exact: true })).toBeVisible();
  await expect(page.getByText('2 s', { exact: true })).toBeVisible();
  await page.clock.runFor(1000); await expect(page.getByText('1 s', { exact: true })).toBeVisible();
  await page.clock.runFor(1000); await expect(page.locator('[data-view="M20"]')).toBeVisible();
  await expect(page.getByAltText('Read the sign', { exact: true })).toHaveCount(0);
  await expect(page.locator('#glance-answer')).toHaveValue('');
  const questionDOM = await page.locator('body').innerText();
  expect(questionDOM).not.toContain('North Hall'); expect(questionDOM).not.toContain('West Door');
  await expect(page.locator('main.glance-question img')).toHaveCount(0);
  await shot(page, 'mobile-memory-question-no-answer');
  await page.locator('#glance-answer').fill('North Hall');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.locator('[data-view="M21"]')).toBeVisible();
  await page.getByRole('button', { name: 'Try again as practice', exact: true }).click();
  for (let second = 0; second < 5; second++) await page.clock.runFor(1000);
  await expect(page.locator('[data-view="M20"]')).toContainText('Practice');
  await page.locator('#glance-answer').fill('West Door');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.locator('[data-view="M22"]')).toContainText('North Hall');
  await shot(page, 'mobile-memory-wrong-answer');
  await page.getByRole('button', { name: 'Back to result', exact: true }).click();
  await expect(page.locator('[data-view="M12"]')).toBeVisible();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: 'Try a memory check', exact: true }).click();
  await expect(page.locator('[data-view="M18"]')).toContainText('This repeat is practice.');
  expect(api.current().phase).toBe('passed');
});

test('responsive widths have no horizontal overflow and preserve readable, keyboard-safe controls', async ({ page }) => {
  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({ width, height: width < 760 ? 844 : 900 });
    await page.unroute('**/api/**');
    await mockApi(page);
    await page.goto('/');
    await noHorizontalOverflow(page);
    expect(await page.locator('body').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await shot(page, `responsive-${width}-upload`);
    await openAndRead(page);
    await noHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Edit Where', exact: true }).click();
    await expect(page.locator('#edit-where')).toBeFocused();
    expect(await page.locator('#edit-where').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    const modal = await page.locator('dialog.edit-modal').boundingBox();
    expect(modal!.x).toBeGreaterThanOrEqual(0); expect(modal!.x + modal!.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog.edit-modal')))).toBe(true);
    await shot(page, `responsive-${width}-edit`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Edit Where', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Confirm & redesign', exact: true }).click();
    await expect(page.locator('[data-view="M12"]')).toBeVisible();
    await noHorizontalOverflow(page);
    await shot(page, `responsive-${width}-result`);
  }
});
