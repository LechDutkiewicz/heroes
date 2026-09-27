import { planszaPoId } from './mapy';
import {
  CHATKA_ILE,
  OGNISKO_SUROWIEC,
  PRODUKCJA,
  STOS,
  SZANSA_ARTEFAKTU,
  WIATRAK_ILE,
  WOZ_ILE,
  ruchNaDzien,
} from './zasady-h3';
import {
  ARTEFAKTY,
  ARTEFAKTY_LOSOWE,
  BUDOWLE,
  KLUCZE,
  odslon,
  type Obiekt,
  type Oddzial,
  type StanMapy,
  type Klucz,
  type Surowiec,
  type Teren,
} from './mapa';
import { FACTIONS, factionById } from './factions';
import { SLOTY_ARMII, znormalizuj } from './armia';
import { MAKS_STADA, STARY_STOS, nowyStworek, rozbijStado, stadoZLiczebnosci } from './stworki';

/** Dawny dzienny przyrost poziomów 1–6 — w nim plansze podają siłę załóg. */
const STARY_PRZYROST = [3, 2, 2, 1, 1, 1];

/**
 * Plansza przygody — teren z generatora plus obiekty z liczbami z Heroes 3.
 *
 * Podział pracy: `tools/generuj_mape.py` decyduje GDZIE (teren, drogi, pola
 * pod obiekty), a ten plik decyduje CO tam stoi i ile daje. Rozdzielenie jest
 * celowe — układ mapy zmienia się rzadko i wymaga oglądania, a wartości zmienia
 * się przy każdym strojeniu i sprawdza liczbami.
 */

const ZNAKI: Record<string, Teren> = {
  '.': 'trawa',
  '=': 'sciezka',
  ',': 'piasek',
  j: 'jalowa',
  s: 'snieg',
  b: 'bagno',
  T: 'las',
  '#': 'skaly',
  '~': 'woda',
};

/**
 * Losowanie z ustalonym ziarnem. Mapa MUSI wyglądać tak samo po każdym wejściu
 * do gry: inaczej nie da się jej ani przetestować, ani porównać zrzutów, ani
 * powiedzieć dziecku „skrzynia była koło jeziora". Heroes 3 losuje zawartość
 * raz, przy generowaniu mapy — my tak samo, tylko robimy to przy wczytaniu.
 */
function losowarka(ziarno: number) {
  let stan = ziarno >>> 0;
  return () => {
    // xorshift32 — krótki, powtarzalny i bez zależności.
    stan ^= stan << 13;
    stan ^= stan >>> 17;
    stan ^= stan << 5;
    return ((stan >>> 0) % 100000) / 100000;
  };
}

const NAZWY_STOSU: Record<Surowiec, string> = {
  jagoda: 'Kiść jagód',
  kamien: 'Kamień ewolucji',
  odlamek: 'Odłamki',
  pokeball: 'Zgubione pokeballe',
};

const NAZWY_BUDYNKU: Record<Surowiec, string> = {
  jagoda: 'Sad jagodowy',
  kamien: 'Kamieniołom ewolucji',
  odlamek: 'Kopalnia odłamków',
  pokeball: 'Obóz łowców',
};

/**
 * Straże. Pięć stopni siły, dobranych tak, żeby dziecko widziało po sprite'ie
 * i liczbie, czy to jest na teraz.
 *
 * Stopni jest pięć, a nie trzy, bo plansza ma trzy pasy i dwa grzbiety.
 * Przy trzech stopniach pas sporny dostawał albo straże z doliny (czyli był
 * darmowy), albo straże z krainy wroga (czyli był nie do ruszenia przez pół
 * gry) — a to on ma być środkiem gry. Krzywa idzie więc tak:
 *
 * | Stopień | Gdzie stoi | Kiedy da się pokonać |
 * |---|---|---|
 * | `slaby` | dolina gracza | pierwszy tydzień, armią startową |
 * | `sredni` | pas sporny, przy kopalniach i skrzyniach | drugi tydzień |
 * | `silny` | kraina wroga, przy reliktach | trzeci tydzień |
 * | `straznik` | przejścia przez grzbiet POŁUDNIOWY | brama do pasa spornego |
 * | `wodz` | przejścia przez grzbiet PÓŁNOCNY | brama do krainy wroga |
 *
 * Obie straże graniczne są wyraźnie trudniejsze od wszystkiego, co stoi po
 * ich stronie mapy — inaczej podział na pasy przestaje cokolwiek znaczyć.
 */
