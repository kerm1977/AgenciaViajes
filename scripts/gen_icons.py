# gen_icons.py — genera los PNG del launcher a partir del diseno de iconos/icon.svg
# (sin dependencias externas: dibuja la brujula con PIL)
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
VERDE, VERDE2 = (22, 163, 74), (34, 197, 94)
ROJO, OSCURO, BLANCO = (220, 38, 38), (20, 83, 45), (248, 250, 252)
GRIS = (15, 23, 42)

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def dial(d, S, cx, cy, r):
    """circulo blanco con aguja roja/verde"""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BLANCO)
    w = int(r * .24)
    d.polygon([(cx, cy - r * .78), (cx + w, cy), (cx, cy + r * .18), (cx - w, cy)],
              fill=ROJO)
    d.polygon([(cx, cy + r * .78), (cx + w, cy), (cx, cy - r * .18), (cx - w, cy)],
              fill=OSCURO)
    d.ellipse([cx - r * .1, cy - r * .1, cx + r * .1, cy + r * .1], fill=GRIS)

def cuadrado(S):
    """launcher legacy: cuadrado redondeado con gradiente"""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1],
                                           radius=S * .22, fill=255)
    grad = Image.new('RGBA', (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        gd.line([(0, y), (S, y)], fill=lerp(VERDE2, VERDE, y / S))
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    dial(d, S, S / 2, S / 2, S * .28)
    return img

def redondo(S):
    """launcher legacy round: circulo con gradiente"""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, S - 1, S - 1], fill=255)
    grad = Image.new('RGBA', (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        gd.line([(0, y), (S, y)], fill=lerp(VERDE2, VERDE, y / S))
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    dial(d, S, S / 2, S / 2, S * .30)
    return img

def frontal(S):
    """foreground adaptive (zona segura central ~66%)"""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    dial(d, S, S / 2, S / 2, S * .26)
    return img

DPIS = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FORE = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

if __name__ == '__main__':
    for dpi, s in DPIS.items():
        d = os.path.join(RES, 'mipmap-' + dpi)
        os.makedirs(d, exist_ok=True)
        cuadrado(s).save(os.path.join(d, 'ic_launcher.png'))
        redondo(s).save(os.path.join(d, 'ic_launcher_round.png'))
        frontal(FORE[dpi]).save(os.path.join(d, 'ic_launcher_foreground.png'))
        print(dpi, s)
    print('iconos generados')
