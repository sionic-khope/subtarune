const ID = 'choimis_runaway';
const K_ID = 'gyeongsub_scene', P_ID = 'ppaman_scene';
const C = text => ({ speaker: '최미스', portrait: 'choimis_flower', voice: 'choimis_flower', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const actor = game => game.entities.find(e => e.id === ID && !e.dead);
const close = { action: game => game.textbox.close() };
const CUE_SECONDS = { choimis_flower_hello: 1.29, choimis_flower_seup: 1.77, choimis_flower_sexy: 2.65, choimis_flower_gap: 1.53, choimis_flower_gonik: 1.85 };

/** Stop owned audio/flight work before a map, title, or QA reset. */
export function clearChoimisFlowerEffects(game) {
  const state = game.choimisFlower;
  if (!state) return;
  state.cancelled = true;
  state.audio?.pause();
  state.finishAudio?.();
  state.finishFlight?.();
  if (game.fx) game.fx = game.fx.filter(p => !p.choimisFlower);
  game.choimisFlower = null;
}

const effectState = game => game.choimisFlower || (game.choimisFlower = { ghosts: [], cancelled: false });

/** Play complete reaction clips without letting C overlap the next cue. */
export const flowerReaction = (key, line) => [
  { action: async game => {
    const state = effectState(game);
    if (!game.sound.muted && !game.sound.files[key]) await game.sound.loadSfxFiles([key]);
    if (state.cancelled) return;
    state.audio = game.sound.muted ? null : game.sound.files[key]?.cloneNode();
    state.audioDone = new Promise(resolve => {
      let timer, finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        state.audio?.removeEventListener('ended', finish);
        state.audio?.removeEventListener('error', finish);
        state.audio?.pause();
        state.finishAudio = null;
        resolve();
      };
      state.finishAudio = finish;
      if (!state.audio || state.audio.ended) finish();
      else {
        state.audio.addEventListener('ended', finish, { once: true });
        state.audio.addEventListener('error', finish, { once: true });
        state.audio.volume = 0.9;
        const duration = Number.isFinite(state.audio.duration) ? state.audio.duration : CUE_SECONDS[key];
        timer = setTimeout(finish, (duration + 2) * 1000);
        state.audio.play().catch(finish);
      }
    });
  } },
  { ...line, voice: 'none' },
  { action: game => game.choimisFlower?.audioDone },
];

/** Draw historical frames with the same sprite/pivot/rotation as the live actor. */
export function drawChoimisFlowerEffects(ctx, game, cam) {
  const state = game.choimisFlower;
  if (!state || state.cancelled) return;
  for (const ghost of state.ghosts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.38 * (1 - ghost.age / 0.42));
    ghost.actor.draw(ctx, cam);
    ctx.restore();
  }
}

/** Circle upward, then leave through the right edge with the existing wing cue. */
export function flyChoimisFlower(game) {
  const c = actor(game), state = effectState(game);
  const x = c.x, y = c.y;
  const cameraTarget = { x: x + c.w / 2, y: y + c.h / 2, w: 0, h: 0 };
  game.camera.target = cameraTarget; game.camera.locked = false;
  game.sound.sfx('wing', { volume: 0.8 });
  let elapsed = 0, trail = 0, pollen = 0;
  return new Promise(resolve => {
    state.finishFlight = resolve;
    game.background.push({ update(dt) {
      if (state.cancelled) return true;
      elapsed += dt; trail += dt; pollen += dt;
      const turn = Math.min(1, elapsed / 2.5);
      const exit = Math.max(0, Math.min(1, (elapsed - 2.5) / 1.4));
      const angle = turn * Math.PI * 4;
      c.x = x + Math.sin(angle) * 34 * (1 - turn) + exit * exit * 580;
      c.y = y;
      c.hopY = turn * 150 + Math.sin(angle) * 8 + exit * 24;
      c.spin = angle;
      c.facing = exit ? 'right' : ['down', 'left', 'up', 'right'][Math.floor(turn * 16) % 4];
      c.moving = false; c.frame = 0;
      cameraTarget.x = Math.min(c.x + c.w / 2, x + 180);
      cameraTarget.y = y + c.h / 2 - c.hopY;
      for (const ghost of state.ghosts) ghost.age += dt;
      state.ghosts = state.ghosts.filter(ghost => ghost.age < 0.42);
      if (trail >= 0.055 && elapsed < 3.9) {
        trail = 0;
        const snapshot = Object.assign(Object.create(Object.getPrototypeOf(c)), c, { def: { ...c.def }, motion: null, jitter: null, emote: null });
        state.ghosts.push({ actor: snapshot, age: 0 });
      }
      if (pollen >= 0.07 && elapsed < 3.9) {
        pollen = 0;
        const start = game.fx.length;
        game.emitDropletsAt(c.x + c.w / 2, c.y + c.h / 2 - c.hopY, 3, Math.floor(elapsed * 14) % 2 ? '#ffe7a0' : '#ffd6f0');
        for (const p of game.fx.slice(start)) { p.choimisFlower = true; p.vx *= 0.25; p.vy *= 0.2; }
      }
      if (elapsed < 4.4) return false;
      c.dead = true; state.ghosts = []; state.finishFlight = null; resolve(); return true;
    } });
  });
}

