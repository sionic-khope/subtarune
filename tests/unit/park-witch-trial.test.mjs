import test from 'node:test';
import assert from 'node:assert/strict';
import { createParkWitchTrial } from '../../src/battle/modes/park-witch-trial.js';
import { PARK_WITCH_TRIAL as C } from '../../src/data/park-witch-trial.js';
import { Board, Soul } from '../../src/battle/bullets.js';
import { Battle } from '../../src/battle/battle.js';

function fixture(hp = 100, soundOverrides = {}, trialIndex = 0) {
  const calls = [], members = [hp, hp, hp], board = new Board(), soul = new Soul();
  const sound = {
    paused: null,
    pauseBgm() { calls.push('pause'); this.paused = { a: { currentTime: 41, src: 'music', pause() { calls.push('discard'); } } }; },
    resumeBgm() { calls.push(['resume', this.paused.a.currentTime]); this.paused = null; },
    blip(name) { calls.push(['blip', name]); },
    ...soundOverrides,
  };
  const battle = { board, soul, game: { sound }, alive: () => members.filter(value => value > 0),
    setText: Battle.prototype.setText, showLine: Battle.prototype.showLine, typeText: Battle.prototype.typeText,
    get typed() { return this.shown >= this.text.length; },
    sfx(name) { calls.push(name); },
    hurtAllParty(amount) { calls.push(['damage', amount]); members.forEach((value, i) => { members[i] = Math.max(0, value - amount); }); if (!this.alive().length) mode.dispose(); },
  };
  const mode = createParkWitchTrial(battle, { trialIndex });
  const input = (keys = [], just = []) => ({ down: key => keys.includes(key), just: key => just.includes(key) });
  const step = (dt = 0.02, keys = [], just = []) => { board.update(dt); battle.typeText(dt); return mode.update(dt, input(keys, just)); };
  const advance = seconds => { for (let left = seconds; left > 1e-8; left -= 0.02) step(Math.min(left, 0.02)); };
  const press = () => { step(); step(0.02, ['confirm'], ['confirm']); step(); };
  const charge = () => { advance(0.9); press(); press(); press(); press(); advance(0.7); assert.equal(mode.snapshot.phase, 'read-question'); };
  const readCharge = () => { for (let i = 0; mode.snapshot.phase === 'read-question' && i < 10; i++) press(); assert.equal(mode.snapshot.phase, 'choices'); };
  const finishChoices = () => { for (let i = 0; mode.snapshot.phase === 'choices' && i < 300; i++) step(); assert.equal(mode.snapshot.phase, 'question'); };
  const question = () => { charge(); readCharge(); finishChoices(); };
  const choose = index => { const zone = C.choices[index - 1]; soul.x = zone.x + zone.w / 2; soul.y = zone.y + zone.h / 2; press(); };
  return { mode, battle, calls, members, step, advance, press, charge, readCharge, finishChoices, question, choose };
}

