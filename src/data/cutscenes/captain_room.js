import { shipPursuitBacktrack } from '../scripts/ship-pursuit.js';

const E = text => ({ speaker: '김은별컴퍼니', voice: 'eunbyeol', text: '* ' + text });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const encouragement = E('제발 부탁드립니다. 간곡히 바라고있습니다. 응원할게요.');

export const maillard_eunbyeol = Object.assign([
  { if: f => f.maillard_eunbyeol_seen, goto: 'repeat' },
  E('안냐세여 ~ 반갑다꽁'),
  P('오 은별님 안녕하세요'),
  E('반갑다룽룽 머하고 있었냐꽁?'),
  P('아 저희 선장실 가고있어요'),
  { camera: 'captain_door_image' },
  E('선장실은 여기다룽~ 다른곳 다 둘러보고 오는걸 추천한다꽁'),
  { camera: 'player' },
  P('오호 그렇군요'),
  E('근데 선장실은 왜가는거냐룽?'),
  P('쥰희족치러요'),
  encouragement,
  P('... 네'),
  { set: { maillard_eunbyeol_seen: true } },
  { end: true },
  { label: 'repeat' },
  encouragement,
], { silent: true });

export const maillard_captain_enter = Object.assign([
  { if: flags => flags.captain_attack_done, goto: 'pursuit' },
  { voice: 'narrator', text: '* 선장실 문이다.' },
  { voice: 'narrator', text: '* ... 여기로 들어가면 뭔가 어떤 사건이 벌어질거같다.' },
  { voice: 'narrator', text: '* 라운지를 다 둘러보셨나요? 상점에 {c=yellow}공격력/체력 증가 아이템{/c} 구입은 하셨나요? 라고 적혀있다' },
  { voice: 'narrator', text: '* 그럼에도.. 들어갈까?',
    choice: { options: [{ label: '네', goto: 'enter' }, { label: '아니오', goto: 'end' }], cancel: 1 } },
  { label: 'enter' },
  { sfx: 'plug' },
  { fade: 'out', duration: 0.25 },
  { map: 'maillard_captain', spawn: 'start' },
  { fade: 'in', duration: 0.25 },
  { action: game => {
    const finishEntry = game.dialogue.onEnd;
    game.dialogue.onEnd = () => {
      finishEntry?.();
      if (game.flags.captain_reveal_done) game.resumeMapBgm();
      game.runMapEnter();
    };
  } },
  { label: 'end' },
  { end: true },
  { label: 'pursuit' },
  ...shipPursuitBacktrack,
  { end: true },
], { silent: true });
