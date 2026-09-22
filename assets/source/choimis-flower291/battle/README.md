# 최미스 플라워리 전투 대기 자산

`assets/enemies/choimis-flower-idle.png`:256×256 RGBA,128셀2×2,행우선0→1→2→3반복,프레임시간[0.3,0.22,0.3,0.3]초,피벗(64,120). 왼쪽아래3/4방향으로한손을머리쪽에올리고다른손을허리에댄자세,두번째프레임에서손을펴보이는몸짓이다. 새전투조우/공격/피격을구현한것은아니다. 대표프레임은`battle-neutral.png`.

공급자Codex내장imagegen,모델/seed/요금unknown. 원본`exec-df293db9-46e6-4e93-aeb2-77d1b43143fe.png`는수정하지않고`raw-sheet.png`에보존했다. 실제프롬프트`prompt-used.txt`. 얼굴·흰머리·안경·긴코·이빨·분홍GAP정체성과가늘어진몸을유지한다.

1254원본의alpha128이진화,627셀분할,전체색키없음. 표준처리기preserve-scale기하를사용해공통배율0.20006379585326953으로NEAREST샘플링했다. 하단발픽셀중심을x64,실제신발바닥을y120에정렬했다. 프레임별신체확대/축소·얼굴합성·의상그림수정없음. 원본에서생긴새포즈와코드후처리를구별한다.

4프레임전체를밝은배경`preview-4x.png`에서확인했다. 비어있는셀0,원본/출력경계접촉0,clamp0,신체CV0.01359,전신높이102–103px로이동99–104px와같은범위다. `idle.gif`는지정시간미리보기,`qc-meta.json`은검사수치와최종피벗·시간원본이다. 런타임등록과실제전투화면검수는통합담당범위다.

재현: `uv run assets/source/choimis-flower291/battle/export.py tools/sprites/sheet_processor.py`.

SHA256:runtime`c5aa440c73426c0f323be3d248b7b57810671072ac6ee57c90ffb7360af96fc8`,raw`2a382cb1333ad3def9441c4ffdbd8d8ed5b42930c72afc042433fd8abdc893c4`.
