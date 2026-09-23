// ─────────────────────────────────────────────────────────────
// 전투 기믹 모드 레지스트리 (사용자 2026-09-11 "전투라는 틀에 박힌 거 빼고도 리듬게임·춤·FPS 같은 요소가 들어갈 수 있게").
//   공격 단계(attack)와 적 턴(enemy)을 통째로 바꿔 끼운다. 전투 상태 기계(battle.js)는 모드가 끝났다고 할 때까지 update/draw 를 위임한다.
//   registerBattleMode('attack'|'enemy', name, create)
//     create(battle, ctx) → { update(dt, input) → true 면 끝, draw?(ctx2d) }
//     attack ctx = { plan, member, target } — 결과는 battle.hitEnemy(target, member, dmg) / battle.setText(...) 로
//     enemy  ctx = { enemy }                — 피해는 battle.hurtParty(dmg) 로 (전원 0 이면 battle 이 알아서 패배 처리)
//   고르는 법: 컷신 { battle:{ modes:{ attack:'timing', enemy:'bullets' } } } / 맵 enemy 엔티티 def.modes / 적 데이터 def.defense (그 적의 턴만) / 멤버 attackMode.
//   기본: attack 'rush'(달려가 한 방, battle.js 내장) · enemy 'bullets'(소울 탄막, 내장). 예시 구현: attack 'timing'(src/battle/modes/timing.js) — 새 미니게임은 이 파일을 복사.
//   규칙: 모드는 battle 공개 API만 쓰고 상태 문자열을 직접 바꾸지 않는다. fullscreen:true이면 전장/HP 띠도 모드에 위임한다. dispose?는 종료/패배/재시도 때 자원을 정리한다.
// ─────────────────────────────────────────────────────────────
import { createTimingAttack } from './modes/timing.js';
import { createCannonGuard } from './modes/cannon-guard.js';
import { createParkStrip } from './modes/park-strip.js';
import { createParkRazma } from './modes/park-razma.js';
import { createTvformIntro } from './modes/youngcle-tvform-intro.js';
import { createCoinMaze } from './modes/coin-maze.js';
import { createTvformSpecial } from './modes/tvform-special.js';
import { createParkWitchTrial } from './modes/park-witch-trial.js';
import { createYoungcleCage } from './modes/youngcle-cage.js';
import { createYoungcleIdea } from './modes/youngcle-idea.js';
import { createYoungcleFinale, createYoungcleSkip } from './modes/youngcle-finale.js';
import { createThrowAttack } from './modes/throw.js';
import { createChoimisPinkShooter } from './modes/choimis-pink-shooter.js';
import { createChoimisPinkRound } from './modes/choimis-pink-round.js';
import { createChoimisEatingRace } from './modes/choimis-eating-race.js';
import { createChoimisFinale } from './modes/choimis-finale.js';
import { createMalzaharRunner } from './modes/malzahar-runner.js';

const MODES = { attack: new Map(), enemy: new Map() };
export const NATIVE = 'native';                          // battle.js 가 직접 처리하는 기본 모드 표시

/** 모드 등록. 같은 이름은 두 번 못 넣는다(오타·중복 방지) */
export function registerBattleMode(kind, name, create) {
  if (!MODES[kind]) throw new Error(`[battle-mode] 모르는 종류 '${kind}' (attack|enemy)`);
  if (MODES[kind].has(name)) throw new Error(`[battle-mode] 이미 있는 모드 ${kind}/${name}`);
  if (create !== NATIVE && typeof create !== 'function') throw new Error(`[battle-mode] ${kind}/${name}: create 는 함수여야 한다`);
  MODES[kind].set(name, create);
}
/** 이름 → create 함수 (기본 모드면 NATIVE, 없으면 null) */
export const getBattleMode = (kind, name) => MODES[kind]?.get(name) ?? null;
export const listBattleModes = () => ({ attack: [...MODES.attack.keys()], enemy: [...MODES.enemy.keys()] });

registerBattleMode('attack', 'rush', NATIVE);
registerBattleMode('attack', 'throw', createThrowAttack);   // 제자리 던지기(청소부 지팡이, BUILD227)
registerBattleMode('enemy', 'bullets', NATIVE);
registerBattleMode('enemy', 'malzahar_runner', createMalzaharRunner);
registerBattleMode('enemy', 'choimis_pink_shooter', createChoimisPinkShooter);
registerBattleMode('enemy', 'choimis_pink_round', createChoimisPinkRound);
registerBattleMode('enemy', 'choimis_eating_race', createChoimisEatingRace);
registerBattleMode('enemy', 'choimis_finale', createChoimisFinale);
registerBattleMode('attack', 'timing', createTimingAttack);
registerBattleMode('attack', 'cannon_guard', createCannonGuard);
registerBattleMode('attack', 'park_strip', createParkStrip);
registerBattleMode('enemy', 'park_razma', createParkRazma);
registerBattleMode('enemy', 'park_witch_trial', createParkWitchTrial);
registerBattleMode('enemy', 'youngcle_cage', createYoungcleCage);
registerBattleMode('attack', 'youngcle_idea', createYoungcleIdea);
registerBattleMode('enemy', 'youngcle_finale', createYoungcleFinale);
registerBattleMode('enemy', 'youngcle_skip', createYoungcleSkip);
registerBattleMode('enemy', 'tvform_intro', createTvformIntro);   // 변신 영클 인트로(편집노조 흡수·파워업, BUILD214)
registerBattleMode('enemy', 'coin_maze', createCoinMaze);          // 코인벌기 미로(a/b)
registerBattleMode('enemy', 'tvform_special', createTvformSpecial);   // 변신 영클 특별 패턴 4종(섭리오·리듬·마녀재판·팽이 배틀, BUILD216)
