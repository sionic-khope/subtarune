// BUILD337 사용자 브리핑(2026-09-25): 꼭대기 끝길의 대치. 대사·표기 원문 그대로. 전투는 아직 만들지 않는다(사용자 “일단 전투는 만들지마”).
import { TEEN_BATTLE } from '../teen-battle.js';

const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
const YJ = text => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const YC = (text, face = 'smirk') => ({ speaker: '영클', portrait: `youngcle_tv_${face}`, voice: 'youngcle', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const summit = fn => ({ action: game => (game.castleSummit ? fn(game.castleSummit, game) : undefined) });
const at = (x, y) => [(x - 16) / 32, (y - 16) / 32];
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const stand = id => [
  { move: id, rel: `summit_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'x', facing: 'right' },
  { move: id, rel: `summit_stand_${id}`, at: 'bottom', by: [0, 0], axis: 'y', facing: 'right' },
];
// BUILD342: 대치 내내 전투와 같은 한 화면(TEEN_BATTLE.view.cam 이 왼쪽 위) — 왼쪽 끝길에 일행, 오른쪽 연기 속 청소년(사용자 참고 델타룬 거인전 비율)
const VIEW_CENTER = [TEEN_BATTLE.view.cam[0] + 240, TEEN_BATTLE.view.cam[1] + 180];
// 격파 연출 카메라: 주인공 쪽(party), 끝길 맨 뒤 용준·대포까지(back)
export const SUMMIT_SCENE = Object.freeze({ stage: 'castle_summit_ready', cam: { talk: at(...VIEW_CENTER), face: at(...VIEW_CENTER), party: at(1720, 368), back: at(1330, 368), far: at(1340, 380) } });
const C = SUMMIT_SCENE.cam;

export const castle_summit_confront = Object.assign([
  { if: flags => !!flags.castle_teen_finale_seen, goto: 'end' },
  // 이기고 연출 전에 멈춘 저장이면 연출부터
  { if: flags => !!flags.castle_teen_won, goto: 'finale' },
  // QA: 2페이즈 직행(qa_teen_p2)
  { if: flags => !!flags.qa_teen_p2, goto: 'fightP2' },
  { if: flags => !!flags[SUMMIT_SCENE.stage], goto: 'fight' },
  close,
  { parallel: [stand('player'), [{ wait: 0.2 }, ...stand('gyeongsub')], [{ wait: 0.35 }, ...stand('ppaman')]] },
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  { camera: C.talk, duration: 1.2 }, { wait: 0.5 },
  P('...'), K('...'),
  { face: 'ppaman', dir: 'up' },
  P('후.. 가재맨은... 그래서 어디있는걸까요'),
  { face: 'gyeongsub', dir: 'down' }, K('빠맨아'),
  P('일단 청소년부터 족쳐야죠'), P('그녀석부터 찾을까요?'),
  K('응 그렇지'), { face: 'gyeongsub', dir: 'right' }, K('그리고...'),
  // 브금은 “이미 우리 앞에있어.” 와 함께(사용자 지정 L0MAep7ml3A “Gallery”)
  { bgm: 'gallery', volume: 0.5, fadeIn: 0.8 }, K('이미 우리 앞에있어.'), close,
  // 검은 연기가 걷히며 청소년 상체가 드러난다
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  { parallel: [{ camera: C.face, duration: 0.4 }, summit(s => s.revealGiant())] },
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) },
  P('...'), P('야 니.. 니녀석..님? 어머님..?'), P('우리는 세상을 구할거고 요플래가 우리 옆에있어.'),
  P('꼭 그렇게 우리를 저지해야겠다면,'), P('그 그렇게 쉽게 되진 않..않을거다.'), close,
  // 위에서 가재맨이 천천히 내려옴
  summit(s => s.descend()),
  A('ㅋㅋㅋ'), P('씨발년'),
  A('너희들은 이제 여기서 죽는다.'), A('희망따윈 없어'), A('공격이라도 입힐 수 있겠냐? 자살행위일걸'),
  A('요플래..'), A('우리의 악연도 여기서 끝을 내야겠군..'), close,
  // 거대한 오오라를 뿜으며 위로 → 청소년 뒤 어깨에 안착
  summit(s => s.auraAndPerch()), { wait: 0.4 },
  P('...'), K('요플래, 그리고 빠맨아 준비됐어?'),
  P('가볼까요.'), K('가자!'), close,
  { stage: SUMMIT_SCENE.stage },
  // 그 자리에서 바로 전투: 조우음 없이 검 뽑는 소리(사용자 “조우 효과음은 없고 그냥 바로 검뽑기 효과음과 함께”) — 소리는 전투가 캐릭터를 전투 모션으로 바꾸는 순간 낸다(battle.js)
  { label: 'fight' },
  // 브금이 잠깐 꺼지고 1초 뒤 검 뽑는 소리와 함께 전투로 → 그 뒤 전투 브금(사용자 2026-09-25)
  { action: game => game.sound.preloadBgm?.('guardian') }, { bgm: null, fadeOut: 0.4 }, { wait: 1.0 },
  { battle: { enemies: ['teen_giant'], bgm: 'guardian', bg: 'castle_summit', boardColor: '#a060ff', flag: 'castle_teen_won', seamlessIntro: true, seamlessSfx: 'weaponpull', intro: TEEN_BATTLE.intro } },
  { goto: 'finale' },
  // QA 2페이즈 직행: 전환 연출 없이 가재맨(2페이즈)부터
  { label: 'fightP2' },
  { action: game => game.sound.preloadBgm?.('guardian') }, { bgm: null, fadeOut: 0.4 }, { wait: 0.6 },
  { battle: { enemies: ['teen_giant'], bgm: 'guardian', bg: 'castle_summit', boardColor: '#a060ff', flag: 'castle_teen_won', seamlessIntro: true, seamlessSfx: 'weaponpull', teenPhase2: true } },
  // BUILD352 2페이즈 격파 뒤 연출(사용자 2026-09-26 브리핑, 대사 원문 그대로). 전투는 HP 1 에서 끊겨 같은 화면으로 이어진다
  { label: 'finale' },
  summit(s => s.enterFinale()), { camera: C.talk, duration: 0.01 },
  A('{shake}말..말도안돼...{/shake}'), A('이건... 이럴수가 없어.'), A('도대체 언제까지..'),
  A('{shake}나는 이렇게 모두에게 사랑받지 못하고 살아야하는건데!!!{/shake}'), A('질 수 없어'), A('너희가 나를 막게 둘수없다!!!'), close,
  // 엄청난 오오라가 모이고 3초 뒤 릴리즈샷과 함께 퍼어엉 → 일행 HP 1
  summit(s => s.gatherAura(3)), summit(s => s.releaseBurst()),
  { camera: C.party, duration: 1.4 }, { wait: 0.6 },
  P('헉... 헉... 미친.. 말도안돼'), K('...윽.. 이대로 지는건가..'), close,
  summit(s => s.hideHud()),
  { camera: C.talk, duration: 0.8 },
  A('잘.. 가라..'), A('이제 끝내자.'), close,
  // 우웅 — 연기를 걷어내며 거대한 칼날, 일행을 겨눈다
  summit(s => s.formBlade()), { wait: 0.5 },
  A('{shake}죽어!!{/shake}'), close, { wait: 0.3 },
  // 뒤로 당겼다가 날아온다: 칼 쪽으로 살짝 확대, 점점 슬로우모션, 닿기 직전 멈춤
  { parallel: [summit(s => s.launchBlade()), [{ wait: 1.1 }, { zoom: 1.3, at: [1780, 330], duration: 0.8 }]] },
  // 쾅! 용준대포알이 날아와 칼을 날려 버린다 → 모두 느낌표
  summit(s => s.cannonSmash()), { wait: 0.6 }, { zoom: 1, duration: 0.6 },
  { parallel: PARTY.map(id => ({ emote: id, kind: '!', duration: 1.0, hold: 0.6 })) }, { wait: 0.6 },
  // 뒤를 돌아보고 → 카메라가 천천히 뒤로 — 끝길 맨 뒤에 박용준과 용준대포
  { show: 'finale_yongjun' }, summit(s => s.showCannon()),
  ...PARTY.map(id => ({ face: id, dir: 'left' })), { wait: 0.5 },
  { bgm: null, fadeOut: 1.2 }, { camera: C.back, duration: 3.0 }, { wait: 0.3 },
  // 용준이 잡히는 순간: 파앗 — 용준 쪽으로 빠르게 확대, 그 순간 브금 + “하이요 형들ㅋㅋ”
  { action: game => game.sound.preloadBgm?.('save_the_world') },
  { parallel: [{ zoom: 1.6, at: 'finale_yongjun', offset: [40, -16], duration: 0.16 }, { sfx: 'great_shine', volume: 0.8 }, { shake: 0.2, amp: 3 }, { bgm: 'save_the_world', volume: 0.6, fadeIn: 0.05 }] },
  { wait: 0.3 },
  YJ('하이요 형들ㅋㅋ'), close, { zoom: 1, duration: 0.5 },
  P('용.. 용준아 살아있었구나!!'), YJ('아 당연하죠 형님들 ㅋㅋ'), close,
  { camera: C.talk, duration: 0.9 },
  A('{shake}이... 이...녀석들이!!!{/shake}'), close,
  // 작은 검들을 여러 개 소환해 박용준에게 → 용준·대포 앞 바닥에서 바론이 튀어나와 날려 버리고 포효
  // 바론이 들어갈 만큼 조금 멀리서
  // 검들이 박용준에게 날아가는 걸 따라가다 → 용준 앞 바닥에서 바론이 솟아 몸으로 막는다
  summit(s => s.swordsAtYongjun()), { parallel: [{ camera: C.far, duration: 0.9 }, { zoom: 0.72, duration: 0.9 }] },
  { parallel: [{ emote: 'finale_yongjun', kind: '!', duration: 0.6, hold: 0.2 }, summit(s => s.baronRise())] }, { wait: 0.4 },
  { parallel: [{ camera: C.talk, duration: 0.7 }, { zoom: 1, duration: 0.7 }] }, { wait: 0.3 }, A('?!'), close,
  { parallel: [{ camera: C.far, duration: 0.8 }, { zoom: 0.72, duration: 0.8 }] },
  YJ('으하하, 펠월드 고수 대용준님께선 바론 테이밍따윈 일도 아니란 말씀!!'), summit(s => s.roar()), YJ('죽어라 괴물!!!'), close,
  // 대포를 하나 더 — 빠르게 날아가 청소년가재맨에게 적중. 바론은 포효 뒤 대포 뒤로 물러나 곁에 남는다
  { parallel: [summit(s => s.baronBack()), [{ wait: 0.3 }, { parallel: [summit(s => s.cannonAtGiant()), [{ wait: 0.15 }, { parallel: [{ camera: C.talk, duration: 0.45 }, { zoom: 1, duration: 0.45 }] }]] }]] },
  { wait: 0.6 },
  // 가재맨이 빠져나와 위로 살짝, 청소년이 주먹을 날리게 조종 → 왼쪽에서 쥰희가 달려와 막는다
  summit(s => s.gajaemanOut()), { wait: 0.5 },
  ...PARTY.map(id => ({ face: id, dir: 'right' })),
  // 가재맨이 빠져나가자 청소년이 일행 쪽으로 천천히 쓰러진다 → 일행 느낌표·놀라 뒷걸음·확대 → 거의 다 쓰러졌을 때 쥰희가 달려들어 받친다
  summit(s => s.topple()),
  { parallel: [
    { zoom: 1.3, at: [1700, 330], duration: 1.2 },
    ...PARTY.map(id => ({ emote: id, kind: '!', duration: 1.0, hold: 0.6 })),
    ...PARTY.map(id => ({ move: id, by: [-1, 0], speed: 60, facing: 'right' })),
  ] },
  summit(s => s.toppleAt(0.84)), { wait: 0.3 },
  { action: game => { const j = game.entities.find(e => e.id === 'finale_junhee'); if (j) { j.x = 1590; j.y = 392 - j.h; j.visible = true; } } },
  { move: 'finale_junhee', rel: 'finale_stop_junhee', at: 'bottom', by: [0, 0], dash: true, facing: 'right' },
  summit(s => s.brace()), { face: 'finale_junhee', dir: 'right' }, { wait: 1.2 },
  { zoom: 1, duration: 0.8 }, { wait: 0.3 },
  P('?! 타코'), K('너까지 살아있었구나'),
  J('{shake}바보같은 소리하지마라 가재맨!!!!!{/shake}'), J('우리가 가재맨을 싫어한다고?'), J('우리가 너를 별볼일 없는 녀석이라고 생각한다고?'),
  J('지랄도 정도껏이지.'), J('우리의 밤을 항상 지켜주는건.'), J('{shake2}가재맨 바로 너란말이다!!!!!!!!{/shake2}'), close,
  // 천천히 밀다가 릴리즈샷과 함께 펑! 화면이 잠깐 하얘지고 청소년이 뒤로 넘어간다
  summit(s => s.pushBack()), { wait: 0.6 },
  { emote: 'summit_gajaeman', kind: '!', duration: 1.0, hold: 0.6 }, { wait: 0.6 }, A('...'), close, { wait: 0.4 },
  summit(s => s.gajaemanFlee()),
  { camera: C.talk, duration: 0.8 },
  { face: 'finale_junhee', dir: 'left' }, J('앞을 부탁한다.. 너네들,,,'), close, summit(s => s.collapse('finale_junhee')),
  YC('이번엔 내가 맡지!'), close,
  // 다시 카메라가 뒤로 — 영클과 편집노조가 달려와 일행 곁에 멈춘다(겹치지 않게 자리 따로)
  ...['finale_youngcle', 'finale_bidet', 'finale_mario', 'finale_ttuulla', 'finale_park'].map(id => ({ show: id })),
  { camera: C.back, duration: 1.6 },
  { parallel: [['youngcle', 0], ['bidet', 0.15], ['mario', 0.3], ['ttuulla', 0.45], ['park', 0.6]].map(([n, d]) => [{ wait: d },
    { move: `finale_${n}`, rel: `finale_stop_${n}`, at: 'bottom', by: [0, 0], run: true, axis: 'x', facing: 'right' },
    { move: `finale_${n}`, rel: `finale_stop_${n}`, at: 'bottom', by: [0, 0], run: true, axis: 'y', facing: 'right' }]) },
  ...PARTY.map(id => ({ face: id, dir: 'left' })),
  K('영클아 그리고 너희들..'),
  YC('빨리 쫒아가자 이딴 상처 아무것도 아님.'), close,
  // 영클, 이어서 편집노조가 점프해서 오른쪽으로 쭉
  { camera: C.talk, duration: 0.6 },
  // 한 명씩 차례로 달려가 부서진 끝에서 뛰어내린다(아래로 떨어져 사라진다)
  { parallel: ['finale_youngcle', 'finale_bidet', 'finale_mario', 'finale_ttuulla', 'finale_park'].map((id, i) => [{ wait: i * 0.45 },
    { move: id, px: [1726, 380], run: true, facing: 'right' }, summit(s => s.leapOff(id))]) },
  { wait: 0.6 },
  { set: { castle_teen_finale_seen: true } },
  { label: 'end' }, { end: true },
], { silent: true });
