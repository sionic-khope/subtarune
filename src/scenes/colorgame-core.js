// 색깔 기억 게임 규칙(BUILD198, 용광로 광장 조작 패널 — 사용자 2026-09-16 브리핑 “파피 플레이타임 2 색깔 게임”). DOM·소리 없이 순수 함수만. 진행·그리기·입력은 colorgame.js.
//   버튼 7개 빨·주·노·초·파·남·보. 영클 TV 가 색을 1초에 하나씩 불러 주고(화면에 그 색), 끝나면 순서대로 마우스로 누른다.
//   8판: 1~7판은 색만(점점 길게), 마지막 8판은 일부러 이상한 말(하트·nasdf·pi·레전드·응아잇어 — 사용자 원문)을 섞어 빠르게 많이 말해 혼돈을 준다. 정답은 그 안의 색만 순서대로.
//   입력 시간 = answerBase + answerPer × 정답 개수. 시간이 갈수록 철창이 내려가고(answerProgress 0→1) 넘기면 timeout. 틀리면 wrong.
//   마지막 판(사용자 추가 브리핑)은 입력 차례 없이 호출이 계속 반복되고(어쩌고저쩌고), chaosPassAt(3초) 뒤 나타나는 느낌표 버튼을 누르면 통과(pass).
export const COLORS = [
  { id: 'red',    ko: '빨', en: 'RED',    hex: '#ff3b3b', dark: '#8a1616', tone: 262 },
  { id: 'orange', ko: '주', en: 'ORANGE', hex: '#ff8c1a', dark: '#8f4a08', tone: 294 },
  { id: 'yellow', ko: '노', en: 'YELLOW', hex: '#ffe23a', dark: '#8f7a10', tone: 330 },
  { id: 'green',  ko: '초', en: 'GREEN',  hex: '#3ddc5a', dark: '#177a2c', tone: 349 },
  { id: 'blue',   ko: '파', en: 'BLUE',   hex: '#3a8dff', dark: '#153f8a', tone: 392 },
  { id: 'navy',   ko: '남', en: 'NAVY',   hex: '#2d3fb8', dark: '#121a52', tone: 440 },
  { id: 'purple', ko: '보', en: 'PURPLE', hex: '#a24bff', dark: '#4d1a86', tone: 494 },
];
// 마지막 판의 이상한 말 — 사용자가 쓴 표기 그대로(화면 글자). 소리는 assets/audio/sfx/color_<id>.mp3
export const NOISE = [
  { id: 'heart', label: '하트' }, { id: 'nasdf', label: 'nasdf' }, { id: 'pi', label: 'pi' }, { id: 'legend', label: '레전드' }, { id: 'ngaita', label: '응아잇어' },
];
export const STAGES = [
  ['red'],
  ['red', 'green'],
  ['red', 'green', 'yellow'],
  ['red', 'green', 'yellow', 'blue', 'blue'],
  ['orange', 'red', 'green', 'yellow', 'blue', 'purple'],
  ['red', 'green', 'yellow', 'blue', 'blue', 'blue', 'purple'],
  ['navy', 'green', 'red', 'orange', 'yellow', 'purple', 'blue', 'navy'],
  // 8판(혼돈): 색 사이에 이상한 말이 빠르게 섞인다 — 색만 순서대로 누르면 된다
  ['red', 'green', 'blue', 'yellow', 'heart', 'nasdf', 'pi', 'legend', 'ngaita', 'purple', 'heart', 'navy', 'legend', 'orange', 'ngaita', 'blue'],
];
export const RULES = {
  callGap: 1.0,        // 색 호출 간격(초) — 사용자 “1초에 하나씩”
  chaosGap: 0.5,       // 마지막 판 호출 간격(빠르게 많이)
  callHold: 0.72,      // 호출 때 화면에 색이 켜져 있는 시간(같은 색 연속을 구분하려고 사이를 잠깐 끈다)
  preRoll: 0.8,        // 호출이 끝나고 입력 차례가 시작될 때까지
  answerBase: 3.0, answerPer: 1.4,   // 입력 제한 시간 = base + per × 정답 개수
  chaosPassAt: 3.0,    // 마지막 판: 이만큼 지나면 느낌표 버튼이 나타난다(좌우로 움직임) — 누르면 통과
  camVideo: 'assets/video/gajaeman_cam.mp4',   // 마지막 판 오른쪽 아래 카메라(소리 없이 반복, 정사각형)
};
const WORDS = Object.fromEntries([...COLORS.map(c => [c.id, { ...c, kind: 'color', label: c.en }]), ...NOISE.map(n => [n.id, { ...n, kind: 'noise' }])]);
/** 호출 단어 정보 — 색이면 kind 'color'(en/ko/hex/tone), 이상한 말이면 'noise'(label) */
export function wordOf(id) { return WORDS[id]; }
export const isColor = id => WORDS[id]?.kind === 'color';

