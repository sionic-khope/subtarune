// 특별 패턴 2 — 리듬(BUILD217 사용자 브리핑 “뚜울라 리듬게임이랑 똑같은 화면으로”, “지금 전혀 안 맞아 · 멜로디에 맞게 떨어지는 거야”):
//   뚜울라 무대 그대로(생성 배경·TV 화면·스포트라이트 빔·바닥 원·밴드 셋·관객 띠·인기 기둥, scenes/rhythm-stage.js) 띄우고
//   가운데 기둥(왼쪽 반 ←, 오른쪽 반 →)에 지금 흐르는 보스전 브금의 **멜로디** 노트가 떨어진다. 양옆 패드(경섭 드럼·빠맨 보컬)는 알아서 친다.
//   차트와 keyed harmonic layer는 tools/rhythm/tvtime_layer.py로 원본 MP3의 같은 시간축에서 만든다.
//   [지금 브금 시각 + lead, + seconds] 구간만 잘라 쓰며, 재생과 입력의 동기는 실시간 브라우저 QA로 검증한다.
//   흐름: 패드가 삐용 하고 뜸 → 2초 뒤 첫 노트 → 15초 연주 → 2초 멈춤 → 판정.
//   틀릴 때마다 파티 15 피해. 틀린 게 3회 미만이면 “* 영클이 감동한다!” 문구 뒤 우는 영클(원본의 70% 크기)이 아래에서 불쑥 올라와
//   흔들흔들하다 눈물이 터지고 — 붉은 번쩍·화면 흔들림·-10·맞는 소리로 10 피해. 3회 이상이면 “* 영클은 시큰둥하다.” 만 잠깐.
//   판정·노트 규칙은 scenes/rhythm-core.js(순수), 그림은 scenes/rhythm-stage.js(순수) 그대로 쓴다.
import { makePlay, stepPlay, sideHits, beatAt, highlightAt } from '../../scenes/rhythm-core.js';
import { FONT } from '../../ui/font.js';
import * as ST from '../../scenes/rhythm-stage.js';
import { createMelodyLayer } from './rhythm-melody.js';

