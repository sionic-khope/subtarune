# 러너 장애물 (run-obstacles-v1, BUILD236, 2026-09-19)

사용자 브리핑: "중간중간 달리면서 나뭇잎 같은 게 떨어지거나 날아오거나 나뭇가지가 따라오는데 공격으로 하면 효과음과 함께 쳐낼 수 있고 만약 못 쳐내면 피가 10 깎이는 거", "쳐낼 때 효과음 델타룬에서 쓰이는 거".

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, 1024×1024 2×2 셀(`obstacles.prompt.txt`, 전송본 `obstacles-raw.prompt.txt`, `obstacles-raw.meta.json`, `gen.log`). raw 1회 채택: 솔잎 잎·넓은 잎·부러진 가지·솔잎 다발.
- export(이 README 아래 스크립트와 같은 절차): 마젠타 색키 → 셀 bbox → 폭 기준 NEAREST 축소 → `assets/props/run_leaf_1.png`(22px), `run_leaf_2.png`(22px), `run_branch.png`(64px), `run_needles.png`(16px). 크기는 `runtime-contract.json`.
- 소리 `audio/`: 델타룬 디컴파일 `sounds/snd_hit`(쳐냄 → `assets/audio/sfx/deflect.mp3`), `snd_damage`(맞음 → `hurt_dr.mp3`), `snd_graze`·`snd_bump` 는 보관만.
