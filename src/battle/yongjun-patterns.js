// 박용준 히든 보스(BUILD462 사용자 브리핑 2026-10-15 — 보라꽃을 먹고 샌즈 옷을 입은 용준) 탄막 여섯.
//   사용자 원문: “1. 박용준이 가운데에 있고 갈색 악취 같은것들을 화면에 빙글빙글 돌리면서 뿌림 2. 용준이가 생선을 먹고 켁켁하는 패턴. 켁켁할때마다 생선하고 침같은것들 뱉어지면서
//   그거 피해야함 3. 용준이가 그냥 굴르면서 그거 피해야하는 패턴 … 엄마 도망가서 우는 패턴, 냄새고아돼지 패턴, 이쁜 여자가 안아서 부르르 떨면서 전기방출하는패턴 … 난이도 어려워야함”
//   [동작 → 실루엣 → 예고 → 회피] (docs/battle/adding-enemies.md §3)
//     yongjun_stench: 상자 가운데 흰 용준이 빙글빙글 돌며 갈색 악취 구름을 세 갈래 나선으로 뿌린다(갈래는 왔다 갔다 방향을 바꾼다) → 커지는 동안(0.6초) 안 맞음
//                     → 갈래 사이 빈틈을 따라 돈다 + 2.3초마다 악취 고리(빈틈 하나, 빈틈 자리를 0.5초 먼저 밝힌다)는 빈틈으로 빠져나간다
//     yongjun_fish:   상자 밖 용준이 생선을 먹고(시트 0·1) 켁켁(2·3) — 켁마다 입에서 소울 쪽으로 생선 하나(점선 예고 0.45초) + 침 여섯 방울이 부채꼴로 튀어 포물선으로 떨어진다
//                     → 점선에서 비키고, 위에서 떨어지는 침 사이로
//     yongjun_roll:   몸을 만 흰 용준이 벽에서 벽으로 소울을 향해 굴러 온다(지나갈 띠를 0.5초 먼저 표시, 갈수록 빨라짐) → 띠 밖으로. 벽에 부딪힐 때마다 부스러기가 상자 안쪽으로 흩어진다
//     yongjun_cry:    상자 밖 용준이 엉엉 운다(cry 시트) — 흐느낄 때마다 눈물 한 줄이 위에서 떨어진다(빈 칸 두 개, 떨어질 칸 표시 0.5초) → 빈 칸으로. 바닥에 닿은 눈물은 튀어 오른다 → 바닥에 붙지 않기
//     yongjun_insults: “냄새”·“고아”·“돼지”(일행이 놀린 말, 컷신 원문)가 가장자리에서 소울 쪽으로 날아온다(글자가 깜빡이고 점선 0.45초) → 맞은편 벽에서 두 글자로 쪼개져 되튄다
//     yongjun_hug:    예쁜 여자가 용준을 안은 흰 그림이 가운데에서 부르르 떨다가 번개 여섯 줄을 뿜는다(번개 줄 점선 0.5초) → 줄 사이로. 번개 줄은 매번 반 칸씩 돌아가 방금 안전하던 자리가 다음 줄이 된다
//                     + 방전마다 불똥 셋이 상자 안을 튕겨 다닌다
//   BUILD464 사용자: “공격패턴 gpt 도트 잘 쓰라니까” → 악취·침·눈물·부스러기·불똥·번개·블래스터·광선은 gpt 도트 그림(assets/props/yongjun-*.png, 적 def.projectiles), 그림이 없을 때만 코드 그림.
//     yongjun_blaster: 오프닝 첫 강공격(“가스터블래스터처럼 냄새블래스터”) — 용준 머리 블래스터가 상자 밖으로 날아와(0.3초) 입을 닫고 떨며 겨눈다(0.45초, 광선 줄 점선)
//                     → 입을 벌려 갈색 냄새 광선(0.5초) → 뒤로 빠진다. 십자(소울 줄·칸 + 옆 줄) → X(네 모서리에서 소울로) → 십자 → 큰 블래스터 둘(위·아래 띠, 가운데만 안전)
//     yongjun_hug(BUILD464 “여자가 갑자기 안으니까 전기 우오오오옥!!”): 흰 용준 혼자 → 단발 여자가 와락 안는다(크게 튀었다 줄어듦) + 상자 위 “우오오오옥!!” → 부르르 → 번개
//   BUILD467: 효과음은 전부 샌즈전 소리(블래스터 segapower·rainbowbeam·gigatalk, 뼈 spearrise, 눈 cinematiccut, 쾅 impact, 띵 bell), 켁켁엔 용준 목소리.
//     yongjun_blaster_rapid / yongjun_blaster_volley(“냄스터블래스터!”): 한 개씩 0.4초마다 13발 / 다섯 개씩 1.65초마다 네 판. yongjun_cannon: 쮼앰대포 포탄 → 착지 표시 → 폭파 이펙트 + 파편
//   상자 안 캐릭터 그림은 whiteSprite(흰/검 2톤). 시트 칸은 투명 여백을 잘라 쓴다. 시간 진행은 전부 t 기준(주사율 무관, patterns-refresh-rate.test).
import { whiteSprite } from './youngcle-patterns.js';

const TAU = Math.PI * 2;
export const YONGJUN_SHEETS = Object.freeze({ idle: [2, 2], cough: [2, 2], cry: [2, 2], roll: [1, 1], hug: [1, 1], fish: [1, 1], puff: [2, 1], spit: [1, 1], tear: [1, 1], crumb: [1, 1], spark: [2, 1], bolt: [1, 2], blaster: [2, 1], beam: [1, 2], ball: [1, 1], boom: [31, 1] });
export const STENCH = Object.freeze({ duration: 7.0, grow: 0.6, h: 54, bodyR: 15, arms: 3, emitEvery: 0.12, speed: 76, spin: 1.25, flipEvery: 2.6, puffR: 6, ringFirst: 1.7, ringEvery: 2.3, ringN: 16, ringGap: 4, ringSpeed: 66, ringWarn: 0.5, ringShift: 0.9, stopAt: 6.2 });
export const FISH = Object.freeze({ duration: 7.4, first: 0.35, every: 1.55, eat: 0.5, warn: 0.45, pairGap: 0.42, speed: 250, w: 30, h: 14, spit: 6, spitSpread: 0.85, spitSpeed: [100, 165], spitG: 230, spitR: 3.5, mouth: [-18, -54], endBy: 6.3,
  // 입 옆 대사(BUILD466 사용자 “먹고 켁켁 하는 대사도 추가해줘 뱉으면서 동시에 나오는”): 먹을 때 우적우적, 뱉는 순간마다 켁!
  eatLine: '우적우적', coughLine: '켁!', lineFor: 0.5, lineFont: 'bold 14px Galmuri11, "Apple SD Gothic Neo", sans-serif' });
export const ROLL = Object.freeze({ duration: 7.2, first: 0.35, dashes: 7, warn: 0.5, speed: [210, 310], r: 17, size: 40, spin: 13, rest: 0.12, minLen: 70, debris: 5, debrisSpeed: 92, debrisR: 3.5 });
export const CRY = Object.freeze({ duration: 7.4, first: 0.5, every: 0.92, warn: 0.5, cols: 11, gap: 2, vy: 160, dropR: 7, splashVx: 64, splashVy: -118, splashG: 280, splashR: 3, endBy: 6.2, fps: 5 });
export const INSULT = Object.freeze({ duration: 7.2, first: 0.4, every: 0.72, warn: 0.45, speed: 225, shardSpeed: 120, shardTurn: 0.62, shardLife: 1.5, font: 'bold 20px Galmuri11, "Apple SD Gothic Neo", sans-serif', h: 20, endBy: 6.2 });
export const INSULT_WORDS = Object.freeze(['냄새', '고아', '돼지']);
export const HUG = Object.freeze({ duration: 7.4, alone: 0.45, pop: 0.16, h: 66, aloneH: 52, threshold: 0.22, bodyR: 21, first: 1.25, every: 1.15, warn: 0.5, zap: 0.32, rays: 6, rayW: 10, sparks: 3, sparkSpeed: 115, sparkR: 4, sparkLife: 2.2, endBy: 6.4,
  shout: '우오오오옥!!', shoutFor: 1.7, shoutFont: 'bold 18px Galmuri11, "Apple SD Gothic Neo", sans-serif' });