const loadImg = (src) => new Promise((r) => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
/** 이미지의 단색 실루엣(맞을 때 붉게 번쩍) */
const tint = (img, color) => {
  if (typeof document === 'undefined' || !img) return null;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
};

/**
 * 곡 전체 차트에서 [start, start + seconds] 안의 노트만 잘라 온다(브금이 되감기는 구간이면 duration 을 더한 사본도 본다).
 * 순수 — 단위 테스트(tests/unit/tvform-rhythm.test.mjs)에서 쓴다.
 */
export function pickWindow(chart, start, seconds) {
  const out = [], dur = chart?.duration || 0, end = start + seconds;
  const loop = dur > 0 ? Math.floor(start / dur) : 0;
  for (const n of chart?.notes || []) {
    for (const t of (dur > 0 ? [n.t + loop * dur, n.t + (loop + 1) * dur] : [n.t])) {
      if (t >= start && t <= end) out.push({ t: Math.round(t * 1000) / 1000, lane: n.lane, pitch: n.pitch,
        ...(n.soundDur ? { soundDur: Math.min(n.soundDur, end - t) } : {}) });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
/** 사이드(자동) 노트도 같은 구간만(그리기·판정선 반짝이 곡 전체를 돌지 않게) */
function pickSide(side, start, seconds, dur) {
  const out = { drums: [], vocal: [] };
  const loop = dur > 0 ? Math.max(0, Math.floor((start - 2) / dur)) : 0;
  for (const key of ['drums', 'vocal']) for (const it of side?.[key] || []) {
    const base = typeof it === 'number' ? it : it.t, lane = typeof it === 'number' ? 'L' : (it.lane || 'L');
    for (const t of (dur > 0 ? [base + loop * dur, base + (loop + 1) * dur] : [base])) if (t >= start - 2 && t <= start + seconds + 2) out[key].push({ t, lane });
  }
  return out;
}

export function createRhythmGame(battle, yc, K) {
  const sound = battle.game.sound;
  const instrument = createMelodyLayer(sound, K.instrument);
  const imgs = ST.loadStageImages();
  const band = ST.BAND.map((b) => ({ ...b, y: ST.STAND_Y, frame: 0, animT: 0 }));
  let clock = 0, phase = 'pads', pt = 0, padK = 0, padSfx = false, disposed = false;
  let song = K.chartData || null, chart = null, play = null, start = 0, sideT = 0, chartPeriod = 0;
  let judge = null, judgeT = 9, fx = [], dmg = [], held = { L: false, R: false }, hurt = {};
  let cryImg = null, cryRed = null, tears = [], cried = false, moved = false, flashRed = 0;
  let loops = 0, lastRaw = null;
  let sparks = [], confetti = [], flowers = [], hi = false, lastBeat = -1, lastC10 = 0, strobe = 0, cheer = 0;
  let crowdLast = { applause: -9, cheer: -9, roar: -9 }, crowdPick = { applause: 0, cheer: 0, roar: 0 };
  let faceImg = null;
  loadImg(K.cry.image).then((i) => { cryImg = i; cryRed = tint(i, '#ff4a4a'); });
  loadImg(K.face.src).then((i) => { faceImg = i; });
  if (!song && typeof fetch === 'function') {
    try { fetch(K.chart).then((r) => r.json()).then((c) => { if (c && c.notes) song = c; }).catch(() => {}); } catch (e) { /* fetch 없는 환경(단위 테스트)은 예비 격자로 */ }
  }
  // HTML media position is the chart's source timeline. A paused track must freeze it, not switch to a local clock.
  // latency is manual display/input calibration only; WebAudio output latency belongs to the keyed layer scheduler.
  const hasBgm = () => sound?.bgm && Number.isFinite(sound.bgm.currentTime);
  const loopDuration = () => Number.isFinite(sound.bgm?.duration) ? sound.bgm.duration : (song?.duration || 0);
  const rawTime = () => (hasBgm() ? sound.bgm.currentTime : clock) - (K.latency || 0);
  // 브금이 처음으로 되감기면(loop) 노트 시각이 어긋난다 — 되감긴 만큼 더해 시계를 계속 앞으로만 가게 한다
  const now = () => {
    const raw = rawTime(), period = loopDuration();
    if (lastRaw !== null && raw < lastRaw - 1) loops += 1;
    lastRaw = raw;
    if (chart && chartPeriod > 0 && period !== chartPeriod) {
      const retime = t => t + Math.floor(t / chartPeriod) * (period - chartPeriod);
      for (const note of chart.notes) note.t = retime(note.t);
      for (const note of play.notes) note.t = retime(note.t);
      for (const notes of Object.values(chart.side)) for (const note of notes) note.t = retime(note.t);
      chartPeriod = period;
    }
    return raw + loops * period;
  };
  const setPhase = (p) => { phase = p; pt = 0; };
  // 관객 환호(원본 무대와 같은 녹음 — 종류별 쿨다운, 변형 번갈아). 곡 중엔 노래를 안 덮게 작게
  const crowd = (kind, volume) => {
    if (clock - crowdLast[kind] < K.cheerCooldown[kind]) return;
    crowdLast[kind] = clock;
    const names = K.cheerSfx[kind], name = names[crowdPick[kind] % names.length]; crowdPick[kind] += 1;
    battle.sfx(name, { volume: Math.min(1, volume) });
  };
  const cheerAt = (level) => {
    cheer = level >= 3 ? 3.4 : level >= 2 ? 2.4 : 1.6;
    const m = phase === 'play' ? K.cheerMix : 1;
    if (level >= 3) { crowd('roar', 0.75 * m); crowd('applause', 0.55 * m); }
    else if (level >= 2) { crowd('cheer', 0.65 * m); crowd('applause', 0.45 * m); }
    else crowd('applause', 0.55 * m);
  };
  // 불티(GREAT 노란 이펙트)·무대 양옆 파이로·꽃·색종이 — 원본 무대와 같은 연출
  const spark = (x, y, n = 8) => { for (let i = 0; i < n; i++) sparks.push({ x, y, vx: (battle.rnd() - 0.5) * 150, vy: -(70 + battle.rnd() * 150), t: 0, dur: 0.3 + battle.rnd() * 0.3 }); };
  const pyro = (n = 8) => { for (const sx of [64, 416]) for (let i = 0; i < n; i++) sparks.push({ x: sx + (battle.rnd() - 0.5) * 10, y: 270, vx: (battle.rnd() - 0.5) * 90, vy: -(170 + battle.rnd() * 150), t: 0, dur: 0.55 + battle.rnd() * 0.35 }); };
  const throwFlowers = (n) => { for (let i = 0; i < n; i++) flowers.push({ x: 40 + battle.rnd() * 400, y: 356, vx: (battle.rnd() - 0.5) * 60, vy: -(230 + battle.rnd() * 120), t: -battle.rnd() * 0.8, color: ST.FLOWER_COLORS[i % ST.FLOWER_COLORS.length], spin: battle.rnd() * 6 }); };
  const snow = (n) => { for (let i = 0; i < n; i++) confetti.push({ x: battle.rnd() * 480, y: -6 - battle.rnd() * 30, vy: 55 + battle.rnd() * 70, t: battle.rnd() * 6, color: i % 5 === 4 ? '#ffffff' : ST.FLOWER_COLORS[i % ST.FLOWER_COLORS.length], seed: battle.rnd() * 7 }); };
  const anim = (id, frame, time) => { const b = band.find((q) => q.id === id); if (b) { b.frame = frame; b.animT = time; } };
  const strum = () => { const b = band.find((q) => q.id === 'hyungsub'); if (b) { b.frame = b.frame === 1 ? 2 : 1; b.animT = 0.22; } };
  // 차트를 못 읽었을 때만 쓰는 예비 격자(브금 bpm 에 맞춘 16박 패턴)
  const gridNotes = (t0) => {
    const len = 60 / K.bpm, b0 = Math.ceil((t0 - K.offset) / len), out = [];
    for (let b = b0, i = 0; K.offset + b * len < t0 + K.seconds; b++, i++) {
      if (i % K.skipEvery === K.skipEvery - 1) continue;
      out.push({ t: K.offset + b * len, lane: K.pattern[i % K.pattern.length] });
    }
    return out;
  };
  const buildWindow = () => {
    start = now() + K.lead;
    chartPeriod = loopDuration();
    let notes = song ? pickWindow({ ...song, duration: loopDuration() }, start, K.seconds) : [];
    const melody = notes.length >= (K.minNotes ?? 6);
    if (!melody) notes = gridNotes(start);
    chart = {
      notes, bpm: melody ? (song.bpm || K.bpm) : K.bpm, offset: melody ? (song.offset || 0) : K.offset,
      duration: start + K.seconds, side: melody ? pickSide(song.side, start, K.seconds, loopDuration()) : { drums: [], vocal: [] },
      title: song?.title || K.title, artist: song?.artist || K.artist, melody,
    };
    play = makePlay(chart); sideT = now();
  };
  return {
    get snapshot() {
      const nx = play ? play.notes.find((n) => n.status === 'wait') : null;
      return { kind: 'rhythm', phase, pt: Math.round(pt * 100) / 100, notes: chart?.notes.length ?? 0, greats: play?.greats ?? 0, misses: play?.misses ?? 0,
        combo: play?.combo ?? 0, start: Math.round(start * 100) / 100, time: now(), cried, judge: judge?.text || null,
        next: nx ? nx.t : null, nextLane: nx ? nx.lane : null, nextPitch: nx ? (nx.pitch ?? null) : null,
        chartLoaded: !!song, melody: !!chart?.melody, moved, instrument: instrument.snapshot,
        clockSource: hasBgm() ? 'bgm' : 'simulation', loopDuration: loopDuration(), latency: K.latency ?? 0, cheer: Math.round(cheer * 100) / 100 };
    },
    update(dt, input) {
      if (disposed) return true;
      instrument.update();
      now();
      clock += dt; pt += dt; judgeT += dt; if (flashRed > 0) flashRed -= dt;
      for (const f of fx) f.t += dt; fx = fx.filter((f) => f.t < f.dur);
      for (const d of dmg) d.t += dt; dmg = dmg.filter((d) => d.t < d.dur);
      for (const b of band) if (b.animT > 0) { b.animT -= dt; if (b.animT <= 0) b.frame = 0; }
      for (const id of Object.keys(hurt)) if (hurt[id] > 0) hurt[id] -= dt;
      strobe = Math.max(0, strobe - dt * 2.2); cheer = Math.max(0, cheer - dt);
      for (const sp of sparks) { sp.t += dt; sp.vy += 420 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; }
      sparks = sparks.filter((sp) => sp.t < sp.dur);
      for (const c of confetti) { c.t += dt; c.y += c.vy * dt; c.x += Math.sin(c.t * 3 + c.seed) * 22 * dt; }
      confetti = confetti.filter((c) => c.y < 364);
      for (const fl of flowers) { fl.t += dt; if (fl.t < 0) continue; fl.x += fl.vx * dt; fl.vy += 520 * dt; fl.y += fl.vy * dt; }
      flowers = flowers.filter((fl) => fl.y < 380 && fl.t < 4);
      if (phase === 'pads') {                                   // 패드가 삐용 하고 뜬다 → 차트는 지금 브금 시각 + lead 부터
        if (!padSfx) { padSfx = true; battle.sfx(K.padSfx, { volume: 0.8 }); }
        padK = Math.min(1, pt / 0.35);
        const audioReady = !sound.ctx || instrument.snapshot.ready || instrument.snapshot.error || pt >= K.chartWait;
        if (!chart && audioReady && pt >= 0.1 && (song || pt >= (K.chartWait ?? 3))) buildWindow();
        if (pt >= 0.4 && chart) setPhase('play');
        return false;
      }
      if (phase === 'play') {
        const time = now();
        held = { L: input.down('left'), R: input.down('right') };
        const events = stepPlay(play, time, { press: { L: input.just('left'), R: input.just('right') }, held });
        for (const e of events) {
          if (e.type === 'great') { judge = { text: 'GREAT!', color: '#7dffb0' }; judgeT = 0; strum();
            fx.push({ kind: 'ring', lane: e.lane, t: 0, dur: 0.35 }, { kind: 'beam', lane: e.lane, t: 0, dur: ST.BEAM.dur });
            const hf = ST.HALF[e.lane]; spark(hf.x + hf.w / 2, ST.RECEPTOR_Y - 2);
            instrument.play(chart.notes[e.note.id], time + (K.latency || 0)); }
          else if (e.type === 'miss') {
            judge = { text: 'MISS', color: '#ff6a6a' }; judgeT = 0; battle.sfx(K.missSfx, { volume: 0.8 }); battle.hurtParty(K.missDamage);
            for (const b of band) hurt[b.id] = 0.35;
            dmg.push({ x: 240, y: ST.STAND_Y - 78, t: 0, dur: 0.8, text: `-${K.missDamage}` });
          } else if (e.type === 'empty' && K.emptySfx) { battle.sfx(K.emptySfx, { volume: 0.22 }); strum(); }
        }
        const side = sideHits(chart, sideT, time); sideT = time;
        if (side.drums.length) { anim('gyeongsub', 1 + Math.floor(battle.rnd() * 3), 0.18); for (const it of side.drums) fx.push({ kind: 'sidering', lane: 'drums', half: it.lane || 'L', t: 0, dur: 0.25 }); }
        if (side.vocal.length) { anim('ppaman', 1 + Math.floor(battle.rnd() * 3), 0.3); for (const it of side.vocal) fx.push({ kind: 'sidering', lane: 'vocal', half: it.lane || 'L', t: 0, dur: 0.3 }); }
        // 콤보 10 마다 양옆 불꽃·꽃(원본 무대의 환호), 코러스 구간이면 색 조명·마디 스트로브·색종이
        const c10 = Math.floor(play.combo / 10);
        if (c10 > lastC10 && play.combo > 0) { lastC10 = c10; pyro(6); throwFlowers(4); cheerAt(c10 >= 5 ? 3 : c10 >= 2 ? 2 : 1); }
        if (play.combo === 0) lastC10 = 0;
        const wasHi = hi;
        hi = song ? highlightAt(song, rawTime()) >= 0 : false;
        if (hi && !wasHi) { cheerAt(3); throwFlowers(10); pyro(10); }
        if (hi) {
          cheer = Math.max(cheer, 0.6);
          if (confetti.length < 90) snow(2);
          const bi = Math.floor(beatAt(chart, time).beat);
          if (bi !== lastBeat) { lastBeat = bi; const bar = ((bi % 4) + 4) % 4 === 0; strobe = bar ? 0.45 : Math.max(strobe, 0.18); if (bar) pyro(4); }
        }
        if (time >= chart.duration && play.notes.every((n) => n.status !== 'wait' && n.status !== 'holding')) setPhase('after');
        return false;
      }
      if (phase === 'after') {                                  // 노트가 멈추고 잠깐 — 그 뒤 판정
        if (pt >= K.afterHold) {
          if (play.misses < K.cryUnder) { moved = true; battle.setText(K.movedText); battle.sfx('great_shine', { volume: 0.5 }); cheerAt(3); throwFlowers(12); setPhase('moved'); }
          else { battle.setText(K.sourText); setPhase('sour'); }
        }
        return false;
      }
      if (phase === 'moved') { if (pt >= K.movedHold) { battle.setText(''); battle.sfx('wing', { volume: 0.6 }); setPhase('cry'); } return false; }
      if (phase === 'sour') { if (pt >= K.sourHold) { battle.setText(''); setPhase('done'); } return false; }
      if (phase === 'cry') {                                    // 감동한 영클이 아래에서 불쑥 → 흔들흔들 → 눈물 터짐(붉은 번쩍·흔들림·-10)
        const C = K.cry, total = C.rise + C.wobble + C.burst;
        if (!cried && pt >= C.rise + C.wobble) {
          cried = true; flashRed = C.flash ?? 0.45;
          battle.sfx('damage', { volume: 0.9 });
          battle.game.shake = { time: 0.35, amp: 5 };
          battle.hitEnemy(yc, null, K.cryDamage, { source: 'special', sound: true });
          pyro(10); throwFlowers(8); cheerAt(2);
          for (let i = 0; i < 40; i++) tears.push({ x: 240 + (battle.rnd() - 0.5) * 60, y: 210, vx: (battle.rnd() - 0.5) * 260, vy: -120 - battle.rnd() * 180, t: 0 });
        }
        for (const d of tears) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 420 * dt; }
        if (pt >= total + 0.4) setPhase('done');
        return false;
      }
      return phase === 'done';
    },
    draw(ctx) {
      const inPlay = !!(chart && play) && (phase === 'play' || phase === 'after');
      const time = now(), bt = chart ? beatAt(chart, time) : null, beat = bt ? bt.beat : clock * 2.1;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      // 매달린 스크린은 영상 대신 변신 영클의 TV 얼굴(전투 아이들 시트 4칸이 숨 쉬듯 돈다, 사용자 “뒤에 있는 TV를 영클 TV로”)
      const F = K.face, fi = Math.floor(clock * F.fps) % (F.cols * F.rows);
      const frame = { x: (fi % F.cols) * F.cell + F.crop[0], y: Math.floor(fi / F.cols) * F.cell + F.crop[1], w: F.crop[2], h: F.crop[3] };
      ST.drawBackdrop(ctx, { img: imgs.backdrop, t: clock, live: inPlay || phase === 'cry', hi, bar: bt ? bt.bar : 0, strobe, flash: 0,
        screen: { img: faceImg, frame, noise: 0.12, glow: F.glow, tint: flashRed } });
      ST.drawPools(ctx, { band, t: clock, beat: hi && chart ? bt : null });
      // 기둥 셋은 패드가 뜨는 동안 가운데에서 삐용 하고 커진다
      const h = ST.RECEPTOR_Y - ST.LANE_TOP + 16, cx = ST.LANE.x + ST.LANE.w / 2, cy = ST.LANE_TOP + h / 2, k = 0.3 + 0.7 * padK;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      ST.drawLanes(ctx, { chart, play, time, inPlay, held, fx, judge: judgeT < 0.5 ? judge : null, judgeT, t: clock });
      ctx.restore();
      ST.drawBand(ctx, { sheets: imgs.sheets, band, beat, hurt });
      for (const d of dmg) { const q = d.t / d.dur; ST.text(ctx, d.text, d.x, d.y - q * 22, { align: 'center', color: '#ff4a4a', alpha: 1 - q * q }); }
      ST.drawAudience(ctx, { img: imgs.audience, t: clock, cheering: cheer > 0 || phase === 'cry', beat });
      ST.drawParticles(ctx, { sparks, confetti, flowers });
      ST.drawMeters(ctx, { pop: play?.pop });
      // 안내·MISS 는 맨 아랫줄(위는 POPU/LARITY·패드 이름 자리 — 겹치면 둘 다 안 읽힌다)
      ST.text(ctx, '←→ 박자에 맞춰', 12, 302, { color: '#c9c9d9' });
      ST.text(ctx, `MISS ${play?.misses ?? 0}`, 468, 302, { color: '#ff657b', align: 'right' });
      ctx.textAlign = 'left'; ctx.font = FONT;
      if (phase === 'moved' || phase === 'sour') battle.drawTextBox(ctx);
      if (phase === 'cry' && cryImg) {                          // 감동해 우는 영클: 아래에서 불쑥, 흔들흔들, 눈물 (사용자 “30% 줄여” → 원본의 70%)
        const C = K.cry, sc = C.scale ?? 0.7, w = Math.round(cryImg.width * sc), ih = Math.round(cryImg.height * sc);
        const rise = Math.min(1, pt / C.rise), e = 1 - Math.pow(1 - rise, 3), wob = pt > C.rise ? Math.sin((pt - C.rise) * 14) * 6 : 0;
        const x = Math.round(240 - w / 2 + wob), y = Math.round(340 - ih * e);
        ctx.drawImage(cryImg, x, y, w, ih);
        if (flashRed > 0 && cryRed) { ctx.save(); ctx.globalAlpha = Math.min(0.55, (flashRed / (C.flash ?? 0.45)) * 0.55); ctx.drawImage(cryRed, x, y, w, ih); ctx.restore(); }
        for (const d of tears) { ctx.fillStyle = '#9fd8ff'; ctx.fillRect(Math.round(d.x), Math.round(d.y), 4, 6); }
        if (cried) ST.text(ctx, `-${K.cryDamage}`, 240, Math.max(18, y - 26), { align: 'center', size: 24, color: '#ff4a4a' });
      }
      ctx.restore();
    },
    dispose() { disposed = true; instrument.dispose(); battle.setText(''); },
  };
}
