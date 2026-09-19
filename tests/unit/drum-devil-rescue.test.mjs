import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrumDevilRescue, drawDrumDevilHero, drawDrumDevilSpeech, loadDrumDevilRescue } from '../../src/battle/support/drum-devil-rescue.js';
import { DRUM_DEVIL_RESCUE as C } from '../../src/data/drum-devil-rescue.js';

const input = { just: () => true }, still = { just: () => false };
function harness() {
  const calls = [], lines = [];
  const battle = {
    enemies: [{ id: 'drum_devil', x: 340, y: 224 }],
    members: [{ id: 'hyungsub', hp: 1, home: [100, 200] }], typed: true,
    showLine(line) { lines.push(line); this.text = line.text; }, setText(text) { this.text = text; },
    sfx(key) { calls.push(key); },
    game: { sound: { stopBgm: x => calls.push(['stop', x]), preloadBgm() {}, playBgm: key => calls.push(key) } },
  };
  let completed = 0;
  const scene = createDrumDevilRescue(battle, { onComplete: () => completed++ });
  const advance = phase => {
    for (let i = 0; i < 300 && scene.snapshot.phase !== phase; i++) scene.update(0.05, input);
    assert.equal(scene.snapshot.phase, phase);
  };
  return { battle, calls, lines, scene, advance, completed: () => completed };
}

test('rescue preserves HP, waits two seconds, hits once, and completes after final dialogue', () => {
  const h = harness(); h.advance('silence');
  h.scene.update(1.99, still); assert.equal(h.scene.snapshot.phase, 'silence');
  h.scene.update(0.01, still); assert.equal(h.scene.snapshot.phase, 'flag');
  const y = h.scene.snapshot.flagY;
  h.scene.update(0.3, still); const x = h.scene.snapshot.flagX;
  h.scene.update(0.3, still); assert.ok(h.scene.snapshot.flagX > x); assert.equal(h.scene.snapshot.flagY, y);
  h.advance('surprise'); assert.equal(h.calls.filter(c => c === 'hit').length, 1);
  assert.equal(h.scene.snapshot.pose, 'surprised');
  h.advance('ready'); assert.equal(h.completed(), 0); assert.equal(h.battle.members[0].hp, 1);
  assert.equal(h.scene.update(0.2, input), true); assert.equal(h.completed(), 1);
  h.scene.update(1, input); assert.equal(h.completed(), 1);
  assert.deepEqual(h.lines, [...C.narration, ...C.greeting, ...C.introduction, ...C.ready]);
  for (const cue of ['janitor_hero', 'laugh_janitor', 'spearappear', 'wing', 'impact']) assert.ok(h.calls.includes(cue), cue);
});

test('disposing a rescue cannot complete it or start later audio', () => {
  const h = harness(); h.advance('reveal'); h.scene.dispose();
  const cues = h.calls.length; h.scene.update(99, input);
  assert.equal(h.calls.length, cues); assert.equal(h.completed(), 0);
});

test('hero holds kicks and loads the dedicated laugh pose', async () => {
  const assets = await loadDrumDevilRescue(async src => ({ src }));
  assert.equal(assets.laugh.src, 'assets/battle/janitor-hero-laugh.png');
  assert.equal(assets.stand.src, 'assets/battle/janitor-hero-stand.png');
  assert.equal(assets.lookback.src, 'assets/battle/yoplait-lookback.png');
  const frames = [], ctx = { drawImage(_image, x, y) { frames.push([x, y]); } };
  for (const time of [0.37, 0.39, 0.65, 1.01, 1.03, 1.29]) drawDrumDevilHero(ctx, assets, time);
  assert.deepEqual(frames, [[0, 0], [192, 0], [0, 192], [0, 192], [192, 192], [0, 0]]);
});

