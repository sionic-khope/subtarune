// 변신 영클 특별 패턴(BUILD216/218 사용자 브리핑) 공통 틀 — 적 턴 모드 `tvform_special`: support.specialKind(subrio | rhythm | trial | ball)에 따라 게임 하나를 돌린다.
//   도입(사용자 “델타룬 테나 보스전이 좋은 예”, 2026-09-17 정정 “확대될 때 가운데서 춤추는 화면이 확대돼야” “지지직은 화면 전환 뒤가 아니라”):
//   가운데로 점프(jump) → 앞을 보고 춤추며 한마디(dance, 말풍선) → 춤추는 그대로 카메라가 TV 얼굴로 확대(zoom, TV 화면 안에서만 지지직이 번지다 화면을 다 덮는다)
//   → TV 화면이 가로선에서 펼쳐지며 켜진다(on, 게임 첫 프레임이 드러남) → 게임(game) → 게임 화면이 가로선으로 접히며 꺼진다(off) → 지지직 걷히며 축소(zoomout) → 제자리로 점프(back).
//   파티 HP 띠는 게임 중에도 battle 이 맨 아래에 그린다(hpStrip, 재판은 화면을 다 쓰므로 제외). 브금은 그대로(전환 없음). 수치는 data/youngcle-special.js intro/outro.
import { YOUNGCLE_SPECIAL as S } from '../../data/youngcle-special.js';
import { PARK_WITCH_TRIAL as PARK } from '../../data/park-witch-trial.js';
import { BATTLE_BGS } from '../backgrounds.js';
import { createParkWitchTrial } from './park-witch-trial.js';
import { createSubrioGame } from './tvform-subrio.js';
import { createRhythmGame } from './tvform-rhythm.js';
import { createBallDuel } from './tvform-ball.js';
import { sayBubble, tickBubble } from '../support/youngcle-tvform.js';

/** 영클의 마녀재판: 파크가디언 재판(규칙·타이밍·판결·검·유리 깨짐)을 그대로 두고 재판관·대사·피해자·망치 결과만 영클 판 */
export const YOUNGCLE_TRIAL = {
  ...PARK,
  timing: { ...PARK.timing, gavel: 0.7 },
  // 선택지 상자는 4줄까지(B 의 3번 “너네엄마가 사장이였어도 잘랐을거다 꼬라지를 봐라”가 네 줄) — 높이 58 → 84, 하트 시작점은 상자 아래(346)
  choices: PARK.choices.map(z => ({ ...z, h: 84 })),
  start: { x: 240, y: 346 },
  text: { ...PARK.text, speaker: S.trial.speaker, portrait: S.trial.portrait, voice: S.trial.voice, opening: S.trial.opening, declaration: S.trial.declaration, highlight: S.trial.highlight, shock: S.trial.shock, defeated: '' },
  assets: { ...PARK.assets, judge: S.trial.assets.judge, victim: S.trial.assets.victim },
  cases: [
    { summary: S.trial.summary, chargeLines: S.trial.chargeLines, choices: S.trial.choices, highlight: S.trial.highlight },
    { summary: S.trial.b.summary, chargeLines: S.trial.b.chargeLines, choices: S.trial.b.choices, highlight: S.trial.b.highlight, victim: S.trial.b.victim },
  ],
  gavelDamage: S.trial.gavelDamage, victimFade: S.trial.victimFade,
};

const ease = k => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };
const FULL = new Set(['zoom', 'on', 'game', 'off', 'zoomout']);

