// 리듬 게임 Esc 취소·노래 영상 Blob 적재(BUILD267): QA rhythm_stage → 씬이 열리면 노래 영상 src 가 blob: → Esc → 공연 뒤 연출 없이 대기실(youngcle12)로, 플래그 없음, 대기 뚜울라 그대로. 실행: tests/playtest/run.sh rhythm-cancel
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright-core';
import { escToTitle } from './lib/esc.mjs';
const shots = process.env.SHOT_DIR; fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails += 1; console.log('FAIL', msg); } else console.log('ok', msg); };
const cap = async n => { await page.screenshot({ path: path.join(shots, 'rhythm_cancel_' + n + '.png') }); };
const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms, polling: 30 }).then(() => true).catch(() => false);
try {
  await page.goto('http://localhost:8000/?qa=rhythm_stage');
  check(await until(() => !!window.__rhythm, 25000), '리듬 씬 열림');
  check(await until(() => (window.__rhythm.state.videos || []).some(v => v && v.src.startsWith('blob:')), 15000), '노래 영상은 blob: 으로 통째로 받았다(서버 스트리밍 의존 없음)');
  const srcs = await page.evaluate(() => (window.__rhythm.state.videos || []).map(v => v ? v.src.slice(0, 5) : null)); console.log('video srcs', JSON.stringify(srcs));
  await page.waitForTimeout(800); await cap('00_scene');
  await escToTitle(page);
  check(await until(() => !window.__rhythm && !window.game.scene3d, 8000), 'Esc → 씬 닫힘');
  check(await until(() => window.game.mapId === 'youngcle12' && !window.game.transitioning && !window.game.dialogue.running && window.game.fade.alpha === 0, 15000), '대기실로 돌아옴(공연 뒤 연출 없음)');
  await page.waitForTimeout(400); await cap('01_back');
  const s = await page.evaluate(() => { const g = window.game; return { done: !!g.flags.rhythm_stage_done, result: g.flags.rhythm_result, ttuulla: g.entities.some(e => /ttuulla/.test(e.id || '') && !e.dead), text: g.textbox.node?.text || null, map: g.mapId }; });
  check(!s.done && s.result === 'cancel' && s.ttuulla && !s.text, `플래그 없음·취소 기록·뚜울라 그대로 ${JSON.stringify(s)}`);
} catch (e) { fails += 1; console.log('FAIL exception', e.message); await cap('99_error'); }
check(errors.length === 0, `페이지 오류 없음 ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
console.log('fails=' + fails);
process.exit(fails ? 1 : 0);
