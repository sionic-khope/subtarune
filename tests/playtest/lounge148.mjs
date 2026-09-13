import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/lounge148-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
};
const ready = () => page.waitForFunction(() => game.state === 'field' && !game.transitioning
  && !game.dialogue.running && game.fade.alpha === 0);
const shot = name => page.screenshot({ path: path.join(shots, `${name}.png`) });
const walkUntil = async (key, condition) => {
  await page.keyboard.down(key);
  try { await page.waitForFunction(condition, undefined, { timeout: 6000 }); }
  finally { await page.keyboard.up(key); }
};

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8798');
  await page.waitForFunction(() => window.game?.title);
  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    game.devJump(QA_POINTS.find(point => point.id === 'youngcle5'));
  });
  await ready();
  await page.evaluate(() => { game.player.x = 416; game.player.y = 280; });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowRight');
  check('unsolved final gate prevents lounge entry', await page.evaluate(() => game.mapId === 'youngcle5' && game.player.x < 448));
  await page.evaluate(() => {
    const a = game.entities.find(entity => entity.id === 'youngcle5_crate_a');
    const b = game.entities.find(entity => entity.id === 'youngcle5_crate_b');
    a.x = 386; a.y = 322; b.x = 386; b.y = 226;
    game.player.x = 388; game.player.y = 260; game.player.facing = 'up';
    window.__loungeBgm = game.sound.bgm;
    window.__loungeInventory = JSON.stringify(game.inventory);
    window.__loungeMoney = game.money;
  });
  await page.keyboard.press('KeyC');
  const lines = [];
  for (let index = 0; index < 5; index++) {
    await page.waitForFunction(() => game.dialogue.running && game.textbox.node?.text);
    await page.keyboard.press('KeyX');
    await page.waitForFunction(() => game.textbox.state === 'waiting');
    lines.push(await page.evaluate(() => game.textbox.node.text));
    await page.keyboard.press('KeyC');
    await page.waitForTimeout(120);
  }
  await ready();
  check('last real C push opens final gate after its five-line dialogue', lines.length === 5
    && await page.evaluate(() => game.flags.youngcle5_crate_solved && !game.entities.find(entity => entity.id === 'youngcle5_gate').solid), lines);
  await shot('01-final-puzzle-solved');
  await walkUntil('ArrowRight', () => game.mapId === 'youngcle6');
  await ready();
  check('right arrow alone crosses into lounge with same music and state', await page.evaluate(() =>
    game.mapId === 'youngcle6' && game.sound.bgm === window.__loungeBgm
    && JSON.stringify(game.inventory) === window.__loungeInventory && game.money === window.__loungeMoney));
  await shot('02-lounge-entry');
  await walkUntil('ArrowRight', () => game.player.x >= 308);
  await ready();
  await page.waitForTimeout(300);
  const center = await page.evaluate(() => ({
    player: [game.player.x, game.player.y],
    party: game.party, npcs: game.entities.filter(entity => entity.def.type === 'npc').map(entity => entity.id),
    tvTop: game.entities.find(entity => entity.id === 'youngcle_tv').drawY - game.camera.y,
    sprites: ['warm_bidet', 'mini_mario', 'lucky_guy', 'park_guardian_costume'].map(id =>
      ({ id, width: game.spriteOverrides[id]?.width, height: game.spriteOverrides[id]?.height })),
  }));
  check('central TV remains fully visible above the walking party', center.tvTop >= 0, center);
  const sheetSizes = { warm_bidet: [512, 640], mini_mario: [64, 64], lucky_guy: [256, 256], park_guardian_costume: [256, 256] };
  check('all four NPCs load their supplied sheets or original still', center.sprites.length === 4 && center.sprites.every(sprite =>
    sprite.width === sheetSizes[sprite.id][0] && sprite.height === sheetSizes[sprite.id][1]), center.sprites);
  const bodies = await page.evaluate(async () => {
    const { CHAR_SCALE } = await import('/src/world/world.js');
    return Object.fromEntries([game.player, ...game.entities.filter(entity => entity.def.type === 'npc')].map(entity => {
      const frame = entity.sprite.down[0];
      const canvas = document.createElement('canvas');
      canvas.width = frame.width; canvas.height = frame.height;
      const context = canvas.getContext('2d');
      context.drawImage(frame, 0, 0);
      const data = context.getImageData(0, 0, frame.width, frame.height).data;
      let top = frame.height, bottom = -1;
      for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
          if (data[(y * frame.width + x) * 4 + 3] > 128) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
        }
      }
      return [entity === game.player ? 'player' : entity.id,
        (bottom - top + 1) / entity.sprite.px * CHAR_SCALE * (entity.def.visualScale || 1)];
    }));
  });
  const costumeRatio = bodies.park_guardian_costume / bodies.player;
  check('costume visible body is approximately 1.2 times Hyungsub', costumeRatio >= 1.15 && costumeRatio <= 1.25, { bodies, costumeRatio });
  check('user-supplied Mini Mario stays compact at about 40 world pixels', bodies.mini_mario >= 39 && bodies.mini_mario <= 41, bodies.mini_mario);
  check('costume is the only Park Guardian actor', center.npcs.includes('park_guardian_costume') && !center.npcs.includes('park_guardian'), center.npcs);
  for (const [width, height] of [[1280, 900], [375, 812], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await shot(`03-center-${width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await walkUntil('ArrowDown', () => game.player.y >= 382);
  await shot('04-lower-room');
  await walkUntil('ArrowUp', () => game.player.y <= 304);
  await walkUntil('ArrowLeft', () => game.mapId === 'youngcle5');
  await ready();
  await page.waitForTimeout(850);
  check('left arrow returns outside portal and does not ping-pong', await page.evaluate(() =>
    game.mapId === 'youngcle5' && game.player.x + 24 <= 528 && !game.dialogue.running));
  await shot('05-return-landing');
  const followerStart = await page.evaluate(() => game.entities.filter(entity => entity.def.type === 'follower').map(entity => ({ id: entity.id, x: entity.x })));
  await walkUntil('ArrowLeft', () => game.player.x <= 320);
  const followerEnd = await page.evaluate(() => game.entities.filter(entity => entity.def.type === 'follower').map(entity => ({ id: entity.id, x: entity.x })));
  check('both party members keep walking after return', followerEnd.length === 2
    && followerEnd.every(entity => entity.x < followerStart.find(start => start.id === entity.id).x - 20), { followerStart, followerEnd });
  await shot('06-return-continue');
  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    game.devJump(QA_POINTS.find(point => point.id === 'youngcle6'));
  });
  await ready();
  const qa = await page.evaluate(() => ({ flags: game.flags, party: game.party,
    attack: game.attack, hpBonus: game.hpBonus, state: game.state }));
  check('Q lounge checkpoint preserves three puzzle completions and party',
    ['youngcle3_crate_solved', 'youngcle4_circuit_solved', 'youngcle5_crate_solved'].every(flag => qa.flags[flag])
    && JSON.stringify(qa.party) === JSON.stringify(['gyeongsub', 'ppaman'])
    && qa.attack === 3 && qa.hpBonus === 40, qa);
  check('no runtime errors', errors.length === 0, errors);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
const failures = checks.filter(check => !check.pass).length + errors.length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
