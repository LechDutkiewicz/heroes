#!/usr/bin/env python3
"""Renderuje bryły miasta z modeli 3D pakietu Kenneya do płaskich sprite'ów.

Po co to w ogóle powstało
-------------------------
Sześć rund ślepych porównań z Songs of Conquest dało sześć konkretnych poprawek,
ale za każdym razem wracał ten sam zarzut: nasze bryły to płaskie plamy koloru.
I był słuszny — budynki rysowałem wielokątami i elipsami, a modelunek dokładałem
przebiegiem po gotowym obrazku. Tak się nie da dojść do bryły, która ma okap,
wykusz i wnękę: gradient nałożony na płaski kształt zawsze będzie gradientem
nałożonym na płaski kształt.

Dlatego bryły biorą się teraz z PRAWDZIWEJ GEOMETRII. Pakiet „Fantasy Town Kit"
Kenneya (CC0, wolno kopiować i zmieniać, także w publicznym repozytorium) daje
167 modułów: ściany kamienne i drewniane, drzwi, okna, dachy, kominy, schody,
płoty. Budynek składa się z nich jak z klocków, a światło bierze się z normalnych
ścian, nie z domalowanego cieniowania.

Czemu własny rasteryzator, a nie Blender
----------------------------------------
Bo Blendera tu nie ma, a modele są proste: płaskie wielokąty, każdy w jednym
kolorze z małego atlasu palety. Do tego wystarczy z-bufor i iloczyn skalarny
normalnej ze światłem — sto linijek, bez zależności poza numpy. Przy okazji
zostaje zasada projektu: grafiki powstają skryptem i da się je odtworzyć.

Czemu paleta jest podmieniana, a nie tekstura
---------------------------------------------
Kolor każdej ściany to jeden piksel z atlasu 512 × 512. Przemalowanie atlasu
zmienia całe miasto naraz — stąd trzy frakcje kosztują trzy przemalowania jednej
tekstury, a nie trzy komplety modeli.

    python3 tools/render3d.py            # podgląd: ratusz w trzech paletach
"""

from pathlib import Path

import numpy as np
from PIL import Image

KORZEN = Path(__file__).resolve().parent.parent
PAKIET = KORZEN / 'tools' / 'reference' / 'kenney' / 'Models' / 'OBJ format'

#: Nadpróbkowanie. Renderujemy większe i zmniejszamy — brzegi wielokątów
#: bez tego są schodkowe, a schodki to dokładnie to, co usuwamy z całej gry.
NAD = 3

#: Kierunek światła. Ten sam, co na panoramie i w `rysuj_miasto.py`: prawa góra,
#: lekko od przodu. Jedna stała na wszystko, co stoi w mieście.
SWIATLO = np.array([0.55, 0.72, 0.42])
SWIATLO = SWIATLO / np.linalg.norm(SWIATLO)

#: Kamera. Lekki obrót w bok i spojrzenie z góry — tyle, żeby było widać ścianę
#: frontową, jedną boczną i połać dachu. Heroes 3 pokazuje miasto podobnie:
#: to nie jest rzut izometryczny, tylko widok „z okna piętro wyżej".
OBROT = np.deg2rad(28)
POCHYLENIE = np.deg2rad(20)


def wczytaj_obj(nazwa: str):
    """Wierzchołki, trójkąty i kolor każdego trójkąta.

    Kolor bierzemy z atlasu wewnatrz ciężkości współrzędnych UV ścianki.
    W tym pakiecie cała ścianka leży w jednym kwadraciku palety, więc jeden
    piksel opisuje ją bez straty — i dlatego nie potrzeba teksturowania.
    """
    plik = PAKIET / f'{nazwa}.obj'
    v, vt, trojkaty, uv_trojkatow = [], [], [], []
    for linia in plik.read_text().splitlines():
        if linia.startswith('v '):
            v.append([float(x) for x in linia.split()[1:4]])
        elif linia.startswith('vt '):
            vt.append([float(x) for x in linia.split()[1:3]])
        elif linia.startswith('f '):
            wpisy = linia.split()[1:]
            idx = []
            for w in wpisy:
                czesci = w.split('/')
                idx.append((int(czesci[0]) - 1, int(czesci[1]) - 1 if len(czesci) > 1 and czesci[1] else 0))
            # Wachlarz: ściany w tym pakiecie są wypukłe, więc to wystarcza.
            for i in range(1, len(idx) - 1):
                trojkaty.append([idx[0][0], idx[i][0], idx[i + 1][0]])
                uv_trojkatow.append([idx[0][1], idx[i][1], idx[i + 1][1]])
    return np.array(v, dtype=np.float32), np.array(vt, dtype=np.float32), np.array(trojkaty), np.array(uv_trojkatow)


