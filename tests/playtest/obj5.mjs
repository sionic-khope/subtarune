// QA checkpoint supplies the completed abduction; walking, boarding and firing use real keys.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const shots = process.env.SHOT_DIR || '/tmp/obj5-shots';
fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 780 } });
const errors = [], checks = [], lines = [];
let fails = 0;
page.on('pageerror', error => errors.push(error.message));
const check = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, detail ?? ''); };
const shot = name => page.screenshot({ path: path.join(shots, `${name}.png`) });
const press = () => page.keyboard.press('KeyC', { delay: 65 });
try {
  await page.goto(`${process.env.BASE_URL || 'http://localhost:8000'}/?qa=obj5`);
  await page.waitForFunction(() => !!window.game?.player);
  await page.keyboard.press('KeyX', { delay: 65 });
  await page.waitForFunction(() => !game.dialogue.running && game.fade.alpha === 0);
  await shot('01_approach');
  const start = Date.now();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => game.dialogue.running, null, { timeout: 10000 });
  await page.keyboard.up('ArrowRight');
  check('approach is about three seconds', Date.now() - start < 4000 && Date.now() - start > 2000, Date.now() - start);
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({ phase: game.seaChase?.model.phase, box: game.textbox.state, text: game.textbox.node?.text || '' }));
    if (state.phase === 'tutorial') break;
    if (state.box === 'waiting') {
      if (!lines.includes(state.text)) {
        lines.push(state.text);
        await shot(`line_${lines.length}`);
      }
      await press();
    }
    await page.waitForTimeout(65);
  }
  const state = await page.evaluate(() => ({ phase: game.seaChase?.model.phase, items: game.inventory, ride: game.ride?.id, party: game.party }));
  check('six exact lines and automatic boarding', JSON.stringify(lines) === JSON.stringify([
    '* 어 형 여기 총이 있어요.', '* 어서 이거 타고 쫒아가자. 그거 챙겨',
    '* 근데 우리 아직도 수영을 해야하니 저기 좀 넓어보이는데', '* 네',
    '* 으 으아아악 살려줘요 형', '* 형 c를 한번 눌러보세요',
  ]), lines);
  check('gun obtained once and raft retained', state.items.filter(item => item === '나무총').length === 1 && state.ride === 'obj5_raft', state);
  check('waits for real tutorial C', state.phase === 'tutorial');
  await shot('08_tutorial');
  await press();
  await page.waitForFunction(() => game.seaChase?.model.phase === 'tutorial-hit');
  await shot('09_hit');
  await page.waitForFunction(() => game.seaChase?.model.phase === 'roar');
  await shot('10_roar');
  await page.waitForFunction(() => game.seaChase?.model.phase === 'fight');
  check('specified music replaces chase music after roar', await page.evaluate(() => game.sound.bgmName === 'baron_sea_battle'));
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(550);
  await page.keyboard.up('ArrowDown');
  await press();
  await shot('11_firing');
  await page.setViewportSize({ width: 375, height: 812 });
  await shot('12_narrow');
  check('normal turn-based battle never starts', await page.evaluate(() => !game.battle));
  check('no JavaScript errors', errors.length === 0, errors);
} finally {
  fs.writeFileSync(path.join(shots, 'report.json'), JSON.stringify({ checks, lines, errors, fails }, null, 2));
  await browser.close();
}
console.log(`fails=${fails}`);
process.exitCode = fails ? 1 : 0;
