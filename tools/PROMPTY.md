# Prompty na grafiki gry

Komplet do wygenerowania w modelu graficznym poza tym repo. Ty generujesz,
wrzucasz pliki do `tools/wsad/`, ja resztę robię skryptem: wycinam tło,
przycinam, wyrównuję światło, wypalam cień rzucony, składam kafelki, robię
wersje frakcyjne i wpinam w grę.

Zastępuje `PROMPTY-MIASTO.md`, bo benchmark zmienił się dla CAŁEJ gry, nie
tylko dla miasta.

---

## Benchmark

**Nastrój, paleta, kompozycja i gęstość: Pokémon Mystery Dungeon: Explorers of
Sky.** Ciepło, nasycenie, przytulna ciasnota, popołudniowe światło, miasteczko,
w którym wszędzie coś stoi. Kadry leżą w `tools/reference/pmd/` — dołączaj je
do promptu, jeśli twój model przyjmuje obrazek referencyjny.

**Technika: gładka, malowana, wygładzone krawędzie — NIE pixel art.** I to nie
jest kwestia gustu: w projekcie leży 270 sprite'ów stworków, które są gładkimi
renderami, i to one są najdroższym zasobem w grze. One wyznaczają technikę.
Explorers of Sky jest pixelartowy z DS-a; postawienie naszych stworków w takim
świecie zrobiłoby z nich naklejki. Bierzemy z tej gry to, czego nam brakuje
(ciepło i gęstość), a nie to, czego mieć nie możemy (piksele).

**Drugi punkt odniesienia to nasza własna gra**: `tools/wsad/referencja-stylu.png`
zestawia stworki, mapę i ekran miasta. Nowa grafika ma stanąć obok tych stworków
i nie wyglądać jak wklejka.

Nazw handlowych w promptach świadomie nie ma — model potrafi na nich wygenerować
rzeczy zbyt bliskie cudzym projektom, a repo jest publiczne. Zamiast nazwy jest
opis wykończenia i to działa lepiej.

Prompty są po angielsku, bo modele graficzne rozumieją go wyraźnie lepiej
w opisach materiału i światła.

---

## BLOK STYLU (wklejać dosłownie do każdego promptu)

```
Style: hand-painted 2D game art for a children's creature-collecting strategy game.
Smooth anti-aliased painting, soft airbrushed shading with one clear light side and
one shadow side, warm saturated storybook palette, rounded friendly chunky shapes
with exaggerated proportions, thick beams and oversized roofs, cosy and inviting
rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves,
worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded
comic look, no photorealism, no 3D render look.
Mood reference: a warm, densely furnished Pokémon-Mystery-Dungeon-like town square
at late afternoon — every corner has something small and hand-made in it.
Readability: the silhouette must stay clear and recognisable when the image is scaled
down to 200 pixels tall.
```

Do tego, jeśli podajesz obrazek referencyjny:

```
Match the finish, palette and softness of the creatures in the reference image:
smooth airbrushed shading, no hard outlines, saturated but not neon colours,
rounded volumes, everything readable at small size.
```

---

# CZĘŚĆ I — EKRAN MIASTA

## Cztery rzeczy techniczne, które decydują o tym, czy się to wpnie

**1. Jedno ujęcie na wszystkim.** Każdy budynek widziany tak samo: jakieś 20°
z góry i 25° z boku w prawo, bez perspektywy zbieżnej. Panorama skleja bryły
z różnych miejsc ekranu; jedna widziana z innego kąta rozwala całość.

**2. Jedno światło i BEZ cienia rzuconego.** Słońce z prawej góry, ciepłe.
Cienia na ziemi ani samej ziemi pod budynkiem NIE generujemy — cień dokłada
skrypt, żeby wszystkie padały tak samo i dało się je poprawiać bez generowania
czegokolwiek od nowa.

**3. Tło do wycięcia.** Płaska magenta `#FF00FF`, bez gradientu i winiety, albo
prawdziwa przezroczystość, jeśli twój model ją zapisuje.

