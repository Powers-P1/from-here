import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const svg = await readFile(new URL('../public/brand/app-icon.svg', import.meta.url));
for (const size of [192, 512]) await sharp(svg).resize(size, size).png().toFile(fileURLToPath(new URL('../public/brand/app-' + size + '.png', import.meta.url)));
const small = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#FFFFFF' } }).composite([{ input: small, left: 51, top: 51 }]).png().toFile(fileURLToPath(new URL('../public/brand/app-maskable-512.png', import.meta.url)));
console.log('Built 192px, 512px and maskable brand icons.');
