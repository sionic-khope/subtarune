#!/bin/bash
# Rebuild the 11 per-illustration reference contact sheets.
set -e
cd "$(dirname "$0")/../../.."
R=assets/source/credits371/refs; S=assets/sprites; E=assets/enemies; P=assets/props; T=tests/playtest/shots
B() { uv run --with pillow python assets/source/credits371/sheet.py "$@"; }
H0="$S/hyungsub.png@4,4,0,0=Yoplae (hero)"
G0="$S/gyeongsub.png@4,4,0,0=Kim Gyeongsub"
PP0="$S/ppaman.png@4,4,0,0=Eokppaman (bear)"
J0="$S/junhee.png@4,4,0,0=Junhee (pig)"
Y0="$S/yongjun.png@4,4,0,0=Park Yongjun"
YC0="$S/youngcle.png@4,4,0,0=Youngcle"
B $R/ref01.png 300 "$H0" "$S/hyungsub.png@4,4,0,2=Yoplae side" "$PP0" "$P/raft.png=raft" "$T/void4_02_mid.png=place: purple Twitch island"
B $R/ref02.png 300 "$H0" "$G0" "$PP0" "$E/cs-red-front.png=red minion" "$E/cs-blue-front.png=blue minion" "$P/toolbox.png=box" "$T/teal3_02_spread.png=place: teal forest"
B $R/ref03.png 300 "$J0" "$S/junhee.png@4,4,0,2=Junhee side" "$Y0" "$S/yongjun.png@4,4,0,2=Yongjun side" "$S/junhee-laugh.png=Junhee laugh" "$T/teal3_02_spread.png=place: teal forest"
B $R/ref04.png 300 "$E/baron-front.png=Baron (purple void serpent)" "$Y0" "$H0" "$G0" "$PP0"
B $R/ref05.png 300 "$J0" "$S/junhee_point.png=Junhee pointing" "$P/maillard-ship.png=Maillard battleship (pig ship)"
B $R/ref06.png 300 "$S/warm_bidet.png@4,4,0,0=Warm Bidet" "$S/park_guardian_costume.png@4,4,0,0=Park Guardian costume" "$S/ttuulla.png@4,4,0,0=Ttuulla (mouse)" "$S/mini_mario.png=Dot Mario" "$P/youngcle-warship.png=Eomcheongdaebak-inbae battleship" "$P/ship_console.png=ship console"
B $R/ref07.png 300 "$S/park_guardian.png@4,4,0,0=Park Guardian UNMASKED" "$E/park-guardian-empty-costume.png=pulled-off costume" "$J0" "$YC0" "$S/warm_bidet.png@4,4,0,0=Warm Bidet" "$S/mini_mario.png=Dot Mario"
B $R/ref08.png 300 "$E/drum-devil-field.png=Drum-barrel Devil" "$S/janitor-laugh.png@2,2,0,0=Janitor (laughing)" "$H0" "$T/run-CIdLKQ/drum-devil-battle/screenshots/00-idle.png=place: Jjajang forest"
B $R/ref09.png 300 "$S/choimis-masked.png=Choimis in Discord mask" "$S/choimis.png@4,4,0,0=Choimis unmasked" "$H0" "$G0" "$PP0" "$T/run-Yd8zZW/jjajang-sakura6/screenshots/sakura6_11_exclaim.png=place: cherry forest"
B $R/ref10.png 300 "$S/gajaeman_shadow.png@4,4,0,0=Gajaeman (dark twin)" "$H0" "$G0" "$PP0" "$J0" "$YC0" ".omc/evidence/arena333b/run-uNTeER/castle-arena/s1.png=place: castle"
B $R/ref11.png 300 "$S/gyeongsub.png@4,4,0,1=Gyeongsub back" "$S/hyungsub.png@4,4,0,1=Kim Hyungsub back" "$S/hyungsub.png@4,4,0,0=Kim Hyungsub front" "$S/ppaman.png@4,4,0,1=Eokppaman back" "$S/youngcle.png@4,4,0,1=Youngcle back" ".omc/evidence/wave365/deck.png@4,3,0,0=place: sunset over sea"