test('court reads the full charge then staggers three choices before starting countdown', () => {
  const f = fixture(); f.advance(4);
  assert.equal(f.mode.snapshot.phase, 'opening'); assert.equal(f.mode.snapshot.remaining, 15);
  f.press(); f.press(); f.press();
  assert.equal(f.mode.snapshot.phase, 'declare-effect');
  f.advance(0.6); assert.equal(f.mode.snapshot.remaining, 15);
  f.step(0.04);
  assert.equal(f.mode.snapshot.phase, 'read-question'); assert.equal(f.mode.snapshot.remaining, 15);
  f.advance(0.3); assert.ok(f.mode.snapshot.shown > 0 && f.mode.snapshot.shown < C.text.question.length);
  assert.equal(f.mode.snapshot.visibleChoices, 0); assert.equal(f.mode.snapshot.remaining, 15);
  f.press(); assert.equal(f.mode.snapshot.shown, C.cases[0].chargeLines[0].length);
  assert.equal(f.battle.speaker, '파크가디언'); assert.equal(f.battle.voice, 'park_guardian_costume');
  f.press(); assert.equal(f.mode.snapshot.currentSpeech, C.cases[0].chargeLines[1]);
  f.press(); f.press(); assert.equal(f.mode.snapshot.currentSpeech, C.text.instruction);
  f.readCharge();
  f.step(); assert.equal(f.mode.snapshot.visibleChoices, 1);
  for (let index = 0; index < 3; index++) {
    while (f.mode.snapshot.currentChoice < index) f.step();
    f.advance(0.08);
    assert.ok(f.mode.snapshot.choiceShown[index] > 0 && f.mode.snapshot.choiceShown[index] < f.mode.snapshot.choiceTextLengths[index]);
    assert.equal(f.mode.snapshot.visibleChoices, index + 1);
    assert.equal(f.mode.snapshot.remaining, 15);
    for (let next = index + 1; next < 3; next++) assert.equal(f.mode.snapshot.choiceShown[next], 0);
    while (f.mode.snapshot.choiceShown[index] < f.mode.snapshot.choiceTextLengths[index]) f.step();
  }
  assert.equal(f.mode.snapshot.phase, 'choices'); assert.equal(f.mode.snapshot.remaining, 15);
  f.finishChoices(); assert.deepEqual(f.mode.snapshot.choiceShown, f.mode.snapshot.choiceTextLengths);
  assert.equal(f.mode.snapshot.remaining, 15);
  f.advance(0.1); assert.ok(f.mode.snapshot.remaining < 15);
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
  f.advance(0.81); assert.equal(f.mode.snapshot.phase, 'execution-roll');
  const bangs = f.calls.filter(x => x === 'thud').length;
  f.advance(0.6); assert.equal(f.mode.snapshot.phase, 'sword');
  assert.equal(f.calls.filter(x => x === 'thud').length - bangs, 4);
  assert.deepEqual(f.members, [100, 100, 100]);
  f.advance(2.8); assert.deepEqual(f.members, [100, 100, 100]);
  f.advance(0.2); assert.deepEqual(f.members, [70, 70, 70]);
  f.advance(2); f.mode.dispose(); f.advance(3);
  assert.deepEqual(f.calls.filter(x => Array.isArray(x) && x[0] === 'damage'), [['damage', 30]]);
  assert.equal(f.calls.some(x => x === 'pause' || Array.isArray(x) && x[0] === 'resume'), false);
});

test('answer 3 plays objection, glass, exact defeat concession, then normal end without boss victory', () => {
  const f = fixture(); f.question(); f.choose(3);
  assert.equal(f.mode.snapshot.phase, 'objection'); f.advance(1.4);
  assert.equal(f.mode.snapshot.phase, 'shatter'); assert.equal(f.calls.filter(x => x === 'park_trial_shatter').length, 1);
  f.advance(0.7); assert.equal(f.mode.snapshot.phase, 'defeated');
  assert.equal(C.text.defeated, '용.. 용준이는 원래 엄마가없어서 괜찮다니.. 윽 내가졌다...');
  f.press(); f.press(); f.advance(0.5);
  assert.equal(f.mode.snapshot.phase, 'done'); assert.deepEqual(f.members, [100, 100, 100]);
  assert.equal(f.calls.some(x => x === 'pause' || Array.isArray(x) && x[0] === 'resume'), false);
});

test('second trial uses its own charge, answers and concession with the same correct third zone', () => {
  assert.equal(C.cases[1].question, '피고인 김형섭은 오방순(여)를 성희롱한 죄가 있다 맞습니까?');
  assert.deepEqual(C.cases[1].choices, ['맞습니다', '오방순은 여자가아니다.', '내가 여자다.']);
  for (const answer of [1, 2, 3]) {
    const f = fixture(100, {}, 1); f.charge();
    assert.equal(f.mode.snapshot.trialIndex, 1);
    assert.equal(f.mode.snapshot.currentSpeech, C.cases[1].question);
    f.readCharge(); f.finishChoices(); f.choose(answer);
    assert.equal(f.mode.snapshot.choice, answer);
    if (answer === 3) {
      f.advance(2.2); assert.equal(f.mode.snapshot.phase, 'defeated');
      assert.equal(f.battle.text, C.cases[1].defeated); assert.deepEqual(f.members, [100, 100, 100]);
    } else { f.advance(7); assert.deepEqual(f.members, [70, 70, 70]); }
  }
});

