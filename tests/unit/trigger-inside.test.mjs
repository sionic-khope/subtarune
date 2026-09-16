// 트리거/문 진입 규칙(BUILD194): 페이드·대사 중에 이미 안에 서 있던 플레이어는 끝나는 순간 발동한다.
// 이어하기로 문 자리에서 시작한 세이브(이전 빌드에서 수로 끝 벽에 서 있다 저장 → 새 빌드에서 그 자리에 문)가 걸어 나갔다 들어오기 전엔 영영 안 열리던 것.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Trigger } from '../../src/world/world.js';

const makeGame = () => {
  const game = { flags: {}, transitioning: true, dialogue: { running: false }, scripts: [],
    has(k) { return !!this.flags[k]; }, setFlag(k) { this.flags[k] = true; },
    runScript(name, done) { this.scripts.push(name); if (done) done(); } };
  game.player = { x: 100, y: 100, w: 24, h: 16, overlaps(r) { return this.x < r.x + r.w && this.x + this.w > r.x && this.y < r.y + r.h && this.y + this.h > r.y; } };
  return game;
};

test('test_trigger_fires_once_transition_ends_even_if_player_started_inside', () => {
  const game = makeGame();
  const trig = new Trigger({ type: 'trigger', x: 96, y: 96, w: 16, h: 32, script: 'go' }, game);
  trig.update(1 / 60); trig.update(1 / 60);
  assert.deepEqual(game.scripts, [], '페이드 중엔 발동하지 않는다');
  game.transitioning = false;
  trig.update(1 / 60);
  assert.deepEqual(game.scripts, ['go'], '페이드가 끝나면 안에 서 있던 채로 발동');
  for (let i = 0; i < 60; i++) trig.update(1 / 60);
  assert.deepEqual(game.scripts, ['go'], '안에 계속 서 있어도 다시 발동하지 않는다');
  game.player.x = 200; trig.update(1 / 60);
  game.player.x = 100; trig.update(1 / 60);
  assert.deepEqual(game.scripts, ['go', 'go'], '나갔다 다시 들어오면 발동');
});

test('test_trigger_waits_out_dialogue_and_respects_unless', () => {
  const game = makeGame(); game.transitioning = false; game.dialogue.running = true;
  const trig = new Trigger({ type: 'trigger', x: 96, y: 96, w: 16, h: 32, script: 'go', unless: 'done' }, game);
  trig.update(1 / 60);
  assert.deepEqual(game.scripts, []);
  game.dialogue.running = false; trig.update(1 / 60);
  assert.deepEqual(game.scripts, ['go'], '대사가 끝나면 발동');
  game.player.x = 200; trig.update(1 / 60); game.flags.done = true; game.player.x = 100; trig.update(1 / 60);
  assert.deepEqual(game.scripts, ['go'], 'unless 플래그가 서면 밟아도 발동하지 않는다');
});
