// 청소부 히든 보스(BUILD468): 엄청대박인배 라운지 분수 뒤에서 아래를 보고 C → 버튼(예) → 경섭·요플래 발밑 구멍 → 지하실 낙하 → 허약 청소부 → “어디가셨..” 끊김
//   → 강한 청소부 내려찍기 → 전투(지하실 붉은 경광등 배경, Hammer of Justice, 요플래·경섭 둘) → 이기면 라운지 분수 뒤로(억빠맨 재합류). 스크린샷은 SHOT_DIR.
import fs from 'node:fs';
import path from 'node:path';
import { runScenario } from './lib/harness.mjs';

await runScenario({ name: 'janitor-hidden' }, async ({ page, check, until, press, shot, open }) => {
  await open({ qa: 'janitor_hidden' });
  await until(() => window.game?.mapId === 'ship_lounge' && game.state === 'field' && !game.dialogue.running && game.fade.alpha === 0, 20000);
  const start = await page.evaluate(() => ({ facing: game.player.facing, sign: game.entities.some(e => e.id === 'ship_lounge_fountain_button'), party: game.party }));
  check('분수 뒤에서 아래를 보고 서 있고 버튼 자리가 있다', start.facing === 'down' && start.sign && start.party.includes('ppaman'), JSON.stringify(start));
  // BUILD469 분수 = 상점 건너편 홀로 탁자(사용자 “이 분수 말고 여기 아래에 분수”): 탁자 그림 윗변 위에 서서(뒤편) 아래를 보면 C 프로브가 버튼에 닿는다
  const holo = await page.evaluate(() => { const t = game.entities.find(e => e.id === 'lounge_holo'), p = game.player;
    return { feet: p.y + p.h, cx: p.x + p.w / 2, top: t.def.iy, left: t.x, right: t.x + t.w, probe: p.probe()?.id }; });
  check('홀로 탁자(분수) 뒤편 가운데에서 아래를 보면 버튼', holo.feet <= holo.top + 8 && holo.cx > holo.left && holo.cx < holo.right && holo.probe === 'ship_lounge_fountain_button', JSON.stringify(holo));
  // 필드 연출 기록(BUILD469): 프레임마다 청소부 자리·잔상·브금, 효과음 호출, 중간 프레임 그림(캔버스 그대로) — 전투가 열리면 멈춘다
  await page.evaluate(() => {
    const rec = window.__jh = { sfx: [], weakStart: null, walkBgm: undefined, weakTrail: false, heroBgm: undefined, diveTrail: false, dashTrail: false, faceoff: null, frames: {} };
    const sfx = game.sound.sfx.bind(game.sound);
    game.sound.sfx = (name, opts) => { rec.sfx.push([name, opts?.volume ?? null]); return sfx(name, opts); };
    const grab = name => { if (!rec.frames[name]) rec.frames[name] = document.querySelector('canvas').toDataURL('image/png'); };
    (function tick() {
      if (game.battle) return;
      const find = id => game.entities.find(e => e.id === id && !e.dead);
      const w = game.mapId === 'ship_basement' ? find('basement_janitor') : null, h = game.mapId === 'ship_basement' ? find('janitor_hero') : null, p = game.player;
      if (w && w.visible !== false) {
        if (rec.weakStart === null) rec.weakStart = Math.round(w.x);
        if (w.moving && rec.walkBgm === undefined) rec.walkBgm = game.sound.bgmName || null;
        if (w.afterimage && w.hopY > 0) rec.weakTrail = true;
        if (w.afterimage && w.hopY > 100) grab('b_rise');
      }
      if (h && h.visible !== false) {
        // 내려오기 시작한 뒤(화면 위 360 에서 출발)의 곡 — 자리 잡기 action 과 같은 틱이 아니게
        if (rec.heroBgm === undefined && h.hopY < 300) rec.heroBgm = game.sound.bgmName || null;
        if (h.afterimage && h.hopY > 0) rec.diveTrail = true;
        if (h.afterimage && h.hopY > 60 && h.hopY < 170) grab('c_dive');
        if (game.ripples.some(r => r.ring && r.t > 0.12)) grab('d_land');
        if (h.afterimage && !h.hopY) rec.dashTrail = true;
        if (h.facing === 'left' && h.motion?.frames.length === 1) grab('e_faceoff_laugh');
        if (h.motion?.frames.length === 6 && h.motion.index === 3) {
          grab('f_attack');
          const g = find('gyeongsub');
          rec.faceoff ??= { hx: Math.round(h.x), hy: Math.round(h.y), facing: h.facing, px: Math.round(p.x), py: Math.round(p.y), pf: p.facing, gf: g?.facing };
        }
      }
      requestAnimationFrame(tick);
    })();
  });
  await press('KeyC');
  const first = await until(() => game.dialogue.running && game.textbox.node?.text ? { speaker: game.textbox.node.speaker, text: game.textbox.node.text } : null, 4000);
  check('C → 억빠맨 “응? 왜요 형?”', first?.speaker === '억빠맨' && first.text === '* 응? 왜요 형?', JSON.stringify(first));
  await shot('janitor_01_lounge');
  const lines = [];
  let pits = false, fell = false;
  for (let i = 0; i < 120; i++) {
    const s = await page.evaluate(() => ({ map: game.mapId, text: game.textbox.node?.text || '', speaker: game.textbox.node?.speaker || '', choice: !!game.textbox.choice, pits: game.entities.filter(e => e.id?.startsWith('pit_') && !e.dead).length, falling: !!game.player.doorTransit, battle: !!game.battle }));
    if (s.map === 'ship_basement') break;
    if (s.text && lines.at(-1) !== `${s.speaker}:${s.text}`) lines.push(`${s.speaker}:${s.text}`);
    if (s.pits === 2 && !pits) { pits = true; await shot('janitor_02_pits'); }
    if (s.falling && !fell) { fell = true; await page.waitForTimeout(250); await shot('janitor_03_fall'); }
    await page.waitForTimeout(220); await press('KeyC'); await page.waitForTimeout(80);
  }
  check('라운지 대사 원문(억빠맨 → 경섭 → 버튼 → … → 어 어 형들!!)', ['억빠맨:* 응? 왜요 형?', '경섭:* 여기에 버튼이 있어', ':* 버튼을 눌러볼까?', '억빠맨:* ...', '경섭:* 허허 뭐지', '억빠맨:* 아무 반응도 없는데요.', '억빠맨:* 어 어 형들!!'].every(l => lines.includes(l)), JSON.stringify(lines));
  check('발밑 구멍 둘 → 둘이 빠짐', pits && fell);
  const basement = await until(() => game.mapId === 'ship_basement' ? { party: game.party } : null, 10000);
  check('지하실로 떨어짐(억빠맨은 위에 남음)', basement && JSON.stringify(basement.party) === '["gyeongsub"]', JSON.stringify(basement));
  const blines = []; let walked = false, slam = false, cut = null;
  for (let i = 0; i < 200; i++) {
    const s = await page.evaluate(() => ({ battle: !!game.battle, text: game.textbox.node?.text || '', speaker: game.textbox.node?.speaker || '', shown: game.textbox.shown ?? null,
      weak: (() => { const e = game.entities.find(x => x.id === 'basement_janitor'); return e ? { v: e.visible !== false, x: Math.round(e.x) } : null; })(),
      hero: (() => { const e = game.entities.find(x => x.id === 'janitor_hero'); return e ? { v: e.visible !== false, hop: Math.round(e.hopY || 0) } : null; })(),
      lying: game.player.pose === 'lying' }));
    if (s.battle) break;
    if (s.text && blines.at(-1) !== `${s.speaker}:${s.text}`) {
      blines.push(`${s.speaker}:${s.text}`);
      if (blines.length === 1) await shot('janitor_04_basement');
    }
    if (s.weak?.v && !walked && s.text.includes('아..아빠')) { walked = true; await shot('janitor_05_weak'); }
    if (s.text.includes('어디가셨')) cut = s.shown;
    if (s.hero?.v && s.hero.hop === 0 && !slam) { slam = true; await page.waitForTimeout(200); await shot('janitor_06_slam'); }
    await page.waitForTimeout(220); await press('KeyC'); await page.waitForTimeout(80);
  }
  const must = ['경섭:* 어 괜찮아?', '???:* 도움이필요한가?', '경섭:* 아..아빠?', '청소부:* 여기서 나가고싶나?', '청소부:* 앞으로 해쳐나아가야 하는 것 아니겠나', '경섭:* 어디가셨..', '청소부:* 어디 한번 놀아볼까?', '청소부:* 멸공의 깃발.', '청소부:* 너희를 계엄해주겠다.'];
  check('지하실 대사 원문 순서', must.every(l => blines.includes(l)) && must.map(l => blines.indexOf(l)).every((v, i, a) => i === 0 || v > a[i - 1]), JSON.stringify(blines));
  check('허약 청소부가 걸어오고 강한 청소부가 내려찍는다', walked && slam);
  const rec = await page.evaluate(() => { const r = window.__jh, frames = r.frames; r.frames = {}; return { ...r, frames }; });
  if (process.env.SHOT_DIR) for (const [name, url] of Object.entries(rec.frames)) fs.writeFileSync(path.join(process.env.SHOT_DIR, `janitor_06${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
  // 효과음이 이 순서로 나왔는가(사이에 다른 소리는 있어도 된다)
  const inOrder = list => { let at = 0; for (const [name, volume] of list) { const i = rec.sfx.findIndex((s, j) => j >= at && s[0] === name && (volume === undefined || s[1] === volume)); if (i < 0) return false; at = i + 1; } return true; };
  const frames = Object.keys(rec.frames);
  check('허약 청소부는 방 안(벽 앞 900 → 절반 자리 656)에서 걸어 나오고 첫 등장 곡 wise_words', rec.weakStart !== null && rec.weakStart <= 660 && rec.walkBgm === 'wise_words', JSON.stringify({ weakStart: rec.weakStart, walkBgm: rec.walkBgm }));
  check('사라짐·내려찍기 = 드럼통 악마전 상승·낙하(붉은 잔상, spearappear 0.7 → wing 0.9 → impact 0.9), 내려찍을 때 곡이 끊김',
    rec.weakTrail && rec.diveTrail && rec.heroBgm === null && inOrder([['spearappear', 0.7], ['wing', 0.9], ['impact', 0.9]]), JSON.stringify({ weakTrail: rec.weakTrail, diveTrail: rec.diveTrail, heroBgm: rec.heroBgm, sfx: rec.sfx.slice(-12) }));
  const f = rec.faceoff;
  check('“너희를 계엄해주겠다.” 뒤 오른쪽 위로 옮겨 왼쪽을 보고 대치 → 껄껄 → 깃발 공격(rudebuster_swing) → 전투',
    rec.dashTrail && f && f.facing === 'left' && f.hx > f.px && f.hy < f.py && f.pf === 'right' && f.gf === 'right'
      && inOrder([['impact', 0.9], ['spearappear', 0.7], ['laugh_janitor'], ['rudebuster_swing', 0.8], ['battle_start']]), JSON.stringify({ dashTrail: rec.dashTrail, faceoff: f, sfx: rec.sfx.slice(-6) }));
  check('중간 프레임 그림(상승·낙하·착지·대치 웃음·공격)', ['b_rise', 'c_dive', 'd_land', 'e_faceoff_laugh', 'f_attack'].every(n => frames.includes(n)), JSON.stringify(frames));
  const battle = await until(() => game.battle?.enemies?.[0]?.img ? { id: game.battle.enemies[0].id, bg: game.battle.cfg.bg, bgm: game.battle.cfg.bgm, members: game.battle.members.map(m => m.id), hp: game.battle.enemies[0].maxHp } : null, 15000);
  check('전투: 청소부 HP 100, 지하실 배경, Hammer of Justice, 요플래·경섭 둘', battle?.id === 'janitor_hidden' && battle.bg === 'janitor_basement' && battle.bgm === 'janitor_hidden' && battle.hp === 100 && battle.members.length === 2 && battle.members.includes('gyeongsub'), JSON.stringify(battle));
  await page.waitForTimeout(1200); await shot('janitor_07_battle');
  const n = await page.evaluate(() => game.battle.enemies[0].def.patterns.length);
  for (let k = 0; k < n; k++) {
    await until(() => ['intro', 'menu'].includes(game.battle?.state), 8000);
    await page.evaluate((k) => { const b = game.battle; b.enemies[0].patternIdx = k; b.beginEnemyTurn(); }, k);
    const type = await page.evaluate((k) => game.battle.enemies[0].def.patterns[k].type, k);
    const times = { janitor_kick_flags: [0.75, 1.15, 2.6, 7.6, 12.3], janitor_stomp: [0.4, 1.05, 1.9, 7.4, 11.4], janitor_drum: [0.8, 2.2, 4.5, 8.5], janitor_stomp_scan: [0.8, 1.15, 2.6], janitor_stomp_cross: [0.75, 1.0, 1.7, 2.6, 3.4], janitor_wave: [0.5, 1.2, 3.3, 7.25, 8.4] }[type] || [1.4, 3.0];
    let maxHazards = 0;
    for (const [i, at] of times.map((v, j) => [j + 1, v])) {
      const ok = await page.waitForFunction((at) => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'bullets' && b.t >= at; }, at, { timeout: 12000, polling: 50 }).then(() => true, () => false);
      if (ok) { maxHazards = Math.max(maxHazards, await page.evaluate(() => game.battle.bullets.filter(b => !b.harmless).length)); await shot(`janitor_p${k}_${i}`); }
    }
    const back = await page.waitForFunction(() => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'menu'; }, undefined, { timeout: 25000, polling: 50 }).then(() => true, () => false);
    check(`패턴 ${k} ${type}: 맞는 탄이 나오고 끝나면 행동 선택`, maxHazards > 0 && back, `hazards=${maxHazards}`);
  }
  // 아이템 반응(BUILD469): 아이템을 쓰면 청소부도 '!' → 깃발 들고 HP +10 → 껄껄(웃음 그림)
  await until(() => game.battle?.state === 'menu', 8000);
  await page.evaluate(() => { const b = game.battle; b.enemies[0].hp = 50; game.inventory.push('바나나'); const m = b.members[0]; m.hp = Math.max(1, m.hp - 40); b.plans = [{ type: 'item', member: m, target: m, name: '바나나' }]; b.beginAct(); });
  const seen = { notice: false, raise: false, laugh: false };
  for (let i = 0; i < 80; i++) {
    const r = await page.evaluate(() => { const s = game.battle.support?.reaction; return s ? { t: s.t, pose: s.pose } : null; });
    if (r && !r.pose && r.t > 0.4 && !seen.notice) { seen.notice = true; await shot('janitor_item_1_notice'); }
    if (r?.pose?.sheet === 'attack' && !seen.raise) { seen.raise = true; await page.waitForTimeout(120); await shot('janitor_item_2_raise'); }
    if (r?.pose?.sheet === 'laugh' && !seen.laugh) { seen.laugh = true; await page.waitForTimeout(200); await shot('janitor_item_3_laugh'); }
    if (seen.laugh && !r) break;
    await page.waitForTimeout(50);
  }
  const healed = await page.evaluate(() => game.battle.enemies[0].hp);
  check('아이템 → 청소부 ! → 깃발 들기 → +10 → 웃음 그림', seen.notice && seen.raise && seen.laugh && healed === 60, JSON.stringify({ seen, healed }));
  await page.waitForFunction(() => { const b = game.battle; if (b?.soul) b.soul.invuln = 9; if (b) for (const m of b.members) { m.hp = m.maxHp; m.down = false; } return b?.state === 'menu'; }, undefined, { timeout: 25000, polling: 50 }).catch(() => {});
  const attack0 = await page.evaluate(() => game.attack);
  await page.evaluate(() => { game.battle.enemies[0].hp = 1; });
  for (let i = 0; i < 60 && !(await page.evaluate(() => game.battle?.state === 'win')); i++) { await press('KeyC'); await page.waitForTimeout(200); }
  for (let i = 0; i < 30 && await page.evaluate(() => !!game.battle); i++) { await press('KeyC'); await page.waitForTimeout(250); }
  const alines = []; let reunionShot = false, afterShot = false;
  for (let i = 0; i < 120; i++) {
    const s = await page.evaluate(() => ({ map: game.mapId, run: game.dialogue.running, fade: game.fade.alpha, text: game.textbox.node?.text || '', speaker: game.textbox.node?.speaker || '' }));
    if (!s.run && s.map === 'ship_lounge' && s.fade === 0 && alines.length > 8) break;
    if (s.text && alines.at(-1) !== `${s.speaker}:${s.text}`) {
      alines.push(`${s.speaker}:${s.text}`);
      if (!afterShot && s.text.includes('간만에')) { afterShot = true; await shot('janitor_08_after'); }
      if (!reunionShot && s.text.includes('형들 괜찮으세요')) { reunionShot = true; await shot('janitor_09_reunion'); }
    }
    await page.waitForTimeout(240); await press('KeyC'); await page.waitForTimeout(80);
  }
  const afterMust = ['청소부:* 껄껄 간만에 즐거웠네', '청소부:* 뭐... 이정도라면 충분히 해쳐나갈 수 있겠지', '청소부:* 아 물론 약속은 지켜야지 이리 와보게', '경섭:* 네', ':* 멸공의 깃발이 무기에 감긴다.{n}* {c=yellow}요플래와 경섭의 공격력이 증가했다.{/c}', '청소부:* 이제 올라가보새', '청소부:* 잘 컸구나.', '억빠맨:* 형들 괜찮으세요 ? 무슨일 있으셨어요?', '경섭:* 아니 아무일도 없었어.', '억빠맨:* 어휴 다행이네요 형님들 걱정했잖아요', '경섭:* 그래 미안하다 ㅋㅋ'];
  check('승리 뒤 대사 원문 순서(지하실 → 분수 앞 억빠맨)', afterMust.every(l => alines.includes(l)) && afterMust.map(l => alines.indexOf(l)).every((v, i, a) => i === 0 || v > a[i - 1]), JSON.stringify(alines));
  const back = await until(() => game.mapId === 'ship_lounge' && game.state === 'field' && !game.dialogue.running && game.fade.alpha === 0 ? { won: !!game.flags.janitor_hidden_won, wrapped: !!game.flags.janitor_flag_wrapped, attack: game.attack, party: game.party, sign: game.entities.some(e => e.id === 'ship_lounge_fountain_button'), bgm: game.sound.bgmName } : null, 15000);
  check('분수 앞으로: 팀 공격력 +1, 억빠맨 재합류, 버튼 사라짐, 라운지 브금', back?.won && back.wrapped && back.attack === attack0 + 1 && back.party.includes('ppaman') && !back.sign && back.bgm === 'ship_lounge', JSON.stringify({ attack0, back }));
  await shot('janitor_10_back');
});
