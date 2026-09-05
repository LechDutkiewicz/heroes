# Prompty na grafiki gry — gotowe do skopiowania

Każdy prompt niżej jest **kompletny**. Nie trzeba nic składać ani doklejać:
zaznaczasz blok, kopiujesz, wklejasz do modelu, dołączasz obrazek referencyjny.

## Jak z tego korzystać — trzy kroki

**Krok 1. Zacznij od kotwicy.** Wygeneruj „widok całego miasta" z pierwszego
bloku, dołączając `tools/wsad/referencja-stworki.png` (nasze stworki i nic poza
nimi). Zapisz jako `miasto-kotwica.png`.

**Krok 2. Do WSZYSTKIEGO, co potem, dołączaj DWA obrazki referencyjne:**
`referencja-stworki.png` i zatwierdzoną `miasto-kotwica.png`. Kotwica jest
ważniejsza, niż wygląda — ustala nie tylko paletę, ale i KAMERĘ. Pierwsza próba
pokazała dlaczego: chatka wyszła widziana wyraźnie bardziej z góry niż domy na
panoramie, więc postawiona na tym tle unosiłaby się nad ziemią. Prompty mówią
teraz modelowi wprost: ta sama kamera, co na referencji.

Sześć naszych budynków (ratusz, palisada, gniazdo, kłoda, sadzawka, kopuła
i prastare drzewo) JUŻ JEST na kotwicy. Ich prompty każą wyjąć ten sam budynek
z referencji zamiast wymyślać nowy — to daje spójność, jakiej nie da żaden opis
słowny.

**Krok 3. Zapisuj pliki pod nazwami z nagłówków** (`ratusz1.png`, `fort.png`,
`teren-trawa.png`…) i wrzucaj do `tools/wsad/`. Nazwy nie są ozdobne — przebieg
po stronie gry szuka dokładnie tych plików.

**Tło: czysta biel — i to jest zmiana wobec poprzedniej wersji.** Prosiłem
wcześniej o magentę i model uparcie dawał biel; skoro tak, taniej dopasować
przebieg niż walczyć z narzędziem. Biel wycinam **wypełnieniem od krawędzi
kadru**, a nie po kolorze, więc kremowe markizy i białe kwiaty w środku bryły
przetrwają — pod warunkiem, że nie dotykają brzegu obrazka. Stąd w promptach
jest margines wokół budynku.

Prawdziwa przezroczystość (PNG z alfą) jest nadal najlepsza, jeśli narzędzie
ją zapisuje.

**Czego NIE dołączać i czego nie dopisywać.** Do promptu idzie zawartość bloku
i dwa obrazki referencyjne (stworki + kotwica) — nic więcej. Sekcje opisowe tego
dokumentu („Benchmark", „Jak z tego korzystać", nagłówki) są komentarzem dla nas,
nie tekstem dla modelu; wszystko, co model ma wiedzieć, jest już w bloku.

Osobno: **nie dołączaj kadrów z `tools/reference/pmd/` jako referencji.** To jest
pixel art z konsoli DS. Jako obrazek referencyjny model naśladowałby przede
wszystkim piksele, czyli dokładnie tę jedną rzecz, której z tamtej gry nie
bierzemy. Te kadry służą NAM do oceniania nastroju i gęstości, a nie modelowi
do naśladowania.

## Benchmark

Nastrój, paleta i gęstość: ciepłe, gęsto zastawione miasteczko w duchu Pokémon
Mystery Dungeon (kadry w `tools/reference/pmd/`). Technika: gładka, malowana,
wygładzone krawędzie — bo takie są nasze 270 stworków i to one wyznaczają styl
całej gry.

---

# CZĘŚĆ I — MIASTO

## Kotwica stylu (wygeneruj jako pierwszą)

Ten obraz nie wchodzi do gry. Ustala paletę, światło i materiał raz, dla
wszystkiego, co powstanie potem. Zapisz jako `miasto-kotwica.png`.

