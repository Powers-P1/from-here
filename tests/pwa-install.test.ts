import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { installPlatform } from '../src/pwa/platform';

describe('online app installation', () => {
  it('ships a same-origin standalone manifest and real correctly sized icons', async () => {
    const manifest = JSON.parse(await readFile(resolve('public/manifest.webmanifest'), 'utf8'));
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons) {
      const info = await sharp(resolve('public', icon.src.slice(1))).metadata();
      expect(icon.sizes).toBe(info.width + 'x' + info.height);
    }
    const html = await readFile(resolve('index.html'), 'utf8');
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
  });

  it('handles iPhone, desktop-mode iPad and Android without offering Safari steps on Windows', () => {
    expect(installPlatform('Mozilla iPhone', 'iPhone', 1)).toBe('ios');
    expect(installPlatform('Mozilla Macintosh', 'MacIntel', 5)).toBe('ios');
    expect(installPlatform('Mozilla Android Mobile', 'Linux arm', 5)).toBe('android');
    expect(installPlatform('Mozilla Windows NT', 'Win32', 0)).toBe('desktop');
  });
});