/** 판 하나. stage 0~7. calls 는 호출 시각표, expected 는 눌러야 할 색 순서 */
export function makeRound(stage) {
  const ids = STAGES[stage], chaos = stage === STAGES.length - 1;
  const gap = chaos ? RULES.chaosGap : RULES.callGap;
  const calls = ids.map((id, index) => ({ id, index, kind: WORDS[id].kind, at: index * gap }));
  const expected = ids.filter(isColor);
  return { stage, chaos, gap, calls, expected, i: 0, next: 0, t: 0, loopT: 0, loops: 0, answerT: 0, limit: RULES.answerBase + RULES.answerPer * expected.length,
    answerAt: ids.length * gap + RULES.preRoll, status: 'calling' };
}

/** 시간을 흘린다. 이벤트: {type:'call', id, index, kind} 호출 시작 / {type:'answer'} 입력 차례 / {type:'timeout'} 시간 초과. 혼돈 판은 호출이 끝나면 처음부터 반복 */
export function stepRound(round, dt) {
  const ev = [];
  if (round.status === 'calling') {
    round.t += dt; round.loopT += dt;
    while (round.next < round.calls.length && round.loopT >= round.calls[round.next].at) { const c = round.calls[round.next]; round.next += 1; ev.push({ type: 'call', id: c.id, index: c.index, kind: c.kind }); }
    if (round.next >= round.calls.length) {
      if (round.chaos) { if (round.loopT >= round.calls.length * round.gap) { round.loopT -= round.calls.length * round.gap; round.next = 0; round.loops += 1; } }
      else if (round.t >= round.answerAt) { round.status = 'answer'; round.answerT = 0; ev.push({ type: 'answer' }); }
    }
  } else if (round.status === 'answer') {
    round.t += dt; round.answerT += dt;
    if (round.answerT >= round.limit) { round.answerT = round.limit; round.status = 'timeout'; ev.push({ type: 'timeout' }); }
  }
  return ev;
}

/** 버튼을 누른다. {type:'ignored'|'ok'|'clear'|'wrong', want?, got?} */
export function pressRound(round, id) {
  if (round.status !== 'answer') return { type: 'ignored' };
  const want = round.expected[round.i];
  if (id !== want) { round.status = 'wrong'; return { type: 'wrong', want, got: id, index: round.i }; }
  round.i += 1;
  if (round.i >= round.expected.length) { round.status = 'clear'; return { type: 'clear' }; }
  return { type: 'ok', index: round.i - 1 };
}

/** 혼돈 판: 느낌표 버튼이 나타나 있는가(chaosPassAt 뒤, 아직 통과 전) */
export function passReady(round) { return !!round && round.chaos && round.status === 'calling' && round.t >= RULES.chaosPassAt; }
/** 느낌표 버튼을 누른다 — 혼돈 판에서만 통과. {type:'pass'|'ignored'} */
export function passRound(round) {
  if (!passReady(round)) return { type: 'ignored' };
  round.status = 'pass'; return { type: 'pass' };
}

/** 입력 제한 시간 진행 0→1(철창이 그만큼 내려간다) */
export function answerProgress(round) { return round.status === 'calling' ? 0 : Math.min(1, round.answerT / round.limit); }
