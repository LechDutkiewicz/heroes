"""
Muzyka ekranu wyniku: fanfara zwycięstwa, łagodny motyw porażki i dłuższy
utwór na zakończenie kampanii.

Ta sama droga co `muzyka_fluidsynth.py` (MIDI składane w Pythonie, render
przez `fluidsynth` z soundfontem FluidR3_GM), ale osobny plik: tamten skrypt
przy imporcie od razu renderuje całą muzykę mapy i miasta, a tu chodzi
o trzy nowe utwory bez ruszania tamtych.

Heroes 2 ma na tych ekranach krótkie, zamknięte utwory — nie pętle. Stąd
zwycięstwo i porażka są jednorazowe (kilka sekund i koniec), a zakończenie
kampanii jest dłuższe i zapętlone, bo pod nim czyta się tekst i tabelę
rekordów.

Wymaga: apt install fluidsynth fluid-soundfont-gm; pip install mido.

    python3 tools/muzyka_wynik.py
"""
import struct
import subprocess
import wave

from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo, second2tick

SR = 44100
OUT = 'public/audio'
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
TICKS = 480
PERKUSJA = 9

# Programy General MIDI, których tu używamy.
TRABKA, ROGI, BLACHA, SMYCZKI, HARFA, FLET, OBOJ, KOTLY, DZWONKI, CZELESTA = 56, 60, 61, 48, 46, 73, 68, 47, 9, 8
TALERZ, WERBEL = 49, 38


