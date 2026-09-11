// 레이아웃 예산(src/core/layout.js)이 실제 코드 리터럴과 같은지 — 어긋나면 감사 테스트가 엉뚱한 값으로 잰다 (2026-09-11 레이아웃 포스트모텀)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCREEN_H, TEXTBOX_TOP, DIALOGUE_VISIBLE_H, BATTLE_PANEL_TOP, PROBE_RANGE, TILE } from '../../src/core/layout.js';

const root = new URL('../../', import.meta.url).pathname;
const src = (p) => fs.readFileSync(root + p, 'utf-8');

test('test_layout_textbox_top_matches_dialogue_box_rect', () => {
  const m = src('src/ui/dialogue.js').match(/y: SCREEN_H - (\d+), w: SCREEN_W - 24, h: (\d+)/);
  assert.ok(m, '대화창 사각형을 못 찾음');
  assert.equal(TEXTBOX_TOP, SCREEN_H - Number(m[1]));
  assert.equal(DIALOGUE_VISIBLE_H, TEXTBOX_TOP - 18);
});

test('test_layout_battle_panel_top_matches_battle_panel_box', () => {
  const s = src('src/battle/battle.js');
  assert.ok(s.includes(`this.box(ctx, 20, ${BATTLE_PANEL_TOP}, 440, 72)`), `전투 패널 y 가 ${BATTLE_PANEL_TOP} 이 아니다`);
});

test('test_layout_probe_range_matches_player_probe', () => {
  const m = src('src/world/world.js').match(/dx \* TILE \* ([\d.]+), y: this\.y \+ dy \* TILE \* ([\d.]+)/);
  assert.ok(m, '프로브 식을 못 찾음');
  assert.equal(PROBE_RANGE, TILE * Number(m[1]));
});
