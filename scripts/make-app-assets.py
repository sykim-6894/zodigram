"""앱 아이콘·스플래시 원본(assets/)을 만든다.  python scripts/make-app-assets.py
이후 `npm run app:assets` 가 iOS·Android 크기별 파일을 만들어 준다.
필요: Pillow, Windows 글꼴 Noto Serif KR(NotoSerifKR-VF.ttf)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / 'assets'
OUT.mkdir(exist_ok=True)
SERIF = 'C:/Windows/Fonts/NotoSerifKR-VF.ttf'
LIGHT = dict(bg='#F4F0E8', ink='#1E1C19', star='#A33B27')
DARK = dict(bg='#191816', ink='#ECE6DA', star='#D9785F')

# 로고(512 기준 좌표): 위의 별 하나와 아래의 괘 세 줄. 가로 136~376, 세로 92~406
STAR = [(256, 92), (270, 150), (328, 164), (270, 178), (256, 236), (242, 178), (184, 164), (242, 150)]
BARS = [(136, 300, 376, 322), (136, 342, 240, 364), (272, 342, 376, 364), (136, 384, 376, 406)]
X0, Y0, W0, H0 = 136, 92, 240, 314


def mark_layer(width_px, ink, star):
    """로고만 투명 배경에 그려 돌려준다(4배로 그린 뒤 줄여 부드럽게)."""
    s = width_px / W0
    w, h = round(W0 * s), round(H0 * s)
    ss = 4
    img = Image.new('RGBA', (w * ss, h * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for x0, y0, x1, y1 in BARS:
        d.rectangle([(x0 - X0) * s * ss, (y0 - Y0) * s * ss, (x1 - X0) * s * ss - 1, (y1 - Y0) * s * ss - 1], fill=ink)
    d.polygon([((x - X0) * s * ss, (y - Y0) * s * ss) for x, y in STAR], fill=star)
    return img.resize((w, h), Image.LANCZOS)


def paste_center(canvas, layer, cx, cy):
    canvas.alpha_composite(layer, (round(cx - layer.width / 2), round(cy - layer.height / 2)))


def icon_only(size, c):
    img = Image.new('RGBA', (size, size), c['bg'])
    paste_center(img, mark_layer(size * 0.47, c['ink'], c['star']), size / 2, size / 2)
    return img


def icon_foreground(size, c):
    """안드로이드 적응형 아이콘: 중앙 66% 안전 영역에 들어오도록 작게"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    paste_center(img, mark_layer(size * 0.34, c['ink'], c['star']), size / 2, size / 2)
    return img


def splash(size, c):
    img = Image.new('RGBA', (size, size), c['bg'])
    layer = mark_layer(size * 0.15, c['ink'], c['star'])
    paste_center(img, layer, size / 2, size * 0.44)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(SERIF, round(size * 0.05))
    try:
        f.set_variation_by_axes([600])
    except Exception:
        pass
    text = 'Zodigram'
    w = d.textlength(text, font=f)
    d.text(((size - w) / 2, size * 0.44 + layer.height / 2 + size * 0.035), text, font=f, fill=c['ink'])
    return img


if __name__ == '__main__':
    icon_only(1024, LIGHT).convert('RGB').save(OUT / 'icon-only.png', optimize=True)
    icon_foreground(1024, LIGHT).save(OUT / 'icon-foreground.png', optimize=True)
    Image.new('RGBA', (1024, 1024), LIGHT['bg']).convert('RGB').save(OUT / 'icon-background.png', optimize=True)
    splash(2732, LIGHT).convert('RGB').save(OUT / 'splash.png', optimize=True)
    splash(2732, DARK).convert('RGB').save(OUT / 'splash-dark.png', optimize=True)
    print('done')
