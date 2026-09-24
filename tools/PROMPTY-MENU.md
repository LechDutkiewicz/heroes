# Menu główne — grafiki i prompty

Wzorzec, z którym się mierzymy: menu główne Heroes of Might and Magic II.
To nie jest lista przycisków na tle, tylko **namalowana ulica miasteczka**,
w której przyciskami są szyldy sklepów: „New Game" wisi nad drzwiami po
prawej, „Load Game" i „Credits" po lewej, „Quit" leży na beczce. Gracz nie
klika w interfejs, tylko w świat — i to jest cała różnica między menu, które
wygląda jak gra, a menu, które wygląda jak formularz.

Bierzemy z tego pomysł, nie kadr. U nas to wioska trenerów, a przyciskami są
deski **drogowskazu** na skraju wioski (powody w nagłówku
`src/scenes/MenuScene.ts`: lista z góry na dół jest dla dziecka prostsza niż
szukanie szyldów po obrazku, a strzałka znaczy „tędy" bez słów).

## Stan: co jest w grze i skąd

| Plik w `public/menu/` | Skąd |
|---|---|
| `tlo.jpg` | `tools/wsad/miasto-kotwica.png` — obraz z modelu, który był kotwicą stylu miasta i do gry wcześniej nie wszedł; przycięty i przemalowany w zmierzch: głębia ostrości, zgaszone światło dzienne z ocalonymi oknami i latarniami, plama światła od latarni drogowskazu |
| `logo.png` | renderowany w `tools/menu_wczytaj.py` sztandar: sukno z fałdami, litery namalowane na suknie (Cinzel Decorative), drewniany drążek, liny |
| `deska-*.png`, `slup.png`, `deseczka*.png`, `tabliczka*.png` | renderowane tamże: słoje z szumu, fazka, gwoździe |
| `latarnia.png`, `klodka.png` | renderowane tamże: kute żelazo, szybka z płomieniem, mosiężna kłódka na łańcuszku |
| `bohater.png` | trener z mapy przygody (`tools/wsad/bohater-gora.png`, tyłem), odbity i przemalowany w zmierzch (`wmaluj`: jedno światło z lewej-góry, rim light, ciemniejsze nogi, ziarno) |
| `stworek.png` | Cindro z `assets/pokemon/00263.png` (Pixmon Index, domena publiczna), przemalowany tak samo, siedzi trenerowi na ramieniu |
| `deska-*-cien.png`, `trawa.png` | cienie rzucane przez deski i kępa trawy na podstawę słupa |
| `pergamin.png` | renderowany tamże: papier z przebarwieniami, wałki |
| `*.woff2`, `OFL.txt` | kroje Cinzel i Fredoka (SIL OFL) z `tools/fonty/` |

Wszystko odtwarza `python3 tools/menu_wczytaj.py` (zależności w jego
nagłówku). Napisów na deskach nie ma w plikach — kładzie je gra, bo te same
deski niosą raz „Nowa gra", raz „Kampania", a „Wczytaj" bywa wyszarzone.

**Runda 2.** Ślepy krytyk pierwszej wersji (dzień, pełne słońce, złote logo
na wstążce, trzy stworki z gry) napisał: „równo zajęte od brzegu do brzegu,
bez punktu skupienia; logo to ogólny błyszczący font, który pływa nad
drzewem; stworki to płaskie naklejki; szara deska wygląda na zepsutą".
Odpowiedzią nie było nic nowego do obrazka, tylko światło: zmierzch, w którym
jasno jest przy drogowskazie (latarnia) i w oknach, logo jako przedmiot
zawieszony nad wioską, jeden stworek wmalowany w to samo światło zamiast
trzech naklejek i kłódka na nieczynnej desce.

**Runda 3.** Kolejny ślepy krytyk: „brak tematu — oko ląduje na pustym
stawie; interfejs leży na obrazie jako osobna warstwa, ignoruje światło;
liny sztandaru znikają w niebie; logo jak szablon; drobne napisy
nieczytelne". Zmiany: trener tyłem na pierwszym planie (ze stworkiem na
ramieniu) patrzy w stronę drogowskazu i sztandaru; deski dostały światło
z lewej-góry, ziarno, miękki brzeg i cień rzucany; słup stoi w trawie
z cieniem kontaktowym; liny sztandaru idą do gałęzi drzewa i do gniazda na
pniu; litery sztandaru są wyhaftowane (ścieg, nierówny brzeg, przerywany
obrzeg) zamiast odlane; drobne podpisy zniknęły — nieczynną deskę tłumaczy
kłódka i dymek po wskazaniu, dźwięk to tabliczka z nutą na sznurku z gałęzi.

