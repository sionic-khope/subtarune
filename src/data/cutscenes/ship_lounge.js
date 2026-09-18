import { maillard_spring } from './maillard_lounge.js';

export const shipLoungeScripts = {
  ship_lounge_return: [
    { text: '* 조종실로 이어지는 사다리다.{n}* 올라갈까?', voice: 'narrator',
      choice: { options: [{ label: '예', goto: 'yes' }, { label: '아니오', goto: 'no' }], cancel: 1 } },
    { label: 'yes' },
    { action: game => game.textbox.close() },
    { bgm: null, fadeOut: 0.4 },
    { fade: 'out', duration: 0.5 },
    { map: 'youngcle20', spawn: 'from_lounge', enter: true },
    { fade: 'in', duration: 0.5 },
    { end: true },
    { label: 'no' },
    { end: true },
  ],
  ship_lounge_door: [
    { camera: [12, 5.625], duration: 1.2 },
    { text: '* 웅장한 보라색 문이다.{n}* 아직 열리지 않는다.', voice: 'narrator' },
    { camera: 'player', duration: 1.2 },
  ],
  ship_lounge_spring: Object.assign([
    { text: '* 조용한 샘물이 전투의 열기를 식혀 준다.', voice: 'narrator' },
    ...maillard_spring,
  ], { silent: true }),
  ship_lounge_youngcle: [
    { speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: '* 여기서 좀 쉬셈.{n}* 할 일은 아직 남았지만 ㅇㅇ' },
  ],
  ship_lounge_junhee: [
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* 배 안에 이런 곳도 있었군.{n}* 숨 좀 돌리고 가자고.' },
  ],
  ship_lounge_yongjun: [
    { speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 형님들 먼저 둘러보세요.{n}* 저는 아직 온몸이 쑤셔서...' },
  ],
  ship_lounge_naram: [
    { speaker: '나람이', portrait: 'naram', voice: 'naram', text: '* 안녕하세요.{n}* 근데 해야 할 일이 있지 않아영?' },
  ],
  ship_lounge_obangsun: [
    { speaker: '오방순', portrait: 'obangsun', voice: 'obangsun', text: '* 흐에에... 여기 좋네요.{n}* 샘물부터 마시고 가요.' },
  ],
  ship_lounge_ttuulla: [
    { speaker: '뚜울라', portrait: 'ttuulla', voice: 'ttuulla', text: '* 여긴 쉬는 곳입니다.{n}* 다음 무대 준비도 해야 하니까요.' },
  ],
  ship_lounge_warm_bidet: [
    { speaker: '따듯한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: '* 어서 오세요.{n}* 쉬고 나면 할 일도 잊지 마시고요.' },
  ],
  ship_lounge_park_guardian: [
    { speaker: '파크가디언', portrait: 'park_guardian', voice: 'park_guardian_costume', text: '* 훗훗... 여기선 안 싸워요.{n}* 라운지는 다 같이 쓰는 거라구요.' },
  ],
  ship_lounge_mini_mario: [
    // 마리오 점프 소리(2026-09-18 사용자 “마리오 점프는 마리오 점프 소리가 나야지”): 기존 sfx/mario_jump.mp3(SMB Jump small)
    { hop: 'lounge_mini_mario', by: [0, 0], height: 24, duration: 0.5, keep: true, sfx: 'mario_jump' },
  ],
};
