// 박용준 히든 보스 진입(BUILD462 사용자 브리핑 2026-10-15, 대사 원문 그대로): 마이야르호 라운지 상점에서 용준에게 보라꽃을 팔면(YONGJUN_SALE_EVENTS)
//   상점 화면이 검게 닫히고 → 용준이 상점 문 앞에 나와 있고 일행이 그 앞에 선다 → 보라꽃을 먹은 용준 → (브금꺼짐) → 오오옥 → 크크크
//   → “마이야르 쥰희 때 가재맨 처음 등장 보라색 오라”(captain_reveal 의 { bgm:'captain_reveal' } + darkSmoke swell, 오라 색 CAPTAIN_AURA_COLORS)를 용준에게
//   → 끔찍한 시간을 보내게해주지 → 전투 진입(battleEntry) → 박용준 전투(yongjun_sans) → 라운지로 복귀
import { battleEntry } from './helpers.js';
import { CAPTAIN_AURA_COLORS } from './captain_reveal.js';
import { YONGJUN_SANS } from '../yongjun-sans.js';
import { raisePartyMaxHp } from '../../core/shop.js';

const Y = text => ({ speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* ' + text });
const P = text => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* ' + text });
const G = text => ({ speaker: '경섭', portrait: 'gyeongsub', voice: 'gyeongsub', text: '* ' + text });
export const YONGJUN_FLOWER_ACTOR = 'yongjun_flower_boss';
const PARTY = ['ppaman', 'player', 'gyeongsub'];
const actor = (game, id) => id === 'player' ? game.player : game.entities.find(entity => entity.id === id && !entity.dead);

/** 검은 화면 아래에서: 용준은 상점 문 바로 앞, 일행은 그 아래 한 줄(억빠맨·형섭·경섭)로 용준을 본다 */
export function stageYongjunFlower(game) {
  const door = actor(game, 'lounge_shop_door'), yongjun = actor(game, YONGJUN_FLOWER_ACTOR);
  if (!door || !yongjun) return;
  const cx = door.x + door.w / 2;
  yongjun.x = Math.round(cx - yongjun.w / 2); yongjun.y = Math.round(door.y + door.h + 2); yongjun.facing = 'down'; yongjun.visible = true;
  PARTY.forEach((id, index) => {
    const member = actor(game, id); if (!member) return;
    member.x = Math.round(cx + (index - 1) * 56 - member.w / 2); member.y = Math.round(yongjun.y + yongjun.h - member.h + 64);
    member.facing = 'up'; member.moving = false;
  });
  if (game.camera) { game.camera.target = game.player; game.camera.locked = false; game.camera.snap?.(); }
}

export const yongjun_flower = Object.assign([
  { spawn: { type: 'npc', id: YONGJUN_FLOWER_ACTOR, sprite: 'yongjun', x: 0, y: 0, facing: 'down', wander: 0, solid: false, hidden: true } },
  { action: game => { stageYongjunFlower(game); game.sound.preloadBgm('captain_reveal'); game.sound.preloadBgm(YONGJUN_SANS.birds); } },
  { wait: 0.2 },
  { fade: 'in', duration: 0.5 },
  Y('오 형 이게 뭐에요?'),
  Y('보라꽃..? 헤헤 냄새 좋다.'),
  P('그거처먹고 냄새 없애샘'),
  Y('네 형님 헤헤 우적우적... 욱...'),
  { bgm: null, fadeOut: 1.2 },
  { wait: 1.4 },
  Y('... 오..'),
  P('..?'),
  { tremble: YONGJUN_FLOWER_ACTOR, duration: 3.2, amp: 2 },
  Y('... 오오옥.. 옥.. 옥 오곡ㄱ 옥 옥ㅇ 오옥옥'),
  P('뭐야'),
  Y('크크크...'),
  { bgm: 'captain_reveal' },
  { parallel: [
    { darkSmoke: { mode: 'swell', from: YONGJUN_FLOWER_ACTOR, duration: 3.4, veil: 0.4, aura: { at: YONGJUN_FLOWER_ACTOR, colors: CAPTAIN_AURA_COLORS } } },
    { async: [{ wait: 0.8 }, { parallel: [{ emote: 'ppaman', kind: '!', duration: 1.0, hold: 0.5 }, { emote: 'gyeongsub', kind: '!', duration: 1.0, hold: 0.5 }, { emote: 'player', kind: '!', duration: 1.0, hold: 0.5 }] }] },
  ] },
  { darkSmoke: { mode: 'cloak', from: YONGJUN_FLOWER_ACTOR, duration: 1.8 } },
  Y('형님들... 지금까지 저.. 켁켁... 고아라고 놀리시고... 뚱땡이라고 놀리셨죠...'),
  { face: 'gyeongsub', dir: 'left' },
  G('이거 뭐냐 빠맨아'),
  { face: 'ppaman', dir: 'right' },
  P('저 꽃 먹였어요'),
  G('어..'),
  { face: 'gyeongsub', dir: 'up' },
  { face: 'ppaman', dir: 'up' },
  Y('형님들.. 저 무시 그만하십시요'),
  P('뭐? 너 미쳤냐?'),
  Y('억빠맨 닥쳐'),
  P('?'),
  Y('좆밥새끼.'),
  Y('끔찍한 시간을 보내게해주지'),
  ...battleEntry(['yongjun_sans'], YONGJUN_SANS.birds),
  { darkSmoke: null },
  { remove: YONGJUN_FLOWER_ACTOR },
  { battle: { enemies: ['yongjun_sans'], bgm: YONGJUN_SANS.birds, bg: 'maillard_lounge', flag: 'yongjun_sans_won' } },
  { bgm: 'maillard_lounge' },
  { zoom: 1, duration: 0 },
  { camera: 'player' },
  { regroup: true },
  // 승리하면 다시 상점 화면(사용자 “승리시에 다시 정상 상점 화면으로 돌아오고 … 이러고 다시 상점뷰로 정상화”) — 대사가 끝나면 평소 상점 메뉴
  { action: game => game.openShop(yongjun_flower_after) },
], { silent: true });

const SY = text => ({ speaker: '박용준', voice: 'yongjun', text: '* ' + text });
/** 상점 화면 안 대사(용준 = 상점 패널, 억빠맨·나레이션 = 대화창). 오마카세는 아이템이 아니라 팀 전체 최대 HP +10 을 바로 적용 */
export const yongjun_flower_after = Object.assign([
  SY('윽 으윽'),
  SY('아 형님들... 구해주셔서 감사합니다 이 꽃 뭐죠?'),
  P('ㅗ'),
  SY('아 빠맨이형 ㅎㅎ'),
  SY('어쨋든 이 꽃은 제가 폐기처분 하겠습니다'),
  SY('죄송하니 다들 이거 하나씩 드세요'),
  { action: game => { raisePartyMaxHp(game, 10); game.setFlag('yongjun_omakase_eaten'); game.sound.sfx('item'); } },
  { voice: 'narrator', text: '* {c=yellow}박용준의 오마카세{/c}를 획득했다.{n}* 팀원들 전체 체력이 10 상승했다.' },
  P('이걸로 봐준다.'),
  { action: game => game.autosave() },
], { silent: true });
