# Trenerzy zamiast armii — projekt przebudowy

Uwaga z rozgrywki: kopiujemy 1:1 mechanikę Heroes 3 i to jest fajne, ale nie
pasuje do świata pokemonów. Nikt nie ma stu Pikachu — trener ma JEDNEGO
Pikachu, którego zna po imieniu, trenuje i który z nim rośnie.

Ten plik jest mapą całej przebudowy. Każdy etap to osobny, grywalny krok —
po każdym gra ma działać od menu do ekranu wyniku. Stan wykonania jest na
końcu, szczegóły „co zrobiono i dlaczego" w `STAN.md`.

## Zasada przewodnia

Z Heroes 3 zostaje to, co daje decyzje: mapa przygody, miasto z rozbudową,
surowce, taktyczna bitwa na heksach, kolejka według szybkości, odwet,
strzelcy, latacze. Z pokemonów bierzemy to, co daje opowieść: jeden stworek
= jedna postać z poziomem, doświadczeniem i ewolucją; łapanie dzikich;
mdlenie zamiast śmierci; trener, który w bitwie wydaje polecenia.

## Obsada: skąd stworki i trenerzy

Prawdziwych pokemonów i postaci z serialu nie używamy — to cudzy znak
towarowy, OpenAI odmawia ich rysowania (filtr i tak odrzucał ~30% edycji
naszych stworków), a gra wisi publicznie na GitHub Pages.

Wszystkie stworki w grze pochodzą z Pixmon Index
(`assets/pokemon/README.md`): 271 autorskich stworków w stylu pokemonów,
domena publiczna. Gra stoi na nich od początku; `tools/PROMPTY-STWORKI.md`
przemalował 18 z nich do stylu mapy i dorobił im dwa etapy ewolucji.

Dlatego „jak w bajce" robimy przez ROLE, nie przez nazwy:

- **Trenerami są Ela i Janek** — to oni są „Ashem". Ich dom (dziś Bór
  Szmaragdowy) to rodzinna miejscowość, z której wyruszają.
- **Frakcje przeciwników to archetypy z serialu**: liderka sali z jednym
  typem (jak Misty, Brock), rywal-trener, drużyna łobuzów (jak Zespół R) —
  z własnymi imionami i własnymi stworkami z puli Pixmonów.
- **Każdy stworek ma rolę jak w serialu**: starter trenera (wierny, ewoluuje
  najpóźniej), maskotka łobuzów, twardy kamienny stworek lidera sali itd.

Prompty i imiona — etap 6.

## Etap 1 — jeden stworek = jedna postać (fundament)

- Slot drużyny to jeden stworek: gatunek, **poziom** (1–50) i
  **doświadczenie**. Nic się nie scala ani nie dzieli — upuszczenie stworka
  na innego (nawet tego samego gatunku) zamienia ich miejscami.
- Statystyki liczy `defStworka` (`src/data/stworki.ts`): gatunek z frakcji
  (poziom w frakcji 1–6 = rzadkość, `TIERS` w `factions.ts` na poziomie 5),
  × `(poziom + 10) / 15` (poziom 20 = dwa razy tyle co 5, poziom 50 —
  cztery razy), × 1,2 za każdy etap ewolucji.
- **Na polu bitwy cztery stworki na stronę**, zawsze z wolnym polem między
  nimi (rzędy 1, 3, 5, 7) — jak w Heroes i jak w walkach trenerów. Do bitwy
  idą cztery pierwsze sprawne sloty drużyny; skład wybiera się kolejnością.
  Przerwy przy okazji zniosły starą przewagę strony, która rusza się druga
  (w lustrzanej bitwie było 5:95, jest ~50:50).
- Przy zerze HP stworek **mdleje** i schodzi z pola. Zemdlony zostaje
  w drużynie wyszarzony i nie walczy. Budzi go Centrum Pokemon we własnym
  mieście (wejście do zamku), porażka (trener wraca do Centrum) albo nowy
  tydzień. Uzdrowiciel budzi część zemdlonych od razu po wygranej.
- Po wygranej każdy, kto walczył i nie zemdlał, dostaje pełną pulę
  doświadczenia za pokonanych: 4 × poziom × (1 + 0,2 × ranga gatunku),
  × stosunek poziomów (0,5–2) — słabszy dogania silniejszych. Na następny
  poziom trzeba 10 × poziom. AI zbiera doświadczenie tak samo.
