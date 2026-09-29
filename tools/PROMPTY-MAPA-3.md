# Prompty do grafik: mapa świata w stylu gier Pokémon (fala 3)

Mapa przygody była malowana z wzorcem Heroes 3: gęsty baśniowy las, ostre
skały, wóz kupca, kamienna wieża, skrzynia ze skarbem. Po nowym mieście
(`PROMPTY-MIASTO-2.md`) i nowym menu to ostatni duży kawałek baśni.
Najpierw kotwice kierunku (widok z góry jak dotąd — `mapa-kotwica.png` jako
wzór kamery, `kotwica-bor-2.png` jako wzór wykończenia), potem teren
i obiekty. Spis zamian obiektów: `PROJEKT-SWIAT.md`, fala 3.

<!-- plik: kotwica-mapa-2.png | styl: brak | proporcje: 3:2 | wzor: mapa-kotwica.png,kotwica-bor-2.png -->
```
An overworld map region of a creature-collecting adventure game, seen from exactly the same high three-quarter top-down camera as the FIRST attached image, painted in exactly the same clean anime finish, colours and light as the SECOND attached image (a bright modern Pokemon-style town). Like the overworld of a modern Pokemon game: a sunny route through fresh green countryside. Wide pale sandy paths with neat soft edges, patches of tall darker wild grass where wild creatures hide, a clear turquoise river crossed by a small modern wooden footbridge with white railings, low white fences, a wooden route signpost with a blank board, rounded bright trees with simple clean crowns, a few smooth rounded boulders, flower beds.
Scattered points of interest, each small and clearly readable: a tiny white-and-red capture ball lying in the grass, a lost yellow trainer backpack, a red drink vending machine by the path, a wooden lookout deck with coin binoculars on a hill, a small research lab with a leaf-green roof and a satellite dish, a berry tree with colourful round berries, a cable car station with a small gondola, a park gate with a red-and-white barrier arm, a small cave entrance with glowing crystals.
Clean anime game illustration like official key art of a Pokemon game overworld: smooth soft shading, crisp clean vivid colours, clear air, simple rounded shapes, very little texture noise. No medieval or fantasy elements: no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners. No dark gloomy forest, no jagged mountains. No heavy outlines, no pixel art, no 3D render look, no photorealism. Horizontal wide image. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: kotwica-teren-2.png | styl: brak | proporcje: 3:2 | wzor: mapa-kotwica.png,kotwica-bor-2.png -->
```
Pure terrain of an overworld map of a creature-collecting adventure game, seen from exactly the same high three-quarter top-down camera as the FIRST attached image, painted in exactly the same clean anime finish, colours and light as the SECOND attached image. Like the overworld of a modern Pokemon game: fresh bright green meadow, wide pale sandy paths with neat soft edges, patches of tall darker wild grass, a clear turquoise river with a sandy bank, a small pond, a gentle grassy hill with a soft cliff edge of smooth rounded rock, clusters of rounded bright trees and a few neat pine trees, low bushes, flower patches, a few smooth rounded boulders.
Clean anime game illustration like official key art of a Pokemon game overworld: smooth soft shading, crisp clean vivid colours, clear air, simple rounded shapes, very little texture noise. No buildings, no structures, no bridges, no fences, no objects. No dark gloomy forest, no jagged mountains. No heavy outlines, no pixel art, no 3D render look, no photorealism. Horizontal wide image. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```


## Obiekty mapy (etap A)

Pliki `m3-<nazwa>.png`, wzorem kotwica mapy 2. Do gry wczytuje je `tools/mapa3_wczytaj.py` pod dotychczasowymi nazwami sprite'ów.

<!-- plik: m3-oboz-treningowy.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small outdoor creature training camp: a sandy clearing with striped orange training cones, a stack of old tyres, a low hurdle, a wooden punching post and a small blue canopy tent with a bench. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-kamienna-wieza.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small creature trainers' dojo: a compact wooden hall with a curved dark-blue tiled roof, sliding white paper doors, a round blank sign board over the entrance, two stone lanterns and a raked sand yard in front. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-arena.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small outdoor creature battle stadium: a rectangular battle field with crisp white lines and a centre circle, low stands with red and white seats on two sides, two tall light poles. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-drzewo-wiedzy.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A professor's creature research laboratory: a white modern one-storey lab with a leaf-green roof, big glass windows, a satellite dish and solar panels on the roof, a small flower garden and a mailbox. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-wieza-obserwacyjna.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A tall wooden lookout tower: stairs zig-zagging up to a covered top platform with white railings and a pair of coin-operated binoculars on a post. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-ranczo.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A creature ranch: a red barn with white trim and a white door, a fenced paddock with a feeding trough, round hay bales and a metal milk can. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-zrodlo.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A bright red drink vending machine with rows of colourful bottles behind glass, standing on a small paved pad next to a short bench and a small trash bin. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-portal.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small cable car station: a compact modern white station building with a big wheel mechanism under a roof and a bright red gondola hanging from the cable, a short stair up to the platform. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-gniazdo.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A big soft round nest of twigs, leaves and feathers on the ground holding three large spotted creature eggs, with a small wooden post beside it. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-osrodek-ewolucji.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small evolution research station: a white round building with a glass dome glowing softly with rainbow light, and glowing coloured evolution stones on little pedestals outside. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-wiatrak.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A tall modern white wind turbine with three slim blades standing on a small grassy mound, with a small white control hut at its base. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-ognisko.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A trainers' campsite: a small crackling campfire in a ring of stones, two folding camping chairs, a small orange dome tent and a blue cooler box. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-chatka.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A cheerful tree house: a small wooden hut with a leaf-green roof and a round window built on a platform in a round leafy tree, with a rope ladder hanging down. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-woz.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small travelling shop: a cute rounded little delivery van with a blue-and-white striped awning opened on its side over a counter, crates of goods and a small chalkboard stand without text. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-straznica.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A park ranger checkpoint across a road: a small white ranger booth with a grey roof on one side and a long barrier arm across the road painted in bold RED and white stripes, a short low fence on each side. The only red thing is the barrier arm. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-namiot-klucznika.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small ranger kiosk: a tiny white booth with a bold RED and white striped canopy over a counter, a board with key hooks on the back wall. The only red thing is the canopy. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-chata-jasnowidza.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A researcher's field camp: a large beige expedition tent with its flap open, a folding table with an unrolled map and a magnifying glass, and a telescope on a tripod. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-skrzynia.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A lost yellow trainer backpack lying on its side with a red-and-white capture ball peeking out of the open pocket. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-kopalnia-pokeball.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small capture-ball factory: a white factory building with a big red-and-white ball emblem on its front, a short conveyor carrying red-and-white balls out of a door, a chimney with a puff of white steam. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-kopalnia-kamien.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small evolution stone quarry: a rounded rocky dig site with crates of colourful glowing evolution stones (red, blue, green, yellow), a small yellow crane and a mine cart on short rails. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-kopalnia-odlamek.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A crystal cave: a cave entrance in a smooth rounded rock mound with clusters of glowing cyan and violet crystals around it, a lamp post and a small rail cart full of crystal shards. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-sad.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A berry farm: neat rows of round berry bushes full of colourful berries inside a low white fence, baskets of berries and a small open canopy on four posts. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-zamek-las.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small bright trainer town packed together as one map landmark: a creature healing centre with a big glossy red dome roof and a red-and-white ball emblem in the middle, two cosy houses with leaf-green roofs and a small lab with a clock tower around it, short paved paths and a few round trees. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-zamek-ogien.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A creature battle gym: a large modern stadium hall with a big arched orange-red roof, a large golden star emblem above the wide entrance, white pillars and wide front steps. Single map object only, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Only the object itself and the little bit of ground right under it (a doorstep, paving, a sandy spot); no lawn around it, no base, no pedestal, no cast shadow. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 100 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes. No medieval or fantasy elements, no castles, no stone towers, no wagons, no treasure chests, no thatch, no banners, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```