def kolory_trojkatow(vt, uv_trojkatow, atlas: np.ndarray):
    if len(vt) == 0:
        return np.tile(np.array([200, 200, 200], np.float32), (len(uv_trojkatow), 1))
    srodki = vt[uv_trojkatow].mean(axis=1)
    h, w = atlas.shape[:2]
    x = np.clip((srodki[:, 0] * w).astype(int), 0, w - 1)
    y = np.clip(((1 - srodki[:, 1]) * h).astype(int), 0, h - 1)
    return atlas[y, x, :3].astype(np.float32)


class Scena:
    """Zbiór modułów ustawionych w przestrzeni — czyli jeden budynek."""

    def __init__(self, atlas: np.ndarray):
        self.atlas = atlas
        self.v = []
        self.t = []
        self.k = []
        self._pamiec = {}

    def dodaj(self, nazwa: str, x=0.0, y=0.0, z=0.0, obrot=0, skala=1.0):
        """Stawia moduł w punkcie siatki. `obrot` w stopniach wokół pionu."""
        if nazwa not in self._pamiec:
            self._pamiec[nazwa] = wczytaj_obj(nazwa)
        v, vt, tr, uvt = self._pamiec[nazwa]
        kat = np.deg2rad(obrot)
        c, s = np.cos(kat), np.sin(kat)
        obr = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]], dtype=np.float32)
        w = (v * skala) @ obr.T + np.array([x, y, z], dtype=np.float32)
        przesuniecie = sum(len(a) for a in self.v)
        self.v.append(w)
        self.t.append(tr + przesuniecie)
        self.k.append(kolory_trojkatow(vt, uvt, self.atlas))
        return self

    def geometria(self):
        return np.vstack(self.v), np.vstack(self.t), np.vstack(self.k)


def renderuj(scena: Scena, szer=240, wys=240, margines=0.08) -> Image.Image:
    """Rzutuje scenę na obrazek z kanałem alfa.

    Rzut jest równoległy, nie perspektywiczny. To nie jest uproszczenie na
    skróty: przy perspektywie ten sam budynek postawiony z boku ekranu byłby
    widziany pod innym kątem niż ten na środku, a panorama miasta składa się
    z brył rysowanych osobno i wklejanych w różne miejsca. Rzut równoległy
    trzyma je wszystkie w jednym, spójnym ujęciu.
    """
    v, t, k = scena.geometria()
    W, H = szer * NAD, wys * NAD

    co, so = np.cos(OBROT), np.sin(OBROT)
    cp, sp = np.cos(POCHYLENIE), np.sin(POCHYLENIE)
    obr_y = np.array([[co, 0, so], [0, 1, 0], [-so, 0, co]], dtype=np.float32)
    obr_x = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]], dtype=np.float32)
    kamera = obr_x @ obr_y
    p = v @ kamera.T

    # Skala tak, żeby bryła wypełniła kadr z zapasem na cień własny.
    minx, miny = p[:, 0].min(), p[:, 1].min()
    maxx, maxy = p[:, 0].max(), p[:, 1].max()
    rozpietosc = max(maxx - minx, maxy - miny) * (1 + margines)
    skala = min(W, H) / rozpietosc
    sx = (p[:, 0] - (minx + maxx) / 2) * skala + W / 2
    # Ekranowe „y" rośnie w dół, a bryła ma stać na dolnej krawędzi kadru.
    sy = H - (p[:, 1] - miny) * skala - H * 0.02
    sz = p[:, 2]

    kolor = np.zeros((H, W, 3), np.float32)
    alfa = np.zeros((H, W), np.float32)
    glebia = np.full((H, W), -1e9, np.float32)

    # Normalne liczymy w przestrzeni MODELU, nie kamery: światło ma padać
    # na miasto, a nie świecić zawsze prosto w obiektyw.
    a, b, c_ = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
    normalne = np.cross(b - a, c_ - a)
    dlugosci = np.linalg.norm(normalne, axis=1, keepdims=True)
    normalne = normalne / np.maximum(dlugosci, 1e-6)
    lambert = np.clip(normalne @ SWIATLO, 0, 1)
    # Trzy składniki: rozproszone (kierunek), niebo (od góry) i odbite od
    # ziemi (od dołu, ciepłe). Bez trzeciego ściany w cieniu są martwo czarne.
    niebo = np.clip(normalne[:, 1], 0, 1)
    odbite = np.clip(-normalne[:, 1], 0, 1)
    jasnosc = (0.42 + 0.72 * lambert + 0.14 * niebo + 0.08 * odbite)[:, None]
    barwa_swiatla = np.array([1.03, 1.0, 0.94], np.float32)
    barwa_cienia = np.array([0.86, 0.9, 1.06], np.float32)
    mieszanka = lambert[:, None]
    kolory = k * jasnosc * (barwa_cienia + (barwa_swiatla - barwa_cienia) * mieszanka)

    # Malarz z z-buforem. Trójkątów jest kilka tysięcy, więc pętla w Pythonie
    # z wektorowym wnętrzem jest wystarczająco szybka i czytelna.
    for i in range(len(t)):
        i0, i1, i2 = t[i]
        x0, x1, x2 = sx[i0], sx[i1], sx[i2]
        y0, y1, y2 = sy[i0], sy[i1], sy[i2]
        pole = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(pole) < 1e-9:
            continue
        xmin = max(int(np.floor(min(x0, x1, x2))), 0)
        xmax = min(int(np.ceil(max(x0, x1, x2))) + 1, W)
        ymin = max(int(np.floor(min(y0, y1, y2))), 0)
        ymax = min(int(np.ceil(max(y0, y1, y2))) + 1, H)
        if xmin >= xmax or ymin >= ymax:
            continue
        yy, xx = np.mgrid[ymin:ymax, xmin:xmax]
        px, py = xx + 0.5, yy + 0.5
        w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / pole
        w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / pole
        w2 = 1 - w0 - w1
        wewnatrz = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not wewnatrz.any():
            continue
        z = w0 * sz[i0] + w1 * sz[i1] + w2 * sz[i2]
        maska = wewnatrz & (z > glebia[ymin:ymax, xmin:xmax])
        if not maska.any():
            continue
        wycinek_g = glebia[ymin:ymax, xmin:xmax]
        wycinek_g[maska] = z[maska]
        glebia[ymin:ymax, xmin:xmax] = wycinek_g
        wycinek_k = kolor[ymin:ymax, xmin:xmax]
        wycinek_k[maska] = kolory[i]
        kolor[ymin:ymax, xmin:xmax] = wycinek_k
        wycinek_a = alfa[ymin:ymax, xmin:xmax]
        wycinek_a[maska] = 1
        alfa[ymin:ymax, xmin:xmax] = wycinek_a

    im = Image.fromarray(
        np.dstack([kolor.clip(0, 255), alfa * 255]).astype(np.uint8), 'RGBA'
    )
    return im.resize((szer, wys), Image.LANCZOS)


