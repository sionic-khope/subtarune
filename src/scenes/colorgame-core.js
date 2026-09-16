// 색깔 기억 게임 규칙(BUILD198, 용광로 광장 조작 패널 — 사용자 2026-09-16 브리핑 “파피 플레이타임 2 색깔 게임”). DOM·소리 없이 순수 함수만. 진행·그리기·입력은 colorgame.js.
//   버튼 7개 빨·주·노·초·파·남·보. 영클 TV 가 색을 1초에 하나씩 불러 주고(화면에 그 색), 끝나면 순서대로 마우스로 누른다.
//   8판: 1~7판은 앞 판의 순서에 색이 하나씩 붙는다(사용자 “전 단계랑 이어져서 하나 추가” — 빨 → 빨초 → 빨초노 → …), 마지막 8판은 일부러 이상한 말(하트·nasdf·pi·레전드·응아잇어 — 사용자 원문)을 섞어 빠르게 많이 말해 혼돈을 준다.
//   입력 차례는 마지막 호출이 꺼진 직후 바로(사용자 “레드 그린 하면 바로 시작”). 제한 시간은 모든 판 같고(answerTime), 시간이 갈수록 철창이 내려간다(answerProgress 0→1).
//   틀린 색을 누르면 실패가 아니라 철창이 내려가는 속도가 빨라질 뿐(wrongSpeedUp 배, 누적). 시간을 넘기면 timeout → 처음부터(사용자 2026-09-16 규칙 정정).
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
// 기본 순서(사용자 예시 RED → GREEN → YELLOW → BLUE …): n판 = 앞 n개
export const SEQUENCE = ['red', 'green', 'yellow', 'blue', 'purple', 'orange', 'navy'];
export const STAGES = [
  ...SEQUENCE.map((_, i) => SEQUENCE.slice(0, i + 1)),
  // 8판(광기): 7판 순서에 한 색을 더 붙이고 사이사이 이상한 말이 빠르게 섞인다(입력 차례 없음, 느낌표 버튼으로 통과)
  ['red', 'green', 'heart', 'yellow', 'blue', 'nasdf', 'pi', 'purple', 'legend', 'orange', 'ngaita', 'navy', 'heart', 'blue', 'legend', 'ngaita'],
];
export const RULES = {
  callGap: 1.0,        // 색 호출 간격(초) — 사용자 “1초에 하나씩”
  chaosGap: 0.5,       // 마지막 판 호출 간격(빠르게 많이)
  callHold: 0.72,      // 호출 때 화면에 색이 켜져 있는 시간(같은 색 연속을 구분하려고 사이를 잠깐 끈다)
  preRoll: 0.1,        // 마지막 호출이 꺼진 뒤 입력 차례까지(거의 바로 — 사용자 “딜레이가 길어서 별로”)
  answerTime: 12.0,    // 입력 제한 시간(초) — 모든 판 동일(사용자; 7 → “5초 더” 12)
  wrongSpeedUp: 1.5,   // 틀린 색을 누를 때마다 철창이 내려가는 속도 배율(누적)
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
  return { stage, chaos, gap, calls, expected, i: 0, next: 0, t: 0, loopT: 0, loops: 0, answerT: 0, limit: RULES.answerTime, speed: 1, wrongs: 0,
    answerAt: (ids.length - 1) * gap + Math.min(RULES.callHold, gap - 0.12) + RULES.preRoll, status: 'calling' };
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
    round.t += dt; round.answerT += dt * round.speed;
    if (round.answerT >= round.limit) { round.answerT = round.limit; round.status = 'timeout'; ev.push({ type: 'timeout' }); }
  }
  return ev;
}

/** 버튼을 누른다. {type:'ignored'|'ok'|'clear'|'wrong', want?, got?, speed?} — 틀려도 판은 계속되고 철창만 빨라진다 */
export function pressRound(round, id) {
  if (round.status !== 'answer') return { type: 'ignored' };
  const want = round.expected[round.i];
  if (id !== want) { round.speed *= RULES.wrongSpeedUp; round.wrongs += 1; return { type: 'wrong', want, got: id, index: round.i, speed: round.speed }; }
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
