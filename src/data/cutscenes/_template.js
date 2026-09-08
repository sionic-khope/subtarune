// ─────────────────────────────────────────────────────────────
// 컷신 템플릿. 복사해서 이름 바꾸고 src/data/scripts.js 에 등록:
//   import { myScene } from './cutscenes/my_scene.js';   →  SCRIPTS.my_scene = myScene
// 트리거 방법: 맵 entities 에 { type:'trigger', once:true, flag:'my_scene_seen', script:'my_scene' }
//              또는 NPC script:'my_scene', 또는 코드에서 game.runScript('my_scene')
// 노드 레퍼런스: src/ui/cutscene.js 상단 주석 / .claude/skills/cutscene/SKILL.md
// ─────────────────────────────────────────────────────────────
const N = (text, extra = {}) => ({ style: 'narration', voice: 'none', speed: 0.6, text, ...extra });

export const myScene = Object.assign([
  // 1) 셋업 — 카메라/엔티티 배치
  { camera: [10, 6], duration: 1.2 },
  { spawn: { type: 'npc', id: 'guest', sprite: 'guard', x: 12 * 32 + 4, y: 3 * 32 + 16, facing: 'down' } },

  // 2) 연출 — 이동/대사 섞기. parallel 로 동시 동작
  { parallel: [
    { move: 'guest', to: [10, 5] },
    { move: 'player', by: [-16, 0], run: true },
  ] },
  { face: 'player', dir: 'toward:guest' },
  { speaker: '경비병', portrait: 'guard', voice: 'robot', text: '* 거기 서.' },
  {
    speaker: '경비병', portrait: 'guard', voice: 'robot', text: '* 신분증 있나?',
    choice: { options: [{ label: '있다', goto: 'yes' }, { label: '없다', goto: 'no' }], cancel: 1 },
  },
  { label: 'yes' }, { text: '* 통과.', voice: 'robot' }, { goto: 'end' },
  { label: 'no' },  { shake: 0.3 }, { text: '* {shake}수상하군.{/shake}', voice: 'robot' },

  // 3) 정리 — 카메라 복귀, 플래그
  { label: 'end' },
  { camera: 'player' },
  { remove: 'guest' },
  { set: { my_scene_seen: true } },
], { silent: true });
