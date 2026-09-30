// 이어하기 목록(BUILD437·438, 사용자 2026-09-30): 청록숲5 까지 간 세이브 → 타이틀 이어하기 C → 목록(마지막 세이브 + 도달 지점 최신부터, 5개씩, 플레이어용 이름)
//   → 좌우 쪽 넘기기·꾹 누르기 → 과거 지점(낙석 길 1) → 가장 멀리 간 세이브는 그대로 → 다시 목록에서 “가장 멀리 간 곳” → 청록숲5 로 복귀.
// 실행: tests/playtest/run.sh continue-list
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { titleReady } from './lib/title.mjs';
const QA_BASE = (process.env.QA_BASE_URL || 'http://localhost:8000/').replace(/\/?$/, '/');
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = n => page.locator('canvas').first().screenshot({ path: path.join(shots, 'continue_list_' + n + '.png') });
const saves = () => page.evaluate(() => {
  const r = k => { const d = JSON.parse(localStorage.getItem(k) || 'null'); return d && { map: d.map, qaIdx: d.qaIdx, past: d.past }; };
  return { save: r('subtarune.save.v1'), best: r('subtarune.best.v1') };
});
const list = () => page.evaluate(() => { const c = game.title.askContinue; return c && { i: c.i, n: c.items.length, labels: c.items.map(x => x.label), ids: c.items.map(x => x.pt?.id || x.key) }; });
const openList = async () => {
  await page.goto(QA_BASE);
  if (!await titleReady(page)) throw new Error('title not ready');
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => !!game.title.askContinue, null, { timeout: 3000 });
};
try {
  // ① 청록숲5 까지 진행한 세이브(바로가기도 실제 진행처럼 도달 순번을 남긴다)
  await page.goto(`${QA_BASE}?qa=teal5`);
  await page.waitForFunction(() => window.game?.mapId === 'teal5', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  const s1 = await saves();
  check(s1.save?.map === 'teal5' && s1.best?.map === 'teal5' && s1.save.qaIdx === s1.best.qaIdx && s1.save.qaIdx > 0, '청록숲5 세이브·가장 멀리 간 세이브 ' + JSON.stringify(s1));

  // ② 목록: 첫 줄 마지막 세이브, 다음 줄부터 도달 지점 최신부터, 미래 지점 없음, 개발용 표기 없음
  await openList();
  let l = await list();
  check(l.ids[0] === 'subtarune.save.v1' && l.ids[1] === 'teal5' && l.ids.at(-1) === 'opening', '목록 순서(마지막 세이브 → 청록숲5 → … → 오프닝) ' + JSON.stringify(l.ids.slice(0, 4)));
  check(l.n === s1.save.qaIdx + 2 && !l.ids.includes('teal6'), `미래 지점 없음(${l.n}줄)`);
  check(l.labels.every(t => !/[()→]|QA|직행|보라맵|옵젝영역\d|청록숲\d/.test(t)), '개발용 표기 없음 ' + JSON.stringify(l.labels.slice(0, 6)));
  await cap('page1');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
  check((await list()).i === 5, '오른쪽 → 다음 쪽 첫 줄');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
  check((await list()).i === 0, '왼쪽 → 앞 쪽');
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown');
  const held = (await list()).i;
  check(held >= 8, '아래 꾹 누르면 연속 이동 ' + held);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight');
  l = await list();
  check(l.i === l.n - 1, '오른쪽 꾹 누르면 끝 쪽까지 ' + l.i);
  await cap('last_page');

  // ③ 과거 지점(낙석 길 1)으로: 가장 멀리 간 세이브는 덮이지 않는다
  const rock = l.ids.indexOf('rock1');
  await page.evaluate(i => { game.title.askContinue.i = i; }, rock);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.game?.mapId === 'void5' && game.state === 'field', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => game.autosave());
  const s2 = await saves();
  check(s2.save?.map === 'void5' && s2.save.past === true && s2.best?.map === 'teal5' && s2.best.qaIdx === s1.best.qaIdx, '과거 지점 플레이 중에도 가장 멀리 간 세이브 유지 ' + JSON.stringify(s2));
  check(!(await page.evaluate(() => game.inventory)).includes('바나나'), '과거 지점 아이템은 그 시점 기준(바나나 없음)');
  await cap('rock1');

  // ④ 다시 목록: 마지막 플레이(낙석 길) + 가장 멀리 간 곳(청록숲) → 고르면 청록숲5
  await openList();
  l = await list();
  check(l.ids[0] === 'subtarune.save.v1' && l.ids[1] === 'subtarune.best.v1' && l.ids[2] === 'teal5', '마지막 플레이 → 가장 멀리 간 곳 → 도달 지점 ' + JSON.stringify(l.labels.slice(0, 3)));
  check(l.labels[0].includes('낙석 길 1') && l.labels[1].includes('물길의 뗏목'), '세이브 줄에 장면 이름');
  await cap('page1_after_past');
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(150);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.game?.state === 'field', null, { timeout: 30000 });
  await page.waitForTimeout(800);
  check(await page.evaluate(() => game.mapId) === 'teal5', '가장 멀리 간 곳 → 청록숲5');
} catch (e) { fails += 1; console.log('CRASH', e.message); }
check(errors.length === 0, 'pageerror 없음 ' + JSON.stringify(errors));
console.log(`fails=${fails}`);
await browser.close();
