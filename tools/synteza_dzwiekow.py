"""
Syntezator placeholderowych dźwięków dla mapy przygody i miasta.

Sieć nie przepuszcza kenney.nl/opengameart.org z tego środowiska (proxy
403), więc nie da się pobrać prawdziwych próbek CC0 tak jak zrobił to
builder walki. Te pliki to WYGENEROWANE placeholdery — czysta synteza,
zero praw autorskich, do podmiany na prawdziwe próbki w tym samym stylu
(Kenney RPG Audio / Interface Sounds), gdy będzie dostęp do sieci.

Pętle (ambient, muzyka) są matematycznie bezszwowe: każda składowa ma
częstotliwość będącą całkowitą wielokrotnością 1/T, więc cały przebieg
jest dokładnie okresowy w T sekund i Phaser może go zapętlać (`loop:true`)
bez kliknięcia na złączeniu.
"""
import math
import random
import struct
import wave

SR = 44100


def snap(freq, T):
    """Zaokrągla częstotliwość do najbliższej wielokrotności 1/T, żeby
    składowa mieściła się w T sekund całkowitą liczbę razy."""
    f0 = 1.0 / T
    return max(f0, round(freq / f0) * f0)


def silence(T):
    return [0.0] * int(round(T * SR))


def tone_env(freq, T, amp=1.0, attack=0.01, decay=0.15, sustain=0.0, release=0.05, phase=0.0, harmonics=None):
    """Ton z obwiednią ADSR (bez pętli - do zdarzeń jednorazowych)."""
    n = int(round(T * SR))
    out = [0.0] * n
    harmonics = harmonics or [(1.0, 1.0)]
    for i in range(n):
        t = i / SR
        s = 0.0
        for mult, hamp in harmonics:
            s += hamp * math.sin(2 * math.pi * freq * mult * t + phase)
        s /= sum(h for _, h in harmonics)
        a_n = int(attack * SR)
        d_n = int(decay * SR)
        r_n = int(release * SR)
        if i < a_n:
            e = i / max(1, a_n)
        elif i < a_n + d_n:
            e = 1.0 - (1.0 - sustain) * (i - a_n) / max(1, d_n)
        elif i < n - r_n:
            e = sustain
        else:
            e = sustain * max(0.0, (n - i) / max(1, r_n))
        out[i] += s * e * amp
    return out


def noise_burst(T, amp=1.0, decay=6.0, lowpass=1):
    n = int(round(T * SR))
    raw = [random.uniform(-1, 1) for _ in range(n)]
    if lowpass > 1:
        filt = []
        acc = 0.0
        for i, v in enumerate(raw):
            acc += (v - acc) / lowpass
            filt.append(acc)
        raw = filt
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        e = math.exp(-decay * t)
        out[i] = raw[i] * e * amp
    return out


def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, v in enumerate(l):
            out[i] += v
    return out


def add_at(base, layer, offset_s):
    off = int(round(offset_s * SR))
    for i, v in enumerate(layer):
        j = i + off
        if j < len(base):
            base[j] += v
    return base


def normalize(samples, peak=0.9):
    m = max((abs(v) for v in samples), default=0.0)
    if m < 1e-9:
        return samples
    k = peak / m
    return [v * k for v in samples]


def periodic_pad(T, chord_freqs, amp=0.5, voices=3, detune_cents=6, seed=0):
    """Pad muzyczny: każda nuta akordu jako kilka lekko rozstrojonych
    głosów sinusoidalnych, wszystkie zaokrąglone do 1/T, więc T sekund
    zapętla się bez kliknięcia."""
    rnd = random.Random(seed)
    n = int(round(T * SR))
    out = [0.0] * n
    for base_freq in chord_freqs:
        for v in range(voices):
            cents = (v - (voices - 1) / 2) * detune_cents
            f = snap(base_freq * (2 ** (cents / 1200)), T)
            phase = rnd.uniform(0, 2 * math.pi)
            a = amp / (len(chord_freqs) * voices)
            for i in range(n):
                t = i / SR
                out[i] += a * math.sin(2 * math.pi * f * t + phase)
    return out


