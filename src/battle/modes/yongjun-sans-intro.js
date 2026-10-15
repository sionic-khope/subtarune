// 박용준 히든 보스전 오프닝(BUILD462): 샌즈전 인트로 패러디. 대사·시간 원본 src/data/yongjun-sans.js.
//   새소리(전투 브금 sans_birds) 속에 말풍선 세 줄(용준 목소리, C 로 넘김) → 새소리 뚝 + 촵, 화면 전체 검정 → 촵, 복귀(눈동자 없는 얼굴 그림)
//   → 마지막 말 한 글자씩 천천히(목소리 없음) → C → 메갈로바니아 + 행동 선택(보스 시작)
import { YONGJUN_SANS as C } from '../../data/yongjun-sans.js';

/** 지원 모듈(support/yongjun-sans.js)의 preemptiveMode 가 전투를 열자마자 이 모드를 고른다. */
export function createYongjunSansIntro(battle, { enemy }) {
  let phase = 'wait', t = 0, line = -1, typed = 0;
  const say = (text, voice) => { battle.bubble = { enemy, text, shown: 0, t: 0, voice }; typed = 0; t = 0; };
  const typing = (dt, perChar) => {
    const b = battle.bubble; if (!b) return true;
    b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t / perChar));
    for (let i = b.shown; i < n; i++) if (b.voice !== 'none' && b.text[i] !== ' ') battle.game.sound.blip(b.voice);
    b.shown = n; if (n >= b.text.length) typed += dt;
    return n >= b.text.length;
  };
  return {
    get snapshot() { return { phase, line, bubble: battle.bubble?.text ?? null, shown: battle.bubble?.shown ?? 0 }; },
    get fullscreen() { return phase === 'black'; },
    update(dt, input) {
      t += dt;
      if (phase === 'wait') { if (t >= C.firstDelay) { phase = 'talk'; line = 0; say(C.lines[0], C.voice); } return false; }
      if (phase === 'talk') {
        const done = typing(dt, C.charSeconds);
        if (!input.just('confirm')) return false;
        if (!done) { battle.bubble.shown = battle.bubble.text.length; battle.bubble.t = battle.bubble.text.length * C.charSeconds; return false; }
        if (typed < C.advanceHold) return false;
        line++;
        if (line < C.lines.length) { say(C.lines[line], C.voice); return false; }
        battle.bubble = null; phase = 'pause'; t = 0; return false;
      }
      if (phase === 'pause') {
        if (t >= C.cutDelay) { battle.game.sound.stopBgm(0.01); battle.sfx(C.noise); phase = 'black'; t = 0; }
        return false;
      }
      if (phase === 'black') {
        if (t >= C.blackHold) {
          battle.sfx(C.noise);
          if (enemy.def.actions?.dark) enemy.patternPose = { sheet: 'dark', frame: 0 };
          phase = 'still'; t = 0;
        }
        return false;
      }
      if (phase === 'still') { if (t >= C.hellDelay) { phase = 'hell'; say(C.hell, 'none'); } return false; }
      if (phase === 'hell') {
        const done = typing(dt, C.hellCharSeconds);
        if (!done || typed < C.advanceHold || !input.just('confirm')) return false;
        battle.bubble = null; enemy.patternPose = null;
        battle.game.sound.playBgm(C.bgm, { volume: 0.5, fadeIn: 0 });
        phase = 'done';
        return true;
      }
      return phase === 'done';
    },
    draw(ctx) {
      if (phase === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 360); return; }
      battle.drawTextBox(ctx);
    },
    dispose() { if (battle.bubble?.enemy === enemy) battle.bubble = null; if (phase !== 'done') enemy.patternPose = null; },
  };
}
