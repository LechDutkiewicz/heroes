# Prompty do ilustracji ekranów wyniku

Ekran wyniku (`src/scenes/WynikScene.ts`) ma trzy malowane plansze — tak jak
Heroes 2 ma osobną animację wygranej, przegranej i zakończenia kampanii.
Każda leży pod całym ekranem, a tekst wchodzi na nią w panelu u dołu.

Droga do gry jest krótsza niż przy obiektach mapy, bo tu nie ma czego wycinać:

    python3 tools/generuj_grafiki.py wynik-zwyciestwo.png wynik-porazka.png wynik-koniec.png
    python3 tools/wynik_wczytaj.py      # kadruje do 960 × 694 i zapisuje JPG w public/wynik/

## Stan: ilustracji jeszcze nie ma

Przy pierwszym podejściu (2026-09-24) API odpowiadało `402 — prepayment
credits are depleted` na wszystkich modelach obrazkowych. Ekran wyniku stoi
więc na tym, co już było: `wynik_wczytaj.py` przemalowuje panoramy miast
z `tools/wsad/` (Bór w słońcu, ten sam Bór o zmierzchu, Grota nocą), a scena
kładzie na nie bohatera, zamek i stworki z armii jako osobne, ruchome warstwy.

Kiedy pliki z promptów niżej trafią do `tools/wsad/`, `wynik_wczytaj.py`
weźmie je zamiast panoram. Wtedy trzeba też zdecydować w `WynikScene`, czy
warstwowy bohater zostaje — na gotowej ilustracji bohater już jest.

## Trzy zasady, które decydują o tym, czy obrazek w ogóle da się użyć

1. **Dolna ćwiartka jest spokojna.** Leży na niej panel z tekstem i przyciskami.
   Postać wciśnięta w dół kadru znika pod tabliczką.
2. **Stworki są NASZE, nie z bajki.** Model chętnie rysuje Pikachu, kiedy słyszy
   „pokemon" — a nasze stworki to autorskie rysunki (patrz `factions.ts`).
   Dlatego w promptach opisujemy konkretne kształty, bez nazw.
3. **Porażka jest smutna, ale łagodna.** Grają ośmiolatki. Żadnych ran, łez
   w potokach ani broni — bohater siedzi, stworki go pocieszają, a na horyzoncie
   już się przejaśnia. Obrazek ma mówić „jutro spróbujemy znowu", nie „koniec".

### Blok stylu

<!-- styl: wynik -->
```
Full-screen painted illustration for the ending screen of a children's fantasy
strategy game, in the spirit of the Heroes of Might and Magic II victory and
defeat screens but reimagined as a modern storybook painting. Hand-painted
digital illustration, soft visible brush texture, rich saturated but warm
palette, cinematic lighting, strong depth with atmospheric perspective.
Wide landscape composition. Keep the characters in the upper two thirds of the
frame and centred horizontally; the bottom quarter must be calm and simple
(grass, path, water, ground) because a text panel is placed over it.
Creatures are cute, friendly, big-eyed ORIGINAL monsters, not characters from
any existing franchise. The hero is a ten-year-old boy trainer: red-and-white
cap, brown hair, blue short-sleeve jacket over a white T-shirt, brown shorts,
brown shoulder satchel, brown boots.
No text, no letters, no logos, no UI, no frame, no border, no watermark.
```

## Zwycięstwo

<!-- plik: wynik-zwyciestwo.png | styl: wynik -->
```
The young trainer stands on a grassy hilltop at golden sunrise, one arm raised
high in triumph, the other holding a tall blue banner with a golden star emblem
flapping in the wind. His creature friends cheer and leap around him: a small
green sprout creature with a single leaf on its head, a round pale-blue water
creature, a little orange fire lizard with a flame on its tail, and a red
crested bird-dragon flying overhead. Behind them on a far hill a fairy-tale
stone castle with blue roofs flies golden flags; a winding dirt road leads to
it through an emerald forest. Golden light rays, festive confetti and
sparkles in the sky. Joyful, heroic, warm.
```

## Porażka

<!-- plik: wynik-porazka.png | styl: wynik -->
```
Evening after a lost battle, soft blue-violet dusk with a light gentle rain.
The young trainer sits on a mossy log under a big old oak, holding his cap in
his hands, looking thoughtful but calm, not crying. His creature friends
comfort him: the small green sprout creature with a leaf on its head leans on
his knee, the round pale-blue water creature holds a big green leaf over his
head like an umbrella, the little orange fire lizard warms his hands with a
tiny flame; a small campfire glows warmly beside them. Far away across the
valley a grey castle with silver banners stands under dark clouds. At the
horizon the clouds are breaking: a faint rainbow and the first stars promise a
new day. Melancholic but cosy and hopeful. Nothing scary, no injuries, no
weapons.
```

## Koniec kampanii

<!-- plik: wynik-koniec.png | styl: wynik -->
```
The happy ending of the whole story, at night. In the background a crystal
cave in a hillside, the Moon Grotto, glows softly silver-blue again under a
huge full moon. In the foreground an emerald forest clearing celebrates:
paper lanterns hang between the trees, fireworks bloom in the starry sky,
and a joyful parade of many cute creatures of all shapes and colours dances
back home into the forest. In the centre the young trainer is being honoured
by an old kind forest guardian, an old ranger with a long white beard, a green
hooded cloak and a wooden staff, who places a golden medal on a ribbon around
the boy's neck. Magical, triumphant, heartwarming.
```