**Czemu logo i deski nie są z modelu.** Przy budowie menu (2026-09-24) konto
API Gemini odpowiadało `RESOURCE_EXHAUSTED` („prepayment credits are
depleted") dla wszystkich modeli obrazkowych. Prompty niżej są gotowe na
chwilę, gdy środki wrócą — wynik trafia do `tools/wsad/` pod nazwami
z nagłówków i trzeba go przepuścić przez `menu_wczytaj.py` (dopisać tam
wczytanie zamiast renderu). Współrzędne desek i latarń w kodzie
(`DESKI`/`SLUP` w MenuScene, `LATARNIE` w `src/visual/menuZycie.ts`) są
zmierzone z obecnego tła — nowe tło = pomiar od nowa.

## Blok stylu

<!-- styl: ilustracja -->
```
Hand-painted digital illustration for the title screen of a children's fantasy
strategy game about young creature trainers. Painterly storybook style of a
modern Japanese animated film background (warm, soft, detailed brushwork)
combined with the rich painted look of classic Heroes of Might and Magic art.
Saturated warm palette, golden late-afternoon sunlight from the upper right,
soft atmospheric depth, clean readable shapes, cozy and inviting, never dark
or scary. Absolutely no text, no letters, no numbers, no runes, no logos,
no UI elements, no watermark, no signature, no frame or border.
```

## Tło menu — wioska z miejscem na drogowskaz i logo

Kadr pisany pod układ, który już jest w grze: logo u góry na środku,
drogowskaz w lewym dolnym rogu (deski od ~50% do ~92% wysokości, do ~45%
szerokości), tabliczka dźwięku na słupku płotu w prawym dolnym rogu.

<!-- plik: menu-tlo.png | styl: ilustracja | proporcje: 4:3 -->
```
Scene: a cozy fantasy trainers' village seen from a slightly raised viewpoint
at the edge of the village, in golden late-afternoon light. In the middle
distance a warm timber lodge with a moss-green roof, glowing windows, green
leaf-emblem cloth banners and lanterns by the door; to the right a giant old
tree with round glowing windows and a wooden platform (a tree house); a small
turquoise pond with a little waterfall and a wooden footbridge in the center
right; a dirt path winding from the bottom left into the village.

Composition rules (a game menu is placed over this picture later):
- the top center (about 25% to 75% of the width, top 25% of the height) is
  calm: distant hills, sky and treetops only, no important detail;
- the bottom left quarter is foreground grass, bushes and a few rocks with a
  single thick wooden post rising from the bottom edge at about 11% of the
  width — nothing else important there;
- in the bottom right, a thick wooden fence post at about 70% of the width
  and 80% of the height, facing the viewer, with flat space on its front.

Life and detail: lanterns, chimney with a wisp of smoke, flower boxes, crates,
berry bushes, a market stall with baskets and a cloth canopy at the right
edge. Two small cute round fantasy creature companions (friendly chubby
critters in the spirit of pokemon-style pets, NOT any real Pokemon) sit near
the pond and on the tree-house platform. Nobody else.
```

## Logo

<!-- plik: menu-logo.png | styl: brak | proporcje: 16:9 -->
```
Fantasy video game title logo that reads exactly "POKEMON HEROES" in English,
spelled P-O-K-E-M-O-N and H-E-R-O-E-S, on two lines: "POKEMON" on the top line
in slightly smaller letters, "HEROES" on the bottom line in large letters.
Chunky heroic serif display letters, carved and bevelled gold with a warm
highlight on top edges, a thick dark red-brown outline and a thin cream outer
rim, like the logo of a classic painted fantasy strategy game but friendly for
children. Below the letters, a wide red cloth ribbon banner with folded ends
and a gold trim, EMPTY (no text on it — the game writes the subtitle).
Every letter clearly readable. No other words, no tagline, no trademark sign.
Centered, whole logo visible with margin, nothing cropped.
Background: a single FLAT, UNIFORM magenta fill, RGB 255,0,255, edge to edge,
with no gradient, no vignette, no glow, no shadow and no checkerboard pattern.
Nothing in the logo itself may be magenta or pink. The background is a chroma
key that gets cut out afterwards, so it must stay one exact colour.
```

## Deska drogowskazu

<!-- plik: menu-deska.png | styl: brak | proporcje: 4:1 -->
```
Game UI asset: a single blank wooden arrow signboard for a village signpost,
seen straight from the front, pointing right. Light honey-colored planed wood
with visible grain and a small knot, a carved groove running around the edge
as a frame, the right end cut into a point, the left end square with two
black iron nails. Hand-painted storybook style matching warm Heroes of Might
and Magic art, soft top-right light, gentle bevel on the edges. COMPLETELY
BLANK face: no letters, no symbols, no paint. No post, no chains, no shadow.
Background: a single FLAT, UNIFORM magenta fill, RGB 255,0,255, edge to edge.
Nothing in the board itself may be magenta or pink.
```