```
A wide establishing view of a small forest settlement belonging to creature trainers, seen from a low hill in the late afternoon. A timber gathering hall with a mossy shingle roof stands at the centre beside a trodden dirt path; scattered around it on a sunlit meadow stand a few creature dwellings: a woven nest on a tree stump, a hollow fallen log with a round door, a clear turquoise pool ringed with mossy stones, a green dome woven from branches, and one ancient enormous tree with glowing windows in its bark. A log palisade gate guards the back of the settlement. Wooden fences, berry baskets, hanging lanterns, drying laundry, crates and small banners with a simple stylised green leaf emblem (no Poke Ball symbols, no logos from other games) fill the spaces between the buildings — the place is lived in and busy, with no empty ground anywhere. No creatures, no people.

Light: warm low afternoon sun from the upper right, long soft shadows, glowing windows.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a full painted background for a town screen. Horizon high in the frame, only a narrow strip of sky at the top; the lower three quarters is open ground where buildings will be placed later. Horizontal 16:10 image, at least 2400x1500. No text, no logo, no watermark, no user interface.
```

## Dwanaście budynków

Wszystkie w palecie Boru: ciepłe drewno `#B98A52`, zieleń liści `#4F9E4A`,
złote okucia `#FFC93C`, kamień `#8E8A80`. Grotę i Zbocze zrobię przemalowaniem —
nie generuj ich osobno.


### `ratusz1.png` — Polana Zbiorów — ratusz, stopień 1

```
A small forest gathering hall for a village of creature trainers: a round timber-framed hut with a mossy shingle roof, a wide open porch, hanging baskets of berries, a carved wooden sign and warm light glowing from the windows. Humble and welcoming — the first building of a young settlement. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `ratusz2.png` — Wielka Polana — ratusz, stopień 2

Do tego promptu dołącz jako referencję **zatwierdzony `ratusz1.png`** (obok
stworków i kotwicy). To ma być ten sam dom po rozbudowie, a nie inny dom.

```
The SAME gathering hall as in the attached previous-stage image, rebuilt one storey larger and richer — same materials, same roof, same colours, recognisably the same house: two storeys of timber with carved beams, a big mossy shingle roof, an upper balcony hung with baskets and lanterns, a stone chimney with a wisp of smoke, a small bell under the gable. Clearly the same kind of building as a smaller village hall, just grown.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `ratusz3.png` — Serce Boru — ratusz, stopień 3

Referencją jest tu **`ratusz2.png`**, nie `ratusz1` — łańcuch idzie stopień
po stopniu, bo tak najłatwiej utrzymać wrażenie jednego budynku.

```
The SAME gathering hall as in the attached previous-stage image, in its grandest form — recognisably the same house, now the centre of a thriving town: three storeys of carved timber grown together with a living tree, roots wrapping a stone foundation, a golden bell tower crowned with leaves, banners, glowing lanterns and wide stone steps. Majestic but still warm and hand-made.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `fort.png` — Palisada — fort

```
A defensive palisade gate for a forest settlement: a heavy log wall with sharpened tops, a reinforced timber gate with iron bands, two watch platforms with conical thatched roofs and small banners, ivy creeping up the logs. Wide and low — clearly a wall, not a house. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko1.png` — Gniazdo Iskier — siedlisko 1

```
A large woven nest built on a broad tree stump, home to small fire creatures: thick braided twigs, warm embers glowing between them, two large cream-coloured eggs resting inside, a few scorched branches. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko2.png` — Suchy Konar — siedlisko 2

```
A hollow fallen log turned into a home: a massive dry tree trunk lying on its side, a round carved doorway with a wooden frame, small round windows, mushrooms and moss on the bark, a little chimney pipe poking through the top. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko3.png` — Rosista Kotlina — siedlisko 3

```
A misty hollow pool where water creatures live: a small round pond of clear turquoise water ringed by wet mossy boulders, reeds and lily pads, thin mist drifting over the surface, a little wooden jetty. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko4.png` — Strumień — siedlisko 4

```
A stream dwelling with a working water wheel: a rocky ledge with a small waterfall, a wooden mill wheel turning in the flow, a mossy timber hut built onto the rock, smooth wet stones and splashing water. The wheel must read clearly as a wheel.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko5.png` — Zielona Kopuła — siedlisko 5

```
A living green dome dwelling: a large rounded hut woven from bent branches and thick leaves, glowing amber windows set into the weave, a mossy entrance arch, flowering vines over the top, a small banner on a pole. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko6.png` — Prastare Drzewo — siedlisko 6

```
An ancient enormous tree that is itself a home: a massive gnarled trunk with a carved arched doorway, glowing windows in the bark at several heights, thick roots spreading outward, a huge lush canopy, hanging lanterns and a rope ladder. The tallest and most impressive building in the town. This building already appears in the attached town reference image — draw that same building, isolated, keeping its shape, materials, colours and camera angle.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `specjalny.png` — Krzew Jagodowy — budynek specjalny

