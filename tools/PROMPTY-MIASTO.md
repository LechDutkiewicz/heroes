# Prompty na grafiki miasta

Komplet do wygenerowania w modelu graficznym poza tym repo. Ty generujesz,
wrzucasz pliki do `tools/wsad/`, ja resztę robię skryptem: wycinam tło,
przycinam, wyrównuję światło, wypalam cień rzucony, robię wersje frakcyjne
i wpinam w panoramę.

## Zanim zaczniesz — cztery rzeczy, które decydują o tym, czy się to wpnie

**1. Jedno ujęcie na wszystkim.** Każdy budynek MUSI być widziany tak samo:
lekko z góry (jakieś 20°) i lekko z boku (jakieś 25° w prawo), bez perspektywy
zbieżnej. Panorama składa się z brył wklejanych w różne miejsca ekranu; jeśli
jedna będzie widziana z góry, a druga z poziomu oczu, miasto rozjedzie się
i żadne cieniowanie tego nie uratuje.

**2. Jedno światło.** Słońce z prawej góry, ciepłe, cień miękki. NIE chcemy
cienia rzuconego na ziemię ani samej ziemi pod budynkiem — cień dokładam
skryptem, żeby wszystkie padały tak samo i żeby dało się je zmieniać.

**3. Tło do wycięcia.** Jednolita, płaska magenta `#FF00FF`, bez gradientu,
bez winiety, bez refleksu na tle. Modele nie robią prawdziwej przezroczystości,
a magenty nie ma w żadnej naszej palecie, więc wycięcie jest bezstratne.
Jeśli twój model umie zapisać PNG z kanałem alfa — jeszcze lepiej, wtedy tło
jest bez znaczenia.

**4. Styl trzyma się jednego bloku tekstu.** Poniżej jest BLOK STYLU. Wklej go
DOSŁOWNIE do każdego promptu, bez zmieniania słów. Jeśli twój model przyjmuje
obrazek referencyjny, wygeneruj najpierw `ratusz1`, a potem podawaj go jako
referencję stylu do wszystkich pozostałych — to jest najskuteczniejszy sposób
na spójność jedenastu obrazków.

Prompty są po angielsku, bo modele graficzne rozumieją angielski wyraźnie
lepiej niż polski, zwłaszcza w opisach materiału i światła.

---

## BLOK STYLU (wklejać do każdego promptu)

```
Style: stylized 2D game asset for a children's fantasy strategy game, hand-painted
look, soft cel shading with clear light and shadow planes, warm saturated palette,
rounded friendly shapes, crisp readable silhouette, high detail on materials
(wood grain, mossy stone, thatch, leaves), no outlines, no photorealism, no pixel art.
Camera: orthographic three-quarter view, about 20 degrees from above and 25 degrees
to the right, no lens distortion, object centered and fully visible with a small margin.
Light: warm sunlight from the upper right, soft ambient fill, no cast shadow on the
ground, no ground plane, no grass, no base, no pedestal.
Background: flat solid magenta #FF00FF, completely uniform, no gradient, no vignette.
Output: square image, at least 2048x2048, single object only, no text, no logo,
no watermark, no user interface, no characters, no people.
```

---

## Jedenaście budynków — miasto Bór Szmaragdowy

Generujemy JEDEN komplet, w palecie Boru. Grota i Zbocze zrobię z niego
przemalowaniem — mam do tego przebieg, a trzy komplety z modelu i tak
rozjechałyby się stylistycznie.

Paleta Boru do wklejenia w prompt, jeśli model przyjmuje kody:
ciepłe drewno `#B98A52`, zieleń liści `#4F9E4A`, złote okucia `#FFC93C`,
kamień `#8E8A80`.

| Plik | Co to jest w grze |
|---|---|
| `ratusz1.png` | ratusz, stopień 1 — dochód |
| `ratusz2.png` | ten sam ratusz rozbudowany |
| `ratusz3.png` | ten sam ratusz, wersja najokazalsza |
| `fort.png` | fort — przyrost we wszystkich siedliskach |
| `siedlisko1.png` … `siedlisko6.png` | sześć siedlisk, poziomy 1–6 |
| `specjalny.png` | budynek specjalny — daje jagody |

### ratusz1 — Polana Zbiorów

```
A small forest gathering hall for a friendly fantasy village. Round timber-framed
hut with a mossy shingle roof, a wide open porch, hanging baskets of berries,
a carved wooden sign, warm light glowing from the windows. Cozy, welcoming, humble
— this is the first building of a young settlement.
[BLOK STYLU]
```

### ratusz2 — Wielka Polana

```
The same forest gathering hall as before, now grown larger: two storeys, timber
frame with carved beams, a bigger mossy shingle roof, an upper balcony with baskets
and lanterns, a stone chimney with a wisp of smoke, a small bell under the gable.
Clearly the same building as the smaller version, just expanded and richer.
[BLOK STYLU]
```

### ratusz3 — Serce Boru