def N(nazwa: str) -> int:
    """'C4' → 60. Krzyżyk przez '#': 'F#3'."""
    litera, reszta = nazwa[0], nazwa[1:]
    krzyzyk = reszta.startswith('#')
    oktawa = int(reszta[1:] if krzyzyk else reszta)
    return (oktawa + 1) * 12 + {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[litera] + krzyzyk


def zloz_midi(sciezka, bpm, kanaly, programy, glosnosci):
    tempo = bpm2tempo(bpm)
    mid = MidiFile(ticks_per_beat=TICKS)
    for ch, nuty in kanaly.items():
        tr = MidiTrack()
        mid.tracks.append(tr)
        if ch == min(kanaly):
            tr.append(MetaMessage('set_tempo', tempo=tempo, time=0))
        zd = []
        if ch in programy:
            zd.append((0.0, 0, Message('program_change', program=programy[ch], channel=ch)))
        zd.append((0.0, 0, Message('control_change', control=7, value=glosnosci.get(ch, 100), channel=ch)))
        zd.append((0.0, 0, Message('control_change', control=91, value=60, channel=ch)))
        for t0, dl, wys, sila in nuty:
            zd.append((t0, 1, Message('note_on', note=wys, velocity=sila, channel=ch)))
            zd.append((t0 + dl, 0, Message('note_off', note=wys, velocity=0, channel=ch)))
        zd.sort(key=lambda e: (e[0], e[1]))
        ost = 0
        for t, _, msg in zd:
            tick = int(round(second2tick(t, TICKS, tempo)))
            tr.append(msg.copy(time=max(0, tick - ost)))
            ost = max(ost, tick)
    mid.save(sciezka)


def wyrenderuj(nazwa, bpm, kanaly, programy, glosnosci, dlugosc, wejscie_ms=4, zanik_ms=900, wzmocnienie=1.2):
    mid = f'/tmp/{nazwa}.mid'
    surowy = f'/tmp/{nazwa}_surowy.wav'
    zloz_midi(mid, bpm, kanaly, programy, glosnosci)
    subprocess.run(['fluidsynth', '-ni', SF2, mid, '-F', surowy, '-r', str(SR), '-g', str(wzmocnienie)],
                   check=True, capture_output=True)
    w = wave.open(surowy, 'rb')
    n = w.getnframes()
    dane = struct.unpack('<%dh' % (n * 2), w.readframes(n))
    lewy, prawy = list(dane[0::2]), list(dane[1::2])
    ile = min(n, int(SR * dlugosc))
    lewy, prawy = lewy[:ile], prawy[:ile]
    nw, nz = int(SR * wejscie_ms / 1000), int(SR * zanik_ms / 1000)
    for c in (lewy, prawy):
        for i in range(min(nw, ile)):
            c[i] *= i / nw
        for i in range(min(nz, ile)):
            c[ile - 1 - i] *= i / nz
    szczyt = max(1, max(abs(v) for c in (lewy, prawy) for v in c))
    k = 0.9 * 32767 / szczyt
    probki = [int(max(-32767, min(32767, v * k))) for para in zip(lewy, prawy) for v in para]
    with wave.open(f'{OUT}/{nazwa}.wav', 'wb') as o:
        o.setnchannels(2)
        o.setsampwidth(2)
        o.setframerate(SR)
        o.writeframes(struct.pack('<%dh' % len(probki), *probki))
    print(f'  {OUT}/{nazwa}.wav  {ile / SR:.1f} s')


def akord(t, dl, nazwy, sila):
    return [(t, dl, N(n), sila) for n in nazwy]


# ————————————————————————————————————————— zwycięstwo
# Fanfara w C-dur: trzy przedtakty trąbki, skok na tonikę, wspinaczka
# i wielki akord z kotłami i talerzem. Około siedmiu sekund — tyle, ile
# trwa wejście ilustracji i napisu, zanim dziecko zacznie czytać.
def zwyciestwo():
    bpm = 104
    b = 60 / bpm
    tr, bl, sm, ko, pe, dz = [], [], [], [], [], []
    trioli = b / 3
    for i in range(3):
        tr.append((i * trioli, trioli * 0.9, N('G4'), 100))
    t = b
    melodia = [('C5', 1.5), ('G4', 0.5), ('C5', 0.5), ('E5', 0.5), ('G5', 2), ('E5', 0.5), ('F5', 0.5),
               ('G5', 0.5), ('A5', 0.5), ('G5', 1), ('C6', 3)]
    for nazwa, dl in melodia:
        tr.append((t, dl * b * 0.95, N(nazwa), 112))
        t += dl * b
    koniec = t
    # Harmonia: blacha i smyczki trzymają akordy pod melodią.
    plan = [(b, 2.5, ['C3', 'G3', 'C4', 'E4']), (b * 3.5, 2.5, ['C3', 'G3', 'E4', 'G4']),
            (b * 6, 1, ['F3', 'A3', 'C4', 'F4']), (b * 7, 1, ['G3', 'B3', 'D4', 'G4']),
            (b * 8, 1, ['E3', 'G3', 'C4', 'E4']), (b * 9, 3, ['C3', 'G3', 'C4', 'E4', 'G4'])]
    for t0, dl, nuty in plan:
        bl += akord(t0, dl * b * 0.97, nuty, 92)
        sm += akord(t0, dl * b * 0.99, [n[:-1] + str(int(n[-1]) + 1) for n in nuty], 70)
    # Kotły: tonika i dominanta na mocnych częściach, tremolo na końcu.
    for t0, n in [(b, 'C2'), (b * 3.5, 'C2'), (b * 6, 'F2'), (b * 7, 'G2'), (b * 8, 'C2')]:
        ko.append((t0, b * 0.5, N(n), 110))
    for i in range(14):
        ko.append((b * 8.4 + i * b / 8, b / 9, N('G2' if i % 2 else 'C2'), 70 + i * 3))
    ko.append((b * 9, b * 2, N('C2'), 127))
    pe.append((b, 1.5, TALERZ, 90))
    pe.append((b * 9, 3, TALERZ, 120))
    pe.append((b * 9, 3, 57, 100))  # drugi talerz
    for i in range(3):
        pe.append((i * trioli, 0.1, WERBEL, 70 + i * 12))
    dz += akord(b * 9, 2, ['C6', 'E6', 'G6'], 70)
    wyrenderuj('wynik-zwyciestwo', bpm,
               {0: tr, 1: bl, 2: sm, 3: ko, PERKUSJA: pe, 4: dz},
               {0: TRABKA, 1: BLACHA, 2: SMYCZKI, 3: KOTLY, 4: DZWONKI},
               {0: 118, 1: 100, 2: 85, 3: 110, PERKUSJA: 85, 4: 70},
               dlugosc=koniec + 2.2, zanik_ms=1400)


# ————————————————————————————————————————— porażka
# A-moll, wolno, harfa i obój nad smyczkami. Ostatni akord jest DUROWY
# (tercja pikardyjska): smutek, ale z otwartymi drzwiami — ekran mówi
# „spróbuj jeszcze raz", więc muzyka nie może mówić „koniec".
def porazka():
    bpm = 66
    b = 60 / bpm
    ob, sm, ha, fl = [], [], [], []
    plan = [(['A2', 'E3', 'A3', 'C4'], 2), (['F2', 'C3', 'A3', 'C4'], 2), (['D2', 'A2', 'F3', 'A3'], 2),
            (['E2', 'B2', 'G#3', 'B3'], 2), (['A2', 'E3', 'A3', 'C#4'], 4)]
    t = 0.0
    for nuty, dl in plan:
        sm += akord(t, dl * b * 0.99, nuty, 58)
        for i, n in enumerate(nuty + [nuty[2][:-1] + str(int(nuty[2][-1]) + 1)]):
            ha.append((t + i * b / 4, b * 1.5, N(n), 64))
        t += dl * b
    melodia = [('E5', 1), ('C5', 0.5), ('B4', 0.5), ('A4', 1.5), ('C5', 0.5), ('D5', 1), ('C5', 0.5),
               ('A4', 0.5), ('B4', 2), ('C#5', 3)]
    t = 0.0
    for nazwa, dl in melodia:
        ob.append((t, dl * b * 0.95, N(nazwa), 78))
        t += dl * b
    fl += akord(b * 8, b * 4, ['E5', 'A5'], 46)
    wyrenderuj('wynik-porazka', bpm,
               {0: ob, 1: sm, 2: ha, 3: fl},
               {0: OBOJ, 1: SMYCZKI, 2: HARFA, 3: FLET},
               {0: 100, 1: 80, 2: 90, 3: 60},
               dlugosc=12 * b + 1.8, zanik_ms=1500)


# ————————————————————————————————————————— koniec kampanii
# Dłuższy, śpiewny utwór w G-dur pod tekst zakończenia i tabelę rekordów:
# rogi prowadzą melodię, harfa i czelesta dają „bajkowy" błysk, smyczki
# niosą harmonię. Zapętlony — pod tabelą rekordów można siedzieć długo.
def koniec():
    bpm = 84
    b = 60 / bpm
    ro, sm, ha, ce, ko = [], [], [], [], []
    akordy = [['G2', 'D3', 'G3', 'B3'], ['E2', 'B2', 'G3', 'B3'], ['C3', 'G3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'F#4'],
              ['G2', 'D3', 'G3', 'B3'], ['C3', 'G3', 'C4', 'E4'], ['A2', 'E3', 'C4', 'E4'], ['D3', 'A3', 'D4', 'F#4']]
    for i, nuty in enumerate(akordy):
        t = i * 4 * b
        sm += akord(t, 4 * b * 0.99, nuty, 60)
        for k in range(8):
            n = nuty[k % 4]
            ha.append((t + k * b / 2, b, N(n[:-1] + str(int(n[-1]) + 1)), 58))
        ko.append((t, b * 0.6, N(nuty[0][:-1] + '2'), 70))
    melodia = [('D4', 1), ('G4', 1), ('B4', 1.5), ('A4', 0.5), ('G4', 2), ('E4', 1), ('G4', 1),
               ('C5', 2), ('B4', 1), ('A4', 1), ('A4', 3), ('D4', 1),
               ('G4', 1), ('B4', 1), ('D5', 1.5), ('C5', 0.5), ('C5', 1), ('B4', 1), ('E5', 2),
               ('C5', 1), ('A4', 1), ('B4', 1), ('A4', 1), ('G4', 4)]
    t = 0.0
    for nazwa, dl in melodia:
        ro.append((t, dl * b * 0.95, N(nazwa), 92))
        t += dl * b
    for i in range(0, 32, 2):
        ce.append((i * b + b * 0.5, b * 0.4, N(['B5', 'D6', 'G6', 'D6'][i // 2 % 4]), 40))
    wyrenderuj('wynik-koniec', bpm,
               {0: ro, 1: sm, 2: ha, 3: ce, 4: ko},
               {0: ROGI, 1: SMYCZKI, 2: HARFA, 3: CZELESTA, 4: KOTLY},
               {0: 105, 1: 78, 2: 80, 3: 60, 4: 70},
               dlugosc=32 * b, wejscie_ms=20, zanik_ms=1200, wzmocnienie=1.0)


if __name__ == '__main__':
    zwyciestwo()
    porazka()
    koniec()
    print('gotowe')
