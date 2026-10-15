// 보라꽃(BUILD462): 청록숲4 검은 꽃에 말을 다섯 번 걸면 억빠맨이 “아 시발년 걍 제가 뽑을게요” 하고 다가가 뽑는다 → 보라꽃(HP -100) 획득, 꽃 소품은 사라지고 다시 와도 없다.
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'purple-flower' }, async ({ page, check, until, press, shot, open }) => {
  await open({ qa: 'teal4' });
  await until(() => window.game?.mapId === 'teal_east' && game.state === 'field' && !game.dialogue.running && game.fade.alpha === 0, 20000);
  const place = () => page.evaluate(() => {
    const f = game.entities.find(e => e.id === 'black_flower');
    game.player.x = f.x + f.w + 2; game.player.y = f.y + f.h / 2 - game.player.h / 2; game.player.facing = 'left';
    game.spawnParty?.();
  });
  const talk = async () => {
    await press('KeyC');
    await until(() => game.dialogue.running, 3000);
    const lines = [];
    for (let i = 0; i < 40 && await page.evaluate(() => game.dialogue.running); i++) {
      const s = await page.evaluate(() => ({ speaker: game.textbox.node?.speaker || '', text: game.textbox.node?.text || '', pulled: !game.entities.some(e => e.id === 'black_flower'), pp: (() => { const p = game.entities.find(e => e.id === 'ppaman'); return p && [Math.round(p.x), Math.round(p.y), p.facing]; })() }));
      if (s.text && lines.at(-1)?.text !== s.text) lines.push(s);
      if (s.text.includes('제가 뽑을게요')) await shot('flower_02_ppaman_line');
      await page.waitForTimeout(350); await press('KeyC'); await page.waitForTimeout(100);
    }
    return lines;
  };
  for (let n = 1; n <= 4; n++) {
    await place(); await page.waitForTimeout(150);
    const lines = await talk();
    const talks = await page.evaluate(() => game.flags.flower_talks);
    check(`${n}번째: 꽃은 그대로, 센 횟수 ${n}`, talks === n && await page.evaluate(() => game.entities.some(e => e.id === 'black_flower')) && !lines.some(l => l.text.includes('뽑을게요')), JSON.stringify({ talks, lines: lines.map(l => l.text) }));
    if (n === 1) await shot('flower_01_first');
  }
  await place(); await page.waitForTimeout(150);
  const before = await page.evaluate(() => { const f = game.entities.find(e => e.id === 'black_flower'); return { fx: f.x, fy: f.y }; });
  const lines = await talk();
  const pullLine = lines.find(l => l.text.includes('제가 뽑을게요'));
  check('5번째: 억빠맨 원문 대사', pullLine?.speaker === '억빠맨' && pullLine.text === '* 아 시발년 걍 제가 뽑을게요', JSON.stringify(pullLine));
  const got = lines.find(l => l.text.includes('보라꽃'));
  check('억빠맨이 꽃 바로 아래에서 꽃을 보고 뽑은 뒤 보라꽃 획득 문구', got && got.pulled && got.pp && Math.abs(got.pp[0] - before.fx) < 40 && got.pp[1] > before.fy && got.pp[1] - before.fy < 40 && got.pp[2] === 'up', JSON.stringify({ got, before }));
  await shot('flower_03_got');
  const state = await page.evaluate(() => ({ inv: game.inventory.filter(i => i === '보라꽃').length, flag: !!game.flags.purple_flower_taken, flower: game.entities.some(e => e.id === 'black_flower') }));
  check('보라꽃 1개·플래그·꽃 소품 없음', state.inv === 1 && state.flag && !state.flower, JSON.stringify(state));
  await page.evaluate(() => game.changeMap('teal_east', 'from_left'));
  const again = await until(() => game.mapId === 'teal_east' && game.state === 'field' && !game.transitioning ? { flower: game.entities.some(e => e.id === 'black_flower') } : null, 8000);
  check('다시 와도 꽃은 없다', again && !again.flower, JSON.stringify(again));
});
