import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrumDevilRescue, drawDrumDevilHero, drawDrumDevilSpeech, loadDrumDevilRescue, janitorRedAfterimage } from '../../src/battle/support/drum-devil-rescue.js';
import { DRUM_DEVIL_RESCUE as C } from '../../src/data/drum-devil-rescue.js';

const input = { just: () => true }, still = { just: () => false };
function harness() {
  const calls = [], lines = [];
  const battle = {
    enemies: [{ id: 'drum_devil', x: 340, y: 224 }],
    members: [{ id: 'hyungsub', hp: 1, maxHp: 160, home: [100, 200] }], typed: true,
    showLine(line) { lines.push(line); this.text = line.text; }, setText(text) { this.text = text; },
    sfx(key) { calls.push(key); },
    game: { sound: { stopBgm: x => calls.push(['stop', x]), preloadBgm() {}, playBgm: key => calls.push(key) } },
    support: { playHeroCue() { calls.push(C.bgm); }, prepareHeroFormation() { calls.push('formation'); } },
  };
  let completed = 0;
  const scene = createDrumDevilRescue(battle, { onComplete: () => completed++ });
  const advance = phase => {
    for (let i = 0; i < 600 && scene.snapshot.phase !== phase; i++) scene.update(0.05, input);
    assert.equal(scene.snapshot.phase, phase);
  };
  return { battle, calls, lines, scene, advance, completed: () => completed };
}

test('rescue waits two seconds, hits once, heals, and completes after final dialogue', () => {
  const h = harness(); h.advance('silence');
  h.scene.update(1.99, still); assert.equal(h.scene.snapshot.phase, 'silence');
  h.scene.update(0.01, still); assert.equal(h.scene.snapshot.phase, 'flag');
  const y = h.scene.snapshot.flagY;
  h.scene.update(0.3, still); const x = h.scene.snapshot.flagX;
  h.scene.update(0.3, still); assert.ok(h.scene.snapshot.flagX > x); assert.equal(h.scene.snapshot.flagY, y);
  h.advance('surprise'); assert.equal(h.calls.filter(c => c === C.flagImpact.sound).length, 1);
  assert.equal(h.scene.snapshot.pose, 'surprised');
  h.advance('ready'); assert.equal(h.completed(), 0); assert.equal(h.battle.members[0].hp, 160);
  assert.equal(h.scene.update(0.2, input), true); assert.equal(h.completed(), 1);
  h.scene.update(1, input); assert.equal(h.completed(), 1);
  assert.deepEqual(h.lines, [...C.narration, ...C.greeting, ...C.introduction, ...C.healLines, ...C.ready]);
  for (const cue of [C.bgm, 'laugh_janitor', 'spearappear', 'wing', 'impact']) assert.ok(h.calls.includes(cue), cue);
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
  for (const time of [0.05, 0.15, 0.3, 0.55, 0.69, 0.79, 0.94, 1.19, 1.29]) drawDrumDevilHero(ctx, assets, time);
  assert.deepEqual(frames, [[0, 0], [192, 0], [0, 192], [192, 192], [0, 384], [192, 384], [0, 576], [192, 576], [0, 0]]);
  assert.ok(Math.abs(C.hero.frameHolds.reduce((sum, seconds) => sum + seconds, 0) - 1.28) < 1e-9);
});

