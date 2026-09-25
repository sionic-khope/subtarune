// BUILD332 사용자 브리핑 두 개(2026-09-25): 결전지 도착 → 가재맨·섭타룬 → 소환된 몬스터와 지원군 → 영클 레이저 차징 →
// 청소년 구슬 → 가재맨 상승·구슬과 검 투척 → 구덩이에서 거대한 푸른 파동, 카메라 대상승. 대사·표기는 원문 그대로.
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const Y = (text, face = 'smirk') => ({ speaker: '영클', portrait: `youngcle_tv_${face}`, voice: 'youngcle', text: `* ${text}` });
const B = text => ({ speaker: '따뜻한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: `* ${text}` });
const PG = text => ({ speaker: '파크가디언', portrait: 'park_guardian_costume', voice: 'park_guardian_costume', text: `* ${text}` });

export const ARENA_SCENE = Object.freeze({
  stage: 'castle_arena_seen',
  gajaeman: 'arena_gajaeman', youngcle: 'arena_youngcle', junhee: 'arena_junhee',
  // 카메라 타일 좌표(중심). 맵 위쪽에 2400px(75칸) 빈 공간이 있다
  cam: { gajaeman: [11.5, 84.5], party: [11.5, 92.8], wide: [11.5, 92], left: [7, 92.8], right: [16, 92.8], risen: [11.5, 77], pit: [11.5, 86], top: [11.5, 5.6],
    above: [11.5, 84], giant: [11.5, 72.3] },
  summonEvery: 0.5, approach: 1.3, rise: 5.0,
});
const C = ARENA_SCENE.cam;
const close = { action: game => game.textbox.close() };
const arena = fn => ({ action: game => (game.castleArena ? fn(game.castleArena, game) : undefined) });
const LINE = ['youngcle', 'gyeongsub', 'player', 'ppaman', 'junhee'];
const actorId = id => (id === 'youngcle' ? ARENA_SCENE.youngcle : id === 'junhee' ? ARENA_SCENE.junhee : id);
const walkUp = id => [
  { move: actorId(id), rel: `arena_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'x', facing: 'up' },
  { move: actorId(id), rel: `arena_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'y', facing: 'up' },
];
const all = kind => ({ parallel: LINE.map(id => ({ emote: actorId(id), kind, duration: 0.8, hold: 0.4 })) });
const faceAll = dir => LINE.map(id => ({ face: actorId(id), dir }));
const UNION = ['arena_bidet', 'arena_mario', 'arena_ttuulla', 'arena_park'];
const joinUnion = UNION.map((id, i) => [{ wait: i * 0.12 },
  { move: id, rel: `arena_join_${id.slice(6)}`, at: 'bottom', by: [0, 0], axis: 'y', run: true },
  { move: id, rel: `arena_join_${id.slice(6)}`, at: 'bottom', by: [0, 0], axis: 'x', run: true, facing: 'up' }]);
const everyone = kind => ({ parallel: ['player', 'gyeongsub', 'ppaman', ARENA_SCENE.junhee, ...UNION].map(id => ({ emote: id, kind, duration: 0.8, hold: 0.4 })) });

/** 소환: 좌우 번갈아 하나씩 연기와 함께 나타나 제자리까지 뒤뚱뒤뚱 다가온다. */
const summonAll = { action: game => {
  const scene = game.castleArena, list = game.map.def.meta?.arena?.summons || [];
  if (!scene || !list.length) return undefined;
  const order = [];
  for (let i = 0; i < 5; i++) for (const side of ['left', 'right']) { const s = list.filter(x => x.side === side)[i]; if (s) order.push(s); }
  let t = 0, arrived = 0;
  const jobs = order.map((s, i) => ({ s, at: i * ARENA_SCENE.summonEvery, started: false, e: game.entities.find(e => e.id === s.id) }));
  return new Promise(resolve => game.background.push({ update: dt => {
    t += dt;
    for (const j of jobs) {
      if (!j.e) continue;
      if (!j.started && t >= j.at) { j.started = true; j.x0 = j.e.x; j.y0 = j.e.y; scene.summon(j.s.id); }
      if (!j.started || j.done) continue;
      const k = Math.min(1, (t - j.at) / ARENA_SCENE.approach);
      j.e.x = j.x0 + (j.s.x - j.x0) * k;
      j.e.hopY = Math.abs(Math.sin(k * Math.PI * 4)) * 5 * (1 - k);
      if (k >= 1) { j.done = true; j.e.hopY = 0; arrived++; }
    }
    if (arrived < jobs.filter(j => j.e).length) return false;
    resolve(); return true;
  } }));
} };

export const castle_arena_intro = Object.assign([
  { if: flags => !!flags[ARENA_SCENE.stage], goto: 'end' },
  close, { bgm: null, fadeOut: 0.6 },
  { show: ARENA_SCENE.gajaeman }, { camera: 'player' },
  // 주인공들이 위로 올라감(영클·쥰희도 함께)
  { parallel: [walkUp('player'), [{ wait: 0.2 }, ...walkUp('gyeongsub')], [{ wait: 0.35 }, ...walkUp('ppaman')],
    [{ wait: 0.1 }, ...walkUp('youngcle')], [{ wait: 0.45 }, ...walkUp('junhee')]] },
  ...faceAll('up'), { wait: 0.4 },
  arena(s => s.setAura(1)),
  { camera: C.gajaeman, duration: 3.2 }, { wait: 0.8 },
  A('...'), A('섭타룬.'), A('내가 지금 이렇게 활동할 수 있는 힘의 근원이자'), A('모든 것을 없애버릴 수 있는 강력한 힘'), A('그것이 섭타룬이다.'),
  Y('ㅇㅉ'),
  A('왜 너희는 나를 방해하려고 하는거지?'), A('어차피 김형섭이라는 인간은, 너희에게 그렇게 소중하지 않잖아?'), A('내가 받아왔던 치부처럼.'),
  Y('ㄹㅇ'), close,
  { camera: C.party, duration: 1.0 },
  K('영클아'), Y('김형섭은'),
  { tremble: ARENA_SCENE.youngcle, duration: 1.6, amp: 2 }, { shake: 0.5, amp: 2 },
  Y('{shake}돈 주는 사장님이기에 소중하다!!!{/shake}', 'taunt'),
  P('그냥 전 형섭이형 밑에서 일하는게 좋아요'), K('그래도 동생이니까 난'),
  A('...'), A('그딴 구실 안통해, 난 이미 느꼈거든'), close,
  // 카메라가 다시 위로, 검은 오오라가 더 많이 튄다
  { parallel: [{ camera: C.gajaeman, duration: 1.0 }, arena(s => s.setAura(2))] }, { wait: 0.5 },
  A('나를 막을 수 있을거라고 생각하지마라'), A('어차피 다 죽일건데 무슨소용이겠어?'), close,
  arena(s => s.erupt()),
  { parallel: [{ camera: C.wide, duration: 1.2 }, { zoom: 0.75, duration: 1.2 }] },
  summonAll,
  all('!'),
  { face: ARENA_SCENE.youngcle, dir: 'left' }, { face: 'gyeongsub', dir: 'left' }, { face: 'player', dir: 'left' },
  { face: 'ppaman', dir: 'right' }, { face: ARENA_SCENE.junhee, dir: 'right' }, { wait: 0.4 },
  Y('치사한새끼', 'glare'), J('...'), close,
  B('허이얍!!!'), close,
  { parallel: [{ zoom: 1, duration: 0.6 }, { camera: C.left, duration: 0.8 }] },
  { drop: ['arena_bidet', 'arena_mario'], height: 340, duration: 0.6, land: 'thud', quake: 4 },
  { parallel: [{ motion: 'arena_bidet', name: 'axe_strike' }, [{ wait: 0.25 }, { fling: 'arena_mon_teemo', vx: -520, vup: 760, spin: 16, sfx: 'impact' }]] },
  { wait: 0.5 },
  PG('하이얍!!!!!!!!'), close,
  { camera: C.right, duration: 0.9 },
  { drop: ['arena_park', 'arena_ttuulla'], height: 340, duration: 0.6, land: 'thud', quake: 4 },
  { fling: 'arena_mon_lux', vx: 520, vup: 760, spin: -16, sfx: 'impact' },
  { motion: 'arena_park', name: 'bow' },
  PG('응 잘가세연'), close,
  { camera: C.party, duration: 0.9 },
  { face: 'player', dir: 'up' }, { face: ARENA_SCENE.youngcle, dir: 'up' },
  Y('쟤들한테 맡기고 이제 니를 참교육 해주겠음.'),
  Y('엄청대박인배 슈퍼 웨폰마스터 시리즈중 하나인, 나의 초대형 레이저맛을 보샘'), close,
  arena(s => s.charge(ARENA_SCENE.youngcle)),
  { camera: C.gajaeman, duration: 1.0 },
  A('...'), A('큭큭큭'), close,
  { shake: 0.9, amp: 4 }, arena(s => s.setAura(2)),
  A('{shake}{c=red}난 너희가 이렇게 까지 멍청할 줄 몰랐어.{/c}{/shake}'), close,
  { camera: C.party, duration: 0.6 }, all('!'), { wait: 0.3 },
  // 후반(두 번째 브리핑): 힘을 모으고 → 위에서 청소년이 갇힌 구슬이 빙글빙글 잔상과 함께 내려와 가재맨 앞에 안착
  { camera: C.gajaeman, duration: 0.9 },
  { shake: 0.6, amp: 2 },
  arena(s => s.summonOrb()),
  { wait: 0.4 },
  Y('...?!', 'shock'), { emote: 'gyeongsub', kind: '!', duration: 0.8, hold: 0.4 }, K('!!!!!'),
  A('섭타룬은 누구에게나 힘을 부여할 수 있는 개념'), A('이건, 내가 지금까지 봐왔던 사람들중 가장 강력한 사람이다.'),
  A('굳이굳이 너네가 모여줬으니'), A('잘 가 라.'),
  Y('안돼!!!', 'shock'), close,
  // 영클이 급하게 쏘지만 가재맨이 구슬과 함께 엄청나게 상승
  { parallel: [arena(s => s.fireAndRise(ARENA_SCENE.youngcle)), { camera: C.risen, duration: 1.0 }] },
  { wait: 0.3 },
  // 구슬을 구덩이에 던지고 → 검 여러 자루를 뽑아(여러발 뽑는 소리) 함께 던짐 → 꽂히며 쿠웅
  { camera: C.pit, duration: 0.9 },
  arena(s => s.throwOrbAndSwords()),
  { wait: 0.6 },
  // 구덩이에서 거대한 파동: 모두 그림자, 푸른 기둥, 카메라가 한참 위로
  // 5초: 가운데서 바람처럼 조금 새어 나오다가 → 갑자기 주변으로 파동 → 카메라가 5초 동안 한참 위로
  { camera: C.pit, duration: 0.4 },
  arena(s => s.fountainRise()),
  { camera: C.top, duration: ARENA_SCENE.rise },
  { wait: 1.2 },
  // 세 번째 브리핑: 파동이 사라지고 호러한 연기로 아무것도 안 보이는 채 카메라가 다시 주인공들 쪽으로
  arena(s => { s.setAura(0); return s.fountainEnd(1.8); }), { hide: ARENA_SCENE.gajaeman },
  { action: game => { for (const e of game.entities) if (e.id?.startsWith('arena_mon_')) e.visible = false; } },
  { camera: C.party, duration: 3.0 },
  arena(s => s.setFog(0.5, 1.6)), { wait: 1.4 },
  arena((s, game) => s.pace(ARENA_SCENE.youngcle)),
  Y('뭐..뭐노', 'shock'), J('이 이게 도대체...'), K('다.. 다들 괜찮아..?'), close,
  // 좌우에서 편집노조가 달려와 합류
  { parallel: joinUnion },
  B('이.. 이게 무슨일이죠?'), Y('나도 잘..모르겠음'), close,
  // 쿠구구궁 — 모두 위를 본다
  { parallel: [{ shake: 1.6, amp: 4 }, { sfx: 'rumble', volume: 0.9 }] },
  ...['player', 'gyeongsub', 'ppaman', ARENA_SCENE.junhee, ...UNION].map(id => ({ face: id, dir: 'up' })), { wait: 0.9 },
  Y('내.. 내가 위로 올라가봄..'), close,
  arena(s => { s.stopPace(); return s.flyUp(ARENA_SCENE.youngcle, 3.0, 420); }),
  // 근육 팔이 휘둘러 영클을 벽에 꽂는다(이후 영클은 안 보인다)
  arena((s, game) => {
    const y = game.entities.find(e => e.id === ARENA_SCENE.youngcle);
    return y ? s.swingArm('right', { x: y.x + y.w / 2, y: y.y + y.h / 2 - 20 }, () => s.slamIntoWall(ARENA_SCENE.youngcle, 150)) : undefined;
  }),
  // 청소년이 영클을 쳐낸 뒤 긴박곡(사용자 지정 iRMn2HlCRFI = 기존 castle_gajaeman)
  { bgm: 'castle_gajaeman', volume: 0.5, fadeIn: 0.6 },
  { wait: 0.5 },
  { camera: C.party, duration: 0.8 },
  everyone('!'), { wait: 0.3 },
  B('영.. 영클형!!'), close,
  // 따뜻한비데와 도트마리오가 왼쪽으로 달려가다가 — 또 다른 근육 팔에 펑
  { parallel: [
    { move: 'arena_bidet', by: [-110, 0], dash: true, facing: 'left' },
    [{ wait: 0.1 }, { move: 'arena_mario', by: [-110, 0], dash: true, facing: 'left' }],
    [{ wait: 0.2 }, arena((s, game) => {
      const b = game.entities.find(e => e.id === 'arena_bidet');
      return b ? s.swingArm('left', { x: b.x - 40, y: b.y - 10 }, () => s.blastAway(['arena_bidet', 'arena_mario'], 620)) : undefined;
    })],
  ] },
  { wait: 0.8 },
  // 네 번째 브리핑: 모두 위를 보고 카메라 위로 → 페이드로 청소년거인 상체 → 다시 주인공 쪽 → 오른쪽으로 튄다
  ...['player', 'gyeongsub', 'ppaman', ARENA_SCENE.junhee, 'arena_park', 'arena_ttuulla'].map(id => ({ face: id, dir: 'up' })),
  { camera: C.above, duration: 1.2 },
  J('저..저게... 저게뭐야!!!!'), close,
  { fade: 'out', duration: 0.5 }, { show: 'arena_giant' }, arena(s => s.setFog(0.2, 0.05)),
  { camera: C.giant, duration: 0.01 }, { fade: 'in', duration: 0.8 }, { shake: 0.6, amp: 3 }, { wait: 0.5 },
  J('괴물이잖아!!!!!!!!!!'), close,
  { fade: 'out', duration: 0.4 }, arena(s => s.setFog(0.5, 0.05)), { camera: C.party, duration: 0.01 }, { fade: 'in', duration: 0.5 },
  J('오 오른쪽으로 튀어!!!'), close,
  { parallel: [ARENA_SCENE.junhee, 'arena_park', 'arena_ttuulla'].map((id, i) => [{ wait: i * 0.1 },
    { move: id, by: [0, 20], dash: true, facing: 'down' }, { move: id, by: [220, 0], dash: true, facing: 'right' }, { hide: id }]) },
  { camera: C.party, duration: 0.6 },
  P('형 빨리 도망가요'), close,
  { stage: ARENA_SCENE.stage },
  { label: 'end' }, { end: true },
], { silent: true });
