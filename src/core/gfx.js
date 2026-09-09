// 그리기 유틸. 도트 아트는 문자열 배열 → 캔버스로 굽는다.
// assets/ 에 PNG를 넣으면 그쪽이 우선으로 쓰인다 (스프라이트 교체용).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return c;
}

/**
 * 문자열 배열 도트 아트를 캔버스로 굽는다.
 * '.' 또는 ' ' 는 투명.
 * @param {string[]} art  가로세로 픽셀 그리드
 * @param {Object<string,string>} palette 문자 → CSS 색상
 */
export function artToCanvas(art, palette) {
  const h = art.length;
  const w = Math.max(...art.map((r) => r.length));
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = art[y];
    if (row.length !== w) console.warn(`[art] ${y}번 줄 길이가 ${row.length} (기대값 ${w})`, row);
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) { console.warn(`[art] 팔레트에 없는 문자: "${ch}"`); continue; }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

// 실루엣을 단색으로 칠한다 (피격 플래시 등에 사용)
export function silhouette(src, color) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

/** 이미지 로드 시도. 없으면 null (에러로 죽지 않는다) */
export const ASSET_VERSION = Date.now();   // 개발 중 브라우저 캐시 무효화
export function loadImageOptional(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src + '?v=' + ASSET_VERSION;
  });
}

/** 스프라이트시트를 fw x fh 로 잘라 캔버스 배열로 반환 */
export function sliceSheet(img, fw, fh) {
  const out = [];
  const cols = Math.floor(img.width / fw);
  const rows = Math.floor(img.height / fh);
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const c = makeCanvas(fw, fh);
      c.getContext('2d').drawImage(img, cIdx * fw, r * fh, fw, fh, 0, 0, fw, fh);
      out.push(c);
    }
  }
  return out;
}

/** 델타룬풍 대화창 테두리: 검은 배경 + 흰 굵은 테두리 */
export function drawBox(ctx, x, y, w, h, opts = {}) {
  const { fill = '#000000', border = '#ffffff', thickness = 2 } = opts;
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + thickness, y + thickness, w - thickness * 2, h - thickness * 2);
}

/** 선택지 커서용 작은 하트 (7x6) */
const HEART = [
  '.##.##.',
  '#######',
  '#######',
  '.#####.',
  '..###..',
  '...#...',
];
export function drawHeart(ctx, x, y, color = '#ff2b4a') {
  ctx.fillStyle = color;
  for (let r = 0; r < HEART.length; r++) {
    for (let c = 0; c < HEART[r].length; c++) {
      if (HEART[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}

/**
 * 언더테일식 초상화: 흰/검 2톤 도트.
 * - 밝기 문턱(threshold) 미만이면 검정. 캐릭터마다 다르다(파란 곰은 낮게, 분홍 돼지는 높게) → characters.js 에서 지정.
 * - `scale` 배로 축소(2x 시트 → 대화창 1:1). 블록 안에 어두운 픽셀이 하나라도 있으면 검정 → 1px 선이 안 사라진다.
 * - 실루엣 가장자리는 항상 흰 선 — 검은 대화창 위에서 머리 같은 검은 영역이 배경에 묻히지 않게.
 * @param {HTMLImageElement|HTMLCanvasElement} img 컬러 초상화
 * @param {{ scale?: number, threshold?: number }} opt
 */
export function monoPortrait(img, { scale = 1, threshold = null } = {}) {
  const sw = img.width, sh = img.height;
  const src = makeCanvas(sw, sh);
  const sctx = src.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0);
  const sd = sctx.getImageData(0, 0, sw, sh).data;
  const lum = new Float32Array(sw * sh), op = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    if (sd[i * 4 + 3] < 128) continue;
    op[i] = 1;
    lum[i] = (0.299 * sd[i * 4] + 0.587 * sd[i * 4 + 1] + 0.114 * sd[i * 4 + 2]) / 255;
  }
  const th = threshold ?? 0.38;   // 캐릭터별 값은 src/data/characters.js portraitThreshold (파란 곰 0.3, 분홍 돼지 0.6)
  const w = Math.floor(sw / scale), h = Math.floor(sh / scale);
  const mask = new Uint8Array(w * h), dark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let anyOp = 0, anyDark = 0;
    for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) {
      const i = (y * scale + yy) * sw + (x * scale + xx);
      if (!op[i]) continue; anyOp = 1; if (lum[i] < th) anyDark = 1;
    }
    mask[y * w + x] = anyOp; dark[y * w + x] = anyDark;
  }
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!mask[i]) continue;
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w];
    const white = !dark[i] || edge;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = white ? 255 : 0;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}
