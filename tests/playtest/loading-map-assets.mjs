import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'loading-map-assets' }, async ({ page, check, until, open, shot }) => {
  await open({ qa: 'ship_control_after' });
  const ready = await until(() => window.game?.mapId === 'youngcle20' && !!game.map && !game.loadingMap, 20000);
  check('cold QA jump commits the control map', !!ready);
  const assets = await page.evaluate(async () => {
    const sprite = name => !!game.spriteOverrides[name]?.naturalWidth;
    const portraitName = 'youngcle_tv_smirk';
    const portraitImage = await game.mapAssets.imagePromises.get(`assets/portraits/${portraitName}.png`);
    return {
      powerup: sprite('youngcle_powerup'),
      tvform: sprite('youngcle_tvform'),
      powerupMotion: !!game.characterMotions.youngcle_powerup?.rise?.frames?.length,
      tvformMotion: !!game.characterMotions.youngcle_tvform?.idle?.frames?.length,
      portraitPng: !!portraitImage?.naturalWidth,
      portraitCanvas: !!game.portraits[portraitName]?.width,
      vortex: !!game.propImages['assets/fx/mankatsuki-vortex.png']?.naturalWidth,
      transitioning: game.transitioning,
    };
  });
  check('cold map has scripted sprites and motions before entry', assets.powerup && assets.tvform && assets.powerupMotion && assets.tvformMotion, JSON.stringify(assets));
  check('TV dialogue portrait is the loaded PNG, not a generated fallback', assets.portraitPng && assets.portraitCanvas, JSON.stringify(assets));
  check('vortex FX is ready before its scripted cue', assets.vortex, JSON.stringify(assets));
  check('map loading gate has released', !assets.transitioning, JSON.stringify(assets));
  await shot('control-room-ready');

  await open({ params: { map: 'room', spawn: 'bed' } });
  const room = await until(() => window.game?.mapId === 'room' && !game.loadingMap, 20000);
  check('cold room map commits after its scripted sounds are prepared', !!room);
  const sounds = await page.evaluate(() => ({ white: !!game.sound.files.white, plug: !!game.sound.files.plug }));
  check('opening white and computer plug use their file samples on first use', sounds.white && sounds.plug, JSON.stringify(sounds));
  await shot('room-first-use-sfx-ready');
});