test('execution sword cannot damage before its full three-second descent', () => {
  const f = fixture(); f.question(); f.choose(1);
  while (f.mode.snapshot.phase !== 'sword') f.step(0.01);
  assert.equal(f.mode.snapshot.phaseTime, 0); assert.equal(f.mode.snapshot.executionBeats, 5);
  f.advance(1.5); assert.deepEqual(f.members, [100, 100, 100]);
  f.advance(1.48); assert.deepEqual(f.members, [100, 100, 100]);
  f.step(0.02); assert.deepEqual(f.members, [70, 70, 70]);
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

test('holding confirm through charge and staged choices cannot submit a verdict', () => {
  const f = fixture(); f.charge();
  const zone = C.choices[0]; Object.assign(f.battle.soul, { x: zone.x + 20, y: zone.y + 20 });
  for (let i = 0; i < 260; i++) f.step(0.02, ['confirm'], ['confirm']);
  assert.equal(f.mode.snapshot.phase, 'read-question'); assert.equal(f.mode.snapshot.dialogueIndex, 0);
  f.readCharge();
  for (let i = 0; i < 200; i++) f.step(0.02, ['confirm'], ['confirm']);
  assert.equal(f.mode.snapshot.phase, 'question'); assert.equal(f.mode.snapshot.choice, null);
  assert.equal(f.mode.snapshot.visibleChoices, 3);
  f.press(); assert.equal(f.mode.snapshot.choice, 1);
});

test('charge uses actual battle dialogue and the existing costume voice', () => {
  const f = fixture(); f.charge(); f.calls.length = 0;
  f.advance(0.2);
  assert.ok(f.calls.some(x => Array.isArray(x) && x[0] === 'blip' && x[1] === 'park_guardian_costume'));
  assert.equal(f.battle.portrait, 'park_guardian_costume');
});

test('court leaves the same running BGM object and playback position untouched on both outcomes', () => {
  for (const answer of [1, 3]) {
    const music = { currentTime: 41, paused: false, src: 'battle-track' };
    const f = fixture(100, { bgm: music });
    f.question(); music.currentTime = 52.75; f.choose(answer);
    f.advance(6);
    if (answer === 3) { f.press(); f.press(); f.advance(0.5); }
    f.mode.dispose();
    assert.equal(f.battle.game.sound.bgm, music);
    assert.deepEqual(music, { currentTime: 52.75, paused: false, src: 'battle-track' });
    assert.equal(f.calls.some(x => x === 'pause' || x === 'discard' || Array.isArray(x) && x[0] === 'resume'), false);
  }
});

test('all-down strike restores board without touching music owned by the battle', () => {
  const f = fixture(30), original = { ...f.battle.board.rect };
  f.question(); f.choose(1); f.advance(7);
  assert.deepEqual(f.members, [0, 0, 0]); assert.equal(f.mode.snapshot.disposed, true);
  assert.equal(f.battle.game.sound.paused, null); assert.deepEqual(f.battle.board.rect, original);
  assert.equal(f.calls.some(x => Array.isArray(x) && x[0] === 'resume'), false);
});

test('exit/retry disposal is idempotent and cannot discard another scene music', () => {
  const f = fixture(); const replacement = { a: { src: 'other' } };
  f.battle.game.sound.paused = replacement; f.mode.dispose(); f.mode.dispose(); f.advance(30);
  assert.equal(f.battle.game.sound.paused, replacement);
  assert.equal(f.calls.some(x => Array.isArray(x) && x[0] !== 'blip'), false);
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
  assert.equal(question.map(item => item.value).join('').replaceAll(' ', ''), C.cases[0].summary.replaceAll(' ', ''));
  const lineEnds = question.filter((item, i) => question[i + 1]?.y !== item.y).map(item => item.value);
  const words = C.cases[0].summary.split(/\s+/);
  assert.ok(lineEnds.every(line => words.includes(line.trim().split(/\s+/).at(-1))));
});
