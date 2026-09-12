const yongjun = (text) => ({ speaker: '용준', portrait: 'yongjun', voice: 'yongjun', text: `* ${text}` });
const ppaman = (text) => ({ speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: `* ${text}` });

/** DESIGN.md §6: battle-local support charge, exact briefing, and monochrome mode assets. */
export const BARON_CANNON = {
  requiredHits: 9, damage: 50, chargeSeconds: 12, focusSeconds: 3, fireSeconds: 3, shotTravelSeconds: 1.4,
  intro: { x: 183, fromY: -10, toY: 184, enterSpeed: 78, speed: 65, scale: 0.65, frameSeconds: 0.16 },
  assets: {
    yongjun: 'assets/battle/cannon-guard/yongjun.png',
    cannon: 'assets/battle/cannon-guard/cannon.png',
    baron: 'assets/battle/cannon-guard/baron.png',
    acid: 'assets/battle/cannon-guard/acid.png',
    shot: 'assets/battle/cannon-guard/shot.png',
  },
  introLines: [
    yongjun('헉.. 헉.. 형들 제 대포가 오발탄이 되긴했는데, 지금 고치고있어요'),
    yongjun('발사가 가능할때 말씀 드릴게요 근데요 문제가'),
    ppaman('문제가 뭔데 씨발새끼야 지금 바빠'),
    yongjun('아 죄송해요 문제가 차징시간이 길다는거에요'),
    ppaman('그래서?'),
    yongjun('그래서 차징될동안 저 바론이 공격하는걸 막아주셔야해요'),
    ppaman('하 시발 어떻게 하는건데'),
    yongjun('일단 바론하고 조금 싸우고 있어주세요 대포 가져올게요'),
    { voice: 'narrator', text: '* 대포 스택이 추가되었다.' },
  ],
  dialogue: {
    charge: yongjun('형 차징 좀 할게요 12초정도 걸려요 지 지켜주세요 !!'),
    controls: yongjun('위 아래 방향키로 막을 수 있어요'),
    damage: { voice: 'narrator', text: '* 바론에게 50 데미지를 입혔다.' },
    success: yongjun('하하 맛이 어떠냐! 형 정비하고 올게요'),
    failure: yongjun('아 씨발'),
  },
};
