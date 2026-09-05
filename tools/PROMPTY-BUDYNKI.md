# Budynki mapy przygody — wybór z Heroes 3 i prompty do grafik

Mapa ma dziś pięć rodzajów obiektów (`surowiec`, `kopalnia`, `zamek`, `potwor`,
`skrzynia`, `artefakt`) i **dwie** grafiki budynków: `kopalnia.png` i `sad.png`.
Cztery surowce dzielą więc jeden obrazek kopalni, a cała warstwa „budynków
przygody", która w Heroes 3 daje mapie sens zwiedzania, nie istnieje.

Ten plik jest listą zakupów: co warto dodać, dlaczego akurat to, i gotowy prompt
na obrazek. Prompty są po angielsku, bo generatory obrazów tak działają lepiej.

## Jak używać promptów

1. Wklej **blok stylu** (niżej), a pod nim prompt konkretnego budynku.
2. Generuj kwadrat 1024 × 1024, przezroczyste tło.
3. Zmniejsz do rozmiaru z kolumny „plik" i zapisz w `public/mapa/`.
4. Dopisz nazwę do listy w `AdventureScene.preload` (ładuje się jako `m-<nazwa>`).

Obrazek stoi na polu **stopami na dole**: `setOrigin(0.5, 1)`, więc dolna
krawędź kadru to grunt. Żadnego cienia w pliku — scena rysuje własny elipsowy
cień pod obiektem. Żadnego kawałka trawy ani podstawki pod budynkiem: pod spodem
jest teren mapy i prostokątna „łatka" natychmiast to zdradza.

### Blok stylu (wklejać przed każdym promptem)

```
Game asset for a children's fantasy strategy map, Heroes of Might and Magic III
adventure-map object seen from a slightly elevated three-quarter view, facing
the camera. Hand-painted storybook look: soft smoothed edges, no visible pixels,
no outline, clean readable silhouette that stays legible at 60 pixels tall.
Warm saturated palette: brown 170,108,50 / green 92,168,78 / grey 140,150,162 /
red 222,62,58 / gold 250,198,62. Soft top-left light, gentle ambient occlusion,
no cast shadow on the ground. Fully transparent background, object centered,
bottom edge of the object touching the bottom of the frame, nothing cropped.
No text, no logos, no UI, no characters, no ground patch or base plate.
```

---

## 1. Kopalnie surowców — cztery zamiast jednej

Największa dziura i najtańsza do zasypania: mechanika już działa (`kopalnia`,
`nasz`, `dochod`), brakuje wyłącznie obrazków. Dziś kopalnia kamieni ewolucji
i wytwórnia pokeballi wyglądają identycznie, więc z mapy nie da się odczytać,
co się zajmuje — a to jest cała informacja, jakiej potrzebuje gracz.

| Budynek | Odpowiednik H3 | Daje dziennie | Plik (px) |
|---|---|---|---|
| Wytwórnia Pokeballi | kopalnia złota | pokeballe | `wytwornia-pokeballi.png` (57 × 57) |
| Kopalnia Kamieni Ewolucji | kopalnia kryształu | kamienie | `kopalnia-kamieni.png` (57 × 57) |
| Huta Odłamków | kopalnia klejnotów | odłamki | `huta-odlamkow.png` (57 × 57) |
| Sad Jagodowy | tartak | jagody | *jest* (`sad.png`) |

**Wytwórnia Pokeballi**
```
A small red-and-white workshop hut that manufactures poke balls: rounded roof
painted red on the upper half and white on the lower half with a black band and
a round white button at the front, wooden walls, a stone chimney puffing a
little smoke, a wooden crate of finished red-and-white spheres beside the door.
```

**Kopalnia Kamieni Ewolucji**
```
A mine entrance dug into a rocky hillside, timber-framed doorway with crossed
wooden beams, a wooden minecart on rails outside loaded with glowing violet
crystals, two large violet crystal shards growing out of the rock beside the
entrance, faint purple glow from inside the tunnel.
```

**Huta Odłamków**
```
A small stone forge building with a tall chimney and an open arched furnace
mouth glowing warm orange inside, cyan crystal shards stacked in a wooden bin
beside it, an anvil and tongs outside, thin smoke from the chimney.
```

