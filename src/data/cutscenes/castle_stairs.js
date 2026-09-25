// BUILD334 사용자 브리핑(2026-09-25): 무너지는 계단. 대사·표기 원문 그대로(“이얍!”은 브리핑의 기합).
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });
const J = text => ({ speaker: '쥰희', portrait: 'junhee', voice: 'junhee', text: `* ${text}` });
const PG = text => ({ speaker: '파크가디언', portrait: 'park_guardian_costume', voice: 'park_guardian_costume', text: `* ${text}` });
const T = text => ({ speaker: '뚜울라알라', portrait: 'ttuulla', voice: 'ttuulla', text: `* ${text}` });
const close = { action: game => game.textbox.close() };
const stairs = fn => ({ action: game => (game.castleStairs ? fn(game.castleStairs, game) : undefined) });
const at = (x, y) => [(x - 16) / 32, (y - 16) / 32];
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const surprise = ids => ({ parallel: ids.map(id => ({ emote: id, kind: '!', duration: 0.8, hold: 0.4 })) });
export const STAIRS_SCENE = Object.freeze({
  monsters: ['stairs_mon_blitzcrank', 'stairs_mon_darius', 'stairs_mon_fiddlesticks'],
  // 대사 구도: 위협(몬스터·누누)과 일행이 함께 대화창 위에 들어오게 조금 멀리서
  cam: { talk: at(1080, 2846), tackle: at(1080, 2820), talkNunu: at(520, 1300), fall: at(540, 1290) },
  // 동료들이 서는 자리: 조우 지점에서 길을 따라 이만큼 위(위협 바로 아래 계단)
  allyRow: { monsters: 24, nunu: 20 },
});
const C = STAIRS_SCENE.cam;

export const castle_stairs_monsters = Object.assign([
  { if: flags => !!flags.castle_stairs_monsters_done, goto: 'end' },
  close, stairs(s => s.pauseAllies(true)),
  // 한 구도(일행·동료·층계참)로 물러난 뒤 → 동료들이 계단에 나란히 → 층계참에 연기와 함께 몬스터가 하나씩 소환
  { parallel: [{ camera: C.talk, duration: 1.0 }, { zoom: 0.62, duration: 1.0 }, stairs(s => s.arrangeAllies(s.enc.monsters + STAIRS_SCENE.allyRow.monsters))] },
  stairs(s => s.showMonsters(STAIRS_SCENE.monsters)),
  surprise([...PARTY, 'stairs_park', 'stairs_ttuulla', 'stairs_junhee']),
  P('으윽,,,몬스터네요 어떡하죠.'), PG('...'), T('...'), close,
  { wait: 0.3 },
  PG('이얍!'), T('이얍!'), close,
  // 파크가디언과 뚜울라가 몸을 던져 몬스터들과 함께 계단 옆으로 떨어진다
  { parallel: [
    { camera: C.tackle, duration: 0.5 },
    stairs(s => s.tackle('stairs_park', ['stairs_mon_blitzcrank', 'stairs_mon_darius'], -1)),
    [{ wait: 0.18 }, stairs(s => s.tackle('stairs_ttuulla', ['stairs_mon_fiddlesticks'], 1))],
  ] },
  { wait: 0.5 },
  surprise(PARTY),
  P('윽 이런.. 고 고맙다..'), close,
  { zoom: 1, duration: 0.5 },
  { set: { castle_stairs_monsters_done: true } },
  stairs(s => s.pauseAllies(false)), { camera: 'player' },
  { label: 'end' }, { end: true },
], { silent: true });

export const castle_stairs_nunu = Object.assign([
  { if: flags => !!flags.castle_stairs_nunu_done, goto: 'end' },
  close, stairs(s => s.pauseAllies(true)),
  { parallel: [{ camera: C.talkNunu, duration: 1.0 }, { zoom: 0.55, duration: 1.0 }, stairs(s => s.arrangeAllies(s.enc.nunu + STAIRS_SCENE.allyRow.nunu))] },
  stairs(s => s.showNunu()), { wait: 0.4 },
  surprise([...PARTY, 'stairs_junhee']),
  J('잘... 부탁한다 너네들 살아서보자.'), J('이얍!'), close,
  // 쥰희가 누누와 윌럼프를 박치기해 함께 계단 옆으로 떨어진다
  { parallel: [{ camera: C.fall, duration: 0.5 }, stairs(s => s.junheeHeadbutt('stairs_junhee', 1))] },
  { wait: 0.5 },
  surprise(PARTY),
  { zoom: 1, duration: 0.5 },
  { set: { castle_stairs_nunu_done: true } },
  stairs(s => s.pauseAllies(false)), { camera: 'player' },
  { label: 'end' }, { end: true },
], { silent: true });
