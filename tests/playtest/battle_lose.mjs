// 전투 쓰러짐·부활·게임 오버 (사용자 2026-09-11): 한 명이 쓰러지면 누워서 행동 불능 → 라운드마다 회복 반짝임 → 3번째 라운드에 반피로 부활.
//   게임 오버는 셋 다 쓰러졌을 때만 → 전장이 어두워지고 GAME OVER + [다시 도전하기] → C → 검은 화면·징글 → 같은 전투 처음부터(HP·적 복구, 브금 다시).
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'battle_lose' }, async ({ page, check, until, open, press, shot, fixture }) => {
const bt = () => page.evaluate(() => { const b = game.battle; return b && { state: b.state, text: b.text, fx: b.fx.length, bgm: game.sound.bgmName, memberIdx: b.memberIdx, members: b.members.map((m) => ({ id: m.id, hp: m.hp, max: m.maxHp, down: m.down, turns: m.downTurns, popup: m.popup?.text || null })), enemies: b.enemies.map((e) => ({ id: e.id, hp: e.hp, max: e.maxHp, dead: e.dead })) }; });

await open({ qa: 'teal6' });
await until(() => !!(window.game && game.entities && game.player), 15000); await press('KeyX'); await page.waitForTimeout(300);
await fixture('start-encounter', 'Start the first enemy encounter directly instead of walking into it.', () => { const e = game.entities.find((k) => k.def.type === 'enemy'); game.startEncounter(e); });
let b = await until(() => { const b = game.battle; return b && b.state === 'intro' ? true : null; }, 15000);
check('encounter → battle intro (party of 3)', !!b && (await bt()).members.length === 3, JSON.stringify((await bt())?.members));
await fixture('complete-intro-text', 'Reveal the battle intro text immediately before the real C input.', () => { const b = game.battle; b.shown = b.text.length; }); await page.waitForTimeout(700); await press('KeyC');
b = await until(() => game.battle?.state === 'menu' ? true : null, 5000); check('intro → menu', !!b, '');

// ── 한 명 쓰러짐: rnd 를 고정해 hurtParty 가 마지막 멤버(빠맨)를 고르게 한다
await fixture('down-last-member', 'Force target selection and deal 999 damage to knock down the last member.', () => { const b = game.battle; const rnd = b.rnd; try { b.rnd = () => 0.99; b.hurtParty(999); } finally { b.rnd = rnd; } });
b = await bt();
const downed = b.members.filter((m) => m.down);
check('one member down (hp 0, lying), the other two alive, game NOT over', b.state === 'menu' && downed.length === 1 && downed[0].hp === 0 && b.members.filter((m) => !m.down).length === 2, JSON.stringify(b.members));
await page.waitForTimeout(300); await shot('lose_01_down');
const downImg = await page.evaluate(() => game.battle.members.map((m) => ({ id: m.id, w: m.downImg?.naturalWidth || 0, h: m.downImg?.naturalHeight || 0 })));
check('downed member uses the PR #17 fallen sprite (assets/battle/down/<id>.png 96×96 loaded for every member)', downImg.every((d) => d.w === 96 && d.h === 96), JSON.stringify(downImg));
// 메뉴가 쓰러진 멤버를 건너뛰는지: 멤버 순서대로 [공격하기] 를 고르면 산 둘만 계획에 들어간다
await fixture('restart-menu', 'Call beginMenu directly to inspect standing-member selection.', () => { const b = game.battle; b.beginMenu(); });
b = await bt(); check('menu starts on a standing member', !b.members[b.memberIdx].down, `memberIdx=${b.memberIdx}`);

// ── 라운드마다 회복 이펙트, 3번째에 반피 부활
await fixture('advance-round-1', 'Call afterEnemyPhase directly without playing the enemy attack.', () => game.battle.afterEnemyPhase()); let r1 = await bt();
check('round 1 after down: still lying, recovery sparkles spawned', r1.members.some((m) => m.down && m.turns === 1) && r1.fx > 0, JSON.stringify({ fx: r1.fx, m: r1.members }));
await page.waitForTimeout(1300);
await fixture('advance-round-2', 'Call afterEnemyPhase directly without playing the enemy attack.', () => game.battle.afterEnemyPhase()); let r2 = await bt();
check('round 2: still lying (turns 2)', r2.members.some((m) => m.down && m.turns === 2), JSON.stringify(r2.members));
await page.waitForTimeout(1300);
await fixture('advance-round-3', 'Call afterEnemyPhase directly without playing the enemy attack.', () => game.battle.afterEnemyPhase()); let r3 = await bt();
const up = r3.members.find((m) => m.id === downed[0].id);
check('round 3: revived at half HP with +popup and the "다시 일어났다" line', up && !up.down && up.hp === Math.ceil(up.max / 2) && up.popup === '+' + up.hp && r3.text.includes('다시 일어났다'), JSON.stringify({ up, text: r3.text }));
await page.waitForTimeout(250); await shot('lose_02_revive');

// ── 전원 쓰러짐 → 게임 오버 화면 → [다시 도전하기]
const bgmBefore = await page.evaluate(() => game.sound.bgmName);
await fixture('down-entire-party', 'Force repeated 999-damage hits to enter game over; this does not prove natural combat difficulty.', () => { const b = game.battle; for (let i = 0; i < 9; i++) b.hurtParty(999); });
b = await bt();
check('all three down → lose state (BGM stopping)', b.state === 'lose' && b.members.every((m) => m.down && m.hp === 0), JSON.stringify({ state: b.state, m: b.members }));
await page.waitForTimeout(2300); await shot('lose_03_gameover');
const bgmDuringLose = await page.evaluate(() => game.sound.bgmName);
check('battle BGM stopped on game over', bgmBefore === 'rude_buster' && bgmDuringLose === null, JSON.stringify({ bgmBefore, bgmDuringLose }));
await press('KeyC');
b = await until(() => game.battle?.state === 'retry' ? true : null, 2000); check('C on [다시 도전하기] → retry (black screen + jingle)', !!b, '');
b = await until(() => game.battle?.state === 'intro' ? true : null, 5000); const r = await bt();
check('retry → intro: party HP full & standing, enemies restored', !!r && r.state === 'intro' && r.members.every((m) => !m.down && m.hp === m.max && m.turns === 0) && r.enemies.every((e) => !e.dead && e.hp === e.max), JSON.stringify(r));
const bgmBack = await until(() => game.sound.bgmName === 'rude_buster' ? true : null, 3000);
check('battle BGM plays again after retry', !!bgmBack, String(await page.evaluate(() => game.sound.bgmName)));
});
