"""
Muzyka i efekty mapy/miasta — druga próba, prawdziwe próbki instrumentów.

Dwie poprzednie wersje (gołe sinusoidy, potem silnik ZzFX) brzmiały jak
piszczenie z gierek 8-bitowych — bo to BYŁA czysta synteza fal, bez
żadnego prawdziwego instrumentu. To wydanie komponuje utwory jako MIDI
(python, biblioteka `mido`, PyPI — dozwolone z tego środowiska) i renderuje
je przez `fluidsynth` z soundfontem **FluidR3_GM** (pakiet apt
`fluid-soundfont-gm`) — czyli prawdziwe próbkowane smyczki, harfa, róg,
kotły, dzwonki. To wciąż nie jest sesja nagraniowa z orkiestrą, ale to
prawdziwe brzmienie instrumentów, nie fala sinus.

Wymaga zainstalowanego `fluidsynth` i `/usr/share/sounds/sf2/FluidR3_GM.sf2`
(apt install fluidsynth fluid-soundfont-gm) oraz `pip install mido`.
"""
import math
import os
import struct
import subprocess
import wave

import mido
from mido import Message, MetaMessage, MidiFile, MidiTrack, bpm2tempo, second2tick

SR = 44100
OUT = 'public/audio'
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
TICKS = 480

DRUM_CH = 9  # kanał 10 w MIDI (0-indeksowany) — zarezerwowany na perkusję GM


def note_name(letter, octave):
    offset = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}[letter]
    return (octave + 1) * 12 + offset


def build_midi(path, bpm, channel_events, channel_programs, channel_gain=None):
    """channel_events: {kanał: [(czas_start_s, czas_trwania_s, nuta, velocity)]}.
    channel_programs: {kanał: program_GM} (pomijany dla kanału perkusji)."""
    tempo = bpm2tempo(bpm)
    mid = MidiFile(ticks_per_beat=TICKS)
    for ch, notes in channel_events.items():
        track = MidiTrack()
        mid.tracks.append(track)
        if ch == min(channel_events):
            track.append(MetaMessage('set_tempo', tempo=tempo, time=0))
        events = []
        if ch in channel_programs:
            events.append((0.0, Message('program_change', program=channel_programs[ch], channel=ch, time=0)))
        vol = (channel_gain or {}).get(ch, 100)
        events.append((0.0, Message('control_change', control=7, value=vol, channel=ch, time=0)))
        events.append((0.0, Message('control_change', control=91, value=40, channel=ch, time=0)))  # reverb send
        for t0, dur, pitch, vel in notes:
            events.append((t0, Message('note_on', note=pitch, velocity=vel, channel=ch, time=0)))
            events.append((t0 + dur, Message('note_off', note=pitch, velocity=0, channel=ch, time=0)))
        events.sort(key=lambda e: e[0])
        last_tick = 0
        for t_sec, msg in events:
            tick = int(round(second2tick(t_sec, TICKS, tempo)))
            delta = max(0, tick - last_tick)
            msg = msg.copy(time=delta)
            track.append(msg)
            last_tick = tick
    mid.save(path)


def render(mid_path, wav_path, gain=1.3):
    subprocess.run(
        ['fluidsynth', '-ni', SF2, mid_path, '-F', wav_path, '-r', str(SR), '-g', str(gain)],
        check=True, capture_output=True,
    )


def read_wav_stereo(path):
    w = wave.open(path, 'rb')
    n = w.getnframes()
    ch = w.getnchannels()
    data = w.readframes(n)
    samples = struct.unpack('<%dh' % (n * ch), data)
    if ch == 1:
        return [samples], w.getframerate()
    left = samples[0::2]
    right = samples[1::2]
    return [list(left), list(right)], w.getframerate()


def write_wav_stereo(path, channels, peak=0.92):
    n = len(channels[0])
    m = max((abs(v) for c in channels for v in c), default=1) / 32767 or 1
    k = peak / m if m > 0 else 1.0
    interleaved = []
    for i in range(n):
        for c in channels:
            interleaved.append(int(max(-32767, min(32767, c[i] * k))))
    with wave.open(path, 'wb') as w:
        w.setnchannels(len(channels))
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(struct.pack('<%dh' % len(interleaved), *interleaved))


