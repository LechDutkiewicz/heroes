import { PUNKTY, ROZSTAWIENIE, TEREN } from './plansza-teren';
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
  BUDOWLE,
  PRZYROST_ODDZIALU,
  odslon,
  type Obiekt,
  type Oddzial,
  type StanMapy,
  type Surowiec,
  type Teren,
} from './mapa';
import { FACTIONS, factionById } from './factions';

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
 * Straże. Trzy poziomy siły, dobrane tak, żeby dziecko widziało po sprite'ie
 * i liczbie, czy to jest na teraz.
 *
 * `straznik` to straż graniczna: stoi w jednym z dwóch przejść przez grzbiet
 * i jest jedyną rzeczą dzielącą mapę na bezpieczne południe i groźną północ.
 * Ma być wyraźnie trudniejsza od wszystkiego, co gracz spotkał wcześniej —
 * inaczej podział mapy przestaje cokolwiek znaczyć.
 */
const STRAZE: Record<string, { frakcja: string; tiery: number[]; mnoznik: number; stosy: number }> =
  {
    slaby: { frakcja: 'grota', tiery: [0, 1], mnoznik: 0.6, stosy: 1 },
    straznik: { frakcja: 'zbocze', tiery: [2, 3], mnoznik: 1.0, stosy: 3 },
    silny: { frakcja: 'zbocze', tiery: [2, 3], mnoznik: 1.1, stosy: 2 },
  };

/**
 * Straż na mapie to ZAWSZE jeden gatunek — ewentualnie rozbity na kilka stosów.
 *
 * Tak jest w Heroes 3: włóczące się oddziały nigdy nie mieszają gatunków,
 * mieszane armie stoją wyłącznie w budynkach. Wcześniej strażnik przełęczy
 * miał dwa różne stworki naraz i wyglądał jak armia bohatera, a nie jak
 * dzikie stado.
 */
function oddzialyStrazy(sila: string, losuj: () => number): Oddzial[] {
  const wzor = STRAZE[sila] ?? STRAZE.slaby;
  const frakcja = factionById(wzor.frakcja) ?? FACTIONS[0];
  const tier = wzor.tiery[Math.floor(losuj() * wzor.tiery.length)];
  const u = frakcja.units[tier];
  // ±25% liczebności, żeby dwa te same posterunki nie były identyczne.
  const razem = Math.max(
    wzor.stosy,
    Math.round(u.count * wzor.mnoznik * (0.75 + losuj() * 0.5))
  );
  // Rozdział na stosy: reszta z dzielenia idzie do pierwszego, żeby suma
  // zgadzała się co do sztuki.
  const podstawa = Math.floor(razem / wzor.stosy);
  return Array.from({ length: wzor.stosy }, (_, i) => ({
    sprite: u.sprite,
    nazwa: u.name,
    ile: podstawa + (i === 0 ? razem - podstawa * wzor.stosy : 0),
    frakcja: frakcja.id,
    tier,
  }));
}

/**
 * Załoga broniąca zamku — po jednym stosie z każdego stojącego w nim gniazda.
 *
 * Liczebność to tygodniowy przyrost tego poziomu, czyli tyle, ile zamek
 * naprawdę zdążyłby wystawić. Dzięki temu skład garnizonu wynika ze stanu
 * miasta, a nie z osobnej tabelki, która rozjechałaby się przy pierwszej
 * zmianie bilansu.
 */
function garnizonZamku(frakcja: string, poziomy: number[]): Oddzial[] {
  const f = factionById(frakcja) ?? FACTIONS[0];
  return poziomy.map((tier) => {
    const u = f.units[tier];
    return {
      sprite: u.sprite,
      nazwa: u.name,
      // Siedem dni: pełny tydzień przyrostu z tego gniazda.
      ile: PRZYROST_ODDZIALU[tier] * 7,
      frakcja: f.id,
      tier,
    };
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

export function planszaPrzygody(): StanMapy {
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
        artefakt: artefakt ? ARTEFAKTY[Math.floor(losuj() * ARTEFAKTY.length)].id : undefined,
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
      const a = pula[Math.floor(losuj() * pula.length)];
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
    nasz: true,
    frakcjaZamku: 'bor',
    // Miasto startowe nie jest puste i nie jest gotowe. Ratusz daje dochód od
    // pierwszego dnia (inaczej dzień 1 to zero pokeballi i nie ma czym zacząć),
    // dwa siedliska dają co werbować — reszta drzewka jest do postawienia,
    // bo to ona jest właściwą grą na ekranie miasta.
    postawione: ['ratusz1', 'siedlisko1', 'siedlisko2'],
    // Czekają TYLKO te poziomy, dla których miasto ma siedlisko. Wcześniej
    // stało tu [6, 4, 3, 2, 1, 0] — cztery poziomy do kupienia z budynków,
    // których nie ma.
    dostepne: [6, 4, 0, 0, 0, 0],
  });
  obiekty.push({
    id: id++,
    rodzaj: 'zamek',
    x: PUNKTY['zamek wroga'].x,
    y: PUNKTY['zamek wroga'].y,
    nazwa: 'Grota Księżycowa',
    frakcjaZamku: 'grota',
    // Zamek przeciwnika stoi rozbudowany dalej niż nasz. To nie jest kaprys:
    // jak długo nikt nim nie gra, jego stan widać dopiero po zdobyciu — a wtedy
    // ma być nagrodą, a nie pustym placem.
    postawione: ['ratusz1', 'ratusz2', 'fort', 'siedlisko1', 'siedlisko2', 'siedlisko3'],
    dostepne: [6, 4, 3, 0, 0, 0],
    // Garnizon. Bez niego zamek nie miał jak się bronić i gra nie miała
    // zakończenia — dziecko dochodziło przez pół planszy do celu i dostawało
    // komunikat, że celu nie ma.
    //
    // Skład bierzemy z gniazd, które w tym zamku stoją, i po jednym pełnym
    // przyroście tygodniowym z każdego. To jest najsilniejsza bitwa w grze
    // i tak ma być: zdobycie miasta ma być końcem wyprawy, a nie kolejnym
    // posterunkiem po drodze.
    oddzialy: garnizonZamku('grota', [0, 1, 2]),

  });

  // Armia startowa: cztery najniższe oddziały Boru. Punkty ruchu liczymy
  // z szybkości najwolniejszego, dokładnie jak w Heroes 3 — dzięki temu
  // dobór armii naprawdę wpływa na to, jak daleko się dojdzie.
  const bor = factionById('bor') ?? FACTIONS[0];
  const armia: Oddzial[] = bor.units.slice(0, 4).map((u, i) => ({
    sprite: u.sprite,
    nazwa: u.name,
    ile: [20, 9, 6, 4][i],
    frakcja: bor.id,
    tier: i,
  }));
  const najwolniejszy = Math.min(...bor.units.slice(0, 4).map((u) => u.move));
  const ruchMax = ruchNaDzien(najwolniejszy);

  const stan: StanMapy = {
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
    skarbiec: { pokeball: 40, jagoda: 6, kamien: 1, odlamek: 4 },
    dzien: 1,
    odkryte: TEREN.map(() => new Array(TEREN[0].length).fill(false)),
  };
  odslon(stan);
  return stan;
}