// BUILD466 사용자 “처음 공격할 때 샌즈 처음공격이랑 거의 똑같은 패턴으로 재구성”: 원작 첫 공격 순서(디컴파일 obj_sansb) — 눈 번쩍 + 파란 하트로 바닥에 내리꽂기(snd_impact)
//   → 바닥 뼈(경고 상자 → 솟음 snd_spearrise, 점프로 넘기) → 띵(snd_bell) 빨간 하트 → 블래스터 4발 세 판 → 큰 블래스터 둘
export const BLASTER = Object.freeze({ duration: 8.2, flyIn: 0.25, charge: 0.38, fire: 0.45, leave: 0.3, size: 46, beamW: 16, bigW: 36, bigScale: 1.6, reach: 560, standOff: 34, sideGap: 46,
  // BUILD467 사용자 “초반 공격 더 추가해야지 속도감이 없잖아, 뼈공격도 마찬가지”: 판 간격 1.45 → 0.65초, 미끄럼 뼈 세 번, 블래스터 고리(여섯 개 연달아) 추가
  slam: Object.freeze({ speed: 640, g: 520, jump: 200, boneWarnAt: 0.3, boneWarn: 0.4, boneHold: 0.45, boneDrop: 0.15, boneH: 30, boneW: 10, boneGap: 2, bellAt: 2.75 }),
  slides: Object.freeze([Object.freeze({ at: 1.3, from: 1, h: 22 }), Object.freeze({ at: 1.75, from: -1, h: 26 }), Object.freeze({ at: 2.15, from: 1, h: 30 })]), slideSpeed: 250, slideCount: 3, slideGapPx: 13,
  rounds: Object.freeze([{ at: 2.85, kind: 'cross' }, { at: 3.5, kind: 'x' }, { at: 4.15, kind: 'cross', flip: true }, { at: 4.8, kind: 'ring', n: 6, every: 0.15 }, { at: 6.3, kind: 'big' }].map(Object.freeze)),
  // 원작 obj_gasterblaster: 등장 segapower(0.8, 1.2배), 발사 rainbowbeam_1(0.8) + a_gigatalk(0.6) 겹침(1.2배), 시작 눈 번쩍 cinematiccut(0.8, 1.4배)
  chargeSfx: 'sans_blaster_charge', fireSfx: 'sans_blaster_fire', fireLayer: 'sans_blaster_gigatalk', eyeSfx: 'sans_eye', rate: 1.2, eyeRate: 1.4 });
export const BLASTER_RAPID = Object.freeze({ duration: 6.6, first: 0.3, every: 0.4, count: 13, flyIn: 0.18, charge: 0.34, fire: 0.34, leave: 0.25, beamW: 16 });
export const BLASTER_VOLLEY = Object.freeze({ duration: 7.4, first: 0.3, every: 1.65, flyIn: 0.3, charge: 0.55, fire: 0.55, leave: 0.3, beamW: 22, kinds: Object.freeze(['rows', 'cols', 'aim', 'mix']) });
export const CANNON = Object.freeze({ duration: 7.2, enter: 0.45, first: 0.65, every: 0.72, shots: 8, triple: 3, warn: 0.5, arc: 46, blastR: 24, blast: 0.3, boomW: 52, ballSize: 14, shrapnel: 6, shrapnelSpeed: 85, scale: 0.62, gunX: 34, gunY: 0.62, muzzle: Object.freeze([-36, -12]) });

const blink = (self, hz = 8) => Math.floor(self.age * hz) % 2 === 0;
/** gpt 도트 효과 그림(시트 칸 frame)을 (x, y) 가운데에 너비 w 로(높이는 그림 비율, h 를 주면 그 높이). 그림이 없으면 false → 코드 그림 */
function drawArt(ctx, img, key, frame, x, y, w, h = null, rot = 0) {
  const cell = sheetCell(img, key, frame); if (!cell || !cell.width) return false;
  const dh = h ?? w * cell.height / cell.width;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cell, -Math.round(w / 2), -Math.round(dh / 2), Math.round(w), Math.round(dh)); ctx.restore();
  return true;
}
/** 계속 움직일 탄(몸·공): 엔진의 emit 은 Bullet 을 돌려준다. 돌려주지 않는 검사용 api 면 설정 객체를 대신 붙잡는다 */
const keep = (api, o) => { const made = api.emit(o); return made && typeof made === 'object' ? made : o; };
/** 상자 안 위협: 상자를 벗어나면 지우고, 상자 테두리 안쪽에서 잘라 그린다(일행·HP 띠 위로 새어 나가지 않게) */
const inside = (b, draw) => ({
  out(board) { const m = (this.r || 6) + 2; return (this.life && this.age >= this.life) || this.x < board.x - m || this.x > board.x + board.w + m || this.y < board.y - m || this.y > board.y + board.h + m; },
  drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip(); draw(ctx, self); ctx.restore(); },
});
/** 가운데에 몸이 서는 패턴: 하트가 몸 자리(가운데)에 있으면 상자 아래쪽 가운데로 옮겨 둔다(시작하자마자 겹쳐 맞지 않게) */
function clearCenter(api, cx, cy, radius) {
  const soul = api.soul; if (!soul) return;
  if (Math.hypot(soul.x - cx, soul.y - cy) < radius + (soul.r || 6) + 12) { soul.x = cx; soul.y = api.box.y + api.box.h - 18; }
}
/** 상자 밖(입)에서 날아드는 생선·침: 상자 아래나 왼쪽으로 빠지면 지운다 */
function passedBox(board) { return (this.life && this.age >= this.life) || this.y > board.y + board.h + (this.r || 6) + 4 || this.x < board.x - 24; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let measureCtx = null;
const textWidth = (font, text) => {
  if (typeof document === 'undefined') return text.length * 20;
  try { measureCtx ||= document.createElement('canvas').getContext('2d'); measureCtx.font = font; return Math.ceil(measureCtx.measureText(text).width) || text.length * 20; } catch { return text.length * 20; }
};

/** 시트의 한 칸을 투명 여백을 잘라 캔버스로(그림마다 한 번). 문서가 없거나 그림이 없으면 null */
const CELLS = new WeakMap();
/** 여백을 자르지 않는 그림: 블래스터는 두 칸이 머리 기준으로 정렬돼 있어 자르면 입을 벌릴 때 머리가 튄다 */
const NO_TRIM = new Set(['blaster', 'boom']);
export function sheetCell(img, key, index = 0) {
  if (!img || !img.width || typeof document === 'undefined') return null;
  let list = CELLS.get(img); if (!list) { list = []; CELLS.set(img, list); }
  if (list[index] !== undefined) return list[index];
  const [cols, rows] = YONGJUN_SHEETS[key] || [1, 1], fw = Math.floor(img.width / cols), fh = Math.floor(img.height / rows);
  let out = null;
  try {
    const cell = document.createElement('canvas'); cell.width = fw; cell.height = fh;
    const g = cell.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(img, (index % cols) * fw, Math.floor(index / cols) * fh, fw, fh, 0, 0, fw, fh);
    out = cell;
    const data = g.getImageData(0, 0, fw, fh).data;
    let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (data[(y * fw + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!NO_TRIM.has(key) && x1 >= x0 && y1 >= y0 && (x1 - x0 + 1 < fw || y1 - y0 + 1 < fh)) {
      const trim = document.createElement('canvas'); trim.width = x1 - x0 + 1; trim.height = y1 - y0 + 1;
      const t = trim.getContext('2d'); t.imageSmoothingEnabled = false; t.drawImage(cell, x0, y0, trim.width, trim.height, 0, 0, trim.width, trim.height);
      out = trim;
    }
  } catch { /* 검사용 가짜 캔버스: 자르지 않은 칸 */ }
  list[index] = out;
  return out;
}
/** 흰 실루엣을 (x, y) 가운데에 높이 h 로. 그림이 없으면 흰 타원 */
function drawWhite(ctx, img, x, y, h, { rot = 0, alpha = 1, scale = 1, threshold } = {}) {
  const sil = whiteSprite(img, threshold);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  const hh = Math.max(1, h * scale);
  if (sil && sil.height) { const w = Math.round(sil.width * hh / sil.height); ctx.drawImage(sil, -Math.round(w / 2), -Math.round(hh / 2), w, Math.round(hh)); }
  else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, hh * 0.36), Math.max(1, hh / 2), 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}
/** 점선(예고): a → b, 깜빡임 */
function dottedLine(ctx, self, x0, y0, x1, y1, color = '#ffb347') {
  if (!blink(self, 10)) return;
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 8);
  ctx.fillStyle = color;
  for (let k = 0; k <= n; k++) { const u = n ? k / n : 0; ctx.fillRect(Math.round(x0 + (x1 - x0) * u) - 1, Math.round(y0 + (y1 - y0) * u) - 1, 3, 3); }
}
/** 점 (px, py) 에서 선분 a-b 까지 거리 */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}
/** 상자 안쪽(여백 inset)에서 p 로부터 방향 d 로 가다 처음 닿는 벽까지의 거리 */
function wallDistance(b, inset, px, py, dx, dy) {
  const minX = b.x + inset, maxX = b.x + b.w - inset, minY = b.y + inset, maxY = b.y + b.h - inset;
  const tx = dx > 1e-6 ? (maxX - px) / dx : dx < -1e-6 ? (minX - px) / dx : Infinity;
  const ty = dy > 1e-6 ? (maxY - py) / dy : dy < -1e-6 ? (minY - py) / dy : Infinity;
  return Math.max(0, Math.min(tx, ty));
}

