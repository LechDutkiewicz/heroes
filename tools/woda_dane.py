#!/usr/bin/env python3
"""Dane dla shadera wody: maska z odległością od brzegu i tekstura zmarszczek.

Po co osobne dane, skoro woda jest już na planszy
-------------------------------------------------
Animacja wody polegała dotąd na czterech gotowych klatkach planszy, między
którymi scena przełączała się co pół sekundy. To są dwie klatki na sekundę —
oko widzi przeskoki, a nie ruch. Żeby woda płynęła naprawdę, musi być liczona
w czasie rysowania, klatka po klatce, a do tego shader potrzebuje wiedzieć
DWÓCH rzeczy, których z gotowego obrazka nie wyczyta:

  * gdzie jest woda (maska),
  * jak daleko stąd do brzegu (pole odległości).

Odległość od brzegu robi całą robotę wizualną: przy zerze kładzie się piana
i widać dno, dalej woda ciemnieje i staje się nieprzezroczysta. Bez niej piana
musiałaby być obrysem, a obrys nigdy nie wygląda jak fala dochodząca do brzegu.

Co powstaje
-----------
`public/mapa/woda-maska.png` — RGB w skali planszy:
  R  ile tu wody (0–255), z tą samą miękką, poszarpaną granicą co teren,
  G  odległość od brzegu w głąb wody, znormalizowana,
  B  wolna zmiana głębokości (szum), żeby tafla nie była jednolita.

`public/mapa/woda-zmarszczki.png` — bezszwowa tekstura falowania. Świadomie
generowana, a nie rysowana: musi się kafelkować BEZ SZWU, bo shader przesuwa ją
w nieskończoność, a modele graficzne bezszwowości nie utrzymują.

Nie ma tu własnego wejścia: maska musi być dokładnie tą, którą namalowała
plansza, więc oba pliki powstają razem z nią, w `python3 tools/render_mapa.py`.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from teren_malowanie import ZIARNO  # noqa: E402

KORZEN = Path(__file__).resolve().parent.parent
MAPA = KORZEN / 'public' / 'mapa'

#: Bok kafelka zmarszczek. 512 to kompromis: mniej widać powtórzenie, więcej
#: kosztuje pamięć karty przy teksturze, która i tak jest tylko szumem.
BOK_ZMARSZCZEK = 512

#: Jak głęboko sięga pas przybrzeżny, w polach. Dalej woda jest już „głęboka"
#: i piana jej nie dotyczy.
PAS_BRZEGU = 3.0


def szumBezszwowy(bok: int, komorek: int, ziarno: int) -> np.ndarray:
    """Gładki szum, który kafelkuje się bez szwu.

    Sztuczka jest w `np.roll`: losujemy siatkę `komorek × komorek`, powielamy ją
    cyklicznie i interpolujemy — dzięki temu prawa krawędź wynika z tej samej
    komórki co lewa i styk jest niewidoczny. Interpolacja jest wygładzona
    wielomianem 6t⁵−15t⁴+10t³ (ta sama, której używa szum Perlina), bo liniowa
    zostawia widoczne romby na granicach komórek.
    """
    rng = np.random.default_rng(ziarno)
    siatka = rng.random((komorek, komorek), dtype=np.float32)

    os = np.arange(bok, dtype=np.float32) * komorek / bok
    i0 = np.floor(os).astype(int) % komorek
    i1 = (i0 + 1) % komorek
    t = os - np.floor(os)
    t = t * t * t * (t * (t * 6 - 15) + 10)

    # Dwuliniowo, najpierw w poziomie, potem w pionie.
    a = siatka[:, i0] * (1 - t)[None, :] + siatka[:, i1] * t[None, :]
    return (a[i0, :] * (1 - t)[:, None] + a[i1, :] * t[:, None]).astype(np.float32)


def zmarszczki():
    """Trzy oktawy szumu w trzech kanałach — shader miesza je z różną prędkością.

    Trzy różne skale w jednym pliku, a nie trzy pliki: shader i tak próbkuje
    teksturę raz, a rozdzielenie oktaw na kanały pozwala mu je przesuwać
    niezależnie. To jest cały mechanizm, dzięki któremu fale nie powtarzają się
    w rytmie tekstury — dwie warstwy jadące z różną prędkością dają wzór
    o okresie równym ich najmniejszej wspólnej wielokrotności, czyli praktycznie
    nieskończony.
    """
    kanaly = [
        szumBezszwowy(BOK_ZMARSZCZEK, 8, ZIARNO + 1),
        szumBezszwowy(BOK_ZMARSZCZEK, 16, ZIARNO + 2),
        szumBezszwowy(BOK_ZMARSZCZEK, 32, ZIARNO + 3),
    ]
    tab = np.stack(kanaly, axis=-1)
    Image.fromarray((tab * 255).astype(np.uint8), 'RGB').save(MAPA / 'woda-zmarszczki.png')
    print(f'  woda-zmarszczki.png  {BOK_ZMARSZCZEK} × {BOK_ZMARSZCZEK}  (3 oktawy w kanałach)')


def maska(rysunek: list[str], kafel: int, maskaWody: Image.Image):
    """Maska wody z polem odległości od brzegu.

    Maskę bierzemy tę samą, którą teren malował na planszy — inaczej shader
    rysowałby wodę odrobinę gdzie indziej niż jest namalowana i na styku
    zostawałby rąbek.

    Odległość liczymy zgrubnie, przez powtarzane rozmycie: każde kolejne
    rozmycie „zjada" trochę wody od brzegu, więc suma tych ubytków rośnie wraz
    z odległością od lądu. Prawdziwa transformata odległości byłaby dokładniejsza,
    ale wymagałaby scipy, a różnicy w kilkupikselowym pasie piany nie widać.
    """
    wys, szer = len(rysunek), len(rysunek[0])
    W, H = szer * kafel, wys * kafel

    woda = np.asarray(maskaWody.convert('L'), dtype=np.float32) / 255.0

    # Pole odległości: kolejne rozmycia, sumowane. Promień rośnie, więc pierwsze
    # kroki opisują sam brzeg dokładnie, a dalsze tylko dokładają głębi.
    odleglosc = np.zeros_like(woda)
    biezaca = Image.fromarray((woda * 255).astype(np.uint8), 'L')
    krokow = 6
    for k in range(krokow):
        # Rozmycia się kumulują (σ rośnie jak pierwiastek z liczby kroków),
        # więc promień jednego kroku to ułamek docelowego pasa, nie cały pas.
        biezaca = biezaca.filter(ImageFilter.GaussianBlur(kafel * PAS_BRZEGU / krokow))
        odleglosc += np.asarray(biezaca, dtype=np.float32) / 255.0
    odleglosc = (odleglosc / krokow).clip(0, 1)
    # Tylko w wodzie; na lądzie odległość nie znaczy nic.
    odleglosc *= woda

    glebia = (szumBezszwowy(max(W, H), 12, ZIARNO + 7)[:H, :W] * 0.5 + 0.25) * woda

    tab = np.stack(
        [woda * 255, odleglosc * 255, glebia * 255], axis=-1
    ).astype(np.uint8)
    Image.fromarray(tab, 'RGB').save(MAPA / 'woda-maska.png')
    print(f'  woda-maska.png  {W} × {H}  (R woda, G odległość od brzegu, B głębia)')
