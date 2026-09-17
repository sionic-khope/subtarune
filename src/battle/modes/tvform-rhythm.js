// 특별 패턴 2 — 리듬(BUILD216 사용자 브리핑): 뚜울라 리듬게임 UI(가운데 기둥 ←/→)로 돌아와 지금 흐르는 보스전 브금 진행도에 맞춰 노트가 떨어진다.
//   화면 전환·페이드인 뒤 패드가 삐용 하고 뜨고 2초 뒤부터 15초 동안(박자 149.5bpm, 데이터 youngcle-special.js rhythm). 틀릴 때마다 파티 15 피해.
//   15초가 끝나면 노트가 멈추고 2초 뒤 복귀. 틀린 횟수가 3회 미만이면 영클이 감동해 우는 그림(gpt youngcle-cry.png)이 아래에서 불쑥 올라와 흔들흔들하다 눈물 터져 10 피해.
//   판정·노트 규칙은 scenes/rhythm-core.js(순수)를 그대로 쓴다.
import { makePlay, stepPlay, visibleNotes, beatAt, RHYTHM } from '../../scenes/rhythm-core.js';
const LANE_TOP = 34, RECEPTOR_Y = 246, LANE = { x: 190, w: 100 };
const HALF = { L: { x: LANE.x, w: LANE.w / 2 }, R: { x: LANE.x + LANE.w / 2, w: LANE.w / 2 } };
const NOTE_RGB = '92,226,208', LINE_RGB = '86,204,222', FONT = '14px "Galmuri11", sans-serif';
const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

