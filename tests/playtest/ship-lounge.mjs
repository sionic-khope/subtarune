import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'ship-lounge', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, check, until, open, press, shot, fixture }) => {
  const finish = async () => {
    for (let i = 0; i < 32 && await page.evaluate(() => game.dialogue.running); i++) {
      await press('KeyC');
      await page.waitForTimeout(180);
    }
    check('dialogue returns control', await page.evaluate(() => !game.dialogue.running));
  };
  const stand = async (id, offset = 0) => fixture(`approach-${id}-${offset}`, 'Place player just below this interaction for a C probe test; the central aisle is walked separately.', ({ id, offset }) => {
    const e = game.entities.find(e => e.id === id);
    game.player.x = e.x + e.w / 2 - game.player.w / 2 + offset;
    const bottom = e.y + e.h + 56 >= game.map.pxH;
    game.player.y = bottom ? e.y - game.player.h - 8 : e.y + e.h + 8;
    game.player.facing = bottom ? 'down' : 'up';
    game.camera.snap();
  }, { id, offset });
  await open({ qa: 'ship_lounge' });
  check('QA enters lounge', !!await until(() => window.game?.mapId === 'ship_lounge' && !game.transitioning && !game.dialogue.running, 20000));
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
  await page.keyboard.down('ArrowUp');
  const top = await until(() => game.player.y < 230, 10000);
  await page.keyboard.up('ArrowUp');
  check('actual up key traverses whole central aisle', !!top, String(await page.evaluate(() => game.player.y)));
  await shot('lounge_02_top');
  for (const offset of [-64, 0, 64]) {
    await stand('ship_lounge_grand_door', offset);
    await press('KeyC');
    check(`closed purple door reachable at offset ${offset}`, !!await until(() => game.dialogue.running, 1500));
    if (!offset) { await until(() => !!game.textbox.node?.text, 2500); await press('KeyC'); await page.waitForTimeout(150); await shot('lounge_03_door_text'); }
    await finish();
  }
  for (const id of loaded.npc) {
    await stand(id);
    await press('KeyC');
    check(`${id} talks through real C input`, !!await until(() => game.dialogue.running, 1500));
    await until(() => !!game.textbox.node?.text, 6000);
    await press('KeyC');
    await page.waitForTimeout(150);
    const framing = await page.evaluate(async id => {
      const { CHAR_SCALE } = await import('/src/world/world.js');
      const actors = [game.player, ...['gyeongsub', 'ppaman', id].map(id => game.entities.find(e => e.id === id))];
      const boxes = actors.map(e => {
        const scale = CHAR_SCALE * (e.def.visualScale || 1) / e.sprite.px;
        const w = Math.round(e.sprite.fw * scale), h = Math.round(e.sprite.fh * scale);
        return { x: Math.round(e.x + e.w / 2 - w / 2), y: Math.round(e.y + e.h - h), w, h };
      });
      return { boxes, overlap: boxes.some((a, i) => boxes.slice(i + 1).some(b => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)) };
    }, id);
    check(`${id} conversation sprites remain separate`, !framing.overlap, JSON.stringify(framing));
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
  check('lounge selected BGM is active', !!await until(() => game.sound.bgmName === 'ship_lounge' && game.sound.bgm?.currentTime > 0, 8000));
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