**4. Kotwica stylu.** Wygeneruj najpierw widok całego miasta (niżej), potem
`ratusz1`, i te dwa obrazy podawaj jako referencję do wszystkich pozostałych.
Jeden wspólny punkt odniesienia trzyma dwanaście obrazków w jednym świecie
lepiej niż powtarzany akapit tekstu.

## Kotwica stylu — widok całego miasta

Nie wchodzi do gry. Ustala paletę, światło i materiał raz.
Format: poziomy 16:10, minimum 2400 × 1500.

```
A wide establishing view of a small forest settlement belonging to creature trainers,
seen from a low hill in the late afternoon. A timber gathering hall with a mossy
shingle roof stands at the centre beside a trodden dirt path; scattered around it on
a sunlit meadow stand a few creature dwellings: a woven nest on a tree stump, a hollow
fallen log with a round door, a clear turquoise pool ringed with mossy stones, a green
dome woven from branches, and one ancient enormous tree with glowing windows in its
bark. A log palisade gate guards the back. Wooden fences, berry baskets, hanging
lanterns, drying laundry, crates and small banners fill the spaces between buildings —
the place is lived in and busy, with no empty ground anywhere. No creatures, no people.
Light: warm low afternoon sun from the upper right, long soft shadows, glowing windows.
Composition: horizon high in the frame, only a narrow strip of sky at the top.
Output: horizontal 16:10 image, at least 2400x1500, no text, no logo, no watermark,
no user interface.
[BLOK STYLU]
```

## Jedenaście budynków — Bór Szmaragdowy

Jeden komplet, w palecie Boru. Grotę i Zbocze zrobię przemalowaniem.
Format każdego: kwadrat, minimum 2048 × 2048, jeden obiekt, tło magenta.

Paleta Boru: ciepłe drewno `#B98A52`, zieleń liści `#4F9E4A`,
złote okucia `#FFC93C`, kamień `#8E8A80`.

| Plik | Rola w grze |
|---|---|
| `ratusz1.png` `ratusz2.png` `ratusz3.png` | ratusz w trzech stopniach — dochód |
| `fort.png` | fort — przyrost we wszystkich siedliskach |
| `siedlisko1.png` … `siedlisko6.png` | sześć siedlisk, poziomy oddziałów 1–6 |
| `specjalny.png` | budynek specjalny — daje jagody |
| `plac.png` | plac budowy, wspólny dla wszystkich |

Do każdego dopisz na końcu:

```
Single building only, seen from about 20 degrees above and 25 degrees to the right,
no ground, no grass, no base, no cast shadow, flat solid magenta #FF00FF background.
[BLOK STYLU]
```

**ratusz1 — Polana Zbiorów.** `A small forest gathering hall: round timber-framed hut
with a mossy shingle roof, wide open porch, hanging baskets of berries, a carved
wooden sign, warm light glowing from the windows. Humble first building of a young
settlement.`

**ratusz2 — Wielka Polana.** `The same gathering hall grown larger: two storeys,
carved timber beams, a bigger mossy roof, an upper balcony with baskets and lanterns,
a stone chimney with a wisp of smoke, a small bell under the gable. Clearly the same
building as the smaller version, expanded.`

**ratusz3 — Serce Boru.** `The grandest version of the same hall: three storeys of
carved timber grown together with a living tree, roots wrapping the stone foundation,
a golden bell tower crowned with leaves, banners, glowing lanterns, wide stone steps.`

**fort — Palisada.** `A defensive palisade gate: heavy log wall with sharpened tops,
reinforced timber gate with iron bands, two watch platforms with conical thatched roofs
and small banners, ivy creeping up the logs. Wide and low, clearly a wall not a house.`

**siedlisko1 — Gniazdo Iskier.** `A large woven nest on a broad tree stump, home to
small fire creatures: thick braided twigs, warm embers glowing between them, two large
cream-coloured eggs inside, a few scorched branches.`

**siedlisko2 — Suchy Konar.** `A hollow fallen log turned into a home: massive dry
trunk lying on its side, round carved doorway with a wooden frame, small round windows,
mushrooms and moss on the bark, a chimney pipe through the top.`

