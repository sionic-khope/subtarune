// 폰트 프리셋. FONT_PRESET 하나만 바꾸면 전체 UI 폰트가 바뀐다.
// 비트맵 폰트는 설계 크기(px) 그대로 써야 선명하다.
export const FONT_PRESETS = {
  neodgm:    { family: '"NeoDunggeunmo"', size: 16, lineH: 18, narrationLH: 22 },   // 네오둥근모 (언더테일 한글판 느낌)
  galmuri11: { family: '"Galmuri11"',     size: 11, lineH: 16, narrationLH: 20 },
  galmuri14: { family: '"Galmuri14"',     size: 14, lineH: 18, narrationLH: 22 },
  galmuri9:  { family: '"Galmuri9"',      size: 9,  lineH: 12, narrationLH: 16 },
};
export const FONT_PRESET = 'neodgm';
export const F = FONT_PRESETS[FONT_PRESET];
export const FONT = `${F.size}px ${F.family}, "NeoDunggeunmo", "Galmuri11", "DungGeunMo", monospace`;
