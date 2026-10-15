// 타이틀 Shift+Q 목록 맨 아래 = 보라꽃 든 채 마이야르호 라운지(BUILD463 사용자 “시프트큐 하단에 그거 갈수있는거 추가해줘 걍 꽃 얻은상태로 라운지맵”).
import { runScenario } from './lib/harness.mjs';
import { titleReady } from './lib/title.mjs';

await runScenario({ name: 'yongjun-qa-menu' }, async ({ page, check, until, press, shot, open }) => {
  await open();
  check('타이틀 메뉴 준비', await titleReady(page));
  await press('Shift+KeyQ'); await page.waitForTimeout(200);
  await press('ArrowUp'); await page.waitForTimeout(250);
  const picked = await page.evaluate(async () => { const { QA_POINTS } = await import('/src/core/story.js'); const menu = QA_POINTS.filter(p => !p.hidden); return { i: game.title.qa?.i, last: menu.length - 1, id: menu[game.title.qa?.i]?.id }; });
  check('목록 맨 위에서 ↑ 한 번 = 맨 아래 보라꽃 지점', picked.i === picked.last && picked.id === 'yongjun_flower', JSON.stringify(picked));
  await shot('qa_menu_bottom');
  await press('KeyC');
  const landed = await until(() => game.state === 'field' && game.mapId === 'maillard_lounge' && !game.transitioning && game.fade.alpha < 0.05 ? { flower: game.inventory.filter(i => i === '보라꽃').length, party: game.party, x: game.player.x, y: game.player.y } : null, 20000);
  check('라운지 상점 앞, 보라꽃 하나, 억빠맨·경섭', landed?.flower === 1 && landed.party.includes('ppaman') && landed.party.includes('gyeongsub'), JSON.stringify(landed));
  await shot('qa_menu_lounge');
});
