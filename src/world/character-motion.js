import { makeCanvas, loadImageOptional } from '../core/gfx.js';
import { makeTransparentFrame, playbackFrameAt } from '../ui/battle-preview.js';
import { CHARACTER_MOTIONS } from '../data/character-motions.js';

/** NPC의 대기·춤처럼 대사 중에도 계속되는 동작을 시작한다. */
export function loopCharacterMotion(entity, definition, options = {}) {
  if (!definition?.frames?.length) { entity.motion = null; return; }
  entity.motion = { ...definition, ...options, loop: true, elapsed: 0, index: 0 };
  entity.moving = false;
}

/** 반복 동작은 NPC가, 일회성 동작은 컷신 waiter가 각각 한 번만 갱신한다. */
export function updateLoopCharacterMotion(entity, dt) {
  const motion = entity.motion;
  if (!motion?.loop) return;
  motion.elapsed += dt;
  motion.index = playbackFrameAt(motion.frames, motion.elapsed, true).index;
}

/** 걷기 시트와 별개인 캐릭터 동작을 원본 해상도의 투명 프레임으로 캐시한다. */
export async function loadCharacterMotions(imageLoader = loadImageOptional, createCanvas = makeCanvas, names = Object.keys(CHARACTER_MOTIONS), selected = {}) {
  const motions = {};
  await Promise.all(names.filter(name => CHARACTER_MOTIONS[name]).map(async (character) => {
    const definitions = CHARACTER_MOTIONS[character];
    motions[character] = {};
    await Promise.all(Object.entries(definitions).filter(([name]) => !selected[character] || selected[character].includes(name)).map(async ([name, definition]) => {
      const image = await imageLoader(definition.src);
      if (!image) { console.warn(`[character-motion] 이미지 없음: ${definition.src}`); return; }
      motions[character][name] = {
        ...definition,
        frames: definition.frames.map((frame) => makeTransparentFrame(image, frame, definition.colorKey, createCanvas)),
      };
    }));
  }));
  return motions;
}

/** 컷신이 갱신하는 일회성 동작. 발 위치·방향·걷기 시트는 바꾸지 않는다. */
export function characterMotionWaiter(entity, definition) {
  const motion = { ...definition, elapsed: 0, index: 0 };
  entity.motion = motion;
  entity.moving = false;
  entity.frame = 0;
  entity.animPhase = 0;
  return {
    update(dt) {
      if (entity.motion !== motion || entity.dead) return true;
      motion.elapsed += dt;
      const state = playbackFrameAt(motion.frames, motion.elapsed, false);
      motion.index = state.index;
      if (state.ended) entity.motion = null;
      return state.ended;
    },
  };
}