// ── 그림 ──
/** 갈색 악취 구름: 진갈색 테두리 + 갈색 몸 + 연한 점, 꼬불한 냄새 줄 */
function drawPuff(ctx, self, img) {
  if (drawArt(ctx, img, 'puff', Math.floor(self.age * 6 + self.seed) % 2, self.x, self.y, self.r * 2 + 6)) return;
  const x = Math.round(self.x), y = Math.round(self.y), r = self.r;
  ctx.fillStyle = '#3e2412'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b07a3e'; ctx.fillRect(x - 2, y - 3, 2, 2); ctx.fillRect(x + 1, y, 2, 2);
  const w = Math.floor(self.age * 6 + self.seed) % 2;
  ctx.fillStyle = '#6b4320'; ctx.fillRect(x - 3 + w, y - r - 4, 2, 2); ctx.fillRect(x - 1 - w, y - r - 6, 2, 2);
}
/** 흰 생선(그림이 없으면 마름모 몸 + 꼬리) — 진행 방향으로 돌린다 */
function drawFish(ctx, self, img) {
  const sil = whiteSprite(img);
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot); ctx.imageSmoothingEnabled = false;
  if (sil && sil.width) { const w = FISH.w, h = Math.round(sil.height * w / sil.width); ctx.drawImage(sil, -w / 2, -h / 2, w, h); }
  else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-FISH.w / 2, 0); ctx.lineTo(-2, -FISH.h / 2); ctx.lineTo(FISH.w / 2 - 6, 0); ctx.lineTo(-2, FISH.h / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(FISH.w / 2 - 8, 0); ctx.lineTo(FISH.w / 2, -6); ctx.lineTo(FISH.w / 2, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(-FISH.w / 2 + 4, -2, 2, 2);
  }
  ctx.restore();
}
/** 침: 흰 물방울 + 파란 기 도는 반짝 */
function drawSpit(ctx, self, img) {
  if (drawArt(ctx, img, 'spit', 0, self.x, self.y, self.r * 2 + 2)) return;
  const x = Math.round(self.x), y = Math.round(self.y), r = self.r;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x - 1, y - 1, 1, 1);
}
/** 눈물: 위가 뾰족한 흰 물방울 + 연파랑 안쪽 */
function drawTear(ctx, self, alpha = 1, img = null) {
  const x = Math.round(self.x), y = Math.round(self.y), r = self.r;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (drawArt(ctx, img, 'tear', 0, x, y, r * 2 + 2)) { ctx.restore(); return; }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y + 2, r, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - r + 1, y + 1); ctx.lineTo(x, y - r - 4); ctx.lineTo(x + r - 1, y + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x - 2, y + 1, 3, 3);
  ctx.restore();
}
/** 흰 글자 + 검은 테두리 */
function drawWord(ctx, self, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(self.x), Math.round(self.y)); if (self.rot) ctx.rotate(self.rot);
  ctx.font = INSULT.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(self.text, 0, 1); ctx.fillStyle = '#fff'; ctx.fillText(self.text, 0, 1);
  ctx.restore();
}
/** 번개: 가운데에서 바깥으로 지그재그(0.05초마다 모양이 바뀐다) */
function drawBolt(ctx, self, img) {
  const cell = sheetCell(img, 'bolt', Math.floor(self.age * 20) % 2);
  if (cell && cell.width) {
    ctx.save(); ctx.translate(Math.round(self.x0), Math.round(self.y0)); ctx.rotate(self.angle); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cell, 0, -9, Math.round(Math.hypot(self.x1 - self.x0, self.y1 - self.y0)), 18); ctx.restore();
    return;
  }
  const n = 9, seed = Math.floor(self.age * 20) + self.seed;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, jitter = k === 0 || k === n ? 0 : (((seed * 31 + k * 17) % 11) / 10 - 0.5) * 12;
    pts.push([self.x0 + (self.x1 - self.x0) * u - Math.sin(self.angle) * jitter, self.y0 + (self.y1 - self.y0) * u + Math.cos(self.angle) * jitter]);
  }
  ctx.save(); ctx.lineCap = 'square';
  for (const [color, width] of [['#ffe95c', 6], ['#fffbd0', 3], ['#fff', 1]]) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y))));
    ctx.stroke();
  }
  ctx.restore();
}
function drawSpark(ctx, self, img) {
  if (drawArt(ctx, img, 'spark', Math.floor(self.age * 12) % 2, self.x, self.y, 12)) return;
  const x = Math.round(self.x), y = Math.round(self.y), f = Math.floor(self.age * 12) % 2;
  ctx.fillStyle = '#ffe95c'; ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillRect(x - 1, y - 4, 3, 9);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 1 + f, y - 1, 2, 2);
}

// ── 패턴 ──
/** 1. 가운데 용준이 빙글빙글 돌며 갈색 악취를 세 갈래 나선 + 빈틈 하나 있는 고리로 */
function stench(o = {}) {
  const C = { ...STENCH, ...o };
  let body = null, nextEmit = C.grow, nextRing = C.ringFirst, ringN = 0, seed = 0;
  const rings = [];
  const angleAt = (t) => {
    const u = Math.max(0, t - C.grow), k = Math.floor(u / C.flipEvery), r = u - k * C.flipEvery;
    return C.spin * (k % 2 === 0 ? r : C.flipEvery - r);
  };
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!body) {
      api.present?.({ hidden: true });
      clearCenter(api, cx, cy, C.bodyR);
      api.sfx?.('sans_eye', { volume: 0.7, rate: 1.4, pitch: true });
      body = keep(api, { x: cx, y: cy, r: C.bodyR, kind: 'white', shape: 'yongjun_body', life: C.duration + 0.05,
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return self.age >= C.grow && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.bodyR + soul.r - 3; },
        drawShape(ctx, self) {
          const grow = clamp(self.age / C.grow, 0, 1), frame = Math.floor(self.age * 4) % 4;
          drawWhite(ctx, sheetCell(api.images?.idle, 'idle', frame) || api.images?.idle, self.x, self.y, C.h, { rot: self.rot, scale: 0.25 + 0.75 * grow, alpha: 0.4 + 0.6 * grow });
        } });
    }
    if (body) body.rot = angleAt(t) * 2;
    while (nextEmit <= t && nextEmit < C.stopAt) {
      const a0 = angleAt(nextEmit);
      for (let i = 0; i < C.arms; i++) {
        const a = a0 + i * TAU / C.arms, ux = Math.cos(a), uy = Math.sin(a);
        api.emit({ x: cx + ux * C.bodyR, y: cy + uy * C.bodyR, r: C.puffR, kind: 'white', shape: 'stench', vx: ux * C.speed, vy: uy * C.speed, life: 3.2, seed: seed++, ...inside(b, (ctx, self) => drawPuff(ctx, self, api.images?.puff)) });
      }
      nextEmit += C.emitEvery;
    }
    while (nextRing <= t && nextRing + C.ringWarn < C.stopAt) {
      const soulAngle = Math.atan2(api.soul.y - cy, api.soul.x - cx), gapAngle = soulAngle + (ringN++ % 2 ? -1 : 1) * C.ringShift;
      api.emit({ x: cx, y: cy, r: 0, harmless: true, life: C.ringWarn, shape: 'gap_warn',
        drawShape(ctx, self) {
          if (!blink(self, 8)) return;
          const half = (C.ringGap / C.ringN) * Math.PI, reach = Math.max(b.w, b.h);
          ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
          ctx.fillStyle = 'rgba(120,255,160,0.18)'; ctx.beginPath(); ctx.moveTo(self.x, self.y); ctx.arc(self.x, self.y, reach, gapAngle - half, gapAngle + half); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#7cff9a'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(self.x, self.y); ctx.lineTo(self.x + Math.cos(gapAngle - half) * reach, self.y + Math.sin(gapAngle - half) * reach);
          ctx.moveTo(self.x, self.y); ctx.lineTo(self.x + Math.cos(gapAngle + half) * reach, self.y + Math.sin(gapAngle + half) * reach); ctx.stroke();
          ctx.restore();
        } });
      rings.push({ at: nextRing + C.ringWarn, gapAngle });
      nextRing += C.ringEvery;
    }
    while (rings.length && rings[0].at <= t) {
      const ring = rings.shift(); api.sfx?.('sans_bone', { volume: 0.55 });
      const step = TAU / C.ringN, gapIndex = Math.round(ring.gapAngle / step);
      for (let i = 0; i < C.ringN; i++) {
        const offset = ((i - gapIndex) % C.ringN + C.ringN) % C.ringN;
        if (offset < C.ringGap / 2 || offset > C.ringN - C.ringGap / 2 - 0.01) continue;
        const a = i * step, ux = Math.cos(a), uy = Math.sin(a);
        api.emit({ x: cx + ux * C.bodyR, y: cy + uy * C.bodyR, r: C.puffR + 1, kind: 'white', shape: 'stench', vx: ux * C.ringSpeed, vy: uy * C.ringSpeed, life: 3.4, seed: seed++, ...inside(b, (ctx, self) => drawPuff(ctx, self, api.images?.puff)) });
      }
    }
  } };
}

