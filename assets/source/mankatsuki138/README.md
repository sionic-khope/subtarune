# 만카츠키 속옷 투사체 138

내장 이미지 생성기 `exec-366dd06f-55b7-480f-95f7-224da83f5197.png`를 `raw-underpants.png`로 보존했다. 원본의 흰 속옷·남색 윤곽·회청색 주름과 형태를 그대로 사용한다.

최종 `assets/projectiles/mankatsuki-underpants.png`는 투명 32×32. 정확한 알파 범위 `[2,6,30,26]`, 그림 28×20, 중심 `[16,16]`이다. 목표 28×22 영역 안에 원본 비율을 유지해 들어간다.

```sh
SPRITE_PROCESSOR=/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py
uv run --with pillow --with numpy "$SPRITE_PROCESSOR" process --input assets/source/mankatsuki138/raw-underpants.png --target asset --mode single --rows 1 --cols 1 --cell-size 32 --fit-scale 0.875 --align center --shared-scale --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc --output-dir assets/source/mankatsuki138/processed
uv run assets/source/youngcle138/export.py
```

원본은 이미 투명 배경이다. 외곽의 거의 보이지 않는 알파 점들이 자동 bbox를 넓히므로 알파128 이상 영역에 원본2px 여백을 포함한 `[146,317,1108,989]`를 최종 자르기 영역으로 사용한다. 영역 안 원본 RGB·알파는 변경하지 않고 공통 비율0.029106029106029108로 NEAREST 축소한다. 중간 LANCZOS 결과·색상 평균·PNG 팔레트 양자화·재그림은 사용하지 않는다.

`processed/pipeline-meta.json`은 제공된 처리기 QC, `export-meta.json`은 최종 범위와 배율이다. `underpants-preview.png`는 확인용 최근접8배 확대본이다. 최종 그림은 비어 있지 않고 32×32 경계를 건드리지 않는다.
