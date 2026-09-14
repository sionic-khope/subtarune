# OG 4방향 걷기 후보

기존 뚱뚱한 군복 캐릭터의 좌우8장을 보존하고 위아래8장을 추가했다. 전투·게임 등록은 포함하지 않는다.

- 최종 파일: [시트](final/sheet-transparent.png), [확대](final/preview-4x.png), [재생 계약](runtime-contract.json).
- 256×256,64px셀, 행 down/up/left/right, 행당4프레임. 공통 피벗32,60, NEAREST.
- [앞](final/down.gif), [뒤](final/up.gif), [왼쪽](final/left.gif), [오른쪽](final/right.gif): 프레임당150ms,600ms 반복. 방향별 정지 인덱스는 계약을 따른다.
- 원본은 updown-attempt-1/raw.png, 수정 원본은 updown-step-fix-small/raw.png. 프롬프트는 prompt-updown.txt와 prompt-opposite-step.txt. 재현은 export.py.
- 새 방향의 첫3열은 최초 원본, 마지막 열은 반대발 교정본이다. 좌우 픽셀은 이전 pixel-final과 RGBA 완전 동일하다.

## 검수와 제한

[독립 검수](asset-review.md): 실제16셀 비어 있음/잘림0, 이진 알파, GIF4프레임×150ms, 좌우 보존 통과. 주 작업자도 최종 시트와 브라우저의 앞뒤 GIF를 확인했다. 단, 앞 마지막 프레임 얼굴·너비 변화와 일부 자홍색 잔여가 있어 시각적으로 완전 승인된 자산은 아니다. 기존 좌우는2종 주요 자세 반복이며4개의 완전히 독립적인 보행 단계라고 부르지 않는다. 게임 엔진 적용이나 사용자 승인은 별도다.

## 비용

이번 위아래 생성과 반대발 교정 성공2회는 실제 응답 토큰×기록된 공개단가로 $0.097054 계산. HTTP413 한 번은 청구 여부 미확인이다. [전체 비용](../../../docs/handoffs/og-cost-20260914.json)은 기존 좌우/체형 수정/타일까지 합산한다. 실청구액으로 확정하지 않는다.

## 게임 등록 (2026-09-14, 코딩 담당)

- 사용자 명명: **나람이** (`src/data/characters.js` id `naram`). 스튜디오 `og-four-direction-20260914/final/sheet-transparent.png`를 바이트 그대로 `assets/sprites/naram.png`로 복사했다(256×256, 64px 셀, down/up/left/right, pivot 32,60, 이진 알파).
- 이 폴더는 스튜디오 패키지 사본(README·runtime-contract.json·export.py·asset-review.md·프롬프트 2종·final/). 1.4MB raw(`updown-attempt-1/raw.png`)와 `standard/` 중간본은 스튜디오에만 남긴다.
- 음색 `naram`은 임시 합성(`src/core/audio.js`)이며 사용자가 원음을 고르면 파일로 교체한다. 맵 배치·대사·전투는 아직 없다. 정지 프레임: 앞뒤 0, 좌우는 엔진 기본(0)과 계약(1)이 다르므로 배치 시 `sideWalk`/정지 프레임을 실제 화면으로 확인한다.