/** 2. 상자 밖 용준이 생선을 먹고 켁켁: 켁마다 생선(점선 예고) + 침 부채꼴 + 입 옆에 우적우적·켁! */
function fishCough(o = {}) {
  const C = { ...FISH, ...o };
  const say = (api, text, life, row = 0) => {
    const s = api.actor?.scale ?? 1, x = (api.actor?.x ?? api.box.x + api.box.w + 40) + (C.mouth[0] - 26) * s, y = (api.actor?.y ?? api.box.y) + (C.mouth[1] - 22) * s - row * 16;
    api.emit({ x, y, r: 0, harmless: true, free: true, life, shape: 'fish_line', text,
      drawShape(ctx, self) {
        const sx = Math.round(self.x + Math.sin(self.age * 55) * 1.5), sy = Math.round(self.y - self.age * 10);
        ctx.save(); ctx.font = C.lineFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(self.text, sx, sy); ctx.fillStyle = '#fff'; ctx.fillText(self.text, sx, sy);
        ctx.restore();
      } });
  };
  let nextCycle = C.first;
  const events = [];
  const mouth = (api) => { const s = api.actor?.scale ?? 1; return [(api.actor?.x ?? api.box.x + api.box.w + 40) + C.mouth[0] * s, (api.actor?.y ?? api.box.y) + C.mouth[1] * s]; };
  return { duration: C.duration, update(t, dt, api) {
    while (nextCycle <= t && nextCycle + C.eat + C.pairGap + C.warn < C.endBy) {
      const c = nextCycle;
      events.push({ at: c, kind: 'pose', frame: 0 }, { at: c + C.eat * 0.5, kind: 'pose', frame: 1 });
      events.push({ at: c + C.eat, kind: 'warn' }, { at: c + C.eat + C.pairGap, kind: 'warn' });
      nextCycle += C.every;
    }
    events.sort((p, q) => p.at - q.at);
    while (events.length && events[0].at <= t) {
      const e = events.shift();
      if (e.kind === 'pose') { api.present?.({ sheet: 'cough', frame: e.frame }); if (e.frame === 0) say(api, C.eatLine, C.eat); continue; }
      if (e.kind === 'warn') {
        const [mx, my] = mouth(api), tx = clamp(api.soul.x, api.box.x + 8, api.box.x + api.box.w - 8), ty = clamp(api.soul.y, api.box.y + 8, api.box.y + api.box.h - 8);
        const a = Math.atan2(ty - my, tx - mx), reach = Math.hypot(tx - mx, ty - my) + 260;
        api.emit({ x: mx, y: my, r: 0, harmless: true, life: C.warn, shape: 'aim', free: true,
          drawShape(ctx, self) { dottedLine(ctx, self, mx, my, mx + Math.cos(a) * reach, my + Math.sin(a) * reach); } });
        events.push({ at: e.at + C.warn, kind: 'cough', a, mx, my, frame: events.some(q => q.kind === 'cough') ? 3 : 2 });
        events.sort((p, q) => p.at - q.at);
        continue;
      }
      api.present?.({ sheet: 'cough', frame: e.frame });
      api.voice?.('yongjun');
      api.sfx?.('sans_bone', { volume: 0.4 });
      say(api, C.coughLine, C.lineFor, e.frame === 3 ? 1 : 0);
      const ux = Math.cos(e.a), uy = Math.sin(e.a);
      api.emit({ x: e.mx, y: e.my, r: 6, kind: 'white', shape: 'fish', vx: ux * C.speed, vy: uy * C.speed, rot: e.a + Math.PI, free: true, life: 2.4, out: passedBox,
        hitShape(self, soul) { const hx = Math.cos(self.rot) * 10, hy = Math.sin(self.rot) * 10; return segDist(soul.x, soul.y, self.x - hx, self.y - hy, self.x + hx, self.y + hy) <= 5 + soul.r - 2; },
        drawShape(ctx, self) { drawFish(ctx, self, sheetCell(api.images?.fish, 'fish', 0) || api.images?.fish); } });
      for (let k = 0; k < C.spit; k++) {
        const spread = (k / (C.spit - 1) - 0.5) * 2 * C.spitSpread, speed = C.spitSpeed[0] + (C.spitSpeed[1] - C.spitSpeed[0]) * ((k * 37) % C.spit) / Math.max(1, C.spit - 1);
        api.emit({ x: e.mx, y: e.my, r: C.spitR, kind: 'white', shape: 'spit', vx: Math.cos(e.a + spread) * speed, vy: Math.sin(e.a + spread) * speed, ay: C.spitG, free: true, life: 2.2, out: passedBox, drawShape: (ctx, self) => drawSpit(ctx, self, api.images?.spit) });
      }
    }
  } };
}