def fade(channels, in_ms=0, out_ms=0):
    n_in = int(SR * in_ms / 1000)
    n_out = int(SR * out_ms / 1000)
    n = len(channels[0])
    for c in channels:
        for i in range(min(n_in, n)):
            c[i] *= i / n_in
        for i in range(min(n_out, n)):
            c[n - 1 - i] *= i / n_out
    return channels


def trim(channels, length_s):
    n = int(SR * length_s)
    return [c[:n] for c in channels]


def render_one_shot(name, bpm, channel_events, channel_programs, channel_gain=None, tail_s=1.6, gain=1.3):
    mid_path = f'/tmp/{name}.mid'
    wav_raw = f'/tmp/{name}_raw.wav'
    build_midi(mid_path, bpm, channel_events, channel_programs, channel_gain)
    render(mid_path, wav_raw, gain=gain)
    channels, sr = read_wav_stereo(wav_raw)
    last_event_end = max(t0 + dur for notes in channel_events.values() for t0, dur, *_ in notes)
    channels = trim(channels, last_event_end + tail_s)
    channels = fade(channels, in_ms=3, out_ms=min(250, int(tail_s * 1000 * 0.6)))
    write_wav_stereo(f'{OUT}/{name}.wav', channels)


def render_loop(name, bpm, channel_events, channel_programs, channel_gain, loop_len_s, gain=1.1):
    mid_path = f'/tmp/{name}.mid'
    wav_raw = f'/tmp/{name}_raw.wav'
    build_midi(mid_path, bpm, channel_events, channel_programs, channel_gain)
    render(mid_path, wav_raw, gain=gain)
    channels, sr = read_wav_stereo(wav_raw)
    channels = trim(channels, loop_len_s)
    channels = fade(channels, in_ms=15, out_ms=900)
    write_wav_stereo(f'{OUT}/{name}.wav', channels, peak=0.85)


N = note_name

# ============================================================
# Efekty jednorazowe — prawdziwe instrumenty GM zamiast fal syntetycznych.
# ============================================================

# zbior: podniesienie surowca/artefaktu — celesta, szybkie arpeggio w górę.
render_one_shot(
    'zbior', bpm=120,
    channel_events={0: [
        (0.00, 0.5, N('C', 5), 85),
        (0.08, 0.5, N('E', 5), 90),
        (0.16, 0.6, N('G', 5), 95),
    ]},
    channel_programs={0: 8},  # Celesta
    tail_s=0.55,
)

# zajecie: zajęcie kopalni/gniazda — dramatyczny akord (Orchestra Hit)
# plus kocioł pod spodem, jak stinger w H3 przy zajęciu obiektu.
render_one_shot(
    'zajecie', bpm=100,
    channel_events={
        0: [(0.0, 0.5, p, 92) for p in (N('A', 3), N('C', 4), N('E', 4))],
        1: [(0.0, 0.4, N('A', 2), 80)],
    },
    channel_programs={0: 55, 1: 47},  # Orchestra Hit, Timpani
)

# wejscie: wejście do budowli/bramy — miękki, krótki szarpnięty ton smyczka.
render_one_shot(
    'wejscie', bpm=100,
    channel_events={0: [(0.0, 0.28, N('D', 3), 70)]},
    channel_programs={0: 45},  # Pizzicato Strings
    tail_s=0.4,
)

# awans: fanfara na okno awansu — trąbka w górę, potem akord blachy
# z talerzem i kotłem, triumfalnie.
render_one_shot(
    'awans', bpm=110,
    channel_events={
        0: [
            (0.00, 0.25, N('C', 4), 90),
            (0.12, 0.25, N('E', 4), 95),
            (0.24, 0.25, N('G', 4), 100),
            (0.36, 0.9, N('C', 5), 110),
        ],
        1: [(0.36, 0.9, p, 85) for p in (N('E', 5), N('G', 5))],
        DRUM_CH: [(0.36, 0.05, 49, 100)],  # talerz (kanał perkusji GM)
        3: [(0.36, 0.5, N('C', 3), 75)],  # kocioł
    },
    channel_programs={0: 56, 1: 61, 3: 47},  # Trumpet, Brass Section, Timpani
    tail_s=1.8,
)

# budowa: ukończenie budowy w mieście — uderzenie kotła, potem dzwonki
# rurowe (jasne „gotowe!").
render_one_shot(
    'budowa', bpm=100,
    channel_events={
        0: [(0.0, 0.35, N('C', 3), 85)],
        1: [(0.22, 0.6, N('C', 5), 90), (0.34, 0.7, N('G', 5), 85)],
    },
    channel_programs={0: 47, 1: 14},  # Timpani, Tubular Bells
    tail_s=1.6,
)

