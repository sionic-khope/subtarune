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
    ['* 저희 영클전함에는 여기로 빨려들어온 거의 모든 시청자들을 전부 모아놨습니다.', 'later-dialogue'],
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
  check('control restored with persistent crowd and music', state.done && !state.running && state.busts === 48 && state.bgm === 'editor_union_stage', state);
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
  await page.evaluate(() => { game.changeMap('youngcle6', 'from_stage', true, { enter: false }); game.changeMap('youngcle7', 'after_intro', true, { enter: false }); });
  await page.waitForFunction(() => game.mapId === 'youngcle7' && !game.dialogue.running);
  state = await snapshot();
  check('completed reentry keeps the same permanent crowd', state.done && state.busts === 48 && state.audience.length === 1, state);
  await capture('completed-reentry');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp');
  await capture('completed-reentry-approach');
  check('browser has no runtime errors', errors.length === 0, errors);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, errors, captured: [...captured] }, null, 2));
  await browser.close();
}
const failures = checks.filter(check => !check.pass).length;
console.log(`fails=${failures}`);
process.exitCode = failures ? 1 : 0;
