# Prompty do grafik: klucze, więzienie, jasnowidz, tereny, relikty, wróg

Druga lista zakupów u modelu graficznego — tym razem pod notatkę buildera mapy
(strażnice, drugi bohater, chata jasnowidza, trzy tereny, relikty, ulepszenia
siedlisk i przeciwnik, który gra).

Pierwsza lista i jej prompty: `tools/PROMPTY-BUDYNKI.md`. Droga do gry ta sama:
plik ląduje w `tools/wsad/` pod nazwą z tabeli, a `python3 tools/wsad_wczytaj.py`
przycina go, skaluje i kładzie w `public/mapa/`.

## Zasady, bez których wsad trzeba poprawiać ręcznie

Trzy usterki z poprzedniej dostawy kosztowały osobny commit naprawczy
(`8a5b0ae`). Wszystkie trzy da się wyprzedzić w prompcie:

1. **Prawdziwa przezroczystość albo białe tło — nigdy szachownica.** Osiem
   plików miało kratkę „przezroczystości" NAMALOWANĄ w pikselach i na mapie
   stał szary prostokąt. Skrypt umie ją dziś wyciąć, ale wycina po barwie,
   więc jasnoszare fragmenty samej budowli są przy tym w niebezpieczeństwie.
2. **Żadnej ziemi, trawy ani podstawki pod obiektem.** Grunt jest na planszy,
   a każdy dorysowany kawałek widać jako łatę innego terenu.
3. **Żadnego cienia rzuconego.** Scena rysuje własny, miękki cień kontaktowy.
   Dwa cienie naraz wyglądają jak dwa obiekty.

Do tego jak poprzednio: widok z góry pod kątem, jak w Heroes 3; przedmiot
wypełnia kadr; nic nie jest ucięte przy krawędzi.

### Blok stylu (wklejać przed każdym promptem OBIEKTU)

```
Game asset for a children's fantasy strategy map, Heroes of Might and Magic III
adventure-map object seen from a slightly elevated three-quarter view, facing
the camera. Hand-painted storybook look: soft smoothed edges, no visible pixels,
no outline, clean readable silhouette that stays legible at 60 pixels tall.
Warm saturated palette: brown 170,108,50 / green 92,168,78 / grey 140,150,162 /
red 222,62,58 / gold 250,198,62. Soft light from the upper right, gentle ambient
occlusion, no cast shadow on the ground. TRUE ALPHA TRANSPARENCY — a real
transparent background, never a painted grey checkerboard pattern. Object
centered, bottom edge of the object touching the bottom of the frame, nothing
cropped. No ground patch, no grass, no base plate, no text, no logos, no UI.
```

---

## 1. Strażnica graniczna i namiot klucznika

Najważniejszy punkt notatki i jedyny, który zmienia pytanie mapy z „czy mam
armię" na „gdzie jest klucz". Mechanicznie to jeden nowy rodzaj obiektu w parze:
strażnicy NIE da się pokonać, otwiera ją posiadanie klucza z namiotu w innej
części mapy.

Barwa klucza musi być czytelna z odległości, ale **nie prosimy o trzy wersje
każdego pliku** — dostajemy po jednej i przemalowujemy w `frakcje_przemaluj.py`
tak samo, jak robią to kopalnie. Dlatego oba obiekty mają mieć **wyraźny,
jednolity element w barwie klucza** (chorągiew na strażnicy, płótno namiotu),
resztę w barwach neutralnych — drewno, kamień.

| Plik | Co to jest | Bryła |
|---|---|---|
| `straznica.png` | zapora, której się nie bije | 3 × 1, wejście na dole |
| `namiot-klucznika.png` | źródło klucza | 1 × 1 |

**Strażnica graniczna** — `straznica.png`
```
A fortified border checkpoint blocking a mountain road: two squat stone towers
with crenellated tops standing on either side of a heavy closed wooden gate
banded with iron, a large ornate keyhole plate in the centre of the gate, a
single big rectangular banner of flat solid colour hanging from a crossbeam
above the gate (one plain untextured colour field, easy to recolour), small
lanterns on the towers, unlit. The gate is shut and looks unbreakable.
```

**Namiot klucznika** — `namiot-klucznika.png`
```
A small round travellers tent of flat solid-coloured canvas (one plain
untextured colour field, easy to recolour) with a wooden pole and an open
entrance flap, a large ornate golden key hanging from the pole on a cord, a
wooden chest and a rolled blanket beside the entrance, a small pennant on top.
```

## 2. Więzienie i drugi bohater

