# Pokémon Heroes — zasady pracy

Gra dla dzieci (Ela i Janek) w klimacie Heroes of Might and Magic 3 HotA ze
stworkami. Phaser 4 + TypeScript + Vite, teksty po polsku. Grafiki z OpenAI
(`tools/generuj_grafiki.py`), plansze z generatora w Pythonie
(`tools/generuj_mape.py`, `tools/mapy/<id>.py`). Wzorzec wyglądu i mechaniki:
HoMM3 HotA; HoMM2 tylko dla przebiegu kampanii.

## Stan projektu

`STAN.md` to wspólna pamięć między sesjami. Na starcie przeczytaj jego spis
sekcji i te sekcje, które dotyczą Twojego obszaru — nie cały plik. Na koniec
pracy dopisz lub zaktualizuj sekcję swojego obszaru: co działa, co zostało,
decyzje i ich powody.

## Jeden wątek = jeden obszar

Każda sesja pracuje w JEDNYM obszarze i rusza tylko jego pliki. Pliki
wspólne (`src/visual/zestaw.ts`, `src/visual/uklad.ts`, `src/data/units*`,
`tools/generuj_grafiki.py`) — tylko małe, wstecznie zgodne zmiany; większe
najpierw uzgodnij z użytkownikiem.

| Obszar | Główne pliki |
|---|---|
| mapa przygody i HUD | `src/scenes/AdventureScene.ts`, `src/visual/mgla.ts`, `src/visual/woda.ts` |
| plansze i generator | `tools/mapy/*`, `tools/generuj_mape.py`, `tools/render_mapa.py`, `src/data/plansza*`, `public/mapa/` |
| miasto i budynki | `src/scenes/TownScene.ts`, `public/miasto/` |
| bitwa | `src/scenes/BattleScene.ts`, `src/data/battle.ts` |
| stworki i ewolucja | `public/sprites/`, `src/data/ewolucje.ts`, `src/data/units*`, `tools/PROMPTY-STWORKI.md` |
| kampania, menu, zapisy | `src/scenes/KampaniaScene.ts`, `MenuScene.ts`, `WynikScene.ts`, `src/data/kampania.ts`, `src/data/zapis.ts`, `src/visual/menuOkna.ts` |
| bohater i gospodarka | `src/scenes/HeroScene.ts`, dane surowców i kosztów |

Jeśli zadanie wymaga zmian w cudzym obszarze, zrób tylko minimum potrzebne do
działania i opisz je w PR.

## Gałęzie i PR

- Domyślna gałąź to wersja gry na GitHub Pages (`https://lechdutkiewicz.github.io/heroes/`).
- Nową pracę zaczynaj od świeżej domyślnej gałęzi, na własnej gałęzi, z
  własnym (draft) PR. Każda gałąź ma podgląd pod `/heroes/podglad/<gałąź>/`.
- Merguj często i małymi porcjami. Dwa wątki na tych samych plikach nie
  pracują jednocześnie — drugi startuje po merge'u pierwszego.
- Po merge'u PR gałąź nie dostaje nowych commitów; kolejna praca = nowy PR od
  aktualnej domyślnej.

## Zanim zatwierdzisz

- `npx tsc --noEmit -p .` (CI buduje z `noUnusedLocals`).
- Sondy obszaru z `tools/probe-*.mjs` / `tools/probe-*.ts`; zawsze
  `node tools/probe-misja.mjs`.
- Podgląd: serwer na porcie 5200–5229 (tam HMR jest wyłączony), zrzuty
  `tools/zrzut-*.mjs`. Zmiany wizualne zawsze obejrzyj na zrzucie.
- Nie commituj cudzych, niedokończonych zmian (w repo mogą pracować
  równolegle subagenci) — commituj wskazane pliki.

## Grafiki OpenAI

- Prompty w `tools/PROMPTY-*.md` (znacznik `<!-- plik: nazwa.png | styl: ... | proporcje: ... -->`),
  generowanie `OPENAI_IMAGE_QUALITY=medium python3 tools/generuj_grafiki.py nazwa.png`
  (high przy dużych kadrach dostaje 502).
- Budżet jest ograniczony: sprawdzaj `python3 tools/generuj_grafiki.py --koszty`,
  podaj koszt w podsumowaniu. Każdy obrazek obejrzyj, zanim go wepniesz.
- Nowe grafiki mają pasować do już malowanych (plansze, HUD, kampania).

## Jakość

Zmiana wizualna jest gotowa, gdy wygrywa ślepe porównanie (`tools/blind.mjs`)
z prawdziwym ekranem HoMM3 HotA oceniane przez świeżego krytyka (subagent,
który widzi tylko obraz A/B) — nie wystarczy własna ocena buildera. Wzorce w
`tools/reference/` (poza repo, źródła w `ZRODLA.md`).

## Komunikacja z użytkownikiem

Po polsku, krótko, bez list i podsumowań, chyba że poprosi. Tryb mentora
(„poradź”, „bądź moim konsultantem”) — wtedy bezpośrednio kwestionuj założenia.
