# 보라꽃 → 박용준 히든 보스 (BUILD462, 사용자 브리핑 2026-10-15)

## 흐름
1. **청록숲4 검은 꽃**(`teal4_flower`): 말 건 횟수를 `flower_talks` 로 센다. 1번째는 예전 그대로(“...나가...” → 빠맨·경섭 반응), 2~4번째는 “...”. 동료와 함께일 때 **5번째**에 억빠맨 “아 시발년 걍 제가 뽑을게요” → 꽃 바로 아래로 달려가 위를 보고 뽑음(pop) → 꽃 소품 제거 → “보라꽃을 얻었다.”(`purple_flower_taken`, 맵 소품 `unless`).
2. **보라꽃** 아이템: 그냥 아이템, `heal: -100`(“억빠맨이 뽑아 온 보라꽃. HP -100 회복.”).
3. **마이야르호 라운지 상점 → 판다 → 보라꽃**(`YONGJUN_SALE_EVENTS`): 가격 칸 `???`, 예 → 돈 없이 넘어가고 `yongjun_flower_sold` → 상점 화면이 검게 닫히고 필드 연출 `yongjun_flower`. 다른 상점(엄청대박인배 라운지)에서는 “판매 불가”.
4. **필드 연출**: 용준이 상점 문 앞, 일행(억빠맨·형섭·경섭)이 그 아래 한 줄. 대사 원문 → “욱...” 뒤 브금 꺼짐(1.2초) → “오오옥” 동안 용준 부들부들 → “크크크...” 뒤 `captain_reveal` 브금 + 가재맨 첫 등장 보라 연기(swell, veil 0.4) + 오라(CAPTAIN_AURA_COLORS)를 용준에게, 일행 ‘!’ → 연기는 용준 둘레(cloak)로 남음 → … “끔찍한 시간을 보내게해주지” → `battleEntry` → 연기·배우 정리 → 전투.
5. **전투**(`yongjun_sans`, HP 100, 피함 없음, 피해 15, 돈 0, 보스): 배경은 라운지(`maillard_lounge` 전투 배경 — 벽 띠·나무 바닥·용준 뒤 상점, BUILD464 사용자 “전투 맵 배경에 나무 맵 깔려있고 상점도 보여야함”). 오프닝은 원작 `obj_sansb` 순서 — 새소리(`sans_birds` = UNDERTALE `mus_birdnoise`) → 말풍선 세 줄(목소리, C) → 0.33초 뒤 새소리 끊김 + 촵(`switch_noise` = `snd_noise`) 화면 전체 검정 → 0.27초 뒤 촵, 눈동자 없는 얼굴(`yongjun-sans-dark.png`) → 0.67초 뒤 “지 옥 에 서 불 타 버 려 야 해.”(목소리 없음, 한 글자 0.1초 — BUILD464 “속도 살짝 늘려주고”) → C → **메뉴 없이 바로 첫 강공격**(음악·말풍선 없음, 눈 번쩍 `sans_eye`) = 냄새 블래스터(가스터 블래스터식, 등장 `sans_blaster_charge`·발사 `sans_blaster_fire`+`sans_blaster_gigatalk` 1.2배) → “왜 다들 처음부터 강한공격을 안쓰시는걸까요?”(C) → 메갈로바니아 + 행동 선택. 재도전 때도 같은 오프닝.
6. **패턴 아홉**(차례대로, 턴마다 말풍선 = 패턴 `speak`): 악취 나선 → 냄스터블래스터 연발(“냄스터블래스터!”) → 생선 켁켁(입 옆 우적우적·켁!, 용준 목소리) → 구르기 → 용준대포(“용준대포 발사!”) → 엄마 우는 → 냄스터블래스터 일제(“냄스터블래스터!”) → 냄새고아돼지 글자 → 포옹 번개(“응? 인경님 무슨..” → 상자 위 “우오오오옥!!”). 효과 그림은 gpt 도트(`assets/props/yongjun-*.png`) + 쮼앰대포·포탄·폭파 이펙트, 효과음은 샌즈전 소리. 설계는 `src/battle/yongjun-patterns.js` 머리말.
7. **승리** → 라운지 브금 → 상점 화면으로 돌아와 대사(용준 = 상점 패널, 억빠맨·나레이션 = 대화창) → 오마카세(팀 전체 최대 HP +10 바로 적용, `yongjun_omakase_eaten`) → 평소 상점 메뉴.

## 대사 대응표
| 브리핑 원문 | 구현 |
|---|---|
| 억빠맨: 아 시발년 걍 제가 뽑을게요 (억빠맨이 다가가서 움직임) | `teal4_flower` 5번째, 억빠맨 이동 + 깡충 + pop |
| 박용준: 오 형 이게 뭐에요? ~ 끔찍한 시간을 보내게해주지 | `yongjun_flower` 원문 그대로, 괄호는 연출(브금꺼짐·보라 화면·전투연출) |
| 박용준: 정말 아름다운 날이네요 / 엄마는 도망가고 오마카세는 맛이없고 / 이런날엔 여러분같은 악덕 형님들은 | `YONGJUN_SANS.lines` |
| (촵 촵) 지 옥 에 서 불 타 버 려 야 해. (보이스폰트없음 한글자씩 천천히) | `snd_noise` 두 번, `YONGJUN_SANS.hell` voice none |
| 윽 으윽 ~ 이걸로 봐준다. | `yongjun_flower_after`(상점 화면) |
| 한턴한턴마다 대사 적절하게 | 패턴 `speak` 다섯 줄 + 잡담 `lines.idle` 여섯 줄(사용자가 쓰라고 해서 내가 씀). 포옹 턴은 “응? 인경님 무슨..”(BUILD465 사용자 원문) → 상자 안 “우오오오옥!!” |
| 끔찍한 시간을 보내게해주지 이후 억빠맨: 형님들 꽃의 부작용인거같아요 / 경섭: 허허 일단 처리해야겠네. / 박용준: 들어와라 → 전투 | `yongjun_flower` battleEntry 직전(BUILD465) |
| 지옥에서 불타버려야해 → 강한 공격패턴 → 박용준: 왜 다들 처음부터 강한공격을 안쓰시는걸까요? → 메갈로바니아 | `YONGJUN_SANS.openingPattern`(yongjun_blaster)·`afterOpening` |

## 플래그
`flower_talks`(수) · `flower_spoke` · `purple_flower_taken` · `yongjun_flower_sold` · `yongjun_sans_won` · `yongjun_omakase_eaten`. QA 지점 `yongjun_flower`(상점 앞, 보라꽃 소지).

## 검증
단위 `tests/unit/yongjun-sans.test.mjs`, 플레이테스트 `purple-flower`·`yongjun-sans`.