def periodic_colored_noise(T, amp=0.3, fmin=40, fmax=900, n_components=90, slope=1.0, seed=0):
    """Szum zbudowany z sinusoid o częstotliwościach k/T — zapętla się
    idealnie, bo cały przebieg jest okresowy w T sekund."""
    rnd = random.Random(seed)
    n = int(round(T * SR))
    out = [0.0] * n
    f0 = 1.0 / T
    k_min = max(1, int(fmin / f0))
    k_max = int(fmax / f0)
    ks = rnd.sample(range(k_min, k_max), min(n_components, k_max - k_min))
    for k in ks:
        f = k * f0
        a = amp * (fmin / f) ** slope
        phase = rnd.uniform(0, 2 * math.pi)
        for i in range(n):
            t = i / SR
            out[i] += a * math.sin(2 * math.pi * f * t + phase)
    return normalize(out, peak=amp)


def slow_lfo_am(samples, T, rate_hz, depth=0.35, seed=0):
    """Modulacja amplitudy o wolnym LFO, też zaokrąglonym do 1/T, żeby
    nie psuć okresowości."""
    f = snap(rate_hz, T)
    n = len(samples)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        lfo = 1.0 - depth + depth * (0.5 + 0.5 * math.sin(2 * math.pi * f * t))
        out[i] = samples[i] * lfo
    return out


def write_wav(path, samples, peak=0.9):
    samples = normalize(samples, peak=peak)
    data = struct.pack('<%dh' % len(samples), *(int(max(-1.0, min(1.0, v)) * 32767) for v in samples))
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


OUT = 'public/audio'

# ---- krok-mapa: miękki krok po trawie, cichszy i bardziej stłumiony niż
# krok oddziału w walce (który jest szeleszczącą tkaniną). ----
krok = noise_burst(0.11, amp=0.9, decay=26, lowpass=5)
write_wav(f'{OUT}/krok-mapa.wav', krok)

# ---- zajecie: zajęcie kopalni / gniazda — trzy narastające dźwięki,
# jak wciągnięcie flagi. ----
zaj = [0.0] * int(0.62 * SR)
for i, (f, t0) in enumerate([(392.0, 0.0), (523.25, 0.09), (659.25, 0.18)]):
    add_at(zaj, tone_env(f, 0.35, amp=0.55, attack=0.01, decay=0.12, sustain=0.25, release=0.18,
                          harmonics=[(1, 1.0), (2, 0.35), (3, 0.15)]), t0)
write_wav(f'{OUT}/zajecie.wav', zaj)

# ---- zbior: podniesienie surowca / artefaktu — pojedynczy jasny dzwonek. ----
zbior = tone_env(880.0, 0.24, amp=0.7, attack=0.004, decay=0.08, sustain=0.1, release=0.14,
                  harmonics=[(1, 1.0), (2, 0.5), (4, 0.2)])
write_wav(f'{OUT}/zbior.wav', zbior)

# ---- wejscie: wejście do budowli / bramy zamku — miękkie stuknięcie. ----
wejscie = mix(
    tone_env(196.0, 0.2, amp=0.5, attack=0.005, decay=0.09, sustain=0.0, release=0.08,
              harmonics=[(1, 1.0), (2, 0.3)]),
    noise_burst(0.06, amp=0.4, decay=45, lowpass=3),
)
write_wav(f'{OUT}/wejscie.wav', wejscie)

# ---- awans: fanfara na okno awansu — bieg czterech dźwięków w górę
# i akord na koniec. ----
awans = [0.0] * int(1.1 * SR)
bieg = [392.0, 493.88, 587.33, 783.99]
for i, f in enumerate(bieg):
    add_at(awans, tone_env(f, 0.22, amp=0.55, attack=0.005, decay=0.1, sustain=0.15, release=0.1,
                            harmonics=[(1, 1.0), (2, 0.4), (3, 0.15)]), i * 0.1)
for f in [523.25, 659.25, 783.99]:
    add_at(awans, tone_env(f, 0.55, amp=0.4, attack=0.01, decay=0.2, sustain=0.35, release=0.3,
                            harmonics=[(1, 1.0), (2, 0.3)]), 0.42)
write_wav(f'{OUT}/awans.wav', awans)