test('surprise precedes left turn, pan centers janitor, and greeting waits for focus to settle', () => {
  const h = harness(); h.advance('surprise');
  assert.equal(h.scene.snapshot.pose, 'surprised'); assert.equal(h.scene.snapshot.camera, 0);
  h.scene.update(C.surpriseHold - 0.01, still); assert.equal(h.scene.snapshot.phase, 'surprise');
  h.scene.update(0.02, still); assert.equal(h.scene.snapshot.phase, 'lookback');
  assert.equal(h.scene.snapshot.pose, 'lookback'); assert.equal(h.scene.snapshot.camera, 0);
  h.scene.update(C.lookbackHold - 0.01, still); assert.equal(h.scene.snapshot.phase, 'lookback');
  h.scene.update(0.02, still); assert.equal(h.scene.snapshot.phase, 'reveal');
  h.scene.update(C.reveal / 2, still); assert.ok(h.scene.snapshot.camera > 0 && h.scene.snapshot.camera < 1);
  h.scene.update(C.reveal / 2, still); assert.equal(h.scene.snapshot.phase, 'focus');
  assert.equal(h.scene.snapshot.heroScreenX, C.revealCenterX); assert.equal(h.lines.length, 3);
  assert.equal(h.scene.snapshot.zoom, C.revealZoom);
  h.scene.update(C.focusSeconds / 2, still); assert.ok(h.scene.snapshot.zoom > C.revealZoom);
  assert.ok(Math.abs(h.scene.snapshot.shake) <= C.focusShake); assert.equal(h.lines.length, 3);
  h.scene.update(C.focusSeconds / 2, still); assert.equal(h.scene.snapshot.phase, 'greeting');
  assert.equal(h.scene.snapshot.zoom, C.focusZoom); assert.equal(h.scene.snapshot.shake, 0);
  assert.equal(h.lines.at(-1).text, '도움이 필요한가?');
});

test('hero speech uses white scene bubble and black partial text without a portrait panel', () => {
  const fills = [], text = [], tails = [], boxes = [];
  const ctx = { save() {}, restore() {}, beginPath() {}, closePath() {},
    fill() { fills.push(this.fillStyle); }, moveTo() {}, lineTo(x, y) { tails.push([x, y]); },
    measureText(value) { return { width: value.length * 14 }; },
    fillText(value, x, y) { text.push({ value, x, y, color: this.fillStyle }); },
  };
  const battle = { text: C.greeting[0].text, shown: 3,
    roundRect(_ctx, x, y, width, height) { boxes.push({ x, y, width, height }); },
    drawTextBox() { assert.fail('scene speech must not draw a bottom portrait panel'); },
  };
  drawDrumDevilSpeech(ctx, battle, { x: 208, y: 109 });
  assert.deepEqual(fills, ['#fff', '#fff']); assert.equal(text[0].color, '#000');
  assert.equal(text[0].value, battle.text.slice(0, 3)); assert.ok(boxes[0].y + boxes[0].height < 109);
  assert.deepEqual(tails[0], [208, 101]);
  assert.equal(tails[0][1] - (boxes[0].y + boxes[0].height), 12);
  assert.equal(boxes[0].x, 190);
  drawDrumDevilSpeech(ctx, battle, { x: 140, y: 86 });
  assert.equal(boxes[1].x - tails[2][0], 14);
  assert.ok(tails[2][1] >= boxes[1].y && tails[2][1] <= boxes[1].y + boxes[1].height);
});

test('janitor stands with upright flag until landing, with a separate laugh pose', () => {
  const h = harness();
  for (const phase of ['reveal', 'focus', 'greeting']) { h.advance(phase); assert.equal(h.scene.snapshot.heroPose, 'stand'); }
  h.advance('laugh'); assert.equal(h.scene.snapshot.heroPose, 'laugh');
  for (const phase of ['introduction', 'rise', 'return', 'dive']) { h.advance(phase); assert.equal(h.scene.snapshot.heroPose, 'stand'); }
  h.advance('land'); assert.equal(h.scene.snapshot.heroPose, 'hero');
  h.advance('ready'); assert.equal(h.scene.snapshot.heroPose, 'hero');
});
