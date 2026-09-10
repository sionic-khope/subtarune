#!/bin/sh
# 낙석 맵 3개 재생성 (이벤트 소품 포함). 수정은 여기서 하고 다시 돌린다. --check 를 붙이면 검사만.
set -e
/usr/bin/python3 tools/maps/rockfall_map.py void5 --rocks 3 --entry left --exit down --prev void4 --next void6 --tail 14 --props '[{"type": "prop", "id": "flowers", "image": "assets/props/flowers_purple.png", "x": 832, "y": 158, "solid": true, "script": "rock_flowers"}]' "$@"
/usr/bin/python3 tools/maps/rockfall_map.py void6 --rocks 6 --entry top --exit down --prev void5 --next void7 --tail 14 --props '[{"type": "prop", "id": "sign_rock", "image": "assets/props/signpost.png", "x": 1416, "y": 148, "solid": true, "script": "rock_sign"}]' "$@"
/usr/bin/python3 tools/maps/rockfall_map.py void7 --rocks 9 --entry top --exit right --prev void6 --next void8 --next-spawn from_left --tail 14 --props '[{"type": "prop", "id": "boulder", "image": "assets/props/rock.png", "x": 1888, "y": 196, "solid": true, "script": "rock_boulder"}]' "$@"
