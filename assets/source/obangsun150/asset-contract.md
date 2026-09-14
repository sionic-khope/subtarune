# 오방순 얼굴 강화150

사용자 요청: 사진처럼 얼굴을 더 살벌하게. 내장 이미지 생성으로 만든 검정·붉은 날개형 눈화장, 좁고 날카로운 눈, 검은 입술을 기존149 이동 시트의 노출된 얼굴 안쪽에만 합성했다. 몸·장식·머리카락·후면을 새 이미지로 교체하지 않았다.

`obangsun.png`는256×256 RGBA,64×64셀,4방향×4프레임이다. 행은 down/up/left/right, 발 기준점은(32,61)이며149 규격을 유지한다. 전투·음성·게임 등록·배치 변경은 이 패키지에 없다.

## 출처와 재현

- 사용자 사진: 스튜디오 `assets/references/obangsun149/original.png`, 게임 소스 패키지에는 `reference-original.png`로 복사했다.
- 기존 시트:149의 `obangsun.png` 사본인 `original-sheet.png`.
- 새 생성 원본:`raw-face-edit.png`(1254×1254), 내장 image_gen 결과. 최종 생성 요청은 `prompt-used.txt`.
- `compose-face.py`: 생성 원본 전체를 한 번에256×256 NEAREST축소한 후, 기존 얼굴의 피부색 영역에서 얻은 내부 마스크에만 새 RGB를 합성한다. 마스크는`face-mask.png`, 축소 중간본은`aligned-face-edit.png`다. 알파는 기존 시트에서 보존한다. 마스크는 편집 범위를 지정하는 기하 처리이며 새 캐릭터를 코드로 그리지 않는다.
- 재현:`uv run output/sprites/obangsun150/compose-face.py`(스튜디오 루트 기준). 다른 위치에서도 스크립트 파일의 자체 폴더를 기준으로 실행한다.
- `before-after.png`:왼쪽149 / 오른쪽150, 각4배 NEAREST.
- `preview.png`:최종4배 NEAREST.
- 방향별16 PNG와4 GIF/strip을 함께 제공한다. GIF는160ms/프레임이다.

## 검증

`qc.json`:16프레임, 빈 프레임0, 셀경계 접촉0. 변경 RGB픽셀은2,846개이며 얼굴 마스크 바깥 변경0개다. 알파 전체와 후면4프레임은 바이트 단위로 동일하다. 정면4장과 양옆8장에만 변경이 있다. 기존149 소스 패키지는 수정하지 않았다. 인게임 재생·배포 검증은 포함하지 않는다.