Więzienie to jedna bryła, ale **drugi bohater to arkusz póz**, a nie jeden
obrazek: `tools/bohater_wczytaj.py` składa chód 4 × 4 z trzech statycznych ujęć
(lewy profil robi z odbicia prawego). Potrzebne są więc trzy pliki w tej samej
skali i z tą samą postacią.

| Plik | Co to jest |
|---|---|
| `wiezienie.png` | budowla na mapie, 2 × 1 |
| `bohaterka-dol.png` | postać przodem do kamery |
| `bohaterka-gora.png` | ta sama postać tyłem |
| `bohaterka-prawo.png` | ta sama postać z profilu, idąca w prawo |

**Więzienie** — `wiezienie.png`
```
A small grim stone prison built into a rocky outcrop: heavy dark stone blocks,
one barred iron window high on the wall, a massive iron-banded door with a big
padlock and chains, a stone buttress on one side, dead ivy climbing the corner,
a raven perched on the roof ridge. Sombre but not frightening, storybook scale.
```

**Drugi bohater (trzy ujęcia)** — `bohaterka-dol.png`, `bohaterka-gora.png`, `bohaterka-prawo.png`
```
Full-body character sprite of a young pokemon trainer girl, about ten years old,
short dark hair under a green cap, teal jacket with white sleeves, dark shorts,
tall boots, a satchel on one hip. Cheerful, standing upright, arms relaxed.
Drawn small and simple enough to read at 55 pixels tall. Same character, same
outfit, same proportions and same scale in all three images; only the direction
changes: FRONT view facing the camera / BACK view seen from behind / SIDE view
walking to the right. Plain white background, no shadow, no ground.
```
*(Uwaga: tu proszę o BIAŁE tło, nie przezroczyste — tak samo jak przy pierwszym
bohaterze. `bohater_wczytaj.py` wycina je wypełnieniem od krawędzi, a przy
postaci z dużą ilością jasnych fragmentów to wychodzi pewniej niż alfa z modelu.)*

## 3. Chata jasnowidza

Jedyny obiekt w Heroes 3, który każe wrócić w to samo miejsce po raz drugi:
„przynieś X, dostaniesz Y". Grafika ma to zapowiadać — chata z czymś do oddania
przy progu.

| Plik | Bryła |
|---|---|
| `chata-jasnowidza.png` | 1 × 1 |

```
A witchs cottage on the edge of a wood: crooked wooden walls, a steep mossy
shingle roof with a bent stone chimney, one round window glowing warm yellow, a
porch with a small table holding a glowing crystal ball, bundles of dried herbs
and a lantern hanging from the eaves, a wooden signboard with a painted eye.
Friendly and curious rather than sinister.
```

## 4. Trzy nowe tereny

Tekstury, nie obiekty — **inny format i inny blok stylu**. Muszą być
kafelkowalne (skrypt układa je obok siebie po całej planszy) i bez żadnych
obiektów, bo drzewa, głazy i kępy scena stawia osobno.

| Plik | Teren | Koszt ruchu w Heroes 3 |
|---|---|---|
| `teren-bagno.png`, `teren-bagno2.png` | bagno | 175% — najdroższy |
| `teren-snieg.png`, `teren-snieg2.png` | śnieg | 150% |
| `teren-jalowa.png`, `teren-jalowa2.png` | ziemia jałowa | 125% |

Blok stylu dla tekstur:
```
Seamless tileable top-down terrain texture for a hand-painted fantasy strategy
map, 1024 x 1024, edges matching perfectly on all four sides so it can be tiled
without visible seams. Painted storybook style, soft brush detail, even lighting
with no directional shadows, no objects, no rocks, no trees, no paths, no
characters, no vignette, no border. Flat overhead view of the ground only.
```

Do tego, po jednym na teren:
- **bagno** — `dark wet marsh: murky olive-brown water between hummocks of
  coarse grass, patches of duckweed, half-sunken roots, muddy sheen`
- **śnieg** — `fresh snow cover: soft blue-white drifts with gentle wind ripples,
  a few frozen grass tufts poking through, cold bluish shadows in the hollows`
- **ziemia jałowa** — `barren cracked earth: dry grey-brown dirt with a network
  of cracks, scattered pebbles, a few dead twigs, no green at all`

Wariant drugi (`…2.png`) to ta sama tekstura namalowana od nowa, nie przesunięta
— warianty służą do rozbijania powtarzalności, więc mają się różnić plamami.

## 5. Relikty z realnym efektem

Artefakty rysują się dziś jednym obrazkiem kamienia ewolucji — wszystkie osiem.
Relikt, który ma zmieniać grę, musi się różnić także wyglądem, i to dwa razy:
na mapie i w karcie bohatera.