const STRAZE: Record<string, { frakcja: string; tiery: number[]; mnoznik: number; stosy: number }> =
  {
    slaby: { frakcja: 'grota', tiery: [0, 1], mnoznik: 0.6, stosy: 1 },
    sredni: { frakcja: 'grota', tiery: [1, 2], mnoznik: 0.85, stosy: 2 },
    silny: { frakcja: 'zbocze', tiery: [2, 3], mnoznik: 1.1, stosy: 2 },
    straznik: { frakcja: 'zbocze', tiery: [2, 3], mnoznik: 1.3, stosy: 3 },
    wodz: { frakcja: 'zbocze', tiery: [4, 5], mnoznik: 1.0, stosy: 3 },
  };

/**
 * Straż na mapie to ZAWSZE jeden gatunek — stado dzikich stworków.
 *
 * Tak jest w Heroes 3 (włóczące się oddziały nie mieszają gatunków) i tak
 * jest w pokemonach (Onixy chodzą stadem Onixów). Siła straży jest dalej
 * podana w dawnych liczebnościach (`STRAZE`), a na stado — ilu stworków
 * i na jakim poziomie — przelicza ją `stadoZLiczebnosci`. Liczba stworków
 * w stadzie nie przekracza liczby dawnych stosów + 1 ani czterech miejsc na
 * polu bitwy, żeby słaba straż nie była tłumem.
 */
function oddzialyStrazy(sila: string, losuj: () => number): Oddzial[] {
  const wzor = STRAZE[sila] ?? STRAZE.slaby;
  const frakcja = factionById(wzor.frakcja) ?? FACTIONS[0];
  const tier = wzor.tiery[Math.floor(losuj() * wzor.tiery.length)];
  const u = frakcja.units[tier];
  // ±25% siły, żeby dwa te same posterunki nie były identyczne.
  const razem = STARY_STOS[tier] * wzor.mnoznik * wzor.stosy * (0.75 + losuj() * 0.5);
  const stado = stadoZLiczebnosci(tier, razem, Math.min(MAKS_STADA, wzor.stosy + 1));
  return [{ sprite: u.sprite, nazwa: u.name, frakcja: frakcja.id, tier, ...stado }];
}

/**
 * Załoga broniąca zamku — stworki z gniazd, które w nim stoją.
 *
 * Siła to dawny tygodniowy przyrost tego poziomu razy `tygodnie`; na
 * stworki przelicza ją `stadoZLiczebnosci`, a załoga dostaje je osobno
 * (każdy stworek to jeden slot, jak w armii bohatera). Najwyżej siedem.
 */
/**
 * Mury: załoga zamku liczy się tak, jakby miała tyle razy więcej dawnych
 * stworków. W starym modelu obrońca (strona ruszająca się druga) wygrywał
 * ~95% równych bitew — i to on trzymał zamki wroga do 20.–34. dnia misji
 * oblężenia. Przerwy między stworkami na polu bitwy (`NA_POLU`) zniosły tę
 * przewagę, więc zamki padały w 5.–10. dniu; mury oddają ją wprost.
 * Strojone symulacją misji oblężenia: ×1,5 — autopilot wygrywa 3/3
 * (dni 18–63), ×2 — 1/2 do dnia 84, bez murów — dzień 10.
 */
const MURY = 1.5;

function garnizonZamku(frakcja: string, poziomy: number[], tygodnie: number): Oddzial[] {
  const f = factionById(frakcja) ?? FACTIONS[0];
  const zaloga: Oddzial[] = [];
  for (const tier of poziomy) {
    const u = f.units[tier];
    if (!u) continue;
    const stado = stadoZLiczebnosci(tier, STARY_PRZYROST[tier] * 7 * tygodnie * MURY, 2);
    zaloga.push(...rozbijStado({ sprite: u.sprite, nazwa: u.name, frakcja: f.id, tier, ...stado }));
  }
  return zaloga.slice(0, SLOTY_ARMII);
}

