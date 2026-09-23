import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { Battle } from '../../src/battle/battle.js';
import { ENEMIES } from '../../src/data/enemies.js';

const root = new URL('../../', import.meta.url);
const source = new URL('assets/source/choimis-yellow297/', root);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', source), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('test_choimis_yellow_audio_retains_exact_originals_and_runtime_assets', () => {
  assert.equal(manifest.revision, '154f9a97b8f18fa6974e917c4c4e774bde6b7eba');
  assert.deepEqual(manifest.assets.map(asset => asset.key), ['yellowheart_charge', 'yellowheart_shot', 'yellowheart_shot_big']);
  for (const asset of manifest.assets) {
    const wav = fs.readFileSync(new URL(asset.original, source));
    const mp3 = fs.readFileSync(new URL(asset.runtime, root));
    assert.equal(sha256(wav), asset.sourceSha256, `${asset.key} original changed`);
    assert.equal(sha256(mp3), asset.runtimeSha256, `${asset.key} runtime changed`);
    assert.equal(mp3.length, asset.bytes);
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt32LE(24), 44100);
    assert.equal(wav.readUInt16LE(22), 1);
  }
});

test('test_choimis_yellow_audio_preloads_original_event_sounds_and_recorded_preamble_before_intro', async () => {
  const calls = [];
  let finishPreload;
  const pending = new Promise(resolve => { finishPreload = resolve; });
  const battle = Object.assign(Object.create(Battle.prototype), {
    cfg: { seamlessIntro: 'choimis_sky' }, state: 'load', members: [], support: null,
    enemies: [{ id: 'choimis_flower', def: { ...ENEMIES.choimis_flower, actions: {}, projectiles: {} } }],
    preparedRapVideo: { ready: Promise.resolve(true) }, loadEnemyImage: async () => ({}),
    game: { sound: { loadSfxFiles(keys) { calls.push(keys); return pending; } } },
  });
  const loading = battle.load();
  assert.equal(calls.length, 1);
  for (const key of ['yellowheart_charge', 'yellowheart_shot', 'yellowheart_shot_big', 'choimis_chosouya']) {
    assert.ok(calls[0].includes(key), `${key} must preload before the battle intro`);
  }
  assert.equal(battle.state, 'load');
  finishPreload();
  await loading;
  assert.equal(battle.state, 'intro');
  const originalEvent = fs.readFileSync(new URL('code/obj_heart-Step_0.gml', source), 'utf8');
  const yellowEvent = originalEvent.slice(originalEvent.indexOf('if (color == 1)'));
  assert.match(yellowEvent, /snd_play\(snd_heartshot_dr_b\)/);
  assert.match(yellowEvent, /snd_loop\(snd_chargeshot_charge\)/);
  assert.match(yellowEvent, /snd_play\(snd_chargeshot_fire\)/);
});
