"""
Syntezator placeholderowych dźwięków dla mapy przygody i miasta.

Sieć nie przepuszcza kenney.nl/opengameart.org z tego środowiska (proxy
403), więc nie da się pobrać prawdziwych próbek CC0 tak jak zrobił to
builder walki. Te pliki to WYGENEROWANE placeholdery, do podmiany na
prawdziwe próbki w tym samym stylu (Kenney RPG Audio / Interface Sounds),
gdy będzie dostęp do sieci — patrz `public/audio/LICENCJA.md`.

DRUGIE PODEJŚCIE: pierwsza wersja (czyste sumy sinusoid, w tym akordy
z kilkoma rozstrojonymi głosami na nutę) brzmiała jak buczenie — bliskie
częstotliwości w wielu jednoczesnych głosach dudnią, a to właśnie słychać
jako „buczenie". Ta wersja renderuje dźwięki silnikiem ZzFX (Frank Force,
MIT, https://github.com/KilledByAPixel/ZzFX) — syntezatorem zaprojektowanym
pod gry (obwiednia ataku/zaniku/podtrzymania/wybrzmienia, slajd wysokości,
kilka kształtów fali, filtr biquad) zamiast gołych sinusoid, a muzyka to
rzadka, wyartykułowana melodia (bas-dron + pojedyncze szarpnięcia), nie
ciągły akord. `zzfx_build` niżej to wierny port `ZZFX.buildSamples`
z ZzFX.js (MIT) — sama matematyka, bez AudioContext.
"""
import math
import random
import struct
import wave

SR = 44100
PI2 = 2 * math.pi


def sign(v):
    return -1 if v < 0 else 1


def zzfx_build(
    volume=1, randomness=0.05, frequency=220, attack=0, sustain=0, release=0.1,
    shape=0, shape_curve=1, slide=0, delta_slide=0, pitch_jump=0, pitch_jump_time=0,
    repeat_time=0, noise=0, modulation=0, bit_crush=0, delay=0, sustain_volume=1,
    decay=0, tremolo=0, filt=0, seed=None,
):
    """Port `ZZFX.buildSamples` (ZzFX.js) — sama synteza próbek, bez
    AudioContext. Parametry i kolejność jak w oryginale."""
    rnd = random.Random(seed)

    slide = slide * 500 * PI2 / SR / SR
    start_slide = slide
    frequency = frequency * (1 + randomness * 2 * rnd.random() - randomness) * PI2 / SR
    start_frequency = frequency

    mod_offset = 0
    repeat = 0
    crush = 0
    jump = 1

    quality = 2
    w = PI2 * abs(filt) * 2 / SR
    cosw = math.cos(w)
    alpha = math.sin(w) / 2 / quality
    a0 = 1 + alpha
    a1 = -2 * cosw / a0
    a2 = (1 - alpha) / a0
    b0 = (1 + sign(filt) * cosw) / 2 / a0
    b1 = -(sign(filt) + cosw) / a0
    b2 = b0
    x2 = x1 = y2 = y1 = 0.0

    attack_n = attack * SR or 9  # minAttack: unika kliknięcia przy ataku zerowym
    decay_n = decay * SR
    sustain_n = sustain * SR
    release_n = release * SR
    delay_n = delay * SR
    delta_slide = delta_slide * 500 * PI2 / SR ** 3
    modulation = modulation * PI2 / SR
    pitch_jump = pitch_jump * PI2 / SR
    pitch_jump_time = pitch_jump_time * SR
    repeat_time_n = int(repeat_time * SR)
    bit_crush_mod = int(bit_crush * 100)

    length = int(attack_n + decay_n + sustain_n + release_n + delay_n)
    if length <= 0:
        return []
    b = [0.0] * length
    t = 0.0
    s = 0.0

    for i in range(length):
        crush += 1
        do_update = (bit_crush_mod == 0) or (crush % bit_crush_mod == 0)
        if do_update:
            if shape == 0:
                sv = math.sin(t)
            elif shape == 1:
                sv = 1 - 4 * abs(round(t / PI2) - t / PI2)
            elif shape == 2:
                sv = 1 - (2 * t / PI2 % 2 + 2) % 2
            elif shape == 3:
                sv = max(min(math.tan(t), 1), -1)
            elif shape == 4:
                sv = math.sin(t ** 3)
            else:
                sv = ((t / PI2 % 1) < shape_curve / 2) * 2 - 1

            trem = (1 - tremolo + tremolo * math.sin(PI2 * i / repeat_time_n)) if repeat_time_n else 1
            shaped = sv if shape > 4 else sign(sv) * (abs(sv) ** shape_curve)
            sv = trem * shaped

            if i < attack_n:
                env = i / attack_n
            elif i < attack_n + decay_n:
                env = 1 - ((i - attack_n) / decay_n) * (1 - sustain_volume) if decay_n else sustain_volume
            elif i < attack_n + decay_n + sustain_n:
                env = sustain_volume
            elif i < length - delay_n:
                env = (length - i - delay_n) / release_n * sustain_volume if release_n else 0
            else:
                env = 0
            sv = sv * env

            if delay_n:
                if delay_n > i:
                    echo = 0.0
                else:
                    idx = int(i - delay_n)
                    factor = 1 if i < length - delay_n else (length - i) / delay_n
                    echo = factor * (b[idx] / 2 / volume if volume else 0)
                sv = sv / 2 + echo

            if filt:
                y1_new = b2 * x2 + b1 * x1 + b0 * sv - a2 * y2 - a1 * y1
                x2, x1 = x1, sv
                y2, y1 = y1, y1_new
                sv = y1

            s = sv

        b[i] = s * volume

        slide += delta_slide
        frequency += slide
        f = frequency * math.cos(modulation * mod_offset)
        mod_offset += 1
        t += f + f * noise * math.sin(i ** 5)

        if jump:
            jump += 1
            if jump > pitch_jump_time:
                frequency += pitch_jump
                start_frequency += pitch_jump
                jump = 0

        if repeat_time_n:
            repeat += 1
            if repeat % repeat_time_n == 0:
                frequency = start_frequency
                slide = start_slide
                jump = jump or 1

    return b