**siedlisko3 — Rosista Kotlina.** `A misty hollow pool where water creatures live:
a small round pond of clear turquoise water ringed by wet mossy boulders, reeds and
lily pads, thin mist over the surface, a little wooden jetty.`

**siedlisko4 — Strumień.** `A stream dwelling with a working water wheel: a rocky
ledge with a small waterfall, a wooden mill wheel turning in the flow, a mossy timber
hut built onto the rock, wet stones and splashing water. The wheel must read clearly
as a wheel.`

**siedlisko5 — Zielona Kopuła.** `A living green dome: a large rounded hut woven from
bent branches and thick leaves, glowing amber windows set into the weave, a mossy
entrance arch, flowering vines over the top, a small banner on a pole.`

**siedlisko6 — Prastare Drzewo.** `An ancient enormous tree that is itself a home:
massive gnarled trunk with a carved arched doorway, glowing windows in the bark at
several heights, thick spreading roots, a huge lush canopy, hanging lanterns and a rope
ladder. The tallest and most impressive building in the town.`

**specjalny — Krzew Jagodowy.** `A cultivated berry grove: a big lush berry bush heavy
with red berries on a wooden trellis, woven baskets of picked berries at its foot,
a small watering can.`

**plac — plac budowy.** `An empty building site: a shallow dug foundation pit with a
low stone footing, wooden scaffolding poles lashed with rope, planks leaning against
the frame, a bucket and a shovel, a small wooden sign on a post with a lit lantern.
Clearly a place where something will be built, with nothing built yet.`

## Trzy panoramy tła

Poziome 16:10, minimum 2400 × 1500. **Puste — bez budynków**, bo budynki
wstawia gra. Zamiast dwóch ostatnich linijek BLOKU STYLU:

```
This is a full painted background for a town screen. Horizon high in the frame, only
a narrow strip of sky at the top, the lower three quarters is open ground where
buildings will be placed later. Empty middle ground — no buildings, no houses,
no towers, no characters. Output: horizontal 16:10, at least 2400x1500, no text,
no logo, no watermark, no user interface.
```

**Bór Szmaragdowy.** `A sunlit forest clearing seen from a low hill in the late
afternoon: lush green meadow with trodden dirt paths winding through it, patches of
wildflowers and grass tufts, scattered mossy boulders, a dense wall of deciduous
forest along the horizon, warm sky with a few golden clouds.`

**Grota Księżycowa.** `An underground cavern lit by moonlight through a hole in the
ceiling: a broad floor of pale violet stone and dark sand beside a still black lake,
glowing cyan crystals in clusters, luminous mushrooms, stalactites in the far dark,
cool violet and deep blue with cyan light.`

**Zbocze Popielne.** `A volcanic slope at dusk: a wide plain of grey ash and cracked
basalt with warm orange embers glowing in the cracks, dark rocky ridges on the horizon,
a distant volcano with a soft glow, drifting smoke, warm amber and rust against a deep
orange sky.`

---

# CZĘŚĆ II — EKRAN PRZYGODY

Tu rządzą inne prawa niż w mieście i to jest najważniejsza rzecz w tym
rozdziale: **mapa jest kafelkowa**. Plansza ma 36 × 36 pól po 48 px, przewija
się, a teren składa się sam z kafelków przejściowych. **Nie da się wygenerować
jednego obrazu mapy i wstawić go do gry** — pola zmieniają koszt ruchu,
przejezdność i mgłę wojny, a mapa jest generowana proceduralnie.

Dlatego z modelu potrzebujemy DWÓCH rzeczy, a nie gotowej mapy:

1. **sześć tekstur terenu** — z nich moje skrypty tną kafelki i składają
   przejścia (kod autokafelkowania już istnieje i działa);
2. **obiekty i ozdoby jako osobne sprite'y** — dokładnie tak jak budynki.

## Sześć tekstur terenu

Format: kwadrat, minimum 2048 × 2048, **bezszwowe** (kafelkujące się).

Wspólny dodatek zamiast dwóch ostatnich linijek BLOKU STYLU:

```
This is a seamless tileable ground texture seen straight from above (top-down,
90 degrees). It must tile perfectly: the left edge continues into the right edge and
the top edge into the bottom edge, with no visible seam. Flat even ambient lighting
with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up,
NO horizon, NO perspective. Output: square, at least 2048x2048, no text, no watermark.
```

