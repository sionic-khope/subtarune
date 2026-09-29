// 트레일러 몽타주용 게임 녹화(BUILD408). 게임 캔버스를 captureStream(30) + MediaRecorder(VP9 고비트레이트)로 그대로 녹화한다.
// 실행: node tools/trailer/record.mjs <clip> [<clip> …]  (PW_DIR 의 playwright-core, 서버 :8000)
// 결과: assets/source/trailer408/clips/<clip>.webm — 원하는 구간은 tools/trailer/build.sh 에서 자른다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.env.PW_DIR || `${process.env.HOME}/.cache/subtarune-pw`, 'node_modules/'));
const { chromium } = require('playwright-core');
const BASE = process.env.QA_BASE_URL || 'http://localhost:8000/';
const OUT = path.resolve('assets/source/trailer408/clips');
fs.mkdirSync(OUT, { recursive: true });

const press = async (page, key, ms = 90) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
const hold = async (page, key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
/** 대사를 C 로 넘기며 기다린다(every ms 마다) */
const mash = async (page, ms, every = 900, key = 'KeyC') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await press(page, key); await page.waitForTimeout(every); } };

/** 클립 정의: qa 지점, 녹화 길이, 녹화 중 입력 */
const CLIPS = {
  // 트리거 안쪽 가까이로 옮긴 뒤 걸어 들어간다(QA 지점은 트리거 앞 멀리서 시작한다)
  tv: { qa: 'youngcle1', seconds: 22, run: page => mash(page, 21000, 1400) },
  // 리듬게임: 페이지 안 자동 연주 — 노트 시각에 맞춰 ←/→ (꼬리 노트는 끝까지 누름), 대사(talk)에서만 C. C 는 연주 중 일시 정지라 누르지 않는다
  rhythm: { qa: 'rhythm_stage', seconds: 70, setup: () => {
    const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
    const tap = code => { key('keydown', code); setTimeout(() => key('keyup', code), 50); };
    const holding = {}; let lastC = 0;
    const loop = () => {
      const r = window.__rhythm; requestAnimationFrame(loop); if (!r) { if (performance.now() - lastC > 600) { lastC = performance.now(); tap('KeyC'); } return; }
      const st = r.state;
      if (st.phase === 'talk' && performance.now() - lastC > 500) { lastC = performance.now(); tap('KeyC'); }
      if ((st.phase !== 'soundcheck' && st.phase !== 'play') || st.paused || !r.play) return;
      const t = r.songTime();
      for (const lane of ['L', 'R']) {
        const code = lane === 'L' ? 'ArrowLeft' : 'ArrowRight';
        if (holding[lane]) { if (t >= holding[lane]) { key('keyup', code); holding[lane] = 0; } continue; }
        const n = r.play.notes.find(n => n.status === 'wait' && n.lane === lane && Math.abs(n.t - t) < 0.03);
        if (!n) continue;
        key('keydown', code);
        if (n.dur > 0) holding[lane] = n.t + n.dur + 0.02; else setTimeout(() => key('keyup', code), 50);
      }
    };
    loop();
  }, run: async page => { await page.waitForTimeout(69000); } },
  // 사용자 2026-09-29 “섭리오 (억빠맨이 오 이거 쩐다 ㅋㅋ)”: 녹화 때만 억빠맨 첫 줄을 바꿔 서빙한다(게임 파일은 그대로)
  subrio: { qa: 'subrio_boss', route: { file: '**/src/scenes/subrio-core.js*', from: "PP('오 보스맵인가.')", to: "PP('오 이거 쩐다 ㅋㅋ')" }, seconds: 20, run: async page => { await mash(page, 3000, 700); for (let i = 0; i < 12; i++) { await hold(page, 'ArrowRight', 500); await press(page, 'KeyC', 200); await hold(page, 'ArrowLeft', 250); } } },
  choimis: { qa: 'jjajang_glade', seconds: 80, setup: () => { window.game.runScript('jjajang_glade_intro'); }, run: async page => { await mash(page, 78000, 1300); } },
  torii: { qa: 'jjajang_run', seconds: 26, setup: () => { const p = window.game.player; p.x = 960; p.y = 282; window.game.spawnParty?.(); window.game.camera.snap?.(); }, run: async page => { await page.keyboard.down('ArrowRight'); for (let i = 0; i < 40; i++) { await press(page, i % 3 ? 'KeyC' : 'KeyX', 90); await page.waitForTimeout(520); } await page.keyboard.up('ArrowRight'); } },
  baron: { qa: 'obj4_battle', seconds: 40, setup: () => { const p = window.game.player; p.x = 752; p.y = 1150; window.game.spawnParty?.(); window.game.camera.snap?.(); }, run: async page => { await hold(page, 'ArrowUp', 1200); await mash(page, 38000, 500); } },
  teen: { qa: 'castle_teen_battle', seconds: 30, run: async page => { await mash(page, 30000, 500); } },
  save: { qa: 'castle_sunset_run', seconds: 22, run: async page => { await mash(page, 22000, 350); } },
  meetbg: { qa: 'jjajang_sakura2', seconds: 0, still: true },
  // 사용자 2026-09-29: 청소년 전투 대신 파크가디언(대치 → 라즈마 피하기, 네 번째 적 턴)·가재맨성 누누와 윌럼프 바위 밀기
  park: { qa: 'park_guardian_battle', seconds: 110, run: async page => { await mash(page, 108000, 450); } },
  boulder: { qa: 'castle_boulder', seconds: 45, run: async page => { await mash(page, 20000, 900); for (let i = 0; i < 60; i++) { await press(page, 'KeyC', 60); await page.waitForTimeout(140); } await mash(page, 12000, 900); } },
};

