import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/rooms116';
const base = (process.env.QA_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = [], resourceErrors = [];
await page.addInitScript(() => {
  window.doorClanks = [];
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    // 오디오 URL 에 ?v=BUILD 가 붙는다 → 경로만 비교
    if (new URL(this.src, location.href).pathname.endsWith('/plug.mp3')) window.doorClanks.push(this);
    return originalPlay.apply(this, args);
  };
});
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) resourceErrors.push(`${response.status()} ${response.url()}`); });
const shot = async name => {
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  captures.push({ name, viewport: page.viewportSize(), state: await page.evaluate(() => ({ map: game.mapId, player: [game.player?.x, game.player?.y], camera: [game.camera?.x, game.camera?.y], fade: game.fade.alpha, textbox: game.textbox?.state })) });
};
const ready = async map => page.waitForFunction(map => game?.mapId === map && game.state === 'field' && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, map);
async function walkTo(x, y) {
  for (const [axis, target, positive, negative] of [['x', x, 'ArrowRight', 'ArrowLeft'], ['y', y, 'ArrowDown', 'ArrowUp']]) {
    const current = await page.evaluate(axis => game.player[axis], axis);
    if (Math.abs(current - target) < 7) continue;
    const key = current < target ? positive : negative;
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ axis, target, increasing }) => increasing ? game.player[axis] >= target : game.player[axis] <= target,
        { axis, target, increasing: current < target }, { timeout: 15000 });
    } finally { await page.keyboard.up(key); }
  }
  await page.waitForTimeout(180);
}
async function wallApproach(x) {
  await walkTo(x, 208);
  await page.keyboard.press('ArrowUp', { delay: 700 });
  await page.waitForTimeout(200);
}
async function exitApproach() {
  await walkTo(228, 340);
  await page.keyboard.press('ArrowDown', { delay: 700 });
  await page.waitForTimeout(200);
}
async function clank(name, previousCount) {
  const detail = await page.evaluate(() => window.doorClanks.map(media => ({ src: media.src, time: media.currentTime, duration: media.duration, error: media.error?.message })));
  check(name, detail.length > previousCount && detail.slice(previousCount).every(media => media.time > 0 && !media.error), detail);
  return detail.length;
}
const stats = () => page.evaluate(() => ({ party: [...game.party], inventory: [...game.inventory], money: game.money, attack: game.attack, hpBonus: game.hpBonus, hp: ['hyungsub', ...game.party].map(id => game.hpOf(id)) }));
async function safeParty(name) {
  const detail = await page.evaluate(async () => {
    const { CHAR_SCALE } = await import('/src/world/world.js');
    return game.entities.filter(e => e === game.player || e.def.type === 'follower').map(e => {
      const w = Math.round(e.sprite.fw / e.sprite.px * CHAR_SCALE), h = Math.round(e.sprite.fh / e.sprite.px * CHAR_SCALE);
      const x = e.x + e.w / 2 - w / 2, y = e.y + e.h - h;
      return { id: e.id, x: e.x, y: e.y, safe: !game.map.solidRect(e.x, e.y, e.w, e.h), visible: !e.hidden && x >= game.camera.x && y >= game.camera.y && x + w <= game.camera.x + 480 && y + h <= game.camera.y + 360 };
    });
  });
  const distinct = detail.every((e, i) => detail.slice(i + 1).every(other => Math.hypot(e.x - other.x, e.y - other.y) >= 32));
  check(name, detail.length === 3 && detail.every(e => e.safe && e.visible) && distinct, detail);
}
async function follow(name, x, y) {
  const before = await page.evaluate(() => game.entities.filter(e => e.def.type === 'follower').map(e => ({ id: e.id, x: e.x, y: e.y })));
  await walkTo(x, y);
  await page.waitForFunction(before => before.every(b => { const e = game.entities.find(e => e.id === b.id); return Math.hypot(e.x - b.x, e.y - b.y) > 24 && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= 115; }), before, { timeout: 3000 });
  check(name, await page.evaluate(before => before.every(b => { const e = game.entities.find(e => e.id === b.id); return Math.hypot(e.x - b.x, e.y - b.y) > 24 && Math.hypot(e.x - game.player.x, e.y - game.player.y) <= 115; }), before));
}
async function choice() {
  await page.keyboard.press('KeyC', { delay: 40 });
  await page.waitForFunction(() => game.dialogue.running);
  for (let pageIndex = 0; pageIndex < 20; pageIndex++) {
    if (await page.evaluate(() => game.textbox.state === 'choice')) break;
    await page.keyboard.press('KeyC', { delay: 40 });
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => game.textbox.state === 'choice' && game.textbox.choiceLock <= 0);
}
async function audio(name) {
  await page.waitForFunction(name => game.sound.bgmName === name && game.sound.bgm && !game.sound.bgm.paused && game.sound.bgm.currentTime > 0.3, name);
  check(`${name} real BGM plays after keyboard gesture`, await page.evaluate(name => new URL(game.sound.bgm.src).pathname.endsWith(`/${name}.mp3`) && game.sound.bgm.loop && game.sound.bgm.volume > 0, name));
}
async function title() {
  await page.goto(base);
  // 부팅 로딩 중엔 타이틀이 키를 안 받는다
  await page.waitForFunction(() => game?.state === 'title' && game.title?.phase === 'wait' && !game.bootLoad?.active);
  await page.keyboard.press('KeyX');
  await page.waitForFunction(() => game.title.phase === 'zoom');
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => game.title.phase === 'locked');
  await page.waitForTimeout(3300);
}
async function qJump(id) {
  await title();
  // QA 목록은 Shift+Q 만(사용자 2026-09-25)
  await page.keyboard.press('Shift+KeyQ');
  await page.waitForFunction(() => !!game.title.qa);
  // 목록은 숨김을 뺀 QA_POINTS 이고 마지막으로 고른 지점에서 열린다 → 현재 커서에서 목표까지 이동
  const moves = await page.evaluate(async id => { const { QA_POINTS } = await import('/src/core/story.js'); return QA_POINTS.filter(p => !p.hidden).findIndex(p => p.id === id) - game.title.qa.i; }, id);
  for (let i = 0; i < Math.abs(moves); i++) await page.keyboard.press(moves > 0 ? 'ArrowDown' : 'ArrowUp', { delay: 50 });
  await shot(`q-menu-${id}`);
  await page.keyboard.press('KeyC');
  await ready(id);
}

