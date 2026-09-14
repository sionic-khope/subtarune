# 편집노조 스테이지153 시각 자산

원본은 모두 내장 imagegen으로 생성한 PNG다. `source-contract.json`은 원본 파일 식별자와 결정론적 후처리 계약을 기록한다. 정확한 생성 프롬프트는 부모 작업자가 별도로 기록한다. 기존 이동 시트·캐릭터 색·게임 음성은 이 패키지에서 변경하지 않는다.

| 런타임 파일 | 규격 | 계약 |
| --- | --- | --- |
| `assets/sprites/park-guardian-bow.png` | 256×512, 128셀, 2열×4행 | v2 8프레임, pivot64/119, scale27/60, 각0.18초, 총1.44초 |
| `assets/sprites/warm-bidet-axe-strike.png` | 256×256, 128셀, 2열×2행 | 4프레임, pivot64/119, scale0.96, 0.22/0.18/0.38/0.24초 |
| `assets/sprites/ttuulla-burrow.png` | 256×256, 128셀, 2열×2행 | 4프레임, pivot64/119, scale26.5/75, 0.24/0.20/0.20/0.22초 |
| `assets/props/editor-union-glyphs.png` | 256×64 | 왼쪽부터 편/집/노/조, 64셀. 노 모자이크는 컷신에서 적용 |
| `assets/props/editor-union-mushroom.png` | 24×24 | 투명 버섯 단일 소품 |
| `assets/props/editor_union_audience.png` | 672×176 | v2 빈 청색 철벽 관중석, 알파64이상 bounds30/145/2064/620를 최근접축소 |
| `assets/props/editor-union-crowd.png` | 256×256, 64셀, 4열×4행 | v2 서로 다른 관중16명 상반신, 투명 분리 그림 |

모션 scale은 엔진의 `CHAR_SCALE=1.43`와 NPC visualScale에 추가로 곱해진다. 최신 Park2.66/Bidet1/Ttuulla1.79 기준 중립 포즈 높이는 약102.7/93.3/67.8월드px다. Park의 사용자 요청20%전체확대는 맵visualScale2.66만 적용하며 모션에서 중복하지 않는다. 숙임·공중·웅크림 프레임은 자연스러운 높이 차이를 유지하고 프레임별 배율은 사용하지 않는다.

## 처리와 QC

- 스킬 제공 `generate2dsprite.py process`의 `preserve`·`feet`·`largest`를 몸체3종에 사용했다. 공통128셀, fit0.85, 공유배율, NEAREST다.
- 최신 bow는 `bow-v2/final/`이다. strict QC8프레임 정상, source/output edge0, clamp0, 몸체CV0.06470, 세로앵커표준편차0.004234. `bow-v2/reanchor.py`는 공통 발기준 이동만 수행한다. axe/burrow는 source/output edge0·clamp0이며 공중·웅크림 높이 변화를 정규화하지 않는다.
- 과거 v1 `bow/final/`6프레임과 관중이 포함된 `audience/`그림은 제작 이력으로 보존한다. v1의 원본재분리·QC 계약은 해당 하위파일에 남아 있으며 최신 런타임으로 배포하지 않는다.
- 관중은 `crowd-v2/final/`16상반신을 별도로 배치한다. 빈 관중석은 움직이지 않고 인물만 움직일 수 있다. 밝은 난간줄은 y63..65/102..104/146..148이며 인물 밑동을 난간 앞면으로 덮는 레이어 계약은 `crowd-v2/README.md`에 있다.
- 최초 글자팩의 마지막 글자는 `즈`로 잘못 생성되었다. `glyph-jo/original-raw.png`로 마지막 셀만 교체했다. 세 글자 원본과 잘못된 초기 셀은 제작 이력으로 보존한다.
- 런타임7개 PNG 모두 RGBA, 알파최솟값0/최댓값255다. 모든 처리 시트와 소품을 실제 이미지로 열어 잘림·글자·배경키를 확인했다.
- `node --check src/data/character-motions.js` 성공, character-motion/character-runtime-assets 단위5개 통과. 실제 컷신 재생·카메라·런타임 모션 연결 검증은 부모 통합 QA에서 수행한다.

`assemble.py`는 v1 제작 이력이며 최신v2배포용으로 실행하지 않는다. 최신 bow-v2와 crowd-v2의 하위 재현 기록을 따른다. 모든 스크립트는 저장된 생성 PNG 재배치·복사만 하고 원본을 그리지 않는다. 스킬 처리기 버전 경로는 `/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py`다.
