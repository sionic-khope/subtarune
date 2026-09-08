"""픽셀아트 페인터 — 델타룬 밀도(1 논리px = 1 아트px, 타일 32x32) 로 타일/소품 PNG 를 만든다.
좌표는 정수 픽셀. 색은 (r,g,b) 또는 None(투명).
"""
from PIL import Image
import numpy as np

class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), dtype=np.uint8)
    def px(self, x, y, c):
        if c is None or x < 0 or y < 0 or x >= self.w or y >= self.h: return
        self.a[y, x] = (*c, 255)
    def rect(self, x, y, w, h, c):
        if c is None: return
        x0, y0, x1, y1 = max(0, x), max(0, y), min(self.w, x + w), min(self.h, y + h)
        if x1 > x0 and y1 > y0: self.a[y0:y1, x0:x1] = (*c, 255)
    def outline(self, x, y, w, h, c, t=1):
        self.rect(x, y, w, t, c); self.rect(x, y + h - t, w, t, c); self.rect(x, y, t, h, c); self.rect(x + w - t, y, t, h, c)
    def rrect(self, x, y, w, h, c, r=2):
        """모서리 r 픽셀 깎은 사각형"""
        self.rect(x + r, y, w - 2 * r, h, c); self.rect(x, y + r, w, h - 2 * r, c)
        for i in range(1, r):   # 대각 모서리 채움
            self.rect(x + r - i, y + i, i, 1, c); self.rect(x + w - r, y + i, i, 1, c)
            self.rect(x + r - i, y + h - 1 - i, i, 1, c); self.rect(x + w - r, y + h - 1 - i, i, 1, c)
    def rrect_outlined(self, x, y, w, h, fill, line, r=2):
        self.rrect(x, y, w, h, line, r); self.rrect(x + 1, y + 1, w - 2, h - 2, fill, max(0, r - 1))
    def hline(self, x, y, w, c): self.rect(x, y, w, 1, c)
    def vline(self, x, y, h, c): self.rect(x, y, 1, h, c)
    def dither(self, x, y, w, h, c, step=2, phase=0):
        """체크무늬 디더 (그림자/질감)"""
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if (xx + yy + phase) % step == 0: self.px(xx, yy, c)
    def blit(self, other, x, y):
        for yy in range(other.h):
            for xx in range(other.w):
                if other.a[yy, xx, 3]: 
                    if 0 <= x + xx < self.w and 0 <= y + yy < self.h: self.a[y + yy, x + xx] = other.a[yy, xx]
    def flip(self):
        c = Canvas(self.w, self.h); c.a = self.a[:, ::-1].copy(); return c
    def save(self, path):
        Image.fromarray(self.a, 'RGBA').save(path)
    def image(self): return Image.fromarray(self.a, 'RGBA')

def hexc(s):
    s = s.lstrip('#'); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

def shade(c, k):
    """k<1 어둡게, k>1 밝게"""
    return tuple(max(0, min(255, int(v * k))) for v in c)
