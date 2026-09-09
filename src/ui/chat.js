// ─────────────────────────────────────────────────────────────
// 방송 채팅창 (트위치 다크 테마 느낌). 게임 화면 오른쪽 세로 패널, 대화창 위까지.
// 물리 해상도(2x)에서 16px 도트 폰트로 그려서 작고 또렷하다.
//   game.chat.start({viewers}) / setMode('late'|'spam'|'idle'|'question'|'silence'|'panic') / post(nick,text) / stop()
//   컷신 노드: { chat:'open' } { chat:'late' } … { chat:'close' }
// 분위기: 디시 음지. 닉네임 100명(사용자 지정 11명 포함).
// ─────────────────────────────────────────────────────────────
import { F } from './font.js';
import { SCREEN_W, RENDER_SCALE } from '../world/world.js';

export const REQUIRED_NICKS = ['야코혁', 'oneq123', '억빠맨', '축복맨', '다이아캣', '나쁘고오만하게살기', '장아문', '쥰희', '박용준', '따뜻한비데', '영상클립'];
const EXTRA_NICKS = [
  'ㅇㅇ', '우이동주민', '반지하감자', '고로시전문', '근첩헌터', '사골곰탕', '에그타르트', '바세린맨', '후추통', '삽들고왔다', '요플래스토커', '지각경찰',
  '일요일기다림', '극락조', '돼지왕', '곰아님', '장발경섭', '빠맨빠', '채팅봇', '야식먹자', '위아픈사람', '방송켜라', '엄준식', '엄', '준', '식',
  '익명1', '익명2', '익명3', '떡밥러', '여론몰이', '비위맞춤', '개돼지1호', '개돼지2호', '고인물', '뉴비임', '눈팅만함', '알람맞춤', '30분기다림',
  '구독취소각', '도네안함', '천원도네', '만원도네', '캡처완료', '녹화중', '클립러', '클립러2', '짤줍', '핫산', '닉네임없음', '무지성', '지각충',
  '용준이형', '비데광인', '다이아독', '야코혁2', 'oneq124', 'oneq125', '축복맨팬', '장아문팬', '쥰희팬클럽', '박용준팬', '따뜻한변기', '영상클립2',
  '보라색', '코드주움', '에러났냐', '컴퓨터고장', '소용돌이', '으아악', '물음표', '???', '뭐냐', '지각변명', '위아팠다고', '거짓말탐지', '방송꺼라',
  '기다린사람', '잠든사람', '깨어난사람', '점심안먹음', '밥상노예', '냉장고요정', '후추뿌림', '싱크대설거지', '거실소파', '벽시계', '달력', '창문밖',
];
export const NICKS = (() => {
  const all = [...REQUIRED_NICKS, ...EXTRA_NICKS];
  const out = []; const seen = new Set();
  for (const n of all) { if (!seen.has(n)) { seen.add(n); out.push(n); } if (out.length >= 100) break; }
  let i = 1; while (out.length < 100) { const n = `익명${i++}`; if (!seen.has(n)) { seen.add(n); out.push(n); } }
  return out;
})();
const COLORS = ['#ff4f4f', '#5b9cff', '#3fd68a', '#f5a524', '#c77dff', '#ff7ab6', '#4dd0e1', '#ffd54f', '#9ccc65', '#ff8a65', '#b39ddb', '#80cbc4'];
const hashColor = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// 쥰희는 어떤 상황이든 이 한 줄만 도배한다 (사용자 지정). 눈에 띄게 자주 등장.
export const JUNHEE_LINE = '우욱 우욱 우욱 이거 빤스아니여';
const JUNHEE_RATE = 0.09;

