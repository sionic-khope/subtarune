// BUILD332/333 사용자 브리핑(2026-09-25): 결전지 도착 → 가재맨·섭타룬 → 소환된 몬스터와 지원군 → 영클 레이저 차징 →
// 청소년 구슬 → 가재맨 상승·구슬과 검 투척 → 거대한 푸른 파동·카메라 대상승 → 호러한 연기 → 근육팔 → 청소년거인.
// 대사·표기는 원문 그대로. 좌표는 넓힌 결전지(1152×768, 위로 2400px 여유) 기준.
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const Y = (text, face = 'smirk') => ({ speaker: '영클', portrait: `youngcle_tv_${face}`, voice: 'youngcle', text: `* ${text}` });
const B = text => ({ speaker: '따뜻한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: `* ${text}` });
const PG = text => ({ speaker: '파크가디언', portrait: 'park_guardian_costume', voice: 'park_guardian_costume', text: `* ${text}` });

const PAD = 2400;
/** 카메라 중심(배경 그림 px) → 카메라 노드의 타일 좌표 */
const at = (x, y) => [(x - 16) / 32, (y + PAD - 16) / 32];
export const ARENA_SCENE = Object.freeze({
  stage: 'castle_arena_seen',
  gajaeman: 'arena_gajaeman', youngcle: 'arena_youngcle', junhee: 'arena_junhee',
  cam: { gajaeman: at(555, 215), party: at(555, 394), wide: at(555, 330), left: at(250, 318), right: at(902, 318),
    leftAlly: at(300, 330), rightAlly: at(852, 330), pit: at(555, 300), orbTop: at(555, -300), above: at(555, 250), giant: at(555, -560),
    rushLeft: at(300, 300) },
  summonEvery: 0.45, approach: 1.3, rise: 3.2, pad: PAD,
});
const C = ARENA_SCENE.cam;
const close = { action: game => game.textbox.close() };
const arena = fn => ({ action: game => (game.castleArena ? fn(game.castleArena, game) : undefined) });
const untrack = arena(s => s.untrack());
const LINE = ['youngcle', 'gyeongsub', 'player', 'ppaman', 'junhee'];
const actorId = id => (id === 'youngcle' ? ARENA_SCENE.youngcle : id === 'junhee' ? ARENA_SCENE.junhee : id);
// 둑길을 따라 테두리까지 올라온 뒤 테두리를 따라 옆으로(허공을 걷지 않게 y 먼저)
const walkUp = id => [
  { move: actorId(id), rel: `arena_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'y', facing: 'up' },
  { move: actorId(id), rel: `arena_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'x', facing: 'up' },
];
const all = kind => ({ parallel: LINE.map(id => ({ emote: actorId(id), kind, duration: 0.8, hold: 0.4 })) });
const faceAll = dir => LINE.map(id => ({ face: actorId(id), dir }));
const UNION = ['arena_bidet', 'arena_mario', 'arena_ttuulla', 'arena_park'];
const joinUnion = UNION.map((id, i) => [{ wait: i * 0.12 },
  { move: id, rel: `arena_join_${id.slice(6)}`, at: 'bottom', by: [0, 0], axis: 'x', run: true },
  { move: id, rel: `arena_join_${id.slice(6)}`, at: 'bottom', by: [0, 0], axis: 'y', run: true, facing: 'up' }]);
const everyone = kind => ({ parallel: ['player', 'gyeongsub', 'ppaman', ARENA_SCENE.junhee, ...UNION].map(id => ({ emote: id, kind, duration: 0.8, hold: 0.4 })) });
// 땅을 따라 달리는 길: 길목 기준물(rel)을 차례로, 한 축씩
const via = (id, anchors, opts = {}) => anchors.flatMap(a => [
  { move: id, rel: a, at: 'bottom', by: [0, 0], axis: 'x', dash: true, ...opts },
  { move: id, rel: a, at: 'bottom', by: [0, 0], axis: 'y', dash: true, ...opts },
]);

/** 한쪽 소환: 연기와 함께 하나씩 나타나 제자리까지 뒤뚱뒤뚱 다가온다. */
const summonSide = side => ({ action: game => {
  const scene = game.castleArena, list = (game.map.def.meta?.arena?.summons || []).filter(s => s.side === side);
  if (!scene || !list.length) return undefined;
  let t = 0, arrived = 0;
  const jobs = list.map((s, i) => ({ s, at: i * ARENA_SCENE.summonEvery, started: false, e: game.entities.find(e => e.id === s.id) })).filter(j => j.e);
  return new Promise(resolve => game.background.push({ update: dt => {
    t += dt;
    for (const j of jobs) {
      if (!j.started && t >= j.at) { j.started = true; j.x0 = j.e.x; scene.summon(j.s.id); }
      if (!j.started || j.done) continue;
      const k = Math.min(1, (t - j.at) / ARENA_SCENE.approach);
      j.e.x = j.x0 + (j.s.x - j.x0) * k;
      j.e.hopY = Math.abs(Math.sin(k * Math.PI * 4)) * 5 * (1 - k);
      if (k >= 1) { j.done = true; j.e.hopY = 0; arrived++; }
    }
    if (arrived < jobs.length) return false;
    resolve(); return true;
  } }));
} });

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
  // 왼쪽 테라스 → 오른쪽 테라스로 카메라가 옮겨 가며 하나씩 소환 → 멀리서 전체
  { parallel: [{ camera: C.left, duration: 0.9 }, { zoom: 0.85, duration: 0.9 }] }, summonSide('left'),
  { camera: C.right, duration: 1.1 }, summonSide('right'),
  { parallel: [{ camera: C.wide, duration: 1.0 }, { zoom: 0.62, duration: 1.0 }] },
  all('!'),
  { face: ARENA_SCENE.youngcle, dir: 'left' }, { face: 'gyeongsub', dir: 'left' }, { face: 'player', dir: 'left' },
  { face: 'ppaman', dir: 'right' }, { face: ARENA_SCENE.junhee, dir: 'right' }, { wait: 0.4 },
  { parallel: [{ zoom: 1, duration: 0.6 }, { camera: C.party, duration: 0.6 }] },
  Y('치사한새끼', 'glare'), J('...'), close,
  B('허이얍!!!'), close,
  // 착지 구도는 가깝게(테라스 아래 허공이 비치지 않게)
  { parallel: [{ camera: C.leftAlly, duration: 0.7 }, { zoom: 1.3, at: [300, 360 + PAD], duration: 0.7 }] },
  { drop: ['arena_bidet', 'arena_mario'], height: 340, duration: 0.6, land: 'thud', quake: 4 },
  { parallel: [{ motion: 'arena_bidet', name: 'axe_strike' }, [{ wait: 0.25 }, { fling: 'arena_mon_teemo', vx: -520, vup: 760, spin: 16, sfx: 'impact' }]] },
  { wait: 0.5 },
  PG('하이얍!!!!!!!!'), close,
  { parallel: [{ camera: C.rightAlly, duration: 1.0 }, { zoom: 1.3, at: [840, 360 + PAD], duration: 1.0 }] },
  { drop: ['arena_park', 'arena_ttuulla'], height: 340, duration: 0.6, land: 'thud', quake: 4 },
  { fling: 'arena_mon_lux', vx: 520, vup: 760, spin: -16, sfx: 'impact' },
  { motion: 'arena_park', name: 'bow' },
  PG('응 잘가세연'), close,
  { parallel: [{ zoom: 1, duration: 0.8 }, { camera: C.party, duration: 1.0 }] },
  { face: 'player', dir: 'up' }, { face: ARENA_SCENE.youngcle, dir: 'up' },
  Y('쟤들한테 맡기고 이제 니를 참교육 해주겠음.'),
  Y('엄청대박인배 슈퍼 웨폰마스터 시리즈중 하나인, 나의 초대형 레이저맛을 보샘'), close,
  { zoom: 1.35, at: ARENA_SCENE.youngcle, offset: [0, 20], duration: 0.6 },
  arena(s => s.charge(ARENA_SCENE.youngcle)),
  { parallel: [{ zoom: 1, duration: 0.5 }, { camera: C.gajaeman, duration: 1.0 }] },
  A('...'), A('큭큭큭'), close,
  // 진동과 함께 소리
  { parallel: [{ shake: 0.9, amp: 4 }, { sfx: 'rumble', volume: 0.9 }, arena(s => s.setAura(2))] },
  A('{shake}{c=red}난 너희가 이렇게 까지 멍청할 줄 몰랐어.{/c}{/shake}'), close,
  { camera: C.party, duration: 0.6 }, all('!'), { wait: 0.3 },
  // 힘을 모으고 → 한참 위에서 청소년이 갇힌 보라 구슬이 천천히, 빙글빙글 잔상과 함께 내려와 가재맨 머리 위에서 들린다
  { camera: C.gajaeman, duration: 0.8 },
  { parallel: [{ shake: 0.8, amp: 2 }, { sfx: 'power', volume: 0.6 }] },
  { camera: C.orbTop, duration: 1.2 },
  arena(s => { s.track(() => (s.orb ? { x: s.orb.x, y: s.orb.y + 70 } : null)); return s.summonOrb(); }),
  untrack, { camera: C.gajaeman, duration: 0.6 }, { wait: 0.4 },
  Y('...?!', 'shock'), { emote: 'gyeongsub', kind: '!', duration: 0.8, hold: 0.4 }, K('!!!!!'),
  A('섭타룬은 누구에게나 힘을 부여할 수 있는 개념'), A('이건, 내가 지금까지 봐왔던 사람들중 가장 강력한 사람이다.'),
  A('굳이굳이 너네가 모여줬으니'), A('잘 가 라.'),
  Y('안돼!!!', 'shock'), close,
  // 영클이 급하게: 영클에게 확 붙었다가 → 레이저와 함께 가재맨 쪽으로 휙 → 가재맨이 구슬과 함께 치솟는 것을 따라 올라감
  { parallel: [{ zoom: 1.4, at: ARENA_SCENE.youngcle, offset: [0, 10], duration: 0.25 }, { emote: ARENA_SCENE.youngcle, kind: '!', duration: 0.5, hold: 0.2 }] },
  { wait: 0.15 },
  { parallel: [
    arena(s => s.fireAndRise(ARENA_SCENE.youngcle)),
    [{ zoom: 1, duration: 0.3 }, arena(s => s.trackActor(ARENA_SCENE.gajaeman, -40))],
  ] },
  { wait: 0.5 },
  // 구슬을 구덩이에 던지는 것을 따라 내려감
  arena(s => { s.track(() => (s.orb ? { x: s.orb.x, y: s.orb.y } : null)); return s.throwOrbAndSwords(true); }),
  untrack, { wait: 0.6 },
  // 5초: 가운데서 바람처럼(바람 소리만) → 갑자기 큰 파동(굉음·웅장한 바람 오오라) → 조금 멀리서, 빠르게 위로
  { parallel: [{ camera: C.pit, duration: 0.5 }, { zoom: 0.8, duration: 0.5 }] },
  // 모두 구덩이(앞)를 본다
  ...['player', 'gyeongsub', 'ppaman', ARENA_SCENE.youngcle, ARENA_SCENE.junhee, 'arena_bidet', 'arena_mario', 'arena_park', 'arena_ttuulla'].map(id => ({ face: id, dir: 'up' })),
  arena(s => s.fountainRise()),
  { parallel: [{ zoom: 0.7, duration: 0.8 }, { camera: at(555, -2150), duration: ARENA_SCENE.rise }] },
  { wait: 1.2 },
  // 파동이 사라지고 호러한 연기로 아무것도 안 보이는 채 카메라가 다시 주인공들 쪽으로
  arena(s => { s.setAura(0); return s.fountainEnd(1.8); }), { hide: ARENA_SCENE.gajaeman },
  { action: game => { for (const e of game.entities) if (e.id?.startsWith('arena_mon_')) e.visible = false; } },
  { parallel: [{ zoom: 1, duration: 1.0 }, { camera: C.party, duration: 3.0 }] },
  arena(s => { s.setFogClear(555, 420 + PAD); s.setFog(0.9, 1.6); }), { wait: 1.4 },
  arena(s => s.pace(ARENA_SCENE.youngcle)),
  Y('뭐..뭐노', 'shock'), J('이 이게 도대체...'), K('다.. 다들 괜찮아..?'), close,
  // 좌우에서 편집노조가 달려와 합류
  { parallel: joinUnion },
  B('이.. 이게 무슨일이죠?'), Y('나도 잘..모르겠음'), close,
  // 쿠구구궁 — 모두 위를 본다
  { parallel: [{ shake: 1.6, amp: 4 }, { sfx: 'rumble', volume: 0.9 }] },
  ...['player', 'gyeongsub', 'ppaman', ARENA_SCENE.junhee, ...UNION].map(id => ({ face: id, dir: 'up' })), { wait: 0.9 },
  Y('내.. 내가 위로 올라가봄..'), close,
  arena(s => { s.stopPace(); s.setFogClear('screen'); return s.flyUp(ARENA_SCENE.youngcle, 3.0, 420); }),
  // 근육팔이 휘둘러 영클을 벽에 꽂는다(이후 영클은 안 보인다)
  arena((s, game) => {
    const y = game.entities.find(e => e.id === ARENA_SCENE.youngcle);
    return y ? s.swingArm('right', { x: y.x + y.w / 2, y: y.y + y.h / 2 - 20 }, () => s.slamIntoWall(ARENA_SCENE.youngcle, 60)) : undefined;
  }),
  // 청소년이 영클을 쳐낸 뒤 긴박곡(사용자 지정 iRMn2HlCRFI = 기존 castle_gajaeman)
  { bgm: 'castle_gajaeman', volume: 0.5, fadeIn: 0.6 },
  { wait: 0.5 },
  { camera: C.party, duration: 0.8 }, arena(s => s.setFogClear(555, 420 + PAD)),
  everyone('!'), { wait: 0.3 },
  B('영.. 영클형!!'), close,
  // 따뜻한비데와 도트마리오가 왼쪽으로 달려가는 것을 카메라가 따라가다가 — 또 다른 근육팔에 펑
  arena(s => { s.setFogClear('screen'); s.trackActor('arena_bidet'); }),
  { parallel: [
    via('arena_bidet', ['arena_rush_1', 'arena_rush_2'], { facing: 'left' }),
    [{ wait: 0.12 }, ...via('arena_mario', ['arena_rush_1', 'arena_rush_2'], { facing: 'left' })],
  ] },
  arena((s, game) => {
    const b = game.entities.find(e => e.id === 'arena_bidet');
    return b ? s.swingArm('left', { x: b.x - 30, y: b.y - 10 }, () => s.blastAway(['arena_bidet', 'arena_mario'], 620)) : undefined;
  }),
  { wait: 0.6 }, untrack,
  // 모두 위를 보고 카메라 위로 → 페이드로 청소년거인 상체 → 다시 주인공 쪽 → 땅을 따라 오른쪽으로 튄다
  { camera: C.party, duration: 0.8 }, arena(s => s.setFogClear(555, 420 + PAD)),
  ...['player', 'gyeongsub', 'ppaman', ARENA_SCENE.junhee, 'arena_park', 'arena_ttuulla'].map(id => ({ face: id, dir: 'up' })),
  { camera: C.above, duration: 1.2 },
  J('저..저게... 저게뭐야!!!!'), close,
  // 연기 속에서 천천히: 연기가 걷히며 형체가 점점 드러난다(상체만 가깝게)
  { fade: 'out', duration: 0.5 }, arena(s => { s.setFog(1, 0.05); s.setFogClear(null); s.showGiant(); }),
  { camera: C.giant, duration: 0.01 }, { zoom: 0.85, duration: 0.01 }, { fade: 'in', duration: 0.8 },
  arena(s => s.setFog(0.2, 3.2)), { wait: 3.2 }, { shake: 0.6, amp: 3 }, { wait: 0.4 },
  J('괴물이잖아!!!!!!!!!!'), close,
  { fade: 'out', duration: 0.4 }, arena(s => { s.setFog(0.9, 0.05); s.setFogClear(555, 420 + PAD); }), { zoom: 1, duration: 0.01 }, { camera: C.party, duration: 0.01 }, { fade: 'in', duration: 0.5 },
  J('오 오른쪽으로 튀어!!!'), close,
  { parallel: [ARENA_SCENE.junhee, 'arena_park', 'arena_ttuulla'].map((id, i) => [{ wait: i * 0.12 },
    ...via(id, ['arena_escape_1', 'arena_escape_2', 'arena_escape_3'], { facing: 'right' }), { hide: id }]) },
  { camera: C.party, duration: 0.6 },
  P('형 빨리 도망가요'), close,
  { stage: ARENA_SCENE.stage },
  { label: 'end' }, { end: true },
], { silent: true });
