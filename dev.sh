#!/bin/bash
# 개발 서버 재기동: ./dev.sh  → http://localhost:8000 (캐시 없음)
cd "$(dirname "$0")"
pkill -f "serve.py 8000" 2>/dev/null; sleep 0.3
python3 serve.py 8000
