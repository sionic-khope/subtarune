import test from 'node:test';
import assert from 'node:assert/strict';
import { createParkWitchTrial } from '../../src/battle/modes/park-witch-trial.js';
import { PARK_WITCH_TRIAL as C } from '../../src/data/park-witch-trial.js';
import { Board, Soul } from '../../src/battle/bullets.js';

function fixture(hp = 100, soundOverrides = {}) {
  const calls = [], members = [hp, hp, hp], board = new Board(), soul = new Soul();
  const sound = {
    paused: null,
    pauseBgm() { calls.push('pause'); this.paused = { a: { currentTime: 41, src: 'music', pause() { calls.push('discard'); } } }; },
    resumeBgm() { calls.push(['resume', this.paused.a.currentTime]); this.paused = null; },
    blip() {},
    ...soundOverrides,
  };
  const battle = { board, soul, game: { sound }, alive: () => members.filter(value => value > 0), setText() {},
    sfx(name) { calls.push(name); },
    hurtAllParty(amount) { calls.push(['damage', amount]); members.forEach((value, i) => { members[i] = Math.max(0, value - amount); }); if (!this.alive().length) mode.dispose(); },
  };
  const mode = createParkWitchTrial(battle);
  const input = (keys = [], just = []) => ({ down: key => keys.includes(key), just: key => just.includes(key) });
  const step = (dt = 0.02, keys = [], just = []) => { board.update(dt); return mode.update(dt, input(keys, just)); };
  const advance = seconds => { for (let left = seconds; left > 1e-8; left -= 0.02) step(Math.min(left, 0.02)); };
  const press = () => { step(); step(0.02, ['confirm'], ['confirm']); step(); };
  const question = () => { advance(0.9); press(); press(); press(); press(); advance(0.7); assert.equal(mode.snapshot.phase, 'question'); };
  const choose = index => { const zone = C.choices[index - 1]; soul.x = zone.x + zone.w / 2; soul.y = zone.y + zone.h / 2; press(); };
  return { mode, battle, calls, members, step, advance, press, question, choose };
}

test('court starts countdown only after full declaration and displays all exact choices', () => {
  const f = fixture(); f.advance(4);
  assert.equal(f.mode.snapshot.phase, 'opening'); assert.equal(f.mode.snapshot.remaining, 15);
  f.press(); f.press(); f.press();
  assert.equal(f.mode.snapshot.phase, 'declare-effect');
  f.advance(0.6); assert.equal(f.mode.snapshot.remaining, 15);
  f.step(0.04);
  assert.equal(f.mode.snapshot.phase, 'question'); assert.equal(f.mode.snapshot.remaining, 15);
  assert.deepEqual(C.choices.map(x => x.text), ['내가 잘못했다', '욕을 하지 않았다.', '애초에 노애미라 괜찮다']);
  assert.equal(C.text.question, '피고인 김형섭은 쇼츠편집자 박용준에게 심한 엄마욕에 마음의 상처를 입었다고 합니다. 사실입니까?');
});

for (const answer of [1, 2, 0]) test(`court answer ${answer || 'timeout'} executes one unavoidable 30-per-member strike`, () => {
  const f = fixture(); f.question();
  f.battle.soul.invuln = 20;
  if (answer) f.choose(answer); else f.advance(15);
  assert.equal(f.mode.snapshot.choice, answer);
  assert.equal(f.mode.snapshot.phase, 'verdict');
  f.advance(0.81); assert.equal(f.mode.snapshot.verdict, 1);
  f.advance(0.81); assert.equal(f.mode.snapshot.verdict, 2);
  f.advance(0.81); assert.equal(f.mode.snapshot.phase, 'sword');
  assert.deepEqual(f.members, [100, 100, 100]);
  f.advance(0.8); assert.deepEqual(f.members, [70, 70, 70]);
  f.advance(2); f.mode.dispose(); f.advance(3);
  assert.deepEqual(f.calls.filter(x => Array.isArray(x) && x[0] === 'damage'), [['damage', 30]]);
  assert.deepEqual(f.calls.filter(x => Array.isArray(x) && x[0] === 'resume'), [['resume', 41]]);
});

test('answer 3 plays objection, glass, exact defeat concession, then normal end without boss victory', () => {
  const f = fixture(); f.question(); f.choose(3);
  assert.equal(f.mode.snapshot.phase, 'objection'); f.advance(1.4);
  assert.equal(f.mode.snapshot.phase, 'shatter'); assert.equal(f.calls.filter(x => x === 'park_trial_shatter').length, 1);
  f.advance(0.7); assert.equal(f.mode.snapshot.phase, 'defeated');
  assert.equal(C.text.defeated, '용.. 용준이는 원래 엄마가없어서 괜찮다니.. 윽 내가졌다...');
  f.press(); f.press(); f.advance(0.5);
  assert.equal(f.mode.snapshot.phase, 'done'); assert.deepEqual(f.members, [100, 100, 100]);
  assert.deepEqual(f.calls.filter(x => Array.isArray(x)), [['resume', 41]]);
});

test('only heart inside a zone plus a fresh C press confirms; arrows keep ordinary speed', () => {
  const f = fixture(); f.question();
  f.press(); assert.equal(f.mode.snapshot.choice, null);
  const start = f.battle.soul.x; f.step(0.1, ['right']); assert.equal(f.battle.soul.x - start, 11);
  f.step(0.02, ['confirm'], ['confirm']);
  const zone = C.choices[2]; f.battle.soul.x = zone.x + 20; f.battle.soul.y = zone.y + 20;
  f.step(0.02, ['confirm'], ['confirm']); assert.equal(f.mode.snapshot.choice, null);
  f.press(); assert.equal(f.mode.snapshot.choice, 3);
});

