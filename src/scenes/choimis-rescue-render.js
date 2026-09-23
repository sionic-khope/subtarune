import { BaronSeaChase } from './baron-sea-chase.js';
import { drawChoimisSkyBackground } from '../battle/choimis-sky-background.js';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const PARTY = ['hyungsub', 'gyeongsub', 'ppaman'];
const COLORS = ['#ff86b7', '#ffb1d0', '#ffd7e8'];
const SKY_BEATS = ['relief', 'petals_fade', 'dots_ppaman', 'dots_gyeongsub', 'dots_hyungsub', 'party_fall'];
const JET = { width: 680, height: 339, pilot: [496, 119], seats: [[361, 301], [408, 301], [456, 301]], fourth: [319, 301] };

/** Screen-space anchors are shared by drawing, bubbles, and cinematic QA. */
export function rescueGeometry(scene) {
  const { beat, elapsed, time } = scene;
  const fall = beat === 'party_fall' ? Math.pow(clamp(elapsed / 1.7), 2) : 0;
  const petals = beat === 'relief' ? 1 : beat === 'petals_fade' ? 1 - clamp(elapsed / 2.4) : 0;
  const party = PARTY.map((id, index) => ({ id, x: 150 + index * 88,
    y: 179 + fall * (295 + index * 30), angle: fall * (index % 2 ? -1.9 : 2.1), height: 58 }));
  const departing = beat === 'flyaway' ? Math.pow(clamp(elapsed / 2), 2) : 0;
  const reveal = beat === 'jet_reveal' ? smooth(elapsed / 1.8) : 1;
  const jet = { x: 42 - (1 - reveal) * 24 + departing * 570,
    y: 25 + Math.sin(time * 1.3) * 2 - departing * 80, w: 396 };
  jet.h = jet.w * ((scene.assets.images.jet?.height || 200) / (scene.assets.images.jet?.width || 400));
  const scale = jet.w / JET.width;
  const project = ([x, y]) => ({ x: jet.x + x * scale, y: jet.y + y * scale });
  return { party, petals, jet, pilot: project(JET.pilot), seats: JET.seats.map(project), fourth: project(JET.fourth), sky: SKY_BEATS.includes(beat),
    caught: beat === 'catch' ? scene.catchCount : 3,
    choimisCaught: beat === 'flyaway' || (beat === 'save_choimis' && elapsed >= 1.5) };
}

function actor(ctx, scene, id, x, y, height, angle = 0, facing = 'down') {
  const sprite = scene.assets.sprites[id], image = sprite?.[facing]?.[0];
  if (!image) return;
  const rect = id === 'choimis' ? [36, 24, 58, 96] : [0, 0, sprite.fw, sprite.fh];
  const width = Math.round(height * rect[2] / rect[3]);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angle);
  ctx.drawImage(image, ...rect, -Math.round(width / 2), -height, width, height); ctx.restore();
}

function sky(ctx, scene, geometry) {
  drawChoimisSkyBackground(ctx, { game: scene.game, members: [], openingActorAlpha: () => 0 });
  for (const [index, member] of geometry.party.entries()) {
    ctx.save(); ctx.globalAlpha = geometry.petals;
    for (let i = 0; i < 58; i++) {
      const angle = i * 2.399, radius = 4 + i * 13 % 39;
      ctx.fillStyle = COLORS[i % 3];
      ctx.fillRect(Math.round(member.x + Math.cos(angle) * radius),
        Math.round(member.y + 3 + Math.sin(angle) * radius * 0.19 + (1 - geometry.petals) * (i % 12)), 3 + i % 2, 2);
    }
    ctx.restore();
    actor(ctx, scene, member.id, member.x, member.y, member.height, member.angle, index === 0 ? 'right' : 'left');
  }
  scene.bubble.draw(ctx, { x: 0, y: 0 });
}

