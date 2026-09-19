import { DRUM_DEVIL_RESCUE as C } from '../../data/drum-devil-rescue.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { FONT } from '../../ui/font.js';
import { menuTextLines } from '../../ui/menu-layout.js';
import { createTalk } from './talk.js';

export async function loadDrumDevilRescue(loadImage) {
  const keys = ['hero', 'stand', 'laugh', 'kneel', 'surprised', 'lookback', 'flag'];
  const images = await Promise.all(keys.map(key => loadImage(C[key].src)));
  return Object.fromEntries(keys.map((key, i) => [key, images[i]]));
}

function sprite(ctx, image, def, x, y, frame = 0) {
  if (!image) return;
  ctx.drawImage(image, frame % def.cols * def.cell, Math.floor(frame / def.cols) * def.cell,
    def.cell, def.cell, Math.round(x - def.pivot[0]), Math.round(y - def.pivot[1]), def.cell, def.cell);
}

export function drawDrumDevilHero(ctx, assets, time, at = C.hero.home) {
  let tick = time % C.hero.frameHolds.reduce((sum, hold) => sum + hold, 0), frame = 0;
  while (frame < C.hero.frameHolds.length - 1 && tick >= C.hero.frameHolds[frame]) tick -= C.hero.frameHolds[frame++];
  sprite(ctx, assets?.hero, C.hero, ...at, frame);
}

export function drawDrumDevilSpeech(ctx, battle, anchor) {
  const { width, pad, lineHeight, fontSize } = C.speech;
  ctx.save(); ctx.font = FONT.replace(/^\d+px/, `${fontSize}px`); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lines = menuTextLines(ctx, battle.text, width - pad * 2, 5);
  const height = Math.max(44, lines.length * lineHeight + pad * 2);
  const beside = anchor.y < 90;
  const x = Math.round(Math.max(12, Math.min(468 - width, beside ? anchor.x + 28 : anchor.x - 18)));
  const y = Math.round(Math.max(10, beside ? anchor.y - height / 2 : anchor.y - height - 20));
  ctx.fillStyle = '#fff'; battle.roundRect(ctx, x, y, width, height, 6); ctx.fill();
  ctx.beginPath();
  if (beside) {
    const tailY = Math.max(y + 12, Math.min(y + height - 12, anchor.y));
    ctx.moveTo(x + 2, tailY - 8); ctx.lineTo(anchor.x + 14, anchor.y); ctx.lineTo(x + 2, tailY + 8);
  } else {
    const tailX = Math.max(x + 18, Math.min(x + width - 18, anchor.x));
    ctx.moveTo(tailX - 9, y + height - 2); ctx.lineTo(anchor.x, anchor.y - 8); ctx.lineTo(tailX + 9, y + height - 2);
  }
  ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000';
  menuTextLines(ctx, battle.text.slice(0, battle.shown), width - pad * 2, 5)
    .forEach((line, i) => ctx.fillText(line, x + pad, y + pad + i * lineHeight));
  ctx.restore();
}

