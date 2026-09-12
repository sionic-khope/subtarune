// ─────────────────────────────────────────────────────────────
// 이펙트 애니 레지스트리 (2026-09-12). 컷신 `{ boom: {…} }` 에 넣을 프레임 띠 설정을 **한 곳에서** 관리한다.
//   쓰는 법:  { boom: { ...FX.explosion, at: '<대상id>', scale: 2, offset: [0, -8] } }
//            여러 발이면 { async: [{ wait: 0.07 }, { boom: { ...FX.explosion, at: …, scale: 1.25 } }] }
//   새로 추가: ① 영상에서 띠를 뽑고(tools/art/video_to_strip.py — 출력이 cols/count/fps 를 찍어 준다)
//             ② 여기 한 줄, ③ 그 연출이 도는 맵 JSON 의 `preload` 에 sheet 경로(생성기에), ④ 소리는 `sfx` 에 이름(main.js loadSfxFiles + design/audio/references.md)
//   tests/unit/fx.test.mjs 가 파일 존재·칸 수·소리 이름을 검사한다.
// ─────────────────────────────────────────────────────────────
export const FX = {
  /** 폭발 — 사용자 지정 영상 `deltarune explosion greenscreen`(youtube o84vJH19toI) 에서 누끼(31프레임 85×128)와 오디오를 같이 딴 것.
   *  쓰인 곳: 청록숲2 쥰희 동상 벽(teal3_toolbox.js). 재생성은 design/audio/references.md 의 '동상 벽 폭발' 줄 참고 */
  explosion: { sheet: 'assets/fx/explosion.png', cols: 31, rows: 1, count: 31, fps: 20, sfx: 'explosion' },
};

/** 맵 생성기(파이썬)에서도 쓰라고 경로만 모아 둔다 — 그 연출이 도는 맵의 preload 에 넣는다 */
export const FX_SHEETS = Object.values(FX).map((f) => f.sheet);
