const PETALS = Object.freeze([
  [18, 34, 11], [46, 108, 17], [79, 63, 13], [111, 146, 19], [143, 25, 15],
  [177, 91, 12], [209, 132, 18], [241, 52, 14], [274, 116, 20], [306, 77, 16],
  [339, 153, 11], [371, 39, 17], [404, 101, 13], [438, 68, 19], [466, 139, 15],
  [7, 173, 21], [39, 12, 14], [68, 202, 18], [99, 88, 23], [129, 184, 16],
  [163, 57, 20], [195, 213, 13], [227, 18, 22], [258, 164, 17], [290, 32, 24],
  [322, 199, 15], [353, 86, 21], [386, 221, 18], [419, 156, 14], [452, 8, 22],
  [24, 222, 17], [55, 143, 24], [87, 27, 20], [119, 218, 14], [151, 121, 23],
  [183, 179, 16], [215, 71, 21], [247, 207, 15], [279, 96, 22], [311, 225, 18],
  [343, 15, 23], [375, 181, 16], [407, 46, 20], [439, 214, 14], [473, 100, 24],
]);
const AIR = Object.freeze([[32, 42, 46], [137, 112, 34], [258, 174, 54], [379, 137, 40], [448, 76, 30]]);
const PINK = Object.freeze(['#ff86b7', '#ffb1d0', '#ffd7e8']);
const DOLPHIN = 'assets/props/choimis-dolphin-breach.png';

function actorFeet(battle) {
  const picking = ['menu', 'target', 'item', 'item-target'].includes(battle.state);
  const members = battle.members.map((member, index) => {
    const [x, y] = member.action?.position || member.home;
    return [x + (!member.action && picking && index === battle.memberIdx ? 10 : 0), y];
  });
  return members;
}

function drawSeaFlow(ctx, sky, time) {
  for (let row = 0; row < 9; row++) {
    const y = 216 + row * 16;
    const shift = Math.floor(time * (9 + row * 1.6)) % 480;
    const seam = 480 - shift;
    ctx.globalAlpha = 0.44;
    ctx.drawImage(sky, shift, y, 480 - shift, 16, 0, y, 480 - shift, 16);
    if (shift > 0) ctx.drawImage(sky, 0, y, shift, 16, seam, y, shift, 16);
  }
}

function drawPetalCloud(ctx, x, y, seed, time, layerAlpha) {
  for (let i = 0; i < 54; i++) {
    const angle = i * 2.399 + seed * 0.71;
    const radius = 5 + (i * 17 % 40);
    const px = x + Math.cos(angle) * radius + Math.sin(time * 1.2 + i) * 1.5;
    const py = y + Math.sin(angle) * (4 + radius * 0.16) + (i % 7 === 0 ? -5 : 0);
    ctx.globalAlpha = layerAlpha * (0.64 + (i % 4) * 0.09);
    ctx.fillStyle = PINK[(i + seed) % PINK.length];
    ctx.fillRect(Math.round(px), Math.round(py), i % 5 === 0 ? 4 : 3, i % 3 === 0 ? 2 : 1);
  }
}

function drawOceanLife(ctx, battle, time) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 216, 480, 30); ctx.clip();
  ctx.fillStyle = '#b8d7ff';
  for (let i = 0; i < 12; i++) {
    const phase = (time * 0.34 + i * 0.37) % 1;
    const x = ((i * 47 - time * (5 + i % 3)) % 520 + 520) % 520 - 20;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.2;
    ctx.fillRect(Math.round(x), 219 + i % 4 * 6, 5 + Math.round(phase * 12), 1);
  }
  const dolphin = battle.game?.propImages?.[DOLPHIN];
  const elapsed = (battle.game?.time ?? battle.t ?? 0) - 5;
  const phase = elapsed % 8.6;
  if (dolphin && elapsed >= 0 && phase < 1.4) {
    const p = phase / 1.4, cycle = Math.floor(elapsed / 8.6);
    const cell = dolphin.width / 4, frame = Math.min(3, Math.floor(p * 4));
    const x = 150 + cycle * 83 % 190 + p * 22;
    const y = 226 - Math.sin(p * Math.PI) * 7;
    ctx.globalAlpha = Math.min(1, p * 10, (1 - p) * 10) * 0.76;
    ctx.drawImage(dolphin, frame * cell, 0, cell, dolphin.height, Math.round(x), Math.round(y), 24, 24);
  }
  ctx.restore();
}

export function drawChoimisSkyBackground(ctx, battle) {
  const battleSky = battle.cfg?.bg === 'choimis_sky';
  const time = (battle.game?.time ?? battle.t ?? 0) * (battleSky ? 1.5 : 1);
  const sky = battle.game?.propImages?.['assets/backdrops/jjajang_night_sea.png'];
  ctx.fillStyle = '#071426'; ctx.fillRect(0, 0, 480, 360);
  if (sky) ctx.drawImage(sky, 0, 0, 480, 360, 0, 0, 480, 360);

  ctx.save();
  if (sky) drawSeaFlow(ctx, sky, time);
  ctx.globalAlpha = 0.3;
  for (let row = 0; row < 6; row++) {
    const y = 220 + row * 7, speed = 7 + row * 2;
    for (let x = -62 + ((row * 29 - time * speed) % 62); x < 480; x += 62) {
      ctx.fillStyle = row % 3 === 0 ? '#d8e7ff' : '#3b78b6';
      ctx.fillRect(Math.round(x), y, 18 + row * 2, 1);
    }
  }
  if (battleSky) drawOceanLife(ctx, battle, time);
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#b8d7ff';
  for (let i = 0; i < AIR.length; i++) {
    const [baseX, y, width] = AIR[i], x = (baseX + time * (5 + i) + 520) % 520 - 40;
    for (let step = 0; step < width; step += 8) ctx.fillRect(Math.round(x + step), y + (step % 16 ? 1 : 0), 4, 1);
  }
  for (let i = 0; i < PETALS.length; i++) {
    const [baseX, baseY, speed] = PETALS[i];
    const x = (baseX + time * speed * 0.72 + Math.sin(time * 0.7 + i) * 5 + 500) % 500 - 10;
    const y = (baseY + time * (5 + i % 4) + Math.sin(time + i) * 8 + 230) % 230;
    ctx.globalAlpha = 0.62 + (i % 4) * 0.09; ctx.fillStyle = PINK[i % PINK.length];
    ctx.fillRect(Math.round(x), Math.round(y), i % 5 ? 3 : 5, i % 5 ? 2 : 3);
    if (i % 3 === 0) ctx.fillRect(Math.round(x + 2), Math.round(y - 1), 2, 1);
  }
  const actorAlpha = battle.openingActorAlpha?.() ?? 1;
  if (actorAlpha > 0) actorFeet(battle).forEach(([x, y], index) => drawPetalCloud(ctx, x, y + 3, index, time, actorAlpha));
  ctx.restore();
}
