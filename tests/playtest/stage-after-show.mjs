// 대기실 문 진입 + 공연 뒤 연출(BUILD185): QA backstage → 뚜울라에게 C → 대사 → “음악으로!!!” → 뚜울라·셋이 위 커튼 문으로 들어가 사라짐 → 페이드 → 리듬 씬 시작(끝내기)
//   → 검은 화면 나레이션 두 줄 → 무대 위(youngcle11 on_stage, ttuulla_show) → 대사 → 오른쪽 벽 폭파(stage11_right_wall 제거) → 뚜울라 땅 파고 퇴장 → stage_show_done → 오른쪽 문으로 youngcle13.
// 실행: tests/playtest/run.sh stage-after-show
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'after_show_' + n + '.png') }); };
const pressC = async () => { await page.keyboard.press('KeyC'); await page.waitForTimeout(240); };
const st = () => page.evaluate(() => { const g = window.game; const ent = id => g.entities.find(e => e.id === id && !e.dead); const p = g.player; const m = ent('ttuulla_back'), s = ent('ttuulla_show'), w = ent('stage11_right_wall');
  return { map: g.mapId, dialogue: g.dialogue.running, text: g.textbox.node?.text?.slice(0, 40), curtain: g.curtain, fade: Math.round(g.fade.alpha * 100) / 100, px: Math.round(p.x), py: Math.round(p.y), pvis: p.visible !== false,
    mouse: m ? { vis: m.visible !== false, x: Math.round(m.x), y: Math.round(m.y) } : null, show: s ? { scale: Math.round((s.def.visualScale ?? 1) * 100) / 100 } : null, wall: !!w, flag: !!g.flags.stage_show_done, rhythm: !!window.__rhythm,
    mice: g.entities.filter(e => !e.dead && e.def && e.def.sprite === 'ttuulla' && e.visible !== false).map(e => e.id), party: ['gyeongsub', 'ppaman'].map(id => { const e = ent(id); return e ? [Math.round(e.x), Math.round(e.y)] : null; }) }; });
