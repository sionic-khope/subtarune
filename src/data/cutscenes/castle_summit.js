// BUILD337 사용자 브리핑(2026-09-25): 꼭대기 끝길의 대치. 대사·표기 원문 그대로. 전투는 아직 만들지 않는다(사용자 “일단 전투는 만들지마”).
import { TEEN_BATTLE } from '../teen-battle.js';

const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const K = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: `* ${text}` });
const A = text => ({ speaker: '가재맨', voice: 'gajaeman_shadow', text: `* ${text}` });
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
export const SUMMIT_SCENE = Object.freeze({ stage: 'castle_summit_ready', cam: { talk: at(...VIEW_CENTER), face: at(...VIEW_CENTER) } });
const C = SUMMIT_SCENE.cam;

export const castle_summit_confront = Object.assign([
  { if: flags => !!flags.castle_teen_won, goto: 'end' },
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
  P('가볼까요.'), K('가자!'), close,
  { stage: SUMMIT_SCENE.stage },
  // 그 자리에서 바로 전투: 조우음 없이 검 뽑는 소리(사용자 “조우 효과음은 없고 그냥 바로 검뽑기 효과음과 함께”) — 소리는 전투가 캐릭터를 전투 모션으로 바꾸는 순간 낸다(battle.js)
  { label: 'fight' },
  // 브금이 잠깐 꺼지고 1초 뒤 검 뽑는 소리와 함께 전투로 → 그 뒤 전투 브금(사용자 2026-09-25)
  { action: game => game.sound.preloadBgm?.('guardian') }, { bgm: null, fadeOut: 0.4 }, { wait: 1.0 },
  { battle: { enemies: ['teen_giant'], bgm: 'guardian', bg: 'castle_summit', boardColor: '#a060ff', flag: 'castle_teen_won', seamlessIntro: true, seamlessSfx: 'weaponpull', intro: TEEN_BATTLE.intro } },
  { label: 'end' }, { end: true },
], { silent: true });
