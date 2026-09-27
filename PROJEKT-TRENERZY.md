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

- Większość linii ewoluuje po osiągnięciu poziomu (np. 16 i 32).
- Część linii potrzebuje **kamienia ewolucji** (surowiec już jest w grze) —
  jak Pikachu → Raichu od Kamienia Gromu.
- Już w etapie 1: Ośrodek Ewolucji na mapie nie zamienia Pyroko we Flamira
  (inny gatunek), tylko ewoluuje stworka w jego własnej linii
  (`src/data/ewolucje.ts`) za kamienie, bez względu na poziom.
- Gracz może **odmówić** ewolucji (jak Pikachu Asha) — stworek zostaje
  mniejszy, ale uczy się szybciej.

## Etap 4 — ataki

- Każdy stworek ma 2 ataki (wręcz i z dystansu albo specjalny), trzeci
  dochodzi po ewolucji. Punkty mocy (PP) działają jak amunicja strzelca.
- Obecne umiejętności (podwójny cios, nieograniczony odwet, uderz i wróć)
  stają się atakami.

## Etap 5 — trener w bitwie

- Wybór czwórki na bitwę w oknie przed walką (dziś: cztery pierwsze sloty).
- Trener stoi przy swojej krawędzi pola. Zamiast czarów ma przedmioty:
  mikstura, eliksir ataku, **pokeball** (łapanie osłabionego dzikiego
  stworka — to zastępuje „neutralni dołączają do armii").
- Drużyna: przy sobie 6 stworków (reszta w mieście, jak w PC Billa).
- Walki z liderami w kampanii: może mniej niż cztery (np. 3 na 3).

## Etap 6 — frakcje i kampania

- Drużyna przechodzi z misji do misji (dziś przechodzi tylko bohater) —
  w pokemonach to TEN SAM Pikachu przez całą przygodę. Wymaga nowego
  strojenia misji 2–4.
- Frakcje = trenerzy (dom Eli i Janka, liderka sali wody, lider sali
  kamienia, drużyna łobuzów), każda ze swoją obsadą Pixmonów i typem.
- Kampania = droga po odznaki.

## Stan

| Etap | Stan |
|---|---|
| 1 fundament | zrobione |
| 2 trening i Centrum | zrobione |
| 3 ewolucja | — |
| 4 ataki | — |
| 5 trener w bitwie | — |
| 6 frakcje i kampania | — |
