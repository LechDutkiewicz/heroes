#!/usr/bin/env python3
"""WAV z generatorów dźwięku → OGG (gra) + MP3 (Safari bez Vorbisa).

Generatory (`synteza_dzwiekow.py`, `muzyka_fluidsynth.py`, `muzyka_wynik.py`)
piszą `public/audio/*.wav`. WAV-y ważyły razem 18 MB na każdą kopię strony,
więc gra wczytuje `[.ogg, .mp3]` — Phaser bierze pierwszy, który przeglądarka
umie odtworzyć. OGG zapętla się bez przerwy (MP3 ma ciszę kodera na styku).

    pip install imageio-ffmpeg
    python3 tools/audio_kompresja.py      # konwertuje i usuwa WAV-y
"""
import subprocess
from pathlib import Path

import imageio_ffmpeg

AUDIO = Path(__file__).resolve().parent.parent / 'public' / 'audio'
FF = imageio_ffmpeg.get_ffmpeg_exe()

for wav in sorted(AUDIO.glob('*.wav')):
    for ext, kodek in (('ogg', ['-c:a', 'libvorbis', '-q:a', '4']), ('mp3', ['-c:a', 'libmp3lame', '-q:a', '5'])):
        subprocess.run([FF, '-loglevel', 'error', '-y', '-i', str(wav), *kodek, str(wav.with_suffix(f'.{ext}'))], check=True)
    wav.unlink()
    print(f'  {wav.stem}: ogg + mp3')