def silence(T):
    return [0.0] * int(round(T * SR))


def noise_burst(T, amp=1.0, decay=6.0, lowpass=1):
    n = int(round(T * SR))
    rnd = random.Random(0)
    raw = [rnd.uniform(-1, 1) for _ in range(n)]
    if lowpass > 1:
        filt = []
        acc = 0.0
        for v in raw:
            acc += (v - acc) / lowpass
            filt.append(acc)
        raw = filt
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        out[i] = raw[i] * math.exp(-decay * t) * amp
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


def fade_edges(samples, ms=120):
    """Krótkie wyciszenie na obu końcach pętli — gwarancja zera na złączeniu,
    niezależnie od tego, kiedy naprawdę dogasła ostatnia nuta."""
    n = int(SR * ms / 1000)
    out = list(samples)
    for i in range(min(n, len(out))):
        out[i] *= i / n
        out[-(i + 1)] *= i / n
    return out


def write_wav(path, samples, peak=0.9):
    samples = normalize(samples, peak=peak)
    data = struct.pack('<%dh' % len(samples), *(int(max(-1.0, min(1.0, v)) * 32767) for v in samples))
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


def periodic_colored_noise(T, amp=0.3, fmin=40, fmax=900, n_components=90, slope=1.0, seed=0):
    """Szum zbudowany z sinusoid o częstotliwościach k/T — zapętla się
    idealnie, bo cały przebieg jest okresowy w T sekund. Do ambientu."""
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


def slow_lfo_am(samples, T, rate_hz, depth=0.35):
    f = round(rate_hz * T) / T if rate_hz > 0 else 0  # zaokrąglone do 1/T, żeby nie psuć pętli
    n = len(samples)
    out = [0.0] * n
    for i in range(n):
        t = i / SR
        lfo = 1.0 - depth + depth * (0.5 + 0.5 * math.sin(2 * math.pi * f * t))
        out[i] = samples[i] * lfo
    return out


OUT = 'public/audio'

# ============================================================
# Zdarzenia jednorazowe — silnik ZzFX zamiast gołych sinusoid.
# ============================================================

