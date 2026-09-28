# Wtapia podstawę budowli w teren: trawiasty „talerz" pod budynkami blednie ku krawędzi.
# Użycie: python3 tools/wtop_podstawe.py wejscie.png wyjscie.png [szerokość zaniku w px, domyślnie 34]
# Uruchamiać na obrazku z wsadu (tools/wsad_wczytaj.py), nie drugi raz na wyniku.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, dst = sys.argv[1], sys.argv[2]
szer = float(sys.argv[3]) if len(sys.argv) > 3 else 34
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32)
rgb, a = im[..., :3] / 255, im[..., 3] / 255
mx, mn = rgb.max(-1), rgb.min(-1)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
# „grunt": trawa (zielony/żółtozielony) i jasne, mało nasycone kamienie ścieżki
trawa = (g >= r * 0.9) & (g > b * 1.15) & (mx > 0.25)
kamien = (sat < 0.35) & (mx > 0.45) & (np.abs(r - g) < 0.12)
grunt = (trawa | kamien) & (a > 0.5)
H = a.shape[0]
yy = np.arange(H)[:, None] / H
dol = np.clip((yy - 0.45) / 0.2, 0, 1)            # tylko dolna część obrazka
d = ndimage.distance_transform_edt(a > 0.5)       # odległość od przezroczystości
zanik = np.clip(d / szer, 0, 1) ** 1.4
nowe = np.where(grunt, a * (1 - dol * (1 - zanik)), a)
# zmiękcz przejście między gruntem a resztą
nowe = np.minimum(a, ndimage.gaussian_filter(nowe, 1.2) * (grunt | (dol == 0)) + nowe * ~(grunt | (dol == 0)))
# jasna trawa talerza ciemnieje ku barwie trawy z mapy
tr = (trawa & (a > 0.5)).astype(np.float32) * dol
tr = ndimage.gaussian_filter(tr, 2)[..., None]
cel = rgb * np.array([0.72, 0.86, 0.55])
rgb2 = rgb * (1 - tr * 0.8) + cel * tr * 0.8
out = im.copy(); out[..., :3] = rgb2 * 255
out[..., 3] = np.clip(nowe, 0, 1) * 255
Image.fromarray(out.astype(np.uint8)).save(dst)