```
A cultivated berry grove: a big lush berry bush heavy with red berries growing on a simple wooden trellis, woven baskets full of picked berries at its foot, a small watering can. Tidy and farmed rather than wild.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `plac.png` — Plac budowy — wspólny dla wszystkich budynków

```
An empty building site for a fantasy village: a shallow dug foundation pit with a low stone footing, wooden scaffolding poles lashed together with rope, a few planks leaning against the frame, a bucket and a shovel, and a small wooden sign on a post with a lit lantern. Clearly a place where something will be built, with nothing built yet.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

## Trzy panoramy tła

**Puste — bez budynków.** To jest inny obraz niż kotwica, choć opis brzmi
podobnie: kotwica MA budynki i służy za wzór stylu, a panorama to tło, na
którym gra sama postawi bryły, po jednej, w miarę rozbudowy. Panorama
z wmalowanym miastem jest w grze bezużyteczna — dostalibyśmy dwa miasta naraz,
jedno namalowane i jedno postawione na nim.


### `tlo-bor.png` — Bór Szmaragdowy

```
A sunlit forest clearing seen from a low hill in the late afternoon: a lush green meadow with trodden dirt paths winding through it, patches of wildflowers and grass tufts, scattered mossy boulders, a dense wall of deciduous forest along the horizon, warm sky with a few golden clouds.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a full painted background for a town screen. Horizon high in the frame, only a narrow strip of sky at the top; the lower three quarters is open ground where buildings will be placed later. Empty middle ground — no buildings, no houses, no towers, no characters. Horizontal 16:10 image, at least 2400x1500. No text, no logo, no watermark, no user interface.
```

### `tlo-grota.png` — Grota Księżycowa

```
An underground cavern lit by moonlight falling through a hole in the ceiling: a broad floor of pale violet stone and dark sand beside a still black lake, glowing cyan crystals growing in clusters, luminous mushrooms, stalactites hanging in the far dark. Cool violet and deep blue with cyan light — mysterious but not frightening.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a full painted background for a town screen. Horizon high in the frame, only a narrow strip of sky at the top; the lower three quarters is open ground where buildings will be placed later. Empty middle ground — no buildings, no houses, no towers, no characters. Horizontal 16:10 image, at least 2400x1500. No text, no logo, no watermark, no user interface.
```

### `tlo-zbocze.png` — Zbocze Popielne

```
A volcanic slope at dusk: a wide plain of grey ash and cracked basalt with warm orange embers glowing in the cracks, dark rocky ridges on the horizon, a distant volcano with a soft glow, drifting smoke. Warm amber and rust against a deep orange sky — dramatic but warm, not hellish.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a full painted background for a town screen. Horizon high in the frame, only a narrow strip of sky at the top; the lower three quarters is open ground where buildings will be placed later. Empty middle ground — no buildings, no houses, no towers, no characters. Horizontal 16:10 image, at least 2400x1500. No text, no logo, no watermark, no user interface.
```

---

# CZĘŚĆ II — MAPA PRZYGODY

Mapa jest **kafelkowa**: 36 × 36 pól po 48 px, przewijana, generowana
proceduralnie, z mgłą wojny i kosztem ruchu na każdym polu. Dlatego nie da się
wygenerować jednego obrazu mapy — potrzebne są tekstury i osobne obiekty,
a resztę składa kod, który już działa.

## Referencje: mapa ma WŁASNĄ kotwicę

**Do promptów z tej części NIE dołączaj `miasto-kotwica.png`.** Kotwica miasta
niesie kamerę widoku miasta — patrzymy tam prawie z boku, lekko z góry. Mapa
patrzy stromo w dół. Model wziąłby z załącznika perspektywę i dostalibyśmy
drzewa widziane jak domy, a wtedy nic nie stanie na kafelkach prosto.

Zamiast tego:

| Co generujesz | Co dołączasz jako referencję |
|---|---|
| `mapa-kotwica.png` (pierwsza) | `referencja-stworki.png` |
| sześć tekstur terenu | `referencja-stworki.png` + wcześniej zatwierdzona `teren-trawa.png` |
| obiekty mapy i surowce | `referencja-stworki.png` + `mapa-kotwica.png` |

