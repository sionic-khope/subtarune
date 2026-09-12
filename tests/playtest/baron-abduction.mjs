// A one-HP setup avoids replaying the unchanged 250-HP fight. The final attack,
// victory confirmation, cinematic, and restored movement use real keyboard input.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.env.BASE_URL || 'http://localhost:8000';
const shots = process.env.SHOT_DIR || '/tmp/baron-abduction-shots';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const checks = [], errors = [], captures = new Set();
let failures = 0;
const check = (name, ok, detail) => {
  checks.push({ name, ok: !!ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail ?? '')}`);
};
page.on('pageerror', e => errors.push(e.message));
page.on('console', message => {
  if (message.type() === 'warning' && /\[cutscene\]|\[map\]/.test(message.text())) errors.push(message.text());
});
const press = () => page.keyboard.press('KeyC', { delay: 65 });
const capture = async name => {
  if (captures.has(name)) return;
  captures.add(name);
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
};
let evidence;
try {
  await page.goto(`${base}/?qa=obj4_battle`);
  await page.waitForFunction(() => !!window.game?.player);
  await page.keyboard.press('KeyX', { delay: 65 });
  await page.waitForFunction(() => !game.dialogue.running && game.entities.find(e => e.id === 'nest_entry')?.cooldown <= 0);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => !!game.battle, null, { timeout: 20000 });
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => game.battle?.state === 'menu', null, { timeout: 15000 });
  check('unchanged full boss definition', await page.evaluate(() => game.battle.enemies[0].hp === 250));
  console.log('FIXTURE: boss current HP becomes 1; all remaining actions use normal game timing.');
  await page.evaluate(() => { game.battle.enemies[0].hp = 1; });
  const fightDeadline = Date.now() + 18000;
  while (Date.now() < fightDeadline) {
    const state = await page.evaluate(() => game.battle?.state);
    if (state === 'win') break;
    if (['menu', 'target'].includes(state)) await press();
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => game.battle?.state === 'win' && game.battle.typed);
  await capture('01_victory');
  await page.evaluate(() => {
    window.abductionEvidence = { samples: [], sounds: [], bgms: [], money: game.money };
    const originalSfx = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (id, options) => {
      abductionEvidence.sounds.push({ id, at: performance.now(), map: game.mapId });
      return originalSfx(id, options);
    };
    window.abductionSampler = setInterval(() => {
      const ids = ['player', 'ppaman', 'gyeongsub', 'baron', 'baron_after', 'baron_chase', 'yongjun_captive', 'cannon_abduction', 'statue1', 'statue2', 'statue3'];
      const entities = game.entities.filter(e => e && (e === game.player || ids.includes(e.id)) && !e.dead).map(e => ({
        id: e === game.player ? 'player' : e.id, x: e.x, y: e.y, visible: e.visible, facing: e.facing,
        frame: e.frame, sprite: e.def.sprite, motion: e.motion?.index, flyX: e.flyX || 0,
        flyY: e.flyY || 0, hopY: e.hopY || 0, spin: e.spin || 0,
      }));
      abductionEvidence.samples.push({ at: performance.now(), map: game.mapId, bgm: game.sound.bgmName,
        text: game.textbox.node?.text, box: game.textbox.state,
        running: game.dialogue.running, shake: game.shake?.amp, zoom: game.zoom.s, entities });
    }, 30);
  });
  await press();
  await page.waitForFunction(() => !game.battle, null, { timeout: 6000 });
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running,
      done: game.flags.obj4_abduction_done, text: game.textbox.node?.text || '', box: game.textbox.state,
      auto: game.textbox.auto, fade: game.fade.alpha,
      roar: game.entities.some(e => !e.dead && e.motion),
      cannon: game.entities.some(e => e.id === 'cannon_abduction' && Math.abs(e.flyX || 0) > 60),
      statues: game.entities.some(e => /^statue[123]$/.test(e.id) && Math.abs(e.flyX || 0) > 25),
      chase: game.entities.some(e => e.id === 'baron_chase' && e.visible && !e.dead),
      crawling: game.entities.some(e => e.id === 'baron_chase' && e.def.sprite === 'baron_chase' && e.moving),
      baron: (() => { const e = game.entities.find(e => e.id === 'baron_chase'); return e && { x: e.x, y: e.y, facing: e.facing }; })(),
    }));
    if (s.fade < 0.1) {
      if (s.roar && s.map === 'obj4') await capture('02_roar');
      if (s.text.includes('어 어라') && s.box === 'waiting') await capture('03_reaction');
      if (s.cannon) await capture('04_cannon_fling');
      if (s.crawling && s.map === 'obj4' && s.baron.y > 950) await capture('05_abduction');
      if (s.map === 'obj3' && s.crawling && s.baron.y > 100) await capture('06_corridor');
      if (s.text.includes('살려줘') && s.box === 'waiting') await capture('07_yongjun_help');
      if (s.map === 'obj2' && s.crawling && s.baron.y > 200) await capture('08_plaza');
      if (s.map === 'obj2' && s.crawling && s.baron.facing === 'right' && s.baron.x > 1250) await capture('08b_rightward');
      if (s.statues) await capture('09_statue_fling');
      if (s.text.includes('쫒아가죠') && s.box === 'waiting') {
        await capture('10_party_return');
        if (!captures.has('10_party_narrow')) {
          for (const [name, width, height] of [['10_party_narrow', 375, 812], ['10_party_wide', 1280, 900]]) {
            await page.setViewportSize({ width, height });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            await capture(name);
          }
          await page.setViewportSize({ width: 1000, height: 780 });
        }
      }
      if (s.text.includes('빨리 가자') && s.box === 'waiting') await capture('11_gyeongsub');
    }
    if (s.done && !s.running) break;
    if (s.box === 'waiting' && s.auto === null) await press();
    await page.waitForTimeout(45);
  }
  evidence = await page.evaluate(() => {
    clearInterval(abductionSampler);
    return { ...abductionEvidence, final: { map: game.mapId, done: game.flags.obj4_abduction_done,
      cleared: game.flags.obj2_statues_cleared, running: game.dialogue.running, zoom: game.zoom.s,
      money: game.money, entities: game.entities.filter(e => !e.dead).map(e => e.id) } };
  });
  const samples = evidence.samples;
  const maps = samples.map(s => s.map).filter((id, i, all) => id !== all[i - 1]);
  check('camera visits obj4 → obj3 → obj2 → obj4', maps.join(',') === 'obj4,obj3,obj2,obj4', maps);
  const lines = samples.filter(s => ['typing', 'waiting'].includes(s.box)).map(s => s.text).filter((text, i, all) => text && text !== all[i - 1]);
  check('four exact requested dialogue lines', JSON.stringify(lines) === JSON.stringify([
    '* 어 어라?', '* 으 으악 사 살려줘', '* 어 일단 쫒 쫒아가죠 형', '* 허허.. 빨리 가자',
  ]), lines);
  check('two Baron roars before charge', evidence.sounds.filter(s => s.id === 'baron_roar').length === 2, evidence.sounds);
  const reaction = samples.find(s => s.text === '* 어 어라?' && s.box === 'waiting');
  check('opening reaction has no BGM', reaction?.bgm === null, reaction?.bgm);
  check('The Chase continues in both following maps', ['obj3', 'obj2'].every(map => samples.some(s => s.map === map && s.bgm === 'baron_intro')));
  check('cannon visibly thrown horizontally', samples.some(s => s.entities.some(e => e.id === 'cannon_abduction' && Math.abs(e.flyX) > 100)));
  for (const id of ['statue1', 'statue2', 'statue3']) {
    check(`${id} visibly thrown horizontally`, samples.some(s => s.entities.some(e => e.id === id && Math.abs(e.flyX) > 50)));
  }
  for (const map of ['obj3', 'obj2']) {
    const visible = samples.filter(s => s.map === map && s.entities.some(e => e.id === 'baron_chase' && e.visible));
    check(`${map} shows captive with moving Baron`, visible.some(s => s.entities.some(e => e.id === 'yongjun_captive' && e.visible)));
    const ys = visible.flatMap(s => s.entities.filter(e => e.id === 'baron_chase').map(e => e.y));
    check(`${map} Baron moves down`, Math.max(...ys) - Math.min(...ys) > 180);
  }
  const xs = samples.filter(s => s.map === 'obj2').flatMap(s => s.entities.filter(e => e.id === 'baron_chase').map(e => e.x));
  check('obj2 Baron travels right beyond statues', Math.max(...xs) - Math.min(...xs) > 800);
  check('completion restores obj4 and removes temporary actors', evidence.final.done && evidence.final.cleared && !evidence.final.running && evidence.final.map === 'obj4' && evidence.final.zoom === 1 && !evidence.final.entities.some(id => ['baron_chase', 'yongjun_captive', 'cannon_abduction'].includes(id)), evidence.final);
  check('cinematic does not grant duplicate victory reward', evidence.money === evidence.final.money);
  await capture('12_control_return');
  const before = await page.evaluate(() => ({ x: game.player.x, y: game.player.y }));
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowDown');
  check('real movement works after cinematic', await page.evaluate(p => Math.hypot(game.player.x - p.x, game.player.y - p.y) > 20, before));
  await page.goto(`${base}/`);
  await page.waitForFunction(() => !!window.game?.player);
  const continueDeadline = Date.now() + 8000;
  while (Date.now() < continueDeadline && !await page.evaluate(() => game.state !== 'title' && game.mapId === 'obj4' && game.flags.obj4_abduction_done)) {
    await press();
    await page.waitForTimeout(150);
  }
  check('continue restores completed event without replay', await page.evaluate(() => game.state !== 'title' && game.mapId === 'obj4' && game.flags.obj4_abduction_done && !game.dialogue.running && game.flags.obj2_statues_cleared));
  await page.evaluate(() => { game.changeMap('obj2', 'from_top', true, { enter: false }); });
  check('statues stay absent on map reload', await page.evaluate(() => !game.entities.some(e => /^statue[123]$/.test(e.id) && !e.dead)));
  await page.evaluate(async () => {
    const { freeSpot } = await import('/src/world/world.js');
    [game.player.x, game.player.y] = freeSpot(game, game.player, 1520, 456);
    game.player.facing = 'right'; game.spawnParty(); game.camera.snap(); game.fadeTo(0, 0);
  });
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(800);
  await page.keyboard.up('ArrowRight');
  check('real movement crosses the cleared statue column', await page.evaluate(() => game.player.x > 1640));
  await capture('13_open_statue_path');
  check('all intended cinematic beats captured', ['02_roar','03_reaction','04_cannon_fling','05_abduction','06_corridor','07_yongjun_help','08_plaza','09_statue_fling','10_party_return','11_gyeongsub','12_control_return'].every(id => captures.has(id)), [...captures]);
} catch (error) {
  check('playtest completes', false, error.stack);
  await page.screenshot({ path: path.join(shots, 'failure.png') }).catch(() => {});
} finally {
  check('no page errors', errors.length === 0, errors);
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ base, checks, failures, captures: [...captures], evidence }, null, 2));
  await browser.close();
}
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
