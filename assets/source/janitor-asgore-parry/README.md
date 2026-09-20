# 보라 드럼통 쳐내기 — 아스고어 창 휘두르기 원본

2026-09-20 사용자 지정: 쳐내는 순간 UNDERTALE ASGORE의 창 휘두르기 소리를 강한 충격에 더한다. 일반 60피해 지원 공격의 루드 버스터와 첫 구출 깃발 명중의 Release Shoot은 변경하지 않는다.

## 식별 근거

기존 프로젝트 자산에서 cinematiccut을 찾지 못했다. [UNDERTALE 디컴파일의 obj_asgore_spearswipe](https://github.com/fachinformatiker/undertale/blob/8fe470447df7bd9a374671e58554d0f3a7471693/objects/obj_asgore_spearswipe.object.gmx)는 생성 시 `caster_load("music/sfx_cinematiccut.ogg")`를 저장하고 창 휘두르기의 `image_index >= 5 && image_index < 6`에서 `caster_play(..., 0.8, 1)`을 한 번 수행한다. 따라서 일반 검 휘두르기나 창 등장음을 추측으로 고른 것이 아니다.

원본: [mus_sfx_cinematiccut.ogg](https://github.com/fachinformatiker/undertale/blob/8fe470447df7bd9a374671e58554d0f3a7471693/sound/audio/mus_sfx_cinematiccut.ogg), `fachinformatiker/undertale@8fe470447df7bd9a374671e58554d0f3a7471693`. 디컴파일 보관 자료이며 배급사 공식 배포처가 아니다. 재배포 권한은 미확인.

## 자산·재생

- 원본 OGG: 이 폴더 `mus_sfx_cinematiccut.ogg`.
- 런타임 키 `asgore_spear_swing`: `assets/audio/sfx/asgore_spear_swing.mp3`.
- 변환: `ffmpeg -v error -i assets/source/janitor-asgore-parry/mus_sfx_cinematiccut.ogg -c:a libmp3lame -q:a 2 assets/audio/sfx/asgore_spear_swing.mp3`.
- 전체 MP3 1.243719초, 44.1kHz stereo, 19,806바이트. 트리밍·EQ·피치·음량 변경 없음.
- 전체 디코드 오류0, 평균 −13.0dBFS / peak −0.8dBFS. 권장 런타임 gain0.65, 기존 강한 충격음은 gain0.45로 함께 한 번만. 원본 레벨이 크므로 두 효과음을 최대 음량으로 중첩하지 않는다.
- 첫 `loadSfxFiles` 목록에 등록. 실제 보라 드럼통 접촉 프레임에 한 번; 일반 지원 공격에는 미사용.

## 따뜻한 비데 이동음 확인

현재 `src/scenes/subrio.js`의 실제 이벤트 매핑: `bossVanish` → `spearappear` volume0.7, `bossJump` → `wing` volume0.35/rate0.7, `bossDive` → `wing` volume0.9. 청소부의 빠른 상승/사라짐은 `spearappear`0.7, 낙하는 `wing`0.9를 그대로 재사용한다. 둘 다 기존 등록 자산이다.

SHA-256 원본: `2c0c413d1a1582a84f234019b35e5772a3ff9683d971cba032a422d319f5b7c0`

SHA-256 MP3: `d770b629df90ef18e5512b66da87e24bf6100dea73fe4e7c8ab1f8e4688a9d1a`
