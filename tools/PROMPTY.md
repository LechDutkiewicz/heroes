# Prompty na grafiki gry — gotowe do skopiowania

Każdy prompt niżej jest **kompletny**. Nie trzeba nic składać ani doklejać:
zaznaczasz blok, kopiujesz, wklejasz do modelu, dołączasz obrazek referencyjny.

## Jak z tego korzystać — trzy kroki

**Krok 1. Dołącz obrazek referencyjny.** Do KAŻDEGO promptu dołączaj
`tools/wsad/referencja-stworki.png` — to są nasze stworki i nic poza nimi.
(Wcześniejszy arkusz `referencja-stylu.png` zawierał także nasz stary ekran
miasta, czyli dokładnie tę grafikę, której model ma NIE naśladować. Nie używaj
go jako referencji.)

**Krok 2. Zacznij od kotwicy.** Wygeneruj najpierw „widok całego miasta", potem
`ratusz1.png`. Jak `ratusz1` będzie dobry, **od tego momentu dołączaj DWA
obrazki referencyjne**: stworki i zatwierdzony `ratusz1`. To on trzyma resztę
budynków w jednym świecie.

**Krok 3. Zapisuj pliki pod nazwami z nagłówków** (`ratusz1.png`, `fort.png`,
`teren-trawa.png`…) i wrzucaj do `tools/wsad/`. Nazwy nie są ozdobne — przebieg
po stronie gry szuka dokładnie tych plików.

Jeśli model nie umie zapisać przezroczystości, zostaw tło magenty — wytnę je
skryptem. Jeśli umie, przezroczystość jest lepsza.

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
A wide establishing view of a small forest settlement belonging to creature trainers, seen from a low hill in the late afternoon. A timber gathering hall with a mossy shingle roof stands at the centre beside a trodden dirt path; scattered around it on a sunlit meadow stand a few creature dwellings: a woven nest on a tree stump, a hollow fallen log with a round door, a clear turquoise pool ringed with mossy stones, a green dome woven from branches, and one ancient enormous tree with glowing windows in its bark. A log palisade gate guards the back of the settlement. Wooden fences, berry baskets, hanging lanterns, drying laundry, crates and small banners fill the spaces between the buildings — the place is lived in and busy, with no empty ground anywhere. No creatures, no people.

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
A small forest gathering hall for a village of creature trainers: a round timber-framed hut with a mossy shingle roof, a wide open porch, hanging baskets of berries, a carved wooden sign and warm light glowing from the windows. Humble and welcoming — the first building of a young settlement.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `ratusz2.png` — Wielka Polana — ratusz, stopień 2

```
A forest gathering hall, larger and richer: two storeys of timber with carved beams, a big mossy shingle roof, an upper balcony hung with baskets and lanterns, a stone chimney with a wisp of smoke, a small bell under the gable. Clearly the same kind of building as a smaller village hall, just grown.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `ratusz3.png` — Serce Boru — ratusz, stopień 3

```
The grandest forest hall of a creature-trainer town: three storeys of carved timber grown together with a living tree, roots wrapping a stone foundation, a golden bell tower crowned with leaves, banners, glowing lanterns and wide stone steps. Majestic but still warm and hand-made.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `fort.png` — Palisada — fort

```
A defensive palisade gate for a forest settlement: a heavy log wall with sharpened tops, a reinforced timber gate with iron bands, two watch platforms with conical thatched roofs and small banners, ivy creeping up the logs. Wide and low — clearly a wall, not a house.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko1.png` — Gniazdo Iskier — siedlisko 1

```
A large woven nest built on a broad tree stump, home to small fire creatures: thick braided twigs, warm embers glowing between them, two large cream-coloured eggs resting inside, a few scorched branches.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko2.png` — Suchy Konar — siedlisko 2

```
A hollow fallen log turned into a home: a massive dry tree trunk lying on its side, a round carved doorway with a wooden frame, small round windows, mushrooms and moss on the bark, a little chimney pipe poking through the top.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko3.png` — Rosista Kotlina — siedlisko 3

