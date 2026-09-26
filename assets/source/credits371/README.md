# credits371 — 엔딩 크레딧 사진 칸 삽화 11장 (그림풍)

- 모델: `openai/gpt-image-2.5-sunburst`, `--quality high`, `1024x1536`, `images/edits` 참조 1장(실행기가 첫 `--ref`만 보냄).
- 공통 스타일·정체성 규칙: `prompts/_style.txt` (각 `prompts/photoNN.txt` 앞부분에 그대로 포함).
- 참조: `refs/refNN.png` — 스프라이트 셀(NEAREST 확대, 마젠타 제거)과 장소 스크린샷을 흰 바탕에 라벨과 함께 가로로 붙인 시트. 재생성: `./build-refs.sh` (`sheet.py`).
- 생성: `./gen.sh NN [접미사]` → `photoNN-raw<접미사>.png`, 로그 `logs/`, 실행기가 남긴 `*-raw*.prompt.txt`/`*.meta.json`.
- 최종: `uv run --with pillow python assets/source/credits371/finalize.py` → `assets/credits/photoNN.png`(400×600, LANCZOS, optimize) + `all.png`.

| # | 장면 | 프롬프트 | 참조 | 채택 raw |
|---|---|---|---|---|
| 01 | 요플래가 보라맵 물길에서 뗏목 타고 억빠맨 구하러 감 | prompts/photo01.txt | refs/ref01.png | photo01-raw.png |
| 02 | 미니언(레드/블루) 조우, 셋이 빨간 공구상자에서 허겁지겁 무기 꺼냄 | prompts/photo02.txt | refs/ref02.png | photo02-raw.png |
| 03 | 쥰희·용준이 나무 발명품(투석기) 만들며 낄낄 | prompts/photo03.txt | refs/ref03.png | photo03-rawb.png (1차는 웃음이 약해 반려) |
| 04 | 바론에 납치된 박용준, 뒤에서 놀라 쫓는 요플래·경섭·억빠맨 | prompts/photo04.txt | refs/ref04.png | photo04-raw.png |
| 05 | 마이야르 전함(돼지 모양 목조선) 위의 쥰희 | prompts/photo05.txt | refs/ref05.png | photo05-raw.png |
| 06 | 엄청대박인배 조종실 안의 편집노조(비데·파크가디언·뚜울라·도트마리오) | prompts/photo06.txt | refs/ref06b.png | photo06-rawf.png |
| 07 | 인형탈 벗겨진 파크가디언을 놀리는 쥰희·영클, 비데·도트마리오 | prompts/photo07.txt | refs/ref07.png | photo07-raw.png |
| 08 | 짜장숲 드럼통 둥지: 드럼통의 악마 — 웃는 청소부 — 요플래 | prompts/photo08.txt | refs/ref08.png | photo08-raw.png |
| 09 | 벚꽃 숲에서 디스코드 가면 최미스의 이상한 짓을 숨어서 구경 | prompts/photo09.txt | refs/ref09.png | photo09-raw.png |
| 10 | 성 결전지에서 떠 있는 가재맨과 일행(요플래·경섭·억빠맨·쥰희·영클) 대치 | prompts/photo10.txt | refs/ref10.png | photo10-raw.png |
| 11 | 노을 해 쪽으로 걸어가는 뒷모습: 경섭이 김형섭을 업음, 억빠맨·영클 | prompts/photo11.txt | refs/ref11.png | photo11-raw.png |

## 이력
- 06: 뚜울라 스프라이트가 들어간 참조(ref06, ref06c)는 프롬프트와 무관하게 `moderation_blocked`(4회). 뚜울라를 뺀 `ref06b` + 글 묘사로 통과. `photo06-rawe`는 창밖에 전함 외부가 보여 "안"이 흐려져 반려, 현창 문장 추가한 `rawf` 채택.
- 모든 최종본은 Read 로 확인: 요플래 입 없음·둥근 안경, 억빠맨 파란 곰, 쥰희 분홍 돼지, 글자·워터마크 없음.
