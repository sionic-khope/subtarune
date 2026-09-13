import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8775';
const shots = process.env.SHOT_DIR || '/tmp/npcs118-qa';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const report = { checks: [], errors: [], resourceErrors: [], captures: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) report.errors.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) report.resourceErrors.push(`${r.status()} ${r.url()}`); });
await page.addInitScript(() => {
  let seed = 117;
  Math.random = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
  window.qaAudioStarts = [];
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const voice = window.game && Object.entries(game.sound.voiceBuf).find(([, b]) => b === this.buffer)?.[0];
    window.qaAudioStarts.push({ voice, duration: this.buffer?.duration, rate: this.playbackRate.value });
    return start.apply(this, args);
  };
});
const ready = async (map = 'maillard_lounge') => page.waitForFunction(map => window.game?.mapId === map && game.state === 'field' && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, map);
const stats = () => page.evaluate(() => ({ inventory: game.inventory, money: game.money, attack: game.attack, hpBonus: game.hpBonus, party: game.party, hp: game.partyHp }));
const state = () => page.evaluate(() => ({
  map: game.mapId, camera: { x: game.camera.x, y: game.camera.y, locked: game.camera.locked },
  text: game.textbox.node?.text, speaker: game.textbox.node?.speaker, textbox: game.textbox.state,
  flags: { mabaem: !!game.flags.maillard_mabaem_seen, pair: !!game.flags.maillard_yerim_pair_seen },
  entities: game.entities.filter(e => e === game.player || ['npc', 'follower'].includes(e.def.type)).map(e => ({ id: e.id, x: e.x, y: e.y, facing: e.facing, sprite: e.def.sprite, hop: e.hopY || 0, fly: e.flyX || 0, spin: e.spin || 0, home: e.home, wander: e.wander, safe: !game.map.solidRect(e.x, e.y, e.w, e.h) })),
}));
async function shot(name) {
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  report.captures.push({ name, viewport: page.viewportSize(), state: await state() });
}
async function installObservers() {
  await page.evaluate(() => {
    window.qaLines = []; window.qaSfx = []; window.qaMotion = [];
    const show = game.textbox.show;
    game.textbox.show = function (node, ...args) { window.qaLines.push({ text: node.text, voice: node.voice, speaker: node.speaker, at: performance.now(), flags: { mabaem: !!game.flags.maillard_mabaem_seen, pair: !!game.flags.maillard_yerim_pair_seen } }); return show.call(this, node, ...args); };
    const sfx = game.sound.sfx;
    game.sound.sfx = function (name, ...args) { window.qaSfx.push({ name, at: performance.now(), file: !!this.files[name] }); return sfx.call(this, name, ...args); };
    const update = game.update;
    game.update = function (...args) {
      const result = update.apply(this, args);
      if (this.mapId === 'maillard_lounge') {
        const monkey = this.entities.find(e => e.id === 'parkwonsung');
        const yerim = this.entities.find(e => e.id === 'yerim');
        if (monkey) window.qaMotion.push({ at: performance.now(), x: monkey.x, y: monkey.y, hop: monkey.hopY || 0, fly: monkey.flyX || 0, spin: monkey.spin || 0, kick: yerim.def.sprite === 'yerim_kick', moving: monkey.moving, cameraX: this.camera.x, cameraY: this.camera.y });
      }
      return result;
    };
  });
}
async function axisTo(axis, target) {
  const current = await page.evaluate(a => game.player[a], axis);
  if (Math.abs(current - target) < 4) return;
  const key = axis === 'x' ? (current < target ? 'ArrowRight' : 'ArrowLeft') : (current < target ? 'ArrowDown' : 'ArrowUp');
  await page.keyboard.down(key);
  try { await page.waitForFunction(({ axis, target, positive }) => positive ? game.player[axis] >= target - 2 : game.player[axis] <= target + 2, { axis, target, positive: current < target }, { timeout: 9000 }); }
  finally { await page.keyboard.up(key); }
}
async function approach(id) {
  await ready();
  await axisTo('y', 500);
  for (let attempt = 0; attempt < 12; attempt++) {
    const npc = await page.evaluate(id => { const e = game.entities.find(e => e.id === id); return { x: e.x, y: e.y }; }, id);
    await axisTo('x', npc.x);
    await axisTo('y', npc.y + 28);
    await page.keyboard.press('ArrowUp', { delay: 35 });
    if (await page.evaluate(id => game.player.probe()?.id === id, id)) {
      await page.evaluate(() => { window.qaTalkPositions = game.entities.filter(e => ['player', 'follower', 'npc'].includes(e.def.type)).map(e => ({ id: e.id, x: e.x, y: e.y })); });
      await page.keyboard.press('KeyC', { delay: 35 });
      await page.waitForFunction(() => game.dialogue.running);
      if (['yakulbeol', 'mabaem'].includes(id)) check(`${id} first text starts without movement`, await page.evaluate(() => game.textbox.isOpen && qaTalkPositions.every(before => { const e = game.entities.find(e => e.id === before.id); return e.x === before.x && e.y === before.y; })));
      return;
    }
    await axisTo('y', npc.y + 40);
  }
  throw new Error(`Cannot approach ${id} using arrows`);
}
async function line(name, expected) {
  await page.waitForFunction(text => game.textbox.node?.text === text && game.textbox.state === 'waiting', expected, { timeout: 15000 });
  await shot(name);
}
async function next() { await page.keyboard.press('KeyC', { delay: 45 }); }
async function frameCheck(name, roamer = null) {
  if (roamer) {
    check(`${name}: dialogue preserves every actor position`, await page.evaluate(() => qaTalkPositions.every(before => { const e = game.entities.find(e => e.id === before.id); return e.x === before.x && e.y === before.y; })));
    return;
  }
  const detail = await page.evaluate(async roamer => {
    const { CHAR_SCALE } = await import('/src/world/world.js');
    const { CHARACTERS } = await import('/src/data/characters.js');
    return ['yerim', 'parkwonsung', 'gyeongsub', 'player', 'ppaman'].filter(id => id === 'player' || game.entities.some(e => e.id === id)).map(id => {
      const e = id === 'player' ? game.player : game.entities.find(e => e.id === id);
      const scale = CHAR_SCALE * (e.def.visualScale || 1) / e.sprite.px;
      const dw = Math.round(e.sprite.fw * scale), dh = Math.round(e.sprite.fh * scale);
      const pivot = CHARACTERS[e.def.sprite]?.stillPivot;
      const img = e.sprite[e.facing][e.frame], cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let left = cv.width, top = cv.height, right = 0, bottom = 0;
      for (let yy = 0; yy < cv.height; yy++) for (let xx = 0; xx < cv.width; xx++) if (data[(yy * cv.width + xx) * 4 + 3] > 0) { left = Math.min(left, xx); right = Math.max(right, xx); top = Math.min(top, yy); bottom = Math.max(bottom, yy); }
      const w = (right - left + 1) * dw / cv.width, h = (bottom - top + 1) * dh / cv.height;
      const x = Math.round(e.x + e.w / 2 - (pivot ? pivot[0] * scale : dw / 2) - game.camera.x) + left * dw / cv.width;
      const y = Math.round(e.y + e.h - (pivot ? pivot[1] * scale : dh) - game.camera.y) + top * dh / cv.height;
      return { id, x, y, w, h, feet: [e.x + e.w / 2, e.y + e.h], safe: !game.map.solidRect(e.x, e.y, e.w, e.h), inside: x >= 0 && y >= 0 && x + w <= 480 && y + h <= 230 };
    });
  }, roamer);
  check(`${name}: actors fit above 230px dialogue budget`, detail.every(e => e.safe && e.inside), detail);
  check(`${name}: actor art does not overlap`, detail.every((a, i) => detail.slice(i + 1).every(b => !(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y))), detail);
  const party = detail.filter(e => ['gyeongsub', 'player', 'ppaman'].includes(e.id));
  check(`${name}: all three party anchors spaced 64px`, party.length === 3 && party.every((e, i) => !i || Math.abs(e.feet[0] - party[i - 1].feet[0] - 64) < 1), party);
  check(`${name}: Yerim enlarged twenty percent`, detail[0].h >= 120 && detail[0].h <= 125, detail[0]);
  const monkey = detail.find(e => e.id === 'parkwonsung');
  if (monkey) check(`${name}: monkey size preserved`, monkey.h >= 51 && monkey.h <= 54, monkey);
}
const pairTexts = ['* 어 예림님 안녕하세요', '* 어 안녕하세요', '* 옆에 애는 뭐지?', '* 우끽!', '* 킁킁 킁킁 킁킁 킁킁', '* 아 씨밯 이거 뭐야', '* 우끼이익', '* 제가 이러고 삽니다.', '* 와 진짜미쳣네 이년', '* 네?', '* 아 아니에요'];
try {
  if (process.env.QA_SCOPE === 'roamers') {
    report.scope = 'Only immediate bee/mabaem dialogue without actor repositioning.';
    report.replaces = ['02-bee-01.png', ...Array.from({ length: 7 }, (_, i) => `03-mabaem-${String(i + 1).padStart(2, '0')}.png`), '04-mabaem-repeat.png'];
    await page.goto(`${base}/?qa=maillard_lounge`); await ready(); await page.keyboard.press('KeyX'); await installObservers();
    const beforeStats = await stats();
    await approach('yakulbeol'); await line('02-bee-01', '* 야꿀벌이에요.'); await frameCheck('bee initial', 'yakulbeol');
    const paused = await state(); await page.waitForTimeout(1200); const still = await state();
    check('both roamers pause during conversation', ['yakulbeol', 'mabaem'].every(id => { const a = paused.entities.find(e => e.id === id), b = still.entities.find(e => e.id === id); return a.x === b.x && a.y === b.y; }));
    await next(); await ready();
    const resumed = await state(); await page.waitForTimeout(7000); const moved = await state();
    check('roamers resume after conversation', ['yakulbeol', 'mabaem'].some(id => { const a = resumed.entities.find(e => e.id === id), b = moved.entities.find(e => e.id === id); return Math.hypot(a.x - b.x, a.y - b.y) > 4; }));
    await approach('yakulbeol'); await line('02-bee-repeat', '* 야꿀벌이에요.'); await frameCheck('bee repeat', 'yakulbeol'); await next(); await ready();
    await approach('mabaem');
    const texts = ['* 어 안녕하세여', '* 뭐해요?', '* 아 저 로블록스 하고있어요', '* 오 저도 같이해요', '* 우리 할일이 남아있어', '* 알아서할게요씨발', '* ... 갈길 가야된다'];
    for (const [i, text] of texts.entries()) { await line(`03-mabaem-${String(i + 1).padStart(2, '0')}`, text); await frameCheck(`mabaem line ${i + 1}`, 'mabaem'); await next(); }
    await ready(); await approach('mabaem'); await line('04-mabaem-repeat', texts[0]); await frameCheck('mabaem repeat', 'mabaem'); await next(); await ready();
    report.lines = await page.evaluate(() => qaLines);
    check('scoped run captured exact 2 bee + 7 mabaem + 1 repeat lines', report.lines.map(l => l.text).join('|') === ['* 야꿀벌이에요.', '* 야꿀벌이에요.', ...texts, texts[0]].join('|'));
    check('roamer dialogue preserves economy and party', JSON.stringify(beforeStats) === JSON.stringify(await stats()));
    check('no runtime errors in scoped run', report.errors.length === 0, report.errors);
  } else {
  await page.goto(`${base}/?qa=maillard_lounge`);
  await ready(); await page.keyboard.press('KeyX'); await installObservers();
  const initialStats = await stats();
  await shot('01-arrival');
  const wander = [];
  for (let i = 0; i <= 20; i++) { wander.push(await state()); if (i < 20) await page.waitForTimeout(500); }
  report.wander = wander;
  for (const id of ['yakulbeol', 'mabaem']) {
    const samples = wander.map(s => s.entities.find(e => e.id === id));
    check(`${id} walks within home bounds on safe floor over 10s`, samples.some(e => Math.hypot(e.x - samples[0].x, e.y - samples[0].y) > 5) && samples.every(e => Math.abs(e.x - e.home.x) <= e.wander && Math.abs(e.y - e.home.y) <= e.wander && e.safe), samples);
  }
  check('pair never wanders', ['yerim', 'parkwonsung'].every(id => wander.every(s => { const e = s.entities.find(e => e.id === id), a = wander[0].entities.find(e => e.id === id); return e.x === a.x && e.y === a.y; })));
  await approach('yakulbeol'); await line('02-bee-01', '* 야꿀벌이에요.');
  const paused = await state(); await page.waitForTimeout(1200); const pausedAfter = await state();
  check('wandering pauses during dialogue', ['yakulbeol', 'mabaem'].every(id => { const a = paused.entities.find(e => e.id === id), b = pausedAfter.entities.find(e => e.id === id); return a.x === b.x && a.y === b.y; }));
  await next(); await ready();
  const resumed = await state(); await page.waitForTimeout(7000); const resumedAfter = await state();
  check('wandering resumes after dialogue', ['yakulbeol', 'mabaem'].some(id => { const a = resumed.entities.find(e => e.id === id), b = resumedAfter.entities.find(e => e.id === id); return Math.hypot(a.x - b.x, a.y - b.y) > 4; }));
  await approach('mabaem');
  const mabaemTexts = ['* 어 안녕하세여', '* 뭐해요?', '* 아 저 로블록스 하고있어요', '* 오 저도 같이해요', '* 우리 할일이 남아있어', '* 알아서할게요씨발', '* ... 갈길 가야된다'];
  for (const [i, text] of mabaemTexts.entries()) { await line(`03-mabaem-${String(i + 1).padStart(2, '0')}`, text); await next(); }
  await ready();
  check('mabaem completes only after all seven lines', await page.evaluate(() => game.flags.maillard_mabaem_seen && window.qaLines.filter(l => l.voice === 'mabaem').every(l => !l.flags.mabaem)));
  await approach('mabaem'); await line('04-mabaem-repeat', mabaemTexts[0]); await next(); await ready();
  await axisTo('y', 500); await axisTo('x', 780); await shot('05-pair-before');
  await approach('yerim');
  for (const [i, text] of pairTexts.entries()) {
    if (i === 6) {
      await page.waitForFunction(() => game.entities.find(e => e.id === 'parkwonsung')?.spin > 2 && game.textbox.node?.text === '* 우끼이익' && game.textbox.state === 'waiting');
      await shot('06-pair-kick-rotating-fling');
      await page.waitForFunction(() => game.textbox.node?.text === '* 제가 이러고 삽니다.');
      continue;
    }
    await line(`06-pair-${String(i + 1).padStart(2, '0')}`, text);
    if (i === 0) await frameCheck('first dialogue');
    if (i === 8) { await page.setViewportSize({ width: 375, height: 812 }); await shot('07-phone-pair-text'); await page.setViewportSize({ width: 1000, height: 780 }); }
    if (i === 7) { await frameCheck('after exit dialogue'); await shot('06-pair-monkey-gone'); }
    await next();
    if (i === 3) {
      await page.waitForFunction(() => game.entities.find(e => e.id === 'parkwonsung').hopY > 10);
      await shot('06-pair-mid-hop');
      await page.waitForFunction(() => { const e = game.entities.find(e => e.id === 'parkwonsung'); return e.hopY === 0 && e.x < 888 && e.x > 820; });
      await shot('06-pair-mid-dash');
    }
  }
  await ready(); await shot('08-pair-after');
  report.firstRun = await page.evaluate(() => ({ lines: qaLines, sfx: qaSfx, motion: qaMotion, audio: qaAudioStarts }));
  check('pair has exactly 11 lines and completion stays unset until final line closes', report.firstRun.lines.slice(-11).map(l => l.text).join('|') === pairTexts.join('|') && report.firstRun.lines.slice(-11).every(l => !l.flags.pair));
  const motion = report.firstRun.motion;
  check('hop dash kick rotation and full screen exit occur', Math.max(...motion.map(m => m.hop)) >= 17.5 && motion.some(m => m.x < 888 && m.x > 820 && m.moving) && motion.some(m => m.kick && m.spin > 2 && m.fly > 20) && motion.some(m => m.x + m.fly - 64 > m.cameraX + 480));
  check('camera stays framed on Yerim throughout flight', motion.filter(m => m.fly > 0).every(m => m.cameraX === 640 && m.cameraY === 240));
  check('monkey is gone before followup and never lands', await page.evaluate(() => !game.entities.some(e => e.id === 'parkwonsung') && game.entities.find(e => e.id === 'yerim').def.sprite === 'yerim'));
  check('jump thud and whoosh played through real SFX calls', ['jump', 'thud', 'whoosh'].every(n => report.firstRun.sfx.some(s => s.name === n)), report.firstRun.sfx);
  const audio = await page.evaluate(() => ['yakulbeol', 'mabaem', 'yerim', 'parkwonsung'].map(id => ({ id, decoded: game.sound.voiceBuf[id]?.duration, played: qaAudioStarts.filter(a => a.voice === id).length, running: game.sound.ctx?.state })));
  check('all four voice buffers decoded and started actual WebAudio sources', audio.every(a => a.decoded > 0 && a.played > 0 && a.running === 'running'), audio);
  check('no economy or party changes', JSON.stringify(initialStats) === JSON.stringify(await stats()));
  await approach('yerim'); await line('09-repeat-yerim', '* 어 안녕하세요'); const before = await page.evaluate(() => qaSfx.length); await next(); await ready(); check('Yerim repeat is one line without gag SFX', await page.evaluate(n => qaSfx.length === n, before));
  await axisTo('y', 500); await axisTo('x', 402); await axisTo('y', 170); await page.keyboard.press('ArrowUp', { delay: 50 });
  check('wooden path door accessible and needs C', await page.evaluate(() => game.mapId === 'maillard_lounge' && game.player.probe()?.id === 'lounge_saloon_door'));
  await next(); await ready('maillard_saloon'); await shot('10-captain-path');
  check('captain path has its requested name and no NPCs', await page.evaluate(() => game.map.def.name === '선장실로 가는 길' && !game.entities.some(e => e.def.type === 'npc')));
  await axisTo('y', 368); await page.keyboard.press('ArrowDown', { delay: 50 }); await next(); await ready();
  check('reentry retains completion flags without respawning monkey', await page.evaluate(() => game.flags.maillard_yerim_pair_seen && game.flags.maillard_mabaem_seen && !game.entities.some(e => e.id === 'parkwonsung')));
  await shot('11-reentry');
  await page.goto(base); await page.waitForFunction(() => game?.state === 'title' && game.title?.phase === 'wait');
  await page.keyboard.press('KeyX'); await page.waitForFunction(() => game.title.phase === 'zoom'); await next(); await page.waitForFunction(() => game.title.phase === 'locked'); await page.waitForTimeout(3300); await next(); await ready();
  check('reload and real title Continue retain both completion flags', await page.evaluate(() => !!game.flags.maillard_yerim_pair_seen && !!game.flags.maillard_mabaem_seen));
  await shot('12-continue');
  await page.goto(`${base}/?qa=maillard_lounge`); await ready(); await page.keyboard.press('KeyX'); await installObservers();
  await approach('parkwonsung'); await line('13-first-trigger-via-monkey', pairTexts[0]);
  check('monkey C starts the identical first-time pair event', await page.evaluate(() => !game.flags.maillard_yerim_pair_seen && game.textbox.node.text === '* 어 예림님 안녕하세요'));
  check('no runtime errors', report.errors.length === 0, report.errors);
  check('requested NPC sprites and voices load without 404', !report.resourceErrors.some(r => /\/(sprites|audio\/voices)\/(yakulbeol|mabaem|yerim|yerim-kick|parkwonsung)\.(png|mp3)/.test(r)), report.resourceErrors);
  }
} catch (e) {
  report.errors.push(e.stack || e.message); console.error(e);
  try { await shot('failure'); } catch {}
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
const fails = report.checks.filter(c => !c.ok).length + report.errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
