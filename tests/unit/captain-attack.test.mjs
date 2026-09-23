import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { clearEditorUnionStage } from '../../src/scenes/editor-union-effects.js';
import { clearChoimisFlowerEffects } from '../../src/data/cutscenes/choimis_flower.js';
import { clearChoimisSky } from '../../src/scenes/choimis-sky-intro.js';
import { clearLoungeBriefing } from '../../src/data/cutscenes/ship_lounge_briefing.js';
import { finishChoimisRescue } from '../../src/scenes/choimis-rescue.js';
import { captain_attack as nodes } from '../../src/data/cutscenes/captain_attack.js';
import { SHIP_ASSAULT } from '../../src/data/ship-assault.js';
import { ShipAssault } from '../../src/scenes/ship-assault.js';
import { Entity, Character, Camera, TileMap, freeSpot, SCREEN_H, CHAR_SCALE } from '../../src/world/world.js';
import { TextBox, ScriptRunner } from '../../src/ui/dialogue.js';
import { makeWaiter } from '../../src/ui/cutscene.js';

const mainSource = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const Game = runInNewContext(mainSource.slice(mainSource.indexOf('class Game {'), mainSource.indexOf('// ── 부트')) + '\nGame;', {
  ShipAssault, SHIP_ASSAULT, freeSpot, SCREEN_H, clearEditorUnionStage, clearChoimisFlowerEffects, clearChoimisSky,
  clearLoungeBriefing, finishChoimisRescue,
});

test('test_captain_attack_preserves_user_dialogue_and_has_no_battle_reward_or_party_change', () => {
  assert.deepEqual(nodes.filter(n => n.text).map(n => n.text), [
    '* 무 무슨일이야?', '* 혀 형 ㅈ됐어요', '* ???',
    '* 지 지금 누군가가 저희 전함을 공격하기 시작했어요!!!', '* 뭐 뭐얏? 누 누구지',
    '* 저 저건...', '* 또다른전함이에요!!', '* 뭐 뭐야 저게?!!!',
    '* ㅃ 빨리 갑판으로 가봐야겠어. 젠장', '* 혀 형 같이가요..!', '* 형 저희도 빨리 가보죠',
  ]);
  assert.equal(nodes.some(n => n.battle || n.join || n.leave || n.money || n.map), false);
  assert.deepEqual(nodes.filter(n => n.bgm).map(n => n.bgm), [SHIP_ASSAULT.bgm]);
});

test('test_captain_attack_first_impact_reacts_four_and_second_hop_reacts_five', () => {
  const emotes = nodes.find(n => n.parallel?.some(child => child.emote));
  assert.deepEqual(emotes.parallel.map(n => n.emote), ['player', 'gyeongsub', 'ppaman', 'captain_junhee_restored']);
  const hops = nodes.find(n => n.parallel?.some(child => child.hop));
  assert.equal(hops.parallel.length, 5);
  assert.ok(hops.parallel.every(n => n.sfx === false));
});

test('test_captain_attack_starts_only_after_aftermath_and_marks_done_after_last_dialogue', () => {
  assert.equal(nodes[0].if({}), true);
  assert.equal(nodes[0].if({ captain_aftermath_done: true }), false);
  assert.equal(nodes[0].if({ captain_aftermath_done: true, captain_attack_done: true }), true);
  const started = nodes.findIndex(n => n.set?.captain_attack_started);
  const finished = nodes.findIndex(n => n.set?.captain_attack_done);
  assert.ok(started < nodes.findIndex(n => n.text));
  assert.ok(finished > nodes.findLastIndex(n => n.text));
  assert.ok(finished > nodes.findLastIndex(n => n.remove));
  assert.equal(nodes.filter(n => n.set?.captain_attack_done).length, 1);
});

