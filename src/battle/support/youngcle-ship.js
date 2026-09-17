// 엄청대박인배 조종실 전투 지원 모듈(BUILD207~208 사용자 브리핑). 대사·수치 원본 src/data/youngcle-battle.js.
//   - 턴마다 패턴 하나(오방순 광선 → 나람 내려찍기 → 영클 철창 레이저(모드) → 영클 선회 레이저), 쉬는 적은 patternsFor 가 [] 를 준다. 오방순이 탈주하면 순서에서 빠진다.
//   - 오방순·나람은 때릴 수 없고(untargetable, 피해 막힘), 영클(hp 10)은 평소 공격을 뒤로 물러나 피한다(피해 없음). 아이디어(source 'idea')의 3 피해만 들어간다.
//   - 첫 적 턴 뒤 막간 대사(영클 후후후 … 억빠맨 생각을 해봐야) → 아이디어 버튼(억빠맨 얼굴+전구) 해금. 영클을 9대 때릴 때마다 한 번(스택), 퀴즈 실패는 9→6.
//   - 아이디어 3(보지) 뒤엔 영클이 방심: 다음 적 턴을 건너뛰고 공격 3대가 1 피해씩 들어간다(hp 10 → 1) → 그다음 적 턴은 피날레(youngcle_finale).
import L from '../../data/locale/ko.js';
import { YOUNGCLE_BATTLE as C } from '../../data/youngcle-battle.js';
import { createTalk } from './talk.js';

const OWNER = { obangsun_rays: 'obangsun', naram_slam: 'naram_giant', youngcle_orbit_laser: 'youngcle_hover' };
const DODGE = { time: 0.55, dx: 46, dy: 10 };

