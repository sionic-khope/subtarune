#!/bin/bash
# Rebuild the 11 per-illustration reference sheets (v2): row 1 = character sprites, row 2 = real in-game place
# captures (places/, made by capture-places.mjs) and key props, larger so the place survives API downscaling.
set -e
cd "$(dirname "$0")/../../.."
C=assets/source/credits371; R=$C/refs; PL=$C/places; S=assets/sprites; E=assets/enemies; P=assets/props; T=tests/playtest/shots
TMP=$(mktemp -d)
B() { uv run --with pillow python $C/sheet.py "$@" >/dev/null; }
REF() { n=$1; shift; chars=(); places=(); mode=c
  for a in "$@"; do if [ "$a" = "--" ]; then mode=p; elif [ $mode = c ]; then chars+=("$a"); else places+=("$a"); fi; done
  B $TMP/c.png 240 "${chars[@]}"; B $TMP/p.png 420 "${places[@]}"
  uv run --with pillow python $C/stack.py $R/ref$n.png $TMP/c.png $TMP/p.png; }
H0="$S/hyungsub.png@4,4,0,0=Yoplae (hero)"
G0="$S/gyeongsub.png@4,4,0,0=Kim Gyeongsub"
PP0="$S/ppaman.png@4,4,0,0=Eokppaman (bear)"
J0="$S/junhee.png@4,4,0,0=Junhee (pig)"
Y0="$S/yongjun.png@4,4,0,0=Park Yongjun"
YC0="$S/youngcle.png@4,4,0,0=Youngcle"
REF 01 "$H0" "$S/hyungsub.png@4,4,0,2=Yoplae side" "$PP0" "$P/raft.png=raft" -- "$PL/void4.png=place: void4 purple map" "$T/void4_03_ppaman_closeup.png=Eokppaman on pillar"
REF 02 "$H0" "$G0" "$PP0" "$E/cs-red-front.png=red minion" "$E/cs-blue-front.png=blue minion" "$P/weapon_box_open.png=wooden weapon chest" -- "$PL/teal3.png=place: teal3" "$T/teal3_02_spread.png=teal3 clearing"
REF 03 "$J0" "$S/junhee-laugh.png=Junhee laugh" "$Y0" "$S/yongjun.png@4,4,0,2=Yongjun side" -- "$P/wooden_cannon.png=wooden pig-nose cannon" "$PL/obj1.png=place: obj1 water path"
REF 04 "$E/baron-front.png=Baron" "$Y0" "$H0" "$G0" "$PP0" -- "$PL/obj4.png=place: obj4 water path" "$PL/obj1.png=same area"
REF 05 "$J0" "$S/junhee_point.png=Junhee pointing" -- "$P/maillard-ship.png=Maillard pig ship" "$PL/obj5.png=place: obj5 water path"
REF 06 "$S/warm_bidet.png@4,4,0,0=Warm Bidet" "$S/park_guardian_costume.png@4,4,0,0=Park Guardian" "$S/mini_mario.png=Dot Mario" -- "$PL/lounge.png=place: ship lounge" "$P/ship_lounge_grand_door.png=lounge door"
REF 07 "$S/park_guardian.png@4,4,0,0=Park Guardian UNMASKED" "$E/park-guardian-empty-costume.png=pulled-off costume" "$J0" "$YC0" "$S/warm_bidet.png@4,4,0,0=Warm Bidet" "$S/mini_mario.png=Dot Mario" -- "$PL/stage.png=place: ship stage"
REF 08 "$E/drum-devil-field.png=Drum-barrel Devil" "$S/janitor-laugh.png@2,2,0,0=Janitor (laughing)" "$H0" -- "$T/run-CIdLKQ/drum-devil-battle/screenshots/00-idle.png=place: drum nest" "$PL/nest.png=drum nest"
REF 09 "$R/choimis-masked-noletters.png=Choimis in Discord mask" "$H0" "$G0" "$PP0" -- "$PL/sakura6.png=place: cherry plaza"
REF 10 "$S/gajaeman_shadow.png@4,4,0,0=Gajaeman" "$H0" "$G0" "$PP0" "$J0" "$S/youngcle_hover.png@4,4,0,0=Youngcle on hover" -- "$PL/arena.png=place: castle arena"
REF 11 "$S/gyeongsub.png@4,4,0,1=Gyeongsub back" "$S/hyungsub.png@4,4,0,1=Kim Hyungsub back" "$S/ppaman.png@4,4,0,1=Eokppaman back" "$S/youngcle.png@4,4,0,1=Youngcle back" -- "$PL/sunset.png=place: sunset land"
rm -rf $TMP
