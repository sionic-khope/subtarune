// 리듬 게임 규칙(순수, DOM 없음) — 2026-09-15 사용자 브리핑: 델타룬 3장 테나 리듬 게임 참고. 가운데 두 칸(L/R = 키보드 ←/→)만 유저가 치고
// 양옆(경섭 드럼·빠맨 보컬)은 자동. 노트는 탭·홀드 두 종류, 판정은 GREAT/MISS 둘, 콤보가 쌓인다. 5번 연속 MISS 면 게임오버(재시도). 인기(POPU/LARITY)는 GREAT 로 차고 MISS 로 준다.
export const LANES = ['L', 'R'];
export const RHYTHM = {
  approach: 1.5,        // 노트가 위에서 판정선까지 내려오는 시간(초)
  great: 0.12,          // ±이 안에 누르면 GREAT
  late: 0.16,           // 이만큼 지나면 MISS
  holdRelease: 0.15,    // 홀드는 끝나기 이만큼 전부터는 떼어도 된다
  missLimit: 5,         // 연속 MISS 게임오버
  popGreat: 0.022, popMiss: 0.07, popStart: 0.45,
  scoreGreat: 100,
};

/** 차트 → 플레이 상태. notes: [{ t, lane:'L'|'R', dur? }] (t 는 곡 시각·초) */
export function makePlay(chart) {
  const notes = chart.notes.map((n, i) => ({ id: i, t: n.t, lane: n.lane, dur: n.dur || 0, pitch: n.pitch, status: 'wait' }));
  return { chart, notes, next: 0, combo: 0, maxCombo: 0, score: 0, greats: 0, misses: 0, missStreak: 0, pop: RHYTHM.popStart, over: false, time: 0, side: { drums: 0, vocal: 0 } };
}

function great(play, note, events, kind = 'great') {
  note.status = note.dur ? 'holding' : 'hit';
  play.combo += 1; play.maxCombo = Math.max(play.maxCombo, play.combo); play.greats += 1; play.missStreak = 0;
  play.score += Math.round(RHYTHM.scoreGreat * (1 + Math.min(play.combo, 50) / 50));
  play.pop = Math.min(1, play.pop + RHYTHM.popGreat);
  events.push({ type: kind, lane: note.lane, note, combo: play.combo });
}
function miss(play, note, events, why) {
  note.status = 'miss';
  play.combo = 0; play.misses += 1; play.missStreak += 1;
  play.pop = Math.max(0, play.pop - RHYTHM.popMiss);
  events.push({ type: 'miss', lane: note.lane, note, why });
  if (play.missStreak >= RHYTHM.missLimit && !play.over) { play.over = true; events.push({ type: 'over' }); }
}

/**
 * 한 틱. input: { press: { L, R }(눌린 순간), held: { L, R } }. 반환: 사건 배열
 * great(탭/홀드 시작), holdEnd(홀드 완주), miss(why: late|early|release), empty(노트 없는데 누름 — 툭툭 긋는 소리), over
 */
export function stepPlay(play, time, input = {}) {
  const events = [];
  const press = input.press || {}, held = input.held || {};
  play.time = time;
  for (const lane of LANES) {
    if (!press[lane]) continue;
    // 판정창 안에서 가장 가까운 대기 노트
    let best = null, bestD = Infinity;
    for (const n of play.notes) {
      if (n.status !== 'wait' || n.lane !== lane) continue;
      const d = Math.abs(n.t - time);
      if (d <= RHYTHM.great && d < bestD) { best = n; bestD = d; }
      if (n.t - time > RHYTHM.great) break;
    }
    if (best) great(play, best, events);
    else events.push({ type: 'empty', lane });
  }
  for (const n of play.notes) {
    if (n.status === 'wait' && time - n.t > RHYTHM.late) miss(play, n, events, 'late');
    else if (n.status === 'holding') {
      const end = n.t + n.dur;
      if (time >= end) { n.status = 'hit'; play.score += Math.round(RHYTHM.scoreGreat * 0.5); events.push({ type: 'holdEnd', lane: n.lane, note: n }); }
      else if (!held[n.lane] && time < end - RHYTHM.holdRelease) miss(play, n, events, 'release');
    }
    if (n.t - time > RHYTHM.approach + 1) break;
  }
  return events;
}

/** 곡이 끝났는가: 모든 노트가 판정됐고 시각이 곡 길이를 넘었다 */
export function finished(play, time) {
  return time >= (play.chart.duration ?? 0) && play.notes.every(n => n.status !== 'wait' && n.status !== 'holding');
}

/** 자동 사이드 레인(드럼·보컬): (prev, time] 사이에 지나간 자동 노트 시각들 — 그리기·애니 트리거용 */
export function sideHits(chart, prev, time) {
  const out = { drums: [], vocal: [] };
  for (const key of ['drums', 'vocal']) for (const t of chart.side?.[key] || []) if (t > prev && t <= time) out[key].push(t);
  return out;
}

/** 화면에 보이는 노트: 판정선까지 남은 시간 비율(1 = 맨 위, 0 = 판정선, 음수 = 지나감) */
export function visibleNotes(play, time) {
  const out = [];
  for (const n of play.notes) {
    const k = (n.t - time) / RHYTHM.approach;
    const kEnd = (n.t + n.dur - time) / RHYTHM.approach;
    if (kEnd < -0.25) continue;
    if (k > 1.1) break;
    out.push({ note: n, k, kEnd });
  }
  return out;
}

/** 결과 등급(인기 + 정확도) */
export function grade(play) {
  const total = play.greats + play.misses;
  const acc = total ? play.greats / total : 0;
  if (play.over) return 'F';
  if (acc >= 0.97 && play.pop >= 0.9) return 'S';
  if (acc >= 0.9) return 'A';
  if (acc >= 0.75) return 'B';
  return 'C';
}

/** 튜토리얼(사운드 체크): 작은별 첫마디 “반짝반짝 작은별” — 도도솔솔라라솔, 마지막은 홀드. pitch 는 일렉 기타 음(Hz) */
export const TWINKLE = {
  id: 'twinkle', title: '사운드 체크', artist: '', duration: 7.5, bpm: 96, offset: 0,
  notes: [
    { t: 1.0, lane: 'L', pitch: 261.63 }, { t: 1.625, lane: 'L', pitch: 261.63 },
    { t: 2.25, lane: 'R', pitch: 392.0 }, { t: 2.875, lane: 'R', pitch: 392.0 },
    { t: 3.5, lane: 'R', pitch: 440.0 }, { t: 4.125, lane: 'R', pitch: 440.0 },
    { t: 4.75, lane: 'L', pitch: 392.0, dur: 1.2 },
  ],
  side: { drums: [], vocal: [] },
};
