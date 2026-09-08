// ─────────────────────────────────────────────────────────────
// 맵 데이터. rows 의 글자 = 타일(src/world/tiles.js 레지스트리).
// 엔티티 좌표는 픽셀 단위 (타일 16px). spawns 는 문/워프 도착 지점.
// ─────────────────────────────────────────────────────────────
import { TILE as T } from '../world/tiles.js';
const at = (tx, ty) => ({ x: tx * T + T * 0.125, y: ty * T + T * 0.5 });   // 타일 좌표 → 발밑 히트박스 위치
const box = (n = 0.75) => ({ w: T * n, h: T * n });                        // 상호작용 박스

export const MAPS = {
  // 오프닝: 우이동 반지하
  room: {
    name: '반지하',
    seed: 11,
    rows: [
      '############',
      '####W####W##',
      '#B.........#',
      '#B....==...#',
      '#K....==...#',
      '#..........#',
      '#..........#',
      '#.....D....#',
      '############',
    ],
    spawns: {
      bed: at(2, 2),
      door: at(6, 6),
    },
    entities: [
      { type: 'door', ...at(6, 7), y: 7 * T + T * 0.6, to: 'village', spawn: 'start' },
    ],
  },

  // 개발용 테스트룸: 모든 인터랙션 모음. 접속: ?map=test  또는 마을 오른쪽 위 문
  test: {
    name: '테스트룸',
    seed: 99,
    rows: [
      '########################',
      '#W.....W......W.......W#',
      '#......................#',
      '#..S...C...S...S...S...#',
      '#......................#',
      '#......................#',
      '#..........==..........#',
      '#..........==..........#',
      '#......................#',
      '#..~~~.................#',
      '#..~~~....K............#',
      '#......................#',
      '#..B...................#',
      '#......................#',
      '#..........D...........#',
      '########################',
    ],
    spawns: { start: at(11, 12) },
    entities: [
      { type: 'door', ...at(11, 14), y: 14 * T + T * 0.6, to: 'village', spawn: 'fromTest' },
      // 팻말들 (왼→오): 안내 / 텍스트 효과 / 선택지 / 캐릭터 교체
      { type: 'sign', ...at(3, 3),  ...box(), script: 'test_help' },
      { type: 'sign', ...at(11, 3), ...box(), script: 'test_effects' },
      { type: 'sign', ...at(15, 3), ...box(), script: 'test_choice' },
      { type: 'sign', ...at(19, 3), ...box(), script: 'test_switch' },
      { type: 'chest', ...at(7, 3), ...box(), flag: 'chest_test', script: 'chest_house' },
      // 새 캐릭터 3인
      { type: 'npc', id: 'hyungsub',  sprite: 'hyungsub',  ...at(6, 7),  facing: 'down', wander: 20, script: 'test_hyungsub' },
      { type: 'npc', id: 'gyeongsub', sprite: 'gyeongsub', ...at(11, 9), facing: 'down', wander: 0,  script: 'test_gyeongsub' },
      { type: 'npc', id: 'ppaman',    sprite: 'ppaman',    ...at(16, 7), facing: 'down', wander: 20, script: 'test_ppaman' },
      // 컷신 트리거 (러그 위) — 카메라/이동/parallel/shake 데모
      { type: 'trigger', ...at(11, 6), w: T * 1.75, h: T * 0.5, once: false, script: 'test_cutscene' },
    ],
  },

  village: {
    name: '호롱마을',
    seed: 7,
    rows: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      "T,,,,,,,,,,,,T,,,,,,,,,,,,,,,T",
      "T,,'',,,,,,,,,,,,,,,,,'',,,,,T",
      "T,,,,,,,###D###,,,,,,,,,,,,,,T",
      "T,,,,,,,#######,,,,,,,T,,,,,,T",
      "T,,T,,,,,,,_,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,_,,,,,,S,,,,,S,,,,T",
      "T,,,,,,,,,,_,,,,,,,,,,,,,,,,,T",
      "T,,,'',,___________________,,T",
      "T,,,,,,,,,,_,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,_,,,,,,,,,,,,'',,,T",
      "T~~~~,,,,,,_,,,,,,,,,,,,,,,,,T",
      "T~~~~~,,,,,_,,,,,,T,,,,,,,,,,T",
      "T~~~~~~,,,,_,,,,,,,,,,,,,,,,,T",
      "T~~~~~~~,,,_,,,,,,,,,,,,,,,,,T",
      "T~~~~~~~~,,_,,,,,,,,,,T,,,,,,T",
      "T~~~~~~~,,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,'',,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,T",
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    spawns: {
      start: at(11, 9),
      fromHouse: at(11, 4),
      fromTest: at(26, 5),
    },
    entities: [
      { type: 'door', ...at(11, 3), y: 3 * T + T * 0.25, to: 'house', spawn: 'entrance' },
      { type: 'door', ...at(26, 3), y: 3 * T + T * 0.25, to: 'test', spawn: 'start' },
      { type: 'sign', ...at(24, 5), ...box(), script: 'sign_test' },
      { type: 'sign', ...at(18, 6), ...box(), script: 'sign_village' },
      { type: 'npc', id: 'merchant', sprite: 'merchant', ...at(14, 7), facing: 'down', wander: 24, script: (f) => (f.chest_house ? 'merchant_after' : 'merchant') },
      { type: 'npc', id: 'cat', sprite: 'cat', ...at(23, 12), facing: 'left', script: 'cat' },
      { type: 'npc', id: 'guard', sprite: 'guard', ...at(4, 16), facing: 'right', script: 'guard' },
      { type: 'trigger', ...at(11, 8), w: T * 0.75, h: T * 0.5, once: true, flag: 'intro_seen', script: 'intro' },
    ],
  },

  house: {
    name: '상인의 집',
    seed: 3,
    rows: [
      '################',
      '#..............#',
      '#..C...........#',
      '#..............#',
      '#.....====.....#',
      '#.....====.....#',
      '#.....====.....#',
      '#..............#',
      '#..............#',
      '#......D.......#',
      '################',
    ],
    spawns: {
      entrance: at(7, 8),
    },
    entities: [
      { type: 'door', ...at(7, 9), y: 9 * T + T * 0.6, to: 'village', spawn: 'fromHouse' },
      { type: 'chest', ...at(3, 2), ...box(), flag: 'chest_house', script: 'chest_house' },
      { type: 'npc', id: 'ghost', sprite: 'ghost', ...at(11, 5), facing: 'left', script: (f) => (f.ghost_talked ? 'ghost_again' : 'ghost') },
    ],
  },
};
