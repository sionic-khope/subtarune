import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'choimis-return' }, async ({ page, open, until, press, check, shot, fixture }) => {
  const sourceRoot = process.env.QA_SOURCE_ROOT || process.cwd();
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const boundSources = [];
  for (const file of ['assets/maps/ship_lounge.json', 'assets/maps/jjajang_night_cliff.json', 'assets/props/choimis-sealed.png', 'src/data/cutscenes/ship_lounge.js', 'src/data/cutscenes/jjajang_night_cliff.js', 'src/data/shops.js', 'src/data/items.js', 'src/data/locale/ko.js', 'src/core/shop.js', 'src/core/item-use.js', 'src/main.js', 'src/battle/battle.js', 'src/core/story.js', 'src/ui/shop.js', 'src/scenes/ship-pursuit-ambient.js']) {
    const response = await page.request.get(new URL(file, process.env.QA_BASE_URL).href);
    const hash = digest(readFileSync(path.join(sourceRoot, file)));
    assert.equal(response.status(), 200);
    assert.equal(digest(await response.body()), hash);
    boundSources.push({ file, hash });
    check(`served source ${file}`, true, hash);
  }
  const key = async code => {
    await press(code); await page.waitForTimeout(220);
    assert.ok(await until(() => game.state !== 'shop' || (!game.shop.waitForRelease && game.shop.lock === 0), 5000));
  };
  const field = async () => assert.ok(await until(() => window.game?.state === 'field' && !game.transitioning && !game.dialogue.running && game.fade.alpha === 0, 20000));
  const closeDialogue = async () => {
    for (let i = 0; i < 48 && await page.evaluate(() => game.dialogue.running); i++) await key('KeyC');
    await field();
  };
  const place = async (id, dx = 0, dy = 24) => fixture(`approach-${id}`, 'Place beside an existing interaction target; C itself remains real input.', ({ id, dx, dy }) => {
    const e = game.entities.find(e => e.id === id && !e.dead);
    game.player.x = e.x + dx; game.player.y = e.y + dy; game.player.facing = 'up';
    for (const actor of game.entities) if (actor.def?.type === 'follower') actor.snapBehind();
    game.camera.snap();
  }, { id, dx, dy });
  await open({ qa: 'choimis_return', waitUntil: 'domcontentloaded' });
  await field();
  check('postbriefed trio arrives in ship lounge and castle event stays completed', await page.evaluate(() => game.mapId === 'ship_lounge' && game.flags.choimis_rescued && game.flags.ship_lounge_briefed && game.flags.ship_castle_done && game.party.join(',') === 'gyeongsub,ppaman'));
  check('approved tied Choimis image and current companions loaded once', await page.evaluate(() => {
    const sealed = game.entities.find(e => e.id === 'lounge_choimis_sealed');
    return sealed?.image?.width === 55 && sealed.image.height === 90 && game.entities.some(e => e.id === 'lounge_return_youngcle') && game.entities.some(e => e.id === 'lounge_return_junhee') && !game.entities.some(e => e.id === 'lounge_return_yongjun');
  }));
  await place('lounge_return_junhee');
  await key('KeyC');
  check('Junhee immediately speaks postbriefing dialogue without rearranging party', await page.evaluate(() => game.dialogue.running && game.textbox.node?.text?.length > 3 && game.flags.ship_lounge_briefed));
  await key('KeyC');
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await shot(`lounge-dialogue-${width}`); }
  await closeDialogue();
  await place('lounge_choimis_sealed', 10, 25);
  await key('KeyC');
  check('sealed Choimis can be examined beside purple door', await page.evaluate(() => game.dialogue.running && game.textbox.node.text.includes('...')));
  await shot('lounge-choimis-sealed'); await closeDialogue();
  await fixture('save-return-stage', 'Persist the real post-return field through the existing autosave command.', () => game.autosave());
  await fixture('continue-return-stage', 'Reload that saved field through normal continueGame, not QA state reconstruction.', () => game.continueGame());
  await field();
  check('continue retains tied actor and does not replay castle or rescue', await page.evaluate(() => game.flags.choimis_rescued && game.entities.filter(e => e.id === 'lounge_choimis_sealed').length === 1 && !game.dialogue.running));
  await place('ship_lounge_ladder', 16, -22);
  await fixture('face-ladder', 'Face downward toward the ladder from its normal approach.', () => { game.player.facing = 'down'; });
  await key('KeyC');
  check('rescued rear ladder is locked by actual interaction', await page.evaluate(() => game.mapId === 'ship_lounge' && game.dialogue.running && !game.battle));
  await closeDialogue();
  check('rear lock returns control without entering the old control room', await page.evaluate(() => game.mapId === 'ship_lounge' && game.flags.choimis_rescued));
  await fixture('shop-affordability-and-greeting', 'Give100원 and mark the already-known shop greeting; purchases, cancellation and sales use real C/X/arrows.', () => { game.money = 100; game.setFlag('shop_yongjun_greeted'); });
  await fixture('approach-shop-counter', 'Place at the new local lounge storefront C approach. The existing Shop UI opens by real C without backtracking to another map.', () => {
    game.player.x = 148; game.player.y = 1092; game.player.facing = 'up'; game.camera.snap();
  });
  await key('KeyC');
  assert.ok(await until(() => game.state === 'shop' && game.shop.art && !game.shop.waitForRelease && game.shop.lock === 0, 15000));
  await key('KeyC');
  check('rescue shop shows stronger permanent upgrades and two10원 foods only', await page.evaluate(() => game.shop.products.map(i => i.id).join(',') === 'strong_vaseline,strong_cialis,hotdog,oil_tteokbokki' && game.shop.products.every(i => i.price === 10)));
  for (const width of [375, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); await shot(`shop-stock-${width}`); }
  await key('KeyC'); await key('KeyX');
  check('cancelled purchase does not debit money', await page.evaluate(() => game.money === 100 && game.shop.mode === 'browse'));
  const statsBefore = await page.evaluate(() => ({ attack: game.attack, hpBonus: game.hpBonus, hp: ['hyungsub', ...game.party].map(id => game.hpOf(id)) }));
  await key('KeyC'); await key('KeyC'); await shot('shop-purchased'); await key('KeyC');
  await key('ArrowDown'); await key('KeyC'); await key('KeyC'); await key('KeyC');
  check('both stronger upgrades apply permanently and never enter inventory', await page.evaluate(before => game.money === 80 && game.attack === before.attack + 1 && game.hpBonus === before.hpBonus + 20 && ['hyungsub', ...game.party].every((id, index) => game.hpOf(id) === before.hp[index] + 20) && !game.inventory.some(n => n.startsWith('더 강한')) && game.flags.shop_yongjun_strong_vaseline && game.flags.shop_yongjun_strong_cialis, statsBefore));
  await key('KeyC');
  check('stronger upgrade repeat is sold out without charging', await page.evaluate(() => game.money === 80 && game.shop.mode === 'message' && !game.shop.message.ok));
  await shot('shop-upgrade-sold-out'); await key('KeyC');
  await key('ArrowDown'); await key('KeyC'); await key('KeyC'); await key('KeyC');
  await key('ArrowDown');
  for (let i = 0; i < 2; i++) { await key('KeyC'); await key('KeyC'); await key('KeyC'); }
  check('repeatable foods are inventory items at10원 each', await page.evaluate(() => game.money === 50 && game.inventory.includes('핫도그') && game.inventory.filter(n => n === '기름떡볶이').length === 2));
  await key('KeyX'); await key('KeyX'); await field();
  for (const [item, slug, heal] of [['핫도그', 'hotdog', 150], ['기름떡볶이', 'tteokbokki', 100]]) {
    await fixture(`damaged-party-${slug}`, 'Set all party HP to1 for genuine field-menu healing, without consuming any item.', () => { for (const id of ['hyungsub', ...game.party]) game.partyHp[id] = 1; });
    const before = await page.evaluate(item => game.inventory.filter(n => n === item).length, item);
    const itemIndex = await page.evaluate(async item => (await import('./src/data/items.js')).plainItems(game.inventory).indexOf(item), item);
    await key('Tab'); await key('KeyC');
    for (let i = 0; i < itemIndex; i++) await key('ArrowDown');
    await key('KeyC'); await shot(`menu-target-${slug}`); await key('KeyC');
    check(`menu consumes ${slug} once and heals the correct members`, await page.evaluate(({ item, before, heal }) => game.hpOf('hyungsub') === Math.min(game.maxHpOf('hyungsub'), 1 + heal) && game.party.every(id => game.hpOf(id) === (item === '핫도그' ? 1 : Math.min(game.maxHpOf(id), 101))) && game.inventory.filter(n => n === item).length === before - 1, { item, before, heal }));
    await shot(`menu-heal-${slug}`); await key('KeyX'); await key('KeyX'); await field();
  }
  await key('KeyC'); assert.ok(await until(() => game.state === 'shop' && game.shop.mode === 'home' && !game.shop.waitForRelease && game.shop.lock === 0, 5000));
  await key('ArrowDown'); await key('KeyC');
  assert.ok(await until(() => game.shop.mode === 'sell' && game.shop.lock === 0, 5000));
  const sellIndex = await page.evaluate(() => game.inventory.indexOf('기름떡볶이'));
  for (let i = 0; i < sellIndex; i++) await key('ArrowDown');
  await key('KeyC'); await key('ArrowLeft'); await key('KeyC');
  check('new food sells for5원 without touching upgrade flags', await page.evaluate(() => game.money === 55 && !game.inventory.includes('기름떡볶이') && game.flags.shop_yongjun_cialis && game.flags.shop_yongjun_vaseline && game.flags.shop_yongjun_strong_cialis && game.flags.shop_yongjun_strong_vaseline));
  await shot('shop-sold'); await key('KeyX'); await key('KeyX'); await key('KeyX'); await field();
  check('shop closes back into field control', await page.evaluate(() => game.state === 'field' && !game.dialogue.running));
  const upgraded = await page.evaluate(() => ({ attack: game.attack, hpBonus: game.hpBonus }));
  await fixture('old300-inventory-continue', 'Prepare a historical300 inventory naming fixture and reload via production continueGame. Normalization must preserve count/order without awarding stats.', () => {
    game.autosave(); const save = JSON.parse(localStorage.getItem('subtarune.save.v1'));
    save.inventory = ['더 강한 바세린', '더 강한 씨알리스', '더 강한 바세린'];
    localStorage.setItem('subtarune.save.v1', JSON.stringify(save)); return game.continueGame();
  });
  await field();
  check('old300 inventory migrates into foods without applying upgrades again', await page.evaluate(before => game.inventory.join(',') === '핫도그,기름떡볶이,핫도그' && game.attack === before.attack && game.hpBonus === before.hpBonus && game.flags.shop_yongjun_strong_vaseline && game.flags.shop_yongjun_strong_cialis, upgraded));
  await fixture('legacy299-won-save', 'Adapt this test browser save to the prior shipped won-cliff state; normal continueGame must resume only rescue, never replay battle or rewards.', () => {
    game.autosave();
    const save = JSON.parse(localStorage.getItem('subtarune.save.v1'));
    save.story = { stage: 'ship_sinking_done' };
    save.map = 'jjajang_night_cliff'; save.spawn = 'from_west'; save.x = 36; save.y = 199;
    delete save.flags.choimis_rescued;
    delete save.flags.ship_lounge_briefed; delete save.flags.choimis_lounge_sealed; delete save.flags.ship_invasion_ready;
    save.flags.choimis_flower_won = true;
    save.flags.night_cliff_scene_started = true; save.flags.night_cliff_scene_done = true;
    localStorage.setItem('subtarune.save.v1', JSON.stringify(save));
    return game.continueGame();
  });
  assert.ok(await until(() => !!game.choimisRescue && game.textbox.node?.text?.includes('휴 드디어 잡았네요'), 20000));
  check('legacy won save resumes rescue, keeps money and has no battle', await page.evaluate(() => game.money === 55 && game.flags.choimis_flower_won && !game.flags.choimis_rescued && !game.battle));
  await key('KeyC'); await shot('legacy299-rescue-resume');
  await open({ qa: 'ship_lounge', waitUntil: 'domcontentloaded' });
  await field();
  await place('ship_lounge_ladder', 16, -22);
  await fixture('old-stage-face-ladder', 'Face the unchanged historical ladder approach before the rescue stage.', () => { game.player.facing = 'down'; });
  await key('KeyC'); await key('KeyC'); await page.waitForTimeout(600); await key('KeyC');
  check('historical pre-rescue ladder still returns to the control room', await until(() => game.mapId === 'youngcle20' && !game.transitioning && !game.dialogue.running, 20000));
  await shot('historical-ladder-route');
  await open({ qa: 'choimis_eating' });
  assert.ok(await until(() => game.battle?.state === 'intro', 20000));
  await fixture('battle-food-preparation', 'Prepare two real food items and injured party HP before input. Skip the previously covered opening; actual item menu and action queue perform consumption/healing.', () => {
    game.inventory = ['핫도그', '기름떡볶이']; game.battle.openingShown = true;
    game.battle.enemies[0].defenseBoosted = true; game.battle.members.forEach(m => { m.hp = 1; });
  });
  for (let i = 0; i < 20 && !await page.evaluate(() => game.battle.state === 'menu'); i++) await key('KeyC');
  for (let member = 0; member < 2; member++) {
    await key('ArrowRight'); await key('KeyC');
    if (member === 1) await key('ArrowDown');
    await key('KeyC');
    check(`battle food${member}: genuine target menu`, await page.evaluate(() => game.battle.state === 'item-target'));
    const targetShot = member ? 'battle-team-food-target' : 'battle-single-food-target';
    for (const width of [380, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await shot(`${targetShot}-${width}`);
    }
    await shot(targetShot); await key('KeyC');
  }
  await key('KeyC'); await key('KeyC');
  check('real battle action queue consumes both foods and caps healed HP', await until(() => !game.inventory.length && game.battle.members[0].hp === game.battle.members[0].maxHp && game.battle.members.slice(1).every(m => m.hp === 101), 7000));
  await shot('battle-food-heal');
  check('all bound return sources remain stable through the run', boundSources.every(({ file, hash }) => digest(readFileSync(path.join(sourceRoot, file))) === hash));
});
