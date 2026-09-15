// 섭리오 — 비데 방의 거대 게임 스크린 속 2D 플랫포머(게임 속 게임). 2026-09-15 사용자 브리핑.
// 컷신 노드 { scene3d: 'subrio' } 로 실행되는 오버레이 씬. 규칙은 subrio-core.js(순수), 여기는 진행·그리기·소리·입력.
//   흐름: 오버레이 페이드인 → 검은 화면에 SUBRIO 로고가 천천히(Query? 브금) → 나레이션 4줄(한 글자씩, 나레이션 음성)
//   → 직업 선택(창·불·시계 아이콘 하나씩 페이드인, 1P/2P/3P 포인터, 대사, 커서 이동 띡띡·선택 띠링) → 슈우웅 밝아지며 게임(SWORD 브금)
//   → 세 명이 하늘에서 띠링 띠링 띠링 떨어짐 → 좌우/위 점프/아래 앉기/C 창/X 방패, 동료는 늦게 반응하는 AI 추종.
//   스테이지(2026-09-15 사용자 확정): 1-1 보라 → 1-2 청록 → 1-3 파랑 섬(각 3분 분량, CS 미니언), 깃발에 닿으면 STAGE CLEAR → 검은 카드 → 다음 섬에 다시 낙하.
//   1-4: 따듯한비데가 하늘에서 떨어져 보스전(도끼 내려찍기·물줄기, 창 12방). 이기면 CLEAR → 방으로 복귀(result.found → subrio_cleared).
//   체력·게임오버 없음(사용자 지시): 맞으면 튕겨나기만. 판테온 C 탭/차징 창·X 방패, 브랜드는 적이 보이면 6초마다 불(머리 위 게이지만), 질리언은 시계 둘씩 포물선(같은 적 둘 → 2초 스턴).
//   테두리는 사용자 지시대로 입체감 있는 흰색 베젤. Esc(title) 로 언제든 방으로 돌아온다(클리어 아님).
import { Input } from '../core/input.js';
import { FONT, F } from '../ui/font.js';
import { SCREEN_W, SCREEN_H } from '../world/world.js';
import { buildLevel, makeActor, stepActor, followerIntent, updateProjectiles, frameOf, cameraX, reachedGoal, makeBoss, stepBoss, hitBoss, hurtActor,
  bossHitbox, bossFrame, rectsOverlap, makeEnemy, stepEnemy, damageEnemy, heroTouchesEnemy, enemyFrame, brandThink, zileanThink, burstClocks, NO_INTENT,
  STAGES, BOSS, SPEAR, FIRE, CLOCK, ENEMY, TILE, VIEW_W, VIEW_H, ATLAS_COLUMN, WATER_W, WATER_H } from './subrio-core.js';

const FRAME = 10;
const VIEW_X = FRAME, VIEW_Y = FRAME;
const CLASSES = [
  { id: 'pantheon', name: '판테온', icon: 'assets/props/subrio_icon_spear.png', sheet: 'assets/sprites/subrio_pantheon.png', color: '#d9a441' },
  { id: 'brand', name: '브랜드', icon: 'assets/props/subrio_icon_fire.png', sheet: 'assets/sprites/subrio_brand.png', color: '#ff7a3d' },
  { id: 'zilean', name: '질리언', icon: 'assets/props/subrio_icon_clock.png', sheet: 'assets/sprites/subrio_zilean.png', color: '#ffd166' },
];
const PLAYERS = [
  { id: 'hyungsub', label: '요플래', color: '#7fd0ff', voice: 'hyungsub', pick: 0 },
  { id: 'gyeongsub', label: '경섭', color: '#ff5c5c', voice: 'gyeongsub', pick: 2 },
  { id: 'ppaman', label: '억빠맨', color: '#c9a3ff', voice: 'ppaman', pick: 1 },
];
const NARRATION = ['섭리오에 오신 여러분들 환영합니다', '방향키로 움직이고 점프하고 앉을 수 있습니다.', 'x가 방어 c가 공격입니다', '직업을 선택해주세요~'];
const SELECT_LINES = [
  { speaker: '억빠맨', voice: 'ppaman', text: '오 판테온 브랜드 질리언이네요?' },
  { speaker: '억빠맨', voice: 'ppaman', text: '요플래씨는 질리언하실건가요?' },
  { speaker: '경섭', voice: 'gyeongsub', text: '저..' },
  { speaker: '경섭', voice: 'gyeongsub', text: '내가 질리언할수있나? 허허' },
  { speaker: '억빠맨', voice: 'ppaman', text: '아 상관없죠 전 브랜드할게요 어차피 셋다 주챔아니라 그나마 쉬운거' },
  { speaker: null, voice: 'narrator', text: '판테온을 하게되었다.' },
];
const FINAL_LINE = '네 여러분 좋습니다. 그럼 한번 모험을 떠나볼까요오 ~~~';
const CHAR_DELAY = 0.05;
const HOLD_AFTER_LINE = 2.4;
const ICON_X = [96, 230, 364];
const BOSS_SHEET = 'assets/sprites/subrio_bidet.png';
const BOSS_CELL = [112, 96], BOSS_FEET = 90;
const HERO_CELL = 64, HERO_FEET = 60;
const ENEMY_SHEETS = { cs_red: 'assets/sprites/subrio_cs_red.png', cs_blue: 'assets/sprites/subrio_cs_blue.png' };
const ENEMY_CELL = 48, ENEMY_FEET = 44;
const CLEAR_HOLD = 2.2, CARD_FADE = 0.5, CARD_HOLD = 1.9, BOSS_DELAY = 1.2, VICTORY_HOLD = 3.6;
const BOSS_APPEAR_LINE = '따듯한비데가 나타났다!';

