import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(project, 'site');
const destination = join(project, 'site-dist');
const base = process.env.SITE_BASE_PATH || '/from-here/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('SITE_BASE_PATH must be a slash-delimited path.');
const app = 'https://from-here.onrender.com/';
const film = 'https://www.youtube.com/watch?v=x2jaGNFlA4I';
const routes = [
  ['home', '', 'Clearer signs', 'Turn a dense English notice into a clearer A3 sign. Confirm the facts, check the result and print.'],
  ['organisations', 'organisations/', 'For organisations', 'Clearer notices for shops, schools, venues and public-facing teams.'],
  ['readers', 'readers/', 'For readers', 'Find the main instruction, the time and the exception on a clearer printed sign.'],
  ['guide', 'guide/', 'Guided walkthrough', 'Five real actions in the working FROM HERE app, with an optional in-page walkthrough.'],
  ['jury', 'jury/', 'For the jury', 'Evaluate the real AI workflow, source and evidence. Read the first-launch and demo limits before opening the app.'],
  ['privacy', 'privacy/', 'Privacy and demo limits', 'How FROM HERE handles notice photos, temporary jobs, AI processing and downloads.'],
];
await mkdir(join(destination, 'assets'), { recursive: true });
const assets = [
  [join(source, 'site.css'), 'site.css'],
  [join(source, 'assets/school-sign.svg'), 'school-sign.svg'],
  [join(source, 'assets/school-sign-A3.pdf'), 'school-sign-A3.pdf'],
  [join(source, 'assets/corner.svg'), 'corner.svg'],
  [join(project, 'public/brand/from-here-wordmark.png'), 'from-here-wordmark.png'],
  [join(project, 'public/samples/school-pickup.png'), 'school-notice.png'],
  ...[400, 700, 800].map(weight => [join(project, 'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-' + weight + '-normal.woff2'), 'source-sans-3-latin-' + weight + '-normal.woff2']),
  [join(project, 'node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2'), 'barlow-condensed-latin-800-normal.woff2'],
];
for (const [from, name] of assets) await copyFile(from, join(destination, 'assets', name));
const template = await readFile(join(source, 'template.html'), 'utf8');
for (const [page, slug, title, description] of routes) {
  const content = await readFile(join(source, 'pages', page + '.html'), 'utf8');
  let html = template.replace('{{CONTENT}}', content);
  for (const [key, value] of Object.entries({ BASE: base, APP: app, TOUR: app + '?walkthrough=1', FILM: film, PAGE: page, SLUG: slug, TITLE: title, DESCRIPTION: description })) html = html.replaceAll('{{' + key + '}}', value);
  html = html.replace('data-nav="' + page + '"', 'data-nav="' + page + '" aria-current="page"');
  if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('Unresolved page template token: ' + page);
  const directory = join(destination, slug);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), html);
}
await writeFile(join(destination, '.nojekyll'), '');
await writeFile(join(destination, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — FROM HERE</title><p>This page could not be found. <a href="' + base + '">Return to FROM HERE</a>.</p></html>');
console.log('Built ' + routes.length + ' static product pages at ' + destination + ' (base ' + base + '). No API credentials or backend dependency.');
