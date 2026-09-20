import { DRUM_DEVIL_RESCUE as C } from '../../data/drum-devil-rescue.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { FONT } from '../../ui/font.js';
import { menuTextLines } from '../../ui/menu-layout.js';
import { createTalk } from './talk.js';
import { silhouette } from '../../core/gfx.js';
import { JANITOR_HERO_ACTIONS } from '../../data/janitor-hero-actions.js';

const RED_AFTERIMAGES = new WeakMap();
export function janitorRedAfterimage(image) {
  if (!image) return null;
  if (!RED_AFTERIMAGES.has(image)) RED_AFTERIMAGES.set(image, silhouette(image, '#ff3333'));
  return RED_AFTERIMAGES.get(image);
}

export async function loadDrumDevilRescue(loadImage) {
  const keys = ['hero', 'stand', 'laugh', 'kneel', 'surprised', 'lookback', 'flag'];
  const images = await Promise.all(keys.map(key => loadImage(C[key].src)));
  return Object.fromEntries(keys.map((key, i) => [key, images[i]]));
}

function sprite(ctx, image, def, x, y, frame = 0) {
  if (!image) return;
  const scale = def.scale ?? 1;
  ctx.drawImage(image, frame % def.cols * def.cell, Math.floor(frame / def.cols) * def.cell,
    def.cell, def.cell, Math.round(x - def.pivot[0] * scale), Math.round(y - def.pivot[1] * scale), Math.round(def.cell * scale), Math.round(def.cell * scale));
}

export function drawDrumDevilHero(ctx, assets, time, at = C.hero.home) {
  let tick = time % C.hero.frameHolds.reduce((sum, hold) => sum + hold, 0), frame = 0;
  while (frame < C.hero.frameHolds.length - 1 && tick >= C.hero.frameHolds[frame]) tick -= C.hero.frameHolds[frame++];
  sprite(ctx, assets?.hero, C.hero, ...at, frame);
}

export function drawDrumDevilSpeech(ctx, battle, anchor) {
  const { pad, minWidth } = C.speech, style = anchor.postLanding ? C.speech.postLanding : C.speech;
  const { lineHeight, fontSize, width: maxWidth } = style;
  ctx.save(); ctx.font = FONT.replace(/^\d+px/, `${fontSize}px`); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const lines = menuTextLines(ctx, battle.text, maxWidth - pad * 2, 5);
  // 말풍선 폭은 가장 긴 줄에 맞춘다(사용자 2026-09-20 "말풍선 너무 빈공간많은것도 개선") — 이전 고정 폭은 상한. 타자 중에도 전체 문장 기준이라 커지지 않는다
  const width = Math.min(maxWidth, Math.max(minWidth, Math.ceil(Math.max(0, ...lines.map(line => ctx.measureText(line).width))) + pad * 2));
  const height = Math.max(44, lines.length * lineHeight + pad * 2);
  const beside = !anchor.offscreen && anchor.y < 90;
  let x, y;
  if (anchor.offscreen) {
    // 화면 왼쪽 밖(아직 안 보이는 청소부)에서 들어오는 말풍선: 왼쪽 가장자리에 붙고 꼬리가 왼쪽 밖을 가리킨다. 처음 slide 초 동안 밖에서 미끄러져 들어온다
    const off = C.speech.offscreen, k = off.slide > 0 ? Math.min(1, (anchor.t ?? off.slide) / off.slide) : 1;
    x = Math.round(off.x - (width + off.x + off.tail) * (1 - k) * (1 - k)); y = off.y;
  } else if (anchor.postLanding) {
    // 착지 뒤: 요플래 발 아래·청소부 머리 왼쪽 고정 자리(데이터), 꼬리는 오른쪽 청소부 머리로
    x = C.speech.postLanding.x; y = C.speech.postLanding.y;
  } else {
    x = Math.round(Math.max(12, Math.min(468 - width, beside ? anchor.x + 28 : anchor.x - 18)));
    y = Math.round(Math.max(10, beside ? anchor.y - height / 2 : anchor.y - height - 20));
  }
  ctx.fillStyle = '#fff'; battle.roundRect(ctx, x, y, width, height, 6); ctx.fill();
  ctx.beginPath();
  if (anchor.offscreen) {
    const tailY = y + Math.round(height / 2);
    ctx.moveTo(x + 2, tailY - 8); ctx.lineTo(x - C.speech.offscreen.tail, tailY); ctx.lineTo(x + 2, tailY + 8);
  } else if (anchor.postLanding) {
    const tailY = Math.max(y + 12, Math.min(y + height - 12, anchor.y)), tipX = Math.max(anchor.x - 14, x + width + 6);
    ctx.moveTo(x + width - 2, tailY - 8); ctx.lineTo(tipX, anchor.y); ctx.lineTo(x + width - 2, tailY + 8);
  } else if (beside) {
    const tailY = Math.max(y + 12, Math.min(y + height - 12, anchor.y));
    ctx.moveTo(x + 2, tailY - 8); ctx.lineTo(anchor.x + 14, anchor.y); ctx.lineTo(x + 2, tailY + 8);
  } else {
    const tailX = Math.max(x + 18, Math.min(x + width - 18, anchor.x));
    ctx.moveTo(tailX - 9, y + height - 2); ctx.lineTo(anchor.x, anchor.y - 8); ctx.lineTo(tailX + 9, y + height - 2);
  }
  ctx.closePath(); ctx.fill(); ctx.fillStyle = '#000';
  menuTextLines(ctx, battle.text.slice(0, battle.shown), maxWidth - pad * 2, 5)
    .forEach((line, i) => ctx.fillText(line, x + pad, y + pad + i * lineHeight));
  ctx.restore();
}