# ---- budowa: ukończenie budynku w mieście — stuk młotka i jasny dzwon. ----
budowa = mix(
    noise_burst(0.09, amp=0.6, decay=30, lowpass=4),
    tone_env(146.83, 0.14, amp=0.35, attack=0.002, decay=0.06, sustain=0.0, release=0.06,
              harmonics=[(1, 1.0), (2, 0.4)]),
)
dzwon = tone_env(659.25, 0.5, amp=0.5, attack=0.005, decay=0.18, sustain=0.2, release=0.28,
                  harmonics=[(1, 1.0), (2, 0.4), (3, 0.2)])
budowa = mix(budowa, silence(0.22))
add_at(budowa, dzwon, 0.2)
write_wav(f'{OUT}/budowa.wav', budowa)

# ---- ambient-kopalnia: niski, zapętlony pomruk pod kopalnią. ----
T_amb = 4.0
kop = mix(
    periodic_pad(T_amb, [55.0, 82.5], amp=0.35, voices=2, detune_cents=8, seed=1),
    periodic_colored_noise(T_amb, amp=0.22, fmin=60, fmax=500, n_components=60, slope=1.2, seed=2),
)
write_wav(f'{OUT}/ambient-kopalnia.wav', kop, peak=0.6)

# ---- ambient-wieza: wiatr na wieży obserwacyjnej, wolno „oddycha". ----
wieza = periodic_colored_noise(T_amb, amp=0.4, fmin=200, fmax=4000, n_components=110, slope=1.4, seed=3)
wieza = slow_lfo_am(wieza, T_amb, rate_hz=0.25, depth=0.5)
write_wav(f'{OUT}/ambient-wieza.wav', wieza, peak=0.55)

# ---- muzyka-mapa: spokojny, zapętlony podkład ekranu mapy przygody. ----
T_mapa = 24.0
progresja = [
    (110.0, 130.81, 164.81),   # Am
    (87.31, 130.81, 174.61),   # F
    (65.41, 98.0, 130.81),     # C
    (98.0, 123.47, 146.83),    # G
]
mapa = [0.0] * int(round(T_mapa * SR))
odc = T_mapa / len(progresja)
for i, akord in enumerate(progresja):
    warstwa = periodic_pad(T_mapa, akord, amp=0.5, voices=3, detune_cents=5, seed=10 + i)
    obw = slow_lfo_am(warstwa, T_mapa, rate_hz=1 / T_mapa, depth=1.0)
    # Bramka amplitudy, żeby akord narastał i gasł w swoim wycinku pętli —
    # też okresowa (jeden pełny cykl na T_mapa), więc pętla zostaje szwem wolnym.
    n = len(mapa)
    for j in range(n):
        t = j / SR
        faza = ((t - i * odc) % T_mapa) / odc
        env = math.sin(math.pi * min(1.0, max(0.0, faza))) if 0 <= faza <= 1 else 0.0
        mapa[j] += warstwa[j] * env
wiatr_tlo = periodic_colored_noise(T_mapa, amp=0.05, fmin=80, fmax=1200, n_components=70, slope=1.3, seed=20)
mapa = mix(mapa, wiatr_tlo)
write_wav(f'{OUT}/muzyka-mapa.wav', mapa, peak=0.5)

# ---- muzyka-miasto: cieplejszy podkład ekranu miasta, inny charakter
# (dłuższe narastanie, wyższe głosy) niż mapa, żeby dwa ekrany się nie myliły. ----
T_miasto = 24.0
progresja_m = [
    (130.81, 164.81, 196.0),   # C
    (98.0, 146.83, 196.0),     # G
    (110.0, 164.81, 220.0),    # Am
    (87.31, 130.81, 174.61),   # F
]
miasto = [0.0] * int(round(T_miasto * SR))
odc_m = T_miasto / len(progresja_m)
for i, akord in enumerate(progresja_m):
    warstwa = periodic_pad(T_miasto, akord, amp=0.55, voices=4, detune_cents=7, seed=30 + i)
    n = len(miasto)
    for j in range(n):
        t = j / SR
        faza = ((t - i * odc_m) % T_miasto) / odc_m
        env = math.sin(math.pi * min(1.0, max(0.0, faza))) if 0 <= faza <= 1 else 0.0
        miasto[j] += warstwa[j] * env
dzwonki = periodic_pad(T_miasto, [523.25, 659.25], amp=0.06, voices=1, detune_cents=0, seed=40)
miasto = mix(miasto, dzwonki)
write_wav(f'{OUT}/muzyka-miasto.wav', miasto, peak=0.5)

print('gotowe')
