#!/usr/bin/env python3
"""색깔 기억 게임(용광로 광장 조작 패널, BUILD198) 영클 TV 호출 음성 — 사용자 2026-09-16 브리핑
“RED ~ GREEN ~ BLUE ~ 하면서 1초에 하나씩, 기계음 같이(파피 플레이타임 2 뮤지컬 메모리 느낌)”.
사용자 추가 지시 “약간 기계음, 마이크로 한 듯한 느낌, 남자 굵은 로봇 목소리”: macOS `say` 합성 — 영어는 Zarvox(깊은 남자 로봇 음성),
한국어 단어는 Yuna 를 0.78배로 낮춰(길이는 되돌림) 굵게 → ffmpeg 로 PA 마이크 대역(220~3800Hz)·비트크러시·38Hz 떨림·짧은 방 에코를 같은 사슬로 얹어
한 스피커에서 나오는 질감으로 맞춘 뒤 loudnorm → assets/audio/sfx/color_<이름>.mp3 (모노 44.1kHz). 실존 인물 음성을 합성하지 않는다.
실행: /usr/bin/python3 tools/audio/color_voices.py [--voice-en Zarvox] [--voice-ko Yuna] [--rate 175] [--ko-pitch 0.78]
색 7(빨주노초파남보 = RED ORANGE YELLOW GREEN BLUE NAVY PURPLE) + 마지막 판의 혼돈 단어(사용자 원문: 하트, nasdf, pi, 레전드, 응아잇어)."""
from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

OUT = Path('assets/audio/sfx')
# 이름 → (언어, 읽을 말). 색 이름은 영어(사용자 예시 “RED, GREEN, YELLOW …”), 혼돈 단어는 사용자가 쓴 표기대로(한글은 한국어 음성)
WORDS: dict[str, tuple[str, str]] = {
    'red': ('en', 'RED!'), 'orange': ('en', 'ORANGE!'), 'yellow': ('en', 'YELLOW!'), 'green': ('en', 'GREEN!'),
    'blue': ('en', 'BLUE!'), 'navy': ('en', 'NAVY!'), 'purple': ('en', 'PURPLE!'),
    'heart': ('ko', '하트!'), 'nasdf': ('en', 'nasdf!'), 'pi': ('en', 'pi!'), 'legend': ('ko', '레전드!'), 'ngaita': ('ko', '응아잇어!'),
}
# 마이크·로봇 질감: (한국어만 피치 다운) → PA 대역 제한 → 비트크러시(기계) → 38Hz 떨림(로봇 버즈) → 25ms 방 에코(마이크·스피커) → 70/150/240ms 홀 에코(사용자 “에코도 좀 추가”) → 라우드니스 정규화 → 앞뒤 무음 제거
MIC = ('highpass=f=220,lowpass=f=3800,acrusher=bits=9:mode=log:aa=1:mix=0.3,tremolo=f=38:d=0.28,aecho=0.8:0.55:25:0.28,aecho=0.8:0.75:70|150|240:0.42|0.28|0.16,'
       'loudnorm=I=-15:TP=-1.5:LRA=6,'
       'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,'
       'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,afade=t=in:d=0.008')


def chain(lang: str, ko_pitch: float) -> str:
    if lang == 'ko':
        return f'asetrate=22050*{ko_pitch},aresample=44100,atempo={1 / ko_pitch:.4f},' + MIC
    return 'aresample=44100,' + MIC


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--voice-en', default='Zarvox'); ap.add_argument('--voice-ko', default='Yuna'); ap.add_argument('--rate', type=int, default=175); ap.add_argument('--ko-pitch', type=float, default=0.78)
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, (lang, text) in WORDS.items():
            voice = a.voice_en if lang == 'en' else a.voice_ko
            aiff = Path(tmp) / f'{name}.aiff'
            subprocess.run(['say', '-v', voice, '-r', str(a.rate), '-o', str(aiff), text], check=True)
            out = OUT / f'color_{name}.mp3'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(aiff), '-af', chain(lang, a.ko_pitch), '-ac', '1', '-ar', '44100',
                            '-map_metadata', '-1', '-c:a', 'libmp3lame', '-q:a', '4', str(out)], check=True)
            dur = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)], capture_output=True, text=True, check=True).stdout.strip()
            print(f'{out} {voice} {dur}s')


if __name__ == '__main__':
    main()
