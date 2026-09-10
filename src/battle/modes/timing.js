// ─────────────────────────────────────────────────────────────
// 예시 공격 모드 'timing' (델타룬 FIGHT 타이밍 바): 마커가 왕복하는 바에서 가운데 존에 맞춰 C — 가운데(±12px) 2 데미지, 근처(±40px) 1, 빗나감 0.
//   새 미니게임 모드(리듬·춤·FPS…)는 이 파일을 복사해 update/draw 만 바꾸고 src/battle/modes.js 에 한 줄 등록한다.
//   입력은 input.just/down 만 쓴다(키보드+패드). 마우스가 필요한 모드는 battle.game.canvas 의 pointer 이벤트를 create 에서 달고 끝날 때 떼어 낸다.
// ─────────────────────────────────────────────────────────────
const BAR_W = 220, BAR_X = 130, BAR_Y = 292, SPEED = 300, TIMEOUT = 4;

export function createTimingAttack(battle, { member, target }) {
  let x = 0, dir = 1, t = 0, done = false, doneT = 0, result = null;
  return {
    update(dt, input) {
      t += dt;
      if (!done) {
        x += dir * SPEED * dt; if (x >= BAR_W) { x = BAR_W; dir = -1; } else if (x <= 0) { x = 0; dir = 1; }
        if (input.just('confirm') || t > TIMEOUT) {
          done = true; const d = Math.abs(x - BAR_W / 2); result = d <= 12 ? 2 : d <= 40 ? 1 : 0;
          if (result > 0) battle.hitEnemy(target, member, result);
          else { battle.setText(`* ${member.name} 의 공격이 빗나갔다.`); battle.sfx('cancel'); }
        }
        return false;
      }
      doneT += dt; return doneT > 0.55;
    },
    draw(ctx) {
      battle.box(ctx, 20, 246, 440, 72); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(`${member.name}: 가운데에서 C!`, 36, 254);
      ctx.fillStyle = '#333'; ctx.fillRect(BAR_X, BAR_Y, BAR_W, 14);
      ctx.fillStyle = '#2f8f44'; ctx.fillRect(BAR_X + BAR_W / 2 - 40, BAR_Y, 80, 14);
      ctx.fillStyle = '#4cd964'; ctx.fillRect(BAR_X + BAR_W / 2 - 12, BAR_Y, 24, 14);
      ctx.fillStyle = done ? (result ? '#ffe066' : '#ff5c5c') : '#fff'; ctx.fillRect(Math.round(BAR_X + x) - 2, BAR_Y - 3, 4, 20);
      if (done) { ctx.fillStyle = '#ffe066'; ctx.textAlign = 'right'; ctx.fillText(result === 2 ? 'PERFECT' : result === 1 ? 'GOOD' : 'MISS', 444, 254); ctx.textAlign = 'left'; }
    },
  };
}
