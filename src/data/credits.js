/**
 * BUILD370 엔딩 크레딧(사용자 2026-09-26): 라운지 문이 닫히고 3.5초 뒤 페이드 없이 곡(_BEWbq64zyU)과 함께 곧바로 검은 화면에 섭타룬 로고 → 크레딧이 왼쪽에서 올라간다
 * (오른쪽은 사진 자리 — photos 에 그림 경로를 넣으면 스크롤 동안 고르게 한 장씩 나타났다 사라진다, photo 가 자리·크기) → 마지막에 로고가 다시 올라오고 아래에 The End 가 천천히.
 * 담당은 사용자 지정 “행복맨”(이름 중복 괜찮음). 등장인물·몬스터·Special Thanks 는 이름만(BUILD371 사용자 “행복맨 안 붙여도 돼”) — 게임에서 보이는 표시 이름.
 */
const ME = '행복맨';
const role = (title, ...lines) => ({ title, lines: lines.length ? lines : [ME] });
const cast = (title, names) => ({ title, lines: names });

export const CREDITS = Object.freeze({
  bgm: 'ending_credits', delay: 3.5,
  intro: 4.0, outro: 14.0,
  column: { x: 36, width: 220, title: 11, name: 14, gap: 30, line: 20 },
  // 오른쪽 사진(그림풍 일러스트 assets/credits/photoNN.png): 크레딧 스크롤 시간에 고르게 한 장씩. 가운데 (x, y), 최대 w×h, 액자 테두리, drift px/초(0 = 제자리)
  // drift 0: 느린 이동을 정수 픽셀로 찍으면 그림이 버벅여 보였다(사용자 BUILD372) — 제자리에서 페이드만
  //   gap: 사진과 사진 사이 빈 시간(BUILD378 “간격 더”), lead: 첫 사진까지 기다림(“첫 사진도 텀 더”)
  //   wideX/wideW: 가로 그림(키 아트 등)은 넓은 칸 — 왼쪽 크레딧 글(오른쪽 끝 약 256px)과 화면 끝(480) 사이를 넘치지 않게
  photo: { x: 360, y: 176, w: 176, h: 264, wideX: 368, wideW: 208, frame: 3, fade: 1.2, drift: 0, lead: 4.0, tail: 1.0, gap: 1.6 },
  // BUILD372 그림풍 삽화 11장(assets/source/credits371, 사용자 지정 장면 순서) — 라운지 작별 맵이 미리 불러 둔다
  //   BUILD378: 편집노조가 모여 있는 06 은 뺀다(사용자)
  //   BUILD384: 사용자가 준 키 아트(경섭·요플래·억빠맨 + 로고, assets/source/keyart384)를 맨 앞에
  // 사진 아래 한 줄(사진과 함께 떴다 사라짐) — 사용자 지정 문구
  captions: { 'assets/credits/keyart.png': '그려주신 k2님 감사합니다' },
  //   k2님 키 아트는 세 번째(BUILD386 사용자)
  photos: ['assets/credits/photo01.png', 'assets/credits/photo02.png', 'assets/credits/keyart.png', ...[3, 4, 5, 7, 8, 9, 10, 11].map(i => `assets/credits/photo${String(i).padStart(2, '0')}.png`)],
  sections: [
    role('기획'), role('시나리오'), role('연출'), role('게임 디자인'), role('레벨 디자인'),
    role('프로그래밍'), role('전투 시스템'), role('캐릭터 디자인'), role('배경 디자인'), role('도트 그래픽'),
    role('사운드'), role('음악 선곡'), role('QA'),
    cast('등장인물', ['요플래', '김형섭', '김경섭', '억빠맨', '쥰희', '영클', '박용준', '따뜻한비데', '파크가디언', '뚜울라알라', '도트마리오',
      '오방순', '나람이', '김은별컴퍼니', '김예림', '최미스', '점례', '청소부', '가재맨',
      '가순이들', '짜장면', '야꿀벌', '마뱀이', '박원숭', '착검하고검사로살기', '파랑이', '노랑이', '위믹스', '럭키가이', '공허유충']),
    cast('몬스터', ['청소년', '마스터이섭', '신드라섭', '탈리야섭', '아우솔섭', '말자하섭', '섭루토', '지뢰섭', '우디르섭', '드럼통의 악마',
      '아짐키야', '찢칠라', '다오', '배찌', '도미조림', '도현', '문코리타', '섭냥이', '경냥이', '만카츠키 쥰희', '악질맨', '바론', '라즈마',
      '레드 CS', '블루 CS', '대포미니언', '칼날부리', '늑대', '두꺼비', '돌거북', '바위게', '레드', '블루', '훈련 토템']),
    cast('섭리오 챔피언', ['판테온', '브랜드', '질리언']),
    cast('Special Thanks', ['Toby Fox — UNDERTALE · DELTARUNE', 'Riot Games — League of Legends', 'NEXON — 크레이지아케이드 · 카트라이더', 'Galmuri 폰트 — quiple', 'three.js']),
  ],
});