```
The grandest version of the same forest hall: three storeys of carved timber grown
together with a living tree, roots wrapping the stone foundation, a golden bell tower
crowned with leaves, banners, glowing lanterns, wide stone steps. Majestic but still
warm and hand-made, the heart of a forest town.
[BLOK STYLU]
```

### fort — Palisada

```
A defensive palisade gate for a forest settlement: a heavy log wall with sharpened
tops, a reinforced timber gate with iron bands, two watch platforms with conical
thatched roofs and small banners, ivy creeping up the logs. Wide and low, clearly
a wall rather than a house.
[BLOK STYLU]
```

### siedlisko1 — Gniazdo Iskier

```
A large woven nest built on a broad tree stump, home to small fire creatures:
thick braided twigs, warm embers glowing between them, two large cream-colored eggs
resting inside, a few scorched branches. Cozy and alive.
[BLOK STYLU]
```

### siedlisko2 — Suchy Konar

```
A hollow fallen log turned into a dwelling: massive dry tree trunk lying on its side,
round carved doorway with a wooden frame, small round windows, mushrooms and moss
on the bark, a chimney pipe poking through the top.
[BLOK STYLU]
```

### siedlisko3 — Rosista Kotlina

```
A misty hollow pool where water creatures live: a small round pond of clear turquoise
water ringed by wet mossy boulders, reeds and lily pads, thin mist drifting over the
surface, a little wooden jetty. Calm and fresh.
[BLOK STYLU]
```

### siedlisko4 — Strumień

```
A stream dwelling with a working water wheel: a rocky ledge with a small waterfall,
a wooden mill wheel turning in the flow, a mossy timber hut built onto the rock,
smooth wet stones and splashing water. The wheel must read clearly as a wheel.
[BLOK STYLU]
```

### siedlisko5 — Zielona Kopuła

```
A living green dome dwelling: a large rounded hut woven from bent branches and thick
leaves, glowing amber windows set into the weave, a mossy entrance arch, flowering
vines over the top, a small banner on a pole.
[BLOK STYLU]
```

### siedlisko6 — Prastare Drzewo

```
An ancient enormous tree that is itself a home: massive gnarled trunk with a carved
arched doorway, glowing windows in the bark at several heights, thick roots spreading
outward, a huge lush canopy, hanging lanterns and a rope ladder. The tallest and most
impressive building in the town.
[BLOK STYLU]
```

### specjalny — Krzew Jagodowy

```
A cultivated berry grove: a big lush berry bush heavy with red berries, supported by
a simple wooden trellis, woven baskets full of picked berries at its foot, a small
watering can. Abundant and tidy, clearly a farmed thing rather than wild.
[BLOK STYLU]
```

### plac budowy (jeden, wspólny dla wszystkich budynków)

```
An empty building site for a fantasy village: a shallow dug foundation pit with a low
stone footing, wooden scaffolding poles lashed with rope, a few planks leaning against
the frame, a bucket and a shovel, a small wooden sign on a post with a lit lantern.
Clearly a place where something will be built, with nothing built yet.
[BLOK STYLU]
```

---

## Trzy panoramy tła

Inny format: **poziomy, 16:10, co najmniej 2400 × 1500**. Tu ZALEŻY nam na
ziemi i na niebie — to jest krajobraz, a nie obiekt.

Wspólny dodatek do bloku stylu dla panoram (zamiast dwóch ostatnich linijek
BLOKU STYLU o tle i formacie):

```
Background: this is a full landscape, painted background art for a town screen.
Horizon high in the frame, only a narrow strip of sky at the top, the lower three
quarters is open ground where buildings will be placed later. Empty middle ground —
no buildings, no houses, no towers, no characters. Output: horizontal 16:10 image,
at least 2400x1500, no text, no logo, no watermark, no user interface.
```

### Bór Szmaragdowy

```
A sunlit forest clearing seen from a low hill at midday: lush green meadow with
trampled dirt paths winding through it, patches of wildflowers and grass tufts,
scattered mossy boulders, a dense wall of deciduous forest along the horizon, soft
blue sky with a few warm clouds. Warm, safe, inviting.
[DODATEK PANORAMOWY]
```

### Grota Księżycowa

```
An underground cavern lit by moonlight through a hole in the ceiling: a broad floor
of pale violet stone and dark sand beside a still black lake, glowing cyan crystals
growing in clusters, luminous mushrooms, stalactites hanging in the far dark, cool
violet and deep blue palette with cyan light. Mysterious but not frightening.
[DODATEK PANORAMOWY]
```

### Zbocze Popielne

```
A volcanic slope at dusk: wide plain of grey ash and cracked basalt with warm orange
embers glowing in the cracks, dark rocky ridges on the horizon, a distant volcano
with a soft glow, drifting smoke, warm amber and rust palette against a deep orange
sky. Dramatic but warm, not hellish.
[DODATEK PANORAMOWY]
```


---

## Kotwica stylu: widok całego miasta

Tego obrazu NIE wstawiamy do gry. Jest po to, żeby ustalić paletę, światło,
materiał i nastrój raz, a potem podawać go modelowi jako referencję stylu przy
każdym pojedynczym budynku. Największym ryzykiem tej drogi nie jest jakość
jednego obrazka, tylko to, że dwanaście obrazków generowanych osobno wyjdzie
z dwunastu różnych światów — a jeden wspólny punkt odniesienia załatwia to
lepiej niż powtarzanie tego samego akapitu tekstu.