// 모드별 메시지 풀 (가중치는 중복으로). 엄/준/식 은 모든 모드에 섞인다
const EJS = ['엄', '준', '식', '엄', '준', '식', '엄준식'];
const POOL = {
  late: ['왜 이제 옴', '지각 ㅅㅂ', '30분 기다림', 'ㅋㅋㅋㅋ 늦었네', '또 늦음?', '오늘도 지각이냐', '형섭아 시계 없냐', '요플래 ㅈㄴ 늦네', '방송 켜라고', '기다리다 잠듦',
    '지각 뭐냐', 'ㅈㄴ 오래 기다림', '?', '늦었으면 사과해라', '돈 쏠까 말까', '빨리 시작해', '야 요플래', '구독 끊는다', '위 아팠다고 하겠지 ㅋㅋ', '변명 ㄱㄱ',
    '늦은 이유 말해', '8시 35분 어디감', '지각 ㅋㅋㅋㅋ', '뭐 하다 왔냐', '자다 왔지?', '사과부터', '늦었으면 도네 돌려줘', '아 진짜 ㅋㅋ', '지각왕', '오늘도 늦잠', '알람 안 맞춤?', '방송 켠다더니', '35분에 켠다며', '기다린 사람 손', '요플래 근황', '늦은 만큼 더 해라', '지각비 내라', '시계 봐라', '와 진짜 늦네', ...EJS],
  spam: ['극', '락', '극락', '극', '락', '극', '락', 'ㅋㅋㅋㅋ', 'ㅋㅋㅋㅋㅋㅋ', 'ㅋㅋㅋㅋㅋㅋㅋㅋ', '일요일 ㄹㅇ?', '약속 캡처함', '극락 극락', '구라 아니지?', 'ㅋㅋ 일요일 ㄱㄱ', '극', '락', '극락각', '캡처 완료', 'ㅋㅋㅋ 일요일', '일요일 극락', '극락 확정', 'ㅋㅋㅋㅋ 약속함', '락', '극', '일요일 안 켜면 근첩', '극락각 ㅋㅋ', '박제', '캡처함 ㅋㅋ'],
  idle: ['ㅋㅋ', '오늘 떡밥 뭐임', '빨리 시작', 'ㅇㅇ', '?', '보라색 코드 뭐임', '컴퓨터 코드 색 이상함', '떡밥 ㄱㄱ', 'ㅋㅋㅋ', '떡밥 뭐냐', '빨리 굴려', '오늘 뭐 함', '코드 왜 보라색', '컴퓨터 상태 ㅋㅋ', '방 어둡네', ...EJS],
  question: ['??', '?', '???', '뭐임', '에러?', '뭔 에러', '코드 뭐냐', '보라색 뭐임', '누르지 마', '눌러 ㅋㅋ', '??', '바이러스 아님?', '해결하기 ㅋㅋ', '누르면 어케 됨', '?? 뭐야', '눌러봐', '누르지 마라', '해결하기 ㄱ', '뭔 에러 ㅋㅋ', '컴퓨터 터짐?', '보라색 코드 뭐야', '바이러스다', '누르면 극락', '?? 뭐임', '에러창 ㅋㅋ', '윈도우 뭐냐', ...EJS],
  silence: ['?', '??', '???', '????', '?', '?', '??', '???', '?', '?????', '?', '??', ...EJS, ...EJS],
  panic: ['??', '으아악', '뭐야?', '형섭아', '뭔데 저거', '소용돌이??', 'ㅅㅂ 뭐임', '도망쳐', '화면 뭐냐', '으아악 뭐야?', '?? 뭐야', '뭐야 저거', '컴퓨터 뭐냐', '으아아악', '끄라고', '살려줘', '화면 이상함', '뭐야 뭐야', '컴퓨터 폭발?', '으아아악', '도망가', '나가!!', '저거 뭐임??', '방송 사고', '으악', ...EJS],
};
const INTERVAL = { late: 0.22, spam: 0.07, idle: 0.9, question: 0.14, silence: 0.09, panic: 0.07 };