function loadImage(src) {
  const img = new Image();
  const done = new Promise((resolve) => { img.onload = () => resolve(img); img.onerror = () => resolve(null); });
  img.src = src;
  return { img, done };
}

function makeOverlay(game) {
  const root = document.createElement('div');
  root.id = 'subrio';
  Object.assign(root.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', opacity: '0', transition: 'opacity 0.6s ease', zIndex: '10', overflow: 'hidden', background: '#000' });
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W; canvas.height = SCREEN_H;
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' });
  root.appendChild(canvas);
  document.body.appendChild(root);
  const fit = () => {
    const r = game.canvas.getBoundingClientRect();
    Object.assign(root.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  return { root, canvas, fit };
}

/** 한 글자씩 나오는 글. blip 은 보이는 글자마다 한 번 */
class Typewriter {
  constructor(sound) { this.sound = sound; this.text = ''; this.shown = 0; this.timer = 0; this.voice = 'narrator'; this.doneT = 0; }
  start(text, voice = 'narrator') { this.text = text; this.shown = 0; this.timer = 0; this.voice = voice; this.doneT = 0; }
  get done() { return this.shown >= this.text.length; }
  skip() { this.shown = this.text.length; }
  update(dt) {
    if (this.done) { this.doneT += dt; return; }
    this.timer += dt;
    while (this.timer >= CHAR_DELAY && !this.done) {
      this.timer -= CHAR_DELAY; this.shown += 1;
      const ch = this.text[this.shown - 1];
      if (ch !== ' ') this.sound.blip(this.voice);
    }
  }
  get visible() { return this.text.slice(0, this.shown); }
}

export function run(game, node = {}) {
  return new Promise((resolve) => {
    const ov = makeOverlay(game);
    const ctx = ov.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const sheets = Object.fromEntries(CLASSES.map(c => [c.id, loadImage(c.sheet)]));
    const icons = Object.fromEntries(CLASSES.map(c => [c.id, loadImage(c.icon)]));
    const spearImg = loadImage('assets/props/subrio_spear.png');
    const waterImg = loadImage('assets/props/subrio_water.png');
    const bossImg = loadImage(BOSS_SHEET);
    const enemyImgs = Object.fromEntries(Object.entries(ENEMY_SHEETS).map(([type, src]) => [type, loadImage(src)]));
    const tileImgs = {};
    const tilesFor = (path) => { if (!tileImgs[path]) tileImgs[path] = loadImage(path); return tileImgs[path]; };
    const typer = new Typewriter(game.sound);
    const state = {
      phase: 'logo', t: 0, phaseT: 0, logoAlpha: 0, lineIndex: 0, icons: [0, 0, 0], cursors: [0, 0, 0], picked: [false, false, false],
      cursorScript: null, flash: 0, actors: [], spears: [], fires: [], clocks: [], waters: [], enemies: [], trail: [], control: false, cam: 0, exiting: false,
      // 스테이지 진행: stage 번호, sub = drop(낙하) | run | clear | card | victory, fade 검은 덮개, shake 흔들림, cleared 보스 격파
      stage: 0, level: null, baked: null, sub: 'drop', subT: 0, fade: 0, shake: 0, boss: null, bossGone: false, cleared: false, notice: null, leaderLandT: 0,
    };
    // 스테이지 로드: 레벨·구운 타일·세 명 재배치(하늘에서 낙하). 보스 무대면 보스는 주인공 착지 뒤에 떨어진다
    const loadStage = (index) => {
      state.stage = index;
      const level = buildLevel(index);
      state.level = level; state.baked = bakeLevel(level, level.def.fallback);
      tilesFor(level.def.tiles).done.then(img => { if (img && state.level === level) state.baked.paint(img); });
      state.spears = []; state.fires = []; state.clocks = []; state.waters = []; state.trail = []; state.cam = 0; state.boss = null; state.bossGone = false; state.notice = null; state.leaderLandT = 0;
      state.enemies = level.enemies.map(spec => makeEnemy(spec.type, spec.x, spec.y));
      state.sub = 'drop'; state.subT = 0; state.control = false; state.dropWait = 1.9;
      const order = ['hyungsub', 'gyeongsub', 'ppaman'];
      state.actors = order.map((id, i) => {
        const cls = CLASSES[PLAYERS.find(p => p.id === id).pick];
        const actor = makeActor(id, level.spawnX + i * 44, -40, 1);
        actor.classId = cls.id; actor.delay = i * 0.55; actor.active = false; actor.blockedT = 0; actor.dropped = false;
        return actor;
      });
    };
    // 짧게 자른 효과음(롤 위키 원음은 꼬리가 길다)
    const sfx = (name, volume = 0.7, len = 0, rate = 1) => game.sound.sfx(name, { volume, len, rate });
    // 눌린 순간: 게임 루프가 프레임마다 채우는 Input.pressed(짧은 탭도 한 프레임은 남는다)와 held 의 상승 에지를 합친다 — 이 씬의 rAF 가 게임 poll 과 어긋나도 탭을 놓치지 않는다
    const prev = Object.create(null);
    const edge = (action) => { const down = Input.down(action) || !!Input.pressed[action]; const just = down && !prev[action]; prev[action] = down; return just; };
    const held = (action) => Input.down(action);

    // ── 진행 ──
    const startPlay = () => {
      state.phase = 'play'; state.phaseT = 0;
      loadStage(0);
      game.sound.stopBgm(0.2);
      game.sound.playBgm('subrio_sword', { volume: 0.42 });
    };
    // 끝: 보스를 이겼으면 found → 컷신 flag(subrio_cleared). Esc 는 found 없이 방으로
    const finish = () => {
      if (state.exiting) return; state.exiting = true;
      game.sound.stopBgm(0.5);
      ov.root.style.opacity = '0';
      setTimeout(() => { cancelAnimationFrame(raf); removeEventListener('resize', ov.fit); ov.root.remove(); delete window.__subrio; resolve({ found: state.cleared }); }, 620);
    };

    const advanceLine = () => {
      if (state.phase === 'narration') {
        state.lineIndex += 1;
        if (state.lineIndex >= NARRATION.length - 1) { state.phase = 'select'; state.phaseT = 0; state.lineIndex = 0; typer.start(NARRATION[3], 'narrator'); typer.skip(); state.dialogue = null; }
        else typer.start(NARRATION[state.lineIndex], 'narrator');
      } else if (state.phase === 'select' && state.dialogue) {
        state.dialogue.index += 1;
        if (state.dialogue.index < SELECT_LINES.length) { const line = SELECT_LINES[state.dialogue.index]; typer.start(line.text, line.voice); }
        else { state.dialogue = null; state.cursorScript = { t: 0, steps: [] }; }
      } else if (state.phase === 'final') {
        state.phase = 'flash'; state.phaseT = 0; game.sound.sfx('whoosh', { volume: 0.9 }); game.sound.stopBgm(0.6);
      }
    };

    // 커서 대본: 경섭 두 칸(띡띡) → 질리언 띠링, 억빠맨 동시에 한 칸 → 브랜드 띠링, 마지막에 요플래 판테온 띠링
    const CURSOR_STEPS = [
      { at: 0.35, player: 1, to: 1, sfx: 'menu' }, { at: 0.35, player: 2, to: 1, sfx: 'menu' },
      { at: 0.8, player: 1, to: 2, sfx: 'menu' }, { at: 0.8, player: 2, pick: true, sfx: 'confirm' },
      { at: 1.3, player: 1, pick: true, sfx: 'confirm' },
      { at: 2.0, player: 0, pick: true, sfx: 'confirm' },
    ];

    const update = (dt) => {
      state.t += dt; state.phaseT += dt;
      const confirm = edge('confirm');
      if (edge('title')) { finish(); return; }
      if (state.phase === 'logo') {
        if (state.phaseT < 0.05 && !state.bgmStarted) { state.bgmStarted = true; game.sound.playBgm('subrio_query', { volume: 0.4, fadeIn: 1.2 }); }
        state.logoAlpha = Math.max(0, Math.min(1, (state.phaseT - 0.8) / 2.6));
        if (state.phaseT > 6.2 || (confirm && state.phaseT > 3.6)) { state.phase = 'narration'; state.phaseT = 0; state.lineIndex = 0; typer.start(NARRATION[0], 'narrator'); }
        return;
      }
      if (state.phase === 'narration') {
        typer.update(dt);
        if (confirm) { if (!typer.done) typer.skip(); else advanceLine(); }
        else if (typer.done && typer.doneT > HOLD_AFTER_LINE) advanceLine();
        return;
      }
      if (state.phase === 'select') {
        for (let i = 0; i < 3; i++) state.icons[i] = Math.max(0, Math.min(1, (state.phaseT - 0.4 - i * 0.9) / 0.8));
        const iconsDone = state.icons[2] >= 1;
        if (iconsDone && !state.dialogue && !state.cursorScript && !state.cursorsShown) { state.cursorsShown = true; state.cursorT = 0; }
        if (state.cursorsShown && !state.dialogue && !state.cursorScript && !state.scriptDone) {
          state.cursorT = (state.cursorT || 0) + dt;
          if (state.cursorT > 0.9) { state.dialogue = { index: 0 }; typer.start(SELECT_LINES[0].text, SELECT_LINES[0].voice); }
        }
        if (state.dialogue) {
          typer.update(dt);
          if (confirm) { if (!typer.done) typer.skip(); else advanceLine(); }
          else if (typer.done && typer.doneT > HOLD_AFTER_LINE) advanceLine();
        }
        if (state.cursorScript) {
          state.cursorScript.t += dt;
          for (const step of CURSOR_STEPS) {
            if (step.done || state.cursorScript.t < step.at) continue;
            step.done = true;
            if (step.to !== undefined) state.cursors[step.player] = step.to;
            if (step.pick) state.picked[step.player] = true;
            game.sound.sfx(step.sfx, { volume: 0.8 });
          }
          if (state.cursorScript.t > 2.8) { state.cursorScript = null; state.scriptDone = true; state.phase = 'final'; state.phaseT = 0; typer.start(FINAL_LINE, 'narrator'); }
        }
        return;
      }
      if (state.phase === 'final') {
        typer.update(dt);
        if (confirm) { if (!typer.done) typer.skip(); else advanceLine(); }
        else if (typer.done && typer.doneT > HOLD_AFTER_LINE) advanceLine();
        return;
      }
      if (state.phase === 'flash') {
        state.flash = Math.min(1, state.phaseT / 0.9);
        if (state.phaseT >= 0.9) { startPlay(); state.flash = 1; }
        return;
      }
      if (state.phase === 'play') updatePlay(dt, confirm);
    };

    const updatePlay = (dt, confirm) => {
      state.flash = Math.max(0, state.flash - dt * 1.1);
      state.shake = Math.max(0, state.shake - dt);
      state.subT += dt;
      const level = state.level, leader = state.actors[0], def = level.def;
      // 스테이지 카드: 검게 → 카드 → 다음 스테이지 로드 → 밝게 (그동안 물리는 멈춘다)
      if (state.sub === 'card') {
        if (state.subT < CARD_FADE) state.fade = state.subT / CARD_FADE;
        else if (state.subT < CARD_FADE + CARD_HOLD) { state.fade = 1; if (!state.cardShown) { state.cardShown = true; sfx('confirm', 0.7); } }
        else if (!state.cardLoaded) { state.cardLoaded = true; loadStage(state.stage + 1); state.fade = 1; state.sub = 'drop'; state.subT = 0; }
        return;
      }
      state.fade = Math.max(0, state.fade - dt / CARD_FADE);
      if (state.sub === 'victory') {
        if (state.boss && state.subT >= BOSS.deathTime && !state.bossGone) { state.bossGone = true; sfx('vaporized', 0.8); sfx('won', 0.8); }
        if (state.subT >= VICTORY_HOLD) { state.fade = Math.min(1, state.fade + dt / CARD_FADE); if (state.subT >= VICTORY_HOLD + 1.4) finish(); }
      }
      const events = [];
      const wasGuard = leader.state === 'guard';
      for (const [i, actor] of state.actors.entries()) {
        if (!actor.active) { if (state.subT >= actor.delay) actor.active = true; else continue; }
        let intent;
        if (i === 0) {
          intent = state.control ? { left: held('left'), right: held('right'), jump: edge('up'), jumpHeld: held('up'), crouch: held('down'), attack: confirm, attackHeld: held('confirm'), guard: held('cancel') } : NO_INTENT;
        } else {
          intent = state.control ? followerIntent(actor, state.trail, state.t, { reaction: 0.32 * i + 0.1, spacing: 34 * i, level }) : NO_INTENT;
          const wantsMove = intent.left || intent.right;
          actor.blockedT = wantsMove && actor.grounded && Math.abs(actor.vx) < 6 ? (actor.blockedT || 0) + dt : 0;
        }
        const before = events.length;
        stepActor(level, actor, intent, dt, events);
        if (i === 0) state.trail.push({ t: state.t, x: actor.x, y: actor.y, facing: actor.facing, jumped: events.slice(before).some(e => e.type === 'jump') });
        else if (events.slice(before).some(e => e.type === 'fall')) { actor.x = Math.round(leader.x - 30 * i); actor.y = -60; }
      }
      if (state.trail.length > 400) state.trail.splice(0, state.trail.length - 400);
      if (!wasGuard && leader.state === 'guard') sfx('pantheon_e_up', 0.45, 0.7);
      // 적·보스
      const targets = [...state.enemies.filter(e => !e.dead), ...(state.boss && !state.boss.dead && state.boss.state !== 'enter' ? [state.boss] : [])];
      if (state.control) {
        const brand = state.actors.find(a => a.classId === 'brand'), zilean = state.actors.find(a => a.classId === 'zilean');
        if (brand?.active) brandThink(brand, targets, dt, events);
        if (zilean?.active) zileanThink(zilean, targets, dt, events);
      }
      for (const enemy of state.enemies) {
        if (Math.abs(enemy.x - leader.x) > 900) continue;
        stepEnemy(level, enemy, dt, events);
        if (!enemy.dead) heroTouchesEnemy(leader, enemy, state.t, events);
      }
      state.enemies = state.enemies.filter(enemy => !enemy.dead || enemy.deadT < ENEMY.deathTime);
      // 보스: 주인공 착지 뒤 BOSS_DELAY 에 하늘에서 떨어진다
      if (def.boss && !state.boss && leader.dropped && state.subT > (state.leaderLandT || 0) + BOSS_DELAY) state.boss = makeBoss(level.bossSpawnX, -60);
      if (state.boss) {
        const boss = state.boss;
        if (boss.state === 'windup' && boss.stateT === 0) boss.swingHit = false;
        stepBoss(level, boss, leader, dt, events);
        if (!boss.dead) {
          const box = bossHitbox(boss);
          if (box && !boss.swingHit && rectsOverlap(box, leader)) { boss.swingHit = true; hurtActor(leader, boss.x + boss.w / 2, events); }
          else if (boss.state !== 'enter' && boss.state !== 'roar' && rectsOverlap(boss, leader) && hurtActor(leader, boss.x + boss.w / 2, events) && boss.state === 'chase') { boss.state = 'recover'; boss.stateT = 0; }
        }
      }
      // 투사체 → 적/보스 (공격력 1). 시계는 같은 적에 둘 맞으면 스턴
      const hitTargets = (list, w, h, source) => list.filter(p => {
        const rect = { x: p.x, y: p.y, w, h };
        for (const enemy of state.enemies) {
          if (enemy.dead || !rectsOverlap(rect, enemy)) continue;
          damageEnemy(enemy, 1, source, state.t, events); events.push({ type: 'projectileHit', source }); return false;
        }
        if (state.boss && !state.boss.dead && rectsOverlap(rect, state.boss) && hitBoss(state.boss, events)) { events.push({ type: 'projectileHit', source }); return false; }
        return true;
      });
      state.spears = hitTargets(state.spears, SPEAR.w, SPEAR.h, 'spear');
      state.fires = hitTargets(state.fires, FIRE.w, FIRE.h, 'fire');
      state.clocks = hitTargets(state.clocks, CLOCK.w, CLOCK.h, 'clock');
      state.waters = state.waters.filter(water => {
        if (leader.invuln > 0 || !rectsOverlap({ x: water.x, y: water.y, w: WATER_W, h: WATER_H }, leader)) return true;
        hurtActor(leader, water.x + WATER_W / 2, events);
        return false;
      });
      for (const event of events) {
        if (event.type === 'land') { const actor = state.actors.find(a => a.id === event.id); if (actor && !actor.dropped) { actor.dropped = true; if (actor === leader) state.leaderLandT = state.subT; sfx('item', 0.7); } }
        if (event.type === 'jump' && event.id === 'hyungsub') sfx('jump', 0.5);
        if (event.type === 'chargeStart') sfx('pantheon_q_charge', 0.6, 1.1);
        if (event.type === 'attack' && event.id === 'hyungsub') {
          const charged = event.charged;
          state.spears.push({ x: event.x, y: event.y, vx: event.facing * (charged ? SPEAR.chargedSpeed : SPEAR.speed), life: charged ? SPEAR.chargedLife : SPEAR.life, facing: event.facing, charged });
          sfx(charged ? 'pantheon_q_throw' : 'pantheon_q_tap', charged ? 0.8 : 0.55, charged ? 0.9 : 0.5);
        }
        if (event.type === 'fire') { state.fires.push({ x: event.x, y: event.y, vx: event.vx, life: FIRE.life, facing: event.facing, t: 0 }); sfx('ember', 0.8, 0.8); }
        if (event.type === 'clock') { state.clocks.push({ x: event.x, y: event.y, vx: event.vx, vy: event.vy, life: 2.2, t: 0 }); if (event.index === 0) sfx('zilean_q_throw', 0.7, 1.3); }
        if (event.type === 'projectileHit') sfx(event.source === 'spear' ? 'pantheon_q_hit' : 'hit', 0.6, 0.5);
        if (event.type === 'stun') sfx('zilean_q_stun', 0.8, 2.0);
        if (event.type === 'stomp') { sfx('pop', 0.7); sfx('jump', 0.4); }
        if (event.type === 'enemyDead') sfx('vaporized', 0.45, 0.6);
        if (event.type === 'bossLand') { sfx('thud', 0.9); state.shake = 0.35; state.notice = { text: BOSS_APPEAR_LINE, t: 0, hold: BOSS.roar + 0.6 }; }
        if (event.type === 'bossJump') sfx('mario_jump', 0.45, 0, 0.8);
        if (event.type === 'swing') sfx('whoosh', 0.8, 0, 0.8);
        if (event.type === 'water') { state.waters.push({ x: event.x, y: event.y, vx: event.vx, life: BOSS.waterLife, facing: event.facing }); sfx('splash', 0.5, 0, 1.3); }
        if (event.type === 'bossHit') sfx('hit', 0.7);
        if (event.type === 'block') sfx('pantheon_e_block', 0.8, 0.6);
        if (event.type === 'hurt') { sfx('hurt', 0.8); state.shake = Math.max(state.shake, 0.18); }
        if (event.type === 'bossDead') { state.sub = 'victory'; state.subT = 0; state.control = false; state.cleared = true; state.waters = []; sfx('explosion', 0.7); state.shake = 0.5; }
      }
      state.spears = updateProjectiles(level, state.spears, dt, SPEAR.w, SPEAR.h);
      state.fires = updateProjectiles(level, state.fires, dt, FIRE.w, FIRE.h);
      const clocksBefore = state.clocks;
      state.clocks = updateProjectiles(level, state.clocks, dt, CLOCK.w, CLOCK.h, CLOCK.gravity);
      // 바닥에 떨어진 시계는 터지며 근처 적에 피해(같은 적에 둘이면 스턴)
      const burstEvents = [];
      burstClocks(clocksBefore.filter(c => c.dead), state.enemies, state.t, burstEvents);
      for (const event of burstEvents) { if (event.type === 'stun') sfx('zilean_q_stun', 0.8, 2.0); else if (event.type === 'projectileHit') sfx('hit', 0.5, 0.4); else if (event.type === 'enemyDead') sfx('vaporized', 0.45, 0.6); }
      state.waters = updateProjectiles(level, state.waters, dt, WATER_W, WATER_H);
      for (const p of [...state.fires, ...state.clocks]) p.t += dt;
      if (state.notice) { state.notice.t += dt; if (state.notice.t > state.notice.hold) state.notice = null; }
      if (state.sub === 'drop' && leader.dropped && state.subT > state.leaderLandT + (state.dropWait ?? 1.9)) { state.sub = 'run'; state.control = true; }
      if (state.sub === 'run' && reachedGoal(level, leader)) { state.sub = 'clear'; state.subT = 0; state.control = false; sfx('fanfare', 0.8); }
      if (state.sub === 'clear' && state.subT >= CLEAR_HOLD) { state.sub = 'card'; state.subT = 0; state.cardShown = false; state.cardLoaded = false; }
      state.cam = cameraX(level, leader);
    };

    // ── 그리기 ──
    const drawFrame = () => {
      ctx.fillStyle = '#e9e9f0'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, SCREEN_W, 3); ctx.fillRect(0, 0, 3, SCREEN_H);
      ctx.fillStyle = '#b4b4c6'; ctx.fillRect(0, SCREEN_H - 4, SCREEN_W, 4); ctx.fillRect(SCREEN_W - 4, 0, 4, SCREEN_H);
      ctx.fillStyle = '#8f8fa6'; ctx.fillRect(VIEW_X - 2, VIEW_Y - 2, VIEW_W + 4, 2); ctx.fillRect(VIEW_X - 2, VIEW_Y - 2, 2, VIEW_H + 4);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(VIEW_X, VIEW_Y + VIEW_H, VIEW_W + 2, 2); ctx.fillRect(VIEW_X + VIEW_W, VIEW_Y, 2, VIEW_H + 2);
      ctx.fillStyle = '#1a1a26'; ctx.fillRect(VIEW_X - 1, VIEW_Y - 1, VIEW_W + 2, 1); ctx.fillRect(VIEW_X - 1, VIEW_Y - 1, 1, VIEW_H + 2);
    };
    const text = (str, x, y, { color = '#fff', align = 'left', size = F.size, shadow = true } = {}) => {
      ctx.font = size === F.size ? FONT : FONT.replace(`${F.size}px`, `${size}px`);
      ctx.textBaseline = 'top'; ctx.textAlign = align;
      if (shadow) { ctx.fillStyle = '#000'; ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1); }
      ctx.fillStyle = color; ctx.fillText(str, Math.round(x), Math.round(y));
    };
    const drawBackdrop = () => {
      const def = state.level.def;
      const g = ctx.createLinearGradient(0, VIEW_Y, 0, VIEW_Y + VIEW_H);
      g.addColorStop(0, def.sky[0]); g.addColorStop(0.3, def.sky[1]); g.addColorStop(0.55, def.sky[2]); g.addColorStop(1, def.sky[3]);
      ctx.fillStyle = g; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
      const t = state.t, px = state.cam * 0.25, baseY = VIEW_Y + 150;
      for (let x = 0; x < VIEW_W; x += 6) {
        const wx = x + px;
        const h = 18 + 12 * Math.sin(wx * 0.05 + t * 2.1) * Math.sin(wx * 0.013 - t * 0.7) + 7 * Math.sin(wx * 0.21 + t * 5.3) + 4 * Math.sin(wx * 0.9 + t * 11);
        ctx.fillStyle = def.wave[0]; ctx.fillRect(VIEW_X + x, Math.round(baseY - h), 6, Math.round(h) + 26);
        const h2 = h * 0.5 + 4 * Math.sin(wx * 0.33 + t * 7.7);
        ctx.fillStyle = def.wave[1]; ctx.fillRect(VIEW_X + x + 1, Math.round(baseY - h2), 4, Math.round(h2) + 8);
      }
      ctx.fillStyle = def.wave[2]; ctx.fillRect(VIEW_X, baseY + 2, VIEW_W, 12);
    };
    const drawBoss = (boss) => {
      const img = bossImg.img;
      const cx = Math.round(boss.x + boss.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(boss.y + boss.h) + VIEW_Y;
      // 격파 뒤엔 깜빡이며 사라진다
      if (boss.dead && (boss.deadT >= BOSS.deathTime || Math.floor(boss.deadT * 12) % 2 === 1)) return;
      const frame = bossFrame(boss);
      ctx.save();
      ctx.translate(cx, feet);
      if (boss.facing > 0) ctx.scale(-1, 1);
      if (boss.flash > 0 && 'filter' in ctx) ctx.filter = 'brightness(2.6) saturate(0.2)';
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, (frame % 2) * BOSS_CELL[0], Math.floor(frame / 2) * BOSS_CELL[1], BOSS_CELL[0], BOSS_CELL[1], -BOSS_CELL[0] / 2, -BOSS_FEET, BOSS_CELL[0], BOSS_CELL[1]);
      else { ctx.fillStyle = '#5a5a66'; ctx.fillRect(-boss.w / 2, -boss.h, boss.w, boss.h); }
      ctx.restore();
    };
    const drawEnemy = (enemy) => {
      const img = enemyImgs[enemy.type]?.img;
      const cx = Math.round(enemy.x + enemy.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(enemy.y + enemy.h) + VIEW_Y;
      if (cx < VIEW_X - 40 || cx > VIEW_X + VIEW_W + 40) return;
      const frame = enemyFrame(enemy);
      ctx.save();
      ctx.translate(cx, feet);
      if (enemy.facing > 0) ctx.scale(-1, 1);
      if (enemy.flash > 0 && 'filter' in ctx) ctx.filter = 'brightness(2.6) saturate(0.2)';
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, (frame % 2) * ENEMY_CELL, Math.floor(frame / 2) * ENEMY_CELL, ENEMY_CELL, ENEMY_CELL, -ENEMY_CELL / 2, -ENEMY_FEET, ENEMY_CELL, ENEMY_CELL);
      else { ctx.fillStyle = enemy.type === 'cs_red' ? '#d43a3a' : '#3a6ad4'; ctx.fillRect(-enemy.w / 2, -enemy.h, enemy.w, enemy.h); }
      ctx.restore();
      // 스턴: 머리 위를 도는 노란 별 셋(시트의 별 위에 움직임을 얹는다)
      if (enemy.stunT > 0) for (let i = 0; i < 3; i++) {
        const a = state.t * 5 + i * 2.094;
        ctx.fillStyle = '#ffe14a'; ctx.fillRect(Math.round(cx + Math.cos(a) * 11) - 1, Math.round(feet - enemy.h - 12 + Math.sin(a) * 3) - 1, 3, 3);
      }
    };
    const drawGauge = (actor) => {
      // 브랜드 쿨타임 게이지(사용자 지시: 머리 위에서 천천히 차는 흰 테두리·검은 배경 막대만, 글자 없음)
      if (!(actor.fireCool > 0)) return;
      const cx = Math.round(actor.x + actor.w / 2 - state.cam) + VIEW_X, top = Math.round(actor.y) + VIEW_Y - 20;
      const w = 22, h = 5, fill = Math.round((w - 2) * (1 - actor.fireCool / FIRE.cooldown));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#000'; ctx.fillRect(cx - w / 2, top, w, h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, h - 1);
      ctx.fillStyle = '#ff9a3d'; ctx.fillRect(cx - w / 2 + 1, top + 1, fill, h - 2);
      ctx.globalAlpha = 1;
    };
    const drawProjectiles = () => {
      for (const spear of state.spears) {
        const img = spearImg.img; const sx = Math.round(spear.x - state.cam) + VIEW_X, sy = Math.round(spear.y) + VIEW_Y;
        if (img && img.complete && img.naturalWidth) { ctx.save(); ctx.translate(sx + 12, sy + 3); if (spear.facing < 0) ctx.scale(-1, 1); if (spear.charged && 'filter' in ctx) ctx.filter = 'brightness(1.6)'; ctx.drawImage(img, -12, -3); ctx.restore(); }
        else { ctx.fillStyle = '#e6d28c'; ctx.fillRect(sx, sy + 2, 20, 2); }
        if (spear.charged) { ctx.fillStyle = 'rgba(255,240,180,0.5)'; ctx.fillRect(sx - spear.facing * 10, sy + 2, 10, 2); }
      }
      for (const fire of state.fires) {
        const fx = Math.round(fire.x - state.cam) + VIEW_X, fy = Math.round(fire.y) + VIEW_Y, r = 5 + (Math.floor(fire.t * 20) % 2);
        ctx.fillStyle = '#ff5a1e'; ctx.beginPath(); ctx.arc(fx + 6, fy + 6, r + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(fx + 6 - fire.facing * 1, fy + 6, r - 2, 0, Math.PI * 2); ctx.fill();
      }
      for (const clock of state.clocks) {
        const cx = Math.round(clock.x - state.cam) + VIEW_X + 6, cy = Math.round(clock.y) + VIEW_Y + 6, spin = clock.t * 9;
        ctx.fillStyle = '#5a3a08'; ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2404'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin) * 3, cy + Math.sin(spin) * 3); ctx.stroke();
      }
      for (const water of state.waters) {
        const img = waterImg.img; const wx = Math.round(water.x - state.cam) + VIEW_X, wy = Math.round(water.y) + VIEW_Y;
        if (img && img.complete && img.naturalWidth) { ctx.save(); ctx.translate(wx + WATER_W / 2, wy + WATER_H / 2); if (water.facing < 0) ctx.scale(-1, 1); ctx.drawImage(img, -WATER_W / 2, -WATER_H / 2); ctx.restore(); }
        else { ctx.fillStyle = '#6ec0ff'; ctx.fillRect(wx, wy, WATER_W, WATER_H); }
      }
    };
    const drawHud = () => {
      const level = state.level;
      state.actors.forEach((actor, i) => { const p = PLAYERS.find(q => q.id === actor.id); const cls = CLASSES.find(c => c.id === actor.classId); text(`${i + 1}P ${p.label} · ${cls.name}`, VIEW_X + 8, VIEW_Y + 6 + i * 16, { color: p.color }); });
      text(level.def.title, VIEW_X + VIEW_W - 8, VIEW_Y + 6, { align: 'right', color: '#fff' });
      const boss = state.boss;
      if (boss && boss.state !== 'enter' && !boss.dead) {
        const bw = 150, bx = VIEW_X + (VIEW_W - bw) / 2, by = VIEW_Y + 24;
        text(STAGES[3].name, VIEW_X + VIEW_W / 2, VIEW_Y + 6, { align: 'center', color: '#ffb3b3' });
        ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
        ctx.fillStyle = '#5a1020'; ctx.fillRect(bx, by, bw, 6);
        ctx.fillStyle = '#ff3b4a'; ctx.fillRect(bx, by, Math.round(bw * boss.hp / boss.maxHp), 6);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, 7);
      }
    };
    const drawCard = () => {
      const next = STAGES[Math.min(STAGES.length - 1, state.stage + 1)];
      const cx = VIEW_X + VIEW_W / 2, cy = VIEW_Y + VIEW_H / 2;
      text(next.title, cx, cy - 30, { align: 'center', size: 34, color: '#ffffff' });
      text(next.name, cx, cy + 20, { align: 'center', color: next.boss ? '#ffb3b3' : next.wave[1].replace(/rgba\(([^)]+),[^,]+\)$/, 'rgb($1)') });
    };
    const drawActor = (actor) => {
      const sheet = sheets[actor.classId]?.img;
      const frame = frameOf(actor);
      const cx = Math.round(actor.x + actor.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(actor.y + actor.h) + VIEW_Y;
      // 무적 시간엔 깜빡인다(맞은 직후 0.35초는 계속 보임)
      if (actor.invuln > 0 && actor.hurtT <= 0 && Math.floor(state.t * 14) % 2 === 1) return;
      if (sheet && sheet.complete && sheet.naturalWidth) {
        const sx = (frame % 2) * HERO_CELL, sy = Math.floor(frame / 2) * HERO_CELL;
        ctx.save();
        ctx.translate(cx, feet);
        if (actor.facing < 0) ctx.scale(-1, 1);
        // 차징: 창 끝이 점점 밝아진다
        if (actor.state === 'charge' && 'filter' in ctx) ctx.filter = `brightness(${(1 + 0.6 * Math.min(1, actor.charge / SPEAR.chargeMax)).toFixed(2)})`;
        ctx.drawImage(sheet, sx, sy, HERO_CELL, HERO_CELL, -HERO_CELL / 2, -HERO_FEET, HERO_CELL, HERO_CELL);
        ctx.restore();
      } else {
        const cls = CLASSES.find(c => c.id === actor.classId);
        ctx.fillStyle = cls?.color || '#fff';
        ctx.fillRect(cx - 6, feet - actor.h, 12, actor.h);
        ctx.fillStyle = '#000'; ctx.fillRect(cx + (actor.facing > 0 ? 2 : -5), feet - actor.h + 5, 3, 3);
      }
    };
    const drawBox = (speaker, body, color = '#fff') => {
      const bx = VIEW_X + 14, by = VIEW_Y + VIEW_H - 84, bw = VIEW_W - 28, bh = 72;
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
      if (speaker) { ctx.fillStyle = '#000'; ctx.fillRect(bx + 8, by - 20, 64, 22); ctx.strokeRect(bx + 9, by - 19, 62, 20); text(speaker, bx + 40, by - 17, { align: 'center', shadow: false }); }
      const lines = wrap(body, bw - 40);
      lines.forEach((line, i) => text('* ' + line, bx + 16, by + 12 + i * 20, { color, shadow: false }));
    };
    const wrap = (str, width) => {
      ctx.font = FONT;
      const words = str.split(' '); const lines = []; let cur = '';
      for (const w of words) { const next = cur ? cur + ' ' + w : w; if (ctx.measureText('* ' + next).width > width && cur) { lines.push(cur); cur = w; } else cur = next; }
      if (cur) lines.push(cur); return lines;
    };
    const draw = () => {
      drawFrame();
      ctx.save(); ctx.beginPath(); ctx.rect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
      if (state.phase === 'logo') {
        ctx.globalAlpha = state.logoAlpha;
        text('SUBRIO', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 26, { align: 'center', size: 48, color: '#ffffff' });
        text('엄청 대박인 배 · 게임 속 게임', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 + 34, { align: 'center', color: '#9a8cff' });
        ctx.globalAlpha = 1;
      } else if (state.phase === 'narration') {
        text('* ' + typer.visible, VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 8, { align: 'center' });
      } else if (state.phase === 'select' || state.phase === 'final') {
        text('* ' + NARRATION[3], VIEW_X + VIEW_W / 2, VIEW_Y + 26, { align: 'center' });
        CLASSES.forEach((cls, i) => {
          const a = state.icons[i]; if (a <= 0) return;
          ctx.globalAlpha = a;
          const icon = icons[cls.id]?.img, x = VIEW_X + ICON_X[i], y = VIEW_Y + 84;
          if (icon && icon.complete && icon.naturalWidth) ctx.drawImage(icon, x - 32, y, 64, 64);
          else { ctx.fillStyle = cls.color; ctx.fillRect(x - 24, y + 8, 48, 48); }
          text(cls.name, x, y + 72, { align: 'center', color: '#fff' });
          ctx.globalAlpha = 1;
        });
        if (state.cursorsShown) PLAYERS.forEach((p, i) => {
          const col = state.cursors[i], x = VIEW_X + ICON_X[col], y = VIEW_Y + 176 + i * 18;
          const picked = state.picked[i];
          ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(x - 6, y + 8); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
          text(`${i + 1}P ${p.label}${picked ? ' ✓' : ''}`, x + 10, y - 2, { color: p.color });
        });
        if (state.dialogue) { const line = SELECT_LINES[state.dialogue.index]; drawBox(line.speaker, typer.visible, line.speaker ? '#fff' : '#fff'); }
        if (state.phase === 'final') drawBox(null, typer.visible);
      } else if (state.phase === 'flash' || state.phase === 'play') {
        if (state.phase === 'play' || state.phaseT > 0.4) {
          if (!state.level) loadStage(0);
          const shakeY = state.shake > 0 ? Math.round(Math.sin(state.t * 80) * 3) : 0;
          ctx.save(); ctx.translate(0, shakeY);
          drawBackdrop();
          ctx.drawImage(state.baked.canvas, state.cam, 0, VIEW_W, VIEW_H, VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
          for (const enemy of state.enemies) drawEnemy(enemy);
          if (state.boss) drawBoss(state.boss);
          for (const actor of [...state.actors].reverse()) if (actor.active) drawActor(actor);
          drawProjectiles();
          for (const actor of state.actors) if (actor.active && actor.classId === 'brand') drawGauge(actor);
          ctx.restore();
          drawHud();
          if (state.sub === 'clear') text('STAGE CLEAR!', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 40, { align: 'center', size: 30, color: '#ffe066' });
          if (state.sub === 'victory' && state.bossGone) text('CLEAR!', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 40, { align: 'center', size: 36, color: '#ffe066' });
          if (state.notice) drawBox(null, state.notice.text);
        }
        if (state.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${state.fade})`; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); }
        if (state.sub === 'card' && state.fade >= 1) drawCard();
        if (state.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${state.flash})`; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); }
      }
      ctx.restore();
    };

    // ── 루프 ──
    let last = performance.now(), raf = 0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!state.exiting) update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    ov.fit(); addEventListener('resize', ov.fit);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    window.__subrio = { state, finish, loadStage, get level() { return state.level; }, get boss() { return state.boss; }, get phase() { return state.phase; },
      skipTo(phase) { if (phase === 'play') { state.phase = 'flash'; state.phaseT = 0.9; } else { state.phase = phase; state.phaseT = 0; } } };
  });
}


/** 레벨을 한 번 구워 둔다(매 프레임 타일 루프 금지). 타일 그림이 늦게 오면 그때 다시 칠한다. fallback: [속, 윗면, 블록] 색 */
function bakeLevel(level, fallback = ['#3e1c6e', '#6030a0', '#804cc4']) {
  const canvas = document.createElement('canvas');
  canvas.width = level.width; canvas.height = level.height;
  const paint = (img) => {
    const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < level.rows; r++) for (let x = 0; x < level.cols; x++) {
      const ch = level.tiles[r][x]; if (ch === '.') continue;
      const col = ATLAS_COLUMN[ch];
      if (img) c.drawImage(img, col * TILE, 0, TILE, TILE, x * TILE, r * TILE, TILE, TILE);
      else { c.fillStyle = ch === '#' ? fallback[0] : ch === '=' ? fallback[1] : ch === '|' || ch === 'F' ? '#c8c8dc' : fallback[2]; c.fillRect(x * TILE, r * TILE, TILE, TILE); }
    }
  };
  paint(null);
  return { canvas, paint };
}
