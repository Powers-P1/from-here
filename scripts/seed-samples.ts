import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { xml } from '../server/render/renderer.js';

const out = resolve('public/samples');
await mkdir(out,{recursive:true});
const samples = [
  { name:'school-pickup', heading:['NOTICE','TO PARENTS'],
    lines:['Due to scheduled maintenance work,','parents of children in grades 1–3 are','informed that collection on Monday,','October 26, 2026, will take place at the','East Entrance starting at 4:30 PM.'],
    note:['Wheelchair-accessible pickup remains','available at the Main Entrance.'] },
  { name:'community-workshop', heading:['WORKSHOP','UPDATE'],
    lines:['Workshop attendees: the community','workshop on Tuesday, October 27, 2026,','has moved to the North Hall.','Doors open from 6:00 PM.'],
    note:['For step-free access, please use','the West Door.'] },
  { name:'library-closure', heading:['LIBRARY','CLOSED'],
    lines:['Tuesday, October 27, 2026.'], note:[] },
];
for (const source of samples) {
  const text = source.heading.map((line,i)=>`<text x="500" y="${150+i*80}" text-anchor="middle" font-family="Times New Roman,serif" font-size="72" font-weight="bold">${xml(line)}</text>`).join('')+
    source.lines.map((line,i)=>`<text x="90" y="${355+i*58}" font-family="Times New Roman,serif" font-size="40">${xml(line)}</text>`).join('')+
    source.note.map((line,i)=>`<text x="90" y="${source.lines.length*58+445+i*58}" font-family="Times New Roman,serif" font-size="40">${xml(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1414" viewBox="0 0 1000 1414"><rect width="1000" height="1414" fill="white"/><g fill="#171717">${text}</g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(out,source.name+'.png'));
  if (source.name === 'school-pickup') {
    const unclear = svg.replace('</svg>', '<rect x="485" y="555" width="220" height="50" fill="#202020"/></svg>');
    await sharp(Buffer.from(unclear)).png().toFile(resolve(out,'school-pickup-unclear.png'));
  }
}
await writeFile(resolve(out,'README.txt'),'Synthetic English notices created for this project. They contain no personal data. The unclear variant genuinely obscures the time in the image. They are sample inputs, not precomputed AI answers.\n');
console.log('Wrote four synthetic notice images.');
