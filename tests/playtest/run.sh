#!/bin/bash
# 헤드리스 플레이테스트 러너: tests/playtest/run.sh battle teal3 ...  (인자 없으면 전부)
#   - playwright-core 는 리포 밖 PW_DIR(기본 ~/.cache/subtarune-pw) 에 두고, 테스트 파일을 거기로 복사해 실행한다(리포에 node_modules 없음)
#   - CHROME_EXE 미지정이면 ms-playwright 캐시의 Chrome for Testing 을 찾는다. 스크린샷은 SHOT_DIR(기본 tests/playtest/shots)
#   - 개발 서버(./dev.sh, :8000)가 떠 있어야 한다
set -u
cd "$(dirname "$0")/../.."
ROOT="$(pwd)"; PW_DIR="${PW_DIR:-$HOME/.cache/subtarune-pw}"; mkdir -p "$PW_DIR"
if [ ! -d "$PW_DIR/node_modules/playwright-core" ]; then (cd "$PW_DIR" && npm init -y >/dev/null 2>&1 && npm i playwright-core >/dev/null 2>&1) || { echo "playwright-core 설치 실패: $PW_DIR"; exit 2; }; fi
if [ -z "${CHROME_EXE:-}" ]; then CHROME_EXE="$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac*/"Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" 2>/dev/null | tail -1)"; fi
[ -x "${CHROME_EXE:-}" ] || { echo "CHROME_EXE 없음 — npx playwright install chromium 또는 CHROME_EXE=<경로>"; exit 2; }
curl -s -o /dev/null http://localhost:8000/index.html || { echo "개발 서버(:8000) 꺼짐 — ./dev.sh"; exit 2; }
export CHROME_EXE SHOT_DIR="${SHOT_DIR:-$ROOT/tests/playtest/shots}"
names=("$@"); [ ${#names[@]} -eq 0 ] && names=($(cd tests/playtest && ls *.mjs | sed 's/\.mjs$//'))
total=0
for n in "${names[@]}"; do
  cp "tests/playtest/$n.mjs" "$PW_DIR/"; echo "### $n"
  out="$(cd "$PW_DIR" && node "$n.mjs" 2>&1)"; echo "$out" | grep -E "FAIL|fails=|CRASH" || echo "$out" | tail -5
  f="$(echo "$out" | grep -oE "fails=[0-9]+" | tail -1 | cut -d= -f2)"; total=$((total + ${f:-1}))
done
echo "=== total fails=$total"; [ "$total" -eq 0 ]
