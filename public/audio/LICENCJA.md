# Dźwięki — pochodzenie i licencja

## Muzyka

`motyw-bitwy.ogg` to **„Cynic Battle Loop"** z OpenGameArt, licencja
**CC0 1.0** — <https://opengameart.org/content/cynic-battle-loop>.

Wybrany za długość, nie za charakter: 92 sekundy. Krótsze pętle (znalezione
kandydatki miały po 30-40 s) obracają się w typowej bitwie kilka razy i to
słychać. Podmiana utworu to podłożenie innego pliku pod tę samą nazwę
i poprawienie stałej `MUZYKA` w `src/audio/sfx.ts`.

## Efekty

Pozostałe pliki w tym katalogu pochodzą z darmowych paczek Kenneya
(<https://kenney.nl>) i są objęte licencją **CC0 1.0 Universal** — czyli
zrzeczeniem się praw autorskich. Wolno ich używać komercyjnie, zmieniać
i rozpowszechniać, bez podawania źródła.

Podajemy je mimo to. CC0 nie wymaga podpisu, ale ktoś tę pracę wykonał
i oddał za darmo — a przy okazji dzięki temu wiadomo, skąd wziąć więcej
w tym samym stylu, gdyby paleta dźwięków miała się rozrosnąć.

Paczki źródłowe:

- **Impact Sounds** — <https://kenney.nl/assets/impact-sounds>
- **RPG Audio** — <https://kenney.nl/assets/rpg-audio>

## Które to pliki

| Nasza nazwa | Plik źródłowy | Kiedy gra |
|---|---|---|
| `ciecie-1.ogg` | `knifeSlice.ogg` (RPG Audio) | zamach wręcz |
| `ciecie-2.ogg` | `knifeSlice2.ogg` (RPG Audio) | zamach wręcz |
| `ciecie-3.ogg` | `chop.ogg` (RPG Audio) | zamach wręcz |
| `trafienie-1.ogg` | `impactPunch_medium_000.ogg` | zwykłe trafienie |
| `trafienie-2.ogg` | `impactPunch_medium_003.ogg` | zwykłe trafienie |
| `trafienie-mocne.ogg` | `impactPunch_heavy_001.ogg` | trafienie z przewagą typu |
| `trafienie-slabe.ogg` | `impactSoft_medium_002.ogg` | trafienie w odporny typ |
| `przewaga.ogg` | `impactBell_heavy_002.ogg` | dzwon dokładany przy przewadze |
| `smierc.ogg` | `impactSoft_heavy_000.ogg` | zejście oddziału |
| `strzal.ogg` | `drawKnife2.ogg` (RPG Audio) | wypuszczenie pocisku |
| `pocisk.ogg` | `impactPlate_light_001.ogg` | dolot pocisku |
| `krok.ogg` | `cloth3.ogg` (RPG Audio) | przejście oddziału |

Pliki są kopiowane bez przetwarzania — zmieniona jest wyłącznie nazwa.
Zróżnicowanie brzmienia (wariant i rozstrojenie wysokości) robi kod
w `src/audio/sfx.ts`, nie edycja próbek.

## Mapa przygody i miasto — placeholdery

Pliki `krok-mapa.wav`, `zajecie.wav`, `zbior.wav`, `wejscie.wav`, `awans.wav`,
`budowa.wav`, `ambient-kopalnia.wav`, `ambient-wieza.wav`, `muzyka-mapa.wav`
i `muzyka-miasto.wav` (obsługiwane przez `src/audio/mapSfx.ts`) **nie są**
próbkami z Kenneya ani OpenGameArt — środowisko, w którym to powstawało,
nie miało dostępu do kenney.nl ani opengameart.org (proxy sieciowe
odrzucało połączenie). To wygenerowana synteza, zrobiona skryptem
`tools/synteza_dzwiekow.py`. Zero praw autorskich osób trzecich, ale też
nie ten sam poziom brzmienia co reszta katalogu — nadaje się jako
funkcjonalny placeholder, nie jako cel.

Pierwsza wersja tego skryptu sumowała gołe sinusoidy (zdarzenia) i po kilka
rozstrojonych głosów sinusoidalnych na akord (muzyka) — to drugie brzmiało
jak buczenie, bo bliskie częstotliwości grane naraz dudnią. Druga wersja
renderuje próbki silnikiem **ZzFX** (Frank Force, MIT,
<https://github.com/KilledByAPixel/ZzFX>) — syntezatorem zaprojektowanym
pod gry, z obwiednią ataku/zaniku/podtrzymania/wybrzmienia, slajdem
wysokości i kilkoma kształtami fali zamiast gołego sinusa — a muzykę
buduje jako rzadką melodię (jeden bas-dron pod akordem plus pojedyncze
szarpnięcia na wierzchu), nie jako ciągły, wielogłosowy akord. `zzfx_build`
w skrypcie to port matematyki `ZZFX.buildSamples` z ZzFX.js, bez zależności
od `AudioContext` — żeby dało się to odpalić w Pythonie, offline.

Podmiana na docelowe próbki, gdy będzie dostęp do sieci: te same nazwy
plików w tym katalogu (rozszerzenie może zostać `.wav` albo zmienić się na
`.ogg` — wtedy dopisać rozszerzenie też w `loadSfx` w `src/audio/mapSfx.ts`).
Dobrzy kandydaci w tym samym stylu co reszta:

- krótkie zdarzenia (krok, zajęcie, zbiór, wejście, awans, budowa) — paczki
  Kenneya **RPG Audio** i **Interface Sounds** (<https://kenney.nl>, CC0);
- ambient budowli i podkład mapy/miasta — pętle z OpenGameArt w tagu
  `ambient`/`loop`, licencja CC0 lub CC-BY (z podpisem w tej tabeli).
