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
