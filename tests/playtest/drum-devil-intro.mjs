import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'drum-devil-intro', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } }, async ({ page, open, check, until, press, shot }) => {
  await open({ qa: 'jjajang_nest_center' });
  check('nest ready', await until(() => window.game?.mapId === 'jjajang_nest' && !window.game.dialogue.running, 30000));
  await page.waitForTimeout(600);
  await page.keyboard.down('ArrowRight');
  const reached = await until(() => {
    const g = window.game, drum = g.entities.find(e => e.id === 'jjajang_nest_drum');
    return g.player.x + g.player.w >= drum.x - 8;
  }, 8000);
  await page.keyboard.up('ArrowRight');
  check('walked up to real interaction barrel', reached);
  const state = () => page.evaluate(() => {
    const g = window.game;
    return { x: g.player.x, y: g.player.y, flags: { ...g.flags }, bgm: g.sound.bgmName, party: [...g.party], visible: g.entities.find(e => e.id === 'drum_devil').visible };
  });
  const line = async text => {
    await page.waitForFunction(value => window.game.textbox.node?.text === value, text, { timeout: 15000 });
    if (await page.evaluate(() => window.game.textbox.state === 'typing')) {
      await press('KeyC', { delay: 70 });
      await page.waitForTimeout(160);
    }
    await press('KeyC', { delay: 70 });
    await page.waitForTimeout(160);
  };
  const choice = async () => {
    await press('KeyC', { delay: 70 });
    await line('* ....');
    await line('* 드럼통이다.');
    await page.waitForFunction(() => window.game.textbox.node?.text === '* 드럼통을 두드려볼까?');
    if (await page.evaluate(() => window.game.textbox.state === 'typing')) await press('KeyC', { delay: 70 });
    await page.waitForTimeout(800);
  };
  const before = await state();
  check('solo progression and hidden demon', before.party.length === 0 && before.visible === false);
  await choice();
  await press('ArrowRight', { delay: 70 });
  await press('KeyC', { delay: 70 });
  check('no closes interaction', await until(() => !window.game.dialogue.running));
  check('no has no position flag music party or visibility side effect', JSON.stringify(await state()) === JSON.stringify(before));
  await choice();
  await press('KeyX', { delay: 70 });
  check('cancel closes interaction', await until(() => !window.game.dialogue.running));
  check('cancel has no side effects', JSON.stringify(await state()) === JSON.stringify(before));
  await choice();
  await shot('00-choice');
  await press('KeyC', { delay: 70 });
  check('exclamation follows the rumble', await until(() => !!window.game.player.emote, 12000));
  await shot('01-exclamation');
  check('backsteps left while looking right', await until(() => {
    const g = window.game, d = g.entities.find(e => e.id === 'jjajang_nest_drum');
    return g.player.moving && g.player.x < d.x - 65 && g.player.facing === 'right';
  }, 8000));
  await shot('02-backstep');
  await page.waitForFunction(() => window.game.textbox.node?.text === '* 조사받.. 고 가..냐 이년아.', null, { timeout: 15000 });
  check('mystery stays hidden through voice', (await state()).visible === false);
  await shot('03-mystery');
  await line('* 조사받.. 고 가..냐 이년아.');
  await line('* 니 친정엄마 ㅆ 2발년아.');
  check('slow white transition starts before reveal', await until(() => window.game.fade?.color === '255,255,255' && window.game.fade?.alpha > 0.3 && !window.game.entities.find(e => e.id === 'drum_devil').visible, 6000));
  await shot('04-white-transition');
  check('first roar uses demon motion', await until(() => !!window.game.entities.find(e => e.id === 'drum_devil').motion, 10000));
  await shot('05-first-roar');
  check('first roar ends', await until(() => !window.game.entities.find(e => e.id === 'drum_devil').motion, 5000));
  check('second roar follows', await until(() => !!window.game.entities.find(e => e.id === 'drum_devil').motion, 5000));
  await shot('06-second-roar');
  await page.waitForFunction(() => window.game.textbox.node?.text === '* 드럼통의 악마인 것 같다.', null, { timeout: 6000 });
  const framing = await page.evaluate(async () => {
    const { CHARACTERS } = await import('/src/data/characters.js');
    const g = window.game, e = g.entities.find(e => e.id === 'drum_devil');
    const c = CHARACTERS.drum_devil, scale = c.stillScale * 1.43;
    const x = e.x + e.w / 2 - c.stillPivot[0] * scale - g.camera.x;
    const y = e.y + e.h - c.stillPivot[1] * scale - g.camera.y;
    return { x, y, right: x + e.sprite.fw * scale, bottom: y + e.sprite.fh * scale, music: g.sound.bgmName, barrel: g.entities.find(e => e.id === 'jjajang_nest_drum').visible, party: g.party.length };
  });
  check('whole demon cell fits above dialogue', framing.x >= 0 && framing.y >= 0 && framing.right <= 480 && framing.bottom <= 230, JSON.stringify(framing));
  check('baron introduction music and solo state', framing.music === 'baron_intro' && framing.party === 0 && framing.barrel === false);
  if (await page.evaluate(() => window.game.textbox.state === 'typing')) await press('KeyC', { delay: 70 });
  await page.waitForTimeout(160);
  await shot('07-demon-narration');
  await line('* 드럼통의 악마인 것 같다.');
  await line('* 압도적인 포스에 몸이 떨려온다.');
  await line('* 죽음의 공포가 나를 감싼다.');
  await line('* 그럼에도 나는 포기할 수 없다.');
  check('standard drum devil battle starts', await until(() => window.game.battle?.enemies?.some(e => e.id === 'drum_devil'), 12000));
  await shot('08-battle');
});
