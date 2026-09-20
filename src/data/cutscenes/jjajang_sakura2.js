// 벚꽃 숲 2(jjajang_sakura2, BUILD264 사용자 브리핑 2026-09-20, 원문 design/narrative/cutscenes/jjajang_sakura2.md)
//   위로 올라가기 전 오른쪽 샛길 끝(길이 끊긴 곳) 트리거 → 브금 유지 → 카메라가 오른쪽으로 그리드(칸) 단위로 이동 → 벚꽃다리 위 가면 쓴 최미스·가순이 셋
//   최미스: 허허 스읍 미스 ㅋㅋㅋㅋ / 가순이1: 떙땡이오빠 미용실 어디다녀요? / 최미스: 아 ㅋㅋ 전 뭐 인스타에서 연락오고 막.. 저인거  알아보던데 / 최미스: 스읍 ㅋㅋㅋㅋㅋ
//   → 카메라 다시 주인공 → 억빠맨: 좆같네씨발 → 끝(플래그 sakura2_bridge_done)
import { loopCharacterMotion } from '../../world/character-motion.js';
const C = text => ({ speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: `* ${text}` });
const G1 = text => ({ speaker: '가순이1', portrait: 'gasuni1', voice: 'gasuni', text: `* ${text}` });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
export const BRIDGE_VIEW = [36, 9];     // 카메라 목표(칸): 벚꽃다리 가운데(30~42열, 8~11행)
export const CAM = { toBridge: 1.4, back: 0.9 };   // 오른쪽으로 그리드 이동 시간 / 주인공에게 돌아오는 시간
export const SAKURA2_BRIDGE_FLAG = 'sakura2_bridge_done';

export const jjajang_sakura2_bridge = [
  { face: 'player', dir: 'right' },
  // 다리 위 배우(hidden)를 보이게 하고 최미스는 가면 쓴 자세로 — 카메라가 닿기 전에
  { show: 'choimis' }, { show: 'gasuni1' }, { show: 'gasuni2' }, { show: 'gasuni3' },
  { action: game => { const c = game.entities.find(e => e.id === 'choimis'); if (c) loopCharacterMotion(c, game.characterMotions.choimis?.masked); } },
  // (카메라가 오른쪽으로 그리드로 움직임 — 길이 끊겨 있고 그 너머 벚꽃다리)
  { camera: BRIDGE_VIEW, duration: CAM.toBridge },
  { wait: 0.3 },
  C('허허 스읍 미스 ㅋㅋㅋㅋ'),
  G1('떙땡이오빠 미용실 어디다녀요?'),
  C('아 ㅋㅋ 전 뭐 인스타에서 연락오고 막.. 저인거  알아보던데'),
  C('스읍 ㅋㅋㅋㅋㅋ'),
  close,
  // (그리고 카메라 다시 주인공쪽으로 옴) — camera:'player' 는 대화 중 lerp 0.05 로 미끄러져 돌아온다
  { camera: 'player' },
  { wait: CAM.back },
  P('좆같네씨발'),
  close,
  { set: { [SAKURA2_BRIDGE_FLAG]: true } },
  { camera: 'player' },
];
