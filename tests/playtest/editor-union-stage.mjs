import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/editor-union-stage-playtest';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const checks = [], errors = [], captured = new Set();
page.on('pageerror', error => errors.push(error.message));
const check = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
};
const snapshot = () => page.evaluate(async () => {
  const { drawEditorUnionWorld } = await import('/src/scenes/editor-union-effects.js');
  const calls = [];
  drawEditorUnionWorld({ drawImage: (...args) => calls.push(args), fillRect() {}, beginPath() {}, ellipse() {}, fill() {} }, game, game.camera);
  const atlas = game.propImages['assets/props/editor-union-crowd.png'];
  return {
    map: game.mapId, running: game.dialogue.running, index: game.dialogue.i,
    box: game.textbox.state, text: game.textbox.node?.text || '',
    audience: game.entities.filter(actor => actor.id === 'stage_audience').map(actor => ({ visible: actor.visible, x: actor.x, y: actor.y })),
    busts: calls.filter(args => args[0] === atlas).length,
    crowdPositions: calls.filter(args => args[0] === atlas).map(args => args.slice(5, 7)),
    zoom: game.zoom.s, dim: game.editorUnionStage?.dim, light: game.editorUnionStage?.spotlight,
    done: game.has('editor_union_stage_done'),
    bgm: game.sound.bgmName, bgmPlaying: game.sound.bgm ? !game.sound.bgm.paused : false,
    bgmTime: game.sound.bgm?.currentTime, bgmVolume: game.sound.bgm?.volume,
    parkFly: game.entities.find(actor => actor.id === 'park_guardian_costume')?.flyY,
  };
});
const capture = async name => {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: path.join(shots, `${name}.png`) });
  fs.writeFileSync(path.join(shots, `${name}.json`), JSON.stringify(await snapshot(), null, 2));
  captured.add(name);
};