## Teren — próbka na Polanie (etap B)

Tekstury `m3-teren-*` (kryjące, kafelkowane przez `render_mapa.py`) i rysunki zestawu `polana` (`m3-polana-*`). Wzorem kotwica mapy 2.

<!-- plik: m3-teren-trawa.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
Fresh bright green meadow grass, short and even, with soft lighter and darker green patches and a few tiny white and yellow flowers. Seamless tileable top-down terrain texture for the overworld map of a bright modern creature-collecting adventure game, in exactly the same clean anime finish and fresh colours as the attached map image. Flat overhead view of the ground only, edges matching on all four sides so it can be tiled without visible seams, even soft light with no directional shadows, simple shapes and very little texture noise. No objects, no rocks, no trees, no paths, no buildings, no characters, no vignette, no border, no text.
```

<!-- plik: m3-teren-trawa-2.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
Fresh bright green meadow grass, short and even, painted anew with different soft light and dark green patches and a few tiny clover leaves. Seamless tileable top-down terrain texture for the overworld map of a bright modern creature-collecting adventure game, in exactly the same clean anime finish and fresh colours as the attached map image. Flat overhead view of the ground only, edges matching on all four sides so it can be tiled without visible seams, even soft light with no directional shadows, simple shapes and very little texture noise. No objects, no rocks, no trees, no paths, no buildings, no characters, no vignette, no border, no text.
```

