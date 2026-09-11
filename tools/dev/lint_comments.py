# -*- coding: utf-8 -*-
"""한 줄 문장 중간에 끼어든 `//` 주석 검출: 주석 뒤에 코드가 이어지면(예: `foo(); // 설명 await bar();`) 뒤 코드가 통째로 주석 처리된다.
   같은 실수가 하루에 네 번 반복돼(2026-09-10~11) 문법 검사로는 못 잡는 이 패턴을 여기서 막는다.
사용: /usr/bin/python3 tools/dev/lint_comments.py <파일...>   (없으면 src/ tests/ 전체). 문제가 있으면 1 로 끝난다."""
import io, re, sys, os
CODE_AFTER = re.compile(r"(?:^|[\s;)\]}])(?:await [A-Za-z_$][\w$.]*\(|page\.[A-Za-z_]+\(|game\.[A-Za-z_.]+\(|check\(|logs\.push\(|return [^;]*;|const [A-Za-z_$][\w$]* =|let [A-Za-z_$][\w$]* =|if \([^)]*\) *[{a-z]|\} *else\b)")   # 주석 뒤에 이런 코드 꼴이 오면 삼켜진 것
def strip_strings(line):
    out, i, q = [], 0, None
    while i < len(line):
        ch = line[i]
        if q:
            if ch == '\\': i += 2; continue
            if ch == q: q = None
            out.append(' ')
        else:
            if ch in ('"', "'", '`'): q = ch; out.append(' ')
            else: out.append(ch)
        i += 1
    return ''.join(out)
def find_comment(line):
    s = strip_strings(line); i = s.find('//')
    while i >= 0 and (i > 0 and s[i - 1] == ':'):   # http:// 같은 URL
        i = s.find('//', i + 2)
    return i
def lint(path):
    bad = []
    for n, line in enumerate(io.open(path, encoding='utf-8').read().splitlines(), 1):
        i = find_comment(line)
        if i < 0 or not line[:i].strip(): continue   # 줄 전체가 주석이면 삼킬 코드가 없다
        after = strip_strings(line)[i + 2:]
        if CODE_AFTER.search(after): bad.append((n, line.strip()[:120]))
    return bad
if __name__ == '__main__':
    files = sys.argv[1:]
    if not files:
        for root in ('src', 'tests'):
            for d, _, fs in os.walk(root):
                for f in fs:
                    if f.endswith(('.js', '.mjs')): files.append(os.path.join(d, f))
    total = 0
    for f in files:
        if not f.endswith(('.js', '.mjs')) or not os.path.exists(f): continue
        for n, l in lint(f): print(f"INLINE-COMMENT {f}:{n}: {l}"); total += 1
    print('lint_comments:', 'OK' if total == 0 else f'{total} problem(s)')
    sys.exit(1 if total else 0)