# ============================================================
# Muzyka mapy przygody — a-moll, spokojnie, przestrzennie: pad smyczków,
# harfa w tle, pojedyncze wezwanie rogu, miękki kocioł na akcent.
# ============================================================
BPM_MAPA = 60
akordy_mapa = [
    (N('A', 2), N('C', 3), N('E', 3)),  # Am
    (N('F', 2), N('A', 2), N('C', 3)),  # F
    (N('C', 3), N('E', 3), N('G', 3)),  # C
    (N('G', 2), N('B', 2), N('D', 3)),  # G
    (N('D', 3), N('F', 3), N('A', 3)),  # Dm
    (N('A', 2), N('C', 3), N('E', 3)),  # Am
]
smyczki, harfa, rog, kociol, chor = [], [], [], [], []
for i, (r, t3, p5) in enumerate(akordy_mapa):
    bar_t = i * 4.0
    for p in (r, t3, p5):
        smyczki.append((bar_t, 3.9, p, 42))
    arp = [r + 12, t3 + 12, p5 + 12, r + 24, p5 + 12, t3 + 12, r + 12, p5 + 12]
    for j, p in enumerate(arp):
        harfa.append((bar_t + j * 0.5, 0.45, p, 55 + (j % 3) * 5))
    if i in (1, 3, 5):
        rog.append((bar_t, 3.6 if i != 5 else 3.9, p5 + 12, 58))
    if i in (0, 2, 4):
        kociol.append((bar_t, 0.4, r - 12, 42))
    if i >= 2:
        chor.append((bar_t, 3.9, r, 28))
        chor.append((bar_t, 3.9, p5, 26))

render_loop(
    'muzyka-mapa', BPM_MAPA,
    channel_events={0: smyczki, 1: harfa, 2: rog, 3: kociol, 4: chor},
    channel_programs={0: 48, 1: 46, 2: 60, 3: 47, 4: 52},
    channel_gain={0: 85, 1: 90, 2: 95, 3: 80, 4: 55},
    loop_len_s=24.0,
)

# ============================================================
# Muzyka miasta — C-dur, cieplej i żywiej: pizzicato niesie rytm, pad
# smyczków w tle, flet gra po dźwiękach akordu, dzwonki jako błysk.
# ============================================================
BPM_MIASTO = 100
akordy_miasto = [
    (N('C', 3), N('E', 3), N('G', 3)),  # C
    (N('G', 2), N('B', 2), N('D', 3)),  # G
    (N('A', 2), N('C', 3), N('E', 3)),  # Am
    (N('F', 2), N('A', 2), N('C', 3)),  # F
    (N('C', 3), N('E', 3), N('G', 3)),  # C
    (N('G', 2), N('B', 2), N('D', 3)),  # G
    (N('A', 2), N('C', 3), N('E', 3)),  # Am
    (N('F', 2), N('A', 2), N('C', 3)),  # F
    (N('D', 3), N('F', 3), N('A', 3)),  # Dm
    (N('G', 2), N('B', 2), N('D', 3)),  # G
]
pizz, pad, flet, dzwon = [], [], [], []
BEAT = 60 / BPM_MIASTO
for i, (r, t3, p5) in enumerate(akordy_miasto):
    bar_t = i * 4 * BEAT
    for beat, p in enumerate([r, p5, r + 12, p5]):
        pizz.append((bar_t + beat * BEAT, BEAT * 0.55, p, 70))
    for p in (r, t3, p5):
        pad.append((bar_t, 4 * BEAT - 0.05, p, 34))
    flet.append((bar_t, BEAT, t3 + 12, 62))
    flet.append((bar_t + BEAT, BEAT, p5 + 12, 60))
    flet.append((bar_t + 2 * BEAT, 2 * BEAT - 0.05, r + 24, 65))
    if i % 2 == 0:
        dzwon.append((bar_t, 0.3, p5 + 12, 60))

render_loop(
    'muzyka-miasto', BPM_MIASTO,
    channel_events={0: pizz, 1: pad, 2: flet, 3: dzwon},
    channel_programs={0: 45, 1: 48, 2: 73, 3: 9},
    channel_gain={0: 95, 1: 65, 2: 95, 3: 75},
    loop_len_s=24.0,
)

print('gotowe')
