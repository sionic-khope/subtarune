import L from '../../data/locale/ko.js';
import { FONT } from '../../ui/font.js';
import { BATTLE_PANEL_TOP, SCREEN_W } from '../../core/layout.js';
import { createChoimisRapVideo } from '../choimis-rap-video.js';
import { sayBubble, tickBubble } from '../support/youngcle-tvform.js';

export const CHOIMIS_EATING_RACE = Object.freeze({
  src: 'assets/video/choimis-eating-race.mp4', introSeconds: 11, raceSeconds: 10.2,
  bitesPerBowl: 18, bowls: 3, resultSeconds: 1.2, bossDamage: 10, partyDamage: 15,
  preludeHold: 0.9, transitionSeconds: 0.8, revealSeconds: 0.4,
  partyOrder: Object.freeze(['hyungsub', 'gyeongsub', 'ppaman']),
  video: Object.freeze({ x: 134, y: 86, w: 212, h: 120 }),
});
const clamp = value => Math.max(0, Math.min(1, value));

export function createChoimisEatingRace(battle, { enemy, media, config } = {}) {
  const C = CHOIMIS_EATING_RACE, total = C.bitesPerBowl * C.bowls;
  const video = media || createChoimisRapVideo({ src: C.src, volume: 0.72, opacity: 1, autoplay: false });
  const members = C.partyOrder.map(id => battle.members.find(member => member.id === id));
  const names = [L.battle_choimis_eating_hyungsub, L.battle_choimis_eating_gyeongsub, L.battle_choimis_eating_ppaman];
  let phase = 'prelude', elapsed = 0, raceElapsed = 0, resultElapsed = 0, phaseElapsed = 0, mediaReady = null;
  let bites = 0, rivalBites = 0, biteFlash = 0, rivalBiteFlash = 0, lastBiteMember = 0;
  let winner = null, wasDown = false, armed = false, disposed = false;
  const preamble = config?.speak || enemy.def.patterns.find(pattern => pattern.mode === 'choimis_eating_race')?.speak;
  sayBubble(battle, enemy, preamble);
  const preludeBubble = battle.bubble;
  video.ready.then(ready => { if (!disposed) { mediaReady = ready; if (phase === 'loading') phase = ready ? 'intro' : 'error'; } });
  const syncMedia = (paused = false) => video.sync({ time: elapsed, muted: !!battle.game.sound?.muted,
    paused: paused || !['intro', 'race'].includes(phase) || disposed });
  const finish = result => {
    if (winner || disposed) return;
    winner = result; phase = 'result'; resultElapsed = 0; video.stop();
    if (result === 'party') battle.hitEnemy(enemy, null, C.bossDamage, { source: 'choimis-eating-race' });
    else battle.hurtAllParty(C.partyDamage);
  };
  const text = (ctx, label, x, y, width, color = '#fff', size = 16) => {
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = FONT.replace(/^\d+px/, `${size}px`);
    while (ctx.measureText(label).width > width && size > 10) ctx.font = FONT.replace(/^\d+px/, `${--size}px`);
    ctx.fillText(label, x, y);
  };
  const bowl = (ctx, x, y, eaten, active) => {
    const image = enemy.projectiles?.jjajang;
    if (image) {
      const foodHeight = Math.round(10 * (1 - clamp(eaten)));
      if (foodHeight) ctx.drawImage(image, 0, 0, 26, 10, x - 13, y - 22 + 10 - foodHeight, 26, foodHeight);
      ctx.drawImage(image, 0, 10, 26, 12, x - 13, y - 12, 26, 12);
    }
    ctx.fillStyle = '#40383e'; ctx.fillRect(x - 13, y + 3, 26, 3);
    ctx.fillStyle = eaten >= 1 ? '#98e0a2' : active ? '#ff78b5' : '#c6b1bb';
    ctx.fillRect(x - 13, y + 3, Math.round(26 * clamp(eaten)), 3);
  };
  const drawBite = (ctx, start, mouth, flash) => {
    if (flash <= 0 || !enemy.projectiles?.jjajang) return;
    const progress = clamp(1 - flash / 0.14);
    const x = Math.round(start.x + (mouth.x - start.x) * progress);
    const y = Math.round(start.y + (mouth.y - start.y) * progress - Math.sin(progress * Math.PI) * 8);
    ctx.drawImage(enemy.projectiles.jjajang, 9, 3, 8, 4, x - 4, y - 2, 8, 4);
    ctx.strokeStyle = '#e5bd79'; ctx.lineWidth = 1;
    for (const offset of [-1, 2]) {
      ctx.beginPath(); ctx.moveTo(x + offset, y + 1); ctx.lineTo(x + 14 + offset, y + 12); ctx.stroke();
    }
  };
  return {
    get fullscreen() { return phase !== 'prelude' && phase !== 'transition'; }, hpStrip: true,
    get snapshot() {
      return { phase, phaseElapsed, elapsed, raceElapsed, bites, rivalBites, biteFlash, rivalBiteFlash, lastBiteMember, winner, disposed,
        activeMember: C.partyOrder[Math.min(2, Math.floor(bites / C.bitesPerBowl))],
        partyBowls: C.partyOrder.map((id, index) => ({ id, eaten: clamp((bites - index * C.bitesPerBowl) / C.bitesPerBowl) })),
        rivalBowls: C.partyOrder.map((id, index) => clamp((rivalBites - index * C.bitesPerBowl) / C.bitesPerBowl)),
        video: C.video, started: elapsed >= C.introSeconds, mediaError: !!(video.loadError || video.playError) };
    },
    syncMedia,
    update(dt, input) {
      if (disposed) return true;
      const paused = !!globalThis.document?.hidden || battle.game.sound?.ctx?.state === 'suspended';
      syncMedia(paused);
      if (paused) return false;
      if (enemy.dead || enemy.dying > 0 || enemy.hp <= 0) { video.stop(); return true; }
      if (phase === 'prelude') {
        const alreadyTyped = !battle.bubble || battle.bubble.shown >= battle.bubble.text.length;
        tickBubble(battle, Math.max(0, dt));
        if (alreadyTyped) phaseElapsed += Math.max(0, dt);
        if (phaseElapsed >= C.preludeHold) { phase = 'transition'; phaseElapsed = 0; if (battle.bubble === preludeBubble) battle.bubble = null; }
        return false;
      }
      if (phase === 'transition') {
        phaseElapsed = Math.min(C.transitionSeconds, phaseElapsed + Math.max(0, dt));
        if (phaseElapsed >= C.transitionSeconds) phase = mediaReady === null ? 'loading' : mediaReady ? 'intro' : 'error';
        return false;
      }
      if (phase === 'loading') return false;
      if (video.loadError || video.playError) { phase = 'error'; video.stop(); }
      if (phase === 'result' || phase === 'error') {
        resultElapsed += Math.max(0, dt);
        return resultElapsed >= C.resultSeconds;
      }
      const down = !!input.down?.('confirm'), delta = Math.max(0, dt);
      const previous = elapsed;
      elapsed = Math.min(C.introSeconds + C.raceSeconds, elapsed + delta);
      biteFlash = Math.max(0, biteFlash - delta); rivalBiteFlash = Math.max(0, rivalBiteFlash - delta);
      syncMedia();
      if (phase === 'intro') {
        wasDown = down;
        if (elapsed + 1e-9 >= C.introSeconds) {
          elapsed = Math.max(C.introSeconds, elapsed); phase = 'race'; armed = !down;
          raceElapsed = Math.max(0, elapsed - C.introSeconds); battle.sfx('bell', { volume: 0.55 });
          if (raceElapsed + 1e-9 >= C.raceSeconds) { rivalBites = total; finish('choimis'); }
        }
        return false;
      }
      raceElapsed += elapsed - previous;
      const nextRivalBites = Math.min(total, Math.floor(raceElapsed / C.raceSeconds * total));
      if (nextRivalBites > rivalBites) rivalBiteFlash = 0.14;
      rivalBites = nextRivalBites;
      if (raceElapsed + 1e-9 >= C.raceSeconds) { rivalBites = total; finish('choimis'); return disposed; }
      if (!down) armed = true;
      if (armed && down && !wasDown) {
        bites++; biteFlash = 0.14; lastBiteMember = Math.floor((bites - 1) / C.bitesPerBowl);
        if (bites % C.bitesPerBowl === 0) battle.sfx('item', { volume: 0.45 });
        if (bites === total) finish('party');
      }
      wasDown = down;
      return disposed;
    },
    draw(ctx) {
      if (phase === 'prelude') { battle.drawTextBox(ctx); return; }
      if (phase === 'transition') {
        battle.drawTextBox(ctx);
        ctx.save(); ctx.globalAlpha *= clamp(phaseElapsed / C.transitionSeconds); ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, SCREEN_W, BATTLE_PANEL_TOP + 72); ctx.restore(); return;
      }
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#09060d'; ctx.fillRect(0, 0, SCREEN_W, BATTLE_PANEL_TOP);
      if (phase === 'intro' || phase === 'race' && raceElapsed < 0.8) text(ctx, L.battle_choimis_eating_goal, 240, 18, 440);
      text(ctx, L.battle_choimis_eating_party, 64, 43, 120, '#ffb4d7', 12);
      text(ctx, enemy.name || enemy.def.name, 411, 43, 120, '#ffb4d7', 12);
      ctx.fillStyle = '#000'; ctx.fillRect(C.video.x, C.video.y, C.video.w, C.video.h);
      video.draw(ctx, C.video);
      ctx.strokeStyle = '#e3d5df'; ctx.lineWidth = 1; ctx.strokeRect(C.video.x - 1, C.video.y - 1, C.video.w + 2, C.video.h + 2);
      for (let index = 0; index < members.length; index++) {
        const member = members[index], y = 104 + index * 63;
        const eaten = clamp((bites - index * C.bitesPerBowl) / C.bitesPerBowl);
        const active = phase === 'race' && Math.floor(bites / C.bitesPerBowl) === index;
        if (member?.frames) {
          ctx.save(); ctx.translate(44, y - (lastBiteMember === index && biteFlash > 0 ? 2 : 0)); ctx.scale(0.58, 0.58);
          battle.drawMember(ctx, { ...member, home: [0, 0], action: null, down: false, popup: null, pose: null }); ctx.restore();
        }
        text(ctx, names[index], 47, y + 2, 70, active ? '#fff' : '#b5a5af', 12);
        bowl(ctx, 103, y - 5, eaten, active);
        if (lastBiteMember === index) drawBite(ctx, { x: 103, y: y - 23 }, { x: 49, y: y - 34 }, biteFlash);
      }
      if (enemy.img) battle.drawEnemy(ctx, { ...enemy, popup: null, patternPose: { x: 411, y: 178 - (rivalBiteFlash > 0 ? 2 : 0),
        scale: 0.45, scaleY: 1, frame: Math.floor(elapsed * 4) % 4 } });
      for (let index = 0; index < C.bowls; index++) bowl(ctx, 377 + index * 34, 215,
        (rivalBites - index * C.bitesPerBowl) / C.bitesPerBowl, phase === 'race' && Math.floor(rivalBites / C.bitesPerBowl) === index);
      drawBite(ctx, { x: 377 + Math.max(0, Math.floor((rivalBites - 1) / C.bitesPerBowl)) * 34, y: 197 }, { x: 405, y: 129 }, rivalBiteFlash);
      const remaining = Math.max(0, C.raceSeconds - raceElapsed).toFixed(1);
      if (phase === 'race') text(ctx, raceElapsed < 0.8 ? L.battle_choimis_eating_start : `${remaining}`, 240, 61, 200, '#ffe066');
      ctx.fillStyle = '#000'; ctx.fillRect(20, BATTLE_PANEL_TOP, 440, 72);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(21.5, BATTLE_PANEL_TOP + 1.5, 437, 69);
      const message = phase === 'loading' ? L.battle_choimis_eating_loading : phase === 'error' ? L.battle_choimis_eating_error
        : phase === 'result' ? winner === 'party' ? L.battle_choimis_eating_win : L.battle_choimis_eating_lose
          : '';
      if (message) text(ctx, message, 240, BATTLE_PANEL_TOP + 13, 410);
      if (phase === 'intro' && elapsed < C.revealSeconds) {
        ctx.globalAlpha *= 1 - clamp(elapsed / C.revealSeconds); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_W, BATTLE_PANEL_TOP + 72);
      }
      ctx.restore();
    },
    dispose() { if (disposed) return; disposed = true; armed = false; wasDown = false; if (battle.bubble === preludeBubble) battle.bubble = null; video.stop(); },
  };
}