export function createYoungcleShipSupport(battle) {
  if (!battle.enemies.some(e => e.def.support === 'youngcle_ship')) return null;
  let turn = -1, dodge = null, hits = 0, charge = 0, ideaIdx = 0, unlocked = false, introduced = false, distracted = false, distractedHits = 0, finalePending = false, obangsunGone = false, lastSource = 'ordinary', partyHits = 0, distractedTurns = 0;
  const yc = () => battle.enemies.find(e => e.id === 'youngcle_hover');
  const order = () => ['obangsun_rays', 'naram_slam', 'youngcle_cage', 'youngcle_orbit_laser'].filter(p => !(obangsunGone && p === 'obangsun_rays'));
  const current = () => { const o = order(); return o[((turn % o.length) + o.length) % o.length]; };
  const ready = () => unlocked && charge >= C.ideaHits && ideaIdx < 3 && !distracted && !finalePending;
  return {
    get turn() { return turn; }, get current() { return current(); }, get dodging() { return !!dodge; },
    get hits() { return hits; }, get charge() { return charge; }, get requiredHits() { return C.ideaHits; }, get ideaIdx() { return ideaIdx; },
    get unlocked() { return unlocked; }, get distracted() { return distracted; }, get finalePending() { return finalePending; }, get obangsunGone() { return obangsunGone; },
    get ready() { return ready(); },
    get hint() { return L.battle_idea_wait(Math.max(0, C.ideaHits - charge)); },
    get button() { return { label: L.battle_idea, icon: 'idea', enabled: ready() }; },
    reset() { turn = -1; dodge = null; hits = 0; charge = 0; ideaIdx = 0; unlocked = false; introduced = false; distracted = false; distractedHits = 0; finalePending = false; obangsunGone = false; partyHits = 0; distractedTurns = 0; },
    get partyHits() { return partyHits; },
    /** 탄에 맞을 때마다 적 공격력 +10(사용자 2026-09-17 “공격력도 맞을때마다 10씩”): 첫 피격 기본, 둘째 +10, 셋째 +20 … 재도전이면 처음부터 */
    partyDamage(dmg) { return dmg + C.damageStep * partyHits; },
    onPartyHurt() { partyHits++; },
    async load() {},
    /** 적 턴 모드: 피날레 > 방심 뒤 건너뛰기 > 철창 레이저 > 기본 탄막 */
    enemyModeFor() {
      turn++;
      if (finalePending) return 'youngcle_finale';
      if (distracted) {                                      // 방심 턴: 첫 적 턴은 건너뛰고(공격 3대 기회), 그다음 적 턴은 공격을 안 했어도 피날레(사용자: 점프슬램은 피해보다 전투를 끝내는 연출)
        distractedTurns++;
        if (distractedTurns >= 2) { distracted = false; const e = yc(); if (e) e.patternPose = null; finalePending = true; return 'youngcle_finale'; }
        return 'youngcle_skip';
      }
      return current() === 'youngcle_cage' ? 'youngcle_cage' : null;
    },
    patternsFor(e) { const cur = current(); return e.id === OWNER[cur] ? [{ type: cur }] : []; },
    blocksDamage(e, source) { if (e.def.untargetable) return true; if (e.id !== 'youngcle_hover') return false; return !(source === 'idea' || distracted); },
    adjustDamage(e, dmg, source) { if (e.id !== 'youngcle_hover') return dmg; if (source === 'idea') return C.ideaDamage; if (distracted) return C.distractedDamage; return dmg; },
    blockText(e) { return e.id === 'youngcle_hover' ? L.battle_dodged : L.battle_strip_blocked; },
    blockSfx() { return 'hit'; },   // 피할 때도 검 소리만(사용자: “파도소리(whoosh) 싫다, 검소리만”)
    onContact(e, dmg, source) {
      lastSource = source;
      if (e.id !== 'youngcle_hover' || source !== 'ordinary') return;
      hits++; charge = Math.min(C.ideaHits, charge + 1);
      if (!distracted && !dodge) dodge = { t: 0, e };
    },
    onHit(e, damage, source) {
      if (e.id !== 'youngcle_hover' || source !== 'ordinary' || !distracted) return;
      distractedHits++;
      if (distractedHits >= C.distractedHits) { distracted = false; e.patternPose = null; finalePending = true; }
    },
    /** 아이디어 버튼: 스택이 차면 억빠맨(살아 있으면)이 아이디어 n 을 낸다. 스택은 소모 */
    action() {
      if (!ready()) return null;
      const target = yc(); if (!target) return null;
      const member = battle.alive().find(m => m.id === 'ppaman') || battle.alive()[0];
      charge = 0; const idea = ideaIdx + 1; ideaIdx++;
      return { type: 'support', mode: 'youngcle_idea', member, target, idea };
    },
    rollback() { ideaIdx = Math.max(0, ideaIdx - 1); charge = C.ideaRollback; },          // 퀴즈 실패: 같은 아이디어를 다시, 스택 9 → 6
    obangsunLeft() { obangsunGone = true; },
    setDistracted(v) { distracted = !!v; distractedHits = 0; distractedTurns = 0; },
    update(dt) {
      const e = yc();
      if (distracted && e && !e.patternPose) e.patternPose = { sheet: 'surprise', frame: 0 };   // 방심: 뒤를 본 채(메뉴가 pose 를 지워도 다시)
      if (!dodge) return;
      dodge.t += dt; const k = dodge.t / DODGE.time;
      if (k >= 1) { dodge.e.patternPose = null; dodge = null; return; }
      const s = Math.sin(Math.PI * k); dodge.e.patternPose = { x: dodge.e.x + DODGE.dx * s, y: dodge.e.y - DODGE.dy * s };
    },
    /** 첫 적 턴 뒤 막간: 영클·억빠맨·경섭 대사 → 아이디어 추가 */
    afterEnemyPhase() {
      if (introduced || turn !== 0) return null;
      introduced = true;
      const talk = createTalk(battle, C.intro); let phase = 'talk', hold = 0;
      return {
        update(dt, input) {
          if (phase === 'talk') { if (talk.update(dt, input)) { phase = 'added'; hold = 0; unlocked = true; battle.setText(C.ideaAdded); battle.sfx('item'); } return false; }
          hold += dt; if (hold > 0.3 && input.just('confirm')) { battle.setText(''); return true; }
          return false;
        },
        draw(ctx) { battle.drawTextBox(ctx); },
      };
    },
  };
}
