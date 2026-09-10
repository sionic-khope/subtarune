// ─────────────────────────────────────────────────────────────
// 컷신 공용 헬퍼 (어느 컷신 파일에서든 import 해서 쓴다)
//   import { rapid } from './helpers.js';
// ─────────────────────────────────────────────────────────────

/**
 * 갈수록 빨라지는 연속 상자 (개그 의성어 등). 브리핑 "같은 대사 여러 개가 ㅈㄴ 빠르게 넘어감 / 갈수록 더 빨라지게".
 *   rapid(['펑', '쾅', …], (text, extra) => P(text, extra))
 *   → [{...auto:0.34,speed:3}, …, {...auto:0.05,speed:9}]  (첫 상자 from 초 → 마지막 to 초, 글자 속도 speedFrom → speedTo 배)
 * @param {string[]} texts 상자마다 한 줄 ('* ' 는 자동으로 붙는다)
 * @param {(text:string, extra:object)=>object} line 화자별 줄 팩토리 (예 void4_ppaman.js 의 P)
 * @param {{from?:number,to?:number,speedFrom?:number,speedTo?:number}} [opt]
 */
export function rapid(texts, line, { from = 0.34, to = 0.05, speedFrom = 3, speedTo = 9 } = {}) {
  const n = texts.length;
  return texts.map((text, i) => {
    const u = n > 1 ? i / (n - 1) : 1;
    return line(`* ${text}`, { auto: +(from + (to - from) * u).toFixed(3), speed: Math.round(speedFrom + (speedTo - speedFrom) * u) });
  });
}
