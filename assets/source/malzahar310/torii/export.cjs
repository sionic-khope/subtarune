const sharp = require(process.env.SPRITE_SHARP || 'sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
(async () => {
  const { data: palette } = await sharp(path.join(__dirname, 'purple-palette-reference.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = Array.from({ length: 16 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < palette.length; i += 4) {
    const [r, g, b, a] = palette.subarray(i, i + 4);
    if (a < 128 || b < 55 || r < g * 1.2 || b < r * 1.15 || g < 20) continue;
    const bin = bins[Math.min(15, Math.floor(b / 16))];
    bin[0] += r; bin[1] += g; bin[2] += b; bin[3]++;
  }
  const colors = bins.filter(bin => bin[3] > 20).map(bin => bin.slice(0, 3).map(v => Math.round(v / bin[3])));
  if (!colors.length) throw new Error('Generated purple palette was not found');
  for (const layer of ['back', 'front']) {
    const src = path.join(root, `assets/props/jjajang_torii_blue_${layer}.png`);
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let changed = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = data.subarray(i, i + 4);
      if (!a || b < 55 || b <= r * 1.4 || b <= g * 1.05) continue;
      const color = colors.reduce((best, candidate) => Math.abs(candidate[2] - b) < Math.abs(best[2] - b) ? candidate : best);
      data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; changed++;
    }
    await sharp(data, { raw: info }).png().toFile(path.join(root, `assets/props/jjajang_torii_purple_${layer}.png`));
    console.log(JSON.stringify({ layer, width: info.width, height: info.height, changed, palette: colors }));
  }
})();