export function createDrumDevilRescue(battle, { onComplete, assets = {} }) {
  const enemy = battle.enemies.find(e => e.id === 'drum_devil');
  const player = battle.members.find(m => m.id === 'hyungsub');
  let phase = 'narration', time = 0, elapsed = 0, hit = false, disposed = false;
  let talk = createTalk(battle, C.narration), camera = 0, heroY = C.hero.reveal[1];
  let playerPose = 'kneel', focus = 0;
  let dust = [], impactAge = -1, flagImpactAge = -1, healed = false, healAge = -1;
  const healPose = { ...JANITOR_HERO_ACTIONS.attack, scale: C.hero.scale };
  const enter = name => { phase = name; time = 0; };
  const speak = (name, lines) => { enter(name); battle.typeInterval = C.speech.charDelay; talk = createTalk(battle, lines); };   // 말풍선은 한 글자씩 띠리링(charDelay)
  battle.game.sound.stopBgm(C.fade);
  battle.game.sound.preloadBgm(C.bgm);
  const flagX = () => -100 + 700 * Math.min(1, time / C.flight);
  const flagImpact = () => {
    const active = flagImpactAge >= 0 && flagImpactAge < C.flagImpact.duration;
    const recoil = hit ? C.flagImpact.heldRecoil + (active ? C.flagImpact.recoil * Math.exp(-flagImpactAge * 8) : 0) : 0;
    const flash = active ? Math.max(0, 1 - flagImpactAge / C.flagImpact.flash) * 0.78 : 0;
    const shake = active ? Math.cos(flagImpactAge * 65) * C.flagImpact.amp * Math.max(0, 1 - flagImpactAge / C.flagImpact.shake) : 0;
    return { active, recoil, flash, shake, age: flagImpactAge };
  };
  const heroPose = () => phase === 'laugh' ? 'laugh' : phase === 'heal-raise' ? 'raise'
    : ['land', 'heal-talk', 'healing', 'ready', 'done'].includes(phase) ? 'hero' : 'stand';
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
    get snapshot() { return { phase, time, camera, ...view(), heroY, heroPose: heroPose(), flagX: phase === 'flag' ? flagX() : null, flagY: enemy.y - 90, flagImpact: flagImpact(), bossHitstun: hit && phase !== 'done', hit, healed, healAge, line: talk.index, pose: playerPose }; },
    update(dt, input) {
      if (disposed) return false;
      time += dt; elapsed += dt;
      if (flagImpactAge >= 0) flagImpactAge += dt;
      if (healAge >= 0) healAge += dt;
      if (impactAge >= 0) { impactAge += dt; for (const p of dust) { p.vy += 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } }
      switch (phase) {
        case 'narration': if (talk.update(dt, input)) enter('silence'); break;
        case 'silence': if (time >= C.silence) enter('flag'); break;
        case 'flag':
          if (!hit && flagX() >= enemy.x) { hit = true; flagImpactAge = 0; playerPose = 'surprised'; battle.sfx(C.flagImpact.sound, { volume: 1 }); }
          if (time >= C.flight) enter('surprise');
          break;
        case 'surprise': if (time >= C.surpriseHold) { playerPose = 'lookback'; enter('lookback'); } break;
        // 사용자 2026-09-20 "도움이 필요한가? 는 카메라 전환 전에 왼쪽에서 말풍선으로": 아직 화면 밖인 청소부의 인사가 먼저, C 로 넘기면 카메라가 왼쪽으로 간다
        case 'lookback': if (time >= C.lookbackHold) speak('greeting', C.greeting); break;
        case 'greeting': if (talk.update(dt, input)) enter('reveal'); break;
        case 'reveal':
          camera = Math.min(1, time / C.reveal);
          if (time >= C.reveal) { battle.support?.playHeroCue?.(); enter('focus'); }
          break;
        case 'focus':
          focus = Math.min(1, time / C.focusSeconds);
          if (time >= C.focusSeconds) { battle.sfx('laugh_janitor'); enter('laugh'); }
          break;
        case 'laugh': if (time >= C.laughHold) speak('introduction', C.introduction); break;
        case 'introduction': if (talk.update(dt, input)) { enter('rise'); battle.sfx('spearappear', { volume: 0.7 }); } break;
        case 'rise':
          heroY = C.hero.reveal[1] + (C.hero.riseTo - C.hero.reveal[1]) * Math.min(1, time / C.rise) ** 2;
          camera = 1 - Math.min(1, time / (C.rise + C.returnCamera)); focus = camera;
          if (time >= C.rise) enter('return');
          break;
        case 'return':
          camera = 1 - Math.min(1, (C.rise + time) / (C.rise + C.returnCamera));
          focus = camera;
          if (time >= C.returnCamera) enter('hang');
          break;
        case 'hang': if (time >= C.diveHold) { enter('dive'); battle.sfx('wing', { volume: 0.9 }); } break;
        case 'dive':
          heroY = -120 + (C.hero.home[1] + 120) * Math.min(1, time / C.dive);
          if (time >= C.dive) land();
          break;
        case 'land': if (time >= C.landHold) speak('heal-talk', C.healLines); break;
        case 'heal-talk': if (talk.update(dt, input)) enter('heal-raise'); break;
        case 'heal-raise':
          if (time >= C.heal.raise) {
            if (!healed) {
              const amount = player.maxHp - player.hp;
              player.hp = player.maxHp; player.popup = { t: 0, text: '+' + amount, heal: true };
              healed = true; healAge = 0; playerPose = 'standing'; battle.sfx(C.heal.sound);
            }
            enter('healing');
          }
          break;
        case 'healing': if (time >= C.heal.hold) speak('ready', C.ready); break;
        case 'ready': if (talk.update(dt, input)) { enter('done'); battle.typeInterval = undefined; onComplete(); return true; } break;
        case 'done': return true;
      }
      return false;
    },
    draw(ctx) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360);
      BATTLE_BGS[battle.cfg.bg]?.(ctx, battle);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, 246); ctx.clip();
      const { zoom, pan, shake, centerX } = view();
      const strike = flagImpact();
      ctx.translate(centerX + Math.round(shake + Math.min(strike.shake, C.flagImpact.rightShakeLimit)), 0); ctx.scale(zoom, zoom); ctx.translate(-240 + pan, 0);
      for (const offset of [-960, -480]) { ctx.save(); ctx.translate(offset, 0); BATTLE_BGS[battle.cfg.bg]?.(ctx, battle); ctx.restore(); }
      BATTLE_BGS[battle.cfg.bg]?.(ctx, battle);
      for (const e of battle.enemies) {
        ctx.save();
        if (e === enemy && hit) {
          ctx.translate(Math.round(strike.recoil), 0);
          ctx.translate(e.x, e.y - 110); ctx.rotate(C.flagImpact.lean); ctx.translate(-e.x, -e.y + 110);
          battle.drawEnemy(ctx, { ...e, patternPose: { sheet: 'idle', frame: C.flagImpact.frame } });
        } else battle.drawEnemy(ctx, e);
        ctx.restore();
      }
      if (!['narration', 'silence', 'flag', 'surprise', 'lookback', 'greeting'].includes(phase)) {
        const landed = ['dive', 'land', 'heal-talk', 'heal-raise', 'healing', 'ready', 'done'].includes(phase);
        const at = [landed ? C.hero.home[0] : C.hero.reveal[0], heroY];
        const pose = heroPose();
        if (phase === 'rise' || phase === 'dive') for (const [i, distance] of [34, 70, 112].entries()) {
          ctx.save(); ctx.globalAlpha = 0.24 - i * 0.07;
          sprite(ctx, janitorRedAfterimage(assets.stand), C.stand, at[0], at[1] + (phase === 'rise' ? distance : -distance)); ctx.restore();
        }
        if (pose === 'hero') drawDrumDevilHero(ctx, assets, elapsed, at);
        else if (pose === 'raise') sprite(ctx, assets.heroAttack, healPose, ...at, time < C.heal.brace ? 0 : 1);
        else sprite(ctx, assets[pose], C[pose], ...at);
      }
      for (const m of battle.members) {
        if (m === player && playerPose !== 'standing') sprite(ctx, assets[playerPose], C[playerPose], ...m.home);
        else battle.drawMember(ctx, m);
      }
      if (healAge >= 0 && healAge < C.heal.hold) {
        const progress = healAge / C.heal.hold;
        ctx.save(); ctx.globalAlpha = 1 - progress; ctx.fillStyle = '#7cff7c';
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4;
          const x = Math.round(player.home[0] + Math.cos(angle) * (15 + progress * 18));
          const y = Math.round(player.home[1] - 30 + Math.sin(angle) * 22 - progress * 28);
          ctx.fillRect(x - 3, y, 8, 2); ctx.fillRect(x, y - 3, 2, 8);
        }
        ctx.restore();
      }
      if (phase === 'flag') sprite(ctx, assets.flag, C.flag, flagX(), enemy.y - 90);
      if (strike.active) {
        const progress = strike.age / C.flagImpact.duration, radius = 8 + progress * 62;
        ctx.save(); ctx.translate(enemy.x, enemy.y - 90); ctx.globalAlpha = 1 - progress;
        for (let i = 0; i < 8; i++) {
          ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillStyle = i % 2 ? '#ff4141' : '#fff';
          ctx.beginPath(); ctx.moveTo(radius * 0.25, -3); ctx.lineTo(radius + 21, 0); ctx.lineTo(radius * 0.25, 3); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.restore();
      }
      if (impactAge >= 0 && impactAge < 0.5) {
        const p = impactAge / 0.5, r = 20 + 70 * (1 - (1 - p) ** 2), a = (1 - p) * 0.9;
        ctx.strokeStyle = `rgba(255,160,90,${a})`; ctx.lineWidth = 4 * (1 - p * 0.6) + 0.5;
        ctx.beginPath(); ctx.ellipse(...C.hero.home, r, r * 0.38, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(255,160,90,${a * 0.18})`; ctx.fill();
        ctx.fillStyle = p < 0.5 ? '#c8b89a' : '#7a6a58';
        for (const particle of dust) ctx.fillRect(Math.round(particle.x), Math.round(particle.y), p < 0.5 ? 3 : 2, p < 0.5 ? 3 : 2);
      }
      ctx.restore(); ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      if (strike.flash > 0) { ctx.save(); ctx.fillStyle = '#fff'; ctx.globalAlpha = strike.flash; ctx.fillRect(0, 0, 480, 246); ctx.restore(); }
      if (phase === 'narration') {
        battle.box(ctx, 20, 8, 440, 66); ctx.fillStyle = '#fff';
        battle.wrapText(ctx, battle.text.slice(0, battle.shown), 408).forEach((line, i) => ctx.fillText(line, 36, 20 + i * 20));
      } else if (phase === 'greeting') {
        drawDrumDevilSpeech(ctx, battle, { offscreen: true, t: time });
      } else if (['introduction', 'heal-talk', 'ready'].includes(phase)) {
        const heroX = ['heal-talk', 'ready'].includes(phase) ? C.hero.home[0] : C.hero.reveal[0];
        drawDrumDevilSpeech(ctx, battle, {
          postLanding: ['heal-talk', 'ready'].includes(phase),
          x: Math.round(centerX + zoom * (heroX - 240 + pan)),
          y: Math.round(zoom * (heroY - (['heal-talk', 'ready'].includes(phase) ? C.speech.postLanding.headOffset : C.speech.headOffset))),
        });
      }
    },
    dispose() { disposed = true; dust = []; battle.typeInterval = undefined; },
  };
}