export class StreamChat {
  constructor() { this.open = false; this.mode = null; this.msgs = []; this.timer = 0; this.viewers = 100; this.time = 0; this.nicks = NICKS; this.posted = 0; }
  start({ viewers = 100 } = {}) { this.open = true; this.viewers = viewers; this.msgs = []; this.mode = null; this.timer = 0; this.time = 0; this.posted = 0; }
  setMode(mode) { this.mode = mode in POOL ? mode : null; this.timer = 0; }
  stop() { this.open = false; this.mode = null; this.msgs = []; }
  post(nick, text) { this.msgs.push({ nick, text, color: hashColor(nick), t: this.time }); if (this.msgs.length > 80) this.msgs.splice(0, this.msgs.length - 80); this.posted++; }
  update(dt) {
    if (!this.open) return;
    this.time += dt;
    if (!this.mode) return;
    this.timer -= dt;
    let guard = 0;
    while (this.timer <= 0 && guard++ < 6) {
      const nick = Math.random() < JUNHEE_RATE ? '쥰희' : pick(this.nicks);
      this.post(nick, nick === '쥰희' ? JUNHEE_LINE : pick(POOL[this.mode]));
      this.timer += INTERVAL[this.mode] * (0.5 + Math.random());
    }
  }
  /** 물리 해상도로 그린다 (ctx 는 setTransform(1,0,0,1,0,0) 상태). bottomLogical: 패널 아랫변(논리 px, 대화창 위) */
  draw(ctx, bottomLogical = 244) {
    if (!this.open) return;
    const S = RENDER_SCALE, W = 150 * S, X = (SCREEN_W - 150) * S, H = bottomLogical * S;
    const font = `16px ${F.family}, "NeoDunggeunmo", monospace`;
    ctx.save();
    ctx.fillStyle = 'rgba(24,24,27,0.94)'; ctx.fillRect(X, 0, W, H);
    ctx.fillStyle = '#3a3a3d'; ctx.fillRect(X, 0, 2, H);
    // 헤더
    ctx.fillStyle = '#1f1f23'; ctx.fillRect(X, 0, W, 34); ctx.fillStyle = '#3a3a3d'; ctx.fillRect(X, 34, W, 1);
    ctx.font = font; ctx.textBaseline = 'top'; ctx.fillStyle = '#efeff1'; ctx.fillText('스트림 채팅', X + 12, 9);
    ctx.fillStyle = '#eb0400'; ctx.beginPath(); ctx.arc(X + W - 52, 17, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#efeff1'; ctx.fillText(String(this.viewers), X + W - 42, 9);
    // 메시지: 아래에서 위로
    const pad = 10, maxW = W - pad * 2, LH = 20;
    const lines = [];
    for (let i = this.msgs.length - 1; i >= 0 && lines.length < 40; i--) {
      const m = this.msgs[i];
      const nick = m.nick + ': ';
      const nickW = ctx.measureText(nick).width;
      // 줄바꿈 (글자 단위)
      const rows = []; let cur = '', curW = nickW;
      for (const ch of m.text) { const w = ctx.measureText(ch).width; if (curW + w > maxW && cur) { rows.push(cur); cur = ch; curW = w; } else { cur += ch; curW += w; } }
      rows.push(cur);
      for (let r = rows.length - 1; r >= 0; r--) lines.push({ text: rows[r], nick: r === 0 ? nick : null, color: m.color, fresh: this.time - m.t < 0.12 });
    }
    ctx.beginPath(); ctx.rect(X, 36, W, H - 36); ctx.clip();
    let y = H - LH - 6;
    for (const ln of lines) {
      if (y < 36) break;
      let x = X + pad;
      if (ln.fresh) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(X, y - 2, W, LH); }
      if (ln.nick) { ctx.fillStyle = ln.color; ctx.fillText(ln.nick, x, y); x += ctx.measureText(ln.nick).width; }
      ctx.fillStyle = '#efeff1'; ctx.fillText(ln.text, x, y);
      y -= LH;
    }
    ctx.restore();
  }
}
