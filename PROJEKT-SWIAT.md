# Spójny świat — co z Heroes zostaje, co przechodzi na lore pokemonów

Uwaga z rozgrywki (2026-09-27): po przebudowie „trener zamiast armii" HUD
i część grafik są mieszanką dwóch światów — fantasy z Heroes i bajki
o stworkach. Miecz, tarcza, hełm, kamienna wieża, skrzynia ze skarbem mają
sens tylko jako odniesienie do Heroes. Ten plik to spis wszystkiego, co
trzeba przełożyć, z odpowiednikiem z bajki i kosztem. Do zatwierdzenia
przed pracą; potem przerabiamy obszar po obszarze, osobnymi PR.

Zasada: z Heroes zostaje MECHANIKA (mapa, miasto, surowce, bitwa na heksach),
a wygląd i nazwy idą za bajką — trener, stworki, sale, Centrum, plecak.
Świat jest współczesny i przyjazny: rowery, plecaki, stadiony, laboratoria,
nie mury, miecze i magia.

## Fala 1 — HUD i słowa (bez grafik OpenAI, ikony rysuje kod)

| Teraz (Heroes) | Po zmianie (bajka) | Gdzie |
|---|---|---|
| Miecz — atak | Pięść z błyskiem „cios" | ikony bitwy, karta stworka, statystyki |
| Łuk — strzał | Kula energii | ikony bitwy |
| Tarcza — obrona, „Broń się" | Bańka ochronna | przycisk obrony, karta |
| Czaszka — „padło", porażka | Gwiazdki omdlenia (stworek mdleje, nie ginie) | bitwa, warunki misji |
| But — ruch | But sportowy / ślady stóp | statystyki, bitwa |
| Atak bohatera (miecz) | **Zapał** — trener dopinguje, stworki biją mocniej | ekran bohatera, mapa |
| Obrona bohatera (tarcza) | **Opieka** — trener pilnuje, stworki mniej obrywają | ekran bohatera, mapa |
| „Armia", „oddział", „zamek" w tekstach | „drużyna", „stworek", „sala" / „miasto" | wszystkie ekrany |

**Ekran walki** (uwaga użytkownika): jest ze starej wersji — niebieski HUD
z kapsułkami, inny niż drewno, pergamin i złoto reszty gry. Przerabiamy go
razem z walkami 1 na 1 / 2 na 2 (mniejsze pole i tak zmienia układ): belki,
karta stworka, pasek ataków, kolejka tur i przyciski w zestawie
`visual/zestaw.ts`, ikony z tej fali.

Stan: ikony (rękawica, kula energii, bańka, gwiazdki, but sportowy)
zrobione. Ekran walki najpierw poszedł w drewno i pergamin, a po teście
użytkownika — w styl z gier Pokémon (makieta A: belka-pokeball, białe
panele, pigułki; `stylWalki.ts`, `hudWalki.ts`). Słowa też zrobione:
Zapał i Opieka trenera (malowane ikony megafonu i serca z plastrem,
`public/kampania/ikona-zapal.png`, `ikona-opieka.png`), „miasto" i „sala"
zamiast „zamku", „drużyna" zamiast „armii", znak ostrzeżenia zamiast
czaszki w warunkach porażki. **Fala 1 zakończona.** W kodzie pola zostały
jako `atak`/`obrona` (zapisy graczy).

## Fala 2 — zamki na mapie (najbardziej widoczne)

| Teraz | Po zmianie | Grafiki |
|---|---|---|
| Zamek gracza (warowny zamek) | Rodzinne miasteczko z Centrum Pokemon | 1 obraz |
| Zamek przeciwnika | Sala (budynek w stylu stadionu z herbem lidera) | 1 obraz + warianty klimatu |
| Fort w mieście (Palisada, Zapora, Wał) | Żłobek stworków — więcej młodych w rezerwatach | 3 obrazy (frakcje z przemalowania: 1) |

## Fala 3 — obiekty mapy przygody

| Teraz (Heroes) | Po zmianie (bajka) | Działanie bez zmian |
|---|---|---|
| Kamienna Wieża | Dojo mistrza | +obrona |
| Wieża Obserwacyjna | Punkt widokowy z lunetą | odkrywa mapę |
| Skrzynia ze skarbem | Zgubiony plecak trenera | pokeballe albo doświadczenie |
| Chatka Skrzata | Domek na drzewie | jednorazowy prezent |
| Wóz Kupca | Wędrowny sklepik | surowce |
| Źródło Mocy | Automat z napojami | +ruch |
| Portal | Stacja kolejki | przenosi |
| Drzewo Wiedzy | Laboratorium Profesora | +doświadczenie |
| Strażnica graniczna + namiot klucznika | Szlaban strażnika parku + budka z przepustką | klucze → przepustki |
| Chata jasnowidza | Namiot badaczki | zadanie |
| Huta odłamków | Kryształowa grota | odłamki |
| Zostają: Obóz Treningowy, Arena (stadion), Ranczo, Gniazdo, Ośrodek Ewolucji, Wiatrak, Ognisko, kopalnie pokeballi i kamieni | — | — |

## Fala 4 — przedmioty i umiejętności trenera

| Teraz | Po zmianie |
|---|---|
| Pazur Ostrza | Rękawice Treningowe |
| Tarcza z Łusek | Ochraniacze |
| Skrzydła Latającego | Paralotnia |
| Buty Wędrowca | Buty Sportowe (nowy rysunek) |
| Łucznictwo | Celność (ataki z dystansu) |
| Pancerz | Osłona |
| Napastnik | Taktyka |
| Uzdrowiciel | Pierwsza pomoc |
| Zostają: Opaska Treningowa, Kamizelka, Rower, Pas Mistrza Areny, Księżycowy Kamień, Zwiad, Tropiciel, Gospodarność, Nauka | — |

## Koszt grafik OpenAI (szacunek, jakość medium)

Fala 1 — 0 USD (ikony rysuje `icons.ts`). Fala 2 — ok. 0,4 USD. Fala 3 —
ok. 11 obiektów, część z wariantami klimatu: ok. 1,2–2 USD. Fala 4 —
ok. 7 ikon: ok. 0,35 USD. Razem ok. 2–3 USD z pozostałych ~8 USD.

## Kolejność

Fala 1 i 2 najpierw — to widać na każdym ekranie. Każda fala to osobny PR
z obszarem z CLAUDE.md (HUD i bitwa, mapa przygody, miasto, bohater).