/**
 * Drużyna startowa: po jednym stworku z czterech najniższych poziomów
 * frakcji, na poziomie 5. Mnożnik planszy (dawniej mnożył liczebności)
 * podnosi albo obniża poziom tą samą regułą co straże.
 */
function druzynaStartowa(frakcja: string, mnoznik: number): Oddzial[] {
  const f = factionById(frakcja) ?? FACTIONS[0];
  return f.units.slice(0, 4).map((_, tier) => {
    const { poziom } = stadoZLiczebnosci(tier, STARY_STOS[tier] * mnoznik, 1);
    return nowyStworek(f.id, tier, poziom)!;
  });
}

/**
 * Zawartość drobnych budowli: wiatraka, ogniska, chatki i wozu.
 *
 * Losujemy TERAZ, przy składaniu planszy, a nie przy wejściu — tak samo jak
 * zawartość skrzyni i z tego samego powodu: inaczej dałoby się zapisać grę
 * przed wiatrakiem i losować do skutku. Wiatrak daje więc co tydzień ten sam
 * surowiec, co jest zresztą bliższe Heroes 3 niż nowa loteria co siedem dni.
 *
 * Pokeballe są wyłączone z losowania: sypią się z każdej skrzyni i z każdej
 * kopalni, a te budowle mają dawać to, czego brakuje.
 */
const SUROWCE_DROBNE: Surowiec[] = ['jagoda', 'kamien', 'odlamek'];

function zawartoscBudowli(
  id: string,
  strefa: string,
  losuj: () => number
): { surowiec?: Surowiec; ile?: number; artefakt?: string } {
  const co = SUROWCE_DROBNE[Math.floor(losuj() * SUROWCE_DROBNE.length)];
  const widelki = (w: readonly [number, number]) =>
    w[0] + Math.floor(losuj() * (w[1] - w[0] + 1));

  if (id === 'wiatrak') return { surowiec: co, ile: widelki(WIATRAK_ILE) };
  if (id === 'ognisko') return { surowiec: co, ile: OGNISKO_SUROWIEC };
  if (id === 'chatka') return { surowiec: co, ile: widelki(CHATKA_ILE) };
  if (id === 'woz') {
    // Wóz kupca: raz na dwa razy artefakt, raz na dwa — ładunek surowca.
    // W Heroes 3 jest dokładnie tak i to jest cały powód, żeby do niego zajechać.
    if (losuj() < 0.5) {
      const klasa = strefa === 'wroga' ? 'znaczny' : 'drobny';
      const pula = ARTEFAKTY.filter((a) => a.klasa === klasa);
      return { artefakt: pula[Math.floor(losuj() * pula.length)].id };
    }
    return { surowiec: co, ile: widelki(WOZ_ILE) };
  }
  return {};
}

/** Losowa wielkość stosu w widełkach z Heroes 3. */
function wielkoscStosu(co: Surowiec, losuj: () => number) {
  const [min, max] = STOS[co];
  return min + Math.floor(losuj() * (max - min + 1));
}

/**
 * Plansza wskazana w adresie strony (`?ekran=mapa&mapa=polana`). Tak wchodzą
 * narzędzia do zrzutów i sondy — i tak można zagrać w pojedynczą mapę
 * kampanii bez przechodzenia poprzednich misji. Poza przeglądarką (sondy
 * w Node) adresu nie ma i zostaje plansza domyślna.
 */
function mapaZAdresu(): string | undefined {
  if (typeof location === 'undefined') return undefined;
  return new URLSearchParams(location.search).get('mapa') ?? undefined;
}

