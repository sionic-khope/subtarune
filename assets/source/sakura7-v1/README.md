# 벚꽃 숲 7 자산 (BUILD278, 2026-09-20~21)

생성은 전부 `openai/gpt-image-2.5-sunburst`(`tools/sprites/imagegen.py generate --quality high`), 가공은 `export.py`(색키·연결 성분·축소·자르기만).

- `gasuni1-ref.png`: 가순이1 런타임 시트를 마젠타에 얹어 2배(참조, 게임 자산 아님). `sakura-ground-ref.png`: 벚꽃 숲 6 광장 스크린샷(무대 그림의 픽셀 밀도·땅 톤 참조).
- `jeomnye-walk-raw.png`(`jeomnye-walk.prompt.txt`, 참조 = gasuni1-ref): 가순이1 시트를 그대로 다시 그려 흰 드레스·면사포만(뒷모습 행은 면사포) → `assets/sprites/jeomnye.png`(512×512, 128 칸, 발 y=120, 정면 키 82 = 가순이1) + `assets/portraits/jeomnye.png`(정면 얼굴 96, 사쿠라5 초상화와 같은 자르기).
- `stage-raw.png`(`stage.prompt.txt`, 1536×1024, 참조 = sakura-ground-ref): 야외 결혼식 나무 무대(판자 바닥·앞면·가운데 계단·양끝 꽃 기둥) → `assets/props/wedding_stage.png`(384×197). 판자 윗면은 그림 y 89~167(맵 생성기 STAGE_FLOOR).
- `throwables-raw.png`(`throwables.prompt.txt`): 토마토·계란·쓰레기 뭉치·사과 심 2×2 → `assets/props/throw_{tomato,egg,paper,apple}.png`(폭 12~16). 관객 자리에 숨겨 두고 난동 때 무대로 날린다.
- `crowd-ooh-raw.mp3` + `crowd-ooh.meta.txt`: 사용자 지정 myinstants “Crowd Ooh (Deltarune)” → `assets/audio/sfx/crowd_ooh.mp3`(loudnorm I=-16).
- `runtime-contract.json`: export 결과(배율·칸 크기).
- (BUILD279) `splat-raw.png`(`splat.prompt.txt`): 토마토·계란 얼룩(위 두 칸) + 과즙 튐(아래 두 칸) → `export_splat.py` → `assets/props/splat_tomato.png`·`splat_egg.png`(폭 30), `assets/fx/tomato_burst.png`·`egg_burst.png`(폭 72, 한 장 — boom 노드로 커지며 튐). `crowd-boo-raw.webm` + `crowd-boo.meta.txt`: 야유 녹음 → `assets/audio/sfx/crowd_boo.mp3`.
