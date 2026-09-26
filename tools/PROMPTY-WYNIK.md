# Prompty do ilustracji ekranów wyniku

Ekran wyniku (`src/scenes/WynikScene.ts`) ma trzy malowane plansze — tak jak
Heroes 2 ma osobną animację wygranej, przegranej i zakończenia kampanii.
Każda to JEDNA ilustracja na cały ekran (960 × 694); tytuł leży na niebie,
a tekst i przyciski w karcie u dołu. Postacie są na obrazie — scena nie
dokłada wyciętych figurek, tylko ruch (konfetti, deszcz, ogień, fajerwerki).

    OPENAI_IMAGE_MODEL=gpt-image-1.5 OPENAI_IMAGE_QUALITY=medium \
      python3 tools/generuj_grafiki.py --nadpisz wynik-zwyciestwo.png wynik-porazka.png wynik-koniec.png
    python3 tools/wynik_wczytaj.py      # kadruje do 960 × 694 i zapisuje JPG w public/wynik/

## Stan (2026-09-25)

Wszystkie trzy są w kadrze 3:2 (1536 × 1024) z `gpt-image-1.5`, jakość
`medium` (~$0.07 za obrazek). Czego nauczyły dwa podejścia:

- **Kwadrat nie działa.** Pierwsza partia (gpt-image-1, 1024 × 1024) miała
  postacie na cały kadr — ich nogi lądowały pod kartą z tekstem.
- **Słowa „victory/defeat screen" w prompcie = napis na obrazie.** gpt-image-1
  wypisał „VICTORY" i „DEFEAT" na niebie. Blok stylu mówi teraz o „painted
  cutscenes" i zakazuje wprost jakiegokolwiek napisu.
- **Pusty pierwszy plan trzeba nazwać.** „Dolna ćwiartka spokojna" model
  ignoruje; „dolne 40 % to zbocze wzgórza / tafla stawu / tafla jeziora"
  wykonuje. Kamera „z daleka" daje małe postacie — i dobrze, bo kadr
  w `wynik_wczytaj.py` (`KADRY`) i tak je przybliża.
- **Filtr treści:** „starzec zakłada chłopcu medal na szyję" zostało
  zablokowane na wyjściu (`moderation_blocked`). Chłopiec trzyma medal sam,
  strażnik stoi obok — bez dotyku.
- **Tylko Janek.** Ilustracje pokazują chłopca; gdy kampanię prowadzi Ela,
  scena jest ta sama (portret w karcie zakończenia jest już jej).

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
Full-screen painted illustration for the ending of a chapter in a children's
fantasy strategy game, like the painted cutscenes of classic 1990s fantasy
strategy games, reimagined as a modern storybook painting. Hand-painted
digital illustration, soft visible brush texture, rich saturated but warm
palette, cinematic lighting, strong depth with atmospheric perspective.
CAMERA AND LAYOUT, strictly: a WIDE ESTABLISHING SHOT from some distance, with
a lot of scenery on both sides. The characters are SMALL in the frame: the
hero is only about one third of the image height tall, full body visible.
The group stands in the upper-middle part of the image: the top of the hero's
head is about one quarter down from the top edge, and all feet are at about
60 percent of the image height. The top fifth of the image is open sky. The
lower 40 percent of the image is foreground scenery described in the prompt,
with no characters, no creatures and no important details in it, because a
text panel will cover it.
Creatures are cute, friendly, big-eyed ORIGINAL monsters, not characters from
any existing franchise. The hero is a ten-year-old boy trainer: red-and-white
cap, brown hair, blue short-sleeve jacket over a white T-shirt, brown shorts,
brown shoulder satchel, brown boots.
The creature friends always look like this: a small green sprout creature with
a big round head, a single curled leaf on top and a cheerful face; a round,
chubby, pale-blue water creature like a soft snowman made of two blobs; a plump
round red-orange fire creature shaped like a bean, with a yellow flame pattern
on its belly and no tail; a slender red crested bird-dragon with a white-and-red
tail. No other creatures unless the prompt asks for them.
Absolutely no text, no words, no letters, no title, no logos, no UI, no frame,
no border, no watermark anywhere in the image.
```

## Zwycięstwo

<!-- plik: wynik-zwyciestwo.png | styl: wynik | proporcje: 3:2 -->
```
Golden sunrise. Seen from the bottom of a big rounded green hill: the young
trainer stands on the TOP of the hill, small against the bright sky, one arm
raised high in triumph, the other holding a tall blue banner with a golden
star emblem flapping in the wind. His four creature friends cheer and leap
around him on the hilltop: the green sprout creature and the pale-blue water
creature on one side, the red-orange fire bean on the other, and the red
crested bird-dragon flying just above. Far behind them to the right, on a
distant hill, a fairy-tale stone castle with blue roofs flies golden flags; a
winding dirt road leads to it through an emerald forest on the left. The
rising sun sits low behind the hero; golden light rays spread across the sky,
festive confetti and sparkles float in the air. The whole lower 40 percent of
the image is the broad, smooth, empty grassy slope of the hill in the
foreground, softly lit, with only a few tiny wildflowers. Joyful, heroic, warm.
```

## Porażka

<!-- plik: wynik-porazka.png | styl: wynik | proporcje: 3:2 -->
```
Evening after a lost battle, soft blue-violet dusk with a light gentle rain,
seen from across a small calm pond. On the far bank, under a big old oak, the
young trainer sits on a mossy log. His head is BARE: he holds his
red-and-white cap in his lap with both hands, looking thoughtful but calm, not
crying. His creature friends comfort him: the green sprout creature leans on
his knee, the pale-blue water creature holds a big green leaf over his head
like an umbrella, the red-orange fire bean warms his hands beside a small,
cosy campfire that glows orange on their faces. Far away across a wide misty
valley a grey castle with silver banners stands under dark clouds. At the
horizon the clouds are breaking: a faint rainbow and the first stars promise a
new day. The whole lower 40 percent of the image is the still, dark surface
of the pond in the foreground, softly reflecting the warm campfire and the
sky, with a few reeds at its edges. Melancholic but cosy and hopeful. Nothing
scary, no injuries, no weapons.
```

## Koniec kampanii

<!-- plik: wynik-koniec.png | styl: wynik | proporcje: 3:2 -->
```
The happy ending of the whole story, at night, seen from across a wide calm
forest lake. In the background a crystal cave in a hillside, the Moon Grotto,
glows softly silver-blue again under a huge full moon. On the far shore an
emerald forest clearing celebrates: paper lanterns hang between the trees,
colourful fireworks bloom in the starry sky. In the centre of the clearing the
young trainer proudly holds up a shining golden medal with both hands. Next to
him stands a kind old forest guardian, an old ranger with a long white beard,
a green hooded cloak and a wooden staff, smiling and raising his glowing staff
in celebration. Around them the creature friends cheer, and on both sides a joyful parade of many small cute creatures
of all shapes and colours dances back home into the forest. The characters are
small and far away: all feet stand at about 55 percent of the image height.
The whole lower 45 percent of the image is the still surface of the lake in
the foreground, mirroring the moon, the lanterns and the fireworks.
Magical, triumphant, heartwarming.
```
