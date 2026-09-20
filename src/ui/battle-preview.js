import { FONT } from './font.js';
import { BattleAction } from './battle-action.js';

function assertFrames(frames) {
  if (!Array.isArray(frames) || frames.length === 0) throw new TypeError('frame list must not be empty');
  if (frames.some((frame) => !Number.isFinite(frame.duration) || frame.duration <= 0)) {
    throw new TypeError('frame duration must be a positive number');
  }
}

/**
 * 지속 시간이 서로 다른 애니메이션 프레임 중 현재 프레임을 찾는다.
 * @param {{duration:number}[]} frames 프레임별 재생 시간(초)
 * @param {number} elapsed 재생 시작 뒤 지난 시간(초)
 * @param {boolean} loop 마지막 뒤 첫 프레임으로 반복할지 여부
 * @returns {{index:number, ended:boolean}}
 */
export function playbackFrameAt(frames, elapsed, loop) {
  assertFrames(frames);
  const total = frames.reduce((sum, frame) => sum + frame.duration, 0);
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  if (!loop && safeElapsed >= total) return { index: frames.length - 1, ended: true };

  const cursor = loop ? safeElapsed % total : safeElapsed;
  let boundary = 0;
  for (let index = 0; index < frames.length; index++) {
    boundary += frames[index].duration;
    if (cursor < boundary - Number.EPSILON * 8) return { index, ended: false };
  }
  return { index: frames.length - 1, ended: !loop };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`battle sprite load failed: ${src}`));
    image.src = src;
  });
}

function isChromaCandidate(data, offset, colorKey) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const magenta = Math.min(red, blue);
  const exact = red >= colorKey.rMin && green <= colorKey.gMax && blue >= colorKey.bMin;
  const fringe = magenta >= 48
    && green <= Math.max(colorKey.gMax + 40, magenta * 0.42)
    && red > green * 1.8
    && blue > green * 1.8
    && Math.abs(red - blue) <= 110;
  return exact || fringe;
}

/**
 * 이미지 가장자리의 마젠타 배경과 연결된 색상·안티앨리어싱 픽셀만 투명화한다.
 * 닫힌 실루엣 내부의 분홍색과 어두운 외곽선은 연결되지 않으므로 보존한다.
 */
export function clearExteriorChroma(data, width, height, colorKey) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (x, y) => {
    const index = y * width + x;
    if (visited[index] || !isChromaCandidate(data, index * 4, colorKey)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { enqueue(0, y); enqueue(width - 1, y); }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((dx === 0 && dy === 0) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        enqueue(x + dx, y + dy);
      }
    }
  }
  return tail;
}

/** 원본 해상도를 유지한 채 한 프레임의 외부 마젠타만 제거한다. */
export function makeTransparentFrame(image, definition, colorKey, createCanvas, preprocessed = false) {
  const [sx, sy, width, height] = definition.rect;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sx, sy, width, height, 0, 0, width, height);
  if (!preprocessed) {
    const pixels = ctx.getImageData(0, 0, width, height);
    clearExteriorChroma(pixels.data, width, height, colorKey);
    ctx.putImageData(pixels, 0, 0);
  }
  for (const rect of definition.exclude || []) ctx.clearRect(...rect);
  return { ...definition, image: canvas };
}

/**
 * 전투 아틀라스 한 캐릭터의 대기·공격·달리기 프레임을 투명 처리해 돌려준다 (미리보기·실전투 공용, 2026-09-10).
 * @returns {Promise<{idle, attack, run}|null>} 실패하면 null
 */
export async function loadActorFrames(definition, colorKey, createCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }, imageLoader = loadImage) {
  try {
    const runtime = definition.runtime;
    const [image, runImage] = await Promise.all([imageLoader(runtime?.src || definition.src), imageLoader(runtime?.run || definition.run.src)]);
    const prepare = (d) => makeTransparentFrame(image, d, colorKey, createCanvas, Boolean(runtime));
    let attackX = 0;
    return {
      idle: definition.idle.map(prepare),
      attack: definition.attack.map((d) => {
        if (!runtime) return prepare(d);
        const packed = { ...d, rect: [attackX, d.rect[1], d.rect[2], d.rect[3]] };
        attackX += d.rect[2];
        return prepare(packed);
      }),
      run: definition.run.frames.map((d) => makeTransparentFrame(runImage, d, colorKey, createCanvas, Boolean(runtime))),
    };
  } catch (e) { console.warn('[battle] 아틀라스 로드 실패', definition.src, e); return null; }
}

class BattleActor {
  constructor(id, definition, anchor, target) {
    this.id = id;
    this.definition = definition;
    this.anchor = anchor;
    this.frames = null;
    this.error = false;
    this.action = new BattleAction(anchor, target, definition.attack.reduce((sum, frame) => sum + frame.duration, 0));
  }

  get mode() { return this.action.mode; }
  get elapsed() { return this.action.elapsed; }

  reset() {
    this.action.reset();
  }

  attack() {
    if (!this.frames || this.error) return false;
    return this.action.start();
  }

  update(dt) {
    if (!this.frames) return;
    this.action.update(dt);
  }