/** 3. 몸을 만 용준이 벽에서 벽으로 소울을 향해 구른다(지나갈 띠 예고) + 벽 부스러기 */
function roll(o = {}) {
  const C = { ...ROLL, ...o };
  let ball = null, seg = null, dash = 0, nextAt = C.first;
  const begin = (t, api) => {
    const b = api.box, inset = C.r + 3;
    const from = seg ? [seg.x1, seg.y1] : [b.x - C.r - 6, clamp(api.soul.y, b.y + inset, b.y + b.h - inset)];
    let dx = api.soul.x - from[0], dy = api.soul.y - from[1], len = Math.hypot(dx, dy);
    if (len < 1) { dx = b.x + b.w / 2 - from[0]; dy = b.y + b.h / 2 - from[1]; len = Math.hypot(dx, dy) || 1; }
    dx /= len; dy /= len;
    let dist = wallDistance(b, inset, from[0], from[1], dx, dy);
    if (dist < C.minLen) { dx = b.x + b.w / 2 - from[0]; dy = b.y + b.h / 2 - from[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; dist = wallDistance(b, inset, from[0], from[1], dx, dy); }
    const speed = C.speed[0] + (C.speed[1] - C.speed[0]) * Math.min(1, dash / Math.max(1, C.dashes - 1));
    seg = { x0: from[0], y0: from[1], x1: from[0] + dx * dist, y1: from[1] + dy * dist, dx, dy, len: dist, go: t + C.warn, speed, hit: false };
    const s = seg;
    api.emit({ x: s.x0, y: s.y0, r: 0, harmless: true, life: C.warn, shape: 'band', free: true,
      drawShape(ctx, self) {
        if (!blink(self, 10)) return;
        const nx = -s.dy * C.r, ny = s.dx * C.r;
        dottedLine(ctx, { age: 0 }, s.x0 + nx, s.y0 + ny, s.x1 + nx, s.y1 + ny, '#ff6b6b');
        dottedLine(ctx, { age: 0 }, s.x0 - nx, s.y0 - ny, s.x1 - nx, s.y1 - ny, '#ff6b6b');
      } });
  };
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    if (!ball) {
      api.present?.({ hidden: true });
      ball = keep(api, { x: b.x - C.r - 6, y: b.y + b.h / 2, r: C.r, kind: 'white', shape: 'yongjun_roll', free: true, life: C.duration + 0.05,
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return !self.parked && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.r + soul.r - 3; },
        drawShape(ctx, self) { drawWhite(ctx, sheetCell(api.images?.roll, 'roll', 0) || api.images?.roll, self.x, self.y, C.size, { rot: self.rot }); } });
      ball.parked = true;
    }
    if (!seg && t >= nextAt) { begin(t, api); ball.x = seg.x0; ball.y = seg.y0; }
    if (!seg) return;
    if (t >= seg.go && !seg.hit) {
      if (!seg.started) { seg.started = true; api.sfx?.('sans_bone', { volume: 0.5 }); }
      ball.parked = false;
      const d = Math.min(seg.len, (t - seg.go) * seg.speed);
      ball.x = seg.x0 + seg.dx * d; ball.y = seg.y0 + seg.dy * d; ball.rot = (ball.rot || 0) + C.spin * dt * (seg.dx >= 0 ? 1 : -1);
      if (d >= seg.len) {
        seg.hit = true; dash++; api.sfx?.('impact', { volume: 0.5 });
        const back = Math.atan2(-seg.dy, -seg.dx);
        for (let k = 0; k < C.debris; k++) {
          const a = back + (k / (C.debris - 1) - 0.5) * 2.2;
          api.emit({ x: seg.x1, y: seg.y1, r: C.debrisR, kind: 'white', shape: 'crumb', vx: Math.cos(a) * C.debrisSpeed, vy: Math.sin(a) * C.debrisSpeed, life: 1.6, ...inside(b, (ctx, self) => { if (!drawArt(ctx, api.images?.crumb, 'crumb', 0, self.x, self.y, 10, null, self.age * 6)) drawSpit(ctx, self); }) });
        }
        nextAt = t + C.rest;
      }
    }
    if (seg.hit && t >= nextAt) {
      if (dash < C.dashes && t + C.warn + 0.6 < C.duration) { begin(t, api); ball.parked = true; }
      else { ball.parked = true; ball.life = Math.min(ball.life, ball.age + 0.01); }
    }
  } };
}

/** 4. 엄마가 도망가서 우는 용준: 흐느낄 때마다 눈물 한 줄(빈 칸 둘) + 바닥에서 튀는 눈물 */
function cry(o = {}) {
  const C = { ...CRY, ...o };
  let next = C.first, lastGap = -1, row = 0;
  const rows = [];
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, spacing = b.w / C.cols, floorY = b.y + b.h - C.dropR - 2;
    api.present?.({ sheet: 'cry', frame: Math.floor(t * C.fps) % 4 });
    while (next <= t && next + C.warn + 0.4 < C.endBy) {
      let gap;
      do { gap = Math.floor(api.rnd() * (C.cols - C.gap + 1)); } while (lastGap >= 0 && Math.abs(gap - lastGap) < 3 && (row++ < 50));
      lastGap = gap;
      const cols = [...Array(C.cols).keys()].filter(i => i < gap || i >= gap + C.gap);
      for (const i of cols) api.emit({ x: b.x + spacing * (i + 0.5), y: b.y + 8, r: C.dropR - 2, harmless: true, life: C.warn, shape: 'tear_mark', drawShape(ctx, self) { if (blink(self, 9)) drawTear(ctx, self, 0.55, api.images?.tear); } });
      rows.push({ at: next + C.warn, cols });
      next += C.every;
    }
    while (rows.length && rows[0].at <= t) {
      const r = rows.shift(); api.sfx?.('sans_bone', { volume: 0.45 });
      r.cols.forEach((i, n) => {
        api.emit({ x: b.x + spacing * (i + 0.5), y: b.y - C.dropR, r: C.dropR, kind: 'white', shape: 'tear', vy: C.vy, life: 2.0, splash: n % 2 === 0,
          steer(self) {
            if (self.y < floorY || self.done) return;
            self.done = true; self.life = Math.min(self.life, self.age + 0.01);
            if (!self.splash) return;
            for (const side of [-1, 1]) api.emit({ x: self.x, y: floorY, r: C.splashR, kind: 'white', shape: 'splash', vx: side * C.splashVx, vy: C.splashVy, ay: C.splashG, life: 0.95, ...inside(b, (ctx, s2) => drawSpit(ctx, s2, api.images?.spit)) });
          },
          ...inside(b, (ctx, self) => drawTear(ctx, self, 1, api.images?.tear)) });
      });
    }
  } };
}

/** 5. “냄새”·“고아”·“돼지”가 가장자리에서 소울 쪽으로 → 맞은편 벽에서 두 글자로 쪼개져 되튄다 */
function insults(o = {}) {
  const C = { ...INSULT, ...o }, words = o.words || INSULT_WORDS;
  let next = C.first, n = 0;
  const throws = [];
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    while (next <= t && next + C.warn + 0.6 < C.endBy) {
      const text = words[n % words.length], edge = n % 3; n++;
      const w = textWidth(C.font, text), along = 0.2 + api.rnd() * 0.6;
      const start = edge === 0 ? [b.x - w / 2 - 6, b.y + b.h * along] : edge === 1 ? [b.x + b.w * along, b.y - C.h / 2 - 6] : [b.x + b.w + w / 2 + 6, b.y + b.h * along];
      let dx = api.soul.x - start[0], dy = api.soul.y - start[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const inside = [clamp(start[0], b.x + 2, b.x + b.w - 2), clamp(start[1], b.y + 2, b.y + b.h - 2)];
      const dist = wallDistance(b, 6, inside[0] + dx * 4, inside[1] + dy * 4, dx, dy) + Math.hypot(inside[0] - start[0], inside[1] - start[1]) + 4;
      const end = [start[0] + dx * dist, start[1] + dy * dist];
      api.emit({ x: start[0], y: start[1], r: 0, harmless: true, life: C.warn, shape: 'word_warn', text, free: true,
        drawShape(ctx, self) { dottedLine(ctx, self, start[0], start[1], end[0], end[1]); if (blink(self, 7)) drawWord(ctx, self, 0.8); } });
      throws.push({ at: next + C.warn, text, w, start, end, dx, dy, dist });
      next += C.every;
    }
    while (throws.length && throws[0].at <= t) {
      const q = throws.shift(); api.sfx?.('sans_bone', { volume: 0.6 });
      api.emit({ x: q.start[0], y: q.start[1], r: 0, kind: 'white', shape: 'word', text: q.text, vx: q.dx * C.speed, vy: q.dy * C.speed, free: true, life: q.dist / C.speed + 0.02,
        hitShape(self, soul) { return Math.abs(soul.x - self.x) <= q.w / 2 + soul.r - 3 && Math.abs(soul.y - self.y) <= C.h / 2 + soul.r - 4; },
        steer(self) {
          if (self.split || self.age < q.dist / C.speed - 0.01) return;
          self.split = true; api.sfx?.('impact', { volume: 0.4 });
          const back = Math.atan2(-q.dy, -q.dx);
          [...q.text].forEach((ch, i) => {
            const a = back + (i ? 1 : -1) * C.shardTurn;
            api.emit({ x: q.end[0], y: q.end[1], r: 0, kind: 'white', shape: 'word', text: ch, vx: Math.cos(a) * C.shardSpeed, vy: Math.sin(a) * C.shardSpeed, spin: (i ? 1 : -1) * 3, life: C.shardLife,
              hitShape(s, soul) { return Math.abs(soul.x - s.x) <= C.h / 2 + soul.r - 3 && Math.abs(soul.y - s.y) <= C.h / 2 + soul.r - 4; },
              ...inside(b, (ctx, s) => drawWord(ctx, s)) });
          });
        },
        drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip(); drawWord(ctx, self); ctx.restore(); } });
    }
  } };
}