test('red afterimage caches a source-alpha silhouette without editing the original sprite', () => {
  const originalDocument = globalThis.document, paints = [];
  const ctx = { drawImage(image) { paints.push(image); }, fillRect() { paints.push([this.globalCompositeOperation, this.fillStyle]); } };
  let canvases = 0;
  globalThis.document = { createElement() { canvases++; return { width: 0, height: 0, getContext: () => ctx }; } };
  try {
    const image = { width: 192, height: 192 }, red = janitorRedAfterimage(image);
    assert.equal(janitorRedAfterimage(image), red); assert.equal(canvases, 1);
    assert.deepEqual(paints, [image, ['source-in', '#ff3333']]);
    assert.deepEqual(image, { width: 192, height: 192 }); assert.equal(red.width, image.width);
  } finally { globalThis.document = originalDocument; }
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

test('flag contact synchronizes one strong hit with white flash and visible recoil', () => {
  const h = harness(); h.advance('flag');
  while (!h.scene.snapshot.hit) h.scene.update(0.01, still);
  assert.equal(h.calls.filter(c => c === C.flagImpact.sound).length, 1);
  assert.ok(h.scene.snapshot.flagImpact.flash > 0);
  assert.equal(C.flagImpact.sound, 'deltarune_release_shoot');
  assert.equal(h.scene.snapshot.flagImpact.recoil, C.flagImpact.recoil);
  assert.equal(h.scene.snapshot.flagImpact.shake, C.flagImpact.amp);
  h.scene.update(0.04, still); assert.ok(h.scene.snapshot.flagImpact.recoil > 3);
  assert.ok(Math.abs(h.scene.snapshot.flagImpact.shake) > 0);
  h.scene.update(C.flagImpact.duration, still); assert.equal(h.scene.snapshot.flagImpact.active, false);
  assert.equal(h.scene.snapshot.flagImpact.recoil, 0);
});

test('distant reveal traverses a long left pan before focus without changing the actor identity', () => {
  const h = harness(); h.advance('reveal');
  assert.ok(C.hero.reveal[0] <= -240); assert.ok(C.reveal >= 4);
  assert.ok(h.scene.snapshot.heroScreenX < -200);
  h.scene.update(C.reveal / 2, still);
  assert.ok(h.scene.snapshot.pan >= 240); assert.ok(h.scene.snapshot.heroScreenX < 40);
  assert.equal(h.scene.snapshot.heroPose, 'stand');
  h.scene.update(C.reveal / 2, still); assert.equal(h.scene.snapshot.phase, 'focus');
  assert.ok(h.scene.snapshot.pan >= 480); assert.equal(h.scene.snapshot.heroScreenX, C.revealCenterX);
});

test('fast accelerating ascent begins formation and camera return before grand landing', () => {
  const h = harness(); h.advance('rise');
  assert.ok(h.calls.includes('formation')); assert.ok(C.rise <= 0.6);
  const startY = h.scene.snapshot.heroY;
  h.scene.update(C.rise / 2, still); const middleY = h.scene.snapshot.heroY, middleCamera = h.scene.snapshot.camera;
  assert.ok(middleCamera < 1);
  h.scene.update(C.rise / 2, still);
  assert.ok(middleY - h.scene.snapshot.heroY > startY - middleY);
  assert.ok(h.scene.snapshot.camera < middleCamera);
  h.advance('hang'); assert.equal(h.scene.snapshot.camera, 0);
  h.advance('land'); assert.equal(h.scene.snapshot.heroY, C.hero.home[1]);
  assert.ok(C.hero.home[1] > 220); assert.equal(C.hero.scale, 0.92);
});

test('healing waits for C and the raised flag cue, fills actual HP once, and restores standing pose', () => {
  const h = harness(); h.advance('heal-talk'); const player = h.battle.members[0];
  assert.equal(h.lines.at(-1).text, '많이 힘들어보이네?'); assert.equal(player.hp, 1);
  h.scene.update(2, still); assert.equal(h.scene.snapshot.phase, 'heal-talk'); assert.equal(player.hp, 1);
  h.scene.update(0.2, input); assert.equal(h.scene.snapshot.phase, 'heal-raise');
  h.scene.update(C.heal.raise - 0.01, input); assert.equal(player.hp, 1); assert.equal(h.scene.snapshot.heroPose, 'raise');
  h.scene.update(0.02, still); assert.equal(h.scene.snapshot.phase, 'healing'); assert.equal(player.hp, player.maxHp);
  assert.equal(h.scene.snapshot.healed, true); assert.equal(h.scene.snapshot.pose, 'standing');
  assert.deepEqual(player.popup, { t: 0, text: '+159', heal: true });
  assert.equal(h.calls.filter(cue => cue === 'heal').length, 1);
  h.scene.update(0.2, input); assert.equal(h.scene.snapshot.phase, 'healing');
  h.advance('ready'); assert.equal(h.lines.at(-1).text, C.ready[0].text);
  assert.equal(h.calls.filter(cue => cue === 'heal').length, 1);
  assert.equal(h.calls.includes('rudebuster_swing'), false);
});

test('aborting before the heal cue leaves HP unchanged and prevents late healing', () => {
  const h = harness(); h.advance('heal-raise'); h.scene.update(0.2, still);
  h.scene.dispose(); h.scene.update(10, input);
  assert.equal(h.battle.members[0].hp, 1); assert.equal(h.scene.snapshot.healed, false);
  assert.equal(h.calls.includes('heal'), false); assert.equal(h.completed(), 0);
});

test('post-landing speech stays left of Yoplait and boss faces with a compact hero tail', () => {
  for (const line of [...C.healLines, ...C.ready]) {
    const boxes = [], tails = [], text = [];
    const ctx = { save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {}, moveTo() {},
      lineTo(x, y) { tails.push([x, y]); }, measureText(value) { return { width: value.length * 14 }; },
      fillText(value, x, y) { text.push({ value, x, y }); } };
    const battle = { text: line.text, shown: 999, roundRect(_ctx, x, y, width, height) { boxes.push({ x, y, width, height }); } };
    drawDrumDevilSpeech(ctx, battle, { x: 144, y: 174, postLanding: true });
    const box = boxes[0];
    assert.equal(box.x, 12); assert.equal(box.width, 156);
    assert.ok(box.x + box.width < 180, 'bubble must remain left of Yoplait face');
    assert.ok(box.y >= 10 && box.y + box.height < 174);
    assert.deepEqual(tails[0], [144, 166]);
    assert.equal(tails[0][1] - (box.y + box.height), 12);
    assert.ok(text.length >= 2, 'full Korean line must wrap inside narrow scene bubble');
    assert.equal(text.map(part => part.value.replaceAll(' ', '')).join(''), line.text.replaceAll(' ', ''));
    assert.ok(text.every(part => part.x + ctx.measureText(part.value).width <= box.x + box.width - C.speech.pad));
  }
});
