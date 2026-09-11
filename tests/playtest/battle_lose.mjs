// 전투 쓰러짐·부활·게임 오버 (사용자 2026-09-11): 한 명이 쓰러지면 누워서 행동 불능 → 라운드마다 회복 반짝임 → 3번째 라운드에 반피로 부활.
//   게임 오버는 셋 다 쓰러졌을 때만 → 전장이 어두워지고 GAME OVER + [다시 도전하기] → C → 검은 화면·징글 → 같은 전투 처음부터(HP·적 복구, 브금 다시).
//   스크린샷: lose_01_down(누운 동료) / lose_02_revive(부활 문구) / lose_03_gameover(버튼). (battle.mjs 가 시작할 때 battle_* 를 지우므로 접두사를 달리 한다)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
process.on('uncaughtException', (e) => { try { console.log(logs.join('\n')); } catch {} console.log('CRASH', e.stack || e.message); process.exit(2); });
const S = process.env.SHOT_DIR || new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(S, { recursive: true });
for (const f of fs.readdirSync(S)) if (f.startsWith('lose_')) fs.unlinkSync(`${S}/${f}`);
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const logs = []; let fails = 0; const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const check = (name, ok, extra = '') => { logs.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) fails++; };
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await page.evaluate(fn); if (v) return v; await page.waitForTimeout(80); } return null; };
const bt = () => page.evaluate(() => { const b = game.battle; return b && { state: b.state, text: b.text, fx: b.fx.length, bgm: game.sound.bgmName, memberIdx: b.memberIdx, members: b.members.map((m) => ({ id: m.id, hp: m.hp, max: m.maxHp, down: m.down, turns: m.downTurns, popup: m.popup?.text || null })), enemies: b.enemies.map((e) => ({ id: e.id, hp: e.hp, max: e.maxHp, dead: e.dead })) }; });

await page.goto('http://localhost:8000/index.html?qa=teal6');
await until(() => !!(window.game && game.entities && game.player), 15000); await page.keyboard.press('KeyX'); await page.waitForTimeout(300);
await page.evaluate(() => { const e = game.entities.find((k) => k.def.type === 'enemy'); game.startEncounter(e); });
let b = await until(() => { const b = game.battle; return b && b.state === 'intro' ? true : null; }, 15000);
check('encounter → battle intro (party of 3)', !!b && (await bt()).members.length === 3, JSON.stringify((await bt())?.members));
await page.evaluate(() => { const b = game.battle; b.shown = b.text.length; }); await page.waitForTimeout(700); await page.keyboard.press('KeyC');
b = await until(() => game.battle?.state === 'menu' ? true : null, 5000); check('intro → menu', !!b, '');

// ── 한 명 쓰러짐: rnd 를 고정해 hurtParty 가 마지막 멤버(빠맨)를 고르게 한다
await page.evaluate(() => { const b = game.battle; b.rnd = () => 0.99; b.hurtParty(999); b.rnd = Math.random; });
b = await bt();
const downed = b.members.filter((m) => m.down);
check('one member down (hp 0, lying), the other two alive, game NOT over', b.state === 'menu' && downed.length === 1 && downed[0].hp === 0 && b.members.filter((m) => !m.down).length === 2, JSON.stringify(b.members));
await page.waitForTimeout(300); await page.screenshot({ path: `${S}/lose_01_down.png` });
const downImg = await page.evaluate(() => game.battle.members.map((m) => ({ id: m.id, w: m.downImg?.naturalWidth || 0, h: m.downImg?.naturalHeight || 0 })));
check('downed member uses the PR #17 fallen sprite (assets/battle/down/<id>.png 96×96 loaded for every member)', downImg.every((d) => d.w === 96 && d.h === 96), JSON.stringify(downImg));
// 메뉴가 쓰러진 멤버를 건너뛰는지: 멤버 순서대로 [공격하기] 를 고르면 산 둘만 계획에 들어간다
await page.evaluate(() => { const b = game.battle; b.beginMenu(); });
b = await bt(); check('menu starts on a standing member', !b.members[b.memberIdx].down, `memberIdx=${b.memberIdx}`);

// ── 라운드마다 회복 이펙트, 3번째에 반피 부활
await page.evaluate(() => game.battle.afterEnemyPhase()); let r1 = await bt();
check('round 1 after down: still lying, recovery sparkles spawned', r1.members.some((m) => m.down && m.turns === 1) && r1.fx > 0, JSON.stringify({ fx: r1.fx, m: r1.members }));
await page.waitForTimeout(1300);
await page.evaluate(() => game.battle.afterEnemyPhase()); let r2 = await bt();
check('round 2: still lying (turns 2)', r2.members.some((m) => m.down && m.turns === 2), JSON.stringify(r2.members));
await page.waitForTimeout(1300);
await page.evaluate(() => game.battle.afterEnemyPhase()); let r3 = await bt();
const up = r3.members.find((m) => m.id === downed[0].id);
check('round 3: revived at half HP with +popup and the "다시 일어났다" line', up && !up.down && up.hp === Math.ceil(up.max / 2) && up.popup === '+' + up.hp && r3.text.includes('다시 일어났다'), JSON.stringify({ up, text: r3.text }));
await page.waitForTimeout(250); await page.screenshot({ path: `${S}/lose_02_revive.png` });

// ── 전원 쓰러짐 → 게임 오버 화면 → [다시 도전하기]
const bgmBefore = await page.evaluate(() => game.sound.bgmName);
await page.evaluate(() => { const b = game.battle; for (let i = 0; i < 9; i++) b.hurtParty(999); });
b = await bt();
check('all three down → lose state (BGM stopping)', b.state === 'lose' && b.members.every((m) => m.down && m.hp === 0), JSON.stringify({ state: b.state, m: b.members }));
await page.waitForTimeout(2300); await page.screenshot({ path: `${S}/lose_03_gameover.png` });
const bgmDuringLose = await page.evaluate(() => game.sound.bgmName);
check('battle BGM stopped on game over', bgmBefore === 'rude_buster' && bgmDuringLose === null, JSON.stringify({ bgmBefore, bgmDuringLose }));
await page.keyboard.press('KeyC');
b = await until(() => game.battle?.state === 'retry' ? true : null, 2000); check('C on [다시 도전하기] → retry (black screen + jingle)', !!b, '');
b = await until(() => game.battle?.state === 'intro' ? true : null, 5000); const r = await bt();
check('retry → intro: party HP full & standing, enemies restored', !!r && r.state === 'intro' && r.members.every((m) => !m.down && m.hp === m.max && m.turns === 0) && r.enemies.every((e) => !e.dead && e.hp === e.max), JSON.stringify(r));
const bgmBack = await until(() => game.sound.bgmName === 'rude_buster' ? true : null, 3000);
check('battle BGM plays again after retry', !!bgmBack, String(await page.evaluate(() => game.sound.bgmName)));
check('no page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
console.log(logs.join('\n')); console.log(`fails=${fails}`);
await browser.close(); process.exit(fails ? 1 : 0);
