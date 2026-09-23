import { runScenario } from './lib/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const BRIEFING_LINES = ['진짜 뒤질뻔했네요 이얍!', 'ㅋㅋ', '반갑노 게이들아', '저새끼 어떻게든 잘 잡아왔노 ㅅㄱㅅㄱ', '네 형 그래서 이제 어떻게 할거에요?', '뭘 어떻게하긴 뭘 어떻게함', '내일 당장 그 더러운 성을 침공할거임', '내일..?', 'ㅇㅇ', '지금 우리 전함에 약 8억 5700만 1293개 쯤 되는 무기들이 존재함', '살상 무기를 한번에 끝까지 쫒아가서 다 때려박은뒤에 우린 집가면됨 ㅇㅇ', '내가 그중에서 가장 대단한 무기를 만들었는데', '그래서 니들은 일단 여기서 준비만 하면 될거고 뭐 상점이나 들리던가 애들하고 얘기나 좀 하던가 ㅇㅇ', '내가 생각해봤을때 가재맨을 제대로 처리할수있는건 요플래. 너밖에 없는거같음', '그리고 우리는 죽이는게 끝이 아니라 형섭이를 되찾아야하니까', 'ㅇㅇ 굿', '난 저기 옆에 있을테니 좀 라운지 둘러보다가 준비되면 말거샘', '...', '일단 좀 둘러볼까요 상점이나 가볼까'];