def atlas_palety(przemalowanie=None) -> np.ndarray:
    """Atlas kolorów pakietu, opcjonalnie przemalowany na barwy frakcji."""
    a = np.asarray(Image.open(PAKIET / 'Textures' / 'colormap.png').convert('RGBA')).astype(np.float32)
    if przemalowanie is None:
        return a
    return przemalowanie(a)


# ---------------------------------------------------------------------------
# BUDYNKI
# ---------------------------------------------------------------------------


def ratusz(atlas, stopien=1) -> Scena:
    """Ratusz: kamienny parter, drewniane piętro, dach dwuspadowy, wieża.

    Budynek stawiamy na siatce 1 × 1: ściany siedzą na krawędziach pola,
    obrócone tak, żeby patrzeć na zewnątrz. Kolejność jest ta sama, co przy
    prawdziwym domu — ściany, potem strop, potem dach.
    """
    s = Scena(atlas)
    for (dx, dz) in ((0, 0), (1, 0)):
        # front (ściana z drzwiami tylko w lewym polu), tył, bok
        s.dodaj('wall-door' if (dx, dz) == (0, 0) else 'wall-window-round', dx, 0, dz, obrot=90)
        s.dodaj('wall', dx, 0, dz, obrot=270)
        if dx == 0:
            s.dodaj('wall-window-shutters', dx, 0, dz, obrot=180)
        else:
            s.dodaj('wall-window-shutters', dx, 0, dz, obrot=0)
    if stopien >= 1:
        for (dx, dz) in ((0, 0), (1, 0)):
            s.dodaj('wall-wood-window-shutters', dx, 1, dz, obrot=90)
            s.dodaj('wall-wood', dx, 1, dz, obrot=270)
            s.dodaj('wall-wood', dx, 1, dz, obrot=0 if dx else 180)
    gora = 2 if stopien >= 1 else 1
    s.dodaj('roof-gable-end', 0, gora, 0, obrot=90)
    s.dodaj('roof-gable-end', 1, gora, 0, obrot=270)
    s.dodaj('chimney', 1, gora, 0, obrot=0)
    if stopien >= 2:
        # Wieża z boku — pierwszy znak, że miasto urosło.
        for y in range(3):
            s.dodaj('wall-block' if y < 2 else 'wall-window-round', 2, y, 0, obrot=90)
            s.dodaj('wall-block', 2, y, 0, obrot=270)
            s.dodaj('wall-block', 2, y, 0, obrot=0)
            s.dodaj('wall-block', 2, y, 0, obrot=180)
        s.dodaj('roof-high-point', 2, 3, 0)
    return s


if __name__ == '__main__':
    atlas = atlas_palety()
    im = renderuj(ratusz(atlas, stopien=1), 320, 320)
    im.save('/tmp/ratusz3d.png')
    print('zapisano /tmp/ratusz3d.png', im.size)
