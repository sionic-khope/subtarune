# 영클 책 개그·공장 배경 143

TV 최종 원본은 내장 생성기 `exec-ed257363-01d8-4ab7-87e8-8da6e927544c.png`의 `raw-characters.png`다. read/shock/hide 세 포즈와 책의 흰색 `19`를 그대로 사용한다. 하트가 있던 이전 원본은 `raw-character-draft1.png`로 보존했다. 공장 원본은 `exec-c255c43e-cf74-4a38-b1cb-291e4119a4e8.png`의 `raw-factory.png`다.

```sh
uv run assets/source/youngcle143/export.py
uv run assets/source/youngcle143/export.py --check
```

옵션 없는 명령은 다음 파일과 재현 자료를 만든다. `--check`는 예상 이미지와 메타데이터를 메모리에서 계산하여 디스크 파일과 비교하고, 어떤 파일도 쓰지 않는다. 누락·픽셀·메타데이터 불일치는 종료 코드가0이 아니다.

- `assets/illustrations/youngcle-tv-{read,shock,hide}.png`: RGB258×119. 기존 `../youngcle142/background-native.png`를 그대로 사용하며 전경 바깥 모든 픽셀이 해당 배경과 같음을 검사한다. 책·손·노란 표시를 모두 포함한다.
- `assets/portraits/youngcle_tv_{read,shock,hide}.png`:96×96 흑백 RGBA. 같은 원본 얼굴을48×48 논리 캔버스에 놓고 기존 밝기0.38·흰 외곽 규칙을 적용한 다음 정수2배로 확대한다.
- `assets/backdrops/youngcle_factory.png`: RGB480×720. 원본1024×1536 전체를 NEAREST240×360으로 축소한 뒤 정수2배로 확대했다.

TV 원본2172×724는 RGB이며 체크 무늬가 실제로 구워져 있었다. 이미지 바깥에 연결된 중성색 픽셀(RGB 차이≤40, 최솟값≥35)만 투명화해961,350픽셀을 제거했다. 검정 외곽선으로 둘러싸인 눈·치아·책 종이·숫자19의 흰색은 보존했다. 캐릭터를 다시 그리거나 색을 바꾸지 않는다.

세 포즈의 원본 열은 x=[0,675,1360,2172]에서 나눈다. 균등724셀 분할은 hide의 왼팔을 자르므로 빈 여백에서 자른 것이다. 모든 포즈에 공통 배율0.09316770186335403을 적용해128×64 논리 전경을 만들고, 머리 중심 x64·그림 밑변 y62에 맞춘다. 그 뒤 NEAREST238×119로 확대해 TV의(10,0)에 배치한다. `tv-preview.png`, `cutout-preview.png`, `portraits-preview.png`에서 최종19·얼굴·책·손 포함을 확인했다.

제공된 generate2dsprite 처리기로 `characters-qc-grid.png`를 별도 검사했다. 정리된 알파 원본의 유색 책과 숫자를 건드리지 않도록 `--threshold 0 --edge-threshold 0 --trim-border 0 --edge-clean-depth 0 --component-mode all --rows 1 --cols 3 --strict-qc`를 사용했다. 이 정지 포즈 묶음은 애니메이션 원본이 아니다. `processor-qc/pipeline-meta.json`에서3/3 유효·빈 프레임0·경계 접촉0·강제 위치 제한0을 확인할 수 있다. 처리기의 중간 LANCZOS 이미지는 런타임에 쓰지 않는다.

`export-meta.json`에 입력·배율·범위·공통 배경 해시를 기록했다. `readonly-check-proof.json`은 읽기 전용 통과, 격리된 잘못된 장면 거부, 잘못된 메타데이터 거부, 복원 후 통과를 기록한다. Ruff·BasedPyright·Python 규칙 검사도 통과했다. 기존142 배경, 이전 표정과 게임 코드는 이 처리기가 수정하지 않는다.
