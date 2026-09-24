const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.SPRITE_SHARP || 'sharp');

(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, 'processed/pipeline-meta.json'), 'utf8'));
  const source = path.join(__dirname, 'processed/raw-sheet-clean.png');
  const reference = meta.frames[0].crop_bbox;
  const scale = 300 / (reference[3] - reference[1]);
  const cell = 384, feet = 360, frames = [], qc = [];
  for (let i = 0; i < 4; i++) {
    const frame = meta.frames[i], [left, top, right, bottom] = frame.crop_bbox;
    const width = Math.round((right - left) * scale), height = Math.round((bottom - top) * scale);
    const crop = { left: frame.source_box[0] + left, top: frame.source_box[1] + top, width: right - left, height: bottom - top };
    const { data, info } = await sharp(source).extract(crop).ensureAlpha().resize(width, height, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    for (let p = 3; p < data.length; p += 4) data[p] = data[p] >= 128 ? 255 : 0;
    let cropLeft = width, cropTop = height, cropRight = 0, cropBottom = 0;
    for (let p = 3; p < data.length; p += 4) {
      if (!data[p]) continue;
      const px = ((p - 3) / 4) % width, py = Math.floor((p - 3) / 4 / width);
      cropLeft = Math.min(cropLeft, px); cropTop = Math.min(cropTop, py); cropRight = Math.max(cropRight, px + 1); cropBottom = Math.max(cropBottom, py + 1);
    }
    const trimmedWidth = cropRight - cropLeft, trimmedHeight = cropBottom - cropTop;
    const buffer = await sharp(data, { raw: info }).extract({ left: cropLeft, top: cropTop, width: trimmedWidth, height: trimmedHeight }).png().toBuffer();
    const x = Math.round((cell - trimmedWidth) / 2), y = feet - trimmedHeight;
    if (x <= 0 || y <= 0 || x + trimmedWidth >= cell || y + trimmedHeight >= cell) throw new Error(`Clipped frame ${i}`);
    const output = await sharp({ create: { width: cell, height: cell, channels: 4, background: '#00000000' } }).composite([{ input: buffer, left: x, top: y }]).png().toBuffer();
    fs.writeFileSync(path.join(__dirname, `frame-${i}.png`), output);
    const pixels = await sharp(output).raw().toBuffer();
    let opaque = 0, magenta = 0, edges = 0, minY = cell, maxY = 0, minX = cell, maxX = 0;
    for (let p = 0; p < pixels.length; p += 4) {
      if (!pixels[p + 3]) continue;
      const px = (p / 4) % cell, py = Math.floor(p / 4 / cell);
      opaque++; minY = Math.min(minY, py); maxY = Math.max(maxY, py); minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      if (pixels[p] > 220 && pixels[p + 1] < 60 && pixels[p + 2] > 220) magenta++;
      if (!px || !py || px === cell - 1 || py === cell - 1) edges++;
    }
    if (!opaque || magenta || edges) throw new Error(`Invalid pixels frame ${i}`);
    qc.push({ frame: i, crop, outputBBox: [minX, minY, maxX + 1, maxY + 1], height: maxY - minY + 1, feetY: maxY + 1, opaque, magenta, edges, sha256: crypto.createHash('sha256').update(output).digest('hex') });
    frames.push(output);
  }
  const sheet = await sharp({ create: { width: cell * 2, height: cell * 2, channels: 4, background: '#00000000' } }).composite(frames.map((input, i) => ({ input, left: i % 2 * cell, top: Math.floor(i / 2) * cell }))).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, 'nunusub316.png'), sheet);
  fs.writeFileSync(path.join(__dirname, '../../../enemies/nunusub316.png'), sheet);
  await sharp(sheet).flatten({ background: '#1b1622' }).resize(1536, 1536, { kernel: 'nearest' }).png().toFile(path.join(__dirname, 'contact-preview-2x.png'));
  fs.writeFileSync(path.join(__dirname, 'final-qc.json'), JSON.stringify({ scale, pivot: [192, 360], cell: [384, 384], frames: qc }, null, 2) + '\n');
  console.log(JSON.stringify(qc));
})();
