import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8000';
const shots = process.env.SHOT_DIR || '/tmp/youngcle143-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
await page.addInitScript(() => {
  window.plugPlays = 0;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    // 오디오 주소에는 빌드 캐시 키(?v=)가 붙는다(41478e03) — 경로만 비교
    try { if (new URL(this.src, location.href).pathname.endsWith('/plug.mp3')) window.plugPlays++; } catch {}
    return play.apply(this, args);
  };
});
const checks = [], errors = [], resources = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) resources.push(`${response.status()} ${response.url()}`); });
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};
const shot = name => page.screenshot({ path: path.join(shots, `${name}.png`) });
const confirm = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(120); };
const ready = map => page.waitForFunction(map => game.mapId === map && game.state === 'field'
  && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, map);

try {
  await page.goto(base);
  await page.waitForFunction(() => window.game?.title);
  await page.evaluate(async () => {
    const { QA_POINTS } = await import('/src/core/story.js');
    const point = QA_POINTS.find(entry => entry.id === 'youngcle1');
    game.devJump({ ...point, flags: { ...point.flags, youngcle_intro_done: true } });
  });
  await ready('youngcle1');
  await page.evaluate(() => {
    game.player.x = 660; game.player.y = 220; game.player.facing = 'up'; game.player.trail = [];
    window.tvAnchor = game.entities.find(entity => entity.id === 'youngcle_tv_screen');
    window.partyBeforeGag = [game.player, ...game.entities.filter(entity => entity.def.type === 'follower')]
      .map(entity => ({ id: entity.id, x: entity.x, y: entity.y }));
  });
  await shot('01-off-tv');
  await confirm();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'read' && game.textbox.node?.text === '* ..오..');
  await page.waitForTimeout(220);
  await shot('02-reading');
  check('first C uses the original live TV interaction entity', await page.evaluate(() =>
    window.tvAnchor === game.entities.find(entity => entity.id === 'youngcle_tv_screen')
      && window.tvAnchor.def.script === 'youngcle_tv_off'));
  await confirm(); await confirm();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'shock' && game.textbox.node?.text === '* 뭐 뭐노?!');
  await page.waitForTimeout(180);
  await shot('03-shocked');
  await confirm(); await confirm();
  await page.waitForFunction(() => game.tvBroadcast?.expression === 'hide');
  await shot('04-hide');
  await ready('youngcle1');
  const gag = await page.evaluate(() => ({ done: game.flags.youngcle_tv_gag_done, tv: game.tvBroadcast,
    phase: game.tvBroadcast?.phase, zoom: game.zoom.s, cameraIsPlayer: game.camera.target === game.player,
    party: [game.player, ...game.entities.filter(entity => entity.def.type === 'follower')]
      .map(entity => ({ id: entity.id, x: entity.x, y: entity.y })) }));
  check('gag powers off once and restores player camera', gag.done && gag.tv === null
    && gag.zoom === 1 && gag.cameraIsPlayer, gag);
  // 2026-09-13 사용자 요청(12502995): 느낌표 뒤 파티가 뒤로 달려(partyAt(284)) 표지를 가리지 않는다 → 형섭은 TV 아래쪽으로 물러나 있다
  const before = await page.evaluate(() => window.partyBeforeGag);
  const tvBox = await page.evaluate(() => ({ cx: window.tvAnchor.x + window.tvAnchor.w / 2, bottom: window.tvAnchor.y + window.tvAnchor.h }));
  const hero = gag.party[0], heroBefore = before[0];
  check('TV gag steps the party back below the TV (partyAt) and the hero stays under the screen', hero.y > heroBefore.y + 24
    && Math.abs(hero.x + (await page.evaluate(() => game.player.w)) / 2 - tvBox.cx) <= 40, { hero, heroBefore, tvBox });
  // 다시 TV 앞까지 걸어가 C — 반복 대사 확인
  { let lastY = null;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.down('ArrowUp'); await page.waitForTimeout(90); await page.keyboard.up('ArrowUp');
      const y = await page.evaluate(() => game.player.y);
      if (lastY !== null && Math.abs(y - lastY) < 0.5) break;
      lastY = y;
    } }
  await confirm();
  await page.waitForFunction(() => game.textbox.node?.text === '* TV는 꺼져 있다.');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await page.waitForTimeout(250);
  await shot('05-repeat-off');
  check('repeat response does not restart the broadcast', await page.evaluate(() => game.tvBroadcast === null));
  await confirm(); await ready('youngcle1');

  await page.evaluate(() => {
    game.player.x = 108; game.player.y = 220; game.player.facing = 'up'; game.camera.snap();
  });
  await confirm();
  await page.waitForFunction(() => game.textbox.node?.text === '* 문은 잠겨 있다.');
  await page.waitForFunction(() => game.textbox.state === 'waiting');
  await page.waitForTimeout(250);
  await shot('06-left-locked');
  check('left upper door stays locked in the first room', await page.evaluate(() => game.mapId === 'youngcle1'));
  await confirm(); await ready('youngcle1');

  await page.evaluate(() => {
    game.player.x = 1212; game.player.y = 220; game.player.facing = 'up'; game.camera.snap();
  });
  await shot('07-right-door');
  await confirm();
  await page.waitForFunction(() => game.mapId === 'youngcle1' && game.transitioning
    && game.fade.color === '0,0,0' && game.fade.alpha > 0.4);
  await shot('08-right-black-fade');
  await ready('youngcle2');
  await shot('09-youngcle2-left-arrival');
  const arrival = await page.evaluate(() => ({ map: game.mapId, entry: game.entrySpawn,
    x: game.player.x, y: game.player.y, facing: game.player.facing,
    expected: game.map.def.spawns.left, plugPlays: window.plugPlays }));
  check('right upper door uses C, clunk transition, and youngcle2 left spawn', arrival.map === 'youngcle2'
    && arrival.entry === 'left' && arrival.x === arrival.expected.x && arrival.y === arrival.expected.y
    && arrival.facing === arrival.expected.facing && arrival.plugPlays === 1, arrival);
  check('new TV pose and portrait files load without HTTP failures', !resources.some(url => /youngcle-tv-(read|shock|hide)|youngcle_tv_(read|shock|hide)/.test(url)), resources);
  check('no browser runtime errors', errors.length === 0, errors);
} catch (error) {
  errors.push(error.stack || error.message);
  await shot('failure');
  console.error(error);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, resources }, null, 2));
  await browser.close();
}
const failures = errors.length + checks.filter(check => !check.pass).length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
