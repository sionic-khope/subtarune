// 생각 길(BUILD245): 혼잣말 직전에서 오른쪽으로 → 나레이션 4줄 → 요플래 느낌표 → 6줄 → 플래그 → 오른쪽 문 → 굽은 물길(오른쪽 → 아래 → 오른쪽 끝). 실행: tests/playtest/run.sh jjajang-think
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'think_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; return { map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), party: [...g.party], bgm: g.sound?.bgmName ?? null, done: !!g.flags.think_done }; });
const go = async (key, cond, ms, run = true) => { await page.evaluate(c => { window.__cond = c; }, cond); if (run) await page.keyboard.down('KeyX'); await page.keyboard.down(key); const ok = await page.waitForFunction(() => new Function('g', 'return ' + window.__cond)(window.game), null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false); await page.keyboard.up(key); if (run) await page.keyboard.up('KeyX'); await page.waitForTimeout(100); return ok; };
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 15000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `나레이션: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=jjajang_think_mid');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_think' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.party.length === 0 && s.bgm === 'my_castle_town', '혼잣말 직전 QA: 요플래 혼자, 브금 이어짐 ' + JSON.stringify(s));
  await page.keyboard.down('ArrowRight');
  const started = await until(() => window.game.dialogue.running && window.game.flags.think_started, 8000);
  await page.keyboard.up('ArrowRight');
  check(started, '가운데에서 혼잣말 시작');
  await line('아 근데 난 뭘 하고 있는거지', '00_first');
  await line('다시 동료들과 합류해야한다');
  await line('나의 위치를 알릴 수 있는 방법');
  await line('... ... ...');
  check(await until(() => !!window.game.player.emote, 3000), '요플래 느낌표');
  await cap('01_exclaim');
  await line('봉인한 것은 아마도 영클일 것이다', '02_after_bang');
  await line('봉인이 풀렸을때도 감지할 수 있게');
  await line('지금 선택지가 그거밖에 없는듯하다');
  await line('그 동상을 부술 수 있을까');
  await line('아빠에게 조언을 구해야될 것 같다');
  await line('일단 오른쪽으로 쭉 가보자', '03_last');
  check(await until(() => !window.game.dialogue.running && window.game.flags.think_done, 6000), '혼잣말 끝 → 플래그');
  s = await st(); check(s.bgm === 'my_castle_town', '브금은 그대로');
  check(await go('ArrowRight', "g.mapId === 'jjajang_bend2'", 25000), '오른쪽 문 → 굽은 물길');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 8000 });
  await page.waitForTimeout(300); await cap('04_bend2');
  const B = await page.evaluate(() => window.game.map.def.meta.bend);
  // 비석 다섯(BUILD248): 윗길 3개·아랫길 2개, 앞에서 C 로 읽는다 — 마지막 것은 찢어진 뒤 나레이션 한 줄이 더 붙는다
  const readStele = async (id, lines, capture) => {
    const st2 = await page.evaluate(i => { const e = window.game.entities.find(x => x.id === i); return e ? { x: e.x, y: e.y, w: e.w, h: e.h } : null; }, id);
    if (!st2) { check(false, `${id}: 비석이 없다`); return; }
    check(await go('ArrowRight', `Math.abs(g.player.x + g.player.w / 2 - ${st2.x + st2.w / 2}) < 12`, 20000), `${id} 앞`);
    // 비석은 길 위 칸에 있으니 위를 보고 C. 자리가 한두 픽셀 어긋나면 살짝 밀며 다시 눌러 본다
    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt += 1) {
      await press('ArrowUp'); await page.waitForTimeout(100); await press('KeyC');
      opened = await until(() => window.game.dialogue.running, 1200);
      if (!opened) { await page.keyboard.down('ArrowRight'); await page.waitForTimeout(40); await page.keyboard.up('ArrowRight'); }
    }
    check(opened, `${id}: C 로 읽는다`);
    if (!opened) return;
    for (const [k, t] of lines.entries()) await line(t, k === 0 ? capture : null);
    for (let k = 0; k < 3 && (await page.evaluate(() => window.game.dialogue.running)); k += 1) { await press('KeyC'); await page.waitForTimeout(150); }
  };
  await readStele('jjajang_stele1', ['과거 붉은군단과 파란악마가 격돌했다', '혁명을 일으켰지만 결국 실패하고 말았다'], '04b_stele1');
  await readStele('jjajang_stele2', ['드럼통의 악마는 더욱 강해져갔다', '그를 막을 방법은 아무도 없었다']);
  await readStele('jjajang_stele3', ['전설의 붉은 깃발의 용사가 있었다', '마지막 영웅이였으며 모두의 희망이였다']);
  check(await go('ArrowRight', `g.player.x >= ${B.downCols[0] * 32 + 4}`, 20000), '윗길 오른쪽 끝(비석 셋 뒤)');
  check(await go('ArrowDown', `g.player.y >= ${B.lowerRows[0] * 32 + 4}`, 12000), '아래로(두 번째)');
  await readStele('jjajang_stele4', ['그러나 결국 실패하고 말았다', '계엄을 실패한 것이다']);
  await readStele('jjajang_stele5', ['...', '씹구멍', '갈기갈기 찢어져있다'], '04c_stele5');
  check(await go('ArrowRight', 'g.player.x >= g.map.pxW - 3 * 32', 25000), '아랫길 오른쪽 끝(다음 맵 대기)');
  await cap('05_bend2_end');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
