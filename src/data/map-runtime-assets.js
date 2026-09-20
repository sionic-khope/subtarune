import { YOUNGCLE_TV, YOUNGCLE_TV_PORTRAITS } from './youngcle-tv.js';

export const MAP_RUNTIME_ASSETS = {
  maillard_captain: { sprites: ['junhee_point', 'junhee_mankatsuki'], images: ['assets/fx/mankatsuki-vortex.png'] },
  maillard_lounge: { sprites: ['yerim_kick'] },
  obj4: { sprites: ['baron_chase'] },
  youngcle20: { sprites: ['youngcle_powerup', 'youngcle_tvform'], portraits: YOUNGCLE_TV_PORTRAITS, images: ['assets/fx/mankatsuki-vortex.png'] },
  // 드럼통의 악마 뒤 연출(BUILD254): 둥지 스크립트가 {map} 으로 석상 앞 숲까지 이어지므로, 석상 맵 자체 스크립트엔 없는 초상화·그림을 미리 둔다
  // 'janitor' 시트도 싣는다: 청소부 초상화는 걷기 시트 얼굴로 만든다(makePortraits) — 없으면 빈 얼굴(사용자 2026-09-20 “청소부 얼굴어디갔어”)
  jjajang_nest: { sprites: ['janitor_hero', 'janitor'], portraits: ['janitor'] },
  jjajang_statue: { sprites: ['janitor_hero', 'janitor', 'ppaman', 'gyeongsub'], portraits: [...YOUNGCLE_TV_PORTRAITS, 'ppaman', 'gyeongsub', 'janitor'],
    images: ['assets/illustrations/jjajang_island_crash.png', 'assets/props/youngcle-warship-left.png', 'assets/props/youngcle_tv_frame.png', 'assets/props/tv_arm.png', 'assets/fx/explosion.png',
      ...Object.values(YOUNGCLE_TV.expressions)] },   // TV 화면 그림(용광로 광장·조종실은 맵 preload 에 두지만 이 맵의 TV 는 컷신 전용)
};
