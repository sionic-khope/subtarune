// 소나무 숲 공터 아짐키야 조우(BUILD227): 가운데로 가면 브금이 꺼지고 ??? → ! → 청소부 → 넷 등장(클립 대사) → .. → 노래·맵 회전·춤 22초 → 전투(짜장 전투 브금).
//   전투: 요플래 공격 뒤 청소부 첫 차례에 대사 셋 → 메뉴, 청소부 공격은 1, 적 체력 8, 적 턴 말풍선에 클립. 실행: tests/playtest/run.sh jjajang-pines-center
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'center_' + n + '.png') }); };
const press = async key => { await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 40 }).then(() => true).catch(() => false);
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
  await page.goto('http://localhost:8000/?qa=jjajang_pines_center');
  await page.waitForFunction(() => window.game && window.game.mapId === 'jjajang_pines' && !window.game.dialogue.running, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const log = window.__qa = { sfx: [], bgm: [] }; const s = game.sound; const sfx = s.sfx.bind(s), play = s.playBgm.bind(s); s.sfx = (n, o) => { log.sfx.push(n); return sfx(n, o); }; s.playBgm = (n, o) => { log.bgm.push(n); return play(n, o); }; });
  await cap('00_thicket');
  await page.keyboard.down('ArrowRight');
  const fired = await until(() => window.game.dialogue.running && window.game.flags.pines_center_started, 12000);
  await page.keyboard.up('ArrowRight');
  check(fired, '공터 한가운데에 닿으면 연출이 시작된다');
  check(await until(() => !window.game.sound.bgmName, 3000), '브금이 꺼진다');
  await line('~~.. 디짐', '01_who');
  check(await until(() => window.game.player.emote?.kind === '!', 4000), '요플래 느낌표');
  await line('허허 이게 무슨소린가.');
  const hopped = await until(() => { const p = window.game.entities.find(e => e.id === 'ajimkiya1' && !e.dead); return p && p.visible !== false && (p.hopY || 0) > 8; }, 5000);
  check(hopped, '아짐키야가 풀숲에서 점프하며 나타난다'); await cap('01b_hop');
  check(await until(() => ['ajimkiya1', 'ajimkiya2', 'ajimkiya3'].every(id => window.game.entities.some(e => e.id === id && !e.dead && e.visible !== false)), 5000), '아짐키야 셋이 나온다');
  await line('가재맨 애미뒤짐', '02_ajimkiya');
  check(await page.evaluate(() => window.__qa.sfx.includes('ajimkiya_line')), '“가재맨 애미뒤짐” 클립이 대사와 함께 난다');
  await line('..');
  check(await until(() => window.game.sound.bgmName === 'ajimkiya_song' && window.game.entities.some(e => e.id === 'ajimkiya1' && e.spinRate > 0), 4000), '노래가 흐르고 아짐키야들이 돌기 시작한다');
  await page.waitForTimeout(2500); await cap('03_spinning');
  const spun = await page.evaluate(() => ({ angle: window.game.entities.find(e => e.id === 'ajimkiya2')?.spin || 0, world: !!window.game.worldSpin }));
  check(spun.angle > 3 && !spun.world, `아짐키야만 돌고 화면은 안 돈다 (spin ${spun.angle.toFixed(1)})`);
  check(await until(() => !!window.game.battle, 30000), '22초 뒤 전투로 들어간다');
  check(await until(() => window.game.battle && window.game.battle.state === 'menu', 20000), '전투 메뉴');
  const b0 = await page.evaluate(() => ({ bgm: game.sound.bgmName, enemies: game.battle.enemies.map(e => ({ id: e.id || e.def?.name, hp: e.hp, max: e.maxHp })), members: game.battle.members.map(m => m.id) }));
  check(b0.bgm === 'jjajang_battle' && b0.enemies.length === 3 && b0.enemies.every(e => e.max === 8) && b0.members[1] === 'janitor', '짜장 전투 브금, 아짐키야 셋 체력 8, 청소부 파티 ' + JSON.stringify(b0));
  await cap('04_battle');
  // 요플래: 공격하기 → 첫 적 선택 → 청소부 차례 대사
  await press('KeyC'); await until(() => window.game.battle.state === 'target', 3000); await press('KeyC');
  check(await until(() => window.game.battle.state === 'text' && window.game.battle.text.includes('공격을 하라고'), 4000), '청소부 첫 차례 대사 1');
  await page.waitForTimeout(400); await cap('05_janitor_line');
  for (const t of ['잘못한다네', '던져보겠네']) { await page.waitForTimeout(600); await press('KeyC'); check(await page.waitForFunction(x => window.game.battle.text.includes(x), t, { timeout: 4000, polling: 40 }).then(() => true).catch(() => false), '청소부 대사: ' + t); }
  await page.waitForTimeout(600);
  await press('KeyC');
  check(await until(() => window.game.battle.state === 'menu' && window.game.battle.memberIdx === 1, 4000), '대사 뒤 청소부 메뉴');
  await press('KeyC'); await until(() => window.game.battle.state === 'target', 3000); await press('KeyC');
  check(await until(() => window.game.battle.state === 'act', 4000), '행동 시작');
  const throwing = await until(() => { const b = window.game.battle; return b.gimmick && b.members[1].pose !== null && b.members[1].pose !== undefined && !b.members[1].action; }, 8000);
  check(throwing, '청소부는 달려가지 않고 제자리에서 던진다(throw 모드)');
  await page.waitForTimeout(150); await cap('05b_throw');
  const hpAfter = await until(() => { const b = window.game.battle; return b.enemies.some(e => e.hp < 8) && b.enemies.every(e => e.hp >= 8 - (window.game.attack || 1) - 1); }, 12000);
  const hp = await page.evaluate(() => game.battle.enemies.map(e => e.hp));
  check(hpAfter, '요플래 공격 + 청소부 지팡이 1 이 들어간다 ' + JSON.stringify(hp));
  check(await until(() => ['enemy-prep', 'bullets'].includes(window.game.battle.state), 15000), '적 턴');
  check(await until(() => window.__qa.sfx.filter(n => n === 'ajimkiya_line').length >= 2, 6000), '적 턴 말풍선에 클립이 난다');
  check(await until(() => window.game.battle.state === 'bullets' && window.game.battle.bullets.length > 3, 8000), '탄막이 나온다');
  await page.waitForTimeout(900); await cap('06_pattern');
  const pat = await page.evaluate(() => game.battle.patterns.map(p => p.enemy.def.patterns[(p.enemy.patternIdx - 1 + 3) % 3].type));
  check(pat.length === 1, '말풍선을 띄운 한 명만 패턴을 낸다(일반몹 난이도) ' + JSON.stringify(pat));
  check(errors.length === 0, 'page errors ' + JSON.stringify(errors.slice(0, 3)));
} catch (e) { fails += 1; console.log('FAIL exception', e.message); }
console.log('fails=' + fails); await browser.close(); process.exit(fails ? 1 : 0);
