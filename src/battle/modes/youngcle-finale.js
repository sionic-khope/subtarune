// 조종실 전투 피날레(BUILD208 사용자 브리핑, 적 턴 모드 'youngcle_finale'): 영클 hp 1 → “ㅋㅋ 이럴줄알고 …” “공격을 피할수있다면 …” → 브금 꺼짐 → 쥰희가 왼쪽에서 다섯 번 슬금슬금 기어 나와
//   → 웅크렸다 점프(덩크 포즈) “마이야르 점프슬램!!!!!!!!!!!!” — 슬로우모션, 영클 놀람(퀸 소리) → 화면이 쭈욱 확대되다 하얘지며 쿠와아아앙!! → 3초쯤 흰 화면 → 전투 끝(승리) → 맵으로.
//   'youngcle_skip': 보지 뒤 적 턴을 건너뛰는 빈 모드.
import { YOUNGCLE_BATTLE as C } from '../../data/youngcle-battle.js';
import { createTalk } from '../support/talk.js';
import { FONT } from '../../ui/font.js';
import { BATTLE_BGS } from '../backgrounds.js';

const loadImg = (src) => new Promise(r => { if (typeof Image === 'undefined') return r(null); const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });

export function createYoungcleSkip() { return { update() { return true; }, draw() {} }; }

export function createYoungcleFinale(battle) {
  const K = C.finale, yc = battle.enemies.find(e => e.id === 'youngcle_hover');
  let phase = 'talk', talk = createTalk(battle, K.lines), pt = 0, disposed = false, img = null, step = 0, white = 0, zoom = 1, slam = null, kieek = false, boomed = false;
  const J = { x: K.startX, y: K.ground, frame: 0 };
  loadImg(K.junhee).then(i => { img = i; });
  const setPhase = (p) => { phase = p; pt = 0; };
  const scene = (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360); BATTLE_BGS[battle.cfg.bg]?.(ctx, battle); ctx.font = FONT; ctx.textBaseline = 'top'; for (const e of battle.enemies) battle.drawEnemy(ctx, e); for (const m of battle.members) battle.drawMember(ctx, m); };
  const drawJunhee = (ctx) => { if (!img) { ctx.fillStyle = '#f4a6b4'; ctx.fillRect(J.x - 16, J.y - 28, 32, 28); return; } const fw = img.width / 2, fh = img.height / 2, w = fw, h = fh; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(J.x), Math.round(J.y)); ctx.scale(-1, 1); ctx.drawImage(img, (J.frame % 2) * fw, Math.floor(J.frame / 2) * fh, fw, fh, Math.round(-w / 2), -h, w, h); ctx.restore(); };   // 시트는 오른쪽으로 기어가는 그림 → 좌우 반전(왼쪽으로, 영클 뒤통수 쪽에서)
  return {
    fullscreen: true,
    get snapshot() { return { phase, step, junhee: { x: Math.round(J.x), y: Math.round(J.y), frame: J.frame }, white: Math.round(white * 100) / 100, zoom: Math.round(zoom * 100) / 100, kieek, boomed }; },
    update(dt, input) {
      if (disposed) return true; pt += dt;
      if (phase === 'talk') { if (talk.update(dt, input)) { setPhase('crawl'); battle.game.sound.stopBgm(0.6); battle.setText(''); } return false; }
      if (phase === 'crawl') {                                    // 다섯 번: 조금 기어오고(0.5s) 멈추고(0.65s)
        const cycle = K.crawlSeconds + K.crawlPause, k = pt / cycle, i = Math.floor(k), within = pt - i * cycle;
        if (i >= K.crawlSteps) { setPhase('crouch'); J.frame = 2; return false; }
        step = i; const moving = within < K.crawlSeconds; J.frame = moving ? Math.floor(within * 6) % 2 : 1;
        J.x = K.startX + K.crawlStep * i + (moving ? K.crawlStep * (within / K.crawlSeconds) : K.crawlStep);
        return false;
      }
      if (phase === 'crouch') { if (pt > 0.7) { setPhase('jump'); J.frame = 3; slam = createTalk(battle, [K.slam]); battle.sfx('jump', { volume: 0.9 }); } return false; }
      if (phase === 'jump') {                                     // 슬로우모션: 장면은 0.35배, 대사는 그대로
        const sdt = dt * 0.35; const from = { x: K.startX + K.crawlStep * K.crawlSteps, y: K.ground }, to = { x: yc.x + 16, y: yc.y - 44 };   // 뒤통수(오른쪽 뒤)로 덩크
        const k = Math.min(1, pt * 0.35 / 1.1); J.x = from.x + (to.x - from.x) * k; J.y = from.y + (to.y - from.y) * k - 110 * Math.sin(Math.PI * k);   // 위에서 솟았다 내리꽂는 덩크
        zoom = 1 + k * 1.4;
        if (!kieek && k > 0.15) { kieek = true; battle.sfx(C.sfx.kieek); yc.patternPose = { sheet: 'surprise', frame: 1 }; }
        slam.update(sdt, input);
        if (k >= 1) { setPhase('white'); }
        return false;
      }
      if (phase === 'white') { if (!boomed) { boomed = true; battle.sfx(C.sfx.boom); battle.game.shake = { time: 0.6, amp: 8 }; } white = Math.min(1, pt / 0.25); if (pt > 3.2) { setPhase('end'); battle.finish(true, { white: true }); } return false; }
      return false;
    },
    draw(ctx) {
      ctx.save();
      if (phase === 'jump' || phase === 'white') { const fx = (J.x + yc.x) / 2, fy = (J.y + yc.y - 60) / 2; ctx.translate(240, 180); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy); }
      scene(ctx);
      if (phase !== 'talk') drawJunhee(ctx);
      ctx.restore();
      ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      if (phase === 'talk' || phase === 'jump') battle.drawTextBox(ctx);
      if (white > 0) { ctx.fillStyle = `rgba(255,255,255,${white})`; ctx.fillRect(0, 0, 480, 360); }
      if (phase !== 'white') battle.drawHpStrip(ctx);
    },
    dispose() { disposed = true; },
  };
}
