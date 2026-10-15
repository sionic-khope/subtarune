// 박용준 히든 보스전(BUILD462 사용자 브리핑 2026-10-15) 오프닝 대사·시간. 원문은 그대로 둔다.
//   “인게임 전투로 들어가면 새들이 지저귀는 소리(샌즈 보스전 참고)가 들리고 / 박용준: 정말 아름다운 날이네요 / 엄마는 도망가고 오마카세는 맛이없고 /
//    이런날엔 여러분같은 악덕 형님들은 / (촵 촵 소리나면서 샌즈 보스전 보샘) / 지 옥 에 서 불 타 버 려 야 해.(보이스폰트없음 한글자씩 천천히나옴) /
//    이러고 이제 샌즈 메갈로바니아 브금 나오면서 보스 시작”
//   시간은 원작 obj_sansb(30fps) 순서를 초로 옮긴 것: 대사 2프레임당 한 글자, 세 번째 줄 뒤 10프레임 → 새소리 끊김 + snd_noise 암전 → 8프레임 → snd_noise 복귀(눈동자 없는 얼굴)
//   → 20프레임 → 마지막 말은 4프레임당 한 글자·목소리 없음(design/audio/references.md “숨은 보스 — 용준 샌즈 패러디”).
export const YONGJUN_SANS = Object.freeze({
  lines: Object.freeze(['정말 아름다운 날이네요', '엄마는 도망가고 오마카세는 맛이없고', '이런날엔 여러분같은 악덕 형님들은']),
  hell: '지 옥 에 서 불 타 버 려 야 해.',
  voice: 'yongjun',
  birds: 'sans_birds',
  bgm: 'megalovania',
  noise: 'switch_noise',
  firstDelay: 1.0,
  charSeconds: 0.066,
  hellCharSeconds: 0.133,
  cutDelay: 0.33,
  blackHold: 0.27,
  hellDelay: 0.67,
  advanceHold: 0.25,
  sfx: Object.freeze(['switch_noise', 'wing', 'ralsei_splat', 'heavyswing', 'impact', 'pop', 'break1', 'static_burst']),
});
