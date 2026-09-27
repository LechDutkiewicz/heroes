# Prompty do grafik: ekran miasta (budynki etapu 6)

Pozostałe budynki miasta mają prompty w `tools/PROMPTY.md` (bez znaczników,
generowane ręcznie). Tu tylko to, co generuje `tools/generuj_grafiki.py`.

## Centrum Pokemon i Sala treningowa

Dwa budynki, które stoją w każdym mieście od początku (nie buduje się ich):
Centrum Pokemon budzi zemdlone stworki, Sala treningowa podnosi poziom.
Generowane z wzorami (stworki + kotwica miasta), inne frakcje dostają
przemalowanie jak reszta budynków (`tools/frakcje_przemaluj.py`).

<!-- plik: centrum.png | styl: brak | proporcje: 1:1 | wzor: referencja-stworki.png,miasto-kotwica.png -->
```
A cosy creature healing centre: a round two-storey cottage with a big red-and-cream rounded roof, a wide arched glass double door with warm light inside, a large friendly heart-shaped sign made of wood above the door painted pink, round windows with flower boxes, a small bench and a potted plant by the door, a little chimney with a curl of steam. It must read at a glance as the place where tired creatures get healed.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image. No text, no logo, no watermark, no user interface, no characters, no people.
```

<!-- plik: sala.png | styl: brak | proporcje: 1:1 | wzor: referencja-stworki.png,miasto-kotwica.png -->
```
An outdoor creature training ground: a sturdy open-sided wooden pavilion with a thick thatched roof, a sand-covered sparring ring in front of it bordered by a low rope on wooden posts, straw training dummies and a stack of logs for practice, a wooden target board, a small drum and a weapon-free training bell hanging from a beam. Friendly and sporty, not military.

Style: hand-painted 2D game art for a children's creature-collecting strategy game. Smooth anti-aliased painting, soft airbrushed shading with one clear light side and one shadow side, warm saturated storybook palette, rounded friendly chunky shapes with exaggerated proportions, thick beams and oversized roofs, cosy and inviting rather than gritty. Rich material detail: wood grain, mossy stone, thatch, leaves, worn paint. No pixel art, no hard aliased edges, no black outlines, no cel-shaded comic look, no photorealism, no 3D render look. Match the finish, palette and softness of the creatures in the attached reference image: smooth airbrushed shading, no hard outlines, saturated but not neon colours, rounded volumes.

Single building only. Use exactly the same viewing angle and camera height as the buildings in the attached town reference image — do not invent a new camera, do not look down more steeply. Orthographic, no lens distortion, centred with a small margin. Warm sunlight from the upper right. No ground, no grass, no base, no pedestal, no cast shadow. The background must be pure white #FFFFFF, absolutely uniform, with no gradient, no vignette and no shadow falling on it. Leave a clear margin of background on all four sides — the building must not touch or be cropped by any edge of the image. Banners and flags carry a simple stylised green leaf emblem; no Poke Ball symbols, no logos from other games. The silhouette must stay clear and recognisable when the image is scaled down to 200 pixels tall. Square image. No text, no logo, no watermark, no user interface, no characters, no people.
```