| Plik | Prompt |
|---|---|
| `teren-trawa.png` | `Lush green meadow grass seen from directly above: many small painted grass blades and tufts, subtle patches of lighter and darker green, a few tiny wildflowers and clover leaves, no bare soil.` |
| `teren-sciezka.png` | `A well-trodden dirt path seen from directly above: warm packed earth with fine gravel, faint cart ruts, a few small pebbles and scattered dry grass at the edges of the texture.` |
| `teren-piasek.png` | `Warm pale sand seen from directly above: fine wind ripples, a few tiny shells and pebbles, subtle patches of coarser grain.` |
| `teren-woda.png` | `Clear shallow water seen from directly above: soft turquoise to deep blue, gentle painted ripples and caustics, a few darker patches suggesting depth, no reflections of sky or objects.` |
| `teren-las.png` | `A dense forest canopy seen from directly above: overlapping rounded treetops in several greens, dark gaps between crowns, a few autumn-tinted crowns for variation.` |
| `teren-skaly.png` | `A rocky mountain surface seen from directly above: grey and warm-brown cracked stone slabs, moss in the cracks, scattered rubble and small boulders.` |

## Obiekty na mapie

Format: kwadrat, minimum 1024 × 1024, jeden obiekt, tło magenta.
Ujęcie inne niż w mieście: mapa jest oglądana **bardziej z góry**.

Wspólny dodatek:

```
Single object only, seen from about 45 degrees above (adventure-map view), no ground,
no grass, no base, no cast shadow, flat solid magenta #FF00FF background. It must stay
readable at 60 pixels tall.
[BLOK STYLU]
```

| Plik | Prompt |
|---|---|
| `m-drzewo.png` | `A single broadleaf tree with a thick rounded canopy and a sturdy trunk, a few lighter leaf clusters catching the sun.` |
| `m-sosna.png` | `A single conifer with layered dark green branches and a straight trunk.` |
| `m-krzak.png` | `A low round bush with dense small leaves and a few red berries.` |
| `m-skala.png` | `A cluster of grey boulders with mossy tops and cracked faces.` |
| `m-kopalnia.png` | `A small mine entrance dug into a rocky mound: timber-framed opening, wooden support beams, a minecart with crystals, a lantern on a post.` |
| `m-sad.png` | `A small orchard plot: two berry-laden trees, a low wooden fence, woven baskets and a wheelbarrow.` |
| `m-skrzynia.png` | `A wooden treasure chest with iron bands and a big golden lock, slightly open with warm light spilling out.` |
| `m-zamek.png` | `A small fortified town seen from a distance: a timber gate tower, a mossy hall roof behind it and a banner on a pole — the map marker for a whole settlement.` |
| `m-obelisk.png` | `A weathered stone marker overgrown with vines, with a glowing carved symbol.` |

## Cztery surowce

Format: kwadrat, minimum 512 × 512, tło magenta, ten sam dodatek co obiekty
(czytelne przy 32 px zamiast 60).

| Plik | Prompt |
|---|---|
| `s-pokeball.png` | `A small round red-and-white catching ball with a dark band and a pale button, glossy and clean — the currency of this world.` |
| `s-jagody.png` | `A small pile of plump red berries with green leaves, glossy and appetising.` |
| `s-kamien.png` | `A cut violet evolution crystal with clean facets and a soft inner glow.` |
| `s-odlamki.png` | `A small cluster of pale blue crystal shards on a rocky base.` |

## Czego NIE generować na mapę

- **bohatera i jego animacji chodu** — to jest arkusz z czterema kierunkami
  i klatkami; model tego nie utrzyma w spójności między klatkami, a rozjazd
  widać natychmiast w ruchu. Zostaje ten, którego mamy;
- **stworków** — mamy 270 sprite'ów i to one są kotwicą stylu;
- **mgły wojny, siatki pól, interfejsu** — to rysuje gra;
- **cieni rzuconych** — dokłada skrypt, jednym kierunkiem dla całej mapy.

---

