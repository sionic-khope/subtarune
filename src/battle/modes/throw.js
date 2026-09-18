// 제자리 던지기 공격(BUILD227 사용자 “청소부 던지는 건 달려가서 던지는 게 아니라 제자리에서 던지는 거라고”):
//   동료가 자기 자리에서 공격 프레임을 재생하고(지팡이 던지기), 지팡이(단순 도형)가 포물선으로 적에게 날아가 닿으면 피해. 피해는 cfg.memberDamage[id] 또는 공격력.
import { BATTLE_SPRITES } from '../../data/battle-sprites.js';

export function createThrowAttack(battle, { member, target }) {
  const frames = BATTLE_SPRITES[member.id]?.attack || [];
  const poseT = frames.reduce((s, f) => s + f.duration, 0) || 0.6;
  const dmg = battle.cfg.memberDamage?.[member.id] ?? (battle.game.attack || 1);
  const [sx, sy] = member.home; const tx = target.x - 18, ty = target.y - 28;
  const releaseAt = Math.min(poseT * 0.45, 0.3), flight = 0.42;
  let t = 0, ft = 0, thrown = false, hit = false;
  member.pose = 0;                                   // 제자리에서 공격 프레임 한 번
  return {
    update(dt) {
      t += dt;
      if (!thrown && t >= releaseAt) thrown = true;
      if (thrown && !hit) { ft += dt; if (ft >= flight) { hit = true; battle.hitEnemy(target, member, dmg); } }
      return hit && t >= poseT + 0.35;
    },
    draw(ctx) {
      if (!thrown || hit) return;
      const k = Math.min(1, ft / flight), x = sx + (tx - sx) * k, y = (sy - 30) + (ty - (sy - 30)) * k - Math.sin(k * Math.PI) * 42;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(k * Math.PI * 3);
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-14, -2, 28, 4); ctx.fillStyle = '#5a3a1b'; ctx.fillRect(10, -7, 4, 9);   // 지팡이: 막대 + 손잡이
      ctx.restore();
    },
  };
}