/** 6. 흰 용준 혼자 → 단발 여자가 갑자기 와락 안는다 + “우오오오옥!!” → 부르르 떨다가 번개 여섯 줄(반 칸씩 돌아간다) + 튕기는 불똥 */
function hugShock(o = {}) {
  const C = { ...HUG, ...o };
  let body = null, next = C.first, k = 0, hugged = false;
  const zaps = [];
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!body) {
      api.present?.({ hidden: true });
      clearCenter(api, cx, cy, C.bodyR);
      body = keep(api, { x: cx, y: cy, r: C.bodyR, kind: 'white', shape: 'yongjun_hug', life: C.duration + 0.05, charge: 0,
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return self.age >= C.alone + C.pop && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.bodyR + soul.r - 3; },
        drawShape(ctx, self) {
          if (self.age < C.alone) { drawWhite(ctx, sheetCell(api.images?.idle, 'idle', 0) || api.images?.idle, cx, cy, C.aloneH, { alpha: clamp(self.age / 0.2, 0, 1) }); return; }
          const pop = clamp((self.age - C.alone) / C.pop, 0, 1), amp = 1 + self.charge * 3, jx = Math.sin(self.age * 70) * amp, jy = Math.cos(self.age * 55) * amp * 0.5;
          drawWhite(ctx, sheetCell(api.images?.hug, 'hug', 0) || api.images?.hug, cx + jx, cy + jy, C.h, { scale: 1.3 - 0.3 * pop, threshold: C.threshold });
        } });
    }
    if (!hugged && t >= C.alone) {
      hugged = true; api.sfx?.('impact', { volume: 0.5 });
      api.emit({ x: cx, y: b.y + 16, r: 0, harmless: true, life: C.shoutFor, shape: 'shout',
        drawShape(ctx, self) {
          const sx = Math.round(self.x + Math.sin(self.age * 60) * 2), sy = Math.round(self.y + Math.cos(self.age * 47) * 1.5);
          ctx.save(); ctx.font = C.shoutFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(C.shout, sx, sy); ctx.fillStyle = '#ffe95c'; ctx.fillText(C.shout, sx, sy);
          ctx.restore();
        } });
    }
    body.charge = 0;
    while (next <= t && next + C.warn + C.zap < C.endBy) {
      const base = (k++ % 2) * (Math.PI / C.rays) + Math.PI / 2;
      const rays = [...Array(C.rays).keys()].map(i => base + i * TAU / C.rays);
      const reach = Math.hypot(b.w, b.h);
      api.emit({ x: cx, y: cy, r: 0, harmless: true, life: C.warn, shape: 'ray_warn',
        drawShape(ctx, self) {
          ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
          for (const a of rays) dottedLine(ctx, self, cx + Math.cos(a) * C.bodyR, cy + Math.sin(a) * C.bodyR, cx + Math.cos(a) * reach, cy + Math.sin(a) * reach, '#ffe95c');
          ctx.restore();
        } });
      zaps.push({ at: next + C.warn, warnFrom: next, rays });
      next += C.every;
    }
    const pending = zaps[0];
    if (pending && t >= pending.warnFrom) body.charge = clamp((t - pending.warnFrom) / C.warn, 0, 1);
    while (zaps.length && zaps[0].at <= t) {
      const z = zaps.shift(); api.sfx?.('sans_blaster_fire', { volume: 0.5, rate: 1.4, pitch: true });
      for (const a of z.rays) {
        const ux = Math.cos(a), uy = Math.sin(a), len = wallDistance(b, 0, cx, cy, ux, uy);
        api.emit({ x: cx, y: cy, r: 0, kind: 'white', shape: 'bolt', life: C.zap, angle: a, seed: Math.round(a * 100),
          x0: cx + ux * C.bodyR, y0: cy + uy * C.bodyR, x1: cx + ux * len, y1: cy + uy * len,
          hitShape(self, soul) { return segDist(soul.x, soul.y, self.x0, self.y0, self.x1, self.y1) <= C.rayW / 2 + soul.r - 2; },
          drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); drawBolt(ctx, self, api.images?.bolt); ctx.restore(); } });
      }
      for (let s = 0; s < C.sparks; s++) {
        const a = z.rays[s * 2 % z.rays.length] + Math.PI / C.rays;
        api.emit({ x: cx + Math.cos(a) * (C.bodyR + 6), y: cy + Math.sin(a) * (C.bodyR + 6), r: C.sparkR, kind: 'white', shape: 'spark', vx: Math.cos(a) * C.sparkSpeed, vy: Math.sin(a) * C.sparkSpeed, bounce: true, life: C.sparkLife, ...inside(b, (ctx, s2) => drawSpark(ctx, s2, api.images?.spark)) });
      }
    }
  } };
}

/** 점 (px, py) 에서 방향 (ux, uy) 로 간 광선이 상자를 빠져나가는 거리(상자 반대편 벽까지만 그린다 — 일행·HP 띠를 덮지 않게) */
function rayExit(b, px, py, ux, uy) {
  let t0 = 0, t1 = Infinity;
  for (const [p, u, lo, hi] of [[px, ux, b.x, b.x + b.w], [py, uy, b.y, b.y + b.h]]) {
    if (Math.abs(u) < 1e-6) { if (p < lo || p > hi) return 0; continue; }
    const a = (lo - p) / u, c = (hi - p) / u; t0 = Math.max(t0, Math.min(a, c)); t1 = Math.min(t1, Math.max(a, c));
  }
  return t1 > t0 ? t1 : 0;
}
/** 블래스터 한 판의 자리: 상자 밖 (x, y) 에서 각 a 로, 광선 너비 w */
function blasterRound(round, b, soul, C) {
  const sx = clamp(soul.x, b.x + 14, b.x + b.w - 14), sy = clamp(soul.y, b.y + 14, b.y + b.h - 14);
  const L = b.x - C.standOff, R = b.x + b.w + C.standOff, T = b.y - C.standOff;
  const side = (v, lo, hi, gap) => (v + gap <= hi ? v + gap : v - gap);
  // 아래쪽은 HP 띠에 가리므로 아래 모서리 블래스터는 옆 벽 아래쪽에 둔다
  if (round.kind === 'x') return [[L, T], [R, T], [L, b.y + b.h - 6], [R, b.y + b.h - 6]].map(([x, y]) => ({ x, y, a: Math.atan2(sy - y, sx - x), w: C.beamW, scale: 1 }));
  if (round.kind === 'big') return [{ x: L - 8, y: b.y + b.h * 0.25, a: 0, w: C.bigW, scale: C.bigScale }, { x: R + 8, y: b.y + b.h * 0.75, a: Math.PI, w: C.bigW, scale: C.bigScale }];
  const f = round.flip ? -1 : 1, gy = side(sy, b.y + 14, b.y + b.h - 14, C.sideGap * f), gx = side(sx, b.x + 14, b.x + b.w - 14, C.sideGap * f);
  return [{ x: L, y: sy, a: 0 }, { x: sx, y: T, a: Math.PI / 2 }, { x: R, y: gy, a: Math.PI }, { x: gx, y: T, a: Math.PI / 2 }].map(o => ({ ...o, w: C.beamW, scale: 1 }));
}
/** 상자 둘레(아래 제외)의 k 번째 자리 — 연발·고리 블래스터가 돌아가며 나온다 */
function rimSpot(k, b, C, rnd) {
  const L = b.x - C.standOff, R = b.x + b.w + C.standOff, T = b.y - C.standOff, u = 0.15 + rnd * 0.7;
  return [[L, b.y + b.h * u], [b.x + b.w * u, T], [R, b.y + b.h * u], [L, T], [R, T]][k % 5];
}
/**
 * 냄스터 블래스터 하나(가스터 블래스터식): 상자 밖 bl{x,y,a,w,scale} 로 빙글 날아와(flyIn) 떨며 겨누고(charge, 광선 줄 점선)
 * → 입을 벌려 냄새 광선(fire) → 뒤로 빠진다(leave). 광선은 상자 반대편 벽까지만. sounds:{charge,fire,layer} 를 주면 이 블래스터가 직접 낸다
 */
