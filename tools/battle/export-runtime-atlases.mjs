// Rebuild transparent battle atlases from the approved PNG sources, using the game's exact chroma algorithm.
// Usage: node tools/battle/export-runtime-atlases.mjs <server-base-url> <chromium-executable>
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const [baseUrl, chrome] = process.argv.slice(2);
if (!baseUrl || !chrome) throw new Error('Pass a serving URL and Chromium executable path');
const pwDir = process.env.PW_DIR || path.join(os.homedir(), '.cache/subtarune-pw');
const { chromium } = await import(pathToFileURL(path.join(pwDir, 'node_modules/playwright-core/index.mjs')));
const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  const page = await browser.newPage();
  await page.goto(new URL('index.html', baseUrl).href);
  for (const id of ['hyungsub', 'gyeongsub', 'ppaman']) {
    const atlases = await page.evaluate(async (actorId) => {
      const { BATTLE_SPRITES, BATTLE_PREVIEW } = await import('/src/data/battle-sprites.js');
      const { loadActorFrames } = await import('/src/ui/battle-preview.js');
      const definition = { ...BATTLE_SPRITES[actorId], runtime: null };
      const frames = await loadActorFrames(definition, BATTLE_PREVIEW.colorKey);
      if (!frames) throw new Error(`Source frames failed: ${actorId}`);
      const out = [];
      for (const [suffix, groups, width, height] of [
        ['', ['idle', 'attack'], 1600, 1024],
        ['-run', ['run'], 1536, 1024],
      ]) {
        const atlas = document.createElement('canvas');
        atlas.width = width; atlas.height = height;
        const ctx = atlas.getContext('2d');
        for (const group of groups) {
          const definitions = group === 'run' ? definition.run.frames : definition[group];
          let packedX = 0;
          definitions.forEach((frame, index) => {
            const x = group === 'attack' ? packedX : frame.rect[0];
            ctx.drawImage(frames[group][index].image, x, frame.rect[1]);
            if (group === 'attack') packedX += frame.rect[2];
          });
        }
        out.push({ suffix, data: atlas.toDataURL('image/png').split(',')[1] });
      }
      return out;
    }, id);
    for (const { suffix, data } of atlases) {
      const output = path.join('assets/battle', `${id}${suffix}-runtime.png`);
      fs.writeFileSync(output, Buffer.from(data, 'base64'));
      console.log(output);
    }
    const comparison = await page.evaluate(async (actorId) => {
      const { BATTLE_SPRITES, BATTLE_PREVIEW } = await import('/src/data/battle-sprites.js');
      const { loadActorFrames } = await import('/src/ui/battle-preview.js');
      const definition = BATTLE_SPRITES[actorId];
      const source = await loadActorFrames({ ...definition, runtime: null }, BATTLE_PREVIEW.colorKey);
      const baked = await loadActorFrames(definition, BATTLE_PREVIEW.colorKey);
      if (!source || !baked) return { equal: false, reason: 'load failed' };
      let comparedPixels = 0;
      for (const group of ['idle', 'attack', 'run']) {
        for (let i = 0; i < source[group].length; i++) {
          const a = source[group][i].image;
          const b = baked[group][i].image;
          if (a.width !== b.width || a.height !== b.height) return { equal: false, reason: `${group}[${i}] dimensions` };
          const pixelsA = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
          const pixelsB = b.getContext('2d').getImageData(0, 0, b.width, b.height).data;
          for (let p = 0; p < pixelsA.length; p++) if (pixelsA[p] !== pixelsB[p]) return { equal: false, reason: `${group}[${i}] byte ${p}` };
          comparedPixels += a.width * a.height;
        }
      }
      return { equal: true, comparedPixels };
    }, id);
    if (!comparison.equal) throw new Error(`${id} runtime mismatch: ${comparison.reason}`);
    console.log(`${id}: ${comparison.comparedPixels} RGBA pixels match`);
  }
} finally {
  await browser.close();
}