# ---- zajecie: zajęcie kopalni / gniazda — flaga wciągana na maszt,
# trzy narastające uderzenia dzwonu z lekkim „skokiem" wysokości. ----
zaj = silence(0.7)
for i, (f, t0) in enumerate([(392.0, 0.0), (523.25, 0.1), (659.25, 0.2)]):
    nuta = zzfx_build(
        volume=0.7, randomness=0.02, frequency=f, attack=0.006, sustain=0.05, release=0.32,
        shape=1, shape_curve=1.1, pitch_jump=f * 0.5, pitch_jump_time=0.02,
        sustain_volume=0.5, filt=-1200, seed=i,
    )
    add_at(zaj, nuta, t0)
write_wav(f'{OUT}/zajecie.wav', zaj)

# ---- zbior: podniesienie surowca / artefaktu — klasyczny „coin pickup":
# krótki trójkątny ton ze skokiem wysokości w górę. ----
zbior = zzfx_build(
    volume=0.9, randomness=0.03, frequency=880, attack=0.002, sustain=0.05, release=0.14,
    shape=1, shape_curve=1, pitch_jump=520, pitch_jump_time=0.025, sustain_volume=0.6,
    seed=1,
)
write_wav(f'{OUT}/zbior.wav', zbior)

# ---- wejscie: wejście do budowli / bramy zamku — miękkie, stłumione
# stuknięcie (piła trójkątna przepuszczona przez dolnoprzepustowy filtr). ----
wejscie = mix(
    zzfx_build(
        volume=0.6, randomness=0.02, frequency=180, attack=0.003, sustain=0.03, release=0.13,
        shape=2, shape_curve=1, sustain_volume=0.4, filt=-2400, seed=2,
    ),
    noise_burst(0.05, amp=0.25, decay=55, lowpass=3),
)
write_wav(f'{OUT}/wejscie.wav', wejscie)

# ---- awans: fanfara na okno awansu — bieg czterech nut w górę
# (piła + skok wysokości = jasny, „dęty" charakter) i akord na koniec. ----
awans = silence(1.3)
bieg = [392.0, 493.88, 587.33, 783.99]
for i, f in enumerate(bieg):
    nuta = zzfx_build(
        volume=0.6, randomness=0.02, frequency=f, attack=0.004, sustain=0.05, release=0.16,
        shape=2, shape_curve=1.4, pitch_jump=f * 0.3, pitch_jump_time=0.03,
        sustain_volume=0.55, filt=-1800, seed=10 + i,
    )
    add_at(awans, nuta, i * 0.1)
for i, f in enumerate([523.25, 659.25, 783.99]):
    nuta = zzfx_build(
        volume=0.42, randomness=0.015, frequency=f, attack=0.01, sustain=0.25, release=0.55,
        shape=1, shape_curve=1, sustain_volume=0.5, tremolo=0.15, repeat_time=0.09,
        filt=-1500, seed=20 + i,
    )
    add_at(awans, nuta, 0.45)
write_wav(f'{OUT}/awans.wav', awans)

# ---- budowa: ukończenie budynku w mieście — stuk młotka (szum) + suchy
# stuk drewna (fala tangens) + jasny dzwon na koniec. ----
budowa = mix(
    noise_burst(0.08, amp=0.5, decay=35, lowpass=4),
    zzfx_build(
        volume=0.4, randomness=0.02, frequency=140, attack=0.002, sustain=0.02, release=0.09,
        shape=3, shape_curve=1, sustain_volume=0.3, seed=3,
    ),
)
dzwon = zzfx_build(
    volume=0.55, randomness=0.02, frequency=659.25, attack=0.006, sustain=0.15, release=0.42,
    shape=0, shape_curve=1, sustain_volume=0.45, tremolo=0.1, repeat_time=0.1, filt=-900, seed=4,
)
add_at(budowa, dzwon, 0.22)
write_wav(f'{OUT}/budowa.wav', budowa)

# ============================================================
# Ambient budowli — filtrowany szum, bez wielogłosowych dudniących padów.
# ============================================================
T_amb = 4.0
kop_rumor = periodic_colored_noise(T_amb, amp=0.3, fmin=50, fmax=380, n_components=50, slope=1.3, seed=2)
kop_dron = zzfx_build(
    volume=0.28, randomness=0, frequency=55, attack=0.5, sustain=T_amb - 1.2, release=0.6,
    shape=0, shape_curve=1, sustain_volume=1, filt=-600, seed=5,
)
kop = mix(kop_rumor, kop_dron)
write_wav(f'{OUT}/ambient-kopalnia.wav', kop, peak=0.55)

