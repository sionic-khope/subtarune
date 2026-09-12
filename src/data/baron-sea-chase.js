/** Object region 5: one real tutorial shot, then a hit-based realtime sea chase. */
export const BARON_SEA_CHASE = {
  hitsToClear: 75,
  fireCooldown: 0.8,
  bulletSpeed: 410,
  sailDuration: 1.8,
  hitDuration: 0.36,
  roarDuration: 1.8,
  scrollSpeed: 96,
  raft: { x: 92, y: 140, minY: 106, maxY: 272, speed: 142, width: 90, height: 52, gunX: 3, gunY: -8, gunWidth: 54, swimmerY: 80 },
  boss: { x: 258, baseY: 20, width: 220, height: 220, amplitude: 74, period: 6.4, shift: 12, mouth: [0.29, 0.58], target: [0.23, 0.44, 0.52, 0.27] },
  sheet: { src: 'assets/sprites/baron-sea.png', cols: 2, rows: 2, idle: 0, hurt: 1, roar: 2, recovery: 3 },
  bgm: 'baron_sea_battle',
  dialogue: [
    { speaker: '박용준', portrait: 'yongjun', voice: 'yongjun', text: '* 으 으아아악 살려줘요 형' },
    { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 형 c를 한번 눌러보세요' },
  ],
};