## 2. Budynki podnoszące bohatera

W Heroes 3 to one zamieniają wędrówkę w opłacalną decyzję: nadłóż drogę, dostań
liczbę na stałe. Statystyki bohatera (`atak`, `obrona`, `ruchMax`,
`doswiadczenie`) już istnieją, więc każdy z nich to kilka linijek w `odwiedz`.

| Budynek | Odpowiednik H3 | Efekt (jednorazowo) | Plik (px) |
|---|---|---|---|
| Obóz Treningowy | Mercenary Camp | +1 atak | `oboz-treningowy.png` (72 × 72) |
| Kamienna Wieża | Marletto Tower | +1 obrona | `kamienna-wieza.png` (60 × 96) |
| Drzewo Wiedzy | Tree of Knowledge | +poziom doświadczenia | `drzewo-wiedzy.png` (96 × 120) |
| Arena | Arena | wybór: +2 atak albo +2 obrona | `arena.png` (96 × 72) |

**Obóz Treningowy**
```
A small training camp: two beige canvas tents with red pennants, a wooden weapon
rack holding wooden practice swords and shields, a straw training dummy, a
round campfire ring with grey stones, tidy and welcoming rather than military.
```

**Kamienna Wieża**
```
A short round stone watchtower, two storeys tall, grey blocks with mossy joints,
a conical blue slate roof, one small arched window, a wooden door and three
worn stone steps, a shield hanging beside the door.
```

**Drzewo Wiedzy**
```
An ancient wise tree with a thick gnarled trunk and a broad round green canopy,
a friendly face suggested by the bark knots, golden leaves glittering among the
green, a few open books resting in a hollow at the base of the trunk.
```

**Arena**
```
A small round open-air arena: a low circle of sand ringed by pale stone benches
and short wooden posts, two crossed training staves standing in the sand,
colourful pennants on poles around the rim, seen from a raised three-quarter
angle so the sand circle is visible.
```

## 3. Ruch i mapa

Mgła wojny i punkty ruchu są już zaimplementowane, więc te budynki grają od
razu — a dziecku dają dokładnie to, co w Heroes 3 jest najprzyjemniejsze:
zniknięcie kawałka mgły i „jeszcze jedna tura ruchu".

| Budynek | Odpowiednik H3 | Efekt | Plik (px) |
|---|---|---|---|
| Wieża Obserwacyjna | Redwood Observatory | odsłania mgłę w promieniu 8 pól | `wieza-obserwacyjna.png` (72 × 108) |
| Ranczo Ponyt | Stables | +400 ruchu na 3 dni | `ranczo.png` (84 × 66) |
| Źródło Mocy | Fountain of Youth | pełny ruch od razu, raz dziennie | `zrodlo.png` (60 × 54) |
| Portal | Monolith (dwukierunkowy) | przenosi do drugiego portalu w tej samej barwie | `portal.png` (60 × 84) |

**Wieża Obserwacyjna**
```
A tall slender wooden lookout tower on a rocky outcrop, four legs with cross
bracing, a railed observation platform at the top with a small shingled canopy,
a brass telescope on the platform pointing outward, a ladder up one side.
```

**Ranczo Ponyt**
```
A cheerful horse ranch: a long low red barn with a wide open doorway and hay
bales, a white wooden paddock fence in front, a water trough and a bucket,
horseshoes nailed above the barn door, no animals visible.
```

**Źródło Mocy**
```
A small natural spring: clear turquoise water welling out of a ring of smooth
mossy grey stones into a shallow round pool, sparkling droplets rising in the
air, two tufts of grass and small white flowers at the rim.
```

**Portal**
```
A standing stone gateway: two rough dark-grey monoliths carved with simple
glowing cyan runes, joined by a lintel, the opening filled with a swirling
translucent cyan energy disc, faint sparks drifting upward.
```

## 4. Wojsko

`Obiekt.dostepne` i `KOSZT_ODDZIALU` obsługują już rekrutację w zamku, więc
zewnętrzne siedlisko to ten sam kod na mapie — a to najmocniejszy powód, żeby
w Heroes 3 w ogóle zbaczać z drogi.