try {
  await page.goto(`${base}/?qa=maillard_lounge`);
  await ready('maillard_lounge');
  await page.keyboard.press('KeyX');
  const initialStats = await stats();
  const initialFlags = await page.evaluate(() => ({ ...game.flags }));
  let clanks = 0;
  await walkTo(180, 208);
  await shot('01-door-pair');
  await wallApproach(180);
  check('walking fully to iron door does not enter or start dialogue', await page.evaluate(() => game.mapId === 'maillard_lounge' && !game.dialogue.running));
  await choice();
  check('iron door shows final consent after warning pages', await page.evaluate(() => game.textbox.node.text === '* 들어가시겠습니까?' && game.textbox.choice.options.map(o => o.label).join() === '네,아니오'));
  await shot('02-iron-choice');
  await page.setViewportSize({ width: 375, height: 812 });
  await shot('03-small-choice');
  await page.setViewportSize({ width: 1000, height: 780 });
  await page.keyboard.press('ArrowRight', { delay: 50 });
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  check('No stays outside', await page.evaluate(() => game.mapId === 'maillard_lounge'));
  await choice();
  await page.keyboard.press('KeyX', { delay: 50 });
  await ready('maillard_lounge');
  check('X cancels and stays outside', await page.evaluate(() => game.mapId === 'maillard_lounge'));
  check('declining or cancelling the iron door does not clank', await page.evaluate(() => window.doorClanks.length === 0));
  await choice();
  await page.keyboard.press('KeyC', { delay: 20 });
  await page.waitForFunction(() => game.fade.alpha > 0.1);
  check('Yes starts black fade', await page.evaluate(() => game.fade.color === '0,0,0'));
  await shot('04-iron-fade');
  await ready('maillard_storage');
  clanks = await clank('iron entry plays the door clank', clanks);
  check('entering upward continues upward inside storage', await page.evaluate(() => game.player.facing === 'up' && game.player.y === 248));
  await audio('wind');
  // 창고엔 이제 쫓겨난 시청자(악질맨, storage_viewer 전투 — storage-viewer/viewer-combat 시나리오)가 선다. 말을 걸어야 시작되고 자동 이벤트는 없다
  check('storage is a steel room 480x448 with one exit, only the talk-to expelled viewer, and no automatic events', await page.evaluate(() => {
    const npcs = game.entities.filter(e => e.def.type === 'npc');
    return game.map.pxW === 480 && game.map.pxH === 448 && !game.map.def.enter && !game.entities.some(e => e.def.type === 'trigger')
      && npcs.every(e => e.id.startsWith('expelled_viewer') && typeof e.def.script === 'string')
      && game.map.def.entities.filter(e => e.type === 'door').length === 1;
  }));
  await safeParty('all party members arrive safely and visibly in storage');
  await shot('05-storage-entry');
  await follow('storage party continues following', 360, 304);
  // 가운데(228,208)에 악질맨이 서 있으므로 네 구석을 돌고 아랫줄에서 끝나 출구로 간다
  for (const [x, y, name] of [[380, 168, 'upper-right'], [70, 168, 'upper-left'], [70, 348, 'lower-left'], [380, 348, 'lower-right']]) {
    await walkTo(x, y);
    await shot(`06-storage-${name}`);
  }
  await exitApproach();
  await shot('06-storage-exit-approach');
  check('walking to storage exit requires C', await page.evaluate(() => game.mapId === 'maillard_storage'));
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  clanks = await clank('storage exit plays the door clank', clanks);
  check('storage return uses safe down-facing lounge spawn', await page.evaluate(() => Math.abs(game.player.x - 180) < 2 && game.player.y === 304 && game.player.facing === 'down'));
  await safeParty('storage return shows all party on safe floor');
  await audio('maillard_lounge');
  await shot('07-storage-return');
  await follow('party follows after storage return', 180, 416);
  await wallApproach(402);
  check('walking fully to wooden door does not enter', await page.evaluate(() => game.mapId === 'maillard_lounge' && !game.dialogue.running));
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_saloon');
  clanks = await clank('wooden entry plays the door clank', clanks);
  check('entering upward continues upward inside wooden room', await page.evaluate(() => game.player.facing === 'up' && game.player.y === 248));
  await audio('maillard_lounge');
  // 나무문 방은 이제 '선장실로 가는 길'(864px): 네 NPC 는 라운지로 옮겨졌고(67d52175), 은별(1c00d90e)·우현 갑판 쪽 쥰희·용준(6b756b3e)과
  // 우현 갑판 문이 생겼다. 입장 스크립트(maillard_starboard_gate)는 선장실 습격 뒤에만 움직인다 — 지금은 아무 대사도 돌지 않아야 한다
  check('wooden room is the captain path: open floor, no lounge NPCs, no automatic dialogue', await page.evaluate(() => {
    const npcs = game.entities.filter(e => e.def.type === 'npc').map(e => e.id);
    return game.map.def.name === '선장실로 가는 길' && game.map.pxW === 864 && game.map.pxH === 448 && !game.map.solidRect(32, 160, 768, 224)
      && !game.dialogue.running && !game.entities.some(e => e.def.type === 'trigger')
      && !['mabaem', 'parkwonsung', 'yakulbeol', 'yerim'].some(id => npcs.includes(id))
      && npcs.every(id => ['eunbyeol', 'starboard_junhee', 'starboard_yongjun'].includes(id))
      && game.map.def.entities.filter(e => e.type === 'door').map(e => e.to).sort().join() === ['maillard_lounge', 'maillard_starboard'].join();
  }));
  await safeParty('wooden entry shows all party safely');
  await shot('08-wood-left');
  // 은별(404,256) 아래로 지나간다 — 먼저 아랫줄로 내려간 뒤 가로지른다
  await walkTo(228, 336);
  await follow('wooden room party follows across open floor', 408, 336);
  await shot('09-wood-middle');
  await walkTo(640, 336);
  await shot('10-wood-right');
  await exitApproach();
  await shot('10-wood-exit-approach');
  check('wooden room exit also requires C', await page.evaluate(() => game.mapId === 'maillard_saloon'));
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  clanks = await clank('wooden exit plays the door clank', clanks);
  check('wooden return uses safe down-facing lounge spawn', await page.evaluate(() => Math.abs(game.player.x - 402) < 2 && game.player.y === 304 && game.player.facing === 'down'));
  await safeParty('wooden return shows all party safely');
  await shot('11-wood-return');
  await follow('party follows after wooden return', 402, 416);
  check('room round trips retain party inventory money and combat stats', JSON.stringify(await stats()) === JSON.stringify(initialStats));
  await title();
  await page.keyboard.press('KeyC', { delay: 50 });
  await ready('maillard_lounge');
  await safeParty('continue restores lounge with safe visible party');
  await follow('party keeps following after continue', 520, 340);
  await shot('12-continue-return');
  for (const id of ['maillard_storage', 'maillard_saloon']) {
    await qJump(id);
    // 6dc5d2da: 선장실로 가는 길(과 선장실) QA 는 라운지 상점의 영구 강화(씨알리스·바세린)를 산 상태다 — 라운지 기준 상태에 그 구매분만 더한 것이 정답
    const expected = await page.evaluate(async ({ base, baseFlags }) => {
      const { YONGJUN_SHOP } = await import('/src/data/shops.js');
      const { CHARACTERS } = await import('/src/data/characters.js');
      const bought = YONGJUN_SHOP.filter(item => item.onceFlag && game.flags[item.onceFlag] && !baseFlags[item.onceFlag]);
      const dAttack = bought.reduce((sum, item) => sum + (item.stat?.attack || 0), 0);
      const dHp = bought.reduce((sum, item) => sum + (item.stat?.hpBonus || 0), 0);
      const price = bought.reduce((sum, item) => sum + item.price, 0);
      return { ...base, money: Math.max(0, base.money - price), attack: base.attack + dAttack, hpBonus: base.hpBonus + dHp,
        hp: ['hyungsub', ...base.party].map((member, index) => base.hp[index] + (CHARACTERS[member]?.noHpBonus ? 0 : dHp)) };
    }, { base: initialStats, baseFlags: initialFlags });
    check(`Q menu ${id} retains canonical party and stats`, JSON.stringify(await stats()) === JSON.stringify(expected), { actual: await stats(), expected });
    await safeParty(`Q menu ${id} arrives safely`);
    await shot(`q-arrival-${id}`);
  }
  check('no browser runtime or console errors', errors.length === 0, errors);
  check('room assets and requested audio have no failed requests', !resourceErrors.some(url => /maillard_|\/wind\.mp3|\/plug\.mp3|\/props\/door\.png/.test(url)), resourceErrors);
} catch (error) {
  errors.push(error.stack || error.message);
  errors.push(JSON.stringify(await page.evaluate(() => ({ map: game.mapId, bgm: game.sound.bgmName, src: game.sound.bgm?.src, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused }))));
  await shot('failure');
  console.error(error);
}
finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, resourceErrors, captures }, null, 2));
  await browser.close();
}
const fails = checks.filter(c => !c.ok).length + errors.length;
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