export function createTvformSpecial(battle, { enemy }) {
  const kind = battle.support?.specialKind || S.order[0], variant = battle.support?.specialVariant || 'a', yc = enemy, I = S.intro, O = S.outro, home = { x: yc.x, y: yc.y };
  let phase = 'jump', pt = 0, game = null, disposed = false, noised = false, jumped = false, lastBeat = -1, danceT = 0, said = false, last = null;
  const setPhase = (p) => { phase = p; pt = 0; };
  battle.board.setTarget(440, 72, 240, 282); battle.setText('');
  // 섭리오·마녀재판은 A/B 두 판(support.specialVariant): 섭리오 B = 가로로 긴 치지직 맵·내려찍기(tvform-subrio.js), 재판 B = 따뜻한비데 부당해고(cases[1])
  const makeGame = () => kind === 'subrio' ? createSubrioGame(battle, yc, S.subrio, { variant }) : kind === 'rhythm' ? createRhythmGame(battle, yc, S.rhythm) : kind === 'ball' ? createBallDuel(battle, yc, S.ball) : createParkWitchTrial(battle, { trialIndex: variant === 'b' ? 1 : 0, config: YOUNGCLE_TRIAL });
  // 춤: 박자마다 들썩, 좌우로 흔들 — 확대되는 동안에도 이어진다(사용자 “가운데서 춤추고 있는 화면이 확대돼야”)
  const dancePose = (time) => ({ x: I.center[0] + Math.sin(time * 9) * 6, y: I.center[1] - Math.abs(Math.sin(time * 9.8)) * 12 });
  const stepDance = (dt) => { danceT += dt; yc.patternPose = dancePose(danceT); const beat = Math.floor(danceT / 0.32); if (beat !== lastBeat) { lastBeat = beat; battle.sfx(S.sfx.dance, { volume: 0.35 }); } };
  // TV 화면 가운데(패턴 자세 기준) — 춤추는 동안 같이 흔들린다
  const face = () => { const p = yc.patternPose || home; return { x: p.x + I.face[0], y: p.y + I.face[1] }; };
  const drawScene = (ctx) => { BATTLE_BGS[battle.cfg.bg]?.(ctx, battle); for (const e of battle.enemies) battle.drawEnemy(ctx, e); for (const m of battle.members) battle.drawMember(ctx, m); };
  // 확대 그리기: 얼굴점이 화면 가운데로 옮겨 가며 z 배 — 얼굴점의 화면 위치와 TV 화면 반지름(지지직 클립)을 돌려준다
  const drawZoomed = (ctx, e) => {
    const z = 1 + (I.zoomTo - 1) * e, f = face(), p = { x: f.x + (240 - f.x) * e, y: f.y + (180 - f.y) * e };
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(z, z); ctx.translate(-f.x, -f.y); drawScene(ctx); ctx.restore();
    return { x: p.x, y: p.y, rx: I.screenR[0] * z, ry: I.screenR[1] * z };
  };
  // 지지직: clip(타원) 안에서만 — TV 화면이 커질수록 화면 전체로
  const drawStatic = (ctx, a, clip = null) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = Math.min(1, a);
    if (clip) { ctx.beginPath(); ctx.ellipse(clip.x, clip.y, clip.rx, clip.ry, 0, 0, Math.PI * 2); ctx.clip(); }
    ctx.fillStyle = '#0c0c14'; ctx.fillRect(0, 0, 480, 360);
    for (let i = 0; i < 420; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#f4f4f4' : '#3a3a48'; ctx.fillRect(Math.floor(Math.random() * 480), Math.floor(Math.random() * 360), 6, 2); }
    for (let y = 0; y < 360; y += 4) if (Math.random() < 0.22) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, y, 480, 1); }
    ctx.restore();
  };
  // 게임 마지막 프레임을 떠 둔다(꺼지는 연출에 쓴다)
  const snapshotGame = () => {
    if (typeof document === 'undefined' || !game?.draw) return null;
    const c = document.createElement('canvas'); c.width = 480; c.height = 360; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    try { game.draw(g); } catch (e) { return null; }
    return c;
  };
  const drawGame = (ctx) => { if (game) game.draw(ctx); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360); } };
  return {
    get fullscreen() { return FULL.has(phase); },
    get hpStrip() { return phase === 'game' && kind !== 'trial'; },
    get snapshot() { return { kind, variant, phase, pt: Math.round(pt * 100) / 100, game: game?.snapshot || null, ycPose: yc.patternPose ? [Math.round(yc.patternPose.x), Math.round(yc.patternPose.y)] : null, bubble: battle.bubble?.text || null }; },
    update(dt, input) {
      if (disposed) return true;
      pt += dt;
      if (phase === 'jump') {                                   // 가운데로 점프(포물선)
        if (!jumped) { jumped = true; battle.sfx('jump', { volume: 0.8 }); }
        const k = Math.min(1, pt / I.jump);
        yc.patternPose = { x: home.x + (I.center[0] - home.x) * k, y: home.y + (I.center[1] - home.y) * k - 70 * Math.sin(Math.PI * k) };
        if (k >= 1) { setPhase('dance'); battle.sfx('thud', { volume: 0.5 }); battle.game.shake = { time: 0.15, amp: 3 }; }
        return false;
      }
      if (phase === 'dance') {                                  // 앞을 보고 춤추며 한마디(패턴별 대사, 말풍선)
        stepDance(dt);
        if (!said) { said = true; const line = battle.support?.specialLine; if (line) sayBubble(battle, yc, line, { x: I.center[0], y: I.center[1] - 100 }); }
        tickBubble(battle, dt);
        if (pt >= I.dance) { setPhase('zoom'); battle.bubble = null; }
        return false;
      }
      if (phase === 'zoom') {                                   // 춤추는 그대로 TV 얼굴로 확대 — TV 화면 안에서 지지직
        stepDance(dt);
        if (!noised && pt >= I.zoom * 0.45) { noised = true; battle.sfx(S.sfx.noise); }
        if (pt >= I.zoom) { game = makeGame(); battle.sfx(S.sfx.noise, { volume: 0.7 }); setPhase('on'); }
        return false;
      }
      if (phase === 'on') { if (pt >= I.on) setPhase('game'); return false; }   // 가로선에서 펼쳐지며 켜짐(게임은 아직 안 흐른다)
      if (phase === 'game') {
        if (game.update(dt, input)) { last = snapshotGame(); game.dispose?.(); game = null; battle.setText(''); battle.board.setTarget(440, 72, 240, 282); yc.patternPose = { x: I.center[0], y: I.center[1] }; battle.sfx(S.sfx.noise, { volume: 0.6 }); setPhase('off'); }
        return false;
      }
      if (phase === 'off') { if (pt >= O.off) { setPhase('zoomout'); battle.sfx(S.sfx.noise, { volume: 0.5 }); } return false; }   // 게임 화면이 가로선으로 접히며 꺼짐
      if (phase === 'zoomout') { if (pt >= O.zoomout) setPhase('back'); return false; }   // 지지직 걷히며 축소
      if (phase === 'back') {                                   // 제자리로 점프
        const k = Math.min(1, pt / O.back);
        yc.patternPose = { x: I.center[0] + (home.x - I.center[0]) * k, y: I.center[1] + (home.y - I.center[1]) * k - 60 * Math.sin(Math.PI * k) };
        if (k >= 1) { yc.patternPose = null; battle.sfx('thud', { volume: 0.4 }); setPhase('done'); }
        return false;
      }
      return true;
    },
    draw(ctx) {
      if (phase === 'zoom') {
        const k = Math.min(1, pt / I.zoom), clip = drawZoomed(ctx, ease(k));
        drawStatic(ctx, Math.max(0, (k - 0.45) / 0.55) * 0.95, clip);
        return;
      }
      if (phase === 'on') {                                     // 지지직 → 가로 밝은 선 → 위아래로 펼쳐지며 게임 화면이 드러난다
        const k = Math.min(1, pt / I.on), h = Math.max(2, Math.round(360 * ease(k)));
        drawStatic(ctx, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 180 - h / 2, 480, h); ctx.clip(); drawGame(ctx); ctx.restore();
        ctx.fillStyle = `rgba(255,255,255,${(0.9 * (1 - k)).toFixed(3)})`; ctx.fillRect(0, 180 - h / 2 - 1, 480, 2); ctx.fillRect(0, 180 + h / 2 - 1, 480, 2);
        if (k < 0.25) { ctx.fillStyle = `rgba(255,255,255,${(0.8 * (1 - k / 0.25)).toFixed(3)})`; ctx.fillRect(0, 0, 480, 360); }
        return;
      }
      if (phase === 'game') { drawGame(ctx); return; }
      if (phase === 'off') {                                    // 게임 화면이 가로선으로 접히며 밝아졌다 꺼진다
        const k = Math.min(1, pt / O.off), h = Math.max(2, Math.round(360 * (1 - ease(k))));
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360);
        if (last) ctx.drawImage(last, 0, 0, 480, 360, 0, 180 - h / 2, 480, h); else { ctx.fillStyle = '#222'; ctx.fillRect(0, 180 - h / 2, 480, h); }
        ctx.fillStyle = `rgba(255,255,255,${(0.7 * k).toFixed(3)})`; ctx.fillRect(0, 180 - h / 2, 480, h);
        if (k > 0.8) { ctx.fillStyle = `rgba(255,255,255,${((k - 0.8) / 0.2).toFixed(3)})`; ctx.fillRect(0, 179, 480, 2); }
        return;
      }
      if (phase === 'zoomout') {                                // 지지직이 걷히며 TV 에서 멀어진다
        const k = Math.min(1, pt / O.zoomout), clip = drawZoomed(ctx, 1 - ease(k));
        drawStatic(ctx, Math.max(0, 1 - k / 0.55), clip);
        return;
      }
      // jump·dance·back: battle 이 이미 patternPose 로 영클을 그렸다 — 춤 박자 표시만
      if (phase === 'dance') { const p = yc.patternPose; if (p) { ctx.fillStyle = '#ffe066'; ctx.font = '14px "Galmuri11", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.floor(danceT / 0.32) % 2 ? '♪' : '♫', Math.round(p.x) + 60, Math.round(p.y) - 200); ctx.textAlign = 'left'; } }
    },
    dispose() { disposed = true; game?.dispose?.(); game = null; yc.patternPose = null; battle.bubble = null; battle.board.setTarget(440, 72, 240, 282); },
  };
}