export function planszaPrzygody(mapaId?: string): StanMapy {
  const plansza = planszaPoId(mapaId ?? mapaZAdresu());
  const { TEREN, PUNKTY, ROZSTAWIENIE } = plansza.modul;
  const ust = plansza.modul.USTAWIENIA ?? {};
  const losuj = losowarka(20260812);
  const teren: Teren[][] = TEREN.map((w) => [...w].map((z) => ZNAKI[z] ?? 'trawa'));

  const obiekty: Obiekt[] = [];
  let id = 1;

  for (const wpis of ROZSTAWIENIE) {
    const wspolne = { id: id++, x: wpis.x, y: wpis.y };
    const co = (wpis.surowiec ?? 'pokeball') as Surowiec;

    if (wpis.rodzaj === 'surowiec') {
      obiekty.push({
        ...wspolne,
        rodzaj: 'surowiec',
        nazwa: NAZWY_STOSU[co],
        surowiec: co,
        ile: wielkoscStosu(co, losuj),
      });
    } else if (wpis.rodzaj === 'kopalnia') {
      obiekty.push({
        ...wspolne,
        rodzaj: 'kopalnia',
        nazwa: NAZWY_BUDYNKU[co],
        surowiec: co,
        ile: PRODUKCJA[co],
      });
    } else if (wpis.rodzaj === 'skrzynia') {
      // Wariant nagrody i rzadki artefakt losujemy TERAZ, a nie przy otwarciu:
      // inaczej dałoby się zapisać grę przed skrzynią i losować do skutku.
      const artefakt = losuj() < SZANSA_ARTEFAKTU;
      obiekty.push({
        ...wspolne,
        rodzaj: 'skrzynia',
        nazwa: 'Skrzynia',
        wariant: Math.floor(losuj() * 3),
        artefakt: artefakt ? ARTEFAKTY_LOSOWE[Math.floor(losuj() * ARTEFAKTY_LOSOWE.length)].id : undefined,
      });
    } else if (wpis.rodzaj === 'artefakt') {
      // O klasie artefaktu decyduje STRONA GRZBIETU, a nie odległość od startu.
      //
      // Odległość działała, dopóki gracz startował pośrodku mapy. Na układzie
      // z „Key to Victory" startuje w rogu, więc przeciwległy kraniec własnej,
      // bezpiecznej doliny wychodził „dalej" niż kraina przeciwnika — i dostawał
      // relikty, po które da się pojechać bez jednej bitwy. Za grzbietem leżą
      // rzeczy, po które trzeba się wyprawić, i to one mają być warte wyprawy.
      const klasa =
        wpis.strefa === 'wroga' ? 'relikt' : wpis.strefa === 'pogranicze' ? 'znaczny' : 'drobny';
      const pula = ARTEFAKTY.filter((a) => a.klasa === klasa);
      const losowy = pula[Math.floor(losuj() * pula.length)];
      // Artefakt-cel misji stoi w rozstawieniu z nazwy; losowanie i tak
      // idzie, żeby reszta planszy nie przesunęła się o jedno losowanie.
      const a = (wpis.artefakt && ARTEFAKTY.find((x) => x.id === wpis.artefakt)) || losowy;
      obiekty.push({ ...wspolne, rodzaj: 'artefakt', nazwa: a.nazwa, artefakt: a.id });
    } else if (wpis.rodzaj === 'budynek') {
      const b = BUDOWLE[wpis.budynek ?? ''];
      if (b) {
        obiekty.push({
          ...wspolne,
          rodzaj: 'budynek',
          budynek: wpis.budynek,
          nazwa: b.nazwa,
          ...zawartoscBudowli(wpis.budynek ?? '', wpis.strefa, losuj),
        });
      }
    } else if (wpis.rodzaj === 'jasnowidz') {
      // Zadanie i nagroda ustalane RAZ, przy składaniu planszy — tak samo jak
      // zawartość skrzyni i z tego samego powodu: inaczej dałoby się wyjść
      // i wejść ponownie, aż trafi się na tanie.
      //
      // Jasnowidz prosi o KAMIENIE EWOLUCJI i to jest wybór, nie przypadek:
      // kamień jest jedynym surowcem, który nie ma dziś na co iść (wypadł
      // z kosztów budynków, a ulepszeń oddziałów jeszcze nie ma). Chata daje
      // mu pierwsze zastosowanie, a przy okazji powód, żeby zbierać stosy,
      // które leżą po drugiej stronie grzbietu.
      const wDalekiej = wpis.strefa === 'wroga';
      const ile = wDalekiej ? 12 : 6;
      const klasa = wDalekiej ? 'relikt' : 'znaczny';
      const pula = ARTEFAKTY.filter((a) => a.klasa === klasa);
      const a = pula[Math.floor(losuj() * pula.length)];
      obiekty.push({
        ...wspolne,
        rodzaj: 'jasnowidz',
        nazwa: 'Chata Jasnowidza',
        zadanie: { surowiec: 'kamien', ile },
        nagroda: { artefakt: a.id },
      });
    } else if (wpis.rodzaj === 'straznica') {
      // Strażnica graniczna. Nazwa mówi wprost, jakiego klucza szukać —
      // dziecko ma wiedzieć, czego szuka, bez zaglądania w panel.
      const k = (wpis.klucz ?? 'zielony') as Klucz;
      obiekty.push({
        ...wspolne,
        rodzaj: 'straznica',
        nazwa: wpis.nazwa ?? `Strażnica (${KLUCZE[k].nazwa})`,
        klucz: k,
      });
    } else if (wpis.rodzaj === 'namiot') {
      const k = (wpis.klucz ?? 'zielony') as Klucz;
      obiekty.push({
        ...wspolne,
        rodzaj: 'namiot',
        nazwa: wpis.nazwa ?? `Namiot klucznika (${KLUCZE[k].nazwa})`,
        klucz: k,
      });
    } else if (wpis.rodzaj === 'potwor') {
      const sila = wpis.sila ?? 'slaby';
      const oddzialy = oddzialyStrazy(sila, losuj);
      obiekty.push({
        ...wspolne,
        rodzaj: 'potwor',
        // Straże graniczne mają własne imiona z generatora — pilnują konkretnych
        // przejść i gracz ma je odróżniać od zwykłego stada po drodze.
        nazwa: wpis.nazwa ?? oddzialy[0].nazwa,
        frakcja: STRAZE[sila]?.frakcja,
        oddzialy,
      });
    }
  }

  // Portale chodzą parami: pierwszy z drugim, trzeci z czwartym. Portal bez
  // pary nie prowadziłby donikąd, więc nieparzysty zostaje bez połączenia
  // i zwyczajnie nic nie robi — zamiast wywracać grę.
  const portale = obiekty.filter((o) => o.budynek === 'portal');
  for (let i = 0; i + 1 < portale.length; i += 2) {
    portale[i].para = portale[i + 1].id;
    portale[i + 1].para = portale[i].id;
  }

  obiekty.push({
    id: id++,
    rodzaj: 'zamek',
    x: PUNKTY['zamek gracza'].x,
    y: PUNKTY['zamek gracza'].y,
    nazwa: 'Bór Szmaragdowy',
    wlasciciel: 'gracz',
    frakcjaZamku: 'bor',
    // Miasto startowe nie jest puste i nie jest gotowe. Ratusz daje dochód od
    // pierwszego dnia (inaczej dzień 1 to zero pokeballi i nie ma czym zacząć),
    // dwa siedliska dają co werbować — reszta drzewka jest do postawienia,
    // bo to ona jest właściwą grą na ekranie miasta.
    postawione: ['ratusz1', 'siedlisko1', 'siedlisko2'],
    // Czekają TYLKO te poziomy, dla których miasto ma siedlisko. Wcześniej
    // stało tu [6, 4, 3, 2, 1, 0] — cztery poziomy do kupienia z budynków,
    // których nie ma.
    // Po jednym młodym stworku w każdym stojącym rezerwacie.
    dostepne: [1, 1, 0, 0, 0, 0],
    // Garnizon domowy. Symetrycznie z zamkiem przeciwnika: bez tego byłby to
    // jedyny zamek na mapie, który pada BEZ WALKI, kiedy tylko ktoś do niego
    // dojdzie, bez względu na to, jak silna jest armia stojąca w polu.
    // Mnożnik wyższy niż w `garnizonZamku` (jeden tydzień) celowo: to jedyna
    // linia obrony gracza, dopóki jego bohater akurat gdzie indziej eksploruje
    // albo buduje, więc ma reprezentować całą miejską straż, nie jeden
    // tygodniowy przyrost.
    // Plansza może dać mocniejszą załogę: w Twierdzy przeciwnik naciera od
    // trzeciego tygodnia, a bohater gracza jest wtedy daleko na północy.
    oddzialy: garnizonZamku('bor', ust.garnizonGracza?.poziomy ?? [0, 1], ust.garnizonGracza?.tygodnie ?? 5),
  });
  // Każdy punkt zaczynający się od „zamek wroga" stawia zamek przeciwnika —
  // plansze kampanii mają ich po kilka. Pierwszy (bez przyrostka) jest stolicą.
  const zamkiWroga = Object.keys(PUNKTY).filter((k) => k.startsWith('zamek wroga'));
  zamkiWroga.forEach((klucz, i) => obiekty.push({
    id: id++,
    rodzaj: 'zamek',
    x: PUNKTY[klucz].x,
    y: PUNKTY[klucz].y,
    nazwa:
      ust.nazwyZamkowWroga?.[i] ??
      (i === 0 ? 'Grota Księżycowa' : `Grota Księżycowa ${['II', 'III', 'IV'][i - 1] ?? i + 1}`),
    wlasciciel: 'wrog',
    frakcjaZamku: 'grota',
    // Zamek przeciwnika stoi rozbudowany dalej niż nasz. To nie jest kaprys:
    // jak długo nikt nim nie gra, jego stan widać dopiero po zdobyciu — a wtedy
    // ma być nagrodą, a nie pustym placem. Plansza może to zmienić: stary fort
    // na Polanie ma być słabszy od naszego zamku, a nie mocniejszy.
    postawione: [
      ...(ust.budynkiWroga ?? ['ratusz1', 'ratusz2', 'fort', 'siedlisko1', 'siedlisko2', 'siedlisko3']),
    ],
    // Plansze podają to w dawnych liczebnościach — każdy niezerowy wpis to
    // jeden czekający młody stworek.
    dostepne: (ust.dostepneWroga ?? [6, 4, 3, 0, 0, 0]).map((v) => (v > 0 ? 1 : 0)),
    // Garnizon. Bez niego zamek nie miał jak się bronić i gra nie miała
    // zakończenia — dziecko dochodziło przez pół planszy do celu i dostawało
    // komunikat, że celu nie ma.
    //
    // Skład bierzemy z gniazd, które w tym zamku stoją, i po jednym pełnym
    // przyroście tygodniowym z każdego. To jest najsilniejsza bitwa w grze
    // i tak ma być: zdobycie miasta ma być końcem wyprawy, a nie kolejnym
    // posterunkiem po drodze. Ile tygodni przyrostu, mówi plansza.
    oddzialy: garnizonZamku('grota', ust.garnizonWroga?.poziomy ?? [0, 1, 2], ust.garnizonWroga?.tygodnie ?? 1),
  }));

  // Armia startowa: cztery najniższe oddziały Boru. Punkty ruchu liczymy
  // z szybkości najwolniejszego, dokładnie jak w Heroes 3 — dzięki temu
  // dobór armii naprawdę wpływa na to, jak daleko się dojdzie.
  const bor = factionById('bor') ?? FACTIONS[0];
  const armia = znormalizuj(druzynaStartowa(bor.id, 1));
  const najwolniejszy = Math.min(...bor.units.slice(0, 4).map((u) => u.move));
  const ruchMax = ruchNaDzien(najwolniejszy);

  // Bohater przeciwnika: ta sama reguła startowej armii co u gracza (cztery
  // najniższe oddziały własnej frakcji), tylko z Groty zamiast Boru. Stoi na
  // wejściu do własnego zamku — dokładnie tak samo naturalny start, jak start
  // gracza kawałek od jego zamku.
  const grota = factionById('grota') ?? FACTIONS[1] ?? bor;
  // Mnożnik z planszy: na Polanie bohater wroga siedzi w forcie i jego
  // drużyna nie gra roli, w Twierdzy ma być groźniejszy niż zwykle.
  const wrogArmia = znormalizuj(druzynaStartowa(grota.id, ust.armiaWroga ?? 1));
  const wrogNajwolniejszy = Math.min(...grota.units.slice(0, 4).map((u) => u.move));
  const wrogRuchMax = ruchNaDzien(wrogNajwolniejszy);

  const stan: StanMapy = {
    mapa: plansza.id,
    szer: TEREN[0].length,
    wys: TEREN.length,
    teren,
    obiekty,
    bohater: {
      x: PUNKTY.start.x,
      y: PUNKTY.start.y,
      ruch: ruchMax,
      ruchMax,
      imie: 'Janek',
      atak: 2,
      obrona: 1,
      armia,
      artefakty: [],
      doswiadczenie: 0,
    },
    // Skarbiec startowy: tyle, żeby dało się w pierwszym tygodniu podjąć jedną
    // decyzję (siedlisko albo garść oddziałów), a nie żeby było na wszystko.
    // Przy 15 pokeballach dzień pierwszy był tylko klikaniem „dalej".
    skarbiec: { ...(ust.skarbiec ?? { pokeball: 40, jagoda: 6, kamien: 1, odlamek: 4 }) },
    wrogBohater: {
      // Bez zamku wroga (misja bez przeciwnika) bohater wroga stoi poza
      // grą w rogu mapy i nigdy nie dostaje tury — patrz `turaAI`.
      x: (PUNKTY[zamkiWroga[0]] ?? { x: 0 }).x,
      y: (PUNKTY[zamkiWroga[0]] ?? { y: 0 }).y,
      ruch: wrogRuchMax,
      ruchMax: wrogRuchMax,
      imie: 'Oskar',
      atak: 2,
      obrona: 1,
      armia: wrogArmia,
      artefakty: [],
      doswiadczenie: 0,
    },
    // Ten sam startowy skarbiec co gracz — inaczej różnica tempa na starcie
    // byłaby przypadkiem liczb, a nie decyzją o trudności.
    wrogSkarbiec: { ...(ust.wrogSkarbiec ?? { pokeball: 40, jagoda: 6, kamien: 1, odlamek: 4 }) },
    // Charakter przeciwnika na tej planszy — czyta go `turaAI` w `wrog-ai.ts`.
    wrogTryb: ust.wrog,
    dzienNatarcia: ust.dzienNatarcia,
    natarcie: ust.natarcie,
    wrogBuduje: ust.wrogBuduje,
    dzien: 1,
    klucze: [],
    // Przeciwnik startuje w krainie wroga — za OBOMA bramami, licząc od
    // doliny gracza. Oba namioty klucznika stoją po PRZECIWNEJ (południowej)
    // stronie tych samych bram, więc z zamku wroga nie da się do żadnego
    // dojść: `trasa()` zwraca `null` dla obu, to nie kwestia siły armii, tylko
    // fizycznej niedostępności na jednokierunkowej mapie zaprojektowanej pod
    // marsz gracza z południa na północ. Przeciwnik dostaje więc klucze od
    // pierwszego dnia — jedyny wariant, który w ogóle pozwala mu wyjść z
    // własnej doliny i naciskać gracza, zamiast czekać bezczynnie, aż gracz
    // sam otworzy mu bramę od swojej strony.
    wrogKlucze: Object.keys(KLUCZE) as Klucz[],
    odkryte: TEREN.map(() => new Array(TEREN[0].length).fill(false)),
    // Mgła wroga: własna siatka, odsłonięta na razie tylko wokół jego zamku —
    // patrz `odslon(stan, ..., 'wrog')` niżej. Reszta mapy zostaje ukryta,
    // bo AI nie ma prawa wiedzieć więcej niż faktycznie odkryło.
    wrogOdkryte: TEREN.map(() => new Array(TEREN[0].length).fill(false)),
  };
  odslon(stan);
  // Jak w Heroes: własny zamek widzi okolicę tak samo jak bohater. Bohater
  // startuje kilka pól od murów, więc bez tego zamek stał na brzegu mgły.
  for (const o of stan.obiekty) {
    if (o.rodzaj === 'zamek' && o.wlasciciel === 'gracz') odslon(stan, undefined, { x: o.x, y: o.y });
  }
  // Z planszy tylko to, czego wymaga cel misji (np. Wyspa Księżyca) — małe.
  for (const m of ust.odkryte ?? []) odslon(stan, m.promien, { x: m.x, y: m.y });
  odslon(stan, undefined, undefined, 'wrog');
  for (const m of ust.wrogOdkryte ?? []) odslon(stan, m.promien, { x: m.x, y: m.y }, 'wrog');
  return stan;
}