async function record(name) {
  const clip = CLIPS[name]; if (!clip) throw new Error(`unknown clip ${name}`);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  page.on('pageerror', e => console.log(`[${name}] pageerror`, e.message));
  if (clip.route) await page.route(clip.route.file, async route => {
    const res = await route.fetch(); const body = (await res.text()).replace(clip.route.from, clip.route.to);
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/javascript' } });
  });
  await page.goto(new URL(`index.html?qa=${clip.qa}`, BASE).href);
  await page.waitForFunction(() => window.game?.map && !window.game.transitioning && window.game.fade.alpha < 0.05, null, { timeout: 60000 });
  if (clip.setup) await page.evaluate(clip.setup);
  if (clip.still) {
    await page.evaluate(() => { const g = window.game; g.player.visible = false; for (const e of g.entities) if (e !== g.player && e.def?.type !== 'prop') e.visible = false; g.dialogue.running = false; });
    await page.waitForTimeout(600);
    await page.locator('canvas#screen').screenshot({ path: path.join(OUT, `${name}.png`) });
    await browser.close(); return;
  }
  await page.evaluate(() => {
    // 게임 캔버스 위에 얹히는 오버레이 캔버스(리듬게임·섭리오 등)까지 화면에 보이는 대로 한 장에 합친다
    const screen = document.getElementById('screen');
    const c = document.createElement('canvas'); c.width = 960; c.height = 720;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const tick = () => {
      const base = screen.getBoundingClientRect(), sx = c.width / base.width, sy = c.height / base.height;
      x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
      for (const cv of document.querySelectorAll('canvas')) {
        if (cv === c) continue;
        const st = getComputedStyle(cv), r = cv.getBoundingClientRect();
        if (st.display === 'none' || st.visibility === 'hidden' || !r.width || !r.height) continue;
        x.globalAlpha = +st.opacity || 1;
        try { x.drawImage(cv, (r.left - base.left) * sx, (r.top - base.top) * sy, r.width * sx, r.height * sy); } catch {}
      }
      x.globalAlpha = 1; requestAnimationFrame(tick);
    };
    tick();
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 16e6 });
    window.__chunks = []; rec.ondataavailable = e => e.data.size && window.__chunks.push(e.data);
    window.__rec = rec; rec.start(1000);
  });
  const t0 = Date.now();
  await Promise.race([clip.run(page), page.waitForTimeout(clip.seconds * 1000)]);
  const left = clip.seconds * 1000 - (Date.now() - t0); if (left > 0) await page.waitForTimeout(left);
  const b64 = await page.evaluate(() => new Promise(res => {
    window.__rec.onstop = async () => { const blob = new Blob(window.__chunks, { type: 'video/webm' }); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000)); res(btoa(s)); };
    window.__rec.stop();
  }));
  fs.writeFileSync(path.join(OUT, `${name}.webm`), Buffer.from(b64, 'base64'));
  console.log(`[${name}] ${(b64.length * 0.75 / 1e6).toFixed(1)}MB`);
  await browser.close();
}

for (const name of process.argv.slice(2)) await record(name);