test('all-down strike disposes paused BGM, never resumes, and restores board', () => {
  const f = fixture(30), original = { ...f.battle.board.rect };
  f.question(); f.choose(1); f.advance(4);
  assert.deepEqual(f.members, [0, 0, 0]); assert.equal(f.mode.snapshot.disposed, true);
  assert.equal(f.battle.game.sound.paused, null); assert.deepEqual(f.battle.board.rect, original);
  assert.equal(f.calls.some(x => Array.isArray(x) && x[0] === 'resume'), false);
});

test('exit/retry disposal is idempotent and cannot discard another scene music', () => {
  const f = fixture(); const replacement = { a: { src: 'other' } };
  f.battle.game.sound.paused = replacement; f.mode.dispose(); f.mode.dispose(); f.advance(30);
  assert.equal(f.battle.game.sound.paused, replacement);
  assert.equal(f.calls.some(x => Array.isArray(x)), false);
});

test('actual objection asset is decoded, played once, and its owned source stops on dispose', async () => {
  const oldImage = globalThis.Image, calls = [], buffer = { duration: 1.38 };
  globalThis.Image = class { set src(value) { this.onload(); } };
  try {
    const f = fixture(100, {
      loadCue: async src => { calls.push(src); return buffer; },
      playCue: actual => { assert.equal(actual, buffer); calls.push('play'); return { elapsed: 0.5, stop() { calls.push('stop'); } }; },
    });
    await Promise.resolve(); f.question(); f.choose(3);
    assert.deepEqual(f.mode.snapshot.objectionAudio, { elapsed: 0.5 });
    f.mode.dispose(); f.mode.dispose();
    assert.deepEqual(calls, [C.objectionAudio, 'play', 'stop']);
  } finally {
    if (oldImage === undefined) delete globalThis.Image; else globalThis.Image = oldImage;
  }
});

test('glass shatter waits for actual objection audio when gameplay clock runs ahead', async () => {
  const oldImage = globalThis.Image;
  let audioElapsed = 1.333333;
  globalThis.Image = class { set src(value) { this.onload(); } };
  try {
    const f = fixture(100, {
      loadCue: async () => ({ duration: 1.38 }),
      playCue: () => ({ get elapsed() { return audioElapsed; }, stop() {} }),
    });
    await Promise.resolve(); f.question(); f.choose(3); f.advance(1.4);
    assert.equal(f.mode.snapshot.phase, 'objection', 'gameplay 1.4s must not shatter while actual audio is only 1.333333s');
    assert.equal(f.calls.includes('park_trial_shatter'), false);
    audioElapsed = 1.38; f.step(0);
    assert.equal(f.mode.snapshot.phase, 'shatter');
    assert.equal(f.calls.filter(name => name === 'park_trial_shatter').length, 1);
    f.step(0.02); assert.equal(f.calls.filter(name => name === 'park_trial_shatter').length, 1);
    f.mode.dispose();
  } finally {
    if (oldImage === undefined) delete globalThis.Image; else globalThis.Image = oldImage;
  }
});

test('missing art is explicit and cannot start an invisible timed question', () => {
  const oldImage = globalThis.Image;
  globalThis.Image = class { set src(value) { this.onerror(); } };
  try {
    const f = fixture(100, { loadCue: async () => ({ duration: 1.38 }) });
    f.advance(30);
    assert.equal(f.mode.snapshot.phase, 'enter'); assert.equal(f.mode.snapshot.assetsReady, false);
    assert.equal(f.mode.snapshot.assetError, C.assets.sword); assert.equal(f.mode.snapshot.remaining, 15);
    f.mode.dispose();
  } finally {
    if (oldImage === undefined) delete globalThis.Image; else globalThis.Image = oldImage;
  }
});

test('court renderer follows border, question font, word wrap, timer and inactive-zone tokens', () => {
  const f = fixture(), texts = [], rectangles = [];
  const ctx = {
    save() {}, restore() {}, fillRect() {},
    measureText(value) { const size = Number.parseInt(this.font, 10); return { width: [...value].reduce((n, char) => n + (char === ' ' ? size / 2 : size), 0) }; },
    fillText(value, x, y) { texts.push({ value, x, y, font: this.font, color: this.fillStyle }); },
    strokeRect(x, y, w, h) { rectangles.push({ x, y, w, h, width: this.lineWidth, color: this.strokeStyle }); },
  };
  f.question(); f.mode.draw(ctx);
  assert.deepEqual(C.board, { x: 8, y: 8, w: 464, h: 344 });
  assert.deepEqual(rectangles[0], { x: 9, y: 9, w: 462, h: 342, width: 2, color: '#ffffff' });
  assert.ok(rectangles.slice(1).every(rect => rect.color === '#595366'));
  assert.match(texts.find(item => item.x === 425).font, /^16px/);
  const question = texts.filter(item => item.y >= 154 && item.y < 244);
  assert.ok(question.every(item => /^14px/.test(item.font)));
  assert.equal(question.find(item => item.value === '박용준').color, '#ffe066');
  assert.equal(question.map(item => item.value).join('').replaceAll(' ', ''), C.text.question.replaceAll(' ', ''));
  const lineEnds = question.filter((item, i) => question[i + 1]?.y !== item.y).map(item => item.value);
  const words = C.text.question.split(/\s+/);
  assert.ok(lineEnds.every(line => words.includes(line.trim().split(/\s+/).at(-1))));
});
