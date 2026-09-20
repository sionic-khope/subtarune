// 벚꽃 숲 7(BUILD278): 벚꽃 숲 6 오른쪽 끝 문 → 벚꽃 숲 7 → 오른쪽으로 → 들머리 트리거 → 무대 연출 전부(느낌표·카메라 무대·셋 가운데·어둠·치지직·나레이션·브금·스포트라이트·점례·한 걸음씩·말풍선·가면 최미스·스읍 미스·도미조림 난입·가면 벗겨짐·
//   불 켜짐·crowd_ooh·카메라 아래/위·관객 난동·박치기·날아감·주인공들·오른쪽 길) → 재입장. 실행: tests/playtest/run.sh jjajang-sakura7
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /cutscene|엔티티 없음|동작 없음|없음/.test(m.text())) errors.push('warn: ' + m.text()); });
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'sakura7_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const ev = (fn, arg) => page.evaluate(fn, arg);
const go = async (key, cond, ms) => { await page.evaluate(c => { window.__cond = c; }, cond); await page.keyboard.down(key); const ok = await until(() => new Function('g', 'return ' + window.__cond)(window.game), ms); await page.keyboard.up(key); return ok; };
const ent = id => ev(i => { const e = window.game.entities.find(x => x.id === i); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, visible: e.visible !== false, spin: +(e.spin || 0).toFixed(2), motion: !!e.motion, dead: !!e.dead } : null; }, id);
const st = () => ev(() => { const g = window.game; return { map: g.mapId, text: g.textbox.node?.text || null, speaker: g.textbox.node?.speaker || null, state: g.textbox.state, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], bgm: g.sound.bgmName, px: Math.round(g.player.x), py: Math.round(g.player.y), dialogue: g.dialogue.running, balloon: g.balloon && !g.balloon.done ? g.balloon.text : null, flags: { s: !!g.flags.sakura7_scene_done } }; });
const next = async () => { await until(() => window.game.textbox.state === 'waiting', 8000); await press('KeyC'); };
const advanceTo = async (needle, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (s.text && s.text.includes(needle)) return s; if (s.text) await next(); await page.waitForTimeout(100); } return null; };
/** 화면 밝기(0~765): 게임 캔버스 픽셀 — 어둠(dim)·스포트라이트 확인 */
const bright = (sx, sy, pick = 'min') => ev(([x, y, p]) => { const c = document.querySelector('canvas').getContext('2d'); const vals = [[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]].map(([dx, dy]) => { const d = c.getImageData(x + dx, y + dy, 1, 1).data; return d[0] + d[1] + d[2]; }); return p === 'max' ? Math.max(...vals) : Math.min(...vals); }, [sx, sy, pick]);   // 꽃잎 점·스프라이트를 피해 다섯 점의 최소(어둠)·최대(스포트라이트)
try {
  // 1) 벚꽃 숲 6 오른쪽 길 → 동쪽 끝 문 → 벚꽃 숲 7 서쪽 끝
  await page.goto('http://localhost:8000/?qa=jjajang_sakura6_east');
  check(await until(() => window.game?.mapId === 'jjajang_sakura6' && !window.game.transitioning, 30000), '벚꽃 숲 6 연출 끝 QA');
  await page.waitForTimeout(500);
  check(await go('ArrowRight', "g.mapId === 'jjajang_sakura7'", 25000), '오른쪽 끝 문 → 벚꽃 숲 7');
  await page.waitForFunction(() => !window.game.transitioning, null, { timeout: 10000 }); await page.waitForTimeout(500);
  let s = await st(); check(s.bgm === 'sakura' && s.px < 100, `7: 서쪽 끝에서 시작·브금 sakura ${JSON.stringify([s.px, s.py, s.bgm])}`); await cap('00_enter');
  const S = await ev(() => window.game.map.def.meta.sakura7);
  const crowdUp = await ev(() => window.game.entities.filter(e => (e.id || '').startsWith('crowd_')).map(e => e.facing));
  check(crowdUp.length === 14 && crowdUp.every(f => f === 'up'), `관객 가순이 열넷이 위를 본다 ${crowdUp.length}`);
  // 2) 오른쪽으로 → 들머리 트리거 → 셋 느낌표 → 카메라 천천히 무대로 → 셋이 가운데로
  const camBefore = (await st()).cam;
  check(await go('ArrowRight', 'g.dialogue.running', 25000), '들머리 → 연출 시작');
  await page.waitForTimeout(350); await cap('01_exclaim');
  await page.waitForTimeout(600); const c1 = (await st()).cam; await page.waitForTimeout(800); const c2 = (await st()).cam;
  check(c1[1] < camBefore[1] - 20 && c2[1] < c1[1] - 20 && c2[1] > 98, `카메라가 천천히 무대(위)로 (${camBefore[1]} → ${c1[1]} → ${c2[1]})`);
  check(await until(() => Math.round(window.game.camera.y) === 98 && Math.round(window.game.camera.x) === 480, 5000), '카메라가 무대 뷰에 멈춤');
  check(await until(() => { const g = window.game; return Math.round(g.player.x) === 708 && Math.round(g.player.y) === 424 && g.player.facing === 'up'; }, 10000), '셋이 가운데로 걸어와 위를 본다'); await cap('02_center');
  // 3) 화면이 점차 어두워짐 → 치지직 → 나레이션 → 브금 → 스포트라이트 쾅
  const litBefore = await bright(40, 700);
  s = await advanceTo('그남자와 그여자의 무대'); check(!!s, '나레이션: 지금부터 그남자와 그여자의 무대를 시작하겠습니다.');
  const dark = await bright(40, 700); check(dark < litBefore * 0.4, `화면이 어두워졌다 (${litBefore} → ${dark})`); await cap('03_dark'); await next();
  check(await until(() => window.game.sound.bgmName === 'loving_steps', 4000), '이 브금(loving_steps) 다시');
  const spotAt = [(S.spot.x - 480) * 2, (S.spot.y - 98) * 2];
  let spotOn = false; for (let i = 0; i < 40 && !spotOn; i++) { spotOn = (await bright(...spotAt, 'max')) > 200; if (!spotOn) await page.waitForTimeout(150); }
  check(spotOn, '무대 가운데 스포트라이트 켜짐');
  await page.waitForTimeout(300); await cap('04_spot');
  const edge = await bright(40, 700), inside = await bright(...spotAt, 'max'); check(inside > edge * 2, `스포트라이트 안이 밖보다 밝다 (${inside} vs ${edge})`);
  // 4) 점례가 뒤에서 천천히 걸어 나옴 → 한 줄마다 한 걸음
  check(await until(() => { const e = window.game.entities.find(x => x.id === 'jeomnye'); return e && e.visible !== false; }, 4000), '점례 등장');
  const j0 = await ent('jeomnye'); await page.waitForTimeout(700); const j1 = await ent('jeomnye');
  check(j1.y > j0.y && j1.y - j0.y < 60, `천천히 걸어 나온다 (${j0.y} → ${j1.y})`);
  s = await advanceTo('아 외로워'); check(!!s && s.speaker === '점례', '점례: 아 외로워'); await cap('05_jeomnye');
  const jx0 = (await ent('jeomnye')).x; s = await advanceTo('외로움을 달래줄'); const jx1 = (await ent('jeomnye')).x;
  check(jx1 !== jx0 && Math.abs(jx1 - jx0) <= 16, `한 줄마다 한 걸음 (${jx0} → ${jx1})`);
  s = await advanceTo('잠에 들겠지'); check(!!s, '점례: 하루를 보내다 잠에 들겠지.'); await next();
  // 5) 최미스 말풍선만(어둠 속) → 점례 느낌표·오른쪽 → 최미스 천천히 걸어 나옴
  check(await until(() => window.game.balloon && !window.game.balloon.done && window.game.balloon.text === '아니. 그대여.', 5000), '최미스 말풍선만: 아니. 그대여.'); await page.waitForTimeout(500); await cap('06_balloon');
  check(await until(() => window.game.entities.find(x => x.id === 'jeomnye')?.facing === 'right', 6000), '점례 오른쪽을 본다');
  const m0 = await ent('choimis'); await page.waitForTimeout(800); const m1 = await ent('choimis');
  check(m0.visible && m1.x < m0.x && m0.x - m1.x < 60, `가면 최미스가 천천히 걸어 나온다 (${m0.x} → ${m1.x})`);
  s = await advanceTo('가재맨방 고닉. 최미스'); check(!!s && s.speaker === '최미스', '최미스: 나 가재맨방 고닉. 최미스'); await cap('07_choimis');
  s = await advanceTo('스읍 미스'); check(!!s && (await ent('choimis')).motion, '최미스: 스읍 미스 (가면 seup 자세)'); await cap('08_seup');
  s = await advanceTo('나랑.. 사귀'); check(!!s, '최미스: 나랑.. 사귀 (자동 넘김)');
  // 6) 도미조림 하늘에서 쿵 → 가면 벗겨짐·최미스 뒷모습 넘어짐 → 흐미 → 통통 튀어 도망
  check(await until(() => { const d = window.game.entities.find(x => x.id === 'domijorim'); return d && d.visible !== false && d.y < 100; }, 4000), '도미조림이 하늘에서');
  check(await until(() => { const d = window.game.entities.find(x => x.id === 'domijorim'); return d && Math.round(d.y) >= 230; }, 3000), '쿵 착지');
  check(await until(() => { const g = window.game; const m = g.entities.find(x => x.id === 'discord_mask'), b = g.entities.find(x => x.id === 'choimis_bare'), c = g.entities.find(x => x.id === 'choimis'); return m?.visible !== false && b?.visible !== false && c?.visible === false && Math.abs(b.spin) > 1; }, 3000), '닿자마자 가면 벗겨지고 최미스는 뒷모습으로 넘어짐');
  s = await advanceTo('흐미'); check(!!s && s.speaker === '도미조림', '도미조림: 흐미!!!!!!! 내 홍어 어디갔당가!!!'); await cap('09_domijorim'); await next();
  check(await until(() => { const d = window.game.entities.find(x => x.id === 'domijorim'); return !d || d.dead; }, 5000), '통통 튀어 도망(사라짐)');
  const mask = await ent('discord_mask'), jn = await ent('jeomnye'); check(mask.visible && mask.x < jn.x + 24 && mask.y < jn.y, `가면이 점례 뒤에 ${JSON.stringify([mask.x, mask.y, jn.x, jn.y])}`);
  s = await advanceTo('이게뭐지'); check(!!s && s.speaker === '점례', '점례: 이게뭐지.'); await cap('10_mask');
  s = await advanceTo('땡떙씨'); check(!!s, '점례: 혹시 땡떙씨'); await next();
  // 7) 브금 꺼지고 불 켜짐 → 최미스 일어남(뒷모습) → 2초 → 앞모습(crowd_ooh)
  check(await until(() => window.game.sound.bgmName === null, 3000), '(브금이 꺼지고)');
  check(await until(() => { const b = window.game.entities.find(x => x.id === 'choimis_bare'); return b && Math.abs(b.spin) < 0.01 && b.facing === 'up'; }, 3000), '최미스 일어남(뒷모습)');
  await page.waitForTimeout(900); await cap('11_standback');
  check(await until(() => window.game.entities.find(x => x.id === 'choimis_bare')?.facing === 'down', 4000), '2초쯤 지나고 앞모습');
  const lit = await bright(40, 700); check(lit > dark * 2, `불이 다시 켜졌다 (${dark} → ${lit})`); await cap('12_front');
  s = await advanceTo('...?'); check(!!s && s.speaker === '점례', '점례: ...?'); await next();
  check(await until(() => Math.round(window.game.camera.y) === 146, 4000), '가순이들로 카메라 살짝 밑으로');
  s = await advanceTo('....?'); check(!!s && s.speaker === '가순이들', '가순이들: ....?'); await cap('13_crowd'); await next();
  check(await until(() => Math.round(window.game.camera.y) === 98, 4000), '다시 미스 쪽 가운데로');
  s = await advanceTo('어 하이'); check(!!s && s.speaker === '최미스', '최미스: 어 하이.'); await next();
  // 8) 2초 뒤 관객 난동 6초: 던지기·가순이들 발 동동
  check(await until(() => window.game.entities.filter(e => (e.id || '').startsWith('throw_') && e.visible !== false).length >= 3, 6000), '관객이 던지기 시작');
  await page.waitForTimeout(1200); await cap('14_riot');
  const riot = await ev(() => { const g = window.game; return { thrown: g.entities.filter(e => (e.id || '').startsWith('throw_') && e.visible !== false).length, sides: g.entities.filter(e => (e.id || '').startsWith('crowd_') && e.facing !== 'up').length }; });
  check(riot.thrown >= 4 && riot.sides >= 3, `던지는 것들·가순이들 양옆 ${JSON.stringify(riot)}`);
  s = await advanceTo('아 시발. 점례야'); check(!!s && s.speaker === '최미스', '최미스: 아 시발. 점례야');
  const landed = await ev(() => { const g = window.game; const b = g.entities.find(x => x.id === 'choimis_bare'); return g.entities.filter(e => (e.id || '').startsWith('throw_') && e.visible !== false && Math.abs(e.x - b.x) < 80 && Math.abs(e.y - b.y) < 40).length; });
  check(landed >= 10, `던진 것들이 무대 최미스 쪽에 떨어져 있다 (${landed})`); await cap('15_after_riot');
  s = await advanceTo('꺼져 씨발새끼야'); check(!!s && s.speaker === '점례', '점례: 꺼져 씨발새끼야'); await next();
  // 9) 달려가 박치기 → 최미스 날아감 → 카메라 주인공들 → 넉 줄 → 오른쪽 길 → 다시 주인공들
  check(await until(() => { const b = window.game.entities.find(x => x.id === 'choimis_bare'); return b && ((b.flyX || 0) > 40 || b.dead); }, 6000), '박치기 → 최미스가 날아간다'); await cap('16_fling');
  check(await until(() => { const b = window.game.entities.find(x => x.id === 'choimis_bare'); return !b || b.dead; }, 6000), '최미스 사라짐');
  s = await advanceTo('ㅋㅋㅋ'); check(!!s && s.speaker === '억빠맨' && Math.abs(s.cam[0] + 240 - (s.px + 12)) < 48, `억빠맨: ㅋㅋㅋ (카메라 주인공들 ${s?.cam})`); await cap('17_party');
  s = await advanceTo('아이고 저런'); check(!!s && s.speaker === '경섭', '경섭: 아이고 저런');
  s = await advanceTo('오른쪽에 길이 있네'); check(!!s && s.speaker === '경섭', '경섭: 일단 뭐.. 가볼까? 오른쪽에 길이 있네.'); await next();
  check(await until(() => Math.round(window.game.camera.x) >= 730, 4000), '오른쪽 길을 비춘다'); await page.waitForTimeout(300); await cap('18_road');
  check(await until(() => !window.game.dialogue.running && window.game.flags.sakura7_scene_done, 10000), '연출 끝·플래그');
  await page.waitForTimeout(1000); s = await st();
  check(s.bgm === 'sakura' && Math.abs(s.cam[0] + 240 - (s.px + 12)) < 48 && (await bright(40, 700)) > dark * 2, `정상: 맵 브금 sakura·카메라 주인공·밝음 ${JSON.stringify([s.bgm, s.cam, s.px])}`); await cap('19_after');
  // 10) 재입장(연출 끝 QA): 배우 없음·관객은 그대로·밝음
  await page.goto('http://localhost:8000/?qa=jjajang_sakura7_after');
  check(await until(() => window.game?.mapId === 'jjajang_sakura7' && !window.game.transitioning, 30000), '연출 끝 QA');
  await page.waitForTimeout(600);
  const re = await ev(() => { const g = window.game; return { actors: ['jeomnye', 'choimis', 'choimis_bare', 'domijorim'].filter(id => g.entities.find(e => e.id === id)).length, crowd: g.entities.filter(e => (e.id || '').startsWith('crowd_')).length, bgm: g.sound.bgmName }; });
  check(re.actors === 0 && re.crowd === 14 && re.bgm === 'sakura' && (await bright(40, 700)) > 60, `다시 들어오면 배우 없음·관객 열넷·밝음 ${JSON.stringify(re)}`); await cap('20_reenter');
} catch (e) { fails += 1; console.log('FAIL exception', e.stack || e.message); }
if (errors.length) { fails += 1; console.log('FAIL console/page errors', errors.slice(0, 5).join(' | ')); }
console.log(`=== total fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
