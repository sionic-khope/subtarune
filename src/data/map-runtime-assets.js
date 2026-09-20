import { YOUNGCLE_TV, YOUNGCLE_TV_PORTRAITS } from './youngcle-tv.js';

export const MAP_RUNTIME_ASSETS = {
  maillard_captain: { sprites: ['junhee_point', 'junhee_mankatsuki'], images: ['assets/fx/mankatsuki-vortex.png'] },
  maillard_lounge: { sprites: ['yerim_kick'] },
  obj4: { sprites: ['baron_chase'] },
  youngcle20: { sprites: ['youngcle_powerup', 'youngcle_tvform'], portraits: YOUNGCLE_TV_PORTRAITS, images: ['assets/fx/mankatsuki-vortex.png', 'assets/props/editor-union-mushroom.png'] },   // 버섯: 쥰희 회복 연출(ship_control healToss) — 미리 안 받으면 보라 네모(BUILD268)
  // 드럼통의 악마 뒤 연출(BUILD254): 둥지 스크립트가 {map} 으로 석상 앞 숲까지 이어지므로, 석상 맵 자체 스크립트엔 없는 초상화·그림을 미리 둔다
  // 'janitor' 시트도 싣는다: 청소부 초상화는 걷기 시트 얼굴로 만든다(makePortraits) — 없으면 빈 얼굴(사용자 2026-09-20 “청소부 얼굴어디갔어”)
  jjajang_nest: { sprites: ['janitor_hero', 'janitor'], portraits: ['janitor'] },
  jjajang_glade: { sprites: ['choimis', 'gasuni1', 'gasuni2', 'gasuni3'], portraits: ['choimis', 'gasuni1', 'gasuni2', 'gasuni3', 'ppaman', 'gyeongsub'] },
  jjajang_sakura2: { sprites: ['choimis', 'gasuni1', 'gasuni2', 'gasuni3'], portraits: ['choimis', 'gasuni1', 'ppaman'] },
  jjajang_sakura5: { sprites: ['domijorim', 'gasuni4', 'gasuni5', 'gasuni6', 'dohyun'], portraits: ['domijorim', 'gasuni4', 'dohyun', 'ppaman'] },   // 벚꽃 숲 5(BUILD271): 공터의 도미조림·가순이 4·5·6·도현   // 벚꽃 숲 2(BUILD264): 벚꽃다리 위 가면 쓴 최미스·가순이 셋   // 빛 드는 공터(BUILD257): 풀숲의 최미스·가순이 셋
  jjajang_statue: { sprites: ['janitor_hero', 'janitor', 'ppaman', 'gyeongsub'], portraits: [...YOUNGCLE_TV_PORTRAITS, 'ppaman', 'gyeongsub', 'janitor'],
    images: ['assets/illustrations/jjajang_island_crash.png', 'assets/props/youngcle-warship-left.png', 'assets/props/youngcle_tv_frame.png', 'assets/props/tv_arm.png', 'assets/fx/explosion.png',
      ...Object.values(YOUNGCLE_TV.expressions)] },   // TV 화면 그림(용광로 광장·조종실은 맵 preload 에 두지만 이 맵의 TV 는 컷신 전용)
};