export const CHOIMIS_FLOWER = [
  { bgm: null },
  { action: game => {
    const c = actor(game);
    c.setSprite('choimis_flower'); c.motion = null; c.spin = 0; c.jitter = null; c.facing = 'down';
    game.sound.preloadBgm('choimis');
  } },
  { darkSmoke: null },
  { face: 'player', dir: 'toward:choimis_runaway' },
  { face: K_ID, dir: 'toward:choimis_runaway' },
  { face: P_ID, dir: 'toward:choimis_runaway' },
  { fade: 'in', duration: 0.9 }, { wait: 0.6 },
  { bgm: 'choimis', fadeIn: 1.2 },
  { async: [{ shake: 0.7, amp: 4 }] },
  ...flowerReaction('choimis_flower_hello', C('하핫 ~ 형님들 안녕하세요 미스에요~!!')), close,
  { bubble: ['player', K_ID, P_ID], gap: 0.4, hold: 0.7 },
  P('뭐지 씨2발 뭐랄까 더 좆같아졌네요'),
  ...flowerReaction('choimis_flower_gonik', C('하하핫~ 드디어 깨달았어요 고닉의 핵심!!')),
  C('(내 추구미는 쵸소우야)'),
  ...flowerReaction('choimis_flower_seup', C('스읍 미스')),
  C('그래 내가 지금까지 나의 모습을 너무 감춰왔던거같아.'),
  ...flowerReaction('choimis_flower_sexy', C('디스코드같은 가면빼고 나 자체가 섹시해지면 되는거였어.')),
  ...flowerReaction('choimis_flower_gap', C('나는.. 옷을 잘 입으니까!!')),
  K('...'),
  C('어이구 어이구 형님들. 뭐 질투나십니까?'),
  C('하하하...'), C('...'),
  C('장난은 여기까지만 하도록 하죠'),
  C('이제 이 모습으로 다시 점례에게 고백할건데'),
  C('분명 또 방해를 하시겠죠'),
  C('아까 그 장소에서 다시 기다리겠습니다.'),
  C('핫핫핫핫핫 이제 여자친구를... 진짜사귈수있을거같아 으핫핫핫!!!'), close,
  { action: flyChoimisFlower },
  { camera: [57, 12.375], duration: 1.3 },
  { bgm: null },
  { bubble: ['player', K_ID, P_ID], gap: 0.45, hold: 0.6 },
  P('...'), P('쫒아가죠 형.'), close,
  { set: { party_hidden: false } },
  { remove: K_ID }, { remove: P_ID },
  { join: 'gyeongsub' }, { join: 'ppaman' },
  { regroup: true },
  { set: { choimis_flower_done: true, sakura8_right_open: true } },
  { action: clearChoimisFlowerEffects },
  { camera: 'player' }, { end: true },
];
