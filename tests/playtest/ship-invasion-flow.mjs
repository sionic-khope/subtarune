import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

await runScenario({ name: 'ship-invasion-flow', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const root = process.env.QA_SOURCE_ROOT;
  if (!root) throw new Error('QA_SOURCE_ROOT must explicitly identify the served checkout');
  const evidence = { disclosure: 'Registered pre-invasion checkpoint; only player interaction approach is positioned. All dialogue/choices/movement/timers/fades use real keyboard and production updates. Draw/audio wrappers observe only. Save and continue use public game methods on the naturally completed state. Audio activity is not human listening.', sources: [], captures: [] };
  const save = () => fs.writeFileSync(path.join(process.env.SHOT_DIR, 'flow-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  const sources = ['src/data/cutscenes/ship_invasion.js', 'src/data/cutscenes/ship_lounge.js', 'src/data/cutscenes/ship_lounge_briefing.js', 'src/scenes/ship-deck-poses.js', 'src/scenes/ship-invasion.js', 'src/scenes/ship-invasion-render.js', 'src/data/ship-invasion.js', 'src/data/character-motions.js', 'src/data/scripts.js', 'src/data/map-runtime-assets.js', 'src/core/story.js', 'src/main.js', 'src/ui/cutscene.js', 'src/ui/dialogue.js', 'assets/maps/ship_lounge.json', 'assets/maps/ship_night_deck.json', 'assets/maps/gajaeman_castle_entry.json', 'assets/props/gajaeman_castle.png', 'assets/props/youngcle-warship.png', 'assets/props/maillard-ship.png', 'assets/sprites/youngcle_hover.png', 'assets/audio/bgm/ship_invasion.mp3', 'assets/audio/sfx/photo_shutter.mp3', 'assets/audio/sfx/soul_grab.mp3'];
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  sources.push(...['hyungsub', 'gyeongsub', 'ppaman'].map(id => `assets/sprites/${id}-deck-fist.png`), ...['floor', 'cracked', 'wall', 'capstone'].map(id => `assets/tiles/gajaeman_castle_${id}.png`), 'assets/backdrops/jjajang_night_sea.png');
  for (const relative of sources) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const local = hash(fs.readFileSync(path.join(root, relative))), served = hash(await response.body());
    evidence.sources.push({ relative, local, served }); check(`source binding ${relative}`, response.ok() && local === served);
  }
  save();
  const key = async code => { await press(code, { delay: 45 }); await page.waitForTimeout(130); };
  const field = () => until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha < 0.01, 15000);
  const approach = () => fixture('youngcle-interaction-approach', 'Place player within the existing NPC interaction probe; actual C opens the authored readiness choice.', () => {
    const actor = game.entities.find(e => e.id === 'lounge_return_youngcle' && !e.dead);
    game.player.x = actor.x; game.player.y = actor.y + 24; game.player.facing = 'up';
    for (const member of game.entities) if (member.def?.type === 'follower') member.snapBehind();
    game.camera.snap();
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: 'ship_invasion_ready' });
  check('registered readiness checkpoint reaches field', await field());
  check('completed arrival briefing restores lounge BGM', await page.evaluate(() => game.sound.bgmName === 'ship_lounge'));
  await fixture('invasion-read-only-observer', 'Observe completed draws, visible typewriter glyphs, real actor/camera motion and audio calls without changing story state or clocks.', () => {
    const q = window.__invasionFlow = { frames: {}, samples: [], lines: [], audio: [], interruptions: [], choices: [], enabled: true };
    const draw = game.draw.bind(game), sfx = game.sound.sfx.bind(game.sound), bgm = game.sound.playBgm.bind(game.sound), done = game.textbox._done.bind(game.textbox);
    const phase = () => game.dialogue.script?.slice(0, game.dialogue.i).filter(n => n.label).at(-1)?.label || 'readiness';
    game.sound.sfx = (name, options) => { const result = sfx(name, options); q.audio.push({ kind: 'sfx', name, at: performance.now(), phase: phase(), beat: game.shipInvasion?.beat }); return result; };
    game.sound.playBgm = (name, options) => { q.audio.push({ kind: 'bgm', name, at: performance.now(), beat: game.shipInvasion?.beat, contact: game.shipInvasion?.impactCount }); return bgm(name, options); };
    game.textbox._done = (...args) => {
      if (game.textbox.node?.cut === 999) q.interruptions.push({ text: game.textbox.node.text, visible: game.textbox._pageTokens().slice(0, game.textbox.revealed).map(t => t.ch).join(''), at: performance.now() });
      return done(...args);
    };
    game.draw = (...args) => {
      const result = draw(...args); if (!q.enabled) return result;
      const now = performance.now(), box = game.textbox, label = phase(), text = box.isOpen ? box.node?.text : null;
      const actors = [game.player, ...game.entities.filter(e => ['gyeongsub', 'ppaman', 'lounge_return_youngcle', 'lounge_return_junhee', 'invasion_youngcle', 'invasion_junhee'].includes(e.id))].map(e => ({ id: e === game.player ? 'player' : e.id, x: e.x, y: e.y, facing: e.facing, pose: e.pose, visible: e.visible, dead: e.dead, moving: e.moving, hopY: e.hopY, motion: e.motion?.name, motionIndex: e.motion?.index, sprite: e.def?.sprite }));
      const sample = { at: now, map: game.mapId, label, text, visible: box.isOpen ? box._pageTokens().slice(0, box.revealed).map(t => t.ch).join('') : null, state: box.state, page: box.page, fade: game.fade.alpha, fadeColor: game.fade.color, camera: { x: game.camera.x, y: game.camera.y, zoom: game.zoom.s }, actors, bgm: game.sound.bgmName, bgmTime: game.sound.bgm?.currentTime, bgmPaused: game.sound.bgm?.paused, beat: game.shipInvasion?.beat, elapsed: game.shipInvasion?.elapsed, impactCount: game.shipInvasion?.impactCount, launchCount: game.shipInvasion?.launchCount, bubbleDots: game.bubble.shown };
      if (!q.samples.length || now - q.samples.at(-1).at > 75) q.samples.push(sample);
      if (text && q.lines.at(-1)?.text !== text) q.lines.push({ text, at: now, label, map: game.mapId, mosaic: box.node?.mosaic });
      const capture = name => { if (!q.frames[name]) q.frames[name] = { ...sample, data: game.canvas.toDataURL('image/png') }; };
      if (box.state === 'waiting' && game.fade.alpha < 0.01) capture(`line-${q.lines.length}-page-${box.page}`);
      if (game.flags.ship_invasion_started && game.fade.alpha > 0.95 && game.fade.color === '255,255,255') capture('photo-flash');
      if (actors.some(a => Number.isInteger(a.motionIndex))) capture(`fists-${actors.filter(a => Number.isInteger(a.motionIndex)).map(a => `${a.id}-${a.motionIndex}`).join('-')}`);
      if (text === '그리고, 결전의 날.' && box.revealed > 0) capture(`day-title-${box.revealed}`);
      if (sample.beat && !['hidden', 'aftermath'].includes(sample.beat) && game.fade.alpha < 0.01) capture(`beat-${sample.beat}-${Math.floor(sample.elapsed * 2)}`);
      if (box.node?.cut === 999) capture(`interrupt-${box.revealed}`);
      if (game.mapId === 'gajaeman_castle_entry' && game.fade.alpha < 0.01 && actors.filter(a => a.pose === 'lying').length === 5) capture('five-fallen');
      if (box.state === 'choice') q.choices.push({ at: now, shown: box.choiceShown, index: box.choiceIndex, timer: box.choiceTimer });
      return result;
    };
  });
  await approach(); await page.keyboard.down('KeyC');
  check('NPC C opens real readiness dialogue', await until(() => game.textbox.node?.text === '* 준비됨?', 3000));
  await page.waitForTimeout(1600);
  check('held C does not accept Yes', await page.evaluate(() => game.textbox.state === 'choice' && game.textbox.choiceShown === 2 && !game.flags.ship_invasion_started));
  await page.keyboard.up('KeyC'); await key('ArrowRight'); await key('KeyC');
  check('No returns unchanged lounge', await field() && await page.evaluate(() => !game.flags.ship_invasion_started && game.sound.bgmName === 'ship_lounge'));
  await approach(); await key('KeyC');
  check('repeat prompt is ready for Yes', await until(() => game.textbox.state === 'choice' && game.textbox.choiceShown === 2 && game.textbox.choiceLock <= 0, 4000));
  await key('KeyC');
  check('Yes begins invasion', await until(() => game.flags.ship_invasion_started && game.dialogue.running, 3000));
  const responsive = new Set();
  const start = Date.now();
  let previousPhase = null;
  while (Date.now() - start < 300000) {
    const state = await page.evaluate(() => ({ done: game.flags.ship_invasion_arrived && !game.dialogue.running, open: game.textbox.isOpen, state: game.textbox.state, cut: game.textbox.node?.cut, auto: game.textbox.node?.auto, text: game.textbox.node?.text, map: game.mapId, phase: game.dialogue.script?.slice(0, game.dialogue.i).filter(n => n.label).at(-1)?.label, errors: window.__invasionFlow?.lines.length }));
    if (state.phase !== previousPhase) { previousPhase = state.phase; evidence.latest = { ...state, elapsedMs: Date.now() - start }; save(); console.log(`PHASE ${state.phase} ${state.map}`); }
    if (state.done) break;
    const surface = state.text === '* 이제 결전에 때가 왔다.' ? 'rally' : state.text === '* 저희 빨리 돌아가서 편집해야해요' ? 'deck' : state.text === '* 으윽 님들 일어나샘' ? 'entry' : null;
    if (surface && state.state === 'waiting' && !responsive.has(surface)) {
      for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 800 }); await page.waitForTimeout(100); await shot(`${surface}-${width}`); }
      responsive.add(surface);
    }
    if (state.cut || state.auto || !state.open || state.state === 'typing') await page.waitForTimeout(90);
    else if (state.state === 'waiting') await key('KeyC');
    else await page.waitForTimeout(90);
  }
  const complete = await field() && await page.evaluate(() => game.flags.ship_invasion_arrived && game.mapId === 'gajaeman_castle_entry');
  check('whole authored sequence reaches castle entry control', complete);
  const q = await page.evaluate(() => { window.__invasionFlow.enabled = false; return window.__invasionFlow; });
  evidence.timeline = { ...q, frames: undefined };
  for (const [name, frame] of Object.entries(q.frames)) { const file = path.join(process.env.SHOT_DIR, `${name}.png`); fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64')); evidence.captures.push({ name, file, ...frame, data: undefined }); }
  save();
  const lines = q.lines.map(l => l.text), required = ['이제 결전에 때가 왔다.', '기념샷', '우리는 돌아갈 수 있음.', '나는 일단 앞에있는 문제에 집중하자고 말했다.', '어서 빨리 가재맨의 아구창에 한대 날리고싶구만 흥!', '뭐하고계세요?', '나는 고맙다고 말했다.', '가재맨성이 보임.', '자 슬슬 준비하자', '자 이제 준비하고 1시간뒤쯤 출발ㅎ..', '니 지능을 부여해준게 난데, 니 수를 내가 모르겠음?', '이건 내 플랜Z쯤 예상한 시나리오임 ㅇㅇ', '꾸욱!', 'ㅋㅋㅋ 그래 어디한번 발버둥쳐봐. 이 지옥에서.', '으윽 님들 일어나샘', '연락이 안됨. 죽은듯', '가자 애들아.'];
  let prior = -1;
  for (const text of required) { const index = lines.indexOf(`* ${text}`, prior + 1); check(`story order: ${text}`, index > prior); if (index >= 0) prior = index; }
  check('all three responsive surfaces captured at requested widths', responsive.size === 3);
  check('both text mosaics retain requested original wording', q.lines.some(l => l.text === '* 보지임신?' && l.mosaic?.text === '보지') && q.lines.some(l => l.text.startsWith('* 편집노조애들 위치로') && l.mosaic?.text === '노'));
  check('departure automatically interrupts precisely on visible ㅎ', q.interruptions.some(i => i.text.endsWith('출발ㅎ..') && i.visible.endsWith('ㅎ')));
  check('Junhee automatically interrupts on 치', q.interruptions.some(i => i.text === '* 미치...' && i.visible.endsWith('치')));
  check('photo shutter and soul grab fire once', ['photo_shutter', 'soul_grab'].every(name => q.audio.filter(a => a.name === name).length === 1));
  check('photo visibly flashes white', !!q.frames['photo-flash']);
  check('day title types visibly over black without opaque fade hiding it', q.samples.filter(s => s.text === '그리고, 결전의 날.' && s.fade < 0.05 && s.visible?.length > 0).length > 4);
  check('night deck plays wind through real time', q.samples.some(s => s.map === 'ship_night_deck' && s.bgm === 'wind' && s.bgmTime > 1 && !s.bgmPaused));
  check('all three actors raise through multiple fist frames', ['player', 'gyeongsub', 'ppaman'].every(id => new Set(q.samples.flatMap(s => s.actors.filter(a => a.id === id && Number.isInteger(a.motionIndex)).map(a => a.motionIndex))).size >= 3));
  for (const name of ['sail', 'castle-look', 'room-shadow', 'castle-drop', 'aftermath', 'teleport']) check(`real-time cinematic beat ${name}`, q.samples.some(s => s.beat === name));
  check('impact starts requested BGM once at contact', q.audio.filter(a => a.kind === 'bgm' && a.name === 'ship_invasion').length === 1 && q.audio.some(a => a.name === 'ship_invasion' && a.beat === 'castle-drop' && a.contact === 1));
  check('five transport lights launched before castle entry', q.samples.some(s => s.launchCount === 5));
  check('all five fallen actors render before standing', !!q.frames['five-fallen']);
  if (complete) {
    check('final state restores party camera, removes guest actors and stops music', await page.evaluate(() => game.party.join(',') === 'gyeongsub,ppaman' && game.camera.target === game.player && !game.camera.locked && !game.shipInvasion && !game.shipDeckPoses && !game.sound.bgmName && !game.entities.some(e => ['invasion_youngcle', 'invasion_junhee'].includes(e.id) && !e.dead)));
    const before = await page.evaluate(() => ({ x: game.player.x, y: game.player.y }));
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(450); await page.keyboard.up('ArrowRight');
    check('physical movement works after final line', await page.evaluate(before => game.player.x > before.x + 10, before));
    await key('KeyV'); check('V opens field menu after cinematic', await until(() => game.state === 'menu', 1500));
    await shot('entry-menu'); await key('KeyX'); check('X restores field from menu', await field());
    evidence.completed = await page.evaluate(() => ({ flags: game.flags, party: game.party, x: game.player.x, y: game.player.y, money: game.money, inventory: game.inventory }));
    await fixture('save-completed-invasion', 'Save naturally completed cinematic without editing save data.', () => game.autosave());
    await fixture('continue-completed-invasion', 'Exercise real continueGame with that unmodified autosave.', () => game.continueGame());
    check('continue restores castle without replay', await field() && await page.evaluate(() => game.mapId === 'gajaeman_castle_entry' && game.flags.ship_invasion_arrived && !game.shipInvasion && !game.shipDeckPoses && game.party.join(',') === 'gyeongsub,ppaman'));
    await shot('entry-continued');
  }
  evidence.sourceAfter = sources.map(relative => ({ relative, local: hash(fs.readFileSync(path.join(root, relative))) }));
  check('bound sources remain unchanged throughout run', evidence.sourceAfter.every(a => evidence.sources.find(s => s.relative === a.relative).local === a.local));
  save();
});