test('test_captain_attack_runner_finishes_all_beats_with_party_and_reward_intact', () => {
  const game = {
    flags: { captain_aftermath_done: true }, party: ['gyeongsub', 'ppaman'], money: 1140,
    background: [], propImages: {}, time: 0,
    map: { pxW: 864, pxH: 576, solidRect: () => false },
    ctx: { measureText: text => ({ width: [...text].length * 16 }) },
    sound: { sfx() {}, preloadBgm() {}, playBgm() {}, blip() {} },
    camera: { target: null, locked: false },
    setFlag(key, value) { this.flags[key] = value; },
    fadeTo(alpha, duration, cb) { cb(); },
    startShipAssault() { this.shipAssault = new ShipAssault(this); },
    finishShipAssault() { this.shipAssault.dispose(); this.shipAssault = null; },
  };
  game.entities = [
    { id: 'player', x: 420, y: 364 },
    { id: 'gyeongsub', x: 484, y: 364, type: 'follower' },
    { id: 'ppaman', x: 356, y: 364, type: 'follower' },
    { id: 'captain_junhee_restored', x: 420, y: 274 },
    { id: 'captain_attack_yongjun', x: 420, y: 656, hidden: true, solid: false },
    { id: 'captain_helm', x: 676, y: 226, w: 128, h: 28, solid: false },
    { id: 'captain_to_saloon', x: 396, y: 490, w: 72, h: 36, solid: false },
  ].map(def => new Entity(def, game));
  for (const actor of game.entities) { actor.faceToward = Character.prototype.faceToward; actor.snapBehind = () => {}; }
  game.player = game.entities[0];
  game.textbox = new TextBox(game.sound, {});
  game.dialogue = new ScriptRunner(game.textbox, game);
  const seen = new Set(), beats = new Set();
  game.dialogue.start(nodes);
  for (let tick = 0; tick < 8000 && game.dialogue.running; tick++) {
    game.time += 0.025;
    game.shipAssault?.update(0.025);
    if (game.shipAssault) beats.add(game.shipAssault.beat);
    game.dialogue.update(0.025, { just: key => key === 'confirm' && tick % 5 === 0 });
    if (game.textbox.isOpen) seen.add(game.textbox.node.text);
  }
  assert.equal(game.dialogue.running, false);
  assert.equal(seen.size, 11);
  assert.deepEqual([...beats], ['room', 'ocean', 'reveal', 'approach', 'bridge', 'return']);
  assert.equal(game.flags.captain_attack_done, true);
  assert.equal(game.shipAssault, null);
  assert.equal(game.entities.find(e => e.id === 'captain_junhee_restored').dead, true);
  assert.equal(game.entities.find(e => e.id === 'captain_attack_yongjun').dead, true);
  assert.equal(game.money, 1140);
  assert.deepEqual(game.party, ['gyeongsub', 'ppaman']);
});

test('test_captain_attack_real_start_handles_reserved_player_and_spawns_yongjun_below_view', () => {
  const room = JSON.parse(readFileSync(new URL('../../assets/maps/maillard_captain.json', import.meta.url), 'utf8'));
  const game = Object.assign(Object.create(Game.prototype), {
    propImages: {}, spriteOverrides: {}, sound: { preloadBgm() {} }, map: new TileMap(room),
  });
  game.entities = room.entities.filter(e => !['captain_junhee', 'captain_mankatsuki', 'captain_shadow'].includes(e.id))
    .map(def => new Entity({ ...def }, game));
  game.player = new Entity({ type: 'player', sprite: 'hyungsub', x: 420, y: 376 }, game);
  game.entities.push(game.player, ...['gyeongsub', 'ppaman'].map(id => new Entity({ type: 'follower', id, sprite: id, x: 420, y: 430 }, game)));
  game.spawn = def => { const entity = new Entity(def, game); game.entities.push(entity); return entity; };
  game.camera = new Camera(); game.camera.map = game.map; game.camera.target = game.player;
  assert.equal(game.player.id, null);
  game.startShipAssault();
  assert.ok(game.shipAssault instanceof ShipAssault);
  const yongjun = game.entities.find(e => e.id === 'captain_attack_yongjun');
  assert.equal(yongjun.visible, false);
  assert.ok(yongjun.y - 80 >= game.camera.y + SCREEN_H);
  for (const actor of [game.player, ...game.entities.filter(e => ['gyeongsub', 'ppaman', 'captain_junhee_restored'].includes(e.id))]) {
    assert.ok(Number.isFinite(actor.x) && Number.isFinite(actor.y));
    assert.equal(game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false);
    assert.equal(game.entities.some(e => e !== actor && e.def.type === 'prop' && e.solid && e.overlaps(actor.rect)), false);
  }
  const arrival = makeWaiter(game, nodes.find(n => n.move === 'captain_attack_yongjun'));
  let arrived = false;
  for (let i = 0; i < 200 && !arrived; i++) arrived = arrival.update(0.025);
  assert.equal(arrived, true);
  const spriteWidth = actor => {
    const png = readFileSync(new URL(`../../assets/sprites/${actor.def.sprite}.png`, import.meta.url));
    return Math.round(png.readUInt32BE(16) / 4 / 2 * CHAR_SCALE);
  };
  const gyeongsub = game.entities.find(e => e.id === 'gyeongsub');
  const yongjunLeft = yongjun.x + yongjun.w / 2 - spriteWidth(yongjun) / 2;
  const gyeongsubRight = gyeongsub.x + gyeongsub.w / 2 + spriteWidth(gyeongsub) / 2;
  assert.ok(yongjunLeft - gyeongsubRight >= 20);
  const old = game.shipAssault;
  game.startShipAssault();
  assert.equal(old.disposed, true);
  assert.equal(game.entities.filter(e => e.id === 'captain_attack_yongjun').length, 1);
  game.dialogue = { script: nodes, wait: { update() {} }, onEnd() {} };
  game.background = [{ update() {} }];
  let closed = false;
  game.textbox = { close() { closed = true; } };
  game.finishShipAssault(true);
  assert.equal(game.shipAssault, null);
  assert.equal(game.dialogue.script, null);
  assert.equal(game.dialogue.wait, null);
  assert.equal(game.dialogue.onEnd, null);
  assert.equal(game.background.length, 0);
  assert.equal(closed, true);
});