Trawę generuj jako pierwszą z tekstur i potem podawaj ją do pozostałych pięciu —
tak samo jak ratusz1 ciągnie za sobą ratusz2 i ratusz3. Sześć tekstur robionych
niezależnie od siebie ma sześć różnych zieleni i sześć różnych ziaren, a stykają
się ze sobą na każdym kafelku.

## Kotwica mapy (wygeneruj jako pierwszą w tej części)

Ten obraz też nie wchodzi do gry. Ustala kamerę, paletę i gęstość dla wszystkiego,
co na mapie. Zapisz jako `mapa-kotwica.png`.

```
A wide view of a fantasy adventure map seen steeply from above, at about 45 degrees, like a tabletop diorama: a green meadow crossed by a winding trodden dirt path, clumps of broadleaf trees and conifers, mossy grey boulders, a shallow turquoise stream with a small wooden bridge, a patch of pale sand near the water, a rocky outcrop, and a small timber mine entrance with a lantern beside it. Everything sits on open ground with room between the objects. Warm afternoon light, gentle soft shadows on the ground under every object. No creatures, no people, no buildings other than the mine, no grid lines, no user interface.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes, rich material detail: grass blades, wet stone, bark, sand grain. No pixel art, no hard aliased edges, no black outlines, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image.

Horizontal 16:10 image, at least 2400x1500. No text, no logo, no watermark, no user interface.
```

## Sześć tekstur terenu


### `teren-trawa.png` — trawa

**Tę generuj jako pierwszą z sześciu** i potem dołączaj ją do pozostałych pięciu
jako referencję palety i ziarna.

**Zrób ją w trzech wariantach** (`teren-trawa.png`, `teren-trawa-2.png`,
`teren-trawa-3.png`), każdy z tym samym promptem. Powód jest czysto praktyczny:
jedna tekstura powtórzona na planszy 36 × 36 daje 1296 identycznych kwadratów,
a oko wyłapuje powtórzenie natychmiast — po czymś charakterystycznym, na przykład
po kępce żółtych kwiatów wracającej co kilka pól. Przy trzech wariantach
mieszanych losowo wzór znika.

Z tego samego powodu w prompcie jest teraz prośba o **mniej rzucających się
w oczy akcentów**: gęste kwiaty ładnie wyglądają na jednym kafelku i zdradzają
kafelkowanie na całej planszy.

```
Lush green meadow grass seen from directly above: many small painted grass blades and tufts, subtle patches of lighter and darker green, occasional clover leaves, no bare soil. Keep the texture even and calm — only a very few tiny pale flowers, spread apart and never in clusters. Distinctive landmarks such as flower clumps must be rare, because this texture is repeated over a thousand times across the map and any eye-catching detail reveals the repetition.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a seamless tileable ground texture seen straight from above (top-down, 90 degrees). It must tile perfectly: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam. Flat even ambient lighting with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up, NO horizon, NO perspective. Square image, at least 2048x2048. No text, no watermark.
```

### `teren-sciezka.png` — ścieżka

```
A well-trodden dirt path seen from directly above: warm packed earth with fine gravel, faint cart ruts, a few small pebbles and wisps of dry grass.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a seamless tileable ground texture seen straight from above (top-down, 90 degrees). It must tile perfectly: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam. Flat even ambient lighting with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up, NO horizon, NO perspective. Square image, at least 2048x2048. No text, no watermark.
```

### `teren-piasek.png` — piasek

```
Warm pale sand seen from directly above: fine wind ripples, a few tiny shells and pebbles, subtle patches of coarser grain.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a seamless tileable ground texture seen straight from above (top-down, 90 degrees). It must tile perfectly: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam. Flat even ambient lighting with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up, NO horizon, NO perspective. Square image, at least 2048x2048. No text, no watermark.
```

### `teren-woda.png` — woda

```
Clear shallow water seen from directly above: soft turquoise shading into deeper blue, gentle painted ripples and caustics, a few darker patches suggesting depth, no reflections of sky or objects.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a seamless tileable ground texture seen straight from above (top-down, 90 degrees). It must tile perfectly: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam. Flat even ambient lighting with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up, NO horizon, NO perspective. Square image, at least 2048x2048. No text, no watermark.
```

### `teren-las.png` — las

