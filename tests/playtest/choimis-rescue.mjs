import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'choimis-rescue', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const evidence = { source: [], captures: [], limitations: 'The registered postvictory QA checkpoint prepares story flags. All subsequent dialogue uses physical C input and real-time scene updates. No beat/time/return flag injection. This tests rescue continuation and return, not natural boss victory or subjective audio listening.' };
  const save = () => fs.writeFileSync(path.join(process.env.SHOT_DIR, 'rescue-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  const sources = ['src/scenes/choimis-rescue.js', 'src/scenes/choimis-rescue-render.js', 'src/data/cutscenes/choimis_rescue.js', 'src/core/story.js', 'src/main.js', 'src/data/scripts.js', 'src/ui/cutscene.js', 'assets/props/naem-jet.png', 'assets/sprites/yongjun.png', 'assets/sprites/choimis.png'];
  for (const relative of sources) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const local = hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = hash(await response.body());
    evidence.source.push({ relative, local, served }); check(`source matches ${relative}`, response.ok() && local === served);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: 'choimis_rescue' });
  check('registered rescue checkpoint loads exact continuation', await until(() => window.game?.choimisRescue && game.textbox?.isOpen, 30000));
  await fixture('rescue-observation-only', 'Wrap full Game.draw after render to latch phase images and read geometry/text/music; no game progression or stats are changed.', () => {
    const q = window.__rescueQa = { frames: {}, beats: [], samples: [], lines: [], canvas: [game.canvas.width, game.canvas.height] };
    const draw = game.draw.bind(game);
    game.draw = (...args) => {
      const result = draw(...args), scene = game.choimisRescue;
      if (!scene) return result;
      const s = scene.snapshot(), now = performance.now(), text = game.textbox.node?.text;
      if (q.beats.at(-1)?.beat !== s.beat) q.beats.push({ beat: s.beat, at: now });
      if (text && q.lines.at(-1)?.text !== text) q.lines.push({ text, speaker: game.textbox.node.speaker, beat: s.beat });
      if (!q.samples.length || now - q.samples.at(-1).at >= 100) q.samples.push({ ...s, at: now, dots: scene.bubble.shown, bubbleDone: scene.bubble.done, bgm: game.sound.bgmName, musicTime: game.sound.bgm?.currentTime });
      const capture = label => { if (!q.frames[label]) q.frames[label] = { beat: s.beat, elapsed: s.elapsed, at: now, data: game.canvas.toDataURL('image/png') }; };
      if (text && game.textbox.state === 'waiting') capture(`dialogue-${q.lines.length}-page-${game.textbox.page}`);
      if (s.elapsed > 0.35) capture(s.beat);
      if (s.beat.startsWith('dots_') && scene.bubble.shown === 3 && !scene.bubble.done) capture(`${s.beat}-three`);
      if (s.beat === 'petals_fade' && s.elapsed > 1.2) capture('petals-half');
      if (s.beat === 'catch' && s.catchCount > 0) capture(`catch-${s.catchCount}`);
      if (s.beat === 'jet_reveal' && s.elapsed > 2) capture('jet-full');
      if (s.beat === 'save_choimis' && s.choimisCaught) capture('choimis-caught');
      return result;
    };
  });
  const began = Date.now();
  while (Date.now() - began < 100000) {
    const state = await page.evaluate(() => ({ done: !game.choimisRescue && !game.dialogue.running && !game.transitioning, textbox: game.textbox.isOpen }));
    if (state.done) break;
    if (state.textbox) await press('KeyC', { delay: 65 });
    await page.waitForTimeout(250);
  }
  const q = await page.evaluate(() => window.__rescueQa);
  evidence.observed = { ...q, frames: undefined };
  for (const [label, frame] of Object.entries(q.frames)) {
    const file = path.join(process.env.SHOT_DIR, `${label}.png`);
    fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64')); evidence.captures.push({ label, file, ...frame, data: undefined });
  }
  const expectedBeats = ['relief', 'petals_fade', 'dots_ppaman', 'dots_gyeongsub', 'dots_hyungsub', 'party_fall', 'ocean_fall', 'catch', 'jet_reveal', 'spot_choimis', 'save_choimis', 'flyaway'];
  check('all twelve rescue beats occur in exact order', JSON.stringify(q.beats.map(b => b.beat)) === JSON.stringify(expectedBeats), JSON.stringify(q.beats));
  const expectedLines = ['휴 드디어 잡았네요', 'ㅋㅋ 그니까 근데 여기 진짜 높다.', '잠깐 근데 이거 하늘을 날수있는 이유가..', '최미스 힘때문이라면 지금은...', '으아아아아악!!', '오 형들 하이요 ㅋㅋ', '머야 씨바', '저희가 만든 무기에요 이름하여 냄트기', '...', '저희 진짜 노력 많이했습니다.', '가재맨이 불쌍해질정도로 강한 무기들이 많아요', '오 ㅋㅋ', '일단 영클형이 형들 데려오라고 해서 엄청대박인배로 가시죠', 'ㅋㅋㅋ', '어 근데 저기 핑크색 어떤새끼가 떨어지고있는데 어떡하죠', '버려 씨바', '빠맨아.', '...네', '네 일단 쟤까지 챙겨갈게요'];
  check('exact nineteen requested party and flight lines appear', JSON.stringify(q.lines.map(l => l.text)) === JSON.stringify(expectedLines.map(text => `* ${text}`)), JSON.stringify(q.lines));
  check('all nineteen dialogue lines have fully revealed rendered captures', expectedLines.every((_, i) => Object.keys(q.frames).some(label => label.startsWith(`dialogue-${i + 1}-page-`))));
  check('petal platforms visibly fade over time', q.samples.some(s => s.beat === 'petals_fade' && s.petals > 0.8) && q.samples.some(s => s.beat === 'petals_fade' && s.petals < 0.15));
  check('each party bubble reaches exactly three visible dots', ['ppaman', 'gyeongsub', 'hyungsub'].every(id => q.samples.some(s => s.beat === `dots_${id}` && s.dots === 3 && !s.bubbleDone) && q.frames[`dots_${id}-three`]));
  check('distant fall leads to three separate catches', [1, 2, 3].every(count => q.samples.some(s => s.beat === 'catch' && s.catchCount === count)));
  check('generated jet asset loads and lancer BGM advances in reveal', q.samples.some(s => s.beat === 'jet_reveal' && s.assetsReady && s.bgm === 'vs_lancer' && s.musicTime > 0.2));
  check('Choimis is rescued before flyaway', q.samples.some(s => s.beat === 'save_choimis' && s.choimisCaught));
  check('full draw captures every visible rescue beat', expectedBeats.every(beat => q.frames[beat]) && q.canvas[0] === 960 && q.canvas[1] === 720, JSON.stringify(Object.keys(q.frames)));
  const end = await page.evaluate(() => ({ map: game.mapId, running: game.dialogue.running, transition: game.transitioning, rescue: !!game.choimisRescue, assets: !!game.choimisRescueAssets, flags: game.flags, bgm: game.sound.bgmName, party: game.party, player: { x: game.player.x, y: game.player.y }, entities: game.entities.map(e => ({ id: e.id, x: e.x, y: e.y })) }));
  evidence.end = end; save();
  check('rescue returns control to lounge with stage and cleanup', end.map === 'ship_lounge' && !end.running && !end.transition && !end.rescue && !end.assets && end.flags.choimis_rescued && end.bgm === 'ship_lounge', JSON.stringify(end));
  await shot('lounge-return');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(350); await page.keyboard.up('ArrowDown');
  check('real movement resumes after rescue', await page.evaluate(y => Math.abs(game.player.y - y) > 3, end.player.y));
  evidence.sourceAfter = sources.map(relative => ({ relative, local: createHash('sha256').update(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))).digest('hex') }));
  check('rescue sources stable throughout execution', evidence.sourceAfter.every(after => evidence.source.find(before => before.relative === after.relative).local === after.local));
  save();
});