## Co robić z gotowymi plikami

1. Wrzuć je do `tools/wsad/` pod nazwami z tabel.
2. Daj znać — puszczam przebieg: wycięcie tła, przycięcie do sylwetki,
   wyrównanie światła, wypalenie cienia, wersje frakcyjne miasta, pocięcie
   tekstur na kafelki i złożenie przejść, podmianę w grze, sondy
   (`probe-miasto`, `probe-mapa`, `probe-klik`, `probe-przygoda`) i ślepe
   porównanie z nowym benchmarkiem.

## Kolejność, którą polecam

1. kotwica stylu (widok całego miasta),
2. dwa–trzy warianty `ratusz1` — wybieramy razem, zanim pójdzie reszta,
3. pozostałe budynki i plac budowy,
4. trzy panoramy,
5. sześć tekstur terenu,
6. obiekty mapy i surowce.

Po każdym etapie da się grać, więc nie ma momentu, w którym gra jest w połowie
przemalowana i nie działa.

## Czym to generować

Nie ma jednego narzędzia, które robi wszystko dobrze. Nasz przebieg ma cztery
twarde potrzeby i to one rozstrzygają, czym co robić:

1. **przezroczystość albo czyste tło do wycięcia** — inaczej każdy sprite trzeba
   odcinać ręcznie;
2. **spójność między kilkunastoma obrazkami** — największe ryzyko całej tej drogi;
3. **rozdzielczość 2048 px i więcej** — bo zmniejszamy, nigdy nie powiększamy;
4. **posłuszeństwo wobec instrukcji** — kąt kamery, brak cienia, brak ziemi.

**ChatGPT** jest najlepszy w punkcie 4 i w rozmowie. Naprawdę słucha zdania
„bez cienia rzuconego, tło płaska magenta, dwadzieścia stopni z góry", i można
mu powiedzieć „to samo, ale o piętro wyżej" bez pisania promptu od nowa. Słabszy
jest w 1 i 3 (przezroczystość bywa udawana, rozdzielczość niższa) i średni w 2.
Do KOTWICY STYLU i do wybierania wariantów `ratusz1` — idealny.

**Freepik** nadrabia dokładnie tam, gdzie ChatGPT odpuszcza: daje modele klasy
Flux (lepsze faktury), wybór rozdzielczości, referencję stylu, a do tego ma
wbudowane usuwanie tła i powiększanie. Do PRODUKCJI kilkunastu sprite'ów jest
lepszym wyborem — zwłaszcza że masz go pod ręką.

**Czego szukać, jeśli kiedyś sięgniesz dalej.** Jedna funkcja zmienia w tym
wszystkim najwięcej: **trenowanie własnego stylu na własnych obrazkach**
(w różnych narzędziach nazywa się to stylem, LoRA albo modelem niestandardowym).
Wrzucasz nasze 270 stworków i zatwierdzony `ratusz1`, a potem generujesz resztę
JUŻ W TYM STYLU. To jest różnica między „piętnastoma ładnymi obrazkami"
a „piętnastoma obrazkami z jednego świata" — czyli dokładnie ten problem,
z którym walczymy od początku.

**O bezszwowych teksturach się nie martw.** Jeśli twoje narzędzie nie ma
przełącznika „seamless", generuj zwykłą teksturę — zamknięcie jej w kafelek
zrobię skryptem (przesunięcie o pół obrazu i zlanie szwu). To jest kilkanaście
linijek i jedna z niewielu rzeczy, które wychodzą lepiej programowi niż modelowi.

**Trzy nawyki, które oszczędzają rundy:** generuj w największym dostępnym
rozmiarze; jeden obrazek to jeden obiekt, nigdy arkusz z kilkoma; i zapisuj,
jakim modelem i z jakimi ustawieniami powstał każdy plik — przy piętnastu
obrazkach po tygodniu nikt tego nie pamięta.

## Uwaga o pochodzeniu

Repo jest publiczne. Warto zapisać w `STAN.md`, jakim modelem i kiedy powstały
grafiki — licencje na wyjście z modeli bywają różne i lepiej mieć to zapisane,
niż odtwarzać po roku.
