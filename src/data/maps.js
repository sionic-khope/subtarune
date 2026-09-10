// ─────────────────────────────────────────────────────────────
// 맵 데이터.
//  - 이미지 맵: { image, walkable:[[x,y,w,h]...], solids:[[x,y,w,h]...] }  (논리 px, 화면 480x360 기준)
//  - 타일 맵:   { rows:[...] } 글자 = 타일(src/world/tiles.js)
// 엔티티 좌표는 논리 px. spawns 는 문/워프 도착 지점.
// ─────────────────────────────────────────────────────────────
import { TILE as T } from '../world/tiles.js';
const at = (tx, ty) => ({ x: tx * T + T * 0.125, y: ty * T + T * 0.5 });   // 타일 좌표 → 발밑 히트박스 위치
const box = (n = 0.75) => ({ w: T * n, h: T * n });                        // 상호작용 박스
const rect = (x, y, w, h) => ({ x, y, w, h });

export const MAPS = {
  // ── 형섭의 방 (우이동) — 델타룬 실제 방 배경 (assets/maps/room.png, 480x392) ──
  room: {
    name: '우이동',
    image: 'assets/maps/room.png',
    // 바닥: 벽 아래(y 96)부터 y 322, 복도 x 210~290 y 322~392
    walkable: [[4, 126, 472, 196], [210, 300, 80, 92]],
    // 가구 (왼쪽 책상 / 오른쪽 책상 / 침대(형섭) / 컴퓨터 / 수레)
    solids: [[102, 96, 96, 62], [292, 96, 96, 62], [382, 96, 96, 140], [4, 258, 96, 66], [396, 256, 74, 66]],
    spawns: {
      bed: { x: 419, y: 160 },       // 오른쪽 침대 위 (누운 채 시작)
      door: { x: 238, y: 300 },
    },
    entities: [
      { type: 'sign', ...rect(4, 258, 96, 66), script: 'room_computer' },          // 컴퓨터
      { type: 'sign', ...rect(382, 96, 96, 140), script: 'room_bed' },             // 형섭 침대 (+ 위 선반)
      { type: 'sign', ...rect(102, 96, 96, 62), script: 'room_desk' },             // 책상
      { type: 'sign', ...rect(292, 96, 96, 62), script: 'room_desk2' },
      { type: 'sign', ...rect(396, 256, 74, 66), script: 'room_wagon' },
      { type: 'trigger', ...rect(210, 372, 80, 16), once: false, script: 'room_door' },   // 문(복도 끝)
    ],
  },

  // ── 개발용 테스트룸: 모든 인터랙션 모음. 타이틀에서 T 또는 ?map=test ──
  test: {
    name: '테스트룸',
    seed: 99,
    rows: [
      '########################',
      '#W.....W......W.......W#',
      '#......................#',
      '#..S...C...S...S...S...#',
      '#......................#',
      '#..S...................#',
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
      { type: 'door', ...at(11, 14), y: 14 * T + T * 0.6, to: 'room', spawn: 'door' },
      { type: 'sign', ...at(3, 3),  ...box(), script: 'test_help' },
      { type: 'sign', ...at(11, 3), ...box(), script: 'test_effects' },
      { type: 'sign', ...at(15, 3), ...box(), script: 'test_choice' },
      { type: 'sign', ...at(19, 3), ...box(), script: 'test_switch' },
      { type: 'sign', ...at(3, 5),  ...box(), script: 'test_battle_preview' },
      { type: 'sign', ...at(15, 5), ...box(), script: 'test_choice_slow' },     // 선택지 하나씩 천천히
      { type: 'sign', ...at(19, 5), ...box(), script: 'test_choice_locked' },   // 고를 수 없는 선택지 → 대사가 끊음
      { type: 'chest', ...at(7, 3), ...box(), flag: 'chest_test', script: 'chest_test' },
      { type: 'sign', ...at(6, 7), ...box(), script: 'test_hyungsub' },   // 거울(형섭은 플레이어 본인)
      { type: 'npc', id: 'gyeongsub', sprite: 'gyeongsub', ...at(11, 9), facing: 'down', wander: 0,  script: 'test_gyeongsub' },
      { type: 'npc', id: 'ppaman',    sprite: 'ppaman',    ...at(16, 7),  facing: 'down', wander: 20, script: 'test_ppaman' },
      { type: 'npc', id: 'junhee',    sprite: 'junhee',    ...at(19, 11), facing: 'left', wander: 12, script: 'test_junhee' },
      { type: 'trigger', ...at(11, 6), w: T * 1.75, h: T * 0.5, once: false, script: 'test_cutscene' },
    ],
  },
};
