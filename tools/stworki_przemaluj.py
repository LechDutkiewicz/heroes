#!/usr/bin/env python3
"""Przemalowuje 18 stworków frakcji w stylu mapy przygody.

Po co
-----
Stworki (`public/sprites/<id>.png`) to płaskie rysunki w stylu oficjalnych
ilustracji: jednolite plamy barw, cienki kontur, zero światła. Mapa przygody
jest dziś malowana ręcznie, jak w Heroes 3 / HotA — ciepłe światło z lewej-góry,
miękka bryła, ciemny ciepły kontur. Stworek postawiony między takim zamkiem
a takim drzewem wyglądał jak naklejka z innej gry.

Skrypt bierze oryginał stworka (`assets/pokemon/<id>.png`, 256 px na białym
tle) i arkusz stylu złożony z obiektów NASZEJ mapy (zamek, drzewo, kopalnia,
sad, skrzynia — z `tools/wsad/`) i prosi `images/edits` OpenAI, żeby
przemalował pierwszy obrazek stylem drugiego, zachowując stworka: sylwetkę,
barwy, anatomię.

Trzy kroki, każdy osobno
------------------------
    python3 tools/stworki_przemaluj.py --lista              # stan: co jest, co wybrane
    python3 tools/stworki_przemaluj.py --generuj 00020 00030  # nowe wersje (kosztuje)
    python3 tools/stworki_przemaluj.py --generuj --brakujace  # tylko te bez żadnej wersji
    python3 tools/stworki_przemaluj.py --czysc 00246 00074   # zdejmij namalowany grunt (kosztuje)
    python3 tools/stworki_przemaluj.py --kadruj              # wersje → gra (darmowe)
    python3 tools/stworki_przemaluj.py --arkusz out.png      # podgląd wszystkich wybranych

Surowe wyjścia API leżą w `tools/wsad/stworki/<id>-<n>.png` i nigdy nie są
nadpisywane — kolejne generowanie dopisuje następny numer. Kadrowanie czyta
je z dysku, więc poprawka kadru nic nie kosztuje. Która wersja idzie do gry,
mówi `WYBOR` niżej (brak wpisu = najnowsza); `ODBIJ` odwraca w poziomie te,
które model namalował przodem w lewo.

Kadr
----
Mistrz: `assets/stworki/<id>.png`, 256 × 256. Sylwetka wpisana w kwadrat
248 px (margines 4 px) z zachowaniem proporcji, wyśrodkowana w poziomie,
STOPY NA LINII y = 252 (dolny margines 4 px) — każdy stworek stoi na tej
samej linii, przodem w prawo, bez namalowanego gruntu (cień rysuje gra).
Margines 4/256 to ten sam ułamek co w starych plikach (sylwetka w 124 px
ze 128), a sceny skalują stworka po wysokości PLIKU (slot armii, karta
w mieście, bitwa) — przy innym ułamku każdy stworek w grze zmieniłby
rozmiar. Różnica względem starych plików: szerokie sylwetki (Cynder,
Bazalt) stały wyśrodkowane w pionie, teraz stoją na linii stóp jak reszta. Do gry idzie `public/sprites/<id>.png`
w `--bok` (domyślnie 128) — ten sam kadr zmniejszony Lanczosem. 128 px, a nie
256, bo nigdzie w grze stworek nie jest większy niż 72 px (karta w mieście),
a Phaser zmniejsza bez mipmap: z 256 px do 24 px w slocie armii próbkowałby co
dziesiąty piksel i sylwetka by się szarpała. Wszystkie sceny skalują stworka
względem wymiarów pliku albo jego widocznej sylwetki, więc zmiana kadru nie
zmienia ich rozmiaru na ekranie.

Stare, płaskie pliki (128 px, tak jak były w `public/sprites/`) zostają
w `assets/sprites-stare/` — kopiowane raz, przy pierwszym kadrowaniu.

Koszty
------
Każde wywołanie trafia do `tools/wsad/koszty-openai.jsonl` (ten sam dziennik
i ten sam cennik co `generuj_grafiki.py`). Skrypt nie wyśle zapytania, które
mogłoby przebić `OPENAI_LIMIT_USD` (domyślnie 20).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

NARZEDZIA = Path(__file__).resolve().parent
KORZEN = NARZEDZIA.parent
sys.path.insert(0, str(NARZEDZIA))
# Dziennik i cennik są jedne dla całego projektu — bierzemy je z generatora,
# żeby suma wydatków liczyła się w jednym miejscu.
from generuj_grafiki import LIMIT_USD, wydaneDotad, zapiszKoszt  # noqa: E402

ZRODLA = KORZEN / 'assets' / 'pokemon'
WSAD = NARZEDZIA / 'wsad' / 'stworki'
MISTRZE = KORZEN / 'assets' / 'stworki'
STARE = KORZEN / 'assets' / 'sprites-stare'
GRA = KORZEN / 'public' / 'sprites'
ARKUSZ_STYLU = WSAD / '_styl.png'

MODEL = os.environ.get('STWORKI_MODEL', 'gpt-image-1.5')
JAKOSC = os.environ.get('STWORKI_JAKOSC', 'medium')
ROZMIAR = '1024x1024'
#: Najdroższe zapytanie, jakie ten skrypt wysyła (medium, dwa obrazki na
#: wejściu) — z zapasem. Limit sprawdzamy PRZED wysłaniem.
NAJDROZSZE = 0.10

#: Mistrz: bok kwadratu i marginesy. Stopy zawsze na `BOK_MISTRZA - MARGINES`.
BOK_MISTRZA = 256
MARGINES = 4

#: Stworki frakcji: id → (nazwa w grze, opis dla modelu). Opis mówi, CO ma
#: zostać z oryginału — model bez niego „poprawiał" anatomię (dokładał łapy,
#: zmieniał barwy), bo oryginały są małe i płaskie.
STWORKI: dict[str, tuple[str, str]] = {
    # Bór Szmaragdowy
    '00193': ('Pyroko', 'a plump, round, egg-shaped fire creature with a red-orange body, a big yellow-orange flame-shaped patch on its back and side, tiny stubby feet and a small cute face'),
    '00020': ('Flamir', 'a slender bird-like creature with a cream body and a red stripe down its chest, a crest of long red feathers on its head, two cream wings with black stripes and red tips, thin dark legs'),
    '00218': ('Aquino', 'a pale icy-blue rounded blob creature made of smooth bulbous water-droplet shapes, two small black oval eyes, round stubby arms and feet'),
    '00030': ('Torrenar', 'a sturdy pale blue-grey armoured beast with angular plates like a pangolin or rhino, black stripes on its head, a red eye, dark slate spikes along its back, standing on four legs'),
    '00096': ('Verdiko', 'a small cute light-green seedling creature with a round body, a single leaf sprout growing from its head, small arms, a happy open mouth and a little leafy tail'),
    '00227': ('Silvena', 'a slender graceful light-green plant humanoid standing upright, with a crown of pale leaves tipped with pink, long leaf-like cape behind, thin arms and legs'),
    # Grota Księżycowa
    '00246': ('Glacyn', 'a slender light-blue lizard creature standing upright on its hind legs, with a long neck, small head with a dark mark behind the eye, short arms and a tail ending in a fish-like fin'),
    '00002': ('Sporex', 'a flower creature with a round green body, big pink cheek spots and a wide toothy grin, a crown of long purple petal-tentacles on its head and a purple curling root tail, pink hands'),
    '00263': ('Cindro', 'a small monkey-like fire creature with a cream face and belly, a rust-brown hood with pointed ears, red-orange arms and legs with white claws, a curled tail'),
    '00250': ('Sporina', 'a pale translucent green leaf-shaped seed-pod creature standing upright, with red eyes, a dotted leaf edge, thin vein lines and a small glowing white orb floating above its head'),
    '00220': ('Aquator', 'a stocky blue four-legged creature covered in sharp icy-blue crystal spikes, with big round white eyes, a spiky head with pointed ears'),
    '00196': ('Vulkaron', 'a heavy round black creature with a golden spiked armour collar around its body, a big red open mouth in the middle of the body, strong black arms raised to the sides, crimson ear tufts'),
    # Zbocze Popielne
    '00074': ('Bazalt', 'a big crimson-red salamander beast with a cream belly and jaw, a shaggy dark-red spiky mane, a curled antenna on its head, a second small face at the tip of its tail, walking on four stubby legs'),
    '00058': ('Ashko', 'a grey ash creature with a big puffy cloud-like grey head wearing a white arrow-shaped mask, a slim grey body and thin legs with small hooves, standing on four legs'),
    '00095': ('Obsydian', 'a purple obsidian golem shaped like a round vase or bottle, with a tall white stone column rising from its top, small arms folded at its body, and pale lavender round feet'),
    '00023': ('Cynder', 'a pink-red lizard creature with a grinning face and small horns, a dark teal-blue cape-like wing flap along its back, crouching on short legs with a long tail'),
    '00077': ('Lawina', 'a golden-olive insect-like creature with a blue body in the middle, six long thin jointed limbs with clawed hands, two thin antennas and a small head'),
    '00041': ('Sadzin', 'a round orange-red creature with a yellow chick-like head, a red crest and beak, big blue eyes, orange arms and yellow-orange feathered feet'),
}

#: Która surowa wersja idzie do gry (numer z `<id>-<n>.png`). Brak wpisu —
#: najnowsza. Wpisy dopisuje człowiek po obejrzeniu wersji.
WYBOR: dict[str, int] = {
    # Runda 4 (matowo, mniej „chibi"): 00263-4 i 00041-4 wyszły brązowe —
    # zostają wersje pod mapę z rundy 3.
    '00263': 3, '00041': 3,
    # Runda 5 (sędzią nasze obiekty): matowy 00002-6 wyszedł szarofioletowo-
    # oliwkowym mułem obok nasyconej skrzyni i wieży — wraca wersja pod mapę.
    '00002': 4,
}

#: Surowe wersje namalowane przodem w lewo — odbijane w poziomie przy
#: kadrowaniu (klucz: `<id>-<n>`). Taniej niż generować jeszcze raz.
ODBIJ: set[str] = {
    '00020-3', '00218-3', '00030-3', '00096-2', '00220-2', '00074-2', '00023-2',
    # Runda 3 (pod mapę): mimo mistrza przodem w prawo model odwrócił tych trzech.
    '00020-4', '00218-4', '00193-3',
}

#: Barwy z innej surowej wersji (klucz → wzór). Sprzątanie gruntu
#: (`--czysc`) potrafi przesunąć barwę: Torrenar z niebiesko-szarego pancerza
#: wyszedł kremowo-biały. Średnią i rozrzut barwy (YCbCr) bierzemy wtedy
#: z wersji sprzed sprzątania, z górnych 72% sylwetki — dół to namalowany
#: grunt, który przekłamałby statystykę.
BARWY_Z: dict[str, str] = {
    '00030-3': '00030-1',
}

PROMPT = (
    'Repaint the creature from the FIRST image as a creature sprite for a '
    'hand-painted fantasy strategy game adventure map, in exactly the rendering '
    'style of the objects in the SECOND image (castle, oak tree, mine, orchard, '
    'chest from the same game): stylised hand-painted game art, warm sunlight '
    'from the upper left, the same soft painterly 3D volume as the castle and '
    'the tree: every form rounded by light and shade, bright highlights on the '
    'upper-left surfaces, deeper warm shadow on the lower-right and the '
    'underside, soft occlusion where parts meet; a crisp dark warm-brown '
    'outline around the silhouette, rich natural colours, subtle painted '
    'texture (fur, scales, leaves), chunky readable shapes that stay clear when '
    'small. Not flat cel shading, not a sticker. Keep the creature\'s identity exactly: {opis}. Same silhouette, '
    'same colour scheme and markings, same number of limbs, same body '
    'proportions — only the rendering changes. Full body, whole creature '
    'visible, standing on the ground in a three-quarter view, body and face '
    'turned toward the RIGHT side of the image. Only the creature itself, cut '
    'out on a fully transparent background with NOTHING under its feet: no '
    'ground patch, no dirt, no sand, no grass tuft, no base, no pedestal, no '
    'cast shadow, no glow, no aura, no frame, no text.'
)

#: Trzecie przejście — przemalowanie MISTRZA pod obiekty naszej mapy.
#: Runda 1 i 2 wzorca „stwory na mapie" przegrały 0/3: krytycy widzieli
#: „maskotkę z kreskówki wklejoną na mapę" — czyste, gładkie renderowanie,
#: cukierkowy fiolet i błękit, za mały zakres jasności (bladymiętowy
#: Glacyn obok chaty i wierzby). Obróbka w grze tego nie naprawi, więc
#: malujemy od nowa: wejściem jest gotowy mistrz (tożsamość, poza, przodem
#: w prawo), a wzorem stylu arkusz obiektów NASZEJ mapy w ich własnej
#: rozdzielczości (`ARKUSZ_MAPY`: chata, wierzba, wieża, wóz, drzewo,
#: kopalnie, skrzynia, sad) — ten sam pędzel, ten sam brzeg. Barwy: „stonuj,
#: ale zostaw odcień" — prośba o „ziemistą paletę" zrobiła z fioletowej
#: korony Sporexa rdzawą.
PROMPT_MAPA = (
    'Repaint the creature from the FIRST image as if it were painted by the '
    'same illustrator who painted the adventure-map objects in the SECOND '
    'image (hut, willow, watchtower, wagon, oak, mines, chest, orchard). '
    'Match their rendering exactly: storybook painterly brushwork with '
    'visible textured strokes, a full value range — deep dark core shadows '
    'on the lower-right and underside, bright warm highlights from the upper '
    'left — and the same edge treatment: a dark edge in a deeper shade of '
    'the local colour, not a black cartoon line. Natural, slightly muted '
    'palette: keep the HUE of every colour zone of the creature (purple '
    'stays purple, blue stays blue, pink stays pink) and only lower its '
    'saturation a little and deepen its shadows — dusky violet instead of '
    'candy magenta, slate blue instead of pastel cyan. Less of a cute '
    'mascot, more a wild creature that lives in this world: calmer, '
    'natural expression, but the same character. Keep its identity exactly: '
    '{opis}. Same silhouette, same pose, same colour zones and markings, '
    'same anatomy and number of limbs. Full body, three-quarter view facing '
    'the RIGHT side of the image. Only the creature, cut out on a fully '
    'transparent background with nothing under its feet. Do NOT copy the '
    'grassy or rocky bases the objects in the second image stand on: the '
    'creature has no base at all — no ground patch, no dirt, no grass, no '
    'pebbles, no shadow, no glow, no frame, no text. Its feet are the '
    'lowest painted pixels.'
)
ARKUSZ_MAPY = WSAD / '_styl-mapa.png'

#: Czwarte przejście — tylko dla najbardziej „chibi" i błyszczących (runda 3
#: wzorca: „glossy mobile-game sticker", wielkie głowy, lśniące bliki,
#: jaskrawe obwódki światła). Wejście: bieżący mistrz (już pędzlem mapy).
#: Pierwsza wersja promptu („matowo jak zwietrzałe drewno, kamień i mech")
#: zrobiła z Cyndera brązowego ankylozaura, a ze Sporexa szary grzyb — stąd
#: wprost: barwy zostają, łącznie z nasyceniem.
PROMPT_MATOWY = (
    'Repaint the creature from the FIRST image in the same painterly style as '
    'the adventure-map objects in the SECOND image, but make it less chibi and '
    'less glossy: more natural creature proportions (a smaller head relative '
    'to the body, sturdier body and limbs), a matte painted surface — no shiny specular '
    'highlights, no glossy plastic look, no bright rim light around the '
    'edges; soft diffuse warm light from the upper left and deep dark core '
    'shadows on the lower right. Calm, wild expression, not a cute mascot '
    'grin. Keep the EXACT colours of the first image — every colour zone '
    'keeps its hue and its saturation (do not turn it brown, grey or '
    'earthy). Keep its identity: {opis}. Same colour zones and markings, same '
    'anatomy and number of limbs, same overall silhouette type. Full body, '
    'three-quarter view facing the RIGHT side of the image. Only the '
    'creature, cut out on a fully transparent background, nothing under its '
    'feet: no ground, no grass, no shadow, no base, no glow, no frame, no text.'
)

#: Drugie przejście — sprzątanie gotowego rysunku. Mimo „nothing under its
#: feet" model w pierwszym przejściu podkładał prawie każdemu stworkowi
#: namalowany grunt: jasny krążek piasku, kępę trawy z kamykami, raz nawet
#: prostokąt terenu. Na mapie gra rysuje własny cień kontaktowy na własnej
#: trawie, więc taki krążek wyglądał jak podstawka figurki. Tu wejściem jest
#: sam namalowany stworek (nie oryginał), więc styl i tożsamość już są —
#: model ma tylko wyciąć to, co pod stopami.
PROMPT_CZYSC = (
    'This is a finished hand-painted creature sprite for a fantasy strategy '
    'game. Output the SAME picture: the same creature, same pose, same '
    'painting style, same colours, same warm sunlight from the upper left, '
    'same painted texture, same outline, same size and '
    'the same position in the frame — change nothing about the creature. The '
    'ONLY change: remove everything that is not the creature itself — the '
    'painted ground under it (sand disc, dirt patch, grass tuft, pebbles, '
    'shadow ellipse, any background). Where the ground hid parts of the feet, '
    'complete the feet naturally. Result: only the creature, cut out on a '
    'fully transparent background, nothing under its feet, no shadow, no '
    'glow, no frame, no text.'
)


# ————————————————————————————————————————————— arkusz stylu

def arkuszStylu() -> Path:
    """Obiekty naszej mapy na łące w barwie planszy — drugi obrazek zapytania.

    Składany z surowych wyjść z `tools/wsad/` (wysoka rozdzielczość), a nie
    z `public/mapa/`, gdzie obiekty są zmniejszone do rozmiaru na mapie.
    """
    if ARKUSZ_STYLU.exists():
        return ARKUSZ_STYLU
    wsad = NARZEDZIA / 'wsad'
    a = Image.new('RGBA', (1024, 1024), (126, 150, 78, 255))

    def poloz(plik: str, pole: tuple[int, int], xy: tuple[int, int]) -> None:
        im = Image.open(wsad / plik).convert('RGBA')
        im = im.crop(im.getchannel('A').getbbox())
        im.thumbnail(pole, Image.LANCZOS)
        a.alpha_composite(im, (xy[0] + (pole[0] - im.width) // 2, xy[1] + pole[1] - im.height))

    poloz('m-zamek.png', (560, 520), (20, 10))
    poloz('polana-drzewo.png', (400, 440), (600, 60))
    poloz('m-kopalnia.png', (460, 440), (20, 560))
    poloz('m-sad.png', (300, 300), (520, 560))
    poloz('m-skrzynia.png', (200, 200), (820, 780))
    WSAD.mkdir(parents=True, exist_ok=True)
    a.convert('RGB').save(ARKUSZ_STYLU)
    return ARKUSZ_STYLU


# ————————————————————————————————————————————— generowanie

def wersje(sid: str) -> list[int]:
    return sorted(int(p.stem.split('-')[1]) for p in WSAD.glob(f'{sid}-*.png'))


#: Zapytania w locie. Limit sprawdzamy z nimi, bo przy kilku wątkach każdy
#: z osobna widziałby jeszcze wolne miejsce i razem przebiłyby limit.
_zamek = threading.Lock()
_w_locie = 0


def _rezerwuj() -> None:
    global _w_locie
    with _zamek:
        if wydaneDotad() + (_w_locie + 1) * NAJDROZSZE > LIMIT_USD:
            raise SystemExit(f'Limit wydatków: ${wydaneDotad():.2f} z ${LIMIT_USD:.2f} (OPENAI_LIMIT_USD). Nie wysyłam.')
        _w_locie += 1


def _zwolnij() -> None:
    global _w_locie
    with _zamek:
        _w_locie -= 1


def generuj(sid: str, czysc: bool | str = False) -> Path | None:
    """Jedno zapytanie `images/edits`. Zwraca ścieżkę nowej surowej wersji.

    `czysc`: zamiast przemalowywać oryginał, bierze wybraną surową wersję
    i zdejmuje z niej namalowany grunt (`PROMPT_CZYSC`). `czysc='mapa'`:
    przemalowuje mistrza pod obiekty naszej mapy (`PROMPT_MAPA`)."""
    _rezerwuj()
    try:
        return _generuj(sid, czysc)
    finally:
        _zwolnij()


def _generuj(sid: str, czysc: bool | str) -> Path | None:
    if czysc in ('mapa', 'matowy'):
        # Wejście: mistrz 256 px powiększony do 512 (model gubi szczegóły
        # na małym obrazku), drugi obrazek — arkusz obiektów naszej mapy.
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t:
            Image.open(MISTRZE / f'{sid}.png').convert('RGBA').resize((512, 512), Image.LANCZOS).save(t.name)
            wejscie = t.name
        obrazy = ['-F', f'image[]=@{wejscie}', '-F', f'image[]=@{ARKUSZ_MAPY}']
        prompt = (PROMPT_MATOWY if czysc == 'matowy' else PROMPT_MAPA).format(opis=STWORKI[sid][1])
        print(f'  {sid}: maluję z mistrza ({czysc})', flush=True)
    elif czysc:
        zrodlo = wybrana(sid)
        if not zrodlo:
            print(f'  {sid}: nie ma czego czyścić')
            return None
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t:
            shutil.copy2(zrodlo, t.name)
            wejscie = t.name
        obrazy = ['-F', f'image[]=@{wejscie}']
        prompt = PROMPT_CZYSC
        print(f'  {sid}: czyszczę {zrodlo.name}', flush=True)
    else:
        styl = arkuszStylu()
        # Oryginał 256 px na białym tle powiększony do 512: przy małym obrazku
        # wejściowym model gorzej trzyma szczegóły (oczy, znaczenia).
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t:
            Image.open(ZRODLA / f'{sid}.png').convert('RGB').resize((512, 512), Image.LANCZOS).save(t.name)
            wejscie = t.name
        obrazy = ['-F', f'image[]=@{wejscie}', '-F', f'image[]=@{styl}']
        prompt = PROMPT.format(opis=STWORKI[sid][1])
    polecenie = [
        'curl', '-s', '--max-time', '120', 'https://api.openai.com/v1/images/edits',
        '-F', f'model={MODEL}', *obrazy,
        '-F', f'size={ROZMIAR}', '-F', f'quality={JAKOSC}', '-F', 'background=transparent',
        '-F', 'output_format=png', '-F', f'prompt={prompt}',
    ]
    # Proxy środowiska tnie zapytania po ~30 s i czasem odpowiada 5xx;
    # limit organizacji to ~5 obrazków na minutę (429). Oba przypadki ponawiamy.
    for proba in range(8):
        wynik = subprocess.run(polecenie, capture_output=True, text=True)
        try:
            odp = json.loads(wynik.stdout)
        except json.JSONDecodeError:
            print(f'  {sid}: nie-JSON ({wynik.stdout[:80]!r}), ponawiam', flush=True)
            time.sleep(10)
            continue
        if 'error' in odp:
            opis = str(odp['error'].get('message', odp['error']))[:160]
            # Filtr bezpieczeństwa odrzuca czasem niewinny prompt (pancerny
            # „nosorożec" Torrenara szedł za piątym razem). Odrzucone
            # zapytanie nie jest liczone, ale ponawianie w nieskończoność
            # nie ma sensu — po kilku próbach zostawiamy to człowiekowi.
            if 'safety' in opis and proba >= 5:
                break
            print(f'  {sid}: błąd API: {opis[:90]} — ponawiam', flush=True)
            time.sleep(25 if 'rate' in opis.lower() else 10)
            continue
        usage = odp.get('usage', {})
        n = (max(wersje(sid)) + 1) if wersje(sid) else 1
        cel = WSAD / f'{sid}-{n}.png'
        usd = zapiszKoszt(f'stworki/{cel.name}', MODEL, JAKOSC, ROZMIAR, usage)
        dane = next((w['b64_json'] for w in odp.get('data', []) if w.get('b64_json')), None)
        if not dane:
            print(f'  {sid}: odpowiedź bez obrazka', flush=True)
            return None
        cel.write_bytes(base64.b64decode(dane))
        print(f'  {sid}: {cel.name}  ${usd:.3f}  (razem ${wydaneDotad():.2f})', flush=True)
        os.unlink(wejscie)
        return cel
    os.unlink(wejscie)
    print(f'  {sid}: poddaję się po 8 próbach', flush=True)
    return None


# ————————————————————————————————————————————— kadrowanie

def _statBarwy(im: Image.Image, gora: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Średnia i odchylenie YCbCr pikseli sylwetki (alfa > 200), tylko
    z górnej części `gora` jej wysokości."""
    maska = np.array(im.getchannel('A')) > 200
    ys = np.nonzero(maska.any(1))[0]
    maska[ys.min() + int((ys.max() - ys.min()) * gora):] = False
    ycc = np.array(im.convert('RGB').convert('YCbCr')).astype(np.float32)
    return ycc[maska].mean(0), ycc[maska].std(0)


