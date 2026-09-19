// 드럼통 길(BUILD242): 드럼통 앞으로 걸어가면 청소부 이별 연출 — 6줄(껄껄 뒤 웃음) → 청소부가 동료에서 빠져 드럼통 아래 NPC 로 → 요플래가 바라보다 혼자 오른쪽 맵 밖으로(카메라는 청소부) → 청소부 2줄 → 페이드 → 찢칠라 길 1 왼쪽에 혼자.
//   그 뒤 왼쪽으로 가면 “지금은 그럴때가 아닌것같다.” + 한 발짝 오른쪽. 실행: tests/playtest/run.sh jjajang-drum
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'drum_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
const st = () => page.evaluate(() => { const g = window.game; const f = g.entities.filter(e => e.def?.type === 'follower' && !e.dead); const j = g.entities.find(e => e.id === 'janitor' && !e.dead); return { bgm: g.sound?.bgmName ?? null, map: g.mapId, px: Math.round(g.player.x), py: Math.round(g.player.y), facing: g.player.facing, party: [...g.party], followers: f.length, janitor: j ? { type: j.def?.type, x: Math.round(j.x), y: Math.round(j.y), facing: j.facing, visible: j.visible !== false } : null, cam: [Math.round(g.camera.x), Math.round(g.camera.y)], flags: { left: !!g.flags.janitor_left, done: !!g.flags.drum_talk_done }, pxW: g.map.pxW }; });
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 15000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `대사: ${text}`); if (!seen) throw new Error('missing line ' + text);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=jjajang_drum_center');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_drum' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  let s = await st(); check(s.followers === 1 && s.party.includes('janitor'), '드럼통 앞 QA: 청소부 동행 ' + JSON.stringify({ px: s.px, party: s.party }));
  const drum = await page.evaluate(() => { const d = window.game.entities.find(e => e.id === 'jjajang_drum'); return d ? { x: d.x, y: d.y, w: d.w, h: d.h } : null; });
  check(!!drum, '드럼통 소품이 있다 ' + JSON.stringify(drum));
  await page.keyboard.down('ArrowRight');
  const started = await until(() => window.game.dialogue.running && window.game.flags.drum_talk_started, 8000);
  await page.keyboard.up('ArrowRight');
  check(started, '드럼통 앞에서 연출 시작');
  const bgm0 = (await st()).bgm;
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.emote; }, 3000), '청소부 느낌표');
  await cap('00_exclaim');
  await line('저 드럼통은', '00b_drum_line');
  check(await until(() => !window.game.sound?.bgmName, 6000), `브금이 꺼진다 (${bgm0} → 없음)`);
  const drumX = drum.x + drum.w / 2;
  check(await until(() => Math.abs((window.game.camera.x + 240) - (window.game.entities.find(e => e.id === 'jjajang_drum').x + 12)) < 24, 6000), '카메라가 드럼통으로 옮겨 간다');
  const ahead = await until(() => { const g = window.game; const j = g.entities.find(e => e.id === 'janitor' && !e.dead); return j && j.x > g.player.x && Math.abs(j.x + 12 - (g.entities.find(e => e.id === 'jjajang_drum').x + 12)) < 80; }, 12000);
  check(ahead, '청소부가 앞장서 드럼통 앞으로 ' + JSON.stringify(await page.evaluate(() => { const g = window.game; const j = g.entities.find(e => e.id === 'janitor' && !e.dead); return { j: j && [Math.round(j.x), j.w], p: Math.round(g.player.x) }; })));
  check(await until(() => { const g = window.game; const j = g.entities.find(e => e.id === 'janitor' && !e.dead); return j && Math.abs(g.player.x - (j.x - 40)) < 6 && g.player.facing === 'up'; }, 12000), '요플래가 뒤따라 서서 함께 올려다본다');
  await cap('00c_approach');
  await line('검을 다루는법은 조금 익숙해졋는가', '01_first');
  await line('꼭 쓰러트려야만 하는');
  await line('나도 그랬다네');
  await line('그렇지만 그러지 못했다네');
  await line('뭐 껄껄 어쩔수없는거 아닌가');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000), '껄껄 뒤에 웃는다');
  await line('먼저 가보겠나 난 이걸 좀 보다 가야겠으니', '02_last_advice');
  check(await until(() => { const g = window.game; const j = g.entities.find(e => e.id === 'janitor' && !e.dead); return !g.party.includes('janitor') && j && j.def?.type === 'npc' && g.flags.janitor_left; }, 6000), '청소부가 동료에서 빠져 NPC 로 남는다(플래그)');
  check(await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && j.facing === 'up' && j.y + j.h > 256; }, 6000), '드럼통 아래에서 위를 본다');
  await page.waitForTimeout(600); s = await st(); await cap('03_look');
  check(s.facing === 'left' || s.facing === 'right', '요플래가 청소부 쪽을 본다 ' + s.facing);
  check(await until(() => window.game.player.x > window.game.map.pxW, 30000), '요플래가 혼자 맵 밖까지 걸어 나간다');
  s = await st(); check(s.janitor && s.cam[0] + 480 > s.janitor.x && s.cam[0] < s.janitor.x, '카메라는 청소부에 남는다 ' + JSON.stringify({ cam: s.cam, j: s.janitor }));
  await cap('04_alone');
  await line('전우들이여', '05_comrades');
  await line('미안하네');
  check(await until(() => window.game.mapId === 'jjajang_chin1' && !window.game.dialogue.running && window.game.flags.drum_talk_done, 15000), '페이드 뒤 찢칠라 길 1 에 혼자');
  await page.waitForTimeout(700); s = await st(); await cap('06_next_map');
  check(s.party.length === 0 && s.followers === 0 && s.px < 200 && s.flags.left, '요플래 혼자(파티 없음) 왼쪽 시작 ' + JSON.stringify({ px: s.px, party: s.party }));
  // 되돌아가기 금지
  const x0 = s.px;
  await page.keyboard.down('ArrowLeft');
  const blocked = await until(() => window.game.dialogue.running && window.game.textbox.node?.text?.includes('지금은 그럴때가 아닌것같다'), 6000);
  await page.keyboard.up('ArrowLeft');
  check(blocked, '왼쪽 끝에서 “지금은 그럴때가 아닌것같다.”');
  await line('지금은 그럴때가 아닌것같다', '07_no_return');
  check(await until(() => !window.game.dialogue.running, 6000), '나레이션 닫힘');
  await page.waitForTimeout(300); s = await st();
  check(s.px >= 32 && s.facing === 'right', `한 발짝 오른쪽으로 물러난다(x ${x0} → ${s.px})`);
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