```
A dense forest canopy seen from directly above: overlapping rounded treetops in several shades of green, dark gaps between the crowns, a few autumn-tinted crowns for variation.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a seamless tileable ground texture seen straight from above (top-down, 90 degrees). It must tile perfectly: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam. Flat even ambient lighting with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up, NO horizon, NO perspective. Square image, at least 2048x2048. No text, no watermark.
```

### `teren-skaly.png` — skały

```
A rocky mountain surface seen from directly above: grey and warm-brown cracked stone slabs, moss growing in the cracks, scattered rubble and small boulders.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

This is a seamless tileable ground texture seen straight from above (top-down, 90 degrees). It must tile perfectly: the left edge continues into the right edge and the top edge into the bottom edge, with no visible seam. Flat even ambient lighting with NO directional sunlight, NO cast shadows, NO vignette, NO objects sticking up, NO horizon, NO perspective. Square image, at least 2048x2048. No text, no watermark.
```

## Dziewięć obiektów mapy


### `m-drzewo.png` — drzewo liściaste

```
A single broadleaf tree with a thick rounded canopy and a sturdy trunk, a few lighter leaf clusters catching the sun.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-sosna.png` — sosna

```
A single conifer with layered dark green branches and a straight trunk.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-krzak.png` — krzak

```
A low round bush with dense small leaves and a few red berries.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-skala.png` — skała

```
A cluster of grey boulders with mossy tops and cracked faces.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-kopalnia.png` — kopalnia

```
A small mine entrance dug into a rocky mound: a timber-framed opening, wooden support beams, a minecart full of crystals, a lantern on a post.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-sad.png` — sad

```
A small orchard plot: two berry-laden trees, a low wooden fence, woven baskets and a wheelbarrow.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-skrzynia.png` — skrzynia

```
A wooden treasure chest with iron bands and a big golden lock, lid slightly open with warm light spilling out.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-zamek.png` — zamek na mapie

```
A small fortified town seen from a distance: a timber gate tower, a mossy hall roof behind it and a banner on a pole — a map marker standing for a whole settlement.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-obelisk.png` — obelisk

```
A weathered stone marker overgrown with vines, with a glowing carved symbol on its face.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

## Cztery surowce


### `s-pokeball.png` — pokeball — waluta

```
A small round red-and-white catching ball with a dark band across the middle and a pale button, glossy and clean.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

### `s-jagody.png` — jagody

```
A small pile of plump red berries with green leaves, glossy and appetising.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

### `s-kamien.png` — kamień ewolucji

```
A cut violet crystal with clean facets and a soft inner glow.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

### `s-odlamki.png` — odłamki

```
A small cluster of pale blue crystal shards on a rocky base.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view) — the adventure map looks down more steeply than the town screen, so this one does NOT copy the town camera. Orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient and no shadow falling on it, and the object must not touch any edge of the image. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

---

## Czego NIE generować

- **bohatera** — to arkusz chodu w czterech kierunkach i model nie utrzyma
  spójności między klatkami; rozjazd widać w ruchu natychmiast;
- **stworków** — mamy 270 i to one są kotwicą stylu;
- **cieni rzuconych, mgły wojny, siatki pól, interfejsu** — dokłada je gra.

## Kolejność

1. kotwica stylu,
2. dwa–trzy warianty `ratusz1.png` — pokaż mi, wybieramy razem,
3. reszta budynków i plac budowy,
4. trzy panoramy,
5. sześć tekstur terenu,
6. obiekty mapy i surowce.

Po każdym etapie gra działa, więc nie ma momentu, w którym jest w połowie
przemalowana i nie da się w nią grać.

## Czym generować

**ChatGPT** — do kotwicy i do wariantów ratusza: najlepiej słucha instrukcji
o kącie kamery i braku cienia, i da się z nim rozmawiać („to samo, ale o piętro
wyżej"). **Freepik** — do produkcji reszty: modele klasy Flux dają lepsze
faktury, ma referencję stylu, wyższe rozdzielczości oraz wbudowane usuwanie tła
i powiększanie. O bezszwowość tekstur się nie martw — jeśli narzędzie nie ma
takiego przełącznika, zamknę je w kafelek skryptem.

Zapisuj przy każdym pliku, jakim modelem i z jakimi ustawieniami powstał.
Przy trzydziestu obrazkach po tygodniu nikt tego nie pamięta, a przy poprawianiu
jednego budynku to różnica między dopasowaniem a losowaniem od nowa.