function distant(ctx, scene) {
  BaronSeaChase.prototype.drawOcean.call(scene, ctx);
  const catching = scene.beat === 'catch';
  for (let i = 0; i < 3; i++) {
    if (catching && i < scene.catchCount) continue;
    const x = 204 + i * 33;
    const y = catching ? 193 + i * 5 : 44 + Math.min(1, scene.elapsed / 3) * 149 + i * 5;
    ctx.fillStyle = '#d7edff'; ctx.fillRect(x, Math.round(y - 23), 1, 15);
    ctx.fillStyle = ['#f4f1df', '#18283a', '#4b67bc'][i]; ctx.fillRect(x - 2, Math.round(y), 4, 6);
  }
  if (catching) {
    const index = Math.min(2, Math.floor(scene.elapsed / 0.32));
    const progress = clamp((scene.elapsed - index * 0.32) / 0.32);
    const width = 57, height = width * JET.height / JET.width;
    const contactX = 204 + index * 33 - JET.seats[1][0] * width / JET.width;
    const x = -70 + progress * (contactX + 70) / (0.18 / 0.32);
    const y = 193 + index * 5 - JET.seats[1][1] * width / JET.width;
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#dffbff';
    for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x - i * 22), y + i % 2 * 4, 34, 2);
    ctx.globalAlpha = 1;
    if (scene.assets.images.jet) ctx.drawImage(scene.assets.images.jet, Math.round(x), Math.round(y), width, Math.round(height));
  }
}

function flying(ctx, scene, geometry) {
  BaronSeaChase.prototype.drawOcean.call(scene, ctx);
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#e4f8ff';
  for (let i = 0; i < 12; i++) {
    const x = (i * 67 - scene.time * (46 + i % 4 * 13)) % 600;
    ctx.fillRect(Math.round(x < -80 ? x + 600 : x), 18 + i * 25, 38 + i % 3 * 19, 2);
  }
  ctx.restore();
  const j = geometry.jet;
  const image = scene.assets.images.jet, scale = j.w / JET.width;
  if (image) ctx.drawImage(image, Math.round(j.x), Math.round(j.y), j.w, Math.round(j.h));
  ctx.save(); ctx.beginPath(); ctx.rect(j.x + 442 * scale, j.y + 66 * scale, 162 * scale, 70 * scale); ctx.clip();
  actor(ctx, scene, 'yongjun', geometry.pilot.x, geometry.pilot.y, 27, 0, 'right');
  ctx.restore();
  PARTY.forEach((id, index) => actor(ctx, scene, id, geometry.seats[index].x, geometry.seats[index].y, 33, Math.sin(scene.time * 1.5 + index) * 0.06));
  if (scene.beat === 'spot_choimis' || scene.beat === 'save_choimis') {
    const p = scene.beat === 'save_choimis' ? smooth(scene.elapsed / 1.5) : 0;
    const startY = scene.choimisFallY;
    const x = 454 + (geometry.fourth.x - 454) * p;
    const y = startY + (geometry.fourth.y - startY) * p;
    actor(ctx, scene, 'choimis', x, y, 32, (1 - p) * Math.sin(scene.time * 3) * 0.3);
  } else if (geometry.choimisCaught) actor(ctx, scene, 'choimis', geometry.fourth.x, geometry.fourth.y, 32);
  if (image) for (const [x, y, w, h] of [[440, 126, 174, 13], [319, 301, 180, 38]]) {
    ctx.drawImage(image, x, y, w, h, Math.round(j.x + x * scale), Math.round(j.y + y * scale), Math.round(w * scale), Math.round(h * scale));
  }
}

/** Render the three deliberately distinct distances: sky group, ocean dots, tracking jet. */
export function drawChoimisRescue(ctx, scene) {
  const geometry = rescueGeometry(scene);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (geometry.sky) sky(ctx, scene, geometry);
  else if (scene.beat === 'ocean_fall' || scene.beat === 'catch') distant(ctx, scene);
  else flying(ctx, scene, geometry);
  ctx.restore();
}