export function createRhythmGame(battle, yc, K) {
  const sound = battle.game.sound;
  let clock = 0, phase = 'pads', pt = 0, play = null, chart = null, judge = null, judgeT = 9, cryImg = null, disposed = false, fx = [], padK = 0, padSfx = false, tears = [], cried = false, start = 0, held = { L: false, R: false };
  loadImg(K.cry.image).then(i => { cryImg = i; });
  const songTime = () => (sound.bgm && Number.isFinite(sound.bgm.currentTime) && !sound.bgm.paused) ? sound.bgm.currentTime : clock;
  const setPhase = (p) => { phase = p; pt = 0; };
  const buildChart = () => {
    const len = 60 / K.bpm; start = songTime() + K.lead; const b0 = Math.ceil((start - K.offset) / len); const notes = [];
    for (let b = b0, i = 0; K.offset + b * len < start + K.seconds; b++, i++) { if (i % K.skipEvery === K.skipEvery - 1) continue; notes.push({ t: K.offset + b * len, lane: K.pattern[i % K.pattern.length] }); }
    return { notes, bpm: K.bpm, offset: K.offset, duration: start + K.seconds };
  };
  return {
    get snapshot() { const nx = play ? play.notes.find(n => n.status === 'wait') : null; return { kind: 'rhythm', phase, pt: Math.round(pt * 100) / 100, notes: chart?.notes.length ?? 0, greats: play?.greats ?? 0, misses: play?.misses ?? 0, combo: play?.combo ?? 0, start: Math.round(start * 100) / 100, time: songTime(), cried, judge: judge?.text || null, next: nx ? nx.t : null, nextLane: nx ? nx.lane : null }; },
    update(dt, input) {
      if (disposed) return true;
      clock += dt; pt += dt; judgeT += dt;
      for (const f of fx) f.t += dt; fx = fx.filter(f => f.t < f.dur);
      if (phase === 'pads') {                                   // 패드가 삐용 하고 뜬다 → 차트는 지금 브금 시각 + 2초부터
        if (!padSfx) { padSfx = true; battle.sfx(K.padSfx, { volume: 0.8 }); }
        padK = Math.min(1, pt / 0.35);
        if (!chart && pt >= 0.1) { chart = buildChart(); play = makePlay(chart); }
        if (pt >= 0.4 && chart) setPhase('play');
        return false;
      }
      if (phase === 'play') {
        const time = songTime();
        held = { L: input.down('left'), R: input.down('right') };
        const events = stepPlay(play, time, { press: { L: input.just('left'), R: input.just('right') }, held });
        for (const e of events) {
          if (e.type === 'great') { judge = { text: 'GREAT', color: '#7dffd6' }; judgeT = 0; fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.3 }); }
          else if (e.type === 'miss') { judge = { text: 'MISS', color: '#ff657b' }; judgeT = 0; battle.sfx(K.missSfx, { volume: 0.8 }); battle.hurtParty(K.missDamage); }
        }
        if (time >= chart.duration && play.notes.every(n => n.status !== 'wait' && n.status !== 'holding')) setPhase('after');
        return false;
      }
      if (phase === 'after') { if (pt >= K.afterHold) { if (play.misses < K.cryUnder) { setPhase('cry'); battle.sfx('wing', { volume: 0.6 }); } else setPhase('done'); } return false; }
      if (phase === 'cry') {                                    // 감동한 영클이 아래에서 불쑥 → 흔들흔들 → 눈물 터짐(10 피해)
        const C = K.cry, total = C.rise + C.wobble + C.burst;
        if (!cried && pt >= C.rise + C.wobble) { cried = true; battle.sfx('damage', { volume: 0.9 }); battle.game.shake = { time: 0.3, amp: 4 }; battle.hitEnemy(yc, null, K.cryDamage, { source: 'special', sound: true }); for (let i = 0; i < 40; i++) tears.push({ x: 240 + (battle.rnd() - 0.5) * 60, y: 200, vx: (battle.rnd() - 0.5) * 260, vy: -120 - battle.rnd() * 180, t: 0 }); }
        for (const d of tears) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 420 * dt; }
        if (pt >= total + 0.4) setPhase('done');
        return false;
      }
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.font = FONT; ctx.textBaseline = 'top';
      ctx.fillStyle = '#05040c'; ctx.fillRect(0, 0, 480, 360);
      for (let y = 0; y < 320; y += 3) if ((y * 7 + Math.floor(clock * 60)) % 11 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, y, 480, 1); }   // TV 주사선
      const inPlay = phase !== 'pads' && chart, time = inPlay ? songTime() : 0, h = RECEPTOR_Y - LANE_TOP + 16, span = RECEPTOR_Y - LANE_TOP, cx = LANE.x + LANE.w / 2;
      ctx.save(); ctx.translate(cx, LANE_TOP + h / 2); ctx.scale(0.3 + 0.7 * padK, 0.3 + 0.7 * padK); ctx.translate(-cx, -(LANE_TOP + h / 2));
      ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(LANE.x, LANE_TOP, LANE.w, h);
      if (inPlay) {
        const bt = beatAt(chart, time);
        for (let b = Math.floor(bt.beat); ; b++) { const k = ((chart.offset || 0) + b * bt.len - time) / RHYTHM.approach; if (k > 1) break; if (k < 0) continue; const bar = ((b % 4) + 4) % 4 === 0, y = Math.round(RECEPTOR_Y - k * span); ctx.fillStyle = `rgba(255,255,255,${bar ? 0.7 : 0.32})`; ctx.fillRect(LANE.x + 2, y, LANE.w - 4, bar ? 2 : 1); }
        if (play.combo >= 2) { ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = FONT.replace(/^\d+px/, '40px'); ctx.fillText(String(play.combo), cx, RECEPTOR_Y - 104); ctx.font = FONT; ctx.fillText('COMBO', cx, RECEPTOR_Y - 58); ctx.textAlign = 'left'; }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(cx, LANE_TOP, 1, h);
      ctx.fillStyle = `rgba(${LINE_RGB},0.95)`; ctx.fillRect(LANE.x, LANE_TOP, 2, h); ctx.fillRect(LANE.x + LANE.w - 2, LANE_TOP, 2, h); ctx.fillRect(LANE.x, RECEPTOR_Y + 8, LANE.w, 3);
      for (const lane of ['L', 'R']) { const hf = HALF[lane], on = inPlay && held[lane]; ctx.strokeStyle = `rgba(${NOTE_RGB},${on ? 0.95 : 0.4})`; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(hf.x + 5.5, RECEPTOR_Y - 5.5, hf.w - 11, 11); }
      ctx.textAlign = 'center'; ctx.fillStyle = '#9fe8ff'; ctx.fillText('◀', HALF.L.x + HALF.L.w / 2, RECEPTOR_Y + 13); ctx.fillText('▶', HALF.R.x + HALF.R.w / 2, RECEPTOR_Y + 13);
      ctx.fillStyle = '#4fd8ff'; ctx.fillText('형섭', cx, LANE_TOP - 18); ctx.textAlign = 'left';
      if (inPlay) {
        ctx.save(); ctx.beginPath(); ctx.rect(LANE.x, LANE_TOP, LANE.w, h); ctx.clip();
        for (const { note, k } of visibleNotes(play, time)) { if (note.status === 'hit' || note.status === 'miss') continue; const hf = HALF[note.lane], y = RECEPTOR_Y - k * span; ctx.fillStyle = `rgba(${NOTE_RGB},0.95)`; ctx.fillRect(hf.x + 5, Math.round(y) - 5, hf.w - 10, 10); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(hf.x + 5, Math.round(y) - 5, hf.w - 10, 2); }
        for (const f of fx) if (f.kind === 'ring') { const hf = HALF[f.lane], k = f.t / f.dur; ctx.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(2)})`; ctx.lineWidth = 2; ctx.strokeRect(hf.x + 5 - k * 6, RECEPTOR_Y - 5 - k * 6, hf.w - 10 + k * 12, 10 + k * 12); }
        ctx.restore();
        if (judge && judgeT < 0.5) { ctx.textAlign = 'center'; ctx.fillStyle = judge.color; ctx.font = FONT.replace(/^\d+px/, '20px'); ctx.fillText(judge.text, cx, LANE_TOP + 30 - judgeT * 20); ctx.font = FONT; ctx.textAlign = 'left'; }
      }
      ctx.restore();
      ctx.textAlign = 'right'; ctx.fillStyle = '#ff657b'; ctx.fillText(`MISS ${play?.misses ?? 0}`, 468, 8); ctx.fillStyle = '#c9c9d9'; ctx.textAlign = 'left'; ctx.fillText('←→ 박자에 맞춰', 12, 8);
      if (phase === 'cry' && cryImg) {                          // 감동해 우는 영클: 아래에서 불쑥, 흔들흔들, 눈물
        const C = K.cry, rise = Math.min(1, pt / C.rise), e = 1 - Math.pow(1 - rise, 3), wob = pt > C.rise ? Math.sin((pt - C.rise) * 14) * 6 : 0;
        const w = cryImg.width, hh = cryImg.height, x = Math.round(240 - w / 2 + wob), y = Math.round(330 - hh * e);
        ctx.drawImage(cryImg, x, y);
        for (const d of tears) { ctx.fillStyle = '#9fd8ff'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 4, 6); }
        if (cried) { ctx.textAlign = 'center'; ctx.fillStyle = '#ff657b'; ctx.font = FONT.replace(/^\d+px/, '20px'); ctx.fillText(`-${K.cryDamage}`, 240, 40); ctx.font = FONT; ctx.textAlign = 'left'; }
      }
      ctx.restore();
    },
    dispose() { disposed = true; },
  };
}