wieza = periodic_colored_noise(T_amb, amp=0.4, fmin=200, fmax=4000, n_components=110, slope=1.4, seed=3)
wieza = slow_lfo_am(wieza, T_amb, rate_hz=0.25, depth=0.5)
write_wav(f'{OUT}/ambient-wieza.wav', wieza, peak=0.5)

# ============================================================
# Muzyka mapy i miasta — rzadka melodia (bas-dron + pojedyncze
# szarpnięcia), NIE ciągły akord z wieloma bliskimi głosami. To właśnie
# wielogłosowe dudnienie brzmiało jak buczenie w poprzedniej wersji.
# ============================================================


def komponuj(T, akordy, melodia_zdarzenia, plik):
    """akordy: [(czas_start, czas_trwania, freq_basu, glosnosc)].
    melodia_zdarzenia: [(czas, freq, glosnosc, shape, decay, release, seed)]."""
    bufor = silence(T)
    for t0, dur, f, vol in akordy:
        nuta = zzfx_build(
            volume=vol, randomness=0, frequency=f, attack=min(0.6, dur * 0.15),
            sustain=max(0.05, dur - min(0.6, dur * 0.15) - 0.7), release=0.65,
            shape=0, shape_curve=1, sustain_volume=1, filt=-500, seed=int(f),
        )
        add_at(bufor, nuta, t0)
    for t0, f, vol, shape, decay, release, seed in melodia_zdarzenia:
        nuta = zzfx_build(
            volume=vol, randomness=0.01, frequency=f, attack=0.006, sustain=0.05, decay=decay,
            release=release, shape=shape, shape_curve=1, sustain_volume=0.35, filt=-1600, seed=seed,
        )
        add_at(bufor, nuta, t0)
    write_wav(plik, fade_edges(bufor, 150), peak=0.55)


# --- mapa: a-moll, wolno, przestrzennie — bas-dron pod spodem, rzadkie
# szarpnięcia melodii na skali pentatonicznej, cisza między nutami. ---
T_mapa = 24.0
akordy_mapa = [
    (0.0, 6.0, 110.0, 0.3),    # Am
    (6.0, 6.0, 87.31, 0.28),   # F
    (12.0, 6.0, 130.81, 0.26),  # C
    (18.0, 6.0, 98.0, 0.28),   # G
]
skala_mapa = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
rnd_mapa = random.Random(42)
melodia_mapa = []
for i, (t0, dur, _f, _v) in enumerate(akordy_mapa):
    ile = rnd_mapa.choice([2, 3])
    czasy = sorted(rnd_mapa.uniform(0.4, dur - 1.6) for _ in range(ile))
    for j, ct in enumerate(czasy):
        f = rnd_mapa.choice(skala_mapa)
        melodia_mapa.append((t0 + ct, f, 0.22, 1, 0.2, 0.55, 100 + i * 10 + j))
komponuj(T_mapa, akordy_mapa, melodia_mapa, f'{OUT}/muzyka-mapa.wav')

# --- miasto: C-dur, cieplej i żywiej — ten sam schemat, inna tonacja
# i gęstsza, „harfowa" melodia, żeby ekran miasta nie brzmiał jak mapa. ---
T_miasto = 24.0
akordy_miasto = [
    (0.0, 6.0, 130.81, 0.3),   # C
    (6.0, 6.0, 98.0, 0.28),    # G
    (12.0, 6.0, 110.0, 0.28),  # Am
    (18.0, 6.0, 87.31, 0.26),  # F
]
skala_miasto = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]
rnd_miasto = random.Random(7)
melodia_miasto = []
for i, (t0, dur, _f, _v) in enumerate(akordy_miasto):
    ile = rnd_miasto.choice([3, 4])
    czasy = sorted(rnd_miasto.uniform(0.3, dur - 1.4) for _ in range(ile))
    for j, ct in enumerate(czasy):
        f = rnd_miasto.choice(skala_miasto)
        melodia_miasto.append((t0 + ct, f, 0.2, 1, 0.15, 0.45, 200 + i * 10 + j))
komponuj(T_miasto, akordy_miasto, melodia_miasto, f'{OUT}/muzyka-miasto.wav')

print('gotowe')