<!-- plik: m3-teren-trawa-3.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
Fresh bright green meadow grass with a few slightly taller darker grass tufts spread evenly, soft and clean. Seamless tileable top-down terrain texture for the overworld map of a bright modern creature-collecting adventure game, in exactly the same clean anime finish and fresh colours as the attached map image. Flat overhead view of the ground only, edges matching on all four sides so it can be tiled without visible seams, even soft light with no directional shadows, simple shapes and very little texture noise. No objects, no rocks, no trees, no paths, no buildings, no characters, no vignette, no border, no text.
```

<!-- plik: m3-teren-droga-polana.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A pale warm sandy dirt road surface, smooth and packed, with a few tiny pebbles and faint soft tyre-like tracks, clean and light. Seamless tileable top-down terrain texture for the overworld map of a bright modern creature-collecting adventure game, in exactly the same clean anime finish and fresh colours as the attached map image. Flat overhead view of the ground only, edges matching on all four sides so it can be tiled without visible seams, even soft light with no directional shadows, simple shapes and very little texture noise. No objects, no rocks, no trees, no paths, no buildings, no characters, no vignette, no border, no text.
```

<!-- plik: m3-teren-ziemia-drobna.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
Warm light brown packed earth with fine sand and a few tiny pebbles, soft and clean. Seamless tileable top-down terrain texture for the overworld map of a bright modern creature-collecting adventure game, in exactly the same clean anime finish and fresh colours as the attached map image. Flat overhead view of the ground only, edges matching on all four sides so it can be tiled without visible seams, even soft light with no directional shadows, simple shapes and very little texture noise. No objects, no rocks, no trees, no paths, no buildings, no characters, no vignette, no border, no text.
```

<!-- plik: m3-teren-ziemia.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
Warm brown packed earth with soft lighter sandy patches and a few small pebbles, clean and simple. Seamless tileable top-down terrain texture for the overworld map of a bright modern creature-collecting adventure game, in exactly the same clean anime finish and fresh colours as the attached map image. Flat overhead view of the ground only, edges matching on all four sides so it can be tiled without visible seams, even soft light with no directional shadows, simple shapes and very little texture noise. No objects, no rocks, no trees, no paths, no buildings, no characters, no vignette, no border, no text.
```

<!-- plik: m3-polana-kepa-las-1.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A dense block of bright overworld forest: about ten round-crowned leafy trees and three neat pine trees packed tightly together, crowns overlapping into one solid wall of fresh green with soft shade inside, several rows deep, the back row taller. A bit wider than tall; the row of trunks and low bushes at the bottom spreads across the whole width so pieces placed side by side join into one continuous forest. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-las-2.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A thick clump of bright overworld forest: eight to ten big round leafy trees of slightly different fresh greens packed together into one billowing canopy, two neat pines at the back, low round bushes along the bottom. One solid block of forest with no gaps. A bit wider than tall; the bushes spread across the whole width. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-las-3.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A dense stand of neat bright green pine trees of uneven heights crowded together in several rows, soft rounded tiers of branches, a couple of round leafy trees at the front, low bushes along the bottom. One solid block of forest. A bit wider than tall; the bottom spreads across the whole width. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-las-4.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A cheerful block of mixed overworld forest: round leafy trees in fresh and yellow-greens, a few neat pines, one small tree with pink blossoms, all packed together into one solid canopy with low bushes and a few flowers along the bottom. A bit wider than tall; the bottom spreads across the whole width. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-drzewo.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A single big round leafy tree: a broad billowing crown of fresh green leaves in soft round clusters, a straight brown trunk, a small round bush at its foot. About as wide as tall. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-drzewo-b.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A single medium round leafy tree with a lighter yellow-green crown in soft round clusters and a slim brown trunk, a few flowers at its foot. About as wide as tall. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-sosna.png | styl: brak | proporcje: 2:3 | wzor: kotwica-mapa-2.png -->
```
A single neat pine tree: a pointed crown of soft rounded tiers of fresh dark green branches, a short straight brown trunk. Much taller than wide. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-sosna-b.png | styl: brak | proporcje: 2:3 | wzor: kotwica-mapa-2.png -->
```
A single slightly smaller neat pine tree with a fuller rounded crown of soft green tiers and a short brown trunk. Taller than wide. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-sosna-mala.png | styl: brak | proporcje: 2:3 | wzor: kotwica-mapa-2.png -->
```
A single small young pine tree with three soft rounded tiers of fresh green branches. Taller than wide. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-krzak.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A single round bright green bush with a few small white flowers. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-krzak-2.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small cluster of two round bright green bushes with a few tiny berries. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-skaly-1.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A grassy hill block of the overworld: a raised plateau of fresh green grass with a steep smooth cliff face of warm beige-grey rounded rock on the front, a few round bushes on top. Clearly an impassable ledge, not a pile of boulders. Wider than tall; the foot of the cliff spreads across the whole width so pieces placed side by side join into one continuous ridge. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-skaly-2.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A long grassy ridge of the overworld: a raised green plateau with a stepped cliff of smooth warm beige-grey rock layers on the front, a small pine and a bush on top. Wider than tall; the foot spreads across the whole width. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-skaly-3.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A rounded rocky hill of the overworld: two soft rounded grassy tops above smooth warm beige-grey rock cliffs with gentle ledges, a few flowers. Wider than tall; the foot spreads across the whole width. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kepa-skaly-4.png | styl: brak | proporcje: 3:2 | wzor: kotwica-mapa-2.png -->
```
A tall grassy cliff block of the overworld: a high green plateau with a sheer smooth warm beige-grey rock wall and a tiny waterfall trickle, bushes on the rim. Wider than tall; the foot spreads across the whole width. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-skala.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A single smooth rounded warm grey boulder with a little grass tuft at its foot. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```

<!-- plik: m3-polana-kopiec.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small low mound of two smooth rounded grey stones with grass tufts. Painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera. Transparent background, a clear margin on all four sides, nothing cropped. Clean anime game illustration like the overworld of a modern Pokemon game: smooth soft shading, crisp clean vivid colours, simple rounded shapes, very little texture noise. No dark gloomy colours, no jagged shapes, no heavy outlines, no pixel art, no 3D render look, no photorealism. No text, no characters, no creatures, no buildings.
```


