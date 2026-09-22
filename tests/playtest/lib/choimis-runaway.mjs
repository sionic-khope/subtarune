import fs from 'node:fs';
import path from 'node:path';

export async function verifyRunaway({ page, check, shot, until, press, fixture }, before, begin = async () => {}) {
  const state = () => page.evaluate(() => {
    const g = window.game;
    const actor = id => {
      const e = id === 'player' ? g.player : g.entities.find(e => e.id === id && !e.dead);
      return e && { x: e.x, y: e.y, spin: e.spin || 0, hopY: e.hopY || 0, visible: e.visible, sprite: e.def.sprite, facing: e.facing };
    };
    return { map: g.mapId, text: g.textbox.node?.text, box: g.textbox.state, index: g.dialogue.i, waiting: !!g.dialogue.wait, running: g.dialogue.running,
      flags: g.flags, party: g.party, hp: g.partyHp, inventory: g.inventory, money: g.money, bgm: g.sound.bgmName, zoom: g.worldZoom,
      player: actor('player'), choimis: actor('choimis_runaway'), domi: actor('domijorim_scene'), ppaman: actor('ppaman_scene'), gyeongsub: actor('gyeongsub_scene'),
      smoke: g.darkSmoke && { mode: g.darkSmoke.mode, veil: g.darkSmoke.veil }, fade: g.fade.alpha };
  });
  const next = async () => {
    const s = await state();
    for (let i = 0; i < 3; i++) {
      await press('KeyC', { delay: 60 }); await page.waitForTimeout(140);
      const t = await state();
      if (s.index !== t.index || s.text !== t.text || !t.running) return;
    }
  };
  const widths = async label => {
    for (const width of [375, 768, 1280]) {
      await page.setViewportSize({ width, height: 780 }); await page.waitForTimeout(120);
      check(`${label} viewport ${width} contains canvas`, await page.evaluate(() => {
        const r = document.querySelector('canvas').getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth;
      }));
      await shot(`runaway_${label}_${width}`);
    }
    await page.setViewportSize({ width: 1000, height: 780 });
  };
  const text = async needle => {
    for (let i = 0; i < 700; i++) {
      const s = await state();
      if (s.box !== 'closed' && s.text?.includes(needle)) {
        await press('KeyX', { delay: 50 }); await page.waitForTimeout(80); return state();
      }
      if (s.box !== 'closed' && !s.waiting) await next();
      else await page.waitForTimeout(70);
    }
    await shot('runaway_failure');
    throw new Error(`runaway line not reached: ${needle} ${JSON.stringify(await state())}`);
  };
  await fixture('runaway-render-observer', 'Record actual render frames and audio-object continuity across the live montage and physical contacts; do not change time, inputs or actors.', () => {
    const g = window.game, draw = g.draw;
    window.runawayObserved = { maps: [], images: {}, frames: [], stableMusic: true, chaseAudio: null };
    g.draw = function(...args) {
      const result = draw.apply(this, args), out = window.runawayObserved;
      const get = id => this.entities.find(e => e.id === id && !e.dead);
      const c = get('choimis_runaway');
      if (!c) return result;
      const tree = get('sakura5_giant_tree'), bowl = get('runaway_bowl'), d = get('domijorim_scene');
      const p = this.player;
      if (this.sound.bgmName === 'baron_intro') {
        if (!out.chaseAudio) out.chaseAudio = this.sound.bgm;
        else if (out.chaseAudio !== this.sound.bgm) out.stableMusic = false;
      }
      const frame = { map: this.mapId, cx: c.x, cy: c.y, cspin: c.spin || 0, facing: c.facing, px: p.x, py: p.y,
        pspin: p.spin || 0, phop: p.hopY || 0, bowl: !!bowl && bowl.visible, bx: bowl?.drawX, by: bowl?.drawY,
        k: !!get('gyeongsub_scene'), pp: !!get('ppaman_scene'), d: !!d, dx: d?.x, eaten: !!this.flags.choimis_jjajang_eaten };
      out.frames.push(frame);
      const cap = name => { if (!out.images[name]) out.images[name] = this.canvas.toDataURL('image/png'); };
      if (c.moving && this.fade.alpha < 0.05 && this.sound.bgmName === 'baron_intro' && this.mapId !== 'jjajang_sakura5') {
        if (!out.maps.includes(this.mapId)) out.maps.push(this.mapId);
        cap(`montage_${this.mapId}`);
      }
      if (tree && Math.abs(tree.flyX || 0) > 30) cap('tree_flying');
      if (this.mapId === 'jjajang_sakura5' && p.visible && p.hopY > 30 && p.hopY < 260) cap('yop_falling');
      if (bowl?.visible && bowl.spin > 0.5 && bowl.hopY > 2) cap('bowl_rolling');
      if (d && this.camera.x < 1450) cap('domi_reveal');
      if (d && c.spin < -0.5 && c.spin > -1.5 && bowl?.visible) cap('domi_bowl_collision');
      if (this.flags.choimis_jjajang_eaten && c.spin < -1.5 && !this.darkSmoke) cap('bowl_consumed');
      if (this.darkSmoke?.veil >= 0.39 && c.jitter?.amp === 3) cap('aura_growing');
      if (this.fade.color === '255,255,255' && this.fade.alpha > 0.96) {
        const ctx = this.canvas.getContext('2d');
        out.whitePixels = [[0.2, 0.2], [0.5, 0.5], [0.8, 0.8]].map(([x, y]) => [...ctx.getImageData(Math.floor(this.canvas.width * x), Math.floor(this.canvas.height * y), 1, 1).data]);
        cap('alpha_white');
      }
      return result;
    };
  });
  await begin();
  let s = await text('어 괜 괜찮아요?');
  check('tree crash reunites physically nearby NPCs after Yop lands', s.map === 'jjajang_sakura5' && s.flags.choimis_tree_crashed && s.player.visible && s.player.spin === 0 && Math.hypot(s.ppaman.x - s.player.x, s.ppaman.y - s.player.y) < 95 && Math.hypot(s.gyeongsub.x - s.player.x, s.gyeongsub.y - s.player.y) < 95);
  await shot('runaway_01_reunion');
  await widths('reunion');
  await text('기껏 도망쳤더니'); await shot('runaway_02_complaint');
  await text('짜..장면?'); await shot('runaway_03_bowl_closeup');
  check('bowl is still owned before the actual collision', (await state()).inventory.includes('어둠의 짜장면'));
  await text('네 안먹어요'); await shot('runaway_04_refusal');
  await next();
  check('group silent bubbles exist after refusal', await until(() => Array.isArray(window.game.bubble.target) && window.game.bubble.target.length === 4 && !window.game.bubble.done, 5000));
  await shot('runaway_05_group_silence');
  await text('다이어트하려구요.');
  check('music stops for the diet joke', !(await state()).bgm);
  await shot('runaway_06_diet');
  await text('내 짜장면'); s = await state();
  check('Choimis lands back-facing on bowl and consumes it only here', s.choimis.facing === 'up' && s.choimis.spin < -1.5 && s.flags.choimis_jjajang_eaten && !s.inventory.includes('어둠의 짜장면'));
  await shot('runaway_07_domi_food');
  await text('진짜 ㅈ된거같은데요'); s = await state();
  check('Domi escapes before the existing dark aura begins', !s.domi && s.bgm === 'captain_reveal' && s.smoke && s.choimis.sprite === 'choimis');
  await shot('runaway_08_aura_start');
  await text('족쳐야죠.'); await shot('runaway_09_response');
  await text('흐흐흐 이 힘은..'); await shot('runaway_10_aura_strong');
  await widths('aura');
  await text('난 알파메일이 되는거야!!!'); await shot('runaway_11_alpha_line');
  await next();
  check('transformation cue reaches a white screen', await until(() => window.game.fade.color === '255,255,255' && window.game.fade.alpha > 0.96, 5000));
  await shot('runaway_12_white');
  check('ends at the requested transformation beat with control restored', await until(() => window.game.flags.choimis_runaway_done && !window.game.dialogue.running && window.game.fade.alpha < 0.01, 7000));
  const after = await state();
  check('HP money and solo party remain unchanged', JSON.stringify(after.hp) === JSON.stringify(before.hp) && after.money === before.money && JSON.stringify(after.party) === JSON.stringify(before.party));
  check('only dark jjajang is consumed; no invented character form', JSON.stringify(after.inventory) === JSON.stringify(before.inventory.filter(i => i !== '어둠의 짜장면')) && after.choimis.sprite === 'choimis' && after.player.spin === 0 && after.smoke?.veil === 0.3);
  await shot('runaway_13_pending_form');
  const observed = await page.evaluate(() => ({ ...window.runawayObserved, chaseAudio: undefined }));
  check('white cue renders white RGB at three separated canvas samples', observed.whitePixels?.length === 3 && observed.whitePixels.every(pixel => pixel.slice(0, 3).every(v => v >= 245)));
  check('three pink forest maps appear in requested travel order', JSON.stringify(observed.maps) === JSON.stringify(['jjajang_sakura8', 'jjajang_sakura7', 'jjajang_sakura6']));
  check('chase music uses the same audio element across all map cuts', observed.stableMusic);
  check('companions arrive only after Yop landed', observed.frames.filter(f => f.phop > 0).every(f => !f.k && !f.pp));
  check('food is visibly present immediately before consumption', observed.frames.some(f => f.bowl && f.cspin < -0.5 && !f.eaten));
  for (const required of ['tree_flying', 'yop_falling', 'bowl_rolling', 'domi_reveal', 'domi_bowl_collision', 'bowl_consumed', 'aura_growing', 'alpha_white']) check(`observed actual ${required} frame`, !!observed.images[required]);
  for (const [name, data] of Object.entries(observed.images)) fs.writeFileSync(path.join(process.env.SHOT_DIR, `runaway_observed_${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  await press('ArrowDown', { delay: 220 });
  check('normal movement resumes after final white cue', (await state()).player.y > after.player.y);
  await press('KeyV');
  check('final field menu opens normally', await until(() => window.game.state === 'menu', 2000));
  await shot('runaway_menu'); await press('KeyX');
  check('final field menu closes normally', await until(() => window.game.state === 'field', 2000));
  await press('Escape');
  check('normal Escape opens title after the sequence', await until(() => window.game.state === 'title' && !window.game.transitioning, 6000));
  await press('KeyC');
  await until(() => ['zoom', 'locked'].includes(window.game.title.phase), 6000);
  if (await page.evaluate(() => window.game.title.phase === 'zoom')) await press('KeyC');
  await until(() => window.game.title.phase === 'locked' && window.game.title.time > 3.3, 6000);
  await press('KeyC');
  check('normal title Continue restores completed Sakura5 save', await until(() => window.game.state === 'field' && window.game.mapId === 'jjajang_sakura5' && !window.game.dialogue.running && window.game.fade.alpha < 0.01, 15000));
  const continued = await state();
  check('Continue preserves consumption HP money solo identity and aura', continued.flags.choimis_runaway_done && !continued.inventory.includes('어둠의 짜장면') && JSON.stringify(continued.hp) === JSON.stringify(after.hp) && continued.money === after.money && JSON.stringify(continued.party) === JSON.stringify(after.party) && continued.player.sprite === after.player.sprite && continued.smoke?.veil === 0.3 && continued.choimis?.sprite === 'choimis');
  await shot('runaway_continue');
  await fixture('same-state-revisit', 'Reload the actual completed map state without changing flags, HP, inventory or party; verify persistent tree destruction and existing-form aura restoration.', async () => { await window.game.changeMap('jjajang_sakura5', 'after_runaway', true); });
  await until(() => !window.game.dialogue.running, 5000);
  s = await state();
  check('revisit does not respawn tree or food or replay story', s.flags.choimis_runaway_done && !s.running && !s.inventory.includes('어둠의 짜장면') && await page.evaluate(() => !window.game.entities.some(e => e.id === 'sakura5_giant_tree')));
  check('revisit retains the three NPCs and aura without a new form', s.choimis?.sprite === 'choimis' && s.gyeongsub && s.ppaman && s.smoke?.veil === 0.3);
  await shot('runaway_14_revisit');
}
