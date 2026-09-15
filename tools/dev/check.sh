#!/bin/bash
# 한 번에 검사: JS 문법(src/tests) → 단위 테스트 → 맵 생성기 --check(JSON 이 생성기와 같은지). 커밋 전·서버 재기동 전에 돌린다.
#   tools/dev/check.sh          전부
#   tools/dev/check.sh --quick  문법 + 단위 테스트만 (pre-commit)
set -u
cd "$(dirname "$0")/../.."
fail=0
while IFS= read -r f; do node --check "$f" 2>/dev/null || { echo "SYNTAX $f"; node --check "$f" 2>&1 | tail -3; fail=1; }; done < <(git ls-files 'src/**/*.js' 'src/*.js' 'tests/**/*.mjs' 'tests/*.mjs' 2>/dev/null; git ls-files -o --exclude-standard 'src/**/*.js' 'tests/**/*.mjs' 2>/dev/null)
/usr/bin/python3 tools/dev/lint_comments.py >/dev/null 2>&1 || { /usr/bin/python3 tools/dev/lint_comments.py | head -20; fail=1; }   # 한 줄 문장 중간 // 주석(뒤 코드 삼킴)
# FORCE_COLOR 가 켜진 셸(Otty 등)에선 node 가 요약 줄에 색을 넣어 grep 이 빗나간다 → 색 끄고 ANSI 도 벗겨서 본다 (2026-09-15)
out=$(FORCE_COLOR=0 NO_COLOR=1 node --test tests/unit/*.test.mjs 2>&1 | sed $'s/\x1b\\[[0-9;]*m//g'); echo "$out" | grep -E "^ℹ (pass|fail)" | tr '\n' ' '; echo
echo "$out" | grep -q "^ℹ fail 0" || { echo "$out" | grep -E "^not ok|AssertionError|Error:" | head -20; fail=1; }
if [ "${1:-}" != "--quick" ]; then
  for g in tools/maps/*.py; do grep -q "'--check'" "$g" || continue; grep -q "argparse" "$g" && continue; r=$(/usr/bin/python3 "$g" --check 2>&1 | tail -1); case "$r" in *same*) ;; *) echo "MAP OUT OF SYNC: $g → $r"; fail=1;; esac; done
fi
[ $fail -eq 0 ] && echo "check: OK" || echo "check: FAIL"
exit $fail
