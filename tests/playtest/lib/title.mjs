// 타이틀 흐름(BUILD425~): 아무 키 → 로고 확대(zoom) → locked. PROMPT_DELAY(3초) 뒤 메뉴 입력을 받는다.
//   세이브 있음: [이어하기 · 리셋] → 이어하기 C → 확인창(askContinue) C → 게임. 리셋 C → 확인창(askReset) C → 세이브 삭제, 메뉴는 [시작].
//   세이브 없음: [시작] C → 팬메이드 안내(notice, 0.4초 뒤 입력) C → 오프닝.
// 고정 대기 대신 game.title 필드를 기다린다. 성공하면 true, 시간이 다 되면 false.

const PROMPT_READY = 3.1;

async function poll(page, fn, arg, timeout) {
  return page.waitForFunction(fn, arg, { timeout, polling: 40 }).then(() => true, () => false);
}

/** 타이틀을 메뉴 입력이 가능한 상태(locked, 안내 문구 뜬 뒤)까지 진행한다. wait 이면 아무 키, zoom 이면 C 로 확대를 건너뛴다. */
export async function titleReady(page, { timeout = 20000 } = {}) {
  const t0 = Date.now();
  if (!await poll(page, () => window.game?.state === 'title' && !!window.game.title, null, timeout)) return false;
  while (Date.now() - t0 < timeout) {
    const s = await page.evaluate(() => ({ state: game.state, phase: game.title.phase, time: game.title.time, boot: !!game.bootLoad?.active, leaving: game.title.leaving }));
    if (s.state !== 'title') return false;
    if (s.phase === 'locked' && s.time > PROMPT_READY && !s.leaving) return true;
    if (s.phase === 'wait' && !s.boot) await page.keyboard.press('KeyX');
    else if (s.phase === 'zoom') await page.keyboard.press('KeyC');
    await page.waitForTimeout(120);
  }
  return false;
}

/** 세이브에서 이어하기: 메뉴 [이어하기] → C → 확인창 → C. 타이틀을 떠나기 시작하면 true. */
export async function titleContinue(page, { timeout = 20000 } = {}) {
  if (!await titleReady(page, { timeout })) return false;
  if (!await page.evaluate(() => game.hasSave())) return false;
  if (await page.evaluate(() => game.title.pick !== 0)) { await page.keyboard.press('ArrowLeft'); await poll(page, () => game.title.pick === 0, null, 2000); }
  await page.keyboard.press('KeyC');
  await poll(page, () => !!game.title.askContinue || game.title.leaving || game.state !== 'title', null, 3000);
  if (await page.evaluate(() => !!game.title.askContinue)) await page.keyboard.press('KeyC');
  return poll(page, () => game.title.leaving || game.state !== 'title', null, 3000);
}

/** 세이브 지우기: 메뉴 [리셋] → C → 확인창 → C. 메뉴가 [시작] 하나로 바뀌면 true. */
export async function titleReset(page, { timeout = 20000 } = {}) {
  if (!await titleReady(page, { timeout })) return false;
  if (!await page.evaluate(() => game.hasSave())) return true;
  await page.keyboard.press('ArrowRight'); await poll(page, () => game.title.pick === 1, null, 2000);
  await page.keyboard.press('KeyC');
  if (!await poll(page, () => game.title.askReset, null, 3000)) return false;
  await page.keyboard.press('KeyC');
  return poll(page, () => !game.title.askReset && !game.hasSave(), null, 3000);
}

/** 새 게임: (세이브가 있으면 reset:true 일 때 먼저 지우고) [시작] → C → 팬메이드 안내 → C. 타이틀을 떠나기 시작하면 true. */
export async function titleNewGame(page, { timeout = 20000, reset = false } = {}) {
  if (reset && !await titleReset(page, { timeout })) return false;
  if (!await titleReady(page, { timeout })) return false;
  if (await page.evaluate(() => game.hasSave())) return false;
  await page.keyboard.press('KeyC');
  if (!await poll(page, () => !!game.title.notice && game.title.notice.t > 0.45, null, 3000)) return false;
  await page.keyboard.press('KeyC');
  return poll(page, () => game.title.leaving || game.state !== 'title', null, 3000);
}