def dopasujBarwy(im: Image.Image, wzor: Image.Image, sila: float = 0.8) -> Image.Image:
    """Przenosi średnią i rozrzut barwy z `wzor` na `im` (transfer Reinharda
    w YCbCr), w `sila` proporcji. Alfa zostaje bez zmian."""
    m1, s1 = _statBarwy(im)
    m0, s0 = _statBarwy(wzor, 0.72)
    ycc = np.array(im.convert('RGB').convert('YCbCr')).astype(np.float32)
    ycc = ycc * (1 - sila) + ((ycc - m1) / np.maximum(s1, 1) * s0 + m0) * sila
    wynik = Image.fromarray(ycc.clip(0, 255).astype(np.uint8), 'YCbCr').convert('RGBA')
    wynik.putalpha(im.getchannel('A'))
    return wynik


def wycinek(sciezka: Path, odbij: bool) -> Image.Image:
    """Surowe wyjście → sama sylwetka z czystą alfą, przycięta do obrysu.

    Model przy przezroczystym tle zostawia miękką poświatę (setki tysięcy
    półprzezroczystych pikseli). Na mapie robiła z niej mgiełkę wokół
    stworka, więc alfę ścinamy progiem z krótką rampą (krawędź zostaje
    gładka), a potem wyrzucamy odłamki niepołączone z główną sylwetką.
    """
    im = Image.open(sciezka).convert('RGBA')
    if sciezka.stem in BARWY_Z:
        im = dopasujBarwy(im, Image.open(WSAD / f'{BARWY_Z[sciezka.stem]}.png').convert('RGBA'))
    t = np.array(im).astype(np.float32)
    a = t[..., 3]
    a = np.clip((a - 90) / (230 - 90), 0, 1)
    maska = a > 0.02
    # Spójne składowe (4-sąsiedztwo) bez scipy: zalewanie od największej plamy.
    etykiety = np.zeros(maska.shape, np.int32)
    rozmiary = [0]
    h, w = maska.shape
    for y0, x0 in zip(*np.nonzero(maska)):
        if etykiety[y0, x0]:
            continue
        nr = len(rozmiary)
        stos = [(y0, x0)]
        etykiety[y0, x0] = nr
        ile = 0
        while stos:
            y, x = stos.pop()
            ile += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and maska[ny, nx] and not etykiety[ny, nx]:
                    etykiety[ny, nx] = nr
                    stos.append((ny, nx))
        rozmiary.append(ile)
    najw = max(rozmiary)
    # Zostają plamy co najmniej 3% największej — kulka nad głową Sporiny,
    # oddzielone skrzydło, kropla — a nie pył z poświaty.
    zostaw = np.array([r >= najw * 0.03 for r in rozmiary])
    zostaw[0] = False
    a = np.where(zostaw[etykiety], a, 0)
    t[..., 3] = a * 255
    wynik = Image.fromarray(t.round().clip(0, 255).astype(np.uint8), 'RGBA')
    wynik = wynik.crop(wynik.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    if odbij:
        wynik = wynik.transpose(Image.FLIP_LEFT_RIGHT)
    return wynik


def mistrz(sylwetka: Image.Image) -> Image.Image:
    """Sylwetka w kwadracie mistrza: wpisana w bok − 2 × margines, stopy na
    wspólnej linii, środek obrysu na środku kwadratu."""
    pole = BOK_MISTRZA - 2 * MARGINES
    s = min(pole / sylwetka.width, pole / sylwetka.height)
    # Zmniejszanie schodkami po połowie + Lanczos na końcu — z 1024 px
    # jednym skokiem kontur by się poszarpał.
    im = sylwetka
    while im.width * 0.5 > sylwetka.width * s * 1.5:
        im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im = im.resize((max(1, round(sylwetka.width * s)), max(1, round(sylwetka.height * s))), Image.LANCZOS)
    kw = Image.new('RGBA', (BOK_MISTRZA, BOK_MISTRZA), (0, 0, 0, 0))
    kw.alpha_composite(im, ((BOK_MISTRZA - im.width) // 2, BOK_MISTRZA - MARGINES - im.height))
    return kw


def wybrana(sid: str) -> Path | None:
    w = wersje(sid)
    if not w:
        return None
    n = WYBOR.get(sid, w[-1])
    return WSAD / f'{sid}-{n}.png'


def kadruj(bok: int) -> None:
    MISTRZE.mkdir(parents=True, exist_ok=True)
    STARE.mkdir(parents=True, exist_ok=True)
    for sid in STWORKI:
        # Stary płaski plik zachowujemy raz — przed pierwszym nadpisaniem.
        if not (STARE / f'{sid}.png').exists() and (GRA / f'{sid}.png').exists():
            shutil.copy2(GRA / f'{sid}.png', STARE / f'{sid}.png')
        zrodlo = wybrana(sid)
        if not zrodlo:
            print(f'  {sid}: brak wersji — zostaje stary plik')
            continue
        m = mistrz(wycinek(zrodlo, zrodlo.stem in ODBIJ))
        m.save(MISTRZE / f'{sid}.png', optimize=True)
        m.resize((bok, bok), Image.LANCZOS).save(GRA / f'{sid}.png', optimize=True)
        print(f'  {sid}: {zrodlo.name}{" (odbity)" if zrodlo.stem in ODBIJ else ""} → mistrz {BOK_MISTRZA}, gra {bok}')


def arkusz(wyjscie: Path, wszystkie: bool) -> None:
    """Podgląd: każdy stworek na łące w barwie mapy, z linią stóp.
    `--wszystkie-wersje` pokazuje każdą surową wersję (do wybierania)."""
    wpisy: list[tuple[str, Image.Image]] = []
    for sid in STWORKI:
        if wszystkie:
            for n in wersje(sid):
                k = f'{sid}-{n}'
                wpisy.append((k + (' odb' if k in ODBIJ else ''), mistrz(wycinek(WSAD / f'{k}.png', k in ODBIJ))))
        elif (MISTRZE / f'{sid}.png').exists():
            wpisy.append((f'{sid} {STWORKI[sid][0]}', Image.open(MISTRZE / f'{sid}.png').convert('RGBA')))
    kol = 6
    rz = (len(wpisy) + kol - 1) // kol
    a = Image.new('RGB', (kol * 256, rz * 276), (118, 142, 72))
    d = ImageDraw.Draw(a)
    for i, (opis, im) in enumerate(wpisy):
        x, y = (i % kol) * 256, (i // kol) * 276
        a.paste(im, (x, y + 20), im)
        d.line([(x + 8, y + 20 + BOK_MISTRZA - MARGINES), (x + 248, y + 20 + BOK_MISTRZA - MARGINES)], fill=(90, 110, 50))
        d.text((x + 4, y + 4), opis, fill=(255, 255, 230))
    a.save(wyjscie)
    print(f'arkusz: {wyjscie}')


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('stworki', nargs='*', help='id stworków (domyślnie wszystkie 18)')
    ap.add_argument('--lista', action='store_true')
    ap.add_argument('--generuj', action='store_true', help='nowa wersja przez OpenAI (kosztuje)')
    ap.add_argument('--brakujace', action='store_true', help='z --generuj: tylko stworki bez żadnej wersji')
    ap.add_argument('--czysc', action='store_true', help='zdejmij namalowany grunt z wybranej wersji (kosztuje)')
    ap.add_argument('--mapowy', action='store_true', help='przemaluj mistrza pod obiekty naszej mapy (kosztuje)')
    ap.add_argument('--matowy', action='store_true', help='z --mapowy: mniej „chibi", matowo (PROMPT_MATOWY)')
    ap.add_argument('--rownolegle', type=int, default=3, help='ile zapytań naraz (limit ~5/min)')
    ap.add_argument('--kadruj', action='store_true', help='wybrane wersje → assets/stworki + public/sprites')
    ap.add_argument('--bok', type=int, default=128, help='bok pliku w public/sprites')
    ap.add_argument('--arkusz', type=Path, help='zapisz podgląd wybranych mistrzów')
    ap.add_argument('--wszystkie-wersje', action='store_true', help='z --arkusz: każda surowa wersja')
    args = ap.parse_args()

    ids = args.stworki or list(STWORKI)
    for sid in ids:
        if sid not in STWORKI:
            raise SystemExit(f'Nieznany stworek {sid}. Znane: {" ".join(STWORKI)}')

    if args.lista:
        for sid in STWORKI:
            z = wybrana(sid)
            print(f'  {sid} {STWORKI[sid][0]:9s} wersje: {wersje(sid) or "-"}  do gry: {z.name if z else "stary"}')
        print(f'wydane dotąd (cały projekt): ${wydaneDotad():.2f} z ${LIMIT_USD:.2f}')
    if args.generuj:
        cele = [s for s in ids if not (args.brakujace and wersje(s))]
        print(f'generuję {len(cele)}: model {MODEL}, jakość {JAKOSC}')
        with ThreadPoolExecutor(max_workers=max(1, args.rownolegle)) as pula:
            list(pula.map(generuj, cele))
    if args.czysc:
        if not args.stworki:
            raise SystemExit('--czysc wymaga listy id (świadomie: każde to zapytanie płatne)')
        print(f'czyszczę {len(ids)}: model {MODEL}, jakość {JAKOSC}')
        with ThreadPoolExecutor(max_workers=max(1, args.rownolegle)) as pula:
            list(pula.map(lambda s: generuj(s, czysc=True), ids))
    if args.mapowy:
        if not args.stworki:
            raise SystemExit('--mapowy wymaga listy id (świadomie: każde to zapytanie płatne)')
        print(f'maluję pod mapę {len(ids)}: model {MODEL}, jakość {JAKOSC}')
        with ThreadPoolExecutor(max_workers=max(1, args.rownolegle)) as pula:
            list(pula.map(lambda s: generuj(s, czysc='matowy' if args.matowy else 'mapa'), ids))
    if args.kadruj:
        kadruj(args.bok)
    if args.arkusz:
        arkusz(args.arkusz, args.wszystkie_wersje)


if __name__ == '__main__':
    main()
