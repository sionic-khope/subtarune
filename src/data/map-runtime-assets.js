import { YOUNGCLE_TV, YOUNGCLE_TV_PORTRAITS } from './youngcle-tv.js';

export const MAP_RUNTIME_ASSETS = {
  ship_lounge: {
    sprites: ['youngcle', 'youngcle_hover', 'junhee', 'yongjun', 'gyeongsub', 'ppaman', 'expelled_viewer', 'eunbyeol', 'lucky_guy', 'dohyun', 'domijorim', 'chakgeom'],
    portraits: ['youngcle', 'junhee', 'yongjun', 'gyeongsub', 'ppaman'],
    images: ['assets/props/ship-photo-camera.png'],
  },
  ship_night_deck: {
    sprites: ['hyungsub', 'gyeongsub', 'ppaman'],
    portraits: ['gyeongsub', 'ppaman'],
    images: ['assets/sprites/hyungsub-deck-fist.png', 'assets/sprites/gyeongsub-deck-fist.png', 'assets/sprites/ppaman-deck-fist.png'],
  },
  gajaeman_castle_entry: {
    sprites: ['youngcle', 'youngcle_hover', 'junhee', 'gyeongsub', 'ppaman'],
    portraits: ['youngcle', 'junhee', 'gyeongsub', 'ppaman'],
  },
  gajaeman_castle_approach: {
    images: ['assets/backdrops/castle306_distant.png', 'assets/props/castle306_gate.png'],
  },
  maillard_captain: { sprites: ['junhee_point', 'junhee_mankatsuki'], images: ['assets/fx/mankatsuki-vortex.png'] },
  maillard_lounge: { sprites: ['yerim_kick'] },
  obj4: { sprites: ['baron_chase'] },
  youngcle20: { sprites: ['youngcle_powerup', 'youngcle_tvform'], portraits: YOUNGCLE_TV_PORTRAITS, images: ['assets/fx/mankatsuki-vortex.png', 'assets/props/editor-union-mushroom.png'] },   // 버섯: 쥰희 회복 연출(ship_control healToss) — 미리 안 받으면 보라 네모(BUILD268)
  // 드럼통의 악마 뒤 연출(BUILD254): 둥지 스크립트가 {map} 으로 석상 앞 숲까지 이어지므로, 석상 맵 자체 스크립트엔 없는 초상화·그림을 미리 둔다
  // 'janitor' 시트도 싣는다: 청소부 초상화는 걷기 시트 얼굴로 만든다(makePortraits) — 없으면 빈 얼굴(사용자 2026-09-20 “청소부 얼굴어디갔어”)
  jjajang_nest: { sprites: ['janitor_hero', 'janitor'], portraits: ['janitor'] },
  jjajang_glade: { sprites: ['choimis', 'gasuni1', 'gasuni2', 'gasuni3'], portraits: ['choimis', 'gasuni1', 'gasuni2', 'gasuni3', 'ppaman', 'gyeongsub'] },
  jjajang_sakura2: { sprites: ['choimis', 'gasuni1', 'gasuni2', 'gasuni3'], portraits: ['choimis', 'gasuni1', 'ppaman'] },
  jjajang_sakura8: { sprites: ['gyeongsub', 'ppaman', 'choimis'], portraits: ['gyeongsub', 'ppaman', 'choimis'] },   // 벚꽃 숲 8(BUILD282): 갈림길 연출용 경섭·억빠맨 사본 NPC + 가드
  jjajang_sakura12: { sprites: [], portraits: ['dark_jjajang'] },   // 벚꽃 숲 12(BUILD288): 제단의 말하는 짜장면 초상화
  jjajang_night_cliff: {
    sprites: ['gyeongsub', 'choimis', 'choimis_flower'],
    portraits: ['gyeongsub', 'choimis', 'choimis_flower', 'ppaman'],
    images: [
      'assets/enemies/choimis-flower-raise.png',
      'assets/battle/hyungsub.png', 'assets/battle/gyeongsub.png', 'assets/battle/ppaman.png',
    ],
  },
  jjajang_sakura7: { sprites: ['jeomnye', 'choimis_masked', 'choimis', 'domijorim', 'gasuni1', 'gasuni2', 'gasuni3', 'gasuni4', 'gasuni5', 'gasuni6'], portraits: ['jeomnye', 'choimis', 'domijorim', 'gasuni1', 'gyeongsub', 'ppaman'] },   // 벚꽃 숲 7(BUILD278): 무대의 점례·가면/맨얼굴 최미스·난입 도미조림·관객 가순이들
  jjajang_sakura6: { sprites: ['choimis_masked', 'choimis'], portraits: ['choimis', 'gyeongsub', 'ppaman'] },   // 벚꽃 숲 6(BUILD277): 광장의 가면 쓴 최미스(고백 연습 연출)
  jjajang_sakura5: { sprites: ['domijorim', 'gasuni4', 'gasuni5', 'gasuni6', 'dohyun', 'choimis', 'choimis_flower', 'gyeongsub', 'ppaman'], portraits: ['domijorim', 'gasuni4', 'dohyun', 'ppaman', 'gyeongsub', 'choimis', 'choimis_flower'], images: ['assets/props/dark_jjajang.png'] },
  jjajang_statue: { sprites: ['janitor_hero', 'janitor', 'ppaman', 'gyeongsub'], portraits: [...YOUNGCLE_TV_PORTRAITS, 'ppaman', 'gyeongsub', 'janitor'],
    images: ['assets/illustrations/jjajang_island_crash.png', 'assets/props/youngcle-warship-left.png', 'assets/props/youngcle_tv_frame.png', 'assets/props/tv_arm.png', 'assets/fx/explosion.png',
      ...Object.values(YOUNGCLE_TV.expressions)] },   // TV 화면 그림(용광로 광장·조종실은 맵 preload 에 두지만 이 맵의 TV 는 컷신 전용)
};