- **Dzikie stada**: straż na mapie to stado osobnych stworków jednego
  gatunku na jednym poziomie („2 × Cynder, poz. 7"). Rosną co tydzień
  poziomem, nie liczebnością (+10%, sufit ×2,5).
- Plansze, garnizony i nagrody dalej są podane w dawnych liczebnościach;
  przelicza je `stadoZLiczebnosci` (typowy stos Heroes = jeden stworek na
  poziomie 5, większy = więcej stworków albo wyższy poziom). Dzięki temu
  wcześniejsze strojenie trudności plansz zostaje.
- **Rezerwaty** (dawne siedliska): nowy młody stworek (poziom 5) co 3–9 dni
  zależnie od rangi, najwyżej 2 czekają, fort przyspiesza. Zaproszenie
  kosztuje pokeballe (24–60) — zawsze jeden stworek na klik.
- Zapisy sprzed zmiany są przeliczane przy wczytaniu (`migrujNaStworki`).

## Etap 2 — trening i Centrum Pokemon

- **Sala treningowa** w każdym mieście: zaznacz stworka (drużyna albo
  garnizon) i „Trenuj" — +1 poziom za `4 + 2 × poziom` pokeballi.
  Tygodniowa pula: 2 treningi za każdy rezerwat, fort ×1,5. To jest nowy
  „tygodniowy przyrost".
- **Centrum Pokemon**: wejście do własnego zamku budzi zemdlonych.

## Etap 3 — ewolucja jak w lore

- Większość linii ewoluuje sama po osiągnięciu poziomu: **16** (etap 2)
  i **32** (etap 3) — `PROG_EWOLUCJI` w `ewolucje.ts`. Ten sam stworek,
  z tym samym poziomem i doświadczeniem, ×1,2 do HP i ataku za etap.
  Dzieje się to przy każdym doświadczeniu: po bitwie (napis „X ewoluuje
  w Y!"), po treningu w mieście, u AI.
- Trzy linie ewoluują **tylko od kamienia** — po jednej na frakcję, strzelec
  z drugiego poziomu (Flamir, Sporex, Ashko), jak Pikachu bez Kamienia Gromu.
  Kamień działa w Ośrodku Ewolucji na mapie dla każdej linii, bez względu
  na poziom.
- **„Nie ewoluuj"** w oknie stworka (flaga `bezEwolucji`), jak Pikachu Asha,
  który nie chciał zostać Raichu: poziom rośnie dalej, forma zostaje;
  Ośrodek też go pomija. „Pozwól ewoluować" zdejmuje flagę — ewolucja
  przychodzi z najbliższym doświadczeniem.
- Sonda: `tools/probe-ewolucja.ts`.

## Sale i pojedynki (między etapami 3 i 4)

- W Heroes wygrywa się, zdobywając zamki i pokonując bohaterów. W pokemonach
  nikt nie burzy miast — trener wygrywa w SALI i dostaje odznakę. Zamek
  przeciwnika to więc sala: wygrana w niej daje odznakę, cel misji to
  komplet odznak.
- Bohater przeciwnika to rywal-trener (Oskar). Spotkanie na mapie =
  pojedynek: przegrany płaci pokeballe i wraca do Centrum Pokemon, nikt nie
  znika z gry.

## Etap 4 — ataki

- Każdy stworek ma 2 ataki, trzeci dochodzi po pierwszej ewolucji
  (`src/data/ataki.ts`): **zwykły** (bez limitu, siła 1 — dawny cios albo
  strzał), **specjalny** (siła ×1,5, 2 PP na bitwę) i **ostateczny** (siła ×2,
  1 PP, cel nie oddaje). Nazwy z żywiołu i rodzaju: Ognisty pazur / Płomienny
  skok / Wielki ogień, Strumień / Wodny pocisk / Wodna pompa itd.
- Podwójny cios i Uderz i wróć są teraz atakiem specjalnym (3 PP) —
  wybiera się je, a nie działają same. Nieograniczony odwet zostaje cechą.
- Zasięg idzie za stworkiem (strzelec strzela każdym atakiem), więc
  dojście, zablokowanie i złamana strzała działają bez zmian. PP odnawiają
  się co bitwę.
- Bitwa: w dolnej belce trzy przyciski ataków (klawisze 1–3) w miejscu
  prognozy; po najechaniu na wroga prognoza liczy wybrany atak. Każda tura
  zaczyna się od zwykłego ataku. Górna belka: „X używa: Y!".
- AI wybiera atak tą samą punktacją co cel, z karą 15% zwykłego ciosu za
  zużycie PP i premią za uniknięty odwet.
- Balans (`npm run balans`): odchylenie 2,4 pp (przed: 4,0). Sonda:
  `tools/probe-ataki.ts`, zrzuty `tools/zrzut-ataki.mjs`.

## Etap 5 — trener w bitwie

- **Wybór czwórki**: gdy sprawnych stworków jest więcej niż miejsc na polu,
  bitwa otwiera okno „Kto walczy?" (`visual/wyborSkladu.ts`) — domyślnie
  cztery pierwsze, klik dodaje/zdejmuje, Enter zatwierdza. Stworki spoza
  czwórki nie walczą i nie mdleją.
- **Trener przy polu**: medalion z głową trenera w lewym górnym rogu i
  przycisk „Plecak (P)" obok tytułu. Raz na rundę, bez zużycia tury
  stworka (jak czar w Heroes 3), trener sięga do plecaka
  (`data/przedmioty.ts`, okno `visual/oknoPlecaka.ts`):
  - **Mikstura** (2 na bitwę) — leczy swojego stworka o połowę życia,
  - **Eliksir siły** (1 na bitwę) — ×1,5 ataku do końca bitwy,
  - **Pokeball** — 10 pokeballi ze skarbca za rzut; szansa rośnie, im mniej
    życia ma cel (5–95%, rzadsze stworki trudniej). Tylko DZIKIE stworki —
    stworków sali ani rywala łapać nie wolno — i tylko, gdy w drużynie jest
    wolny slot. Złapany dołącza do drużyny z poziomem, na którym stał.
    Zastępuje „neutralni dołączają do armii" z Heroes.
- Plecak napełnia się co bitwę — bez sklepu i bez pilnowania zapasów.
- Zostało na później: PC Billa (drużyna 6 przy sobie, reszta w mieście),
  walki z liderami 3 na 3.

## Etap 6 — frakcje i kampania

- **Drużyna przechodzi z misji do misji** (`PostepKampanii.druzyna`,
  `druzynaDoPrzeniesienia`): te same stworki z poziomem, doświadczeniem
  i ewolucją, wszyscy obudzeni. Strojenie: misja ma `poziomDruzyny`
  (najniższy poziom stworka na starcie — podciąga stary zapis i drużynę
  startową) i `wrogPoziomy` (o tyle silniejsi obrońcy zamków i rywal).
  Wartości: m2 6, m3 11, m4 13 i +6 dla obrońców.
- **Liderzy sal** (`LIDERZY` w `mapa.ts`, portrety `public/bohater/lider-*.png`):
  Bazyl (Stary Fort, skała), Luna (Księżycowa Grota), Marina (Warownia na
  Grobli, woda), Szron (Lodowa Twierdza), Argent (wódz Srebrnych Płaszczy).
  Przed walką w sali lider wita trenera (karta na mapie), w bitwie stoi
  w prawym rogu, po wygranej wręcza odznakę.
- **Kampania = droga po odznaki**: odznaki zbierają się przez całą kampanię
  (`PostepKampanii.odznaki`) i stoją w górnej belce ekranu kampanii zamiast
  klejnotów postępu.
- **Centrum Pokemon i Sala treningowa na panoramie miasta**
  (`ProfilZamku.stale` w `zamki.ts`): stoją w każdym mieście od początku,
  nie ma ich na liście budowy. Klik w Centrum budzi zemdlonych (garnizon,
  drużynę w mieście), klik w Salę — karta treningu zaznaczonego stworka.
  Grafiki: `tools/PROMPTY-MIASTO.md` (OpenAI z wzorami stworków i kotwicy
  miasta), Grota i Zbocze przemalowane `frakcje_przemaluj.py`.
- Zostało: frakcje przeciwników jako osobne typy stworków liderów.

## Stan

| Etap | Stan |
|---|---|
| 1 fundament | zrobione |
| 2 trening i Centrum | zrobione |
| 3 ewolucja | zrobione |
| sale i pojedynki | zrobione |
| 4 ataki | zrobione |
| 5 trener w bitwie | zrobione (bez PC Billa i walk 3 na 3) |
| 6 frakcje i kampania | w toku: drużyna, liderzy, odznaki — zrobione |