  draw(ctx) {
    if (!this.frames) return;
    const running = this.mode === 'approach' || this.mode === 'return';
    const sequence = this.frames[running ? 'run' : this.mode];
    const { index } = playbackFrameAt(sequence, this.elapsed, this.mode !== 'attack');
    const frame = sequence[index];
    const [pivotX, pivotY] = frame.pivot;
    const scale = running ? this.definition.run.scale : this.definition.scale;
    const width = frame.image.width * scale;
    const height = frame.image.height * scale;
    ctx.save();
    ctx.translate(Math.round(this.action.position[0]), Math.round(this.action.position[1]));
    if (this.mode === 'return') ctx.scale(-1, 1);
    ctx.drawImage(
      frame.image,
      Math.round(-pivotX * scale),
      Math.round(-pivotY * scale),
      Math.round(width),
      Math.round(height),
    );
    ctx.restore();
  }
}

/**
 * 전투용 캐릭터 아틀라스를 실제 Canvas 화면에서 재생하는 독립 미리보기다.
 * 아틀라스는 open() 때 한 번만 불러오며 마젠타 제거 결과를 프레임별 Canvas로 캐시한다.
 */
export class BattlePreview {
  constructor({ sprites, preview, strings, onClose, imageLoader = loadImage, createCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    return canvas;
  } }) {
    this.preview = preview;
    this.strings = strings;
    this.onClose = onClose;
    this.imageLoader = imageLoader;
    this.createCanvas = createCanvas;
    this.actors = preview.ids.map((id, index) => new BattleActor(id, sprites[id], preview.anchors[index], preview.attackAnchor));
    this.selected = 0;
    this.active = false;
    this.loading = false;
    this.loadPromise = null;
  }

  /** 미리보기를 열고 아직 없는 전투 아틀라스 캐시를 지연 생성한다. */
  open() {
    this.active = true;
    this.selected = 0;
    for (const actor of this.actors) actor.reset();
    if (!this.loadPromise) this.loadPromise = this.load();
    return this.loadPromise;
  }

  /** 닫힌 상태로 되돌린다. 생성된 투명 프레임 캐시는 다음 열기에도 재사용한다. */
  close() {
    this.active = false;
    for (const actor of this.actors) actor.reset();
  }

  /** 각 캐릭터 아틀라스를 한 번만 읽고 대기·공격 프레임 캐시를 만든다. */
  async load() {
    this.loading = true;
    await Promise.all(this.actors.map(async (actor) => {
      try {
        const [image, runImage] = await Promise.all([
          this.imageLoader(actor.definition.src),
          this.imageLoader(actor.definition.run.src),
        ]);
        const prepare = (definition) => makeTransparentFrame(
          image,
          definition,
          this.preview.colorKey,
          this.createCanvas,
        );
        actor.frames = {
          idle: actor.definition.idle.map(prepare),
          attack: actor.definition.attack.map(prepare),
          run: actor.definition.run.frames.map((definition) => makeTransparentFrame(
            runImage, definition, this.preview.colorKey, this.createCanvas,
          )),
        };
      } catch (error) {
        actor.error = true;
        console.warn(`[battle-preview] ${actor.id} unavailable`, error);
      }
    }));
    this.loading = false;
  }

  /** 기존 Input 액션으로 선택·공격·필드 복귀를 처리한다. */
  update(dt, input) {
    if (!this.active) return;
    if (input.just('cancel')) { this.close(); this.onClose(); return; }
    const busy = this.actors.some((actor) => actor.mode !== 'idle');
    if (!busy) {
      if (input.just('left')) this.selected = (this.selected + this.actors.length - 1) % this.actors.length;
      if (input.just('right')) this.selected = (this.selected + 1) % this.actors.length;
      if (input.just('confirm')) this.actors[this.selected].attack();
    }
    for (const actor of this.actors) actor.update(dt);
  }

  /** 현재 미리보기 상태를 480x360 논리 Canvas에 그린다. */
  draw(ctx, width, height) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.strings.battle_preview_title, width / 2, 16);

    const [targetX, targetY] = this.preview.target;
    ctx.strokeStyle = '#b2b2c8';
    ctx.strokeRect(targetX - 14, targetY - 70, 28, 70);
    ctx.beginPath();
    ctx.moveTo(targetX - 20, targetY - 35);
    ctx.lineTo(targetX + 20, targetY - 35);
    ctx.moveTo(targetX, targetY - 76);
    ctx.lineTo(targetX, targetY + 5);
    ctx.stroke();
    ctx.fillText(this.strings.battle_preview_target, targetX, targetY + 20);
    for (const actor of this.actors.filter((actor) => actor.mode === 'idle')) actor.draw(ctx);
    for (const actor of this.actors.filter((actor) => actor.mode !== 'idle')) actor.draw(ctx);
    this.actors.forEach((actor, index) => {
      const selected = index === this.selected;
      ctx.fillStyle = selected ? '#ffe066' : '#cfcfdd';
      ctx.fillText(this.strings.battle_preview_names[actor.id], actor.anchor[0], 250);
      if (selected) ctx.fillRect(actor.anchor[0] - 28, 272, 56, 2);
      if (actor.error) {
        ctx.fillStyle = '#ff8080';
        ctx.fillText(this.strings.battle_preview_unavailable, actor.anchor[0], 290);
      }
    });

    const selectedActor = this.actors[this.selected];
    const status = selectedActor.error
      ? this.strings.battle_preview_unavailable
      : this.strings[`battle_preview_${selectedActor.mode}`];
    ctx.fillStyle = '#cfcfdd';
    ctx.fillText(this.loading ? this.strings.battle_preview_loading : status, width / 2, height - 58);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.strings.battle_preview_help, width / 2, height - 32);
    ctx.textAlign = 'left';
  }
}
