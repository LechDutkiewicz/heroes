# Zrzuty ekranu HoMM2: źródła

Wszystkie pliki to prawdziwe zrzuty z gry: z oryginalnego Heroes of Might and Magic II albo z silnika fheroes2, który korzysta z oryginalnych grafik. Każdy plik został otwarty i obejrzany.

| Plik | Źródło | Co przedstawia |
|---|---|---|
| `menu-glowne.png` | https://raw.githubusercontent.com/libretro-thumbnails/DOS/master/Named_Titles/Heroes%20of%20Might%20and%20Magic%20II%20(Deluxe%20Edition).png | Menu główne z oryginalnej gry (320x240, pomniejszone). To malowana brukowana uliczka, na której przyciski są szyldami: logo na banerze u góry, „Load Game” i „Credits” po lewej, „High Scores” na środku, „New Game” po prawej, „Quit” na beczce w lewym dolnym rogu. W oryginale nie ma kolumny przycisków. |
| `ekran-tytulowy.png` | https://raw.githubusercontent.com/libretro-thumbnails/DOS/master/Named_Titles/Heroes%20of%20Might%20and%20Magic%20II%20(Deluxe%20Edition)%20(1998).png | Plansza tytułowa wyświetlana przed menu (320x240): zamek na wodzie, logo „Heroes II” i napis „The Succession Wars”. |
| `bitwa-statek.png` | https://raw.githubusercontent.com/libretro-thumbnails/DOS/master/Named_Snaps/Heroes%20of%20Might%20and%20Magic%20II%20(Deluxe%20Edition)%20(1998).png | Bitwa na pokładzie statku z oryginalnej gry (320x240): siatka heksów, pasek stanu „Skip this unit”, przyciski AUTO i SKIP. |
| `mapa-przygody-640.png` | https://raw.githubusercontent.com/PortsMaster/PortMaster-New/main/ports/fheroes2/screenshot.jpg | Mapa przygody w natywnej rozdzielczości 640x480 (fheroes2, oryginalne grafiki): mapa z zamkiem, prawy panel z minimapą, listą bohaterów i zamków, przyciskami i armią. |
| `mapa-przygody-fheroes2.png` (+ `screenshot_world_map.webp`) | https://raw.githubusercontent.com/ihhub/fheroes2/master/docs/images/screenshots/screenshot_world_map.webp | Mapa przygody w trybie wysokiej rozdzielczości fheroes2 (1024x576). |
| `bitwa-fheroes2.png` (+ `screenshot_battle.webp`) | https://raw.githubusercontent.com/ihhub/fheroes2/master/docs/images/screenshots/screenshot_battle.webp | Ekran bitwy (640x480). |
| `zamek-fheroes2.png` (+ `screenshot_castle.webp`) | https://raw.githubusercontent.com/ihhub/fheroes2/master/docs/images/screenshots/screenshot_castle.webp | Widok zamku (640x480). |

`README.md` i `_config.yml` to kopie plików z `ihhub/fheroes2/docs`, a nie obrazy.

## Brakujące ekrany

Nie udało się znaleźć zrzutów tych ekranów: podmenu New Game, wybór strony w kampanii, ekran kampanii, okno warunków scenariusza, zwycięstwo i porażka, High Scores, Credits oraz Load Game. Serwery z takimi zrzutami (Wikipedia, MobyGames, fandom, YouTube, user-images.githubusercontent.com, archive.org) są niedostępne przez proxy w sandboxie.

## Ekrany kampanii, informacji o scenariuszu, zwycięstwa i porażki (dodane 2026-09-25)

W sieci nie udało się znaleźć gotowych zrzutów tych ekranów (szczegóły w podsekcji „Czego nie udało się zdobyć”). Dlatego zrzuty zrobiono samodzielnie: uruchomiono silnik **fheroes2** z **oryginalnymi grafikami HoMM2** pod wirtualnym ekranem X (Xvfb) w natywnej rozdzielczości **640×480**. Kursor myszy nie jest widoczny na zrzutach.

- **Silnik:** fheroes2 1.1.17, zbudowany ze źródeł `https://github.com/ihhub/fheroes2`, commit `96cf684` z 2026-09-23.
- **Dane gry:** oficjalne, darmowe **demo HoMM2** (`h2demo.zip`, plik `DATA/HEROES2.AGG`). Pobrano je z `https://github.com/ciplogic/fheroes2enh/releases/download/0.9.1/h2demo.zip`, bo archive.org jest zablokowane. Plik AGG z dema zawiera oryginalne grafiki interfejsu z The Succession Wars: `CAMPBKGG/CAMPBKGE.ICN` (tła kampanii), `CAMPXTRG/CAMPXTRE.ICN`, `SCENIBKG.ICN`, `WINLOSE*.ICN` i `HISCORE.ICN`. Nie ma w nim map kampanii, filmów SMK ani grafik Price of Loyalty.
- **Dwie lokalne poprawki w fheroes2**, obie włączane zmienną środowiskową i niezmieniające wyglądu ekranów. Wszystko, co widać na zrzutach, rysuje silnik z oryginalnych grafik.
  1. `FH2_REFSHOT_CAMPAIGN`: pomija sprawdzenie, czy są pliki map kampanii `CAMPG*.H2C`. Samo sprawdzenie odblokowuje przycisk „Campaign Game”, a ekran kampanii tych map nie potrzebuje, bo nazwy, opisy i bonusy scenariuszy fheroes2 ma zapisane w kodzie. Bez filmu `CHOOSE.SMK` fheroes2 sam przechodzi od razu do ekranu kampanii Rolanda. Zmienna `FH2_REFSHOT_ARCHIBALD` każe zamiast tego otworzyć kampanię Archibalda.
  2. `FH2_REFSHOT_RESULT`: wymusza wynik „przegrana” albo „wygrana” przy najbliższym sprawdzeniu końca gry, czyli po kliknięciu „End Turn”. Dzięki temu pojawiają się prawdziwe okna końca gry z `game_over.cpp`. Scenariusz demo ma warunek zwycięstwa „Defeat all enemy heroes and capture all enemy towns”, który nie wyświetla żadnego tekstu. Dlatego do zrzutu wygranej wymuszono warunek `WINS_SIDE` („The enemy is beaten. Your side has triumphed!”), a do porażki `LOSS_ALL`.