## Znajdźki (stosy surowców i kamień ewolucji)

Pliki `m3-polana-stos-*.png` i `m3-artefakt.png`, wzorem kotwica mapy 2 — jasne, w stylu nowych obiektów. Wczytuje `tools/mapa3_wczytaj.py`.

<!-- plik: m3-polana-stos-pokeball.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small neat pile of five round toy capsules lying together on the ground, one on top: each capsule is a glossy sphere with a red top half and a white bottom half. Single small pickup item for a game map, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Bright, saturated, cheerful colours and a light, sunny feel — nothing dark or muddy. Only the item and the tiny bit of ground right under it; no base, no pedestal, no cast shadow. The item fills most of the image. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 40 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes, a thin dark outline. No medieval or fantasy elements, no treasure chests, no sacks, no gold coins, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-polana-stos-jagody.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small round woven wicker basket full of big round glossy berries in pink, blue and orange, with two berries spilled on the ground beside it. Single small pickup item for a game map, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Bright, saturated, cheerful colours and a light, sunny feel — nothing dark or muddy. Only the item and the tiny bit of ground right under it; no base, no pedestal, no cast shadow. The item fills most of the image. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 40 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes, a thin dark outline. No medieval or fantasy elements, no treasure chests, no sacks, no gold coins, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-polana-stos-odlamki.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small cluster of bright glowing cyan and violet crystal shards growing out of the ground, a few loose shards around it. Single small pickup item for a game map, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Bright, saturated, cheerful colours and a light, sunny feel — nothing dark or muddy. Only the item and the tiny bit of ground right under it; no base, no pedestal, no cast shadow. The item fills most of the image. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 40 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes, a thin dark outline. No medieval or fantasy elements, no treasure chests, no sacks, no gold coins, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-polana-stos-kamien-ewolucji.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
A small heap of four smooth rounded glowing evolution stones, one red, one blue, one green and one yellow, each with a simple lighter symbol inside (a flame, a water drop, a leaf, a lightning bolt). Single small pickup item for a game map, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Bright, saturated, cheerful colours and a light, sunny feel — nothing dark or muddy. Only the item and the tiny bit of ground right under it; no base, no pedestal, no cast shadow. The item fills most of the image. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 40 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes, a thin dark outline. No medieval or fantasy elements, no treasure chests, no sacks, no gold coins, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```

<!-- plik: m3-artefakt.png | styl: brak | proporcje: 1:1 | wzor: kotwica-mapa-2.png -->
```
One single smooth rounded glowing moon-white evolution stone with a soft rainbow shimmer, resting on a tiny tuft of grass, with small sparkles around it. Single small pickup item for a game map, painted in exactly the same clean anime finish, colours and light as the attached map image, and seen from the same high three-quarter top-down camera as the objects in it. Bright, saturated, cheerful colours and a light, sunny feel — nothing dark or muddy. Only the item and the tiny bit of ground right under it; no base, no pedestal, no cast shadow. The item fills most of the image. Transparent background around it, a clear margin on all four sides, nothing cropped by the edges. It must read clearly when scaled down to 40 pixels tall. Clean anime game illustration like official Pokemon game art, smooth soft shading, crisp clean vivid colours, simple rounded shapes, a thin dark outline. No medieval or fantasy elements, no treasure chests, no sacks, no gold coins, no pixel art, no 3D render look, no photorealism. No text, no letters, no logo, no watermark, no user interface, no characters, no people, no creatures.
```


## Obiekty bez podstawki

Pliki `m3b-<nazwa>.png`: te same obiekty, przemalowane z oryginałem jako wzorem, bez podstawki gruntu — teren planszy dochodzi wprost do budynku. `tools/mapa3_wczytaj.py` bierze je zamiast `m3-<nazwa>.png`.

<!-- plik: m3b-woz.png | styl: brak | proporcje: 1:1 | wzor: m3-woz.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-wieza-obserwacyjna.png | styl: brak | proporcje: 1:1 | wzor: m3-wieza-obserwacyjna.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-gniazdo.png | styl: brak | proporcje: 1:1 | wzor: m3-gniazdo.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-oboz-treningowy.png | styl: brak | proporcje: 1:1 | wzor: m3-oboz-treningowy.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-chata-jasnowidza.png | styl: brak | proporcje: 1:1 | wzor: m3-chata-jasnowidza.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-chatka.png | styl: brak | proporcje: 1:1 | wzor: m3-chatka.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-drzewo-wiedzy.png | styl: brak | proporcje: 1:1 | wzor: m3-drzewo-wiedzy.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-kamienna-wieza.png | styl: brak | proporcje: 1:1 | wzor: m3-kamienna-wieza.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-kopalnia-odlamek.png | styl: brak | proporcje: 1:1 | wzor: m3-kopalnia-odlamek.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-kopalnia-pokeball.png | styl: brak | proporcje: 1:1 | wzor: m3-kopalnia-pokeball.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-namiot-klucznika.png | styl: brak | proporcje: 1:1 | wzor: m3-namiot-klucznika.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-ognisko.png | styl: brak | proporcje: 1:1 | wzor: m3-ognisko.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-osrodek-ewolucji.png | styl: brak | proporcje: 1:1 | wzor: m3-osrodek-ewolucji.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-portal.png | styl: brak | proporcje: 1:1 | wzor: m3-portal.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-ranczo.png | styl: brak | proporcje: 1:1 | wzor: m3-ranczo.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-skrzynia.png | styl: brak | proporcje: 1:1 | wzor: m3-skrzynia.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-straznica.png | styl: brak | proporcje: 1:1 | wzor: m3-straznica.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-wiatrak.png | styl: brak | proporcje: 1:1 | wzor: m3-wiatrak.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-zamek-ogien.png | styl: brak | proporcje: 1:1 | wzor: m3-zamek-ogien.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-zrodlo.png | styl: brak | proporcje: 1:1 | wzor: m3-zrodlo.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-polana-kopiec.png | styl: brak | proporcje: 1:1 | wzor: m3-polana-kopiec.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-polana-krzak.png | styl: brak | proporcje: 1:1 | wzor: m3-polana-krzak.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-polana-stos-jagody.png | styl: brak | proporcje: 1:1 | wzor: m3-polana-stos-jagody.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-polana-stos-kamien-ewolucji.png | styl: brak | proporcje: 1:1 | wzor: m3-polana-stos-kamien-ewolucji.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-polana-stos-odlamki.png | styl: brak | proporcje: 1:1 | wzor: m3-polana-stos-odlamki.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```

<!-- plik: m3b-polana-stos-pokeball.png | styl: brak | proporcje: 1:1 | wzor: m3-polana-stos-pokeball.png -->
```
Repaint exactly this same map object from the attached image: the same object, the same design, colours, proportions, camera angle and clean anime finish — change nothing about the object itself. The ONLY change: remove the round patch of ground, sand, paving, grass or pad it stands on. No ground at all: the object stands directly on nothing, with a fully transparent background right up to its walls, wheels, legs and base, so it can be placed onto any painted terrain. Keep only the object's own solid parts (a doorstep or steps attached to it are fine). Transparent background, clear margin on all sides, nothing cropped. No cast shadow, no glow, no outline around the silhouette, no text.
```
