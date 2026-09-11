# -*- coding: utf-8 -*-
"""안전 패치 러너: 표준 입력으로 받은 파이썬 패치 코드를 실행하되, 대상 JS 파일은 임시 사본에 적용 → `node --check` 통과한 것만 원본으로 옮긴다.
   개발 서버(./dev.sh)가 작업 트리를 그대로 서빙하므로, 문법이 깨진 중간 상태가 1초라도 저장되면 그 순간 새로고침한 사용자에게 게임이 깨져 보인다(2026-09-10).
사용:  /usr/bin/python3 tools/dev/patch.py src/a.js src/b.js <<'PY'
         ... rd(p)/wr(p, s)/rep(s, old, new) 로 패치 (p 는 인자로 준 경로 그대로 쓰면 된다) ...
       PY
"""
import io, os, sys, shutil, subprocess, tempfile
targets = sys.argv[1:]
tmpdir = tempfile.mkdtemp(prefix='patch-')
mapping = {}
for t in targets:
    tmp = os.path.join(tmpdir, t.replace('/', '__')); shutil.copy(t, tmp); mapping[t] = tmp
def rd(p): return io.open(mapping.get(p, p), encoding='utf-8').read()
def wr(p, s): io.open(mapping.get(p, p), 'w', encoding='utf-8').write(s)
def rep(s, old, new):
    assert old in s, 'MISSING: ' + old[:140]; return s.replace(old, new, 1)
code = sys.stdin.read()
exec(compile(code, '<patch>', 'exec'), {'rd': rd, 'wr': wr, 'rep': rep, 'io': io, 're': __import__('re')})
bad = []
for t, tmp in mapping.items():
    if t.endswith(('.js', '.mjs')):
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        if r.returncode != 0: bad.append((t, r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'syntax error'))
        lint = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'lint_comments.py'), tmp], capture_output=True, text=True)
        if lint.returncode != 0: bad.append((t, lint.stdout.strip().splitlines()[0] if lint.stdout.strip() else 'inline comment'))   # 문장 중간 // 주석은 문법은 통과해도 뒤 코드를 삼킨다
if bad:
    for t, msg in bad: print('REJECTED', t, '-', msg)
    print('원본은 바뀌지 않았다'); sys.exit(1)
for t, tmp in mapping.items(): shutil.move(tmp, t); print('patched', t)
