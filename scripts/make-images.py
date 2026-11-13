"""앱 아이콘(PNG)과 링크 미리보기 이미지(og.png)를 만든다.  python scripts/make-images.py
필요: Pillow, Windows 글꼴 Noto Serif KR(NotoSerifKR-VF.ttf)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / 'public'
PAPER, INK, INK3, EAST, RULE = '#F4F0E8', '#1E1C19', '#8C8577', '#A33B27', '#D6CDBD'
SERIF = 'C:/Windows/Fonts/NotoSerifKR-VF.ttf'
SS = 4  # 슈퍼샘플링 배율

STAR = [(256, 92), (270, 150), (328, 164), (270, 178), (256, 236), (242, 178), (184, 164), (242, 150)]
BARS = [(136, 300, 376, 322), (136, 342, 240, 364), (272, 342, 376, 364), (136, 384, 376, 406)]


def mark(draw, scale, ox=0, oy=0):
    t = lambda x, y: (ox + x * scale, oy + y * scale)
    for x0, y0, x1, y1 in BARS:
        draw.rectangle([*t(x0, y0), *t(x1, y1)], fill=INK)
    draw.polygon([t(x, y) for x, y in STAR], fill=EAST)


def icon(size, maskable=False):
    big = size * SS
    img = Image.new('RGB', (big, big), PAPER)
    d = ImageDraw.Draw(img)
    if maskable:  # 안전 영역(지름 80%) 안에 들어오도록 축소
        s = big / 512 * 0.72
        off = (big - 512 * s) / 2
        mark(d, s, off, off + big * 0.02)
    else:
        mark(d, big / 512)
    return img.resize((size, size), Image.LANCZOS)


def serif(px, weight=600):
    f = ImageFont.truetype(SERIF, px)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def og():
    w, h = 1200 * 2, 630 * 2
    img = Image.new('RGB', (w, h), PAPER)
    d = ImageDraw.Draw(img)
    pad = 150
    d.rectangle([pad, 170, w - pad, 176], fill=INK)
    d.text((pad, 250), 'Zodigram', font=serif(230), fill=INK)
    d.text((pad + 8, 560), '별과 괘', font=serif(92, 400), fill=INK3)
    d.text((pad + 8, 760), '동양의 괘, 서양의 별로 읽는 오늘', font=serif(64, 400), fill=INK)
    d.text((pad + 8, 870), '사주 · 띠 · 주역 · 길일 달력  /  별자리 · 타로 · 수비학', font=serif(44, 400), fill=INK3)
    d.rectangle([pad, h - 176, w - pad, h - 170], fill=INK)
    s = 2.4
    mark(d, s, w - pad - 40 - 376 * s, 250 - 92 * s)
    return img.resize((1200, 630), Image.LANCZOS)


if __name__ == '__main__':
    icons = ROOT / 'icons'
    icon(192).save(icons / 'icon-192.png', optimize=True)
    icon(512).save(icons / 'icon-512.png', optimize=True)
    icon(512, maskable=True).save(icons / 'icon-maskable-512.png', optimize=True)
    icon(180).save(icons / 'apple-touch-icon.png', optimize=True)
    og().save(ROOT / 'og.png', optimize=True)
    print('done')
