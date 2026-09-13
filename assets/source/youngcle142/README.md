# 영클 TV 공통 배경 142

승인된 캐릭터는 `../youngcle140/logical-<표정>.png`의 RGB와 좌표를 그대로 사용한다. 새 그림 생성은 인물 없는 빈 방 배경 한 장뿐이며, 내장 생성 원본 `exec-6967b4d3-1a97-4d96-8b39-1a4e40804b2a.png`를 `raw-background.png`로 보존했다. 초상화와 게임 코드는 바꾸지 않았다.

```sh
uv run assets/source/youngcle142/export.py
uv run assets/source/youngcle142/export.py --check
```

`--check`는 원본으로 예상9장을 메모리에서 계산해 현재 런타임 PNG의 RGBA 픽셀과 비교한다. 이미지·미리보기·메타데이터를 포함해 어떤 파일도 쓰지 않으며, 누락·손상·픽셀 불일치 시 종료 코드가0이 아니다. 옵션 없는 명령만 파일을 다시 내보낸다.

읽기 전용 회귀 검증은 `readonly-check-proof.json`에 기록했다. 현재9장 통과→격리된 복사본에140 버전 laugh 배경 주입 시 실패→격리 파일 복원 후 통과를 확인했다. 검사 전후 파일 목록·내용 SHA-256·수정 시각이 같았다. 실제 게임 PNG는 이 시험 중 바꾸지 않았다.

이 명령은 피부·머리카락·흰색·청록 셔츠·녹색 표식으로 전경을 찾고, 인접한 검정 윤곽과 내부 눈 글자를 함께 보존한다. 원래의 남색·파란 방과 파란 제스처 효과는 제외한다. 마스크는 RGB 변경이나 인물 재생성을 하지 않는다. `foreground-<표정>.png`와 `mask-preview.png`에서 전경을 확인할 수 있다.

새 배경 한 장을 NEAREST128×64로 변환하고, 같은 좌표의 원래 캐릭터 픽셀을 그 위에 복사한다. 최종 파일은 기존과 같은 RGB258×119, 내용238×119·좌상단(10,0)이며 확대는 NEAREST만 사용한다. 출력은 `assets/illustrations/youngcle-tv-{smirk,laugh,greet,oh,taunt,shrug,bye,yes,surprise}.png`다.

`qc-meta.json`에 아홉 표정 각각의 전경 픽셀 수와 검증 결과를 기록한다. 전경의 RGB·좌표가140 원본과 일치하고, 각 전경 바깥 픽셀이 공통 배경과 일치함을 검사한다. 전경9개의 합집합 바깥15,831픽셀도 모든 출력에서 정확히 같다. `foreground-mask-atlas.png`는 같은 순서3×3 마스크, `background-logical.png`·`background-native.png`는 공통 배경, `fixed-background-preview.png`는 최종9장 비교본이다. 마스크와 최종 비교본을 직접 확인했고, 재현 스크립트의 타입·린트 검사도 통과했다.