const waitText = (sub, timeout = 8000) => page.waitForFunction((sub) => (window.game.textbox.node?.text || '').includes(sub), sub, { timeout }).then(() => true).catch(() => false);
const talkUntil = async (pred, max = 40) => { for (let i = 0; i < max; i++) { const s = await st(); if (pred(s)) return s; if (s.dialogue && s.text) await advance(); else await page.waitForTimeout(250); } return st(); };
// 지금 줄을 넘긴다: 타자 중이면 첫 C 는 채우기만 하므로 줄(node)이 바뀌거나 대화가 끝날 때까지 누른다
const advance = async () => { const key = () => page.evaluate(() => `${window.game.dialogue.i}:${window.game.textbox.node?.text ?? ''}`); const before = await key(); for (let i = 0; i < 4; i++) { await pressC(); const now = await key(); const running = await page.evaluate(() => window.game.dialogue.running); if (now !== before || !running) return; } };
try {
  // ① 대기실: 뚜울라에게 C → 대사 → 문으로 들어감
  await page.goto('http://localhost:8000/?qa=backstage');
  await page.waitForFunction(() => window.game && window.game.mapId === 'youngcle12' && !window.game.dialogue.running, null, { timeout: 25000 });
  await page.waitForTimeout(900);
  // 뚜울라(396,170) 왼쪽에 서서 오른쪽을 보고 C
  await page.evaluate(() => { const g = window.game; g.player.x = 366; g.player.y = 170; g.player.facing = 'right'; });
  await page.waitForTimeout(200); await pressC();
  let s = await talkUntil(x => x.dialogue && (x.text || '').includes('음악으로'), 40);
  check(s.dialogue && (s.text || '').includes('음악으로'), '대기실 대사 → 음악으로!!! ' + JSON.stringify([s.text]));
  await advance();
  await page.waitForFunction(() => { const g = window.game; const m = g.entities.find(e => e.id === 'ttuulla_back'); return m && m.visible === false; }, null, { timeout: 12000 }).catch(() => {});
  await cap('door_mouse'); s = await st();
  check(s.mouse && !s.mouse.vis && s.mouse.y < 150, '뚜울라가 위 커튼 문으로 들어가 사라진다 ' + JSON.stringify(s.mouse));
  await page.waitForFunction(() => { const g = window.game; return g.player.visible === false; }, null, { timeout: 15000 }).catch(() => {});
  s = await st(); check(!s.pvis && s.py < 150, '주인공도 문으로 들어가 사라진다 ' + JSON.stringify([s.pvis, s.px, s.py]));
  await page.waitForFunction(() => !!window.__rhythm, null, { timeout: 15000 }).catch(() => {});
  s = await st(); check(s.rhythm, '페이드 뒤 리듬 씬 시작 ' + JSON.stringify([s.rhythm, s.fade]));
  // ② 씬을 끝내면 공연 뒤 연출: 검은 화면 나레이션
  await page.evaluate(() => window.__rhythm.finish(true));
  await page.waitForFunction(() => !window.__rhythm && window.game.dialogue.running && window.game.curtain === 'black', null, { timeout: 10000 }).catch(() => {});
  await waitText('가재맨 밴드'); await page.waitForTimeout(900); await cap('narration'); s = await st();
  check(s.curtain === 'black' && s.fade === 0 && (s.text || '').includes('가재맨 밴드'), '검은 화면 나레이션 “그렇게 우리 가재맨 밴드는” ' + JSON.stringify([s.curtain, s.fade, s.text]));
  await advance(); await waitText('성공적으로'); s = await st();
  check((s.text || '').includes('성공적으로'), '“성공적으로 공연을 마쳤다.” ' + JSON.stringify([s.text]));
  await advance();
  await page.waitForFunction(() => window.game.mapId === 'youngcle11' && window.game.curtain === null && window.game.fade.alpha < 0.05, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300); await cap('stage'); s = await st();
  check(s.map === 'youngcle11' && s.show && s.py < 260, '무대 위로(on_stage) + 뚜울라 ' + JSON.stringify([s.map, s.show, s.px, s.py]));
  // 겹침(BUILD188): 셋이 좌·중·우로 벌려 서고, 무대엔 뚜울라가 하나(ttuulla_show)뿐
  const xs = [s.px, ...(s.party || []).map(q => q && q[0])];
  check(xs.every(x => typeof x === 'number') && Math.min(...xs.slice(1).map(x => Math.abs(x - xs[0]))) >= 40 && Math.abs(xs[1] - xs[2]) >= 80, '일행이 좌·중·우로 벌려 선다(겹침 없음) ' + JSON.stringify(xs));
  check(s.mice.length === 1 && s.mice[0] === 'ttuulla_show', '무대 위 뚜울라는 하나(ttuulla_wait 없음) ' + JSON.stringify(s.mice));
  s = await talkUntil(x => (x.text || '').includes('오른쪽 문'), 12);
  check((s.text || '').includes('오른쪽 문'), '“자 저기 오른쪽 문이 있을겁니다” ' + JSON.stringify([s.text]));
  await advance();
  await page.waitForFunction(() => !window.game.entities.find(e => e.id === 'stage11_right_wall' && !e.dead), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200); await cap('wall_blown'); s = await st();
  check(!s.wall, '무대 오른쪽 벽이 뚫린다(벽 소품 제거) ' + JSON.stringify([s.wall]));
  s = await talkUntil(x => (x.text || '').includes('알바아닙니다'), 16);
  check((s.text || '').includes('알바아닙니다'), '“이제부턴 제 알바아닙니다 ㅂㅇ” ' + JSON.stringify([s.text]));
  await advance();
  await page.waitForFunction(() => window.game.flags.stage_show_done === true, null, { timeout: 12000 }).catch(() => {});
  await cap('after'); s = await st();
  check(s.flag && !s.show && !s.dialogue && s.mice.length === 0, '뚜울라가 땅 파고 사라지고(남는 뚜울라 없음) stage_show_done ' + JSON.stringify([s.flag, s.show, s.dialogue, s.mice]));
  // ②-b 공연 뒤엔 계단 꼭대기를 밟아도 대기실로 안 간다(BUILD190 사용자 버그 신고)
  await page.evaluate(() => { const g = window.game; g.player.x = 700; g.player.y = 210; });
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(400); s = await st();
  check(s.map === 'youngcle11', '공연 뒤 오른쪽 계단을 내려가도 대기실로 워프하지 않는다 ' + JSON.stringify([s.map, s.px, s.py]));
  // ③ 오른쪽 길로 걸어가면 복도(youngcle13)
  await page.evaluate(() => { const g = window.game; g.player.x = 740; g.player.y = 160; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1800); await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => window.game.mapId === 'youngcle13', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500); await cap('corridor'); s = await st();
  check(s.map === 'youngcle13', '오른쪽 문 → 무대 오른쪽 복도(youngcle13) ' + JSON.stringify([s.map, s.px, s.py]));
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