function spawnBlaster(api, b, bl, C, T, sounds = null) {
  const ux = Math.cos(bl.a), uy = Math.sin(bl.a), size = C.size * bl.scale, mouth = size * 0.38;
  const mx = bl.x + ux * mouth, my = bl.y + uy * mouth, reach = Math.min(C.reach, rayExit(b, mx, my, ux, uy) + 4);
  const fireAt = T.flyIn + T.charge, life = fireAt + T.fire + T.leave;
  if (sounds?.charge) api.sfx?.(sounds.charge, { volume: 0.7, rate: C.rate, pitch: true });
  api.emit({ x: mx, y: my, r: 0, harmless: true, life: fireAt, shape: 'beam_warn', free: true,
    drawShape(ctx, self) { if (self.age > T.flyIn * 0.5) dottedLine(ctx, self, mx, my, mx + ux * reach, my + uy * reach, '#c98a3f'); } });
  api.emit({ x: bl.x - ux * 90, y: bl.y - uy * 90, r: 0, kind: 'white', shape: 'blaster', free: true, life, rot: bl.a - Math.PI, fired: false,
    steer(self) {
      const age = self.age;
      if (sounds?.fire && !self.fired && age >= fireAt) { self.fired = true; api.sfx?.(sounds.fire, { volume: 0.75, rate: C.rate, pitch: true }); if (sounds.layer) api.sfx?.(sounds.layer, { volume: 0.55, rate: C.rate, pitch: true }); }
      if (age < T.flyIn) { const k = 1 - (1 - age / T.flyIn) ** 3; self.x = bl.x - ux * 90 * (1 - k); self.y = bl.y - uy * 90 * (1 - k); self.rot = bl.a - Math.PI * (1 - k); }
      else if (age < fireAt + T.fire) { const shake = age < fireAt ? 1.5 : 0.6; self.x = bl.x + Math.sin(age * 90) * shake; self.y = bl.y + Math.cos(age * 77) * shake; self.rot = bl.a; }
      else { const k = (age - fireAt - T.fire) / T.leave; self.x = bl.x - ux * 140 * k * k; self.y = bl.y - uy * 140 * k * k; self.rot = bl.a; }
    },
    hitShape(self, soul) {
      const f = self.age - fireAt; if (f < 0.05 || f > T.fire - 0.06) return false;
      return segDist(soul.x, soul.y, mx, my, mx + ux * reach, my + uy * reach) <= bl.w * 0.45 + soul.r - 2;
    },
    drawShape(ctx, self) {
      const f = self.age - fireAt, open = f >= 0;
      if (open && f < T.fire + T.leave * 0.4) {
        const grow = clamp(f / 0.06, 0, 1) * clamp((T.fire + T.leave * 0.4 - f) / 0.18, 0, 1), bw = bl.w * 1.35 * grow;
        const cell = sheetCell(api.images?.beam, 'beam', Math.floor(self.age * 16) % 2);
        ctx.save(); ctx.translate(Math.round(mx), Math.round(my)); ctx.rotate(bl.a); ctx.imageSmoothingEnabled = false;
        if (cell && cell.width) ctx.drawImage(cell, 0, -Math.round(bw / 2), Math.round(reach), Math.max(1, Math.round(bw)));
        else { ctx.fillStyle = '#6b4320'; ctx.fillRect(0, -bw / 2, reach, bw); ctx.fillStyle = '#b07a3e'; ctx.fillRect(0, -bw / 4, reach, bw / 2); }
        ctx.restore();
      }
      const fade = f > T.fire ? clamp(1 - (f - T.fire) / T.leave, 0, 1) : 1;
      ctx.save(); ctx.globalAlpha *= fade;
      if (!drawArt(ctx, api.images?.blaster, 'blaster', open ? 1 : 0, self.x, self.y, size, null, self.rot)) {
        ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, size * 0.36, 0, TAU); ctx.fill();
        ctx.fillStyle = '#000'; ctx.fillRect(-4, -size * 0.2, 6, 6); ctx.fillRect(-4, size * 0.08, 6, 6);
        if (open) ctx.fillRect(size * 0.2, -4, size * 0.2, 8);
      }
      ctx.restore();
    } });
}
/** 흰 뼈 한 개(원작 샌즈 뼈: 막대 + 양 끝 마디) — 바닥 뼈·미끄럼 뼈 공용 */
function drawBone(ctx, x, y, w, h) {
  const bx = Math.round(x), by = Math.round(y);
  ctx.fillStyle = '#fff'; ctx.fillRect(bx + 2, by + 3, w - 4, h - 3); ctx.fillRect(bx, by, 4, 4); ctx.fillRect(bx + w - 4, by, 4, 4);
}
/** 0. 오프닝 첫 강공격: 샌즈 첫 공격 순서(파란 하트 내리꽂기 → 바닥 뼈 → 미끄럼 뼈 → 띵 → 냄스터 블래스터 판들) */
function blaster(o = {}) {
  const C = { ...BLASTER, ...o };
  const rounds = C.rounds.map(r => ({ ...r, spawned: false, fired: false, next: 0, made: 0 }));
  const slides = C.slides.map(s => ({ ...s, spawned: false })), S = C.slam, T = C;
  let eye = false, bones = false, bell = false, landedSeen = 0;
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, soul = api.soul;
    if (!eye) {
      eye = true; api.sfx?.(C.eyeSfx, { volume: 0.8, rate: C.eyeRate, pitch: true });
      if (soul) { soul.blue = { g: S.g, jump: S.jump }; soul.vy = S.speed; landedSeen = soul.landed || 0; }
    }
    if (soul?.blue && (soul.landed || 0) > landedSeen) { landedSeen = soul.landed; api.sfx?.('impact', { volume: 0.7 }); }
    if (!bones && t >= S.boneWarnAt) {
      bones = true;
      const top = b.y + b.h - S.boneH, rise = S.boneWarn, hold = S.boneHold, drop = S.boneDrop;
      // 경고: 바닥 띠 테두리가 깜빡인다(원작 obj_bonestab 경고 상자)
      api.emit({ x: b.x + 2, y: top, r: 0, harmless: true, life: rise, shape: 'bone_warn',
        drawShape(ctx, self) { if (!blink(self, 10)) return; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(b.x + 4), Math.round(top), Math.round(b.w - 8), S.boneH - 3); } });
      api.emit({ x: b.x, y: top, r: 0, kind: 'white', shape: 'bones', life: rise + hold + drop, risen: false,
        steer(self) { if (!self.risen && self.age >= rise) { self.risen = true; api.sfx?.('sans_bone', { volume: 0.7 }); } },
        height(self) { const a = self.age - rise; if (a < 0) return 0; if (a < 0.08) return S.boneH * a / 0.08; if (a < hold) return S.boneH; return S.boneH * Math.max(0, 1 - (a - hold) / drop); },
        hitShape(self, s2) { const h = self.height(self); return h > 4 && s2.y + s2.r - 2 > b.y + b.h - h; },
        drawShape(ctx, self) {
          const h = Math.round(self.height(self)); if (h <= 0) return;
          ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip();
          for (let x = b.x + 4; x < b.x + b.w - 4; x += S.boneW + S.boneGap) drawBone(ctx, x, b.y + b.h - h, S.boneW, h);
          ctx.restore();
        } });
    }
    // 미끄럼 뼈: 파란 하트일 때 바닥을 따라 옆에서 뼈 세 개가 몰려온다 → ↑ 로 넘는다(갈수록 높게)
    for (const sl of slides) {
      if (sl.spawned || t < sl.at) continue;
      sl.spawned = true; api.sfx?.('sans_bone', { volume: 0.6 });
      for (let i = 0; i < C.slideCount; i++) {
        const w = S.boneW, startX = sl.from > 0 ? b.x + b.w + 4 + i * (w + C.slideGapPx) : b.x - 4 - w - i * (w + C.slideGapPx), vx = -sl.from * C.slideSpeed;
        api.emit({ x: startX, y: b.y + b.h - sl.h, r: 0, kind: 'white', shape: 'slide_bone', vx, life: (b.w + 80) / C.slideSpeed, w, h: sl.h,
          out() { return this.age >= this.life; },
          hitShape(self, s2) { return s2.x + s2.r - 3 > self.x && s2.x - s2.r + 3 < self.x + self.w && s2.y + s2.r - 2 > self.y; },
          drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip(); drawBone(ctx, self.x, self.y, self.w, self.h); ctx.restore(); } });
      }
    }
    if (!bell && t >= S.bellAt) { bell = true; if (soul) { soul.blue = null; soul.vy = 0; } api.sfx?.('bell', { volume: 0.7 }); }
    for (const round of rounds) {
      if (round.kind === 'ring') {
        while (t >= round.at + round.made * round.every && round.made < round.n) {
          const [x, y] = rimSpot(round.made, b, C, api.rnd()); round.made++;
          spawnBlaster(api, b, { x, y, a: Math.atan2(soul.y - y, soul.x - x), w: C.beamW, scale: 1 }, C, T, { charge: round.made === 1 ? C.chargeSfx : null, fire: C.fireSfx });
        }
        continue;
      }
      if (!round.spawned && t >= round.at) {
        round.spawned = true; api.sfx?.(C.chargeSfx, { volume: 0.8, rate: C.rate, pitch: true });
        for (const bl of blasterRound(round, b, soul, C)) spawnBlaster(api, b, bl, C, T);
      }
      if (round.spawned && !round.fired && t >= round.at + T.flyIn + T.charge) { round.fired = true; api.sfx?.(C.fireSfx, { volume: 0.8, rate: C.rate, pitch: true }); api.sfx?.(C.fireLayer, { volume: 0.6, rate: C.rate, pitch: true }); }
    }
  } };
}
/** 냄스터 블래스터 연발(사용자 “하나씩 여러번 빠르게 쏘는 패턴”): 상자 둘레를 돌며 한 개씩 0.4초마다 소울을 겨눠 쏜다 */
function blasterRapid(o = {}) {
  const C = { ...BLASTER, ...BLASTER_RAPID, ...o };
  let made = 0;
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    while (made < C.count && t >= C.first + made * C.every) {
      const [x, y] = rimSpot(made, b, C, api.rnd()); made++;
      spawnBlaster(api, b, { x, y, a: Math.atan2(api.soul.y - y, api.soul.x - x), w: C.beamW, scale: 1 }, C, C, { charge: C.chargeSfx, fire: C.fireSfx });
    }
  } };
}
/** 냄스터 블래스터 일제(사용자 “여러개씩 간격 더 두고 쏘는패턴”): 다섯 개씩 한꺼번에, 판 사이 1.65초 — 가로 줄 → 세로 줄 → 소울로 모이기 → 큰 것 둘 + 엇갈림 */
function blasterVolley(o = {}) {
  const C = { ...BLASTER, ...BLASTER_VOLLEY, ...o };
  let n = 0;
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, soul = api.soul;
    while (n < C.kinds.length && t >= C.first + n * C.every) {
      const kind = C.kinds[n++], L = b.x - C.standOff, R = b.x + b.w + C.standOff, Tp = b.y - C.standOff;
      const skip = Math.floor(api.rnd() * 5);
      let list = [];
      if (kind === 'rows') list = [0, 1, 2, 3, 4].filter(i => i !== skip).map(i => ({ x: i % 2 ? R : L, y: b.y + b.h * (i + 0.5) / 5, a: i % 2 ? Math.PI : 0 }));
      else if (kind === 'cols') list = [0, 1, 2, 3, 4].filter(i => i !== skip).map(i => ({ x: b.x + b.w * (i + 0.5) / 5, y: Tp, a: Math.PI / 2 }));
      else if (kind === 'aim') list = [[L, Tp], [R, Tp], [L, b.y + b.h * 0.6], [R, b.y + b.h * 0.6], [b.x + b.w / 2, Tp]].map(([x, y]) => ({ x, y, a: Math.atan2(soul.y - y, soul.x - x) }));
      else list = [{ x: L - 8, y: b.y + b.h * 0.25, a: 0, big: true }, { x: R + 8, y: b.y + b.h * 0.75, a: Math.PI, big: true }, { x: b.x + b.w * 0.3, y: Tp, a: Math.PI / 2 }, { x: b.x + b.w * 0.7, y: Tp, a: Math.PI / 2 }];
      api.sfx?.(C.chargeSfx, { volume: 0.8, rate: C.rate, pitch: true });
      for (const bl of list) spawnBlaster(api, b, { ...bl, w: bl.big ? C.bigW : C.beamW, scale: bl.big ? C.bigScale : 1 }, C, C);
      const fireIn = C.flyIn + C.charge;
      api.emit({ x: 0, y: 0, r: 0, harmless: true, free: true, life: fireIn + 0.01, shape: 'volley_clock', fired: false,
        steer(self) { if (!self.fired && self.age >= fireIn) { self.fired = true; api.sfx?.(C.fireSfx, { volume: 0.8, rate: C.rate, pitch: true }); api.sfx?.(C.fireLayer, { volume: 0.6, rate: C.rate, pitch: true }); } },
        drawShape() {} });
    }
  } };
}
/** 용준대포(사용자 “용준 대포 가져와서 쏘는 패턴”): 오른쪽에서 돼지코 나무대포(쮼앰대포)를 끌고 와 포탄을 쏜다
 *  착지 표시(0.5초) → 포탄이 포물선으로 날아와 그 자리에서 폭파 이펙트(반지름 24) + 파편 여섯. 세 번째마다 세 발. 발사 쾅(snd_impact)·폭발(explosion) */