try {
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8874'}/?qa=youngcle7`);
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle7');
  await page.keyboard.press('KeyX');
  let state = await snapshot();
  check('entry has 48 seated busts before any script', state.busts === 48 && !state.running && state.audience[0]?.visible, state);
  await capture('entry');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.dialogue.running);
  await page.keyboard.up('ArrowRight');
  const wanted = new Map([
    ['* ㅁ..뭐지 여긴?', 'light-on'],
    ['* 저희들의 스테이지~ 입니다.', 'wide-audience'],
    ['* 저희 엄청 대박인 배에는 여기로 빨려들어온 거의 모든 시청자들을 전부 모아놨습니다.', 'later-dialogue'],
    ['* 편집노조다!', 'union-introduction'],
    ['* 감사합니다 감사합니다 감사합니다.', 'thanks'],
  ]);
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    state = await snapshot();
    if (!state.running && state.done) break;
    if (state.parkFly < -40 && state.parkFly > -390 && !captured.has('park-descent')) await capture('park-descent');
    const name = wanted.get(state.text);
    if (state.box === 'typing') await page.keyboard.press('KeyX');
    if (name && state.box === 'waiting' && !captured.has(name)) {
      check(`${name} retains 48 seated busts`, state.busts === 48 && state.audience[0]?.visible, state);
      await capture(name);
      if (name === 'wide-audience') {
        for (const width of [375, 768]) {
          await page.setViewportSize({ width, height: 900 });
          await capture(`wide-audience-${width}`);
        }
        await page.setViewportSize({ width: 1280, height: 900 });
        await capture('wide-audience-motion');
        const motion = await snapshot();
        check('crowd cheers move existing atlas busts', JSON.stringify(state.crowdPositions) !== JSON.stringify(motion.crowdPositions), { count: motion.busts });
      }
      if (name === 'thanks') {
        await page.waitForFunction(() => game.sound.bgm?.currentTime > 0.15 && game.sound.bgm?.volume > 0);
        const music = await snapshot();
        check('thanks restarts designated BGM playback', music.bgm === 'editor_union_stage' && music.bgmPlaying && music.bgmVolume > 0, music);
        const clip = await page.evaluate(async () => {
          const stream = game.sound.bgm.captureStream();
          const recorder = new MediaRecorder(stream);
          const chunks = [];
          recorder.ondataavailable = event => chunks.push(event.data);
          const stopped = new Promise(resolve => { recorder.onstop = resolve; });
          recorder.start();
          await new Promise(resolve => setTimeout(resolve, 1200));
          recorder.stop(); await stopped;
          const data = await new Promise(resolve => {
            const reader = new FileReader(); reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(new Blob(chunks, { type: recorder.mimeType }));
          });
          stream.getTracks().forEach(track => track.stop());
          return data.split(',')[1];
        });
        fs.writeFileSync(path.join(shots, 'thanks-bgm.webm'), Buffer.from(clip, 'base64'));
      }
    }
    if (state.box === 'waiting') await page.keyboard.press('KeyC');
    await page.waitForTimeout(70);
  }
  state = await snapshot();
  // 무대 소개가 끝나면 바로 파크가디언 전투로 넘어간다(BUILD165+) — 전투 브금이 켜진 채 소개 연출이 끝난 것도 정상
  check('intro ends with the crowd still seated (control back, or handed over to the park guardian battle)', state.done && state.busts === 48 && ((!state.running && state.bgm === 'editor_union_stage') || state.bgm === 'park_guardian'), state);
  await capture('control-restored');
  for (const name of wanted.values()) check(`captured ${name}`, captured.has(name));
  const feather = await page.evaluate(() => {
    const wash = game.editorUnionLightMask.stageWash;
    const ctx = wash.getContext('2d');
    const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
    return { center: pixel(360, 200), left: [0, 30, 90, 180].map(x => pixel(x, 200)[3]), right: [719, 689, 629, 539].map(x => pixel(x, 200)[3]),
      top: [0, 16, 48, 100].map(y => pixel(360, y)[3]), bottom: [399, 383, 351, 299].map(y => pixel(360, y)[3]) };
  });
  check('warm light feathers to transparent on all four sides', ['left', 'right', 'top', 'bottom'].every(side => feather[side][0] < 2 && feather[side].every((alpha, i, values) => i === 0 || alpha > values[i - 1])) && feather.center[0] > feather.center[1] && feather.center[1] > feather.center[2], feather);
  // 소개 뒤엔 파크가디언 전투가 이어져 대사가 계속 돈다(BUILD165+) — 재입장 검사는 전투가 끝난 QA(철창 닫힌 뒤)에서 새로 연다
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8874'}/?qa=park_guardian_after_grate`);
  await page.waitForFunction(() => window.game?.player && game.mapId === 'youngcle7' && !game.dialogue.running, null, { timeout: 30000 });
  await page.evaluate(() => { game.changeMap('youngcle6', 'from_stage', true, { enter: false }); game.changeMap('youngcle7', 'after_intro', true, { enter: false }); });
  await page.waitForFunction(() => game.mapId === 'youngcle7' && !game.dialogue.running);
  state = await snapshot();
  check('completed reentry keeps the same permanent crowd', state.done && state.busts === 48 && state.audience.length === 1, state);
  await capture('completed-reentry');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
  await capture('completed-reentry-approach');
  // 파크가디언 승리 후 박치기(BUILD192): ‘넌 니애미 따라가라’ 뒤 카메라가 억빠맨을 따라가 박치기하러 달려가는 게 화면 안에 보인다(주인공 고정이면 화면 밖 — 사용자)
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8874'}/?qa=park_guardian_after`);
  await page.waitForFunction(() => window.game && window.game.dialogue && window.game.dialogue.running, null, { timeout: 25000 });
  let kickLine = false;
  for (let i = 0; i < 40; i++) { const t = await page.evaluate(() => game.textbox.node?.text || ''); if (t.includes('니애미')) { kickLine = true; break; } await page.keyboard.press('KeyC'); await page.waitForTimeout(160); }
  await page.keyboard.press('KeyC'); await page.waitForTimeout(120); await page.keyboard.press('KeyC');
  const kick = await page.evaluate(() => new Promise(resolve => { const out = []; const t0 = performance.now(); const tick = () => { const p = game.entities.find(e => e.id === 'ppaman' && !e.dead); out.push({ px: p ? Math.round(p.x) : null, camx: Math.round(game.camera.x), inView: !!p && p.x >= game.camera.x && p.x + p.w <= game.camera.x + 480, target: game.camera.target?.id }); if (performance.now() - t0 > 700) resolve(out); else setTimeout(tick, 100); }; tick(); }));
  await capture('park-headbutt');
  check('camera follows ppaman for the headbutt', kickLine && kick.length > 3 && kick.every(k => k.inView) && kick.some(k => k.target === 'ppaman'), { kickLine, kick });
  check('browser has no runtime errors', errors.length === 0, errors);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, captured: [...captured] }, null, 2));
  await browser.close();
}
const failures = checks.filter(check => !check.pass).length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
