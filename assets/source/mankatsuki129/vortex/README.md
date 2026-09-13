# 새 보라 소용돌이

내장 image_gen 신규6프레임 회전 공격. 첫 생성의 어두운 배경을 같은 도구의 배경 편집으로 마젠타로 바꾼 뒤 투명화했다. 원본과 최종 프롬프트를 보관한다.

`processed/pipeline-meta.json`의 rows3/cols2/cell256/fit0.88/shared/center/all 설정으로 분리 경계를 얻고, 기존 `assets/source/captain125/junhee_point/export.py`로 NEAREST 픽셀을 추출했다. `processed/`의 보간 미리보기는 런타임이 아니다. 실제 결과 `strip-transparent.png` → `assets/fx/mankatsuki-vortex.png`(1536×256,6프레임). 크기 성장·진동은 런타임에서 별도로 조절한다.

재현: `uv run assets/source/captain125/junhee_point/export.py assets/source/mankatsuki129/vortex assets/fx/mankatsuki-vortex.png`.
