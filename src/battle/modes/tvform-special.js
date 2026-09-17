// 변신 영클 특별 패턴(BUILD216 사용자 브리핑) 공통 틀 — 적 턴 모드 `tvform_special`: support.specialKind(subrio | rhythm | trial | ball)에 따라 게임 하나를 돌린다.
//   도입(사용자 “델타룬 테나 보스전이 좋은 예”): 영클이 가운데로 점프(jump) → 앞을 보고 춤(dance, 들썩·좌우) → 카메라가 TV 화면으로 확대(zoom)되며 지지직 노이즈 → 화면 전체가 게임.
//   파티 HP 띠는 battle 이 항상 맨 아래에 그린다. 게임이 끝나면 지지직 노이즈(outro)로 원상복구. 브금은 그대로(전환 없음).
import { YOUNGCLE_SPECIAL as S } from '../../data/youngcle-special.js';
import { PARK_WITCH_TRIAL as PARK } from '../../data/park-witch-trial.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { createParkWitchTrial } from './park-witch-trial.js';
import { createSubrioGame } from './tvform-subrio.js';
import { createRhythmGame } from './tvform-rhythm.js';
import { createBallDuel } from './tvform-ball.js';

/** 영클의 마녀재판: 파크가디언 재판(규칙·타이밍·판결·검·유리 깨짐)을 그대로 두고 재판관·대사·피해자·망치 결과만 영클 판 */
export const YOUNGCLE_TRIAL = {
  ...PARK,
  timing: { ...PARK.timing, gavel: 0.7 },
  text: { ...PARK.text, speaker: S.trial.speaker, portrait: S.trial.portrait, voice: S.trial.voice, opening: S.trial.opening, declaration: S.trial.declaration, highlight: S.trial.highlight, shock: S.trial.shock, defeated: '' },
  assets: { ...PARK.assets, judge: S.trial.assets.judge, victim: S.trial.assets.victim },
  cases: [{ summary: S.trial.summary, chargeLines: S.trial.chargeLines, choices: S.trial.choices, highlight: S.trial.highlight }],
  gavelDamage: S.trial.gavelDamage, victimFade: S.trial.victimFade,
};

export function createTvformSpecial(battle, { enemy }) {
  const kind = battle.support?.specialKind || S.order[0], yc = enemy, I = S.intro, home = { x: yc.x, y: yc.y };
  let phase = 'jump', pt = 0, game = null, disposed = false, noised = false, flash = 0, jumped = false, lastBeat = -1;
  const setPhase = (p) => { phase = p; pt = 0; };
  battle.board.setTarget(440, 72, 240, 282); battle.setText('');
  const makeGame = () => kind === 'subrio' ? createSubrioGame(battle, yc, S.subrio) : kind === 'rhythm' ? createRhythmGame(battle, yc, S.rhythm) : kind === 'ball' ? createBallDuel(battle, yc, S.ball) : createParkWitchTrial(battle, { trialIndex: 0, config: YOUNGCLE_TRIAL });
  const face = () => { const p = yc.patternPose || home; return { x: p.x - 6, y: p.y - 176 }; };   // TV 화면 가운데
  const drawScene = (ctx) => { BATTLE_BGS[battle.cfg.bg]?.(ctx, battle); for (const e of battle.enemies) battle.drawEnemy(ctx, e); for (const m of battle.members) battle.drawMember(ctx, m); };
  const drawNoise = (ctx, a) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, a);
    for (let i = 0; i < 320; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#101018'; ctx.fillRect(Math.floor(Math.random() * 480), Math.floor(Math.random() * 360), 6, 2); }
    for (let y = 0; y < 360; y += 4) if (Math.random() < 0.22) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, y, 480, 1); }
    ctx.restore();
  };
  return {
    fullscreen: true,
    get snapshot() { return { kind, phase, pt: Math.round(pt * 100) / 100, game: game?.snapshot || null, ycPose: yc.patternPose ? [Math.round(yc.patternPose.x), Math.round(yc.patternPose.y)] : null }; },
    update(dt, input) {
      if (disposed) return true;
      pt += dt; if (flash > 0) flash -= dt;
      if (phase === 'jump') {                                   // 가운데로 점프(포물선)
        if (!jumped) { jumped = true; battle.sfx('jump', { volume: 0.8 }); }
        const k = Math.min(1, pt / I.jump);
        yc.patternPose = { x: home.x + (I.center[0] - home.x) * k, y: home.y + (I.center[1] - home.y) * k - 70 * Math.sin(Math.PI * k) };
        if (k >= 1) { setPhase('dance'); battle.sfx('thud', { volume: 0.5 }); battle.game.shake = { time: 0.15, amp: 3 }; }
        return false;
      }
      if (phase === 'dance') {                                  // 앞을 보고 춤: 박자마다 들썩, 좌우로 흔들
        const beat = Math.floor(pt / 0.32); if (beat !== lastBeat) { lastBeat = beat; battle.sfx(S.sfx.dance, { volume: 0.35 }); }
        yc.patternPose = { x: I.center[0] + Math.sin(pt * 9) * 6, y: I.center[1] - Math.abs(Math.sin(pt * 9.8)) * 12 };
        if (pt >= I.dance) setPhase('zoom');
        return false;
      }
      if (phase === 'zoom') {                                   // TV 로 확대 → 지지직 → 게임
        yc.patternPose = { x: I.center[0], y: I.center[1] };
        if (!noised && pt >= I.zoom * 0.55) { noised = true; battle.sfx(S.sfx.noise); }
        if (pt >= I.zoom) { flash = 0.25; battle.sfx(S.sfx.noise, { volume: 0.7 }); yc.patternPose = null; game = makeGame(); setPhase('game'); }
        return false;
      }
      if (phase === 'game') {
        if (game.update(dt, input)) { game.dispose?.(); game = null; battle.setText(''); battle.board.setTarget(440, 72, 240, 282); yc.patternPose = null; battle.sfx(S.sfx.noise); setPhase('outro'); }
        return false;
      }
      if (phase === 'outro') { if (pt >= S.outro.noise) setPhase('done'); return false; }
      return true;
    },
    draw(ctx) {
      if (phase === 'zoom') {
        const k = Math.min(1, pt / I.zoom), e = k * k, z = 1 + (I.zoomTo - 1) * e, f = face();
        ctx.save(); ctx.translate(f.x, f.y); ctx.scale(z, z); ctx.translate(-f.x, -f.y); drawScene(ctx); ctx.restore();
        drawNoise(ctx, Math.max(0, (k - 0.55) / 0.45) * 0.9);
        return;
      }
      if (phase === 'game' && game) { game.draw(ctx); if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, flash * 3)})`; ctx.fillRect(0, 0, 480, 360); } return; }
      if (phase === 'outro') { drawNoise(ctx, 1 - pt / S.outro.noise); return; }
      // jump·dance: battle 이 이미 patternPose 로 영클을 그렸다 — 춤 박자 표시만
      if (phase === 'dance') { const p = yc.patternPose; if (p) { ctx.fillStyle = '#ffe066'; ctx.font = '14px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.floor(pt / 0.32) % 2 ? '♪' : '♫', Math.round(p.x) + 60, Math.round(p.y) - 200); ctx.textAlign = 'left'; } }
    },
    dispose() { disposed = true; game?.dispose?.(); game = null; yc.patternPose = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}