```
A misty hollow pool where water creatures live: a small round pond of clear turquoise water ringed by wet mossy boulders, reeds and lily pads, thin mist drifting over the surface, a little wooden jetty.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko4.png` — Strumień — siedlisko 4

```
A stream dwelling with a working water wheel: a rocky ledge with a small waterfall, a wooden mill wheel turning in the flow, a mossy timber hut built onto the rock, smooth wet stones and splashing water. The wheel must read clearly as a wheel.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko5.png` — Zielona Kopuła — siedlisko 5

```
A living green dome dwelling: a large rounded hut woven from bent branches and thick leaves, glowing amber windows set into the weave, a mossy entrance arch, flowering vines over the top, a small banner on a pole.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `siedlisko6.png` — Prastare Drzewo — siedlisko 6

```
An ancient enormous tree that is itself a home: a massive gnarled trunk with a carved arched doorway, glowing windows in the bark at several heights, thick roots spreading outward, a huge lush canopy, hanging lanterns and a rope ladder. The tallest and most impressive building in the town.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `specjalny.png` — Krzew Jagodowy — budynek specjalny

```
A cultivated berry grove: a big lush berry bush heavy with red berries growing on a simple wooden trellis, woven baskets full of picked berries at its foot, a small watering can. Tidy and farmed rather than wild.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

### `plac.png` — Plac budowy — wspólny dla wszystkich budynków

```
An empty building site for a fantasy village: a shallow dug foundation pit with a low stone footing, wooden scaffolding poles lashed together with rope, a few planks leaning against the frame, a bucket and a shovel, and a small wooden sign on a post with a lit lantern. Clearly a place where something will be built, with nothing built yet.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only, seen from about 20 degrees above and 25 degrees to the right, orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image, at least 2048x2048. No text, no logo, no watermark, no user interface, no characters, no people.
```

## Trzy panoramy tła

**Puste — bez budynków.** Budynki wstawia gra, po jednym, w miarę rozbudowy.


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

## Sześć tekstur terenu


### `teren-trawa.png` — trawa

```
Lush green meadow grass seen from directly above: many small painted grass blades and tufts, subtle patches of lighter and darker green, a few tiny wildflowers and clover leaves, no bare soil.

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

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-sosna.png` — sosna

```
A single conifer with layered dark green branches and a straight trunk.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-krzak.png` — krzak

```
A low round bush with dense small leaves and a few red berries.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-skala.png` — skała

```
A cluster of grey boulders with mossy tops and cracked faces.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-kopalnia.png` — kopalnia

```
A small mine entrance dug into a rocky mound: a timber-framed opening, wooden support beams, a minecart full of crystals, a lantern on a post.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-sad.png` — sad

```
A small orchard plot: two berry-laden trees, a low wooden fence, woven baskets and a wheelbarrow.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-skrzynia.png` — skrzynia

```
A wooden treasure chest with iron bands and a big golden lock, lid slightly open with warm light spilling out.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-zamek.png` — zamek na mapie

```
A small fortified town seen from a distance: a timber gate tower, a mossy hall roof behind it and a banner on a pole — a map marker standing for a whole settlement.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

### `m-obelisk.png` — obelisk

```
A weathered stone marker overgrown with vines, with a glowing carved symbol on its face.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 60 pixels tall. Square image, at least 1024x1024. No text, no watermark, no user interface, no characters.
```

## Cztery surowce


### `s-pokeball.png` — pokeball — waluta

```
A small round red-and-white catching ball with a dark band across the middle and a pale button, glossy and clean.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

### `s-jagody.png` — jagody

```
A small pile of plump red berries with green leaves, glossy and appetising.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

### `s-kamien.png` — kamień ewolucji

```
A cut violet crystal with clean facets and a soft inner glow.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
```

### `s-odlamki.png` — odłamki

```
A small cluster of pale blue crystal shards on a rocky base.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single object only, seen from about 45 degrees above (adventure-map view), orthographic. Warm sunlight from the upper right. No ground, no grass, no base, no cast shadow. Flat solid magenta #FF00FF background, completely uniform. It must stay readable when scaled down to 32 pixels tall. Square image, at least 512x512. No text, no watermark, no user interface, no characters.
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

