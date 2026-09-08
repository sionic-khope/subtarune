#!/usr/bin/env python3
"""개발용 정적 서버 — 캐시 끔 + 에디터 저장 API.
  GET  /api/list?dir=assets/library      → JSON 파일 목록(재귀, png/webp/gif/json)
  POST /api/save?path=assets/maps/x.json → 본문을 그 경로에 저장 (프로젝트 폴더 안만 허용)
"""
import sys, os, json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
EXT = ('.png', '.webp', '.gif', '.jpg', '.json')

def safe(rel):
    p = os.path.normpath(os.path.join(ROOT, rel.lstrip('/')))
    if not p.startswith(ROOT + os.sep): raise ValueError('outside project')
    return p

class Dev(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, fmt, *args):
        if len(args) > 1 and '404' in str(args[1]): return
        super().log_message(fmt, *args)
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/list':
            d = parse_qs(u.query).get('dir', ['assets'])[0]
            try: base = safe(d)
            except ValueError: return self._json(400, {'error': 'bad dir'})
            files = []
            for dp, _, fs in os.walk(base):
                for f in fs:
                    if f.lower().endswith(EXT):
                        files.append(os.path.relpath(os.path.join(dp, f), ROOT))
            return self._json(200, {'files': sorted(files)})
        return super().do_GET()
    def do_POST(self):
        u = urlparse(self.path)
        if u.path != '/api/save': return self._json(404, {'error': 'no'})
        rel = parse_qs(u.query).get('path', [''])[0]
        try: p = safe(rel)
        except ValueError: return self._json(400, {'error': 'outside project'})
        n = int(self.headers.get('Content-Length', 0)); data = self.rfile.read(n)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(data)
        return self._json(200, {'saved': rel, 'bytes': n})

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'→ http://localhost:{port}   (에디터: /editor.html)')
ThreadingHTTPServer(('127.0.0.1', port), Dev).serve_forever()
