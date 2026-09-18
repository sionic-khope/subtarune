import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'ship-lounge', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check, until, open, press, shot, fixture }) => {
  const finish = async () => {
    for (let i = 0; i < 32 && await page.evaluate(() => game.dialogue.running); i++) {
      await press('KeyC');
      await page.waitForTimeout(180);
    }
    check('dialogue returns control', await page.evaluate(() => !game.dialogue.running));
  };
  const stand = async (id, offset = 0) => fixture(`approach-${id}-${offset}`, 'Prepare a C probe below the target, or left of tiny Mario so the hop is visible; the central aisle is walked separately.', ({ id, offset }) => {
    const e = game.entities.find(e => e.id === id);
    game.player.x = e.x + e.w / 2 - game.player.w / 2 + offset;
    const bottom = e.y + e.h + 56 >= game.map.pxH;
    game.player.y = bottom ? e.y - game.player.h - 8 : e.y + e.h + 8;
    game.player.facing = bottom ? 'down' : 'up';
    if (id === 'lounge_mini_mario') {
      game.player.x = e.x - game.player.w - 8;
      game.player.y = e.y;
      game.player.facing = 'right';
    }
    game.camera.snap();
  }, { id, offset });
  await open({ qa: 'ship_lounge' });
  check('QA enters lounge', !!await until(() => window.game?.mapId === 'ship_lounge' && !game.transitioning && !game.dialogue.running, 20000));
  await until(() => game.sound.bgm?.currentTime > 0.2 && game.sound.bgm.volume >= 0.39, 5000);
  const qaAudio = await page.evaluate(() => ({ name: game.sound.bgmName, time: game.sound.bgm?.currentTime, volume: game.sound.bgm?.volume, paused: game.sound.bgm?.paused, muted: game.sound.muted }));
  check('direct QA lounge has playing audible music', qaAudio.name === 'ship_lounge' && qaAudio.time > 0 && qaAudio.volume >= 0.39 && qaAudio.paused === false && !qaAudio.muted, JSON.stringify(qaAudio));
  await press('KeyX');
  const decoded = await page.evaluate(async () => {
    const response = await fetch('assets/audio/bgm/ship_lounge.mp3');
    const buffer = await game.sound.ctx.decodeAudioData(await response.arrayBuffer());
    const samples = buffer.getChannelData(0);
    let energy = 0;
    for (const sample of samples) energy += sample * sample;
    return { status: response.status, duration: buffer.duration, rms: Math.sqrt(energy / samples.length) };
  });
  check('selected complete 95-second source decodes with nonzero signal', decoded.status === 200 && decoded.duration > 94 && decoded.duration < 96 && decoded.rms > 0.01, JSON.stringify(decoded));
  await fixture('suppress-followup-castle-event', 'This lounge regression inspects the existing room interactions; the dedicated ship-castle scenario owns the real proximity trigger.', () => {
    game.setFlag('ship_castle_started');
  });
  await press('KeyX');
  await page.waitForTimeout(250);
  await shot('lounge_01_arrival');
  const loaded = await page.evaluate(() => ({ map: game.mapId, npc: game.entities.filter(e => e.def.type === 'npc').map(e => e.id),
    art: game.entities.filter(e => e.def.type === 'prop').map(e => ({ id: e.id, width: e.image?.naturalWidth || e.img?.naturalWidth || 0 })) }));
  check('all nine lounge NPCs exist', loaded.npc.length === 9, JSON.stringify(loaded));
  check('all lounge prop images decode without fallback', loaded.art.every(e => e.width > 0), JSON.stringify(loaded.art.filter(e => !e.width)));
  check('all three new floor tiles decode', await page.evaluate(async () => {
    const { getTile } = await import('/src/world/tiles.js');
    return [':', ';', '/'].every(key => getTile(key).override?.naturalWidth === 32);
  }));
  const drawn = await page.evaluate(async () => {
    const { CHAR_SCALE } = await import('/src/world/world.js');
    const box = e => {
      if (e.def.type === 'npc') {
        const k = CHAR_SCALE * (e.def.visualScale || 1) / e.sprite.px;
        const w = Math.round(e.sprite.fw * k), h = Math.round(e.sprite.fh * k);
        return { id: e.id, x: Math.round(e.x + e.w / 2 - w / 2), y: Math.round(e.y + e.h - h), w, h };
      }
      const frames = e.def.anim?.cols || 1, scale = e.def.scale || 1, img = e.image || e.img;
      const w = Math.round(img.naturalWidth / frames * scale), h = Math.round(img.naturalHeight * scale);
      return { id: e.id, x: e.def.ix ?? e.def.x, y: e.def.iy ?? e.def.y, w, h };
    };
    return game.entities.filter(e => ['npc', 'prop'].includes(e.def.type)).map(box);
  });
  const hits = [];
  for (let i = 0; i < drawn.length; i++) for (const b of drawn.slice(i + 1)) {
    const a = drawn[i];
    const pair = [a.id, b.id].sort().join('/');
    if (pair === 'lounge_youngcle/ship_lounge_grand_door') continue;
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) hits.push(`${a.id}/${b.id}`);
  }
  check('no lounge sprite is drawn on top of another prop or NPC', hits.length === 0, hits.join(' '));
  const wall = drawn.filter(e => e.y + e.h <= 208).map(e => Math.round(e.x + e.w / 2)).sort((a, b) => a - b);
  check('back wall decoration is mirrored about the room centre', wall.length === 5 && wall.every((c, i) => c + wall[wall.length - 1 - i] === 768), JSON.stringify(wall));
  await page.keyboard.down('ArrowUp');
  check('actual up key traverses the unobstructed central promenade', !!await until(() => game.player.y < 440, 10000));
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('ArrowLeft');
  check('actual left key takes the staged doorway bypass', !!await until(() => game.player.x < 230, 3000));
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  const top = await until(() => game.player.y < 230, 5000);
  await page.keyboard.up('ArrowUp');
  check('real walking routes around the staged trio and reaches the door', !!top, JSON.stringify(await page.evaluate(() => ({ x: game.player.x, y: game.player.y }))));
  await shot('lounge_02_top');
  for (const [side, key, x] of [['left', 'ArrowLeft', 64], ['right', 'ArrowRight', 688]]) {
    await fixture(`walk-${side}-start`, 'Return to the ordinary arrival position to walk the outer lounge pockets with actual arrow keys.', () => {
      game.player.x = 372; game.player.y = 900; game.camera.snap();
    });
    await page.keyboard.down(key);
    check(`${side} lounge pocket reached by walking`, !!await page.waitForFunction(({ x, side }) => side === 'left' ? game.player.x <= x : game.player.x >= x, { x, side }, { timeout: 5000 }));
    await page.keyboard.up(key);
    await shot(`lounge_${side}_lower`);
    for (const [zone, y] of [['middle', 620], ['upper', 400]]) {
      await page.keyboard.down('ArrowUp');
      check(`${side} ${zone} route remains walkable`, !!await page.waitForFunction(y => game.player.y <= y, y, { timeout: 6000 }));
      await page.keyboard.up('ArrowUp');
      await shot(`lounge_${side}_${zone}`);
    }
  }
  for (const offset of [-64, 0, 64]) {
    await stand('ship_lounge_grand_door', offset);
    await press('KeyC');
    check(`closed purple door reachable at offset ${offset}`, !!await until(() => game.dialogue.running, 1500));
    if (!offset) { await until(() => !!game.textbox.node?.text, 2500); await press('KeyC'); await page.waitForTimeout(150); await shot('lounge_03_door_text'); }
    await finish();
  }
  for (const id of loaded.npc) {
    await stand(id);
    const before = await page.evaluate(id => {
      const npc = game.entities.find(e => e.id === id);
      return { player: [game.player.x, game.player.y], npc: [npc.x, npc.y] };
    }, id);
    if (id === 'lounge_mini_mario') {
      for (let attempt = 1; attempt <= 2; attempt++) {
        await page.evaluate(() => {
          window.loungeHop = { peaks: 0, text: false, wasUp: false, height: 0, frames: 0 };
          const observe = () => {
            const state = window.loungeHop;
            const npc = game.entities.find(e => e.id === 'lounge_mini_mario');
            const up = (npc.hopY || 0) > 0;
            if (up && !state.wasUp) state.peaks++;
            state.wasUp = up;
            state.height = Math.max(state.height, npc.hopY || 0);
            state.text ||= !!game.textbox.node?.text && game.dialogue.running;
            if (++state.frames < 65) requestAnimationFrame(observe);
          };
          requestAnimationFrame(observe);
        });
        await press('KeyC');
        check(`Mario hop ${attempt} starts immediately`, !!await until(() => game.entities.find(e => e.id === 'lounge_mini_mario').hopY > 0, 350));
        if (attempt === 1) {
          await until(() => game.entities.find(e => e.id === 'lounge_mini_mario').hopY > 22, 400);
          await shot('lounge_mario_hop');
        }
        await until(() => window.loungeHop.frames >= 65, 2000);
        const result = await page.evaluate(() => window.loungeHop);
        check(`Mario hop ${attempt} is one jump with no dialogue`, result.peaks === 1 && result.height > 20 && !result.text, JSON.stringify(result));
        check(`Mario hop ${attempt} returns control in place`, await page.evaluate(before => {
          const npc = game.entities.find(e => e.id === 'lounge_mini_mario');
          return !game.dialogue.running && !npc.hopY && JSON.stringify({ player: [game.player.x, game.player.y], npc: [npc.x, npc.y] }) === JSON.stringify(before);
        }, before));
      }
      continue;
    }
    await press('KeyC');
    check(`${id} talks through real C input`, !!await until(() => game.dialogue.running, 1500));
    check(`${id} starts text immediately`, !!await until(() => !!game.textbox.node?.text, 250));
    check(`${id} keeps approached coordinates`, await page.evaluate(({ id, before }) => {
      const npc = game.entities.find(e => e.id === id);
      return JSON.stringify({ player: [game.player.x, game.player.y], npc: [npc.x, npc.y] }) === JSON.stringify(before);
    }, { id, before }));
    await press('KeyC');
    await page.waitForTimeout(150);
    await shot(id);
    await finish();
  }
  await fixture('injured-party', 'Prepare injured HP to test the spring healing; no natural combat completion is claimed.', () => {
    for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = 1;
  });
  await stand('ship_lounge_spring');
  await press('KeyC');
  check('spring starts by C', !!await until(() => game.dialogue.running, 1500));
  await finish();
  check('spring heals whole current party', await page.evaluate(() => ['hyungsub', ...game.party].every(id => game.partyHp[id] === game.maxHpOf(id))));
  await shot('lounge_04_spring');
  await press('KeyV');
  check('field menu opens', !!await until(() => game.state === 'menu', 1500));
  await shot('lounge_05_menu');
  await press('KeyX');
  check('X returns to field', !!await until(() => game.state === 'field', 1500));
  await stand('ship_lounge_ladder');
  await press('KeyC');
  check('return ladder asks first', !!await until(() => game.dialogue.running, 1500));
  await press('KeyC');
  await page.waitForTimeout(650);
  await shot('lounge_06_return_choice');
  await press('KeyX');
  check('X cancels return without leaving lounge', !!await until(() => game.mapId === 'ship_lounge' && !game.dialogue.running, 2000));
  await press('KeyC');
  await page.waitForTimeout(200);
  await press('KeyC');
  await page.waitForTimeout(650);
  await press('KeyC');
  check('yes returns to safe control-room spawn', !!await until(() => game.mapId === 'youngcle20' && !game.transitioning && !game.dialogue.running, 10000));
  await page.waitForTimeout(800);
  check('return does not bounce or replay ending', await page.evaluate(() => game.mapId === 'youngcle20' && !game.dialogue.running && game.flags.ship_ending_done));
  const returnedAudio = await page.evaluate(() => ({ name: game.sound.bgmName ?? null, time: game.sound.bgm?.currentTime ?? null, volume: game.sound.bgm?.volume ?? null }));
  check('ladder return restores intentional control-room silence', returnedAudio.name === null && returnedAudio.time === null, JSON.stringify(returnedAudio));
  await shot('lounge_07_control_return');
  const hatch = await page.evaluate(() => game.entities.find(e => e.def.script === 'ship_manhole_enter')?.id || game.entities.find(e => e.def.script?.includes('manhole'))?.id);
  check('control-room opened hatch remains interactive', !!hatch, hatch || 'no hatch');
  if (hatch) {
    await stand(hatch);
    await press('KeyC');
    await page.waitForTimeout(200);
    await press('KeyC');
    await page.waitForTimeout(650);
    await press('KeyC');
    check('hatch permits reentry', !!await until(() => game.mapId === 'ship_lounge' && !game.dialogue.running && !game.transitioning, 10000));
    await shot('lounge_08_reentry');
  }
  await until(() => game.sound.bgm?.currentTime > 0.2 && game.sound.bgm.volume >= 0.39, 8000);
  const reentryAudio = await page.evaluate(() => ({ name: game.sound.bgmName ?? null, time: game.sound.bgm?.currentTime ?? null, volume: game.sound.bgm?.volume ?? null, paused: game.sound.bgm?.paused ?? null, muted: game.sound.muted }));
  await page.waitForTimeout(400);
  const reentryTime = await page.evaluate(() => game.sound.bgm?.currentTime ?? null);
  check('lounge reentry music plays audibly and advances', reentryAudio.name === 'ship_lounge' && reentryAudio.volume >= 0.39 && reentryAudio.paused === false && !reentryAudio.muted && reentryTime > reentryAudio.time + 0.2, JSON.stringify({ before: reentryAudio, after: reentryTime }));
  await fixture('restore-pre-castle-save-state', 'Remove only the lounge-test suppression flag before checking the ordinary pre-event save and Continue flow.', () => {
    game.setFlag('ship_castle_started', false);
    game.autosave();
  });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('subtarune.save.v1')));
  check('normal map entry saves lounge and ending flags', saved?.map === 'ship_lounge' && saved?.flags?.ship_ending_done, JSON.stringify(saved));
  await open();
  await until(() => window.game?.state === 'title', 15000);
  await press('KeyZ');
  for (let i = 0; i < 40 && await page.evaluate(() => game.title?.phase !== 'locked'); i++) {
    await press('KeyC'); await page.waitForTimeout(250);
  }
  await page.waitForTimeout(3300);
  await press('KeyC');
  check('real title Continue restores lounge without ending replay', !!await until(() => game.mapId === 'ship_lounge' && game.state === 'field' && !game.transitioning && !game.dialogue.running, 12000));
  await shot('lounge_09_continue');
  for (const [corner, x, y] of [['north_west', 40, 208], ['north_east', 698, 208], ['south_west', 40, 1080], ['south_east', 698, 1080]]) {
    await fixture(`camera-${corner}`, 'Prepare a safe room corner only for boundary and asset visual inspection.', ({ x, y }) => {
      game.player.x = x; game.player.y = y; game.camera.snap();
    }, { x, y });
    await page.waitForTimeout(200);
    await shot(`lounge_${corner}`);
  }
});
