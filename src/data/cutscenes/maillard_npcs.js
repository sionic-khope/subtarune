const C = (text) => ({ speaker: '착검하고검사로살기', voice: 'narrator', text });
const B = (text) => ({ speaker: '파랑이', voice: 'narrator', text });
const Y = (text) => ({ speaker: '노랑이', voice: 'narrator', text });
const N = (text) => ({ voice: 'narrator', text });

export const maillard_chakgeom = Object.assign([
  { camera: [227, 32], duration: 0.35 },
  { move: 'player', rel: 'chakgeom', at: 'bottom', by: [64, 48] },
  { face: 'player', dir: 'toward:chakgeom' },
  { regroup: true },
  { face: 'chakgeom', dir: 'toward:player' },
  C('* 안녕하세요 형님들.'),
  { if: (f) => f.maillard_chakgeom_seen, goto: 'again' },
  C('* 해 뜨면 퇴근하라고 하셔서요.{w=0.3} 어제부터 지키고 있습니다.'),
  { face: 'chakgeom', dir: 'up' },
  { wait: 0.5 },
  C('* ...{w=0.4} 야 이 씨발 해 새끼야.{n}출근 좀 해. 나 퇴근하게.'),
  { face: 'chakgeom', dir: 'toward:player' },
  { emote: 'chakgeom', kind: 'sweat', duration: 1.4, hold: 0.3 },
  C('* 죄송합니다 형님들.{w=0.3} 태양한테만 반말합니다.'),
  { set: { maillard_chakgeom_seen: true } },
  { camera: 'player' },
  { end: true },
  { label: 'again' },
  C('* 눈 감고 있는 거 아닙니다.{w=0.3} 눈꺼풀 안쪽 경계 중입니다.'),
  { camera: 'player' },
], { silent: true });

export const maillard_tarts = Object.assign([
  { camera: [217, 20], duration: 0.35 },
  { parallel: [
    { move: 'player', rel: 'parang', at: 'bottom', by: [48, 80] },
    { move: 'gyeongsub', rel: 'parang', at: 'bottom', by: [-16, 80] },
    { move: 'ppaman', rel: 'parang', at: 'bottom', by: [112, 80] },
  ] },
  { face: 'player', dir: 'up' },
  { face: 'gyeongsub', dir: 'up' },
  { face: 'ppaman', dir: 'up' },
  { if: (f) => f.maillard_tarts_given, goto: 'again' },
  B('* 에그타르트 먹을래'),
  Y('* 두 개야.{w=0.3} 하나는 얘 거, 하나는 내 거.'),
  B('* 그럼 우리는?'),
  Y('* 나눔의 기쁨 먹어.'),
  { wait: 0.4 },
  B('* 그거 HP 몇 차는데.'),
  { action: (g) => { g.inventory.push('에그타르트', '에그타르트'); } },
  { set: { maillard_tarts_given: true } },
  N('* 에그타르트 2개를 받았다.{n}먹으면 각각 HP를 100 회복한다.'),
  Y('* 우리는 침이 차.'),
  { camera: 'player' },
  { end: true },
  { label: 'again' },
  B('* 에그타르트는 아까 준 두 개가 전부야.'),
  Y('* 나눔의 기쁨은 아직 씹는 중이야.'),
  { camera: 'player' },
], { silent: true });

export const maillard_wemix = Object.assign([
  { if: (f) => f.maillard_wemix_gone, goto: 'done' },
  { camera: [230, 6], duration: 0.35 },
  { face: 'wemix', dir: 'down' },
  { action: (g) => { g.sound.sfx('wemix_remix'); } },
  { speaker: '위믹스', voice: 'none', text: '* 위믹스~', cut: 1.4 },
  { hop: 'wemix', by: [0, 90], height: 35, duration: 0.5, keep: true, sfx: false },
  { fling: 'wemix', vx: 0, vup: 0, gravity: 900, spin: 0, duration: 1 },
  { wait: 0.35 },
  { camera: 'player' },
  { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 어 위믹스 어 떨어졌네', cut: 2.2 },
  { voice: 'narrator', text: '* 씨발', cut: 1.1 },
  { set: { maillard_wemix_gone: true } },
  { label: 'done' },
], { silent: true });