export function createDrumDevilRescue(battle, { onComplete, assets = {} }) {
  const enemy = battle.enemies.find(e => e.id === 'drum_devil');
  const player = battle.members.find(m => m.id === 'hyungsub');
  let phase = 'narration', time = 0, elapsed = 0, hit = false, disposed = false;
  let talk = createTalk(battle, C.narration), camera = 0, heroY = C.hero.reveal[1];
  let playerPose = 'kneel', focus = 0;
  let dust = [], impactAge = -1;
  const enter = name => { phase = name; time = 0; };
  const speak = (name, lines) => { enter(name); talk = createTalk(battle, lines); };
  battle.game.sound.stopBgm(C.fade);
  battle.game.sound.preloadBgm(C.bgm);
  const flagX = () => -100 + 700 * Math.min(1, time / C.flight);
  const heroPose = () => phase === 'laugh' ? 'laugh' : ['land', 'ready', 'done'].includes(phase) ? 'hero' : 'stand';
  const view = () => {
    const k = camera * camera * (3 - 2 * camera), f = focus * focus * (3 - 2 * focus);
    const zoom = 1 + (C.revealZoom - 1) * k + (C.focusZoom - C.revealZoom) * f;
    const pan = C.revealPan * k;
    const shake = phase === 'focus' ? Math.sin(focus * Math.PI * 6) * (1 - focus) * C.focusShake : 0;
    const centerX = 240 + (C.revealCenterX - 240) * k;
    return { zoom, pan, shake, centerX, heroScreenX: centerX + zoom * (C.hero.reveal[0] - 240 + pan) };
  };
  const land = () => {
    enter('land'); heroY = C.hero.home[1]; impactAge = 0;
    battle.sfx('impact', { volume: 0.9 }); battle.game.shake = { time: 0.45, amp: 7 };
    dust = Array.from({ length: 12 }, () => ({ x: C.hero.home[0] - 36 + Math.random() * 72,
      y: heroY - 4, vx: (Math.random() - 0.5) * 240, vy: -80 - Math.random() * 140 }));
  };
  return {
    fullscreen: true,
    get snapshot() { return { phase, time, camera, ...view(), heroY, heroPose: heroPose(), flagX: phase === 'flag' ? flagX() : null, flagY: enemy.y - 90, hit, line: talk.index, pose: playerPose }; },
    update(dt, input) {
      if (disposed) return false;
      time += dt; elapsed += dt;
      if (impactAge >= 0) { impactAge += dt; for (const p of dust) { p.vy += 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
      switch (phase) {
        case 'narration': if (talk.update(dt, input)) enter('silence'); break;
        case 'silence': if (time >= C.silence) enter('flag'); break;
        case 'flag':
          if (!hit && flagX() >= enemy.x) { hit = true; playerPose = 'surprised'; battle.sfx('hit'); }
          if (time >= C.flight) enter('surprise');
          break;
        case 'surprise': if (time >= C.surpriseHold) { playerPose = 'lookback'; enter('lookback'); } break;
        case 'lookback': if (time >= C.lookbackHold) enter('reveal'); break;
        case 'reveal':
          camera = Math.min(1, time / C.reveal);
          if (time >= C.reveal) { battle.game.sound.playBgm(C.bgm, { fadeIn: 1.2 }); enter('focus'); }
          break;
        case 'focus':
          focus = Math.min(1, time / C.focusSeconds);
          if (time >= C.focusSeconds) speak('greeting', C.greeting);
          break;
        case 'greeting': if (talk.update(dt, input)) { battle.sfx('laugh_janitor'); enter('laugh'); } break;
        case 'laugh': if (time >= C.laughHold) speak('introduction', C.introduction); break;
        case 'introduction': if (talk.update(dt, input)) { enter('rise'); battle.sfx('spearappear', { volume: 0.7 }); } break;
        case 'rise':
          heroY = C.hero.reveal[1] - 310 * Math.min(1, time / C.rise);
          if (time >= C.rise) enter('return');
          break;
        case 'return':
          camera = 1 - Math.min(1, time / C.returnCamera);
          focus = camera;
          if (time >= C.returnCamera) { enter('dive'); battle.sfx('wing', { volume: 0.9 }); }
          break;
        case 'dive':
          heroY = -120 + (C.hero.home[1] + 120) * Math.min(1, time / C.dive);
          if (time >= C.dive) land();
          break;
        case 'land': if (time >= C.landHold) speak('ready', C.ready); break;
        case 'ready': if (talk.update(dt, input)) { enter('done'); onComplete(); return true; } break;
        case 'done': return true;
      }
      return false;
    },
    draw(ctx) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360);
      BATTLE_BGS[battle.cfg.bg]?.(ctx, battle);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, 246); ctx.clip();
      const { zoom, pan, shake, centerX } = view();
      ctx.translate(centerX + Math.round(shake), 0); ctx.scale(zoom, zoom); ctx.translate(-240 + pan, 0);
      ctx.save(); ctx.translate(-480, 0); BATTLE_BGS[battle.cfg.bg]?.(ctx, battle); ctx.restore();
      BATTLE_BGS[battle.cfg.bg]?.(ctx, battle);
      for (const e of battle.enemies) battle.drawEnemy(ctx, e);
      if (!['narration', 'silence', 'flag', 'surprise', 'lookback'].includes(phase)) {
        const landed = ['dive', 'land', 'ready', 'done'].includes(phase);
        const at = [landed ? C.hero.home[0] : C.hero.reveal[0], heroY];
        const pose = heroPose();
        if (pose === 'hero') drawDrumDevilHero(ctx, assets, elapsed, at);
        else sprite(ctx, assets[pose], C[pose], ...at);
      }
      for (const m of battle.members) {
        if (m === player) sprite(ctx, assets[playerPose], C[playerPose], ...m.home);
        else battle.drawMember(ctx, m);
      }
      if (phase === 'flag') sprite(ctx, assets.flag, C.flag, flagX(), enemy.y - 90);
      if (impactAge >= 0 && impactAge < 0.5) {
        const p = impactAge / 0.5, r = 20 + 70 * (1 - (1 - p) ** 2), a = (1 - p) * 0.9;
        ctx.strokeStyle = `rgba(255,160,90,${a})`; ctx.lineWidth = 4 * (1 - p * 0.6) + 0.5;
        ctx.beginPath(); ctx.ellipse(...C.hero.home, r, r * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(255,160,90,${a * 0.18})`; ctx.fill();
        ctx.fillStyle = p < 0.5 ? '#c8b89a' : '#7a6a58';
        for (const particle of dust) ctx.fillRect(Math.round(particle.x), Math.round(particle.y), p < 0.5 ? 3 : 2, p < 0.5 ? 3 : 2);
      }
      ctx.restore(); ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      if (phase === 'narration') {
        battle.box(ctx, 20, 8, 440, 66); ctx.fillStyle = '#fff';
        battle.wrapText(ctx, battle.text.slice(0, battle.shown), 408).forEach((line, i) => ctx.fillText(line, 36, 20 + i * 20));
      } else if (['greeting', 'introduction', 'ready'].includes(phase)) {
        const heroX = phase === 'ready' ? C.hero.home[0] : C.hero.reveal[0];
        drawDrumDevilSpeech(ctx, battle, {
          x: Math.round(centerX + zoom * (heroX - 240 + pan)),
          y: Math.round(zoom * (heroY - C.speech.headOffset)),
        });
      }
    },
    dispose() { disposed = true; dust = []; },
  };
}
