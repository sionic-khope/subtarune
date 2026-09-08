// 키 입력. C = 확인, X = 취소(+달리기). 델타룬 배치를 따라간다.
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyC: 'confirm', Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
  KeyX: 'cancel', Escape: 'cancel', ShiftLeft: 'cancel', ShiftRight: 'cancel',
  F1: 'debug',
  KeyV: 'menu', Tab: 'menu',
  KeyT: 'test',
};

// 게임패드(표준 매핑): A/B 위치는 델타룬처럼 A=확인, B=취소
const PAD_BUTTONS = { 0: 'confirm', 1: 'cancel', 2: 'menu', 3: 'menu', 9: 'menu', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

export const Input = {
  held: Object.create(null),
  pressed: Object.create(null),
  _buffer: Object.create(null),
  onAnyKey: null,

  init() {
    addEventListener('keydown', (e) => {
      if (this.onAnyKey) this.onAnyKey();
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.held[action]) {
        this.held[action] = true;
        this._buffer[action] = true;
      }
    });
    addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      this.held[action] = false;
    });
    // 창 포커스가 빠지면 눌린 키가 남는 문제 방지
    addEventListener('blur', () => { this.held = Object.create(null); });
  },

  _padPrev: Object.create(null),
  _pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((p) => p && p.connected);
    const now = Object.create(null);
    if (pad) {
      for (const [i, action] of Object.entries(PAD_BUTTONS)) if (pad.buttons[i]?.pressed) now[action] = true;
      const [ax, ay] = pad.axes;
      if (ax < -0.5) now.left = true; if (ax > 0.5) now.right = true;
      if (ay < -0.5) now.up = true;   if (ay > 0.5) now.down = true;
    }
    for (const a of new Set([...Object.keys(now), ...Object.keys(this._padPrev)])) {
      if (now[a] && !this._padPrev[a]) { this._buffer[a] = true; if (this.onAnyKey) this.onAnyKey(); }
      this._padHeld[a] = !!now[a];
    }
    this._padPrev = now;
  },
  _padHeld: Object.create(null),

  // 매 프레임 시작 시 1회 호출
  poll() {
    this._pollGamepad();
    this.pressed = this._buffer;
    this._buffer = Object.create(null);
  },

  down(action) { return !!this.held[action] || !!this._padHeld[action]; },
  just(action) { return !!this.pressed[action]; },

  // 이동 입력 벡터 (-1 / 0 / 1)
  axis() {
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    return { x, y };
  },
};