function cannon(o = {}) {
  const C = { ...CANNON, ...o };
  let gun = null, shot = 0;
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    if (!gun) {
      const gx = b.x + b.w + C.gunX, gy = b.y + b.h * C.gunY;
      gun = keep(api, { x: gx + 120, y: gy, r: 0, harmless: true, free: true, life: C.duration + 0.05, shape: 'cannon', kick: -1, gx, gy,
        out() { return this.age >= this.life; },
        steer(self) { const k = clamp(self.age / C.enter, 0, 1); self.x = self.gx + 120 * (1 - k) ** 2 + (self.kick >= 0 && self.age - self.kick < 0.15 ? 6 * (1 - (self.age - self.kick) / 0.15) : 0); },
        drawShape(ctx, self) {
          const img = api.images?.cannon; if (!img || !img.width) { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(self.x - 30, self.y - 14, 60, 28); return; }
          const w = img.width * C.scale, h = img.height * C.scale;
          ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.scale(-1, 1); ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2), Math.round(w), Math.round(h)); ctx.restore();
        } });
      api.sfx?.('sans_blaster_charge', { volume: 0.5, rate: 0.8, pitch: true });
    }
    while (shot < C.shots && t >= C.first + shot * C.every) {
      shot++;
      const soul = api.soul, m = C.blastR;
      const xs = shot % C.triple === 0 ? [-58, 0, 58] : [0];
      const targets = xs.map(dx => [clamp(soul.x + dx, b.x + m, b.x + b.w - m), clamp(soul.y + (dx ? 18 : 0), b.y + m, b.y + b.h - m)]);
      const mx = gun.gx + C.muzzle[0], my = gun.gy + C.muzzle[1];
      gun.kick = gun.age; api.sfx?.('impact', { volume: 0.6 });
      for (const [tx, ty] of targets) {
        api.emit({ x: tx, y: ty, r: C.blastR, harmless: true, life: C.warn, shape: 'mark' });
        api.emit({ x: mx, y: my, r: 0, harmless: true, free: true, life: C.warn, shape: 'cannonball', landed: false,
          steer(self) {
            const k = clamp(self.age / C.warn, 0, 1);
            self.x = mx + (tx - mx) * k; self.y = my + (ty - my) * k - Math.sin(k * Math.PI) * C.arc;
            if (!self.landed && self.age >= C.warn - 0.02) { self.landed = true; boom(api, b, tx, ty, C, tx === targets[0][0]); }
          },
          drawShape(ctx, self) { if (!drawArt(ctx, api.images?.ball, 'ball', 0, self.x, self.y, C.ballSize)) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(self.x, self.y, C.ballSize / 2, 0, TAU); ctx.fill(); } } });
      }
    }
  } };
}
/** 포탄 착지: 폭파 이펙트 프레임(assets/fx/explosion.png 31장, 사용자 지정 “폭파 이펙트”) + 파편 */
function boom(api, b, x, y, C, sound) {
  if (sound) api.sfx?.('explosion', { volume: 0.55 });
  api.emit({ x, y, r: C.blastR, kind: 'white', shape: 'blast', free: true, life: 31 / 20,
    hitShape(self, soul) { return self.age < C.blast && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.blastR + soul.r - 4; },
    drawShape(ctx, self) { drawArt(ctx, api.images?.boom, 'boom', Math.min(30, Math.floor(self.age * 20)), self.x, self.y - 14, C.boomW); } });
  for (let k = 0; k < C.shrapnel; k++) {
    const a = k / C.shrapnel * TAU + 0.3;
    api.emit({ x, y, r: 3, kind: 'white', shape: 'shrapnel', vx: Math.cos(a) * C.shrapnelSpeed, vy: Math.sin(a) * C.shrapnelSpeed, life: 1.1,
      ...inside(b, (ctx, s) => { if (!drawArt(ctx, api.images?.crumb, 'crumb', 0, s.x, s.y, 9, null, s.age * 8)) drawSpit(ctx, s); }) });
  }
}

export const YONGJUN_PATTERNS = { yongjun_blaster: blaster, yongjun_stench: stench, yongjun_blaster_rapid: blasterRapid, yongjun_fish: fishCough, yongjun_roll: roll, yongjun_cannon: cannon, yongjun_cry: cry, yongjun_blaster_volley: blasterVolley, yongjun_insults: insults, yongjun_hug: hugShock };