Prosimy o **jeden plik na relikt**, kwadratowy, z przedmiotem pośrodku — skrypt
zrobi z niego i sprite mapy, i ikonę panelu.

| Plik | Relikt | Do czego zmierza efekt |
|---|---|---|
| `relikt-pas.png` | Pas Mistrza Areny | siła w bitwie |
| `relikt-skrzydla.png` | Skrzydła Latającego | zasięg i ruch |
| `relikt-rog.png` | Róg Przywołania | wojsko |
| `relikt-kompas.png` | Kompas Odkrywcy | widzenie mapy |

```
A single legendary treasure item floating slightly, seen from a three-quarter
angle, filling a square frame: <PRZEDMIOT>. Ornate, jewelled, clearly more
precious than ordinary gear, with a soft magical glow and a few sparkles around
it. No pedestal, no ground, no hands, no character.
```
Za `<PRZEDMIOT>` wstawić kolejno:
- `a champions belt of thick red leather with a huge golden buckle shaped like a roaring beast, set with a ruby`
- `a pair of feathered wings of white and sky-blue plumage, joined by a golden clasp`
- `a curved hunting horn of polished ivory with golden bands and a green strap`
- `an open brass compass with a glowing blue needle and an engraved star rose on the lid`

## 6. Ulepszone siedliska i wrogi bohater

Dwie ostatnie pozycje notatki wymagają grafik z innej półki niż mapa.

**Ulepszenia siedlisk** (kamienie ewolucji wreszcie mają na co iść) to bryły
**na panoramę miasta**, nie na mapę — inny kadr, inne oświetlenie, te same
zasady co przy `siedlisko1…6`. Zaczynamy od trzech najwyższych poziomów, bo
tam różnica ma być widoczna:

| Plik | Co to jest |
|---|---|
| `siedlisko4u.png` | ulepszone siedlisko poziomu 4 |
| `siedlisko5u.png` | ulepszone siedlisko poziomu 5 |
| `siedlisko6u.png` | ulepszone siedlisko poziomu 6 |

```
Upgraded version of a fantasy creature dwelling for a storybook town panorama,
seen from a slightly elevated three-quarter view: the same building type as a
simple woodland lair but visibly richer — carved stone foundations instead of
bare earth, banners, lanterns, gilded ornaments on the roof, a larger and taller
silhouette. Hand-painted, warm palette, evening light from the right. TRUE ALPHA
TRANSPARENCY, no checkerboard, no ground, no cast shadow.
```

**Wrogi bohater** — przeciwnik, który naprawdę rusza się po mapie, potrzebuje
własnej postaci w tym samym układzie trzech ujęć, co drugi bohater:
`wrog-dol.png`, `wrog-gora.png`, `wrog-prawo.png`.
```
Full-body character sprite of a rival pokemon trainer boy, about twelve years
old, spiky purple hair, black and violet jacket with a high collar, dark
trousers, confident smirk, one hand in a pocket. Same scale and proportions as
the other trainer sprites, readable at 55 pixels tall. Same character in all
three images; only the direction changes: FRONT / BACK / SIDE walking right.
Plain white background, no shadow, no ground.
```

---

## Czego z tej listy NIE trzeba rysować

Żeby builder wiedział, na co nie czekać:

- **Przeciwnik, który gra** to sam kod — ruch po trasie, zajmowanie kopalń,
  rekrutacja w swoim zamku. Grafiki potrzebuje tylko na sam sprite bohatera
  (wyżej), i to dopiero wtedy, gdy ma być widoczny na mapie, a nie liczony
  w tle.
- **Koszty ruchu nowych terenów** (175 / 150 / 125 procent) to trzy liczby
  w `zasady-h3.ts`; czekają wyłącznie na tekstury, bo bez nich nie ma czego
  postawić na planszy.
- **Efekty reliktów** siedzą w `statystyki` i w `odwiedz` — da się je zrobić
  i sprawdzić sondą, zanim przyjdzie choć jeden obrazek. Nowe grafiki zamieniają
  wtedy wspólny kamień ewolucji na własny sprite i tyle.
- **Chata jasnowidza, więzienie i strażnica** mają mechaniki niezależne od
  rysunku: zadanie „przynieś i wróć", drugi bohater w drużynie i klucz
  otwierający przejście. Kolejność jest dowolna — grafiki można podmienić
  później, ale dopóki ich nie ma, obiekt rysuje się cudzym sprite'em i na mapie
  wygląda na usterkę, więc nie wchodzi do gry.
