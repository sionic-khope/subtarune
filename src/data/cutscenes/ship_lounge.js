import { maillard_spring } from './maillard_lounge.js';

const afterRescue = (before, after) => [
  { if: flags => flags.ship_lounge_briefed, goto: 'rescued' },
  ...before, { end: true }, { label: 'rescued' }, ...after,
];

export const shipLoungeScripts = {
  ship_lounge_return: [
    { if: flags => flags.choimis_rescued, goto: 'blocked' },
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
    { label: 'blocked' },
    { text: '* 지금은 라운지에서 준비하자.', voice: 'narrator' },
  ],
  ship_lounge_door: afterRescue([
    { camera: [12, 5.625], duration: 1.2 },
    { text: '* 웅장한 보라색 문이다.{n}* 아직 열리지 않는다.', voice: 'narrator' },
    { camera: 'player', duration: 1.2 },
  ], [{ text: '* 보라색 문은 여전히 굳게 닫혀 있다.{n}* 옆에는 최미스가 단단히 묶여 있다.', voice: 'narrator' }]),
  ship_lounge_spring: Object.assign([
    { text: '* 조용한 샘물이 전투의 열기를 식혀 준다.', voice: 'narrator' },
    ...maillard_spring,
  ], { silent: true }),
  ship_lounge_youngcle: afterRescue([
    { speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: '* 여기서 좀 쉬셈.{n}* 할 일은 아직 남았지만 ㅇㅇ' },
  ], [{ speaker: '영클', portrait: 'youngcle', voice: 'youngcle', text: '* 준비됨?',
    choice: { delay: 0.6, cancel: 1, options: [{ label: '네', set: { ship_invasion_ready: true } }, { label: '아니요' }] } }]),
  ship_lounge_junhee: afterRescue([
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* 배 안에 이런 곳도 있었군.{n}* 숨 좀 돌리고 가자고.' },
  ], [
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* 아니 내 무기 설명 아직 안 끝났는데.{n}* 이름부터가 장난 아니라니까?' },
    { motion: 'lounge_return_junhee', name: 'laugh', sfx: 'laugh_junhee' },
    { bubble: 'lounge_return_junhee', dots: 3, gap: 0.2, hold: 0.6 },
    { speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: '* ...아무튼 내일 보면 알아.' },
  ]),
  ship_lounge_yongjun: afterRescue([
    { speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 형님들 먼저 둘러보세요.{n}* 저는 아직 온몸이 쑤셔서...' },
  ], [{ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 구조는 서비스, 회복템은 10원입니다 ㅋㅋ' }]),
  ship_lounge_naram: afterRescue([
    { speaker: '나람이', portrait: 'naram', voice: 'naram', text: '* 안녕하세요.{n}* 근데 해야 할 일이 있지 않아영?' },
  ], [{ speaker: '나람이', portrait: 'naram', voice: 'naram', text: '* 무기가 8억 개면 재고는 누가 세나영?{n}* 저는 안 셀 거예영.' }]),
  ship_lounge_obangsun: afterRescue([
    { speaker: '오방순', portrait: 'obangsun', voice: 'obangsun', text: '* 흐에에... 여기 좋네요.{n}* 샘물부터 마시고 가요.' },
  ], [{ speaker: '오방순', portrait: 'obangsun', voice: 'obangsun', text: '* 흐에에... 내일 출발이면 오늘은 쉬어요.{n}* 최미스는 저기서 쉬나 봐요.' }]),
  ship_lounge_ttuulla: afterRescue([
    { speaker: '뚜울라', portrait: 'ttuulla', voice: 'ttuulla', text: '* 여긴 쉬는 곳입니다.{n}* 다음 무대 준비도 해야 하니까요.' },
  ], [
    { speaker: '뚜울라', portrait: 'ttuulla', voice: 'ttuulla', text: '* 출정곡은 준비됐습니다.{n}* 하나, 둘!' },
    { hop: 'lounge_ttuulla', by: [0, 0], height: 5, duration: 0.3, keep: true, sfx: 'jump' },
    { hop: 'lounge_ttuulla', by: [0, 0], height: 9, duration: 0.45, keep: true, sfx: 'jump' },
    { speaker: '뚜울라', portrait: 'ttuulla', voice: 'ttuulla', text: '* 이번엔 박자 틀리면 포탄이 나가요.' },
  ]),
  ship_lounge_warm_bidet: afterRescue([
    { speaker: '따듯한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: '* 어서 오세요.{n}* 쉬고 나면 할 일도 잊지 마시고요.' },
  ], [{ speaker: '따듯한비데', portrait: 'warm_bidet', voice: 'warm_bidet', text: '* 침공 전에 마음부터 따뜻하게 하시죠.{n}* 수압은 전투용으로 맞춰 뒀습니다.' }]),
  ship_lounge_park_guardian: afterRescue([
    { speaker: '파크가디언', portrait: 'park_guardian', voice: 'park_guardian_costume', text: '* 훗훗... 여기선 안 싸워요.{n}* 라운지는 다 같이 쓰는 거라구요.' },
  ], [
    { speaker: '파크가디언', portrait: 'park_guardian', voice: 'park_guardian_costume', text: '* 훗훗, 성에서도 공연해도 되나요?' },
    { hop: 'lounge_park_guardian', by: [0, 0], height: 7, duration: 0.4, keep: true, sfx: false },
    { speaker: '파크가디언', portrait: 'park_guardian', voice: 'park_guardian_costume', text: '* 인형탈은 이제 안 벗겨요.{n}* 단추도 두 번 잠갔지롱.' },
  ]),
  ship_lounge_mini_mario: [
    // 마리오 점프 소리(2026-09-18 사용자 “마리오 점프는 마리오 점프 소리가 나야지”): 기존 sfx/mario_jump.mp3(SMB Jump small)
    { hop: 'lounge_mini_mario', by: [0, 0], height: 24, duration: 0.5, keep: true, sfx: 'mario_jump' },
  ],
  ship_lounge_choimis_sealed: [
    { speaker: '최미스', portrait: 'choimis', voice: 'choimis', text: '* 형들... GAP티 늘어나요...' },
    { text: '* 단단히 묶여 있다.{n}* 일단 탈출할 생각은 접은 것 같다.', voice: 'narrator' },
  ],
};