Format: poziomy 16:10, co najmniej 2400 × 1500.

```
A wide establishing view of a small fantasy forest settlement belonging to
creature trainers, seen from a low hill at midday. A timber gathering hall with
a mossy shingle roof stands at the centre beside a trodden dirt path; around it,
scattered across a sunlit meadow, stand a few small creature dwellings: a woven
nest on a tree stump, a hollow fallen log with a round door, a clear turquoise
pool ringed with mossy stones, a green dome woven from branches, and one ancient
enormous tree with glowing windows in its bark. A log palisade gate guards the
back of the settlement. Wooden fences, berry baskets, lanterns and small banners
between the buildings. No creatures, no people.

Style: stylized 2D game art for a children's fantasy strategy game, hand-painted
look, soft cel shading with clear light and shadow planes, warm saturated palette,
rounded friendly shapes, high detail on materials (wood grain, mossy stone, thatch,
leaves), no outlines, no photorealism, no pixel art.
Light: warm sunlight from the upper right, long soft shadows falling to the lower
left, glowing warm windows.
Composition: horizon high in the frame, only a narrow strip of sky at the top.
Output: horizontal 16:10 image, at least 2400x1500, no text, no logo, no watermark,
no user interface.
```

---

## Benchmark: czym mierzyć kierunek

Do promptu warto dołożyć punkt odniesienia, ale nie byle jaki i nie byle jak.

**Najlepszy benchmark to nasza własna gra, podany OBRAZKIEM.** W `tools/wsad/`
leży `referencja-stylu.png`: stworki, które już w grze są, ekran mapy przygody
i obecny ekran miasta. Jeśli twój model przyjmuje obrazek referencyjny, podaj go
razem z promptem i dopisz jedno zdanie:

```
Match the finish, palette and softness of the creatures in the reference image:
smooth airbrushed shading, no hard outlines, saturated but not neon colours,
rounded volumes, everything readable at small size.
```

To jest silniejsze niż jakikolwiek opis słowny, bo stworki są w grze od dawna
i to one wyznaczają, co do niej pasuje. Budynek ma stanąć obok nich i nie
wyglądać jak wklejka z innej gry.

**Czego nie robić z benchmarkiem.** Nie proś modelu o „grafikę jak w Pokémonach"
ani o żadną nazwę handlową w promptcie. Trzy powody, w kolejności ważności:
model potrafi wtedy wygenerować rzeczy zbyt bliskie cudzym projektom, a repo
jest publiczne; część modeli po prostu odmawia albo pogarsza wynik na nazwach
własnych; a nazwa i tak nie mówi, o co nam chodzi — bo chodzi o wykończenie,
nie o postacie.

**Co powiedzieć zamiast nazwy.** To samo, tylko opisem — i to działa lepiej:

```
Reference direction: bright, friendly Japanese-style creature-collector RPG art;
soft airbrushed shading with one clear light side and one shadow side; saturated
candy palette with warm highlights; chunky rounded architecture with exaggerated
proportions, thick beams and oversized roofs; clean silhouettes readable at 200
pixels tall; charming and safe rather than gritty or dark.
```

Zdanie o **200 pikselach** jest tam nie dla ozdoby: budynek na naszym ekranie ma
w rzeczywistości 150–250 px wysokości. Jeśli sylwetka nie czyta się w tej skali,
cały detal idzie w gwizdek — a modele domyślnie robią obrazy, które wyglądają
dobrze w powiększeniu i rozpadają się po zmniejszeniu.

---

## Co robić z gotowymi plikami

1. Wrzuć je do `tools/wsad/` pod nazwami z tabeli (`ratusz1.png`, `fort.png`,
   `tlo-bor.png`, `tlo-grota.png`, `tlo-zbocze.png`, kotwica jako `miasto-kotwica.png`).
2. Daj znać — puszczam przebieg: wycięcie magenty, przycięcie do sylwetki,
   wyrównanie światła między budynkami, wypalenie cienia rzuconego, wersje
   Groty i Zbocza, podmiana w panoramie, sonda i ślepe porównanie.

## Czego NIE generować

- **cieni rzuconych i ziemi pod budynkiem** — dokładam je skryptem, żeby
  wszystkie padały w tę samą stronę i żeby dało się je poprawić bez generowania
  wszystkiego od nowa;
- **postaci, stworków, ludzi** — armia ma własne sprite'y i miesza się z tym
  stylistycznie;
- **interfejsu, napisów, ramek** — to rysuje gra;
- **wersji nocnych i pogodowych** — mamy jedną porę dnia na frakcję.

## Uwaga o pochodzeniu

Repo jest publiczne, więc warto trzymać w nim notatkę, że grafiki miasta
powstały w modelu graficznym — razem z nazwą modelu i datą. Licencje na wyjście
z modeli bywają różne i lepiej mieć to zapisane, niż odtwarzać po roku.
