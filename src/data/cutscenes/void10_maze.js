// ─────────────────────────────────────────────────────────────
// 보라맵10 미로 (사용자 브리핑 2026-09-10, 텍스트 그대로)
//   도착하자마자 카메라가 대각선 아래 출구로 → (브금 꺼짐) → 쥰희 "형 빨리 오샘" → 오른쪽 가장자리 밖(다음 맵)으로 걸어 나가 사라짐 → 경섭 "어 그래 어휴.." → 따라 나감 → (브금 복귀) → 카메라가 주인공에게 돌아온다.
//   포탈 그림은 없다 (사용자: "포탈이라고 해서 진짜 포탈 UI 를 만들라는 건 아니었다"). 두 사람은 서로 떨어져 선다 ("너무 붙어 있다").
//   표지판 5개(막다른 길, 진행 순서): 1 "여기는 외딴섬 여기는 외딴섬" / 2 "아 아직 여기 계시는 군요" / 3 "0/0/0 이에요 저는 당신은? 아 저는 0/32/1 이요." → 나레이션 "뭐라는거지" / 4 "치지직 ... ×3" / 5 "나갈 수 없어 너만큼은 나갈 수 없어."
//   표지판 좌표는 tools/maps/void10.py 가 정한다. 형섭 생각("뭐라는거지")은 보라맵 규칙대로 나레이션.
// ─────────────────────────────────────────────────────────────
import { MAPS } from '../maps.js';
const N = (text, extra = {}) => ({ text, voice: 'narrator', ...extra });
const J = (text, extra = {}) => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text, ...extra });
const G = (text, extra = {}) => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text, ...extra });
const meta = () => MAPS.void10?.meta || { startTile: [1, 1], goalTile: [45, 31], exitX: 1472 };
const OFF = () => meta().exitX + 44;   // 맵(=화면) 오른쪽 끝 너머 — 이어진 바닥('Z') 위로 걸어 화면 밖으로 나간 뒤 사라진다

export const void10_intro = [
  { wait: 0.2 },
  { camera: meta().goalTile, duration: 1.4 },
  { bgm: null, fadeOut: 0.6 },
  { wait: 0.4 },
  J('* 형 빨리 오샘'),
  { move: 'junhee', px: [OFF(), 1032], run: true },   // 오른쪽 가장자리 밖으로 걸어 나가 사라진다(맵을 떠났으니 remove — 충돌도 남기지 않는다)
  { remove: 'junhee' },
  { wait: 0.5 },
  G('* 어 그래 어휴..'),
  { move: 'gyeongsub', px: [OFF(), 1006] },
  { remove: 'gyeongsub' },
  { wait: 0.6 },
  { bgm: 'scarlet' },
  { camera: meta().startTile, duration: 1.2 },
  { camera: 'player' },
];

export const void10_sign1 = [N('* 표지판이다.'), N('* "여기는 외딴섬{w=0.5} 여기는 외딴섬"')];
export const void10_sign2 = [N('* 표지판이다.'), N('* "아 아직 여기 계시는 군요"')];
export const void10_sign3 = [N('* 표지판이다.'), N('* "0/0/0 이에요 저는{w=0.4} 당신은?"'), N('* "아 저는 0/32/1 이요."'), N('* 뭐라는거지')];
export const void10_sign4 = [N('* 표지판이다.'), N('* "{shake}치지직{/shake}{w=0.5} ...{w=0.5} {shake}치지직{/shake}{w=0.5} ...{w=0.5} {shake}치지직{/shake}{w=0.5} ..."')];
export const void10_sign5 = [N('* 표지판이다.'), N('* "나갈 수 없어{w=0.7} 너만큼은 나갈 수 없어."')];