| Plik | Źródło | Co przedstawia |
|---|---|---|
| `kampania-roland-fheroes2.png` | zrzut własny: fheroes2 1.1.17 + demo `HEROES2.AGG` (URL wyżej) | **Ekran kampanii The Succession Wars, strona Rolanda (tło „good”)**. U góry nagłówek „Roland's Campaign” i licznik „Days spent: 0”. Pod nim „Scenario 1 – Force of Arms” z opisem, obok „Awards: None” i „Choice” z trzema bonusami do wyboru przyciskami radiowymi (2000 Gold / Thunder Mace / Gauntlets). Dolną część zajmuje mapa kampanii: tarcze scenariuszy 1–10 połączone strzałkami z rozgałęzieniami, bieżący scenariusz jest podświetlony. Na dole przyciski View Intro / Difficulty / Okay / Cancel. „Difficulty” to dodatek fheroes2, którego nie ma w oryginale. **640×480**. |
| `kampania-archibald-fheroes2.png` | jw. | **Ekran kampanii Archibalda (tło „evil”, szaro-czerwone)**: „Archibald's Campaign”, „Scenario 1 – First Blood”, bonusy 2000 Gold / Mage's Ring / Minor Scroll, mapa ze scenariuszami 1–11 oznaczonymi czaszkami. **640×480**. |
| `scenario-info-fheroes2.png` | jw., mapa demo „Broken Alliance” (`MAPS/BROKENA.MP2`) | **Okno „Scenario Information” w trakcie gry** (Adventure Options → INFO) nad mapą przygody. Zawiera tytuł mapy, pola Map Difficulty / Game Difficulty / Rating / Map Size, opis, rząd „Opponents” (6 kolorów), rząd „Class” z portretami ras, rząd ikon rąk (człowiek/komputer), pola „Victory Conditions” i „Loss Conditions” oraz przycisk OKAY. **640×480**. |
| `nowa-gra-ustawienia-fheroes2.png` | jw. | **Ekran przed startem gry standardowej** (New Game → Standard Game): pole „Scenario: Broken Alliance” z przyciskiem SELECT, „Game Difficulty” (pięć szachowych ikon trudności), „Opponents”, „Class”, „Rating 100%” i przyciski OKAY/CANCEL, a pod spodem tło menu. W oryginale ta sama plansza służy za podgląd scenariusza. **640×480**. |
| `wybor-scenariusza-fheroes2.png` | jw. | **Lista scenariuszy** (po kliknięciu SELECT): filtry rozmiaru S/M/L/X-L/ALL, lista map z ikonami, a pod nią opis wybranej mapy z polem „Map difficulty”. **640×480**. |
| `porazka-fheroes2.png` | jw. (wynik wymuszony, patrz wyżej) | **Okno porażki**: nagłówek „Defeat!” i tekst „You have been eliminated from the game!!!” w standardowym oknie z ramką z klejnotami, nad mapą przygody i prawym panelem. W oryginale po nim leci film `LOSE.SMK`, którego w demie nie ma. **640×480**. |
| `zwyciestwo-fheroes2.png` | jw. (wynik wymuszony) | **Okno zwycięstwa**: „Victory!” i „The enemy is beaten. Your side has triumphed!” nad mapą przygody. W oryginale po nim leci film `WIN.SMK` (brak w demie), a potem pojawia się tabela High Scores. **640×480**. |
| `high-scores-fheroes2.png` | jw. | **Tabela „Legendary Heroes of Might & Magic II”** wyświetlana po zwycięstwie. Pierwsza pozycja to wpisany gracz „Lord Ironfist” z mapą Broken Alliance, dni 1, ocena 199. Kolumny: Player / Land / Days / Rating, z ikonami potworów, po bokach miecze i przyciski STANDARD/EXIT. **640×480**. |

### Czego nie udało się zdobyć (HoMM2)

- **Ekran wyboru strony Roland/Archibald.** W HoMM2 (i w fheroes2) to film `CHOOSE.SMK` z klikalnymi obszarami, a nie statyczna plansza. Demo nie zawiera filmów, a w repozytoriach na GitHubie nie znalazłem żadnej klatki tego filmu. Źródła, które by je miały (YouTube, MobyGames, fandom, wikimedia, archive.org), są zablokowane.
- **Końcowe filmy zwycięstwa i porażki** (`WIN.SMK`, `LOSE.SMK`, zakończenia kampanii) oraz **ekran kampanii Price of Loyalty** (grafiki `X_IVY`/`X_LOADCM` i mapy są tylko w pełnej wersji). Brak w demie i w dostępnych repozytoriach.
- **Gotowe zrzuty w repozytoriach GitHuba.** Przejrzałem `ihhub/fheroes2` (docs, wiki: obrazki są tam linkowane z zablokowanego `user-images.githubusercontent.com`), `ciplogic/fheroes2enh`, VitaDB, PortMaster, libretro-thumbnails/DOS i ok. 20 mniejszych repozytoriów HoMM2. Nie było w nich zrzutów ekranu kampanii ani końca gry.
