#!/usr/bin/env python3
"""개발용 정적 서버 — 캐시 끔 (모듈 수정이 새로고침에 바로 반영)."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''): return  # assets/ 탐색 404는 조용히
        super().log_message(fmt, *args)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'→ http://localhost:{port}')
ThreadingHTTPServer(('127.0.0.1', port), NoCache).serve_forever()
