// 벚꽃 숲 6(BUILD277): 벚꽃 숲 5 오른쪽 끝 문 → 벚꽃 숲 6 → 오른쪽으로 물가 → 뗏목 C → 5초 → 뭍 → 광장 들머리 → 연출(카메라 천천히 오른쪽·가면 최미스 꽃 따기·헤헤 …·스읍 미스·진동·카메라 천천히 왼쪽·말풍선·느낌표·최미스 퇴장·브금 복귀)
//   → 다시 들어오면 최미스 없음. 실행: tests/playtest/run.sh jjajang-sakura6
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /cutscene|엔티티 없음|동작 없음|없음/.test(m.text())) errors.push('warn: ' + m.text()); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'sakura6_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = fn => page.evaluate(fn);
const go = async (key, cond, ms) => { await page.evaluate(c => { window.__cond = c; }, cond); await page.keyboard.down(key); const ok = await until(() => new Function('g', 'return ' + window.__cond)(window.game), ms); await page.keyboard.up(key); return ok; };
const st = () => ev(() => { const g = window.game; const c = g.entities.find(e => e.id === 'choimis'); return { map: g.mapId, text: g.textbox.node?.text || null, speaker: g.textbox.node?.speaker || null, state: g.textbox.state, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], bgm: g.sound.bgmName, px: Math.round(g.player.x), py: Math.round(g.player.y), petals: g.petals?.count ?? -1, dialogue: g.dialogue.running, choimis: c ? { x: Math.round(c.x), y: Math.round(c.y), facing: c.facing, sprite: c.def.sprite, motion: !!c.motion } : null }; });
const next = async () => { await until(() => window.game.textbox.state === 'waiting', 8000); await press('KeyC'); };
const advanceTo = async (needle, ms = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (s.text && s.text.includes(needle)) return s; if (s.text) await next(); await page.waitForTimeout(100); } return null; };
const choimis = () => ev(() => { const c = window.game.entities.find(e => e.id === 'choimis'); return c ? { x: Math.round(c.x), y: Math.round(c.y), facing: c.facing, motion: !!c.motion } : null; });
try {
  // 1) 벚꽃 숲 5 오른쪽 길 → 동쪽 끝 문 → 벚꽃 숲 6 서쪽 끝
  await page.goto('http://localhost:8000/?qa=jjajang_sakura5_clearing');
  check(await until(() => window.game?.mapId === 'jjajang_sakura5' && !window.game.transitioning, 30000), '벚꽃 숲 5 오른쪽 길 QA');
  await page.waitForTimeout(500);
  check(await go('ArrowRight', "g.mapId === 'jjajang_sakura6'", 20000), '오른쪽 끝 문 → 벚꽃 숲 6');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(500);
  let s = await st(); check(s.bgm === 'sakura' && s.petals > 0 && s.px < 100, `6: 서쪽 끝에서 시작·브금 sakura·꽃잎 ${JSON.stringify([s.px, s.py, s.bgm, s.petals])}`); await cap('00_enter');
  const S = await ev(() => window.game.map.def.meta.sakura6);
  // 2) 물가 → 뗏목 C(걸어 올라타기, 동료는 옆에서 헤엄) → 5초쯤 → 오른쪽 뭍
  check(await go('ArrowRight', `g.player.x >= ${(S.shoreCol + 1) * 32 - 30}`, 20000), '오른쪽으로 물가 끝까지'); await cap('01_dock');
  await press('KeyC'); check(await until(() => window.game.ride && window.game.ride.moving, 8000), '뗏목 C → 걸어 올라타고 출발');
  await page.waitForTimeout(2400); await cap('02_ride');
  const mid = await ev(() => ({ x: Math.round(window.game.ride?.x ?? -1), swimmers: window.game.entities.filter(e => e.def?.type === 'swimmer' && !e.dead).length }));
  check(mid.swimmers === 2, `동료 둘이 뗏목 옆에서 헤엄 ${JSON.stringify(mid)}`);
  check(await until(() => !window.game.ride, 12000), '뗏목 도착(뭍)');
  const landed = await ev(() => { const g = window.game; const r = g.entities.find(e => e.id === 'sakura6_raft'); return { rideTime: +r.rideTime.toFixed(1), px: Math.round(g.player.x), raftX: Math.round(r.x), followers: g.entities.filter(e => e.def?.type === 'follower' && e.visible !== false).length }; });
  check(landed.rideTime >= 4.5 && landed.rideTime <= 5.8 && landed.px > landed.raftX && landed.followers === 2, `뗏목 5초쯤·오른쪽 뭍에 내렸고 동료 둘 복귀 ${JSON.stringify(landed)}`); await cap('03_landing');
  // 3) 광장 들머리 → 연출: 카메라가 천천히 오른쪽으로(대사는 그 뒤), 일행은 살짝 앞으로(카메라 왼쪽 밖), 가면 쓴 최미스는 꽃을 딴다
  const camBefore = (await st()).cam;
  check(await go('ArrowRight', 'g.dialogue.running', 20000), '광장 들머리 → 연출 시작');
  await page.waitForTimeout(700); const c1 = (await st()).cam; await cap('04_pan');
  await page.waitForTimeout(900); const c2 = (await st()).cam;
  check(c1[0] > camBefore[0] + 20 && c2[0] > c1[0] + 20 && c2[0] < 1552, `카메라가 천천히 오른쪽으로 (${camBefore[0]} → ${c1[0]} → ${c2[0]})`);
  const picking = await ev(() => { const c = window.game.entities.find(e => e.id === 'choimis'); return { sprite: c?.def.sprite, x: Math.round(c?.x ?? -1), y: Math.round(c?.y ?? -1) }; });
  check(picking.sprite === 'choimis_masked' && picking.x === 1820, `가면 쓴 최미스가 꽃 1 옆 ${JSON.stringify(picking)}`);
  check(await until(() => Math.round(window.game.camera.x) === 1552, 4000), '카메라가 광장 가운데에 멈춤');
  s = await st(); check(s.px + 24 < s.cam[0] && !s.text, `주인공들은 카메라 왼쪽 밖(${s.px} < ${s.cam[0]}), 아직 대사 없음`); await cap('05_plaza');
  check(await until(() => { const c = window.game.entities.find(e => e.id === 'choimis'); return c && Math.round(c.x) === 1876; }, 8000), '꽃 2 로 옮겨 간다');
  check(await until(() => !!window.game.entities.find(e => e.id === 'choimis')?.motion, 3000), '꽃 따는 자세'); await page.waitForTimeout(250); await cap('06_pick');
  check(await until(() => { const c = window.game.entities.find(e => e.id === 'choimis'); return c && Math.round(c.x) === 1828 && Math.round(c.y) === 432 && !!c.motion; }, 8000), '꽃 3(아래쪽) 으로 옮겨 가 딴다 — 나무 수관에 안 가려야 한다'); await page.waitForTimeout(250); await cap('06b_pick3');
  check(await until(() => { const c = window.game.entities.find(e => e.id === 'choimis'); return c && Math.round(c.x) === 1780 && c.facing === 'down'; }, 14000), '가운데로 와서 앞을 봄');
  s = await advanceTo('헤헤'); check(!!s && s.speaker === '최미스' && s.bgm === 'loving_steps', `최미스: 헤헤 (브금 loving_steps) ${JSON.stringify([s?.speaker, s?.bgm])}`); await cap('07_hehe');
  s = await advanceTo('오그라들어'); check(!!s, '오우 쉣 손발이 다 오그라들어'); await next();
  check(await until(() => !!window.game.entities.find(e => e.id === 'choimis')?.motion && !window.game.textbox.node, 5000), '스읍 미스 자세(대사 없이 클립)'); await page.waitForTimeout(600); await cap('08_seup');
  s = await advanceTo('섹스'); check(!!s && s.text.includes('{shake}'), '나 진짜 이제섹스 하는건가!!!!!!!! (채팅창 진동)'); await page.waitForTimeout(400); await cap('09_shake'); await next();
  // 왼쪽 보고 → 카메라 천천히 주인공들 쪽 → 주인공들 ... 말풍선
  check(await until(() => window.game.entities.find(e => e.id === 'choimis')?.facing === 'left', 4000), '최미스 왼쪽을 본다');
  await page.waitForTimeout(900); const c3 = (await st()).cam; await page.waitForTimeout(700); const c4 = (await st()).cam;
  check(c3[0] < 1552 && c4[0] < c3[0] && c4[0] > 1418, `카메라가 천천히 왼쪽(주인공들)으로 (1552 → ${c3[0]} → ${c4[0]})`);
  check(await until(() => Math.abs(window.game.camera.x - 1417.6) < 1.5, 4000), '카메라 멈춤(주인공들과 최미스 한 화면)');
  check(await until(() => { const b = window.game.bubble; return b && !b.done && Array.isArray(b.target) && b.target.length === 3; }, 3000), '주인공들 셋 머리 위 ... 말풍선(동시에)');
  await page.waitForTimeout(1000); await cap('10_bubbles');
  s = await advanceTo('이녀석들'); check(!!s && s.speaker === '최미스', '엇 이녀석들 또 여기!!');
  s = await advanceTo('미스야'); check(!!s && s.speaker === '경섭', '경섭: 미스야'); await next();
  await page.waitForTimeout(450); await cap('11_exclaim');
  s = await advanceTo('내 돈 갚아'); check(!!s && s.speaker === '경섭', '경섭: 내 돈 갚아 씨2발새끼야'); await next();
  s = await advanceTo('지금 당장 돈이'); check(!!s && s.speaker === '최미스', '최미스: 형 제가 지금 당장 돈이');
  s = await advanceTo('그다음맵에서'); check(!!s && s.speaker === '억빠맨', '억빠맨: 잠깐 이렇게 바로 그다음맵에서 고백한다고?');
  s = await advanceTo('지켜봐줘'); check(!!s && s.speaker === '최미스', '최미스: 지켜봐줘 나의 무대.'); await next();
  await page.waitForTimeout(1000); const leaving = await choimis(); await cap('12_leave');
  check(!!leaving && leaving.x > 1800 && leaving.facing === 'right', `최미스가 오른쪽으로 걸어 나간다 ${JSON.stringify(leaving)}`);
  s = await advanceTo('가보죠'); check(!!s && s.speaker === '억빠맨', '억빠맨: ㅋㅋㅋ 뭔가 재밌을거같은데 가보죠');
  check(await until(() => window.game.sound.bgmName === null, 2500), '(브금 꺼지고)'); await next();
  check(await until(() => !window.game.dialogue.running && window.game.flags.sakura6_scene_done, 8000), '연출 끝·플래그');
  check(await until(() => !window.game.entities.find(e => e.id === 'choimis'), 8000), '최미스는 오른쪽 끝으로 나가 사라짐');
  await page.waitForTimeout(800); s = await st();
  check(s.bgm === 'sakura' && Math.abs(s.cam[0] + 240 - (s.px + 12)) < 48, `정상: 맵 브금 sakura 복귀·카메라 주인공 ${JSON.stringify([s.bgm, s.cam, s.px])}`); await cap('13_after');
  // 4) 다시 들어오면(연출 끝 QA) 최미스 없음
  await page.goto('http://localhost:8000/?qa=jjajang_sakura6_east');
  check(await until(() => window.game?.mapId === 'jjajang_sakura6' && !window.game.transitioning, 30000), '연출 끝 QA');
  await page.waitForTimeout(500); s = await st(); check(!s.choimis && s.bgm === 'sakura', '다시 들어오면 최미스 없음'); await cap('14_reenter');
} catch (e) { fails += 1; console.log('FAIL exception', e.stack || e.message); }
if (errors.length) { fails += 1; console.log('FAIL console/page errors', errors.slice(0, 5).join(' | ')); }
console.log(`=== total fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
