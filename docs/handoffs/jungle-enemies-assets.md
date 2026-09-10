# 정글 몬스터 정지 이미지 전달

칼날부리(raptor)·두꺼비(gromp)·늑대(wolf)의 필드 정면과 왼쪽 전투 이미지다. LoL 정글 몬스터를 참고해 내장 이미지 생성 도구로 제작했다. [외형 참고 자료](https://www.tarreo.com/noticias/479844/El-Escurridizo-ha-causado-que-Castigo-sea-el-hechizo-mas-jugado-del-momento-y-traera-cambios)는 외형 참고 출처이며, 기사 이미지를 게임 PNG로 복사한 것은 아니다.

## 파일 계약

각 RGBA PNG 전체가 정지 프레임 한 장이다. 크기와 pivot은 [기존 미니언 계약](combat-assets.md)을 따른다. 좌상단이 원점이며 pivot은 발/바닥 기준 좌표다.

| 종 | 필드 정면 | 전투 왼쪽 |
|---|---|---|
| 칼날부리 | [jungle-raptor-front.png](../../assets/enemies/jungle-raptor-front.png) | [jungle-raptor-battle-left.png](../../assets/enemies/jungle-raptor-battle-left.png) |
| 두꺼비 | [jungle-gromp-front.png](../../assets/enemies/jungle-gromp-front.png) | [jungle-gromp-battle-left.png](../../assets/enemies/jungle-gromp-battle-left.png) |
| 늑대 | [jungle-wolf-front.png](../../assets/enemies/jungle-wolf-front.png) | [jungle-wolf-battle-left.png](../../assets/enemies/jungle-wolf-battle-left.png) |

- 필드: 48×48, 프레임 영역 `[0,0,48,48]`, pivot `[24,44]`, 정면.
- 전투: 64×64, 프레임 영역 `[0,0,64,64]`, pivot `[32,60]`, 왼쪽. 오른쪽에 서서 왼쪽 아군을 보는 그림이므로 다시 반전하지 않는다.
- 걷기·대기 반복·공격·피격·사망 애니메이션은 포함하지 않는다. 위치를 움직여도 걷기 프레임이 생기지는 않는다.

이 패키지는 이미지 전달만 한다. 적 ID 등록, 능력치, 전투 정의, 맵 배치, 조우·컷신 연결은 후속 구현에서 결정한다. 기존 `still` 필드 이미지 계약과 `image`/`pivot` 전투 계약을 사용할 수 있지만, 적용 브랜치의 최신 로더부터 확인한다. 4×4 시트 로더로 나누거나 아군 전투 프레임 설정을 복사하지 않는다.

## 원본과 재추출

[manifest.json](../../assets/source/jungle-enemies-v1/manifest.json)에 파일 경로·크기·pivot·원본 영역·축소 비율·배치·출력 SHA-256을 기록한다. 같은 폴더에 생성 원본 6장과 각 프롬프트를 보존한다.

```bash
uv run tools/sprites/import_jungle_enemies.py
```

[가져오기 스크립트](../../tools/sprites/import_jungle_enemies.py)는 기존 `slice_sheet.key_cell`의 가장자리 연결 배경 제거를 재사용하고 마젠타 잔여(`R > G+20`, `B > G+20`)를 투명화한 뒤 전체 실루엣을 최근접 축소하고 바닥에 정렬한다. 이 세 원본의 몸체에는 해당 마젠타색이 없음을 육안으로 확인했다. 그림을 다시 그리거나 색을 평균내거나 팔레트를 양자화하지 않는다. 최종 PNG는 이미 투명하므로 추가 마젠타 처리를 하지 않는다. 표시할 때 `imageSmoothingEnabled=false`를 사용하며 장면 배율은 소비 코드에서 결정한다.

## 확인 범위

6장 모두 직접 열어 정면/왼쪽 방향, 실루엣과 투명 배경을 확인한다. 가져오기 스크립트를 두 번 실행해 PNG·manifest 바이트가 같고, 출력 크기·알파·경계 여백·문서 경로가 계약에 맞는지 확인한다. 이 에셋 패키지에는 게임 실행 또는 실제 전투 연결 검증이 포함되지 않는다.
