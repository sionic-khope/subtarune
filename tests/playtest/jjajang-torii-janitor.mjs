// 청소부(허약) 합류 이벤트(BUILD226): 두 번째 토리이를 지나면 브금이 꺼지고, 1초 뒤 발소리·물음표, 실루엣이 발소리를 내며 뒤까지 오고, 나레이션 3줄 → ! → 뒤돌아봄 → 페이드 사이에 청소부로 → 브금 wise_words → 대사 → 합류.
//   실행: tests/playtest/run.sh jjajang-torii-janitor
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'janitor_' + n + '.png') }); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false);
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const ent = id => page.evaluate(i => { const e = i === 'player' ? window.game.player : window.game.entities.find(x => x.id === i && !x.dead); return e ? { x: Math.round(e.x), y: Math.round(e.y), facing: e.facing, hidden: !!e.hidden } : null; }, id);
// 대사 한 줄: 텍스트가 보일 때까지 기다린 뒤(타이핑 중이면 C 로 완성) C 로 넘긴다
const line = async (text, capture) => {
  const seen = await page.waitForFunction(t => window.game.textbox.node?.text?.includes(t), text, { timeout: 15000, polling: 60 }).then(() => true).catch(() => false);
  check(seen, `대사: ${text}`); if (!seen) throw new Error('missing line ' + text);
  const typing = await page.evaluate(() => window.game.textbox.state === 'typing');
  if (typing) { await press('KeyC'); await until(() => window.game.textbox.state === 'waiting', 3000); }
  if (capture) await cap(capture);
  const before = await page.evaluate(() => window.game.textbox.node?.text);
  await press('KeyC');
  await page.waitForFunction(p => !window.game.dialogue.running || window.game.textbox.node?.text !== p, before, { timeout: 4000, polling: 40 }).catch(() => {});
};
try {
  await page.goto('http://localhost:8000/?qa=jjajang_torii_event');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_torii' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const start = await page.evaluate(() => ({ bgm: game.sound.bgmName, party: [...game.party], walkStarts: game.sound.walkStarts || 0, flag: !!game.flags.torii_janitor_started }));
  check(start.bgm === 'wind' && start.party.length === 0 && !start.flag, 'QA 지점: 요플래 단독, 브금 wind, 이벤트 전 ' + JSON.stringify(start));
  await page.keyboard.down('ArrowRight');
  const fired = await until(() => window.game.dialogue.running && window.game.flags.torii_janitor_started, 10000);
  await page.keyboard.up('ArrowRight');
  check(fired, '두 번째 토리이를 지나면 걷는 것만으로 이벤트가 시작된다');
  check(await until(() => !window.game.sound.bgmName || window.game.sound.bgmName !== 'wind', 3000), '브금이 꺼진다');
  await cap('01_stop');
  // 멈춘 뒤 1초: 주인공은 서 있는데 이 구역 걸음 루프가 켜진다(뒤에서 들리는 걸음소리)
  const heard = await until(() => window.game.dialogue.running && window.game.footstepsOverride && window.game.sound.walkState && !window.game.sound.walkState.stopping, 3500);
  check(heard, '서 있는 동안 뒤에서 걸음소리 루프가 켜진다');
  const q = await until(() => window.game.player.emote?.kind === '?', 6000);
  check(q, '요플래 머리 위에 물음표'); await page.waitForTimeout(150); await cap('02_question');
  check(await until(() => window.game.entities.some(e => e.id === 'janitor_shadow' && !e.dead), 6000), '검은 실루엣이 나타난다');
  const shadowStart = await ent('janitor_shadow');
  check(await until(() => { const s = window.game.entities.find(e => e.id === 'janitor_shadow' && !e.dead); return s && s.moving && window.game.footstepsOverride && window.game.sound.walkState && !window.game.sound.walkState.stopping; }, 3000), '실루엣이 걸어오는 동안 발소리 루프가 켜져 있다');
  check(await until(() => { const s = window.game.entities.find(e => e.id === 'janitor_shadow' && !e.dead); return s && s.x >= window.game.player.x - 46; }, 9000), '실루엣이 요플래 뒤까지 걸어온다');
  await page.waitForTimeout(120); await cap('03_shadow_behind');
  const shadowEnd = await ent('janitor_shadow'), playerNow = await ent('player');
  check(shadowStart && shadowEnd && shadowStart.x < shadowEnd.x && shadowEnd.x < playerNow.x && Math.abs(shadowEnd.y - playerNow.y) < 8, '실루엣은 왼쪽(뒤)에서 와서 요플래 바로 뒤에 선다 ' + JSON.stringify({ shadowStart, shadowEnd, playerNow }));
  await line('거기 너', '04_line1');
  await line('지금 뭐하는 짓 인가');
  await line('당장 나를..');
  check(await until(() => window.game.player.emote?.kind === '!', 4000), '요플래 느낌표');
  check(await until(() => window.game.player.facing === 'left', 4000), '요플래가 뒤를 돌아본다');
  check(await until(() => window.game.entities.some(e => e.id === 'janitor' && !e.dead && e.def?.type === 'npc') && !window.game.entities.some(e => e.id === 'janitor_shadow' && !e.dead), 8000), '페이드 사이에 실루엣이 청소부로 바뀐다');
  await page.waitForTimeout(900); await cap('05_janitor_revealed');
  const janitor = await ent('janitor');
  check(janitor && janitor.facing === 'right' && Math.abs(janitor.x - shadowEnd.x) < 4, '청소부는 실루엣 자리에 오른쪽(요플래 쪽)을 보고 선다 ' + JSON.stringify(janitor));
  check(await until(() => window.game.sound.bgmName === 'wise_words', 4000), '브금이 wise_words 로 바뀐다');
  await line('어이', '06_hello');
  for (const t of ['젊은이 안녕한가', '아 아빠..?', '잘안들린다네', '라이부? 유투브?', '아무 기억도 안난단', '어이구 힘들구먼', '...', '젊은이 반갑네', '나는 인사했다.', '익숙한 얼굴인데']) await line(t);
  await line('닮은거 같구려');
  // 껄껄 뒤 호탕한 웃음: 얼굴 든 웃음 모션 + 거슨 웃음 원음
  const laughed = await until(() => { const j = window.game.entities.find(e => e.id === 'janitor' && !e.dead); return j && !!j.motion; }, 3000);
  await page.waitForTimeout(260); await cap('06b_laugh');
  const laughSfx = await page.evaluate(() => (window.__shipQA?.sfx || []).length);
  check(laughed, '껄껄 뒤에 청소부가 얼굴을 들고 웃는다(모션)');
  for (const t of ['어떻게 오게됐당가', '나도 모르니까', '데려다 줄 수 있는가', '저기~까지 저기~']) await line(t);
  await line('청소부가 동료가 되었다', '07_join_line');
  check(await until(() => window.game.party.includes('janitor') && window.game.flags.torii_janitor_joined && !window.game.dialogue.running, 8000), '청소부가 동료가 되고 플래그가 선다');
  const after = await page.evaluate(() => ({ party: [...game.party], npc: game.entities.some(e => e.id === 'janitor' && !e.dead && e.def?.type === 'npc'), follower: game.entities.some(e => e.def?.type === 'follower' && !e.dead), bgm: game.sound.bgmName, hp: game.partyHp?.janitor }));
  check(after.party.length === 1 && !after.npc && after.follower && after.bgm === 'wise_words', '맵의 청소부 NPC 는 사라지고 동료가 따라온다, 토리이 길에선 wise_words 유지 ' + JSON.stringify(after));
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1400); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(300);
  await cap('08_following');
  await press('KeyV'); await page.waitForTimeout(500); await cap('09_menu'); await press('KeyX');
  // 인게임 전투: 허약 청소부 시트(assets/battle/janitor*.png)로 파티에 선다
  await page.evaluate(() => { window.game.startBattle({ enemies: ['seopnyang'], bgm: 'rude_buster' }); });
  const loaded = await until(() => window.game.battle && window.game.battle.members.length === 2 && window.game.battle.members.every(m => m.frames && m.frames.idle && m.downImg), 15000);
  const battle = await page.evaluate(() => { const b = window.game.battle; return { members: b.members.map(m => ({ id: m.id, name: m.name, hp: m.hp, max: m.maxHp, idle: m.frames?.idle?.length, run: m.frames?.run?.length, attack: m.frames?.attack?.length, down: !!m.downImg })), state: b.state }; });
  check(loaded && battle.members[1].id === 'janitor' && battle.members[1].idle === 4 && battle.members[1].run === 4 && battle.members[1].attack === 4 && battle.members[1].down, '전투에 허약 청소부가 파티원으로 선다(대기·달리기·공격 4프레임, 쓰러짐 그림) ' + JSON.stringify(battle));
  await page.waitForTimeout(1500); await cap('10_battle_party');
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
