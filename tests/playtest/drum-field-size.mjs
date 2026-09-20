import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'drum-field-size', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, until, press, shot }) => {
  await open({ qa: 'jjajang_nest_center' });
  check('nest starts ready for the real barrel interaction', await until(() => window.game?.mapId === 'jjajang_nest' && !window.game.dialogue.running, 30000));
  await page.keyboard.down('ArrowRight');
  check('player reaches the interaction barrel', await until(() => {
    const g = window.game, drum = g.entities.find(entity => entity.id === 'jjajang_nest_drum');
    return g.player.x + g.player.w >= drum.x - 8;
  }, 8000));
  await page.keyboard.up('ArrowRight');

  const line = async text => {
    await page.waitForFunction(value => window.game.textbox.node?.text === value, text, { timeout: 15000 });
    if (await page.evaluate(() => window.game.textbox.state === 'typing')) await press('KeyC', { delay: 70 });
    await press('KeyC', { delay: 70 });
  };
  await press('KeyC', { delay: 70 });
  await line('* ....');
  await line('* 드럼통이다.');
  await page.waitForFunction(() => window.game.textbox.node?.text === '* 드럼통을 두드려볼까?');
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) await press('KeyC', { delay: 70 });
  await page.waitForTimeout(500);
  await press('KeyC', { delay: 70 });

  check('backstepping player remains in the field viewport', await until(() => {
    const g = window.game, drum = g.entities.find(entity => entity.id === 'jjajang_nest_drum');
    const player = g.player;
    return player.moving && player.facing === 'right' && player.x < drum.x - 65
      && player.x + player.w > g.camera.x && player.x < g.camera.x + 480
      && player.y + player.h > g.camera.y && player.y < g.camera.y + 230;
  }, 8000));
  await shot('before-reveal-backstep');
  await line('* 조사받.. 고 가..냐 이년아.');
  await line('* 니 친정엄마 ㅆ 2발년아.');
  await page.waitForFunction(() => window.game.textbox.node?.text === '* 드럼통의 악마인 것 같다.', null, { timeout: 15000 });

  const bounds = await page.evaluate(() => {
    const g = window.game, boss = g.entities.find(entity => entity.id === 'drum_devil');
    const root = [boss.x + boss.w / 2 - g.camera.x, boss.y + boss.h - g.camera.y];
    return ['roar', 'throw'].flatMap(name => g.characterMotions.drum_devil[name].frames.map((frame, index) => {
      const surface = document.createElement('canvas');
      surface.width = frame.image.width;
      surface.height = frame.image.height;
      const context = surface.getContext('2d');
      context.drawImage(frame.image, 0, 0);
      const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
      let left = surface.width, top = surface.height, right = 0, bottom = 0;
      for (let y = 0; y < surface.height; y++) for (let x = 0; x < surface.width; x++) if (pixels[(y * surface.width + x) * 4 + 3]) {
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
      const scale = g.characterMotions.drum_devil[name].scale * 1.43 * (boss.def.visualScale || 1);
      return { name, index, left: root[0] + (left - frame.pivot[0]) * scale, top: root[1] + (top - frame.pivot[1]) * scale,
        right: root[0] + (right - frame.pivot[0]) * scale, bottom: root[1] + (bottom - frame.pivot[1]) * scale };
    }));
  });
  check('all actual roar and throw alpha bounds fit above dialogue', bounds.every(rect => rect.left >= 0 && rect.top >= 0 && rect.right <= 480 && rect.bottom <= 230), JSON.stringify(bounds));
  await shot('narration-framing');
  await line('* 드럼통의 악마인 것 같다.');
  await line('* 압도적인 포스에 몸이 떨려온다.');
  await line('* 죽음의 공포가 나를 감싼다.');
  await line('* 그럼에도 나는 포기할 수 없다.');
  await line('* 쓰러트려야할 것 같다.');
  await line('* 나는 자세를 고쳐잡았다');
  check('larger field roar begins after the final narration', await until(() => !!window.game.entities.find(entity => entity.id === 'drum_devil').motion, 4000));
  await shot('after-scale-roar');
  check('one barrel launches while the field remains active', await until(() => window.game.entities.some(entity => entity.id === 'drum_devil_intro_barrel' && !entity.dead) && !window.game.battle, 7000));
  await shot('throw-framing');
});
