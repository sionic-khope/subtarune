// BUILD329: Esc 는 경고창(예/아니요)을 먼저 띄운다. 시나리오가 "Esc 로 타이틀"을 뜻할 때 실제 키로 예를 고른다.
// 창이 안 뜨는 상황(전환 중·줌 중·3D 장면이 Esc 를 가져감)에서는 Esc 한 번만 누른 것과 같다.
export async function escToTitle(page, options) {
  await page.keyboard.press('Escape', options);
  const opened = await page.waitForFunction(() => !!window.game?.escConfirm, null, { timeout: 600, polling: 16 }).then(() => true, () => false);
  if (!opened) return false;
  await page.keyboard.press('ArrowLeft', { delay: 30 });
  await page.waitForFunction(() => window.game?.escConfirm?.i === 0, null, { timeout: 1000, polling: 16 }).catch(() => {});
  await page.keyboard.press('KeyC', { delay: 30 });
  await page.waitForFunction(() => !window.game?.escConfirm, null, { timeout: 1000, polling: 16 }).catch(() => {});
  return true;
}
