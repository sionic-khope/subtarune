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
import { buildLevel, makeActor, stepActor, followerIntent, updateProjectiles, frameOf, cameraX, atGoal, remainingEnemies, springNear, makeBoss, stepBoss, hitBoss, hurtActor,
  bossHitbox, bossFrame, bossBob, bossAttackHero, bossSpinCircle, bossSlamZone, clockVelocity, rectsOverlap, makeEnemy, stepEnemy, damageEnemy, heroTouchesEnemy, enemyFrame, brandThink, zileanThink, burstClocks, NO_INTENT,
  STAGES, MONSTERS, TOTEM_HIT_LINES, BOSS, BOSS_INTRO, BOSS_ENRAGE, MARIO_HEAL, landingY, SPEAR, FIRE, CLOCK, ENEMY, DAMAGE, TILE, VIEW_W, VIEW_H, ATLAS_COLUMN, WATER_W, WATER_H,
  RESULT, makeStats, resultView } from './subrio-core.js';

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
const BOSS_SKILLS_SHEET = 'assets/sprites/subrio_bidet_skills.png';
const BOSS_CELL = [224, 192], BOSS_FEET = 180;
const MARIO_STILL = 'assets/sprites/mini_mario.png';
const MUSHROOM = 'assets/props/editor-union-mushroom.png';
const SPRING_SHEET = 'assets/props/subrio_spring.png';
// 오프닝(사용자): 첫 스테이지에 떨어지기 전 5초 동안 맵을 관광하듯 카메라가 흐르고 SUBRIO 로고 + 전투 승리음, 그 뒤 긴 흰 페이드
const OPENING_TOUR = 5.0, OPENING_FADE = 1.4;
const HERO_CELL = 64, HERO_FEET = 60;
const CLEAR_HOLD = 2.2, CARD_FADE = 0.5, CARD_HOLD = 1.9, BOSS_DELAY = 1.2, VICTORY_HOLD = 3.6, DEAD_HOLD = 1.6;
const HERO_ID = 'hyungsub';
const BOSS_APPEAR_LINE = '따듯한비데가 나타났다!';
// 위치 대사: 한 줄이 다 찍힌 뒤 CHAT_HOLD 초 있다가 다음 줄(C 불필요). 화자 색은 직업 선택 포인터 색과 같다
const CHAT_HOLD = 1.7;
const WHO = { ppaman: { label: '억빠맨', color: '#c9a3ff', voice: 'ppaman' }, gyeongsub: { label: '경섭', color: '#ff5c5c', voice: 'gyeongsub' }, hyungsub: { label: '요플래', color: '#7fd0ff', voice: 'hyungsub' }, bidet: { label: '따듯한비데', color: '#ffb3b3', voice: 'warm_bidet' }, narrator: { label: null, color: '#fff', voice: 'narrator' } };

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
    const bossSkillsImg = loadImage(BOSS_SKILLS_SHEET);
    const marioImg = loadImage(MARIO_STILL);
    const mushroomImg = loadImage(MUSHROOM);
    const springImg = loadImage(SPRING_SHEET);
    const enemyImgs = {};
    const enemyImg = (type) => { const src = (MONSTERS[type] || MONSTERS.cs_red).sheet; if (!enemyImgs[src]) enemyImgs[src] = loadImage(src); return enemyImgs[src].img; };
    const tileImgs = {};
    const tilesFor = (path) => { if (!tileImgs[path]) tileImgs[path] = loadImage(path); return tileImgs[path]; };
    const typer = new Typewriter(game.sound);
    const chatTyper = new Typewriter(game.sound);
    const state = {
      phase: 'logo', t: 0, phaseT: 0, logoAlpha: 0, lineIndex: 0, icons: [0, 0, 0], cursors: [0, 0, 0], picked: [false, false, false],
      cursorScript: null, flash: 0, actors: [], spears: [], fires: [], clocks: [], waters: [], enemies: [], trail: [], control: false, cam: 0, exiting: false,
      // 스테이지 진행: stage 번호, sub = drop(낙하) | run | clear | card | victory, fade 검은 덮개, shake 흔들림, cleared 보스 격파
      stage: 0, level: null, baked: null, sub: 'drop', subT: 0, fade: 0, shake: 0, boss: null, bossGone: false, cleared: false, notice: null, leaderLandT: 0,
      // 위치 대사 큐·연출(fx)·튜토리얼 상태(동료 공격 해제 여부·밟기 시범)
      chat: { queue: [], line: null, holdT: 0 }, fired: new Set(), fx: [], teamAttack: true, totemHit: false, demo: null, demoDone: false,
      // 인게임 메뉴(Tab/V): 열린 동안 섭리오는 멈추고 오버레이를 숨겨 게임 메뉴가 보이게 한다
      paused: false,
      // 보스전 도트마리오 버섯(40초마다 오른쪽 벽 위로), 오프닝 관광 카메라, 1-4 오프닝 연출(intro)·보스전 시작 여부(bossFight)·상단 배너
      mario: null, marioTimer: 0, mushrooms: [], flashRate: 1.1, intro: null, bossFight: false, banner: null,
      // 결과창(보스 격파 뒤): 플레이 통계와 진행 상태
      stats: makeStats(), result: null,
    };
    const escapesAtStart = game.escapes || 0;
    const say = (lines) => { for (const line of lines) state.chat.queue.push(line); };
    const chatBusy = () => !!state.chat.line || state.chat.queue.length > 0;
    // 스테이지 로드: 레벨·구운 타일·세 명 재배치(하늘에서 낙하). 보스 무대면 보스는 주인공 착지 뒤에 떨어진다
    const loadStage = (index) => {
      state.stage = index;
      const level = buildLevel(index);
      state.level = level; state.baked = bakeLevel(level, level.def.fallback);
      tilesFor(level.def.tiles).done.then(img => { if (img && state.level === level) state.baked.paint(img); });
      state.spears = []; state.fires = []; state.clocks = []; state.waters = []; state.trail = []; state.cam = 0; state.boss = null; state.bossGone = false; state.notice = null; state.leaderLandT = 0;
      state.enemies = level.enemies.map(spec => makeEnemy(spec.type, spec.x, spec.y, -1, spec));
      state.chat = { queue: [], line: null, holdT: 0 }; state.fired = new Set(); state.fx = []; state.mario = null; state.marioTimer = 0; state.mushrooms = []; state.shots = [];
      state.intro = null; state.bossFight = false; state.banner = null;
      // 1-4: 들어가면 브금이 꺼진다(사용자). 오프닝 뒤 START!! 에서 다시 켠다
      if (level.def.boss) game.sound.stopBgm(0.6);
      // 1-0 에선 요플래가 토템을 먼저 때리기 전까지 동료가 공격하지 않는다
      state.teamAttack = !level.def.tutorial; state.totemHit = false; state.demo = null; state.demoDone = false;
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
      state.phase = 'play'; state.phaseT = 0; state.stats = makeStats(); state.result = null;
      loadStage(0);
      // 오프닝: 세 명은 아직 안 떨어지고 카메라가 맵을 훑는다(5초) → 흰 페이드 → 낙하
      state.sub = 'opening'; state.subT = 0; state.flash = 0; state.flashRate = 1.1;
      for (const actor of state.actors) actor.active = false;
      game.sound.stopBgm(0.2);
      // SWORD 원본은 124~129.5초가 물소리·무음(사용자가 준 소스) → 123초부터 1초 줄였다가 처음으로 되감아 끊김 없이 돈다(마지막 악절은 버림)
      game.sound.playBgm('subrio_sword', { volume: 0.42, loopEnd: 124.0, loopFade: 1.0 });
      sfx('won', 0.85);
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

    const openMenu = () => {
      state.paused = true; game.state = 'menu'; game.menu = { index: 0, sub: null }; game.sound.sfx('open');
      ov.root.style.transition = 'opacity 0.15s ease'; ov.root.style.opacity = '0';
    };
    const resumeFromMenu = () => {
      state.paused = false; prev.menu = true;
      ov.root.style.opacity = '1'; setTimeout(() => { ov.root.style.transition = 'opacity 0.6s ease'; }, 200);
    };
    const update = (dt) => {
      // 메뉴가 열려 있으면 게임 루프(main.js)가 메뉴를 진행한다. 닫히면 재개, 비상탈출이면 섭리오를 접는다
      if (state.paused) {
        if ((game.escapes || 0) !== escapesAtStart || game.transitioning) { finish(); return; }
        if (game.state !== 'menu') resumeFromMenu();
        edge('menu'); edge('confirm'); edge('title');
        return;
      }
      state.t += dt; state.phaseT += dt;
      const confirm = edge('confirm');
      if (edge('title')) { finish(); return; }
      if (edge('menu') && state.phase === 'play' && !state.exiting) { openMenu(); return; }
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

    const updateResult = (dt, confirm) => {
      const r = state.result; r.t += dt; state.fade = 1;
      const view = resultView(r.t, state.stats);
      if (view.title && !r.titleSfx) { r.titleSfx = true; sfx('levelup', 0.9); }
      // 숫자가 올라가는 동안 메뉴 이동음이 빠르게(띠리리링), 다 차면 선택음
      for (const row of view.rows) {
        if (!row.shown || r.rowDone[row.key]) continue;
        r.tick -= dt;
        if (r.tick <= 0) { r.tick = 0.055; sfx('menumove', 0.5, 0, 1 + row.k * 0.6); }
        if (row.k >= 1) { r.rowDone[row.key] = true; sfx('select', 0.6); }
      }
      if (view.stamp > 0 && !r.stampSfx) { r.stampSfx = true; sfx('orchhit', 0.9); sfx('impact', 0.6); state.shake = 0.35; }
      if (view.stampDone && !r.shineSfx && r.t >= view.stampAt + RESULT.stampTime + 0.25) { r.shineSfx = true; sfx('great_shine', 0.55); }
      if (!r.leaving && (view.finished || (view.canSkip && confirm))) { r.leaving = true; if (!view.finished) sfx('confirm', 0.6); }
      if (r.leaving) { r.out = Math.min(1, (r.out || 0) + dt / RESULT.fade); if (r.out >= 1) finish(); }
      r.view = view;
    };
    const updatePlay = (dt, confirm) => {
      state.shake = Math.max(0, state.shake - dt);
      state.subT += dt;
      if (state.sub === 'result') { updateResult(dt, confirm); return; }
      if (state.sub !== 'opening' && state.sub !== 'victory') state.stats.time += dt;
      const level = state.level, leader = state.actors[0], def = level.def;
      if (state.sub === 'opening') {
        // 관광: 직업 선택 뒤의 흰 화면이 1초에 걷히며 카메라가 왼쪽에서 오른쪽으로 천천히(ease) → 5초 뒤 흰 페이드(1.4초) → 낙하 시작(밝아지는 데 1.4초)
        const k = Math.min(1, state.subT / OPENING_TOUR), ease = k * k * (3 - 2 * k);
        state.cam = Math.round(Math.min(level.width - VIEW_W, 880) * ease);
        if (state.subT < OPENING_TOUR) state.flash = Math.max(0, state.flash - dt * 1.2);
        else state.flash = Math.min(1, (state.subT - OPENING_TOUR) / OPENING_FADE);
        if (state.subT >= OPENING_TOUR + OPENING_FADE) { state.sub = 'drop'; state.subT = 0; state.flash = 1; state.flashRate = 1 / OPENING_FADE; }
        return;
      }
      state.flash = Math.max(0, state.flash - dt * state.flashRate);
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
        // 검게 → 결과창(브금은 끄고 결과 소리만)
        if (state.subT >= VICTORY_HOLD) { state.fade = Math.min(1, state.fade + dt / CARD_FADE); if (state.subT >= VICTORY_HOLD + 1.2) { state.sub = 'result'; state.subT = 0; state.fade = 1; state.result = { t: 0, tick: 0, rowDone: {}, out: 0 }; game.sound.stopBgm(1.0); } }
      }
      const events = [];
      const wasGuard = leader.state === 'guard';
      // 위치 대사 트리거(at: 열 통과 / see: 그 종류 몬스터가 화면에 보일 때 / when:'cleared': 남은 몬스터 0) + 큐 진행
      for (const trig of level.chatter) {
        if (state.fired.has(trig.id)) continue;
        let fire = false;
        if (trig.at !== undefined) fire = leader.x + leader.w / 2 >= trig.at * TILE;
        else if (trig.see) fire = state.enemies.some(e => !e.dead && trig.see.includes(e.type) && e.x + e.w > state.cam && e.x < state.cam + VIEW_W);
        else if (trig.when === 'cleared') fire = state.sub === 'run' && remainingEnemies(state.enemies) === 0;
        if (fire) { state.fired.add(trig.id); say(trig.lines); }
      }
      updateChat(dt);
      // 회복 샘물: 근처에서 C → 체력 가득(창은 안 나간다)
      const nearSpring = state.sub === 'run' && springNear(level, leader);
      let attackNow = confirm, attackHeldNow = held('confirm');
      if (nearSpring && confirm) {
        attackNow = false; attackHeldNow = false;
        game.partyHp[HERO_ID] = game.maxHpOf(HERO_ID); state.hpFlash = 0; sfx('heal', 0.8);
        state.fx.push({ kind: 'ring', x: nearSpring.x, y: nearSpring.y, t: 0, dur: 0.6, r0: 6, r1: 30, color: '150,220,255', width: 3 });
        if (!chatBusy()) say([{ who: 'narrator', text: '샘물을 마셨다. 체력이 회복되었다!' }]);
      }
      // 깃발: 근처에서 C → 몬스터가 남았으면 알려주고, 다 잡았으면 클리어(창은 안 나간다)
      const nearFlag = state.sub === 'run' && !def.boss && atGoal(level, leader);
      if (nearFlag && confirm) {
        attackNow = false; attackHeldNow = false;
        const left = remainingEnemies(state.enemies);
        if (left > 0) { if (!chatBusy()) say([{ who: 'narrator', text: `아직 몬스터가 ${left}마리 남았다. 다 잡아야 넘어갈 수 있다.` }]); sfx('error', 0.6); }
        else { state.sub = 'clear'; state.subT = 0; state.control = false; state.chat = { queue: [], line: null, holdT: 0 }; sfx('won', 0.85); }
      }
      // 1-0 밟기 시범: 모두 멈추고 억빠맨 혼자 나가 약한 미니언을 밟는다
      updateDemo(dt);
      for (const [i, actor] of state.actors.entries()) {
        if (!actor.active) { if (state.subT >= actor.delay) actor.active = true; else continue; }
        let intent;
        const scripted = state.demo?.intents || state.intro?.intents;
        if (scripted) intent = scripted[actor.id] || scripted[actor.classId] || NO_INTENT;
        else if (i === 0) {
          intent = state.control ? { left: held('left'), right: held('right'), jump: edge('up'), jumpHeld: held('up'), crouch: held('down'), attack: attackNow, attackHeld: attackHeldNow, guard: held('cancel') } : NO_INTENT;
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
      const targets = [...state.enemies.filter(e => !e.dead && !e.demo), ...(state.boss && !state.boss.dead && state.boss.state !== 'enter' ? [state.boss] : [])];
      if (state.control && state.teamAttack) {
        const brand = state.actors.find(a => a.classId === 'brand'), zilean = state.actors.find(a => a.classId === 'zilean');
        if (brand?.active) brandThink(brand, targets, dt, events);
        if (zilean?.active) zileanThink(zilean, targets, dt, events);
      }
      const demoActor = state.demo ? state.actors.find(a => a.classId === 'brand') : null;
      for (const enemy of state.enemies) {
        if (Math.abs(enemy.x - leader.x) > 900) continue;
        stepEnemy(level, enemy, dt, events, leader);
        if (!enemy.dead && !state.demo) heroTouchesEnemy(leader, enemy, state.t, events);
        if (!enemy.dead && demoActor && enemy.demo) heroTouchesEnemy(demoActor, enemy, state.t, events);
      }
      state.enemies = state.enemies.filter(enemy => !enemy.dead || enemy.deadT < ENEMY.deathTime);
      // 1-4: 세 명이 다 떨어지면 오프닝 연출(대사 → 가운데 내려찍기 → 둘러봄 → 대사 → 보스전/START!!) → 그 뒤 패턴
      if (def.boss && state.sub === 'drop' && !state.intro && state.actors.every(a => a.dropped) && state.subT > state.leaderLandT + 0.8) { state.sub = 'intro'; state.intro = { step: 0, t: 0, intents: {} }; state.control = false; }
      if (state.sub === 'intro') updateIntro(dt, events);
      if (state.boss) {
        const boss = state.boss;
        stepBoss(level, boss, leader, dt, events);
        if (!boss.dead && state.sub === 'run') { bossAttackHero(boss, leader, events); for (const f of state.actors.slice(1)) if (f.active) bossAttackHero(boss, f, events, true); }
        if (state.sub === 'run') updateMario(dt, events);
      }
      // 투사체 → 적/보스 (공격력 1). 시계는 같은 적에 둘 맞으면 스턴
      const hitTargets = (list, w, h, source) => list.filter(p => {
        const rect = { x: p.x, y: p.y, w, h };
        for (const enemy of state.enemies) {
          if (enemy.dead || !rectsOverlap(rect, enemy)) continue;
          damageEnemy(enemy, 1, source, state.t, events); events.push({ type: 'projectileHit', source, x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h, enemyType: enemy.type, byLeader: source === 'spear' }); return false;
        }
        if (state.boss && !state.boss.dead && rectsOverlap(rect, state.boss) && hitBoss(state.boss, events)) { events.push({ type: 'projectileHit', source, x: state.boss.x + state.boss.w / 2, y: state.boss.y + state.boss.h }); return false; }
        return true;
      });
      state.spears = hitTargets(state.spears, SPEAR.w, SPEAR.h, 'spear');
      state.fires = hitTargets(state.fires, FIRE.w, FIRE.h, 'fire');
      state.clocks = hitTargets(state.clocks, CLOCK.w, CLOCK.h, 'clock');
      state.waters = state.waters.filter(water => {
        if (leader.invuln > 0 || !rectsOverlap({ x: water.x, y: water.y, w: WATER_W, h: WATER_H }, leader)) return true;
        hurtActor(leader, water.x + WATER_W / 2, events, DAMAGE.water);
        return false;
      });
      // 레드·블루가 던진 것(불덩이·돌): 주인공에 닿으면 피해, 방패로 막힘
      state.shots = state.shots.filter(shot => {
        if (leader.invuln > 0 || !rectsOverlap({ x: shot.x, y: shot.y, w: shot.w, h: shot.h }, leader)) return true;
        hurtActor(leader, shot.x + shot.w / 2, events, shot.damage);
        return false;
      });
      for (const event of events) {
        if (event.type === 'land') { const actor = state.actors.find(a => a.id === event.id); if (actor && !actor.dropped) { actor.dropped = true; if (actor === leader) state.leaderLandT = state.subT; sfx('item', 0.7); } }
        if (event.type === 'jump' && event.id === 'hyungsub') sfx('jump', 0.5);
        if (event.type === 'fall' && event.id === HERO_ID) state.stats.falls += 1;
        if (event.type === 'chargeStart') sfx('pantheon_q_charge', 0.6, 1.1);
        if (event.type === 'attack' && event.id === 'hyungsub') {
          const charged = event.charged; state.stats.spears += 1;
          state.spears.push({ x: event.x, y: event.y, vx: event.facing * (charged ? SPEAR.chargedSpeed : SPEAR.speed), life: charged ? SPEAR.chargedLife : SPEAR.life, facing: event.facing, charged });
          sfx(charged ? 'pantheon_q_throw' : 'pantheon_q_tap', charged ? 0.8 : 0.55, charged ? 0.9 : 0.5);
        }
        if (event.type === 'fire') { state.fires.push({ x: event.x, y: event.y, vx: event.vx, life: FIRE.life, facing: event.facing, t: 0 }); sfx('ember', 0.8, 0.8); }
        if (event.type === 'clock') { state.clocks.push({ x: event.x, y: event.y, vx: event.vx, vy: event.vy, life: 2.2, t: 0 }); if (event.index === 0) sfx('zilean_q_throw', 0.7, 1.3); }
        if (event.type === 'projectileHit') {
          sfx(event.source === 'spear' ? 'pantheon_q_hit' : 'hit', 0.6, 0.5);
          // 시계: 땅에 노란 오오라 파장 피융(0.5초). 불: 맞은 자리에 불꽃 튐(불타는 건 적 위에 그림)
          if (event.source === 'clock' && event.x !== undefined) state.fx.push({ kind: 'ring', x: event.x, y: event.y, t: 0, dur: 0.5, r0: 6, r1: 26, color: '255,225,90', width: 3 });
          if (event.source === 'fire' && event.x !== undefined) for (let i = 0; i < 6; i++) state.fx.push({ kind: 'ember', x: event.x, y: event.y - 10, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 90, t: 0, dur: 0.45 + Math.random() * 0.3 });
          // 1-0: 요플래가 토템을 처음 때리면 동료 공격 해제 + 대사
          if (event.enemyType === 'totem' && event.byLeader && !state.totemHit) { state.totemHit = true; state.teamAttack = true; say(TOTEM_HIT_LINES); }
        }
        if (event.type === 'stun') { sfx('zilean_q_stun', 0.8, 2.0); const enemy = state.enemies.find(e => e.id === event.id); if (enemy) { state.fx.push({ kind: 'ring', x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h, t: 0, dur: 0.6, r0: 8, r1: 48, color: '255,235,120', width: 4 }); state.fx.push({ kind: 'ring', x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h, t: -0.12, dur: 0.6, r0: 6, r1: 40, color: '255,250,200', width: 2 }); } }
        if (event.type === 'stomp') { sfx('pop', 0.7); sfx('jump', 0.4); }
        if (event.type === 'enemyDead') { sfx('vaporized', 0.45, 0.6); state.stats.kills += 1; }
        if (event.type === 'bossLand') { sfx('thud', 0.9); state.shake = 0.35; }
        if (event.type === 'bossJump') sfx('wing', 0.35, 0, 0.7);
        if (event.type === 'swing') sfx('heavyswing', 0.8);
        // 거슨전 참고 패턴 소리(전부 델타룬 공식): 순간이동 spearappear, 영역 표시 bell(띵), 낙하 wing(휘융), 착지 impact, 회전 예비 power, 회전 ultraswing
        if (event.type === 'bossVanish') { sfx('spearappear', 0.7); for (let i = 0; i < 10; i++) state.fx.push({ kind: 'ember', x: state.boss.x + Math.random() * state.boss.w, y: state.boss.y + Math.random() * state.boss.h, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, t: 0, dur: 0.5, color: 'violet' }); }
        if (event.type === 'bossMarker') sfx('bell', 0.9);
        if (event.type === 'bossDive') sfx('wing', 0.9);
        if (event.type === 'bossSlam') { sfx('impact', 0.9); state.shake = 0.45; state.fx.push({ kind: 'ring', x: state.boss.x + state.boss.w / 2, y: state.boss.y + state.boss.h, t: 0, dur: 0.5, r0: 20, r1: 90, color: '255,160,90', width: 4 }); for (let i = 0; i < 12; i++) state.fx.push({ kind: 'ember', x: state.boss.x + Math.random() * state.boss.w, y: state.boss.y + state.boss.h - 4, vx: (Math.random() - 0.5) * 240, vy: -80 - Math.random() * 140, t: 0, dur: 0.5, color: 'dust' }); }
        if (event.type === 'bossSpinWind') sfx('power', 0.8);
        if (event.type === 'bossSpin') { sfx('ultraswing', 0.9); state.shake = Math.max(state.shake, 0.2); }
        if (event.type === 'slowed') { state.notice = null; }
        if (event.type === 'marioHeal') { state.stats.mushrooms += 1; sfx('item', 0.8); say([{ who: 'narrator', text: `도트마리오의 버섯! 체력이 ${MARIO_HEAL.heal} 회복되었다.` }]); }
        if (event.type === 'water') { state.waters.push({ x: event.x, y: event.y, vx: event.vx, life: BOSS.waterLife, facing: event.facing }); sfx('splash', 0.5, 0, 1.3); }
        if (event.type === 'bossHit') sfx('hit', 0.7);
        if (event.type === 'bossImmune') sfx('knock', 0.45, 0.3, 1.3);
        // 격노(체력 절반): 붉어지고 패턴이 빨라진다 + 억빠맨 한 줄(사용자)
        if (event.type === 'bossEnrage') { sfx('power', 0.9); state.shake = 0.35; say([BOSS_ENRAGE.line]); for (let i = 0; i < 14; i++) state.fx.push({ kind: 'ember', x: state.boss.x + Math.random() * state.boss.w, y: state.boss.y + Math.random() * state.boss.h, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 90, t: 0, dur: 0.6 }); }
        if (event.type === 'enemyThrow') { state.shots.push({ x: event.x, y: event.y, vx: event.vx, vy: event.vy, w: event.w, h: event.h, life: 2.6, damage: event.damage, kind: event.kind, t: 0 }); sfx(event.kind === 'red' ? 'ember' : 'pop', 0.6, 0.5); }
        if (event.type === 'block') sfx('pantheon_e_block', 0.8, 0.6);
        if (event.type === 'hurt') {
          sfx('hurt', 0.8); state.shake = Math.max(state.shake, 0.18);
          // RPG 체력이 깎인다(인게임 메뉴와 같은 값). 0 이면 쓰러졌다가 마지막 자리에서 체력 가득 재낙하(게임오버 없음)
          if (event.damage > 0 && event.id === HERO_ID) {
            game.partyHp[HERO_ID] = Math.max(0, game.hpOf(HERO_ID) - event.damage);
            state.hpFlash = 0.5; state.stats.hits += 1;
            if (game.hpOf(HERO_ID) <= 0 && state.sub === 'run') { state.stats.downs += 1; state.sub = 'dead'; state.subT = 0; state.control = false; leader.charge = 0; sfx('damage', 0.8); }
          }
        }
        if (event.type === 'bossDead') { state.sub = 'victory'; state.subT = 0; state.control = false; state.cleared = true; state.waters = []; sfx('explosion', 0.7); state.shake = 0.5; }
      }
      state.spears = updateProjectiles(level, state.spears, dt, SPEAR.w, SPEAR.h);
      // 불덩이 꼬리: 지나간 자리에 작은 불씨가 흩날린다(더 불답게)
      for (const fire of state.fires) if (Math.random() < 0.9) state.fx.push({ kind: 'ember', x: fire.x + 6 - fire.facing * 6, y: fire.y + 6, vx: -fire.facing * (20 + Math.random() * 40), vy: -30 - Math.random() * 50, t: 0, dur: 0.3 + Math.random() * 0.25 });
      state.fires = updateProjectiles(level, state.fires, dt, FIRE.w, FIRE.h);
      const clocksBefore = state.clocks;
      state.clocks = updateProjectiles(level, state.clocks, dt, CLOCK.w, CLOCK.h, CLOCK.gravity);
      // 바닥에 떨어진 시계는 터지며 근처 적에 피해(같은 적에 둘이면 스턴)
      const burstEvents = [];
      burstClocks(clocksBefore.filter(c => c.dead), state.enemies, state.t, burstEvents);
      for (const event of burstEvents) { if (event.type === 'stun') sfx('zilean_q_stun', 0.8, 2.0); else if (event.type === 'projectileHit') sfx('hit', 0.5, 0.4); else if (event.type === 'enemyDead') { sfx('vaporized', 0.45, 0.6); state.stats.kills += 1; } }
      state.waters = updateProjectiles(level, state.waters, dt, WATER_W, WATER_H);
      state.shots = updateProjectiles(level, state.shots, dt, 14, 14, ENEMY.throwGravity);
      for (const p of [...state.fires, ...state.clocks, ...state.shots]) p.t += dt;
      if (state.notice) { state.notice.t += dt; if (state.notice.t > state.notice.hold) state.notice = null; }
      for (const f of state.fx) { f.t += dt; if (f.kind === 'ember') { f.vy += 90 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } }
      state.fx = state.fx.filter(f => f.t < f.dur);
      state.hpFlash = Math.max(0, (state.hpFlash || 0) - dt);
      if (state.sub === 'dead' && state.subT >= DEAD_HOLD) {
        game.partyHp[HERO_ID] = game.maxHpOf(HERO_ID);
        Object.assign(leader, { x: Math.round(Math.max(16, leader.safeX - 40) - leader.w / 2), y: -60, vx: 0, vy: 0, hurtT: 0, invuln: 1.5, state: 'idle', grounded: false, dropped: false, charge: 0 });
        state.waters = []; state.sub = 'drop'; state.subT = 0; state.leaderLandT = 0; state.dropWait = 0.6;
        if (state.boss && !state.boss.dead) Object.assign(state.boss, { x: Math.round(level.bossSpawnX - state.boss.w / 2), vx: 0, state: 'roar', stateT: 0, shot: 0 });
      }
      if (state.sub === 'drop' && !def.boss && leader.dropped && state.subT > state.leaderLandT + (state.dropWait ?? 1.9)) { state.sub = 'run'; state.control = true; state.dropWait = 1.9; }
      if (state.banner) { state.banner.t += dt; if (state.banner.t > state.banner.hold) state.banner = null; }
      if (state.sub === 'clear' && state.subT >= CLEAR_HOLD) { state.sub = 'card'; state.subT = 0; state.cardShown = false; state.cardLoaded = false; }
      state.cam = cameraX(level, leader);
    };
    // 1-4 오프닝(사용자 브리핑 원문): 0 대사 두 줄 → 1 비데 목소리 → 2 가운데 영역 표시(띵)·모두 양옆으로 → 3 낙하·착지 → 4 좌우 둘러봄 → 5 대사 세 줄
    //   → 6 ‘보스전’(빨간 글씨) → 7 START!!(파앗) + 비데 사라짐 → 패턴 시작·조작·브금
    const walkTo = (actor, targetX) => { const dx = targetX - (actor.x + actor.w / 2); return Math.abs(dx) > 6 ? { ...NO_INTENT, right: dx > 0, left: dx < 0 } : NO_INTENT; };
    const updateIntro = (dt, events) => {
      const level = state.level, it = state.intro; it.t += dt;
      const centerX = level.width / 2;
      if (it.step === 0) { say(BOSS_INTRO.before); it.step = 1; }
      else if (it.step === 1) { if (!chatBusy()) { say(BOSS_INTRO.voice); it.step = 2; } }
      else if (it.step === 2) {
        if (!chatBusy()) {
          // 비데는 아직 안 보이고, 가운데에 영역 표시(띵) → 모두 양옆으로 갈라진다
          const boss = makeBoss(centerX, -60);
          boss.hidden = true; boss.state = 'marker'; boss.stateT = 0; boss.lastAction = 'slam'; boss.markerX = centerX; boss.x = Math.round(centerX - boss.w / 2); boss.y = -boss.h - 40;
          boss.markerY = landingY(level, boss.x, boss.x + boss.w);
          state.boss = boss; sfx('bell', 0.9); it.step = 3; it.t = 0;
        }
      }
      else if (it.step === 3) {
        for (const actor of state.actors) it.intents[actor.id] = walkTo(actor, centerX + BOSS_INTRO.split[actor.id]);
        // stepBoss 가 marker → dive → slam 을 진행한다. 착지 회복에 들어가면 서서 좌우를 둘러본다
        if (state.boss.state === 'recover') { state.boss.state = 'intro'; state.boss.stateT = 0; state.boss.facing = -1; it.step = 4; it.t = 0; }
      }
      else if (it.step === 4) {
        // 갈라지는 걸음은 둘러보는 동안 계속(자리에 닿을 때까지)
        for (const actor of state.actors) it.intents[actor.id] = walkTo(actor, centerX + BOSS_INTRO.split[actor.id]);
        if (it.t >= BOSS_INTRO.lookHold && state.boss.facing < 0) state.boss.facing = 1;
        if (it.t >= BOSS_INTRO.lookHold * 2) { state.boss.facing = -1; say(BOSS_INTRO.after); it.step = 5; it.intents = {}; }
      }
      else if (it.step === 5) { if (!chatBusy()) { state.banner = { text: '보스전', color: '#ff4a4a', size: 30, t: 0, hold: 9 }; sfx('power', 0.7); it.step = 6; it.t = 0; } }
      else if (it.step === 6) {
        if (it.t >= BOSS_INTRO.bannerHold) {
          // START!! 파앗 — 흰 번쩍 + 비데가 사라지며 첫 패턴(순간이동 내려찍기)
          state.banner = { text: 'START!!', color: '#ffe066', size: 36, t: 0, hold: 1.4 };
          state.flash = 1; state.flashRate = 1 / 0.5; sfx('bell', 0.9); sfx('spearappear', 0.8);
          const boss = state.boss; boss.state = 'vanish'; boss.stateT = 0; boss.lastAction = 'slam'; boss.seq = 3;
          it.step = 7; it.t = 0;
        }
      }
      else if (it.step === 7) {
        if (it.t >= BOSS_INTRO.startHold) {
          state.sub = 'run'; state.control = true; state.bossFight = true; state.intro = null;
          game.sound.playBgm('subrio_sword', { volume: 0.42, loopEnd: 124.0, loopFade: 1.0 });
        }
      }
    };
    // 보스전 도트마리오: 40초마다 오른쪽 벽 위(x464, y80)로 천천히 걸어 들어와 주인공 쪽으로 버섯을 던지고 다시 나간다. 버섯을 먹으면 30 회복
    const updateMario = (dt, events) => {
      const level = state.level, leader = state.actors[0];
      if (state.sub !== 'run' || !state.boss || state.boss.dead) return;
      const wallTop = 5 * TILE, edgeX = level.width + 24, standX = level.width - 12;
      if (!state.mario) {
        state.marioTimer += dt;
        if (state.marioTimer >= (state.marioCount ? MARIO_HEAL.interval : MARIO_HEAL.first)) { state.marioTimer = 0; state.marioCount = (state.marioCount || 0) + 1; state.mario = { phase: 'in', t: 0, x: edgeX, y: wallTop, facing: -1 }; }
      } else {
        const m = state.mario; m.t += dt;
        if (m.phase === 'in') { m.x = edgeX + (standX - edgeX) * Math.min(1, m.t / MARIO_HEAL.walkIn); if (m.t >= MARIO_HEAL.walkIn) { m.phase = 'throw'; m.t = 0; } }
        else if (m.phase === 'throw') {
          if (m.t >= 0.35 && !m.thrown) {
            m.thrown = true;
            const sx = m.x - 10, sy = m.y - 20, dx = leader.x + leader.w / 2 - sx, dy = leader.y - sy;
            const v = clockVelocity(dx, dy);
            state.mushrooms.push({ x: sx - 12, y: sy - 12, vx: v.vx, vy: v.vy, life: 8, t: 0 });
            sfx('mario_jump', 0.5, 0, 1.1);
          }
          if (m.t >= MARIO_HEAL.hold + 0.35) { m.phase = 'out'; m.t = 0; m.facing = 1; }
        }
        else if (m.phase === 'out') { m.x = standX + (edgeX - standX) * Math.min(1, m.t / MARIO_HEAL.walkOut); if (m.t >= MARIO_HEAL.walkOut) state.mario = null; }
      }
      // 버섯: 포물선으로 날아와 땅에 멈추고, 주인공이 닿으면 회복
      for (const mush of state.mushrooms) {
        mush.t += dt;
        if (!mush.landed) {
          mush.vy += MARIO_HEAL.mushroomGravity * dt;
          const nx = mush.x + mush.vx * dt, ny = mush.y + mush.vy * dt;
          const solidBelow = level.solidAt(Math.floor((nx + 12) / TILE), Math.floor((ny + 24) / TILE));
          if (solidBelow && mush.vy > 0) { mush.landed = true; mush.y = Math.floor((ny + 24) / TILE) * TILE - 24; mush.vx = 0; mush.vy = 0; }
          else { mush.x = nx; mush.y = ny; }
        }
        if (rectsOverlap({ x: mush.x, y: mush.y, w: 24, h: 24 }, leader)) { mush.dead = true; game.partyHp[HERO_ID] = Math.min(game.maxHpOf(HERO_ID), game.hpOf(HERO_ID) + MARIO_HEAL.heal); events.push({ type: 'marioHeal' }); }
        if (mush.t > mush.life || mush.y > level.height) mush.dead = true;
      }
      state.mushrooms = state.mushrooms.filter(m => !m.dead);
    };
    // 위치 대사: 한 글자씩 → 다 찍히면 CHAT_HOLD 뒤 다음 줄, 줄이 없으면 상자를 닫는다
    const updateChat = (dt) => {
      const chat = state.chat;
      if (!chat.line) { if (!chat.queue.length) return; chat.line = chat.queue.shift(); chatTyper.start(chat.line.text, WHO[chat.line.who]?.voice || 'narrator'); chat.holdT = 0; }
      chatTyper.update(dt);
      if (chatTyper.done) { chat.holdT += dt; if (chat.holdT >= CHAT_HOLD) chat.line = null; }
    };
    // 1-0 밟기 시범 상태기계: lines1 → walk(억빠맨이 미니언 쪽으로) → jump(밟기) → lines2 → return → 끝
    const updateDemo = (dt) => {
      const level = state.level, leader = state.actors[0];
      const demo = level.stompDemo;
      if (!demo || state.demoDone) return;
      const brand = state.actors.find(a => a.classId === 'brand');
      const target = state.enemies.find(e => e.demo);
      if (!state.demo) {
        if (state.sub !== 'run' || leader.x + leader.w / 2 < demo.at * TILE || !brand?.active || !target || target.dead) { if (target?.dead) state.demoDone = true; return; }
        state.demo = { phase: 'lines1', t: 0, intents: {} }; state.control = false; say(demo.before); return;
      }
      const d = state.demo; d.t += dt;
      const dx = target ? (target.x + target.w / 2) - (brand.x + brand.w / 2) : 0;
      d.intents = {};
      if (d.phase === 'lines1') { if (!chatBusy()) d.phase = 'walk'; }
      else if (d.phase === 'walk') { d.intents.brand = { ...NO_INTENT, right: dx > 0, left: dx < 0 }; if (Math.abs(dx) <= 30 && brand.grounded) { d.phase = 'jump'; d.jumped = false; } }
      else if (d.phase === 'jump') {
        d.intents.brand = { ...NO_INTENT, right: dx > 0, left: dx < 0, jump: !d.jumped, jumpHeld: true }; d.jumped = true;
        if (!target || target.dead) { d.phase = 'lines2'; d.intents.brand = NO_INTENT; say(demo.after); }
        else if (brand.grounded && d.t > 1.2 && Math.abs(dx) > 30) d.phase = 'walk';
      }
      else if (d.phase === 'lines2') { if (!chatBusy()) d.phase = 'return'; }
      else if (d.phase === 'return') {
        const back = (leader.x + leader.w / 2 + 40) - (brand.x + brand.w / 2);
        d.intents.brand = { ...NO_INTENT, left: back < -6, right: back > 6 };
        if (Math.abs(back) <= 6 || d.t > 8) { state.demo = null; state.demoDone = true; state.control = true; }
      }
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
    const drawBossZones = (boss) => {
      // 회전 예비: 보스 주변 빨간 원이 1초 동안 커지며 깜빡인다(경고). 회전 중엔 밝은 원
      if (boss.state === 'spinWind' || boss.state === 'spin') {
        const c = bossSpinCircle(boss), cx = c.x - state.cam + VIEW_X, cy = c.y + VIEW_Y;
        const k = boss.state === 'spinWind' ? Math.min(1, boss.stateT / BOSS.spinWind) : 1;
        const pulse = boss.state === 'spinWind' ? 0.45 + 0.35 * Math.abs(Math.sin(boss.stateT * 12)) : 0.85;
        ctx.fillStyle = `rgba(255,60,60,${(0.18 * pulse).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(cx, cy + c.r * 0.35, c.r * k, c.r * 0.5 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,80,80,${pulse.toFixed(3)})`; ctx.lineWidth = boss.state === 'spin' ? 3 : 2; ctx.beginPath(); ctx.ellipse(cx, cy + c.r * 0.35, c.r * k, c.r * 0.5 * k, 0, 0, Math.PI * 2); ctx.stroke();
        // 회전 중: 도끼가 지나간 자리에 붉은 잔상 호(세 겹, 뒤로 갈수록 옅게)가 보스 둘레를 돈다(사용자)
        if (boss.state === 'spin') {
          const a = (boss.stateT / BOSS.spinTime) * Math.PI * 2 * (boss.facing < 0 ? -1 : 1);
          for (let i = 0; i < 3; i++) {
            const lag = i * 0.45, alpha = 0.55 - i * 0.16;
            ctx.strokeStyle = `rgba(255,70,50,${alpha.toFixed(2)})`; ctx.lineWidth = 12 - i * 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.ellipse(cx, cy, c.r * 0.92, c.r * 0.46, 0, a - lag - 0.9, a - lag, false); ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
      // 회복 틈(때릴 차례): 발밑에 노란 고리가 숨 쉬듯 — 이때만 창·불·시계가 먹힌다
      if (boss.state === 'recover' || (boss.state === 'slam' && boss.stateT >= 0.2)) {
        const cx = boss.x + boss.w / 2 - state.cam + VIEW_X, fy = boss.y + boss.h + VIEW_Y + 2, pulse = 0.55 + 0.35 * Math.abs(Math.sin(state.t * 8));
        ctx.strokeStyle = `rgba(255,230,120,${pulse.toFixed(3)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, fy, boss.w * 0.7, 8, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // 내려찍기 영역: 바닥에 빨간 띠 + 위에 화살표(띵 뒤 0.75초)
      const zone = bossSlamZone(boss);
      if (zone && (boss.state === 'marker' || boss.state === 'dive')) {
        const floorY = zone.y + VIEW_Y, x = zone.x - state.cam + VIEW_X;
        const pulse = 0.5 + 0.4 * Math.abs(Math.sin(state.t * 14));
        ctx.fillStyle = `rgba(255,50,50,${(0.28 * pulse).toFixed(3)})`; ctx.fillRect(x, floorY - 10, zone.w, 10);
        ctx.strokeStyle = `rgba(255,90,90,${pulse.toFixed(3)})`; ctx.lineWidth = 2; ctx.strokeRect(x + 1, floorY - 10, zone.w - 2, 10);
        ctx.fillStyle = '#ff5c5c'; ctx.beginPath(); ctx.moveTo(x + zone.w / 2 - 8, floorY - 34); ctx.lineTo(x + zone.w / 2 + 8, floorY - 34); ctx.lineTo(x + zone.w / 2, floorY - 20); ctx.closePath(); ctx.fill();
      }
    };
    const drawBoss = (boss) => {
      if (boss.hidden) return;
      const frame = bossFrame(boss);
      const img = frame >= 100 ? bossSkillsImg.img : bossImg.img, idx = frame >= 100 ? frame - 100 : frame;
      const cx = Math.round(boss.x + boss.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(boss.y + boss.h) + VIEW_Y;
      // 격파 뒤엔 깜빡이며 사라진다
      if (boss.dead && (boss.deadT >= BOSS.deathTime || Math.floor(boss.deadT * 12) % 2 === 1)) return;
      ctx.save();
      ctx.translate(cx, feet - bossBob(boss));
      // 시트는 오른쪽을 본다 → 왼쪽을 볼 때 반전(전엔 반대로 뒤집어 늘 오른쪽만 보던 버그 — 2026-09-15)
      if (boss.facing < 0) ctx.scale(-1, 1);
      if (boss.state === 'vanish') ctx.globalAlpha = Math.max(0.1, 1 - boss.stateT / BOSS.vanish);
      if (boss.flash > 0 && 'filter' in ctx) ctx.filter = 'brightness(2.6) saturate(0.2)';
      else if (boss.enraged && 'filter' in ctx) ctx.filter = 'sepia(0.55) saturate(4.2) hue-rotate(-28deg) brightness(1.05)';
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, (idx % 2) * BOSS_CELL[0], Math.floor(idx / 2) * BOSS_CELL[1], BOSS_CELL[0], BOSS_CELL[1], -BOSS_CELL[0] / 2, -BOSS_FEET, BOSS_CELL[0], BOSS_CELL[1]);
      else { ctx.fillStyle = '#5a5a66'; ctx.fillRect(-boss.w / 2, -boss.h, boss.w, boss.h); }
      ctx.restore();
    };
    const drawSprings = () => {
      const img = springImg.img, leader = state.actors[0];
      for (const sp of state.level.springs) {
        const x = Math.round(sp.x - state.cam) + VIEW_X, y = Math.round(sp.y) + VIEW_Y;
        if (x < VIEW_X - 40 || x > VIEW_X + VIEW_W + 40) continue;
        const f = Math.floor(state.t * 3) % 2;
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, f * 32, 0, 32, 24, x - 16, y - 24, 32, 24);
        else { ctx.fillStyle = '#4c9af0'; ctx.fillRect(x - 12, y - 14, 24, 14); }
        if (state.sub === 'run' && springNear(state.level, leader) === sp) {
          const hy = y - 40 + Math.round(Math.sin(state.t * 4) * 2);
          ctx.fillStyle = '#000'; ctx.fillRect(x - 9, hy - 9, 18, 16); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - 8.5, hy - 8.5, 17, 15);
          text('C', x, hy - 7, { align: 'center', color: '#8ce27a', shadow: false });
        }
      }
    };
    const drawMario = () => {
      const m = state.mario, img = marioImg.img;
      for (const mush of state.mushrooms) {
        const mi = mushroomImg.img, x = Math.round(mush.x - state.cam) + VIEW_X, y = Math.round(mush.y) + VIEW_Y;
        if (mi && mi.complete && mi.naturalWidth) ctx.drawImage(mi, x, y - (mush.landed ? Math.round(Math.abs(Math.sin(mush.t * 5)) * 3) : 0), 24, 24); else { ctx.fillStyle = '#e04040'; ctx.fillRect(x, y, 24, 24); }
      }
      if (!m) return;
      const x = Math.round(m.x - state.cam) + VIEW_X, feet = Math.round(m.y) + VIEW_Y - (m.phase !== 'throw' ? Math.round(Math.abs(Math.sin(m.t * 10)) * 3) : 0);
      ctx.save(); ctx.translate(x, feet); if (m.facing > 0) ctx.scale(-1, 1);
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, 64, 64, -16, -30, 32, 32); else { ctx.fillStyle = '#e03030'; ctx.fillRect(-8, -28, 16, 28); }
      ctx.restore();
    };
    const drawFlame = (x, y, size, seed) => {
      // 작은 불꽃 한 송이: 주황 바깥 + 노란 속, 프레임마다 흔들린다
      const flick = Math.floor((state.t * 18 + seed) % 3);
      ctx.fillStyle = '#ff5a1e'; ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x, y - size * (1.8 + flick * 0.25)); ctx.lineTo(x + size, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(x - size * 0.5, y); ctx.lineTo(x + (flick - 1) * 0.6, y - size * (1.0 + flick * 0.15)); ctx.lineTo(x + size * 0.5, y); ctx.closePath(); ctx.fill();
    };
    const drawEnemy = (enemy) => {
      const kind = enemy.kind || MONSTERS[enemy.type] || MONSTERS.cs_red;
      const img = enemyImg(enemy.type);
      const cx = Math.round(enemy.x + enemy.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(enemy.y + enemy.h) + VIEW_Y;
      if (cx < VIEW_X - 60 || cx > VIEW_X + VIEW_W + 60) return;
      const frame = enemyFrame(enemy);
      const cw = kind.cell, ch = kind.cellH || kind.cell, cols = kind.static ? (kind.frames || 2) : 2;
      ctx.save();
      ctx.translate(cx, feet);
      if (enemy.facing < 0 && !kind.static) ctx.scale(-1, 1);
      if (enemy.flash > 0 && 'filter' in ctx) ctx.filter = 'brightness(2.6) saturate(0.2)';
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, (frame % cols) * cw, kind.static ? 0 : Math.floor(frame / 2) * ch, cw, ch, -cw / 2, -kind.feet, cw, ch);
      else { ctx.fillStyle = enemy.type === 'cs_blue' || enemy.type === 'blue' ? '#3a6ad4' : enemy.type === 'totem' ? '#a06a3a' : '#d43a3a'; ctx.fillRect(-enemy.w / 2, -enemy.h, enemy.w, enemy.h); }
      ctx.restore();
      // 불타는 중(브랜드 불에 맞음): 몸 위에 불꽃 셋이 일렁인다
      if (enemy.burnT > 0 && !enemy.dead) for (let i = 0; i < 3; i++) drawFlame(cx - enemy.w / 2 + 3 + i * (enemy.w - 6) / 2 + Math.sin(state.t * 13 + i) * 2, feet - enemy.h * (0.35 + 0.3 * ((i + Math.floor(state.t * 6)) % 2)), 4 + (i % 2), i * 7);
      // 스턴: 머리 위를 도는 노란 별 셋(시트의 별 위에 움직임을 얹는다)
      if (enemy.stunT > 0) for (let i = 0; i < 3; i++) {
        const a = state.t * 5 + i * 2.094;
        ctx.fillStyle = '#ffe14a'; ctx.fillRect(Math.round(cx + Math.cos(a) * 11) - 1, Math.round(feet - enemy.h - 12 + Math.sin(a) * 3) - 1, 3, 3);
      }
    };
    const drawGauge = (actor) => {
      // 쿨타임 게이지(사용자 지시: 머리 위에서 천천히 차는 흰 테두리·검은 배경 막대만, 글자 없음). 브랜드 불 6초(주황)·질리언 시계 1.2초(하늘색). 판테온은 없음
      const spec = actor.classId === 'brand' ? [actor.fireCool, FIRE.cooldown, '#ff9a3d'] : actor.classId === 'zilean' ? [actor.clockCool, CLOCK.cooldown, '#7fd7ff'] : null;
      if (!spec || !(spec[0] > 0)) return;
      const cx = Math.round(actor.x + actor.w / 2 - state.cam) + VIEW_X, top = Math.round(actor.y) + VIEW_Y - 20;
      const w = 22, h = 5, fill = Math.round((w - 2) * (1 - spec[0] / spec[1]));
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#000'; ctx.fillRect(cx - w / 2, top, w, h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(cx - w / 2 + 0.5, top + 0.5, w - 1, h - 1);
      ctx.fillStyle = spec[2]; ctx.fillRect(cx - w / 2 + 1, top + 1, fill, h - 2);
      ctx.globalAlpha = 1;
    };
    const drawFx = () => {
      for (const f of state.fx) {
        const k = Math.max(0, Math.min(1, f.t / f.dur));
        if (f.kind === 'ring') {
          if (f.t < 0) continue;
          const r = f.r0 + (f.r1 - f.r0) * (1 - (1 - k) * (1 - k)), a = (1 - k) * 0.9;
          const x = f.x - state.cam + VIEW_X, y = f.y + VIEW_Y;
          ctx.strokeStyle = `rgba(${f.color},${a.toFixed(3)})`; ctx.lineWidth = f.width * (1 - k * 0.6) + 0.5;
          ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(${f.color},${(a * 0.18).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
        } else if (f.kind === 'ember') {
          const x = Math.round(f.x - state.cam) + VIEW_X, y = Math.round(f.y) + VIEW_Y, sz = k < 0.5 ? 3 : 2;
          ctx.fillStyle = f.color === 'dust' ? (k < 0.5 ? '#c8b89a' : '#7a6a58') : f.color === 'violet' ? (k < 0.5 ? '#e0a0ff' : '#8040b0') : k < 0.4 ? '#ffd24a' : k < 0.75 ? '#ff7a2a' : '#8a3a1a'; ctx.fillRect(x, y, sz, sz);
        }
      }
    };
    const drawChat = () => {
      const chat = state.chat; if (!chat.line) return;
      const who = WHO[chat.line.who] || WHO.narrator;
      drawBox(who.label, chatTyper.visible, who.color, true);
    };
    const drawPrompts = () => {
      for (const prompt of state.level.prompts) {
        const x = prompt.at * TILE - state.cam + VIEW_X; if (x < VIEW_X - 240 || x > VIEW_X + VIEW_W + 240) continue;
        text(prompt.text, x, VIEW_Y + 168 + Math.round(Math.sin(state.t * 3) * 2), { align: 'center', size: 20, color: '#ffe066' });
      }
    };
    const drawProjectiles = () => {
      for (const spear of state.spears) {
        const img = spearImg.img; const sx = Math.round(spear.x - state.cam) + VIEW_X, sy = Math.round(spear.y) + VIEW_Y;
        if (img && img.complete && img.naturalWidth) { ctx.save(); ctx.translate(sx + 12, sy + 3); if (spear.facing < 0) ctx.scale(-1, 1); if (spear.charged && 'filter' in ctx) ctx.filter = 'brightness(1.6)'; ctx.drawImage(img, -12, -3); ctx.restore(); }
        else { ctx.fillStyle = '#e6d28c'; ctx.fillRect(sx, sy + 2, 20, 2); }
        if (spear.charged) { ctx.fillStyle = 'rgba(255,240,180,0.5)'; ctx.fillRect(sx - spear.facing * 10, sy + 2, 10, 2); }
      }
      for (const fire of state.fires) {
        // 불덩이: 앞이 둥글고 뒤로 길게 타는 꼬리 + 흔들리는 노란 속 (시계와 확실히 다르게)
        const fx = Math.round(fire.x - state.cam) + VIEW_X + 6, fy = Math.round(fire.y) + VIEW_Y + 6, flick = Math.floor(fire.t * 24) % 3, d = fire.facing;
        ctx.fillStyle = '#c8321a'; ctx.beginPath(); ctx.ellipse(fx - d * 8, fy, 12, 5 + flick, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff5a1e'; ctx.beginPath(); ctx.ellipse(fx - d * 4, fy, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffa030'; ctx.beginPath(); ctx.arc(fx + d * 1, fy, 5 + (flick === 1 ? 1 : 0), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe66a'; ctx.beginPath(); ctx.arc(fx + d * 2, fy - 1 + (flick === 2 ? 1 : 0), 3, 0, Math.PI * 2); ctx.fill();
        drawFlame(fx - d * 2, fy - 4, 3, 5); drawFlame(fx - d * 8, fy - 2, 2, 11);
      }
      for (const clock of state.clocks) {
        const cx = Math.round(clock.x - state.cam) + VIEW_X + 6, cy = Math.round(clock.y) + VIEW_Y + 6, spin = clock.t * 9;
        ctx.fillStyle = '#5a3a08'; ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3a2404'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(spin) * 3, cy + Math.sin(spin) * 3); ctx.stroke();
      }
      for (const shot of state.shots) {
        // 레드: 불덩이(주황 원 + 꼬리), 블루: 파란 돌(각진 덩어리)
        const sx = Math.round(shot.x - state.cam) + VIEW_X + 7, sy = Math.round(shot.y) + VIEW_Y + 7;
        if (shot.kind === 'red') { ctx.fillStyle = '#ff4a1e'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(sx - Math.sign(shot.vx) * 1, sy - 1, 3 + (Math.floor(shot.t * 20) % 2), 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillStyle = '#2a3e78'; ctx.fillRect(sx - 7, sy - 6, 14, 12); ctx.fillStyle = '#4c7ad8'; ctx.fillRect(sx - 5, sy - 5, 8, 6); ctx.fillStyle = '#9fd0ff'; ctx.fillRect(sx - 3, sy - 4, 3, 2); }
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
      // 요플래 체력(인게임 메뉴와 같은 값): 라벨 아래 막대 + 숫자. 맞으면 잠깐 붉게
      const hp = game.hpOf(HERO_ID), max = game.maxHpOf(HERO_ID), bx = VIEW_X + 8, by = VIEW_Y + 56, bw = 96;
      text('HP', bx, by - 2, { color: state.hpFlash > 0 ? '#ff6b6b' : '#fff' });
      ctx.fillStyle = '#000'; ctx.fillRect(bx + 22, by, bw + 2, 8);
      ctx.fillStyle = '#5a1020'; ctx.fillRect(bx + 23, by + 1, bw, 6);
      ctx.fillStyle = hp / max > 0.5 ? '#8ce27a' : hp / max > 0.25 ? '#ffd166' : '#ff5c5c'; ctx.fillRect(bx + 23, by + 1, Math.round(bw * hp / max), 6);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx + 22.5, by + 0.5, bw + 1, 7);
      text(`${hp} / ${max}`, bx + 22 + bw + 8, by - 2, { color: state.hpFlash > 0 ? '#ff6b6b' : '#fff' });
      text(`${level.def.title} ${level.def.name}`, VIEW_X + VIEW_W - 8, VIEW_Y + 6, { align: 'right', color: '#fff' });
      // 남은 몬스터(사용자: 오른쪽 상단, 다 잡아야 깃발에서 C 로 클리어)
      if (!level.def.boss) { const left = remainingEnemies(state.enemies); text(`남은 몬스터 ${left}`, VIEW_X + VIEW_W - 8, VIEW_Y + 24, { align: 'right', color: left === 0 ? '#8ce27a' : '#ffd166' }); }
      const boss = state.boss;
      if (boss && state.bossFight && !boss.dead) {
        const bw = 150, bx = VIEW_X + (VIEW_W - bw) / 2, by = VIEW_Y + 24;
        text(STAGES[4].name, VIEW_X + VIEW_W / 2, VIEW_Y + 6, { align: 'center', color: '#ffb3b3' });
        ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
        ctx.fillStyle = '#5a1020'; ctx.fillRect(bx, by, bw, 6);
        ctx.fillStyle = boss.enraged ? (Math.floor(state.t * 6) % 2 ? '#ff2a2a' : '#ff6a3a') : '#ff3b4a'; ctx.fillRect(bx, by, Math.round(bw * boss.hp / boss.maxHp), 6);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, 7);
      }
    };
    const drawCard = () => {
      const next = STAGES[Math.min(STAGES.length - 1, state.stage + 1)];
      const cx = VIEW_X + VIEW_W / 2, cy = VIEW_Y + VIEW_H / 2;
      text(next.title, cx, cy - 30, { align: 'center', size: 34, color: '#ffffff' });
      text(next.name, cx, cy + 20, { align: 'center', color: next.boss ? '#ffb3b3' : next.wave[1].replace(/rgba\(([^)]+),[^,]+\)$/, 'rgb($1)') });
    };
    // 결과창(BUILD172): 검은 화면, 제목이 팡 튀어나오고 줄마다 숫자가 올라간 뒤 오른쪽 아래에 빨간 S+!! 도장이 기울어져 내려찍힌다
    const drawResult = () => {
      const r = state.result, view = r.view || resultView(r.t, state.stats);
      const cx = VIEW_X + VIEW_W / 2;
      ctx.fillStyle = '#000'; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H);
      if (view.title) {
        const k = Math.min(1, (r.t - RESULT.titleAt) / 0.3), pop = 1 + (1 - k) * 1.1, bounce = Math.round(Math.abs(Math.sin(r.t * 3)) * 3);
        text(RESULT.title, cx, VIEW_Y + 24 - bounce, { align: 'center', size: Math.round(32 * pop), color: '#ffe066' });
        ctx.fillStyle = '#c8c8dc'; ctx.fillRect(VIEW_X + 44, VIEW_Y + 72, VIEW_W - 88, 2);
      }
      view.rows.forEach((row, i) => {
        if (!row.shown) return;
        const y = VIEW_Y + 86 + i * 24;
        ctx.globalAlpha = Math.min(1, (r.t - row.at) / 0.2);
        text(row.label, VIEW_X + 64, y, { color: '#c8c8dc' });
        text(row.text, VIEW_X + 296, y, { align: 'right', color: row.k >= 1 ? '#ffffff' : '#ffe066' });
        ctx.globalAlpha = 1;
      });
      if (view.rowsDone) { ctx.fillStyle = '#c8c8dc'; ctx.fillRect(VIEW_X + 44, VIEW_Y + 258, VIEW_W - 88, 2); text('종합 평가', VIEW_X + 64, VIEW_Y + 276, { color: '#c8c8dc' }); }
      if (view.stamp > 0) {
        const ease = 1 - Math.pow(1 - view.stamp, 3), scale = 2.6 - 1.6 * ease;
        ctx.save(); ctx.globalAlpha = Math.min(1, view.stamp * 1.6);
        ctx.translate(VIEW_X + VIEW_W - 96, VIEW_Y + VIEW_H - 62); ctx.rotate(-0.3); ctx.scale(scale, scale);
        ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 4; ctx.strokeRect(-62, -30, 124, 60); ctx.lineWidth = 2; ctx.strokeRect(-55, -23, 110, 46);
        ctx.font = FONT.replace(`${F.size}px`, '38px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ff3b3b'; ctx.fillText(`${view.rank}!!`, 0, 2);
        ctx.restore();
      }
      if (view.canSkip && !r.leaving && Math.floor(r.t * 2) % 2 === 0) text('C  계속', cx, VIEW_Y + VIEW_H - 20, { align: 'center', color: '#8f8fa6', size: 12 });
      if (r.out > 0) { ctx.fillStyle = `rgba(0,0,0,${r.out.toFixed(3)})`; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); }
    };
    const drawFlagHint = () => {
      const level = state.level, leader = state.actors[0];
      if (!level.goal || state.sub !== 'run' || !atGoal(level, leader)) return;
      const x = level.goal.x - state.cam + VIEW_X, y = level.goal.y + VIEW_Y - 14 + Math.round(Math.sin(state.t * 4) * 2);
      ctx.fillStyle = '#000'; ctx.fillRect(x - 9, y - 9, 18, 16); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x - 8.5, y - 8.5, 17, 15);
      text('C', x, y - 7, { align: 'center', color: '#ffe066', shadow: false });
    };
    const drawActor = (actor) => {
      const sheet = sheets[actor.classId]?.img;
      const frame = state.sub === 'dead' && actor === state.actors[0] ? 5 : frameOf(actor);
      const cx = Math.round(actor.x + actor.w / 2 - state.cam) + VIEW_X;
      const feet = Math.round(actor.y + actor.h) + VIEW_Y;
      // 무적 시간엔 깜빡인다(맞은 직후 0.35초는 계속 보임)
      if (actor.invuln > 0 && actor.hurtT <= 0 && Math.floor(state.t * 14) % 2 === 1) return;
      if (sheet && sheet.complete && sheet.naturalWidth) {
        const sx = (frame % 2) * HERO_CELL, sy = Math.floor(frame / 2) * HERO_CELL;
        ctx.save();
        ctx.translate(cx, feet);
        if (actor.facing < 0) ctx.scale(-1, 1);
        // 차징: 창 끝이 점점 밝아진다. 슬로우: 푸르게
        if (actor.state === 'charge' && 'filter' in ctx) ctx.filter = `brightness(${(1 + 0.6 * Math.min(1, actor.charge / SPEAR.chargeMax)).toFixed(2)})`;
        else if (actor.slowT > 0 && 'filter' in ctx) ctx.filter = 'hue-rotate(160deg) saturate(1.6) brightness(0.9)';
        ctx.drawImage(sheet, sx, sy, HERO_CELL, HERO_CELL, -HERO_CELL / 2, -HERO_FEET, HERO_CELL, HERO_CELL);
        ctx.restore();
      } else {
        const cls = CLASSES.find(c => c.id === actor.classId);
        ctx.fillStyle = cls?.color || '#fff';
        ctx.fillRect(cx - 6, feet - actor.h, 12, actor.h);
        ctx.fillStyle = '#000'; ctx.fillRect(cx + (actor.facing > 0 ? 2 : -5), feet - actor.h + 5, 3, 3);
      }
      if (actor.slowT > 0) text('SLOW', cx, feet - actor.h - 30, { align: 'center', color: '#7fd7ff' });
    };
    // top: 플레이 중 위치 대사는 HUD 아래(위쪽)에 띄워 바닥의 캐릭터·적을 가리지 않는다
    const drawBox = (speaker, body, color = '#fff', top = false) => {
      const bx = VIEW_X + 14, by = top ? VIEW_Y + 94 : VIEW_Y + VIEW_H - 84, bw = VIEW_W - 28, bh = 72;
      ctx.fillStyle = '#000'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
      if (speaker) { ctx.fillStyle = '#000'; ctx.fillRect(bx + 8, by - 20, 64, 22); ctx.strokeRect(bx + 9, by - 19, 62, 20); text(speaker, bx + 40, by - 17, { align: 'center', shadow: false, color }); }
      const lines = wrap(body, bw - 40);
      lines.forEach((line, i) => text('* ' + line, bx + 16, by + 12 + i * 20, { color: '#fff', shadow: false }));
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
          drawPrompts();
          drawSprings();
          if (state.boss) drawBossZones(state.boss);
          for (const enemy of state.enemies) drawEnemy(enemy);
          if (state.boss) drawBoss(state.boss);
          // 가운데 발판 띠를 보스 위에 다시 그린다 — 보스가 발판 아래를 지날 때 큰 머리가 발판 뒤로 들어가 보인다(끼어 보이던 문제, BUILD172)
          if (state.level.arena) for (const o of state.level.arena.overhang) ctx.drawImage(state.baked.canvas, o.x0, o.row * TILE, o.x1 - o.x0, TILE, o.x0 - state.cam + VIEW_X, o.row * TILE + VIEW_Y, o.x1 - o.x0, TILE);
          for (const actor of [...state.actors].reverse()) if (actor.active) drawActor(actor);
          drawMario();
          drawProjectiles();
          drawFx();
          for (const actor of state.actors) if (actor.active) drawGauge(actor);
          drawFlagHint();
          ctx.restore();
          if (state.sub === 'opening') {
            // 관광 오프닝: 로고가 크게, 아래에 부제. HUD 는 아직 없다
            const cx = VIEW_X + VIEW_W / 2, bounce = Math.round(Math.abs(Math.sin(state.subT * 3)) * 4);
            text('SUBRIO', cx, VIEW_Y + 70 - bounce, { align: 'center', size: 52, color: '#ffffff' });
            text('~ 엄청 대박인 배 · 게임 속 게임 ~', cx, VIEW_Y + 134, { align: 'center', color: '#ffe066' });
          } else drawHud();
          if (state.banner) { const b = state.banner, pop = b.t < 0.15 ? 1 + (0.15 - b.t) * 3 : 1; text(b.text, VIEW_X + VIEW_W / 2, VIEW_Y + 52, { align: 'center', size: Math.round(b.size * pop), color: b.color }); }
          if (state.sub === 'clear') text('STAGE CLEAR!', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 40, { align: 'center', size: 30, color: '#ffe066' });
          if (state.sub === 'dead') text('쓰러졌다...', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 40, { align: 'center', size: 24, color: '#ff8a8a' });
          if (state.sub === 'victory' && state.bossGone) text('CLEAR!', VIEW_X + VIEW_W / 2, VIEW_Y + VIEW_H / 2 - 40, { align: 'center', size: 36, color: '#ffe066' });
          if (state.notice) drawBox(null, state.notice.text);
          else drawChat();
        }
        if (state.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${state.fade})`; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); }
        if (state.sub === 'card' && state.fade >= 1) drawCard();
        if (state.sub === 'result') drawResult();
        if (state.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${state.flash})`; ctx.fillRect(VIEW_X, VIEW_Y, VIEW_W, VIEW_H); }
      }
      ctx.restore();
    };

    // ── 루프 ──
    let last = performance.now(), raf = 0;
    const frame = (now) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
      if (!state.exiting) update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    ov.fit(); addEventListener('resize', ov.fit);
    requestAnimationFrame(() => { ov.root.style.opacity = '1'; });
    raf = requestAnimationFrame(frame);
    window.__subrio = { state, finish, loadStage, get stats() { return state.stats; }, get level() { return state.level; }, get boss() { return state.boss; }, get phase() { return state.phase; },
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