| Budynek | Odpowiednik H3 | Efekt | Plik (px) |
|---|---|---|---|
| Gniazdo | zewnętrzne siedlisko (external dwelling) | rekrutacja jednego gatunku, przyrost dzienny | `gniazdo.png` (72 × 72) |
| Ośrodek Ewolucji | Hill Fort | ulepsza oddziały za kamienie ewolucji | `osrodek-ewolucji.png` (84 × 84) |

**Gniazdo**
```
A large woven nest of branches and dry grass built on a wooden platform between
two tree stumps, soft moss lining inside, three pale speckled eggs in the
middle, a small wooden sign post beside it, cosy and inviting.
```

**Ośrodek Ewolucji**
```
A small laboratory pavilion: pale stone platform with four carved pillars
holding a domed blue roof, a glowing violet crystal pedestal in the centre with
a beam of soft light rising from it, evolution stones of different colours set
into the pillar bases.
```

## 5. Drobiazgi jednorazowe

Wypełniacze, których w Heroes 3 jest najwięcej: nagroda mała, ale mapa bez nich
jest pusta między dużymi obiektami. Wszystkie działają jak istniejący `surowiec`
— wchodzisz, bierzesz, znika.

| Budynek | Odpowiednik H3 | Efekt | Plik (px) |
|---|---|---|---|
| Wiatrak | Windmill | losowy surowiec, raz na tydzień | `wiatrak.png` (72 × 108) |
| Ognisko | Campfire | pokeballe + jeden surowiec | `ognisko.png` (48 × 42) |
| Chatka Skrzata | Lean-To | garść jednego surowca | `chatka.png` (60 × 54) |
| Wóz Kupca | Wagon | artefakt albo surowce | `woz.png` (84 × 66) |

**Wiatrak**
```
A small stone windmill with a white plaster upper storey, a conical wooden roof
and four wooden lattice sails with pale canvas, a low wooden door, a sack of
grain and a wooden bucket leaning against the wall.
```

**Ognisko**
```
A small campfire: a ring of grey stones around burning logs with warm orange
flames and glowing embers, two logs arranged as seats beside it, a couple of
coins and a small crystal glinting in the grass next to the ring.
```

**Chatka Skrzata**
```
A tiny lean-to shelter of leaning wooden planks and a mossy shingle roof against
a mossy boulder, a small opening at the front, a wooden bowl and a bundle of
sticks in the doorway, ivy growing over one side.
```

**Wóz Kupca**
```
A merchant's covered wagon with wooden spoked wheels, an arched canvas cover in
cream and red stripes, wooden crates and a rolled rug tied to the side, the
draught pole resting on the ground, no horse.
```

---

## Świadomie odrzucone

Żeby lista nie odrastała przy każdym powrocie do tematu — powody, nie gust:

- **Chata Wiedźmy, Uniwersytet, Szkoła Magii** — uczą umiejętności drugorzędnych
  i czarów, których gra nie ma. Budynek bez efektu to dekoracja z napisem.
- **Studnia Magiczna, Kula Zaklęć, Ołtarz** — cała ta rodzina wisi na manie
  i księdze czarów. Ich dodanie to najpierw system czarów, potem grafika.
- **Świątynia, Idol Szczęścia, Fontanna Fortuny** — morale i szczęście nie
  istnieją w `battle.ts`; bez nich dają liczbę, której nigdzie nie widać.
- **Latarnia Morska, Stocznia, Wir Wodny** — woda jest nieprzejezdna i nie ma
  łodzi. To osobny, duży temat.
- **Obeliski i Graal** — wymagają układanki z mapy skarbu rozłożonej na całą
  rozgrywkę. Dla ośmiolatka to nagroda oddalona o kilka godzin gry.
- **Kurhan Wojownika, Pirackie Skrzynie** — dają artefakt za karę do morale.
  Bez morale zostaje sam zysk, czyli druga skrzynia.
- **Tawerna, Obóz Uchodźców** — obie kupują bohaterów albo oddziały „obcych".
  Gra ma jednego bohatera, więc nie ma dokąd tego podłączyć.
- **Namiot Strażnika i Brama Graniczna** — mechanicznie sensowne (kluczem
  otwiera się przejście), ale to dodatkowy stan gry i blokada drogi. Warte
  rozważenia dopiero, gdy mapa będzie miała wyraźne krainy do zamykania.