await runScenario({ name: 'choimis-lounge-briefing', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, until, press, shot, fixture, check }) => {
  const abortOnly = process.env.QA_BRIEFING_ABORT === '1';
  const direct = abortOnly || process.env.QA_BRIEFING_DIRECT === '1';
  const evidence = { sources: [], captures: [], limitations: 'Registered rescue shortcut, then actual scripted rescue/arrival and physical C. Existing rescued save compatibility is prepared by deleting only the new briefing flags from a real autosave, then normal continueGame. NPC approach coordinates and shop affordability/HP are disclosed fixtures. No scene timing, movement, dialogue index or completion flag is injected.' };
  const save = () => fs.writeFileSync(path.join(process.env.SHOT_DIR, 'briefing-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  evidence.scope = abortOnly ? 'direct-mid-laugh-abort' : direct ? 'direct-briefing' : 'rescue-to-briefing';
  if (direct) evidence.limitations = 'Registered post-rescue briefing checkpoint; this run does not replay aerial rescue. Scene progression uses real updates and physical keys. The abort scope uses actual Escape while the owned laugh plays. Where exercised, NPC approach coordinates and old-save compatibility states are disclosed fixtures. No scene clock, movement, dialogue index or completion flag is injected.';
  const sources = ['src/data/cutscenes/ship_lounge_briefing.js', 'src/data/cutscenes/ship_lounge.js', 'src/data/cutscenes/choimis_rescue.js', 'src/core/story.js', 'src/data/scripts.js', 'src/main.js', 'src/ui/cutscene.js', 'src/ui/dialogue.js', 'assets/maps/ship_lounge.json', 'assets/audio/bgm/storage_show.mp3'];
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const relative of sources) {
    const response = await page.request.get(new URL(relative, process.env.QA_BASE_URL).href);
    const local = hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))), served = hash(await response.body());
    evidence.sources.push({ relative, local, served }); check(`source binding ${relative}`, response.ok() && local === served);
  }
  const finishSources = () => {
    evidence.sourceAfter = sources.map(relative => ({ relative, local: hash(fs.readFileSync(path.join(process.env.QA_SOURCE_ROOT, relative))) }));
    check('bound briefing sources remain stable during execution', evidence.sourceAfter.every(a => evidence.sources.find(s => s.relative === a.relative).local === a.local));
    save();
  };
  const key = async code => { await press(code, { delay: 55 }); await page.waitForTimeout(190); };
  const field = async () => !!await until(() => game.state === 'field' && !game.dialogue.running && !game.transitioning && game.fade.alpha === 0, 15000);
  const finishText = async () => {
    for (let i = 0; i < 32 && await page.evaluate(() => game.dialogue.running); i++) { await key('KeyC'); }
    return field();
  };
  const place = async (id, dx = 0, dy = 24, facing = 'up') => fixture(`approach-${id}`, 'Prepare a reachable interaction approach; actual C and all subsequent actions remain physical keyboard input.', ({ id, dx, dy, facing }) => {
    const e = game.entities.find(e => e.id === id && !e.dead);
    if (!e) throw new Error(`Missing actor ${id}`);
    game.player.x = e.x + dx; game.player.y = e.y + dy; game.player.facing = facing;
    for (const member of game.entities) if (member.def?.type === 'follower') member.snapBehind();
    game.camera.snap();
  }, { id, dx, dy, facing });
  await page.setViewportSize({ width: 1280, height: 800 });
  await open({ qa: direct ? 'choimis_lounge_briefing' : 'choimis_rescue' });
  check(direct ? 'registered direct briefing checkpoint starts' : 'real rescue continuation starts', await until(direct ? () => window.game?.mapId === 'ship_lounge' && game.dialogue.running : () => window.game?.choimisRescue && game.textbox.isOpen, 30000));
  await fixture('briefing-render-observer', 'Observe normal Game.draw, entity coordinates, script labels, audio, dialogue and camera only. Captures are latched after the full draw.', () => {
    const q = window.__briefQa = { frames: {}, samples: [], lines: [], phases: [], audio: [], choices: [], interactions: [], observing: true };
    const draw = game.draw.bind(game), sfx = game.sound.sfx.bind(game.sound), bgm = game.sound.playBgm.bind(game.sound);
    const phase = () => game.dialogue.script?.slice(0, game.dialogue.i).filter(n => n.label).at(-1)?.label || 'initial';
    game.sound.sfx = (name, options) => {
      const handle = sfx(name, options), entry = { kind: 'sfx', name, options, at: performance.now(), phase: phase(), samples: [] };
      q.audio.push(entry);
      if (name === 'laugh_junhee') for (const delay of [100, 400, 850, 1200, 2000, 3000]) setTimeout(() => entry.samples.push({ delay, paused: handle?.paused, ended: handle?.ended, time: handle?.currentTime, duration: handle?.duration, text: game.textbox.node?.text }), delay);
      return handle;
    };
    game.sound.playBgm = (name, options) => {
      const entry = { kind: 'bgm', name, at: performance.now(), phase: phase(), text: game.textbox.node?.text, samples: [] };
      q.audio.push(entry);
      const result = bgm(name, options);
      if (name === 'storage_show') for (const delay of [100, 500, 1500]) setTimeout(() => entry.samples.push({ delay, name: game.sound.bgmName, time: game.sound.bgm?.currentTime, paused: game.sound.bgm?.paused, src: game.sound.bgm?.currentSrc, duration: game.sound.bgm?.duration }), delay);
      return result;
    };
    game.draw = (...args) => {
      const result = draw(...args), now = performance.now();
      if (game.mapId !== 'ship_lounge') return result;
      const actors = [game.player, ...game.entities.filter(e => ['gyeongsub', 'ppaman', 'lounge_return_yongjun', 'lounge_return_youngcle', 'lounge_return_junhee', 'lounge_carried_choimis', 'lounge_choimis_sealed', 'lounge_mini_mario'].includes(e.id))].map(e => ({ id: e === game.player ? 'player' : e.id, x: e.x, y: e.y, moving: e.moving, visible: e.visible, dead: e.dead, pose: e.pose, hopY: e.hopY, spin: e.spin, flyX: e.flyX, flyY: e.flyY, motion: e.motion?.name, emote: e.emote?.kind }));
      const label = phase(), text = game.textbox.node?.text;
      const capture = name => { if (game.fade.alpha < 0.05 && !q.frames[name]) q.frames[name] = { at: now, phase: label, camera: { x: game.camera.x, y: game.camera.y }, data: game.canvas.toDataURL('image/png') }; };
      if (q.observing && !game.flags.ship_lounge_briefed) {
        if (q.phases.at(-1)?.label !== label) q.phases.push({ label, at: now });
        if (text && q.lines.at(-1)?.text !== text) q.lines.push({ text, speaker: game.textbox.speaker, at: now, phase: label });
        if (!q.samples.length || now - q.samples.at(-1).at > 90) q.samples.push({ at: now, label, actors, camera: { x: game.camera.x, y: game.camera.y }, text, bubble: { dots: game.bubble.shown, active: !game.bubble.done }, bgm: game.sound.bgmName, bgmTime: game.sound.bgm?.currentTime, sealed: game.flags.choimis_lounge_sealed });
        if (game.textbox.state === 'waiting') capture(`line-${q.lines.length}-page-${game.textbox.page}`);
        if (label === 'entry') for (const actor of actors.filter(a => a.moving)) capture(`arrival-${actor.id}`);
        const carried = actors.find(a => a.id === 'lounge_carried_choimis');
        if (carried && !carried.dead && carried.visible !== false) capture('carried-choimis');
        if (carried?.hopY > 12) capture('throw-midair');
        if (game.flags.choimis_lounge_sealed) capture('sealed-after-throw');
        if (actors.some(a => a.emote === '!')) capture('party-exclamation');
        if (label === 'laugh') capture('junhee-laugh');
        if (label === 'interruption' && game.bubble.shown === 3 && !game.bubble.done) capture('youngcle-interruption-three-dots');
        if (label === 'shop_run') { capture('yongjun-shop-run'); if (actors.find(a => a.id === 'lounge_return_yongjun')?.y > 850) capture('yongjun-shop-approach'); }
      }
      if (game.textbox.choice && game.textbox.node?.text?.includes('준비됨?')) {
        if (!q.choices.length || now - q.choices.at(-1).at > 20) q.choices.push({ at: now, state: game.textbox.state, timer: game.textbox.choiceTimer, shown: game.textbox.choiceShown, index: game.textbox.choiceIndex, ready: !!game.flags.ship_invasion_ready });
      }
      return result;
    };
  });
  const start = Date.now();
  let laughWait = null;
  while (Date.now() - start < 150000) {
    const state = await page.evaluate(() => ({ done: game.flags.ship_lounge_briefed && !game.dialogue.running && !game.transitioning, open: game.textbox.isOpen, text: game.textbox.node?.text, dots: game.bubble.shown }));
    if (state.done) break;
    if (state.text === '* 내가 그중에서 가장 대단한 무기를 만들었는데') {
      if (abortOnly) {
        check('abort begins while owned laugh is genuinely playing', await until(() => game.loungeBriefingLaugh && !game.loungeBriefingLaugh.paused && game.loungeBriefingLaugh.currentTime > 0.02, 600));
        evidence.abortBefore = await page.evaluate(() => ({ state: game.state, paused: game.loungeBriefingLaugh?.paused, audioTime: game.loungeBriefingLaugh?.currentTime, briefed: !!game.flags.ship_lounge_briefed }));
        await press('Escape', { delay: 55 });
        check('actual Escape aborts to title during the laugh', await until(() => game.state === 'title', 5000));
        await page.waitForTimeout(1100);
        const result = await page.evaluate(() => ({ handleCleared: !game.loungeBriefingLaugh, motionCleared: !game.entities.find(e => e.id === 'lounge_return_junhee')?.motion, briefed: !!game.flags.ship_lounge_briefed, running: game.dialogue.running, audio: window.__briefQa.audio.filter(a => a.name === 'laugh_junhee') }));
        evidence.abortAfter = result;
        check('abort pauses owned laugh and clears motion without awarding briefing', result.handleCleared && result.motionCleared && !result.briefed && !result.running && result.audio.some(a => a.samples.some(s => s.delay >= 850 && s.paused)), JSON.stringify(result));
        await shot('mid-laugh-abort-title'); finishSources(); return;
      }
      laughWait ??= Date.now();
      if (Date.now() - laughWait > 6000) throw new Error('Junhee boast does not automatically interrupt without C');
      await page.waitForTimeout(100); continue;
    }
    if (laughWait && !evidence.laughAutomatic) evidence.laughAutomatic = { elapsedMs: Date.now() - laughWait, nextText: state.text };
    if (state.text?.startsWith('* 그래서 니들은 일단 여기서 준비만 하면 될거고') && !evidence.interruptionDots) {
      if (state.dots < 3) { await page.waitForTimeout(100); continue; }
      evidence.interruptionDots = { at: Date.now(), dots: state.dots };
    }
    if (state.open) await key('KeyC'); else await page.waitForTimeout(100);
  }
  check(direct ? 'direct checkpoint completes one real briefing' : 'rescue naturally enters and completes one lounge briefing', await field() && await page.evaluate(() => game.mapId === 'ship_lounge' && game.flags.choimis_rescued && game.flags.ship_lounge_briefed));
  const q = await page.evaluate(() => { window.__briefQa.observing = false; return window.__briefQa; });
  evidence.arrival = { ...q, frames: undefined };
  for (const [label, frame] of Object.entries(q.frames)) { const file = path.join(process.env.SHOT_DIR, `${label}.png`); fs.writeFileSync(file, Buffer.from(frame.data.split(',')[1], 'base64')); evidence.captures.push({ label, file, ...frame, data: undefined }); }
  check('all nineteen briefing lines preserve user wording and order', JSON.stringify(q.lines.map(l => l.text)) === JSON.stringify(BRIEFING_LINES.map(t => `* ${t}`)), JSON.stringify(q.lines));
  const walkers = ['player', 'gyeongsub', 'ppaman', 'lounge_return_yongjun'];
  const firstMove = walkers.map(id => q.samples.find(s => s.label === 'entry' && s.actors.some(a => a.id === id && a.moving))?.at);
  check('all four actors visibly walk in with staggered starts', firstMove.every(Number.isFinite) && [...firstMove].sort((a, b) => a - b).every((at, i, values) => i === 0 || at - values[i - 1] >= 150), JSON.stringify(firstMove));
  const speeds = [];
  for (let i = 1; i < q.samples.length; i++) {
    const a = q.samples[i - 1], b = q.samples[i];
    if (a.label !== 'entry' || b.label !== 'entry') continue;
    for (const id of walkers) {
      const old = a.actors.find(actor => actor.id === id), next = b.actors.find(actor => actor.id === id);
      if (old?.moving && next?.moving) speeds.push(Math.hypot(next.x - old.x, next.y - old.y) / ((b.at - a.at) / 1000));
    }
  }
  check('entrance walks stay visibly slow rather than running', speeds.length > 20 && Math.max(...speeds) < 110, JSON.stringify({ samples: speeds.length, maxPixelsPerSecond: Math.max(...speeds) }));
  check('carry, airborne throw, sealed landing, reactions and shop run all render', ['carried-choimis', 'throw-midair', 'sealed-after-throw', 'party-exclamation', 'junhee-laugh', 'youngcle-interruption-three-dots', 'yongjun-shop-run', 'yongjun-shop-approach'].every(k => q.frames[k]), JSON.stringify(Object.keys(q.frames)));
  const music = q.audio.filter(a => a.kind === 'bgm' && a.name === 'storage_show'), laughLine = q.lines.find(l => l.text === '* ㅋㅋ');
  check('Youngcle song starts from zero at his laugh exactly once', music.length === 1 && Math.abs(music[0].at - laughLine.at) < 120 && music[0].samples.some(s => s.delay === 100 && s.time < 0.3) && music[0].samples.some(s => s.delay === 1500 && s.time > 1 && !s.paused), JSON.stringify(music));
  check('active Queen media uses the existing complete source file', music.some(a => a.samples.some(s => s.src?.includes('/assets/audio/bgm/storage_show.mp3') && s.duration > 56.6 && s.duration < 56.9)));
  check('Junhee line is interrupted quickly and automatically with no C input', evidence.laughAutomatic?.nextText?.startsWith('* 그래서 니들은 일단 여기서 준비만 하면 될거고') && evidence.laughAutomatic.elapsedMs < 1500, JSON.stringify(evidence.laughAutomatic));
  check('Junhee laugh actually starts and is interrupted before full playback', q.audio.some(a => a.name === 'laugh_junhee' && a.samples.some(s => s.time > 0 && !s.paused) && a.samples.some(s => s.delay >= 850 && s.paused)), JSON.stringify(q.audio.filter(a => a.name === 'laugh_junhee')));
  const shopCamera = q.samples.filter(s => s.label === 'shop_run').map(s => s.camera.y);
  check('camera follows Yongjun to the lower shop', shopCamera.length > 2 && Math.max(...shopCamera) - Math.min(...shopCamera) > 300);
  check('Yongjun disappears into shop and camera returns to party control', await page.evaluate(() => !game.entities.some(e => e.id === 'lounge_return_yongjun' && !e.dead && e.visible !== false) && !game.dialogue.running && game.camera.target === game.player && !game.camera.locked && game.zoom.s === 1));
  await shot('briefing-completed-field'); save();

  const npcs = await page.evaluate(() => game.entities.filter(e => e.def?.type === 'npc' && !e.dead && e.visible !== false && e.id !== 'lounge_return_youngcle').map(e => e.id));
  for (const id of npcs) {
    await place(id, id === 'lounge_mini_mario' ? -32 : 0, id === 'lounge_mini_mario' ? 0 : 24, id === 'lounge_mini_mario' ? 'right' : 'up');
    if (id === 'lounge_mini_mario') {
      const before = await page.evaluate(() => window.__briefQa.audio.filter(a => a.name === 'mario_jump').length);
      await key('KeyC');
      check('Mario retains exactly one jump and no chat box', await page.evaluate(before => !game.textbox.isOpen && game.entities.find(e => e.id === 'lounge_mini_mario').hopY > 0 && window.__briefQa.audio.filter(a => a.name === 'mario_jump').length === before + 1, before));
      await shot('mario-jump-only'); await field();
    } else {
      await key('KeyC');
      const text = await page.evaluate(() => game.textbox.node?.text);
      check(`${id} has a live postbriefing interaction`, typeof text === 'string' && text.length > 3, String(text));
      evidence.arrival.interactions.push({ id, text });
      if (id.includes('park_guardian')) check('Park dialogue uses the actual costume face rather than a generic fallback', await page.evaluate(() => game.textbox.node.portrait === 'park_guardian_costume' && !!game.spriteOverrides.park_guardian_costume && !!game.textbox.portrait && game.textbox.portrait === game.portraits.park_guardian_costume));
      if (await page.evaluate(() => game.textbox.state === 'typing')) await key('KeyC');
      await shot(`npc-${id}`); await finishText();
    }
  }
  await place('lounge_return_youngcle');
  await page.keyboard.down('KeyC');
  check('Youngcle presents the requested readiness prompt', await until(() => game.textbox.node?.text === '* 준비됨?', 3000));
  await page.waitForTimeout(1800);
  check('held C cannot confirm delayed readiness', await page.evaluate(() => game.dialogue.running && game.textbox.state === 'choice' && game.textbox.choiceShown === 2 && !game.flags.ship_invasion_ready));
  await shot('ready-held-C-choice'); await page.keyboard.up('KeyC');
  const choices = await page.evaluate(() => window.__briefQa.choices);
  const delayed = choices.find(s => s.state === 'choice' && s.shown === 0), shown = choices.find(s => s.state === 'choice' && s.shown === 2);
  check('readiness options appear after roughly0.6s delay', delayed && shown && shown.at - delayed.at >= 550 && shown.at - delayed.at < 1000, JSON.stringify({ delayed, shown }));
  await key('ArrowRight'); await key('KeyC');
  check('No returns field without committing readiness', await field() && await page.evaluate(() => !game.flags.ship_invasion_ready && game.mapId === 'ship_lounge'));
  await place('lounge_return_youngcle'); await key('KeyC'); await key('KeyC');
  check('repeat readiness prompt allows cancellation', await until(() => game.textbox.state === 'choice' && game.textbox.choiceShown === 2, 3000));
  await page.waitForTimeout(150); await key('KeyX');
  check('cancel also returns field without readiness', await field() && await page.evaluate(() => !game.flags.ship_invasion_ready));
  await place('lounge_return_youngcle'); await key('KeyC'); await key('KeyC');
  check('fresh confirmation can choose Yes', await until(() => game.textbox.state === 'choice' && game.textbox.choiceShown === 2, 3000));
  await page.waitForTimeout(150); await key('KeyC');
  check('Yes stores readiness and restores lounge without invented next scene', await field() && await page.evaluate(() => game.flags.ship_invasion_ready && game.mapId === 'ship_lounge' && game.fade.alpha === 0 && !game.textbox.isOpen));
  await fixture('save-completed-briefing', 'Persist actual briefing completion and actual Yes choice through autosave.', () => game.autosave());
  await fixture('continue-completed-briefing', 'Exercise the normal continue path on that unmodified save.', () => game.continueGame());
  check('saved briefing and readiness do not replay on continue', await field() && await page.evaluate(() => game.flags.ship_lounge_briefed && game.flags.ship_invasion_ready && game.mapId === 'ship_lounge'));
  await shot('continued-without-replay');
  await fixture('old-rescued-save-migration', 'Prepare an old already-rescued lounge save by removing only newly introduced briefing/readiness/sealing flags, then normal continueGame must start the newly added arrival once.', () => {
    game.autosave();
    const saved = JSON.parse(localStorage.getItem('subtarune.save.v1'));
    delete saved.flags.ship_lounge_briefed; delete saved.flags.ship_invasion_ready; delete saved.flags.choimis_lounge_sealed;
    saved.story = { stage: 'choimis_rescued' };
    saved.map = 'ship_lounge'; saved.spawn = 'from_rescue'; saved.x = 372; saved.y = 900;
    localStorage.setItem('subtarune.save.v1', JSON.stringify(saved));
    return game.continueGame();
  });
  check('old rescued save starts the new briefing through map enter', await until(() => game.mapId === 'ship_lounge' && game.dialogue.running && game.entities.some(e => e.id === 'lounge_carried_choimis'), 20000));
  check('old rescued save does not replay battle or aerial rescue', await page.evaluate(() => game.flags.choimis_rescued && !game.flags.ship_lounge_briefed && !game.battle && !game.choimisRescue));
  await shot('old-rescued-save-briefing-entry');
  evidence.choices = choices;
  finishSources();
});
