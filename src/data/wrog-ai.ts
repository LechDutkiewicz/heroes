/**
 * "Sztuczny gracz" na mapie przygody — AI przeciwnika, ale ta sama maszyna
 * napędza też autopilota "normalnego gracza" w symulacji z
 * `tools/wrog-symulacja.ts`. Jedna implementacja, dwie strony: `turaAI(s,
 * kto, ziarno)` gra dzień dla `kto` (`'gracz'` albo `'wrog'`) — inaczej próg
 * trudności mierzyłby dwie różne maszyny udające dwóch graczy, co nie mówi
 * niczego o tym, czy AI jest DOBRE, tylko czy jest inne.
 *
 * Zasada nadrzędna: żadnej własnej trasy, żadnego własnego modelu walki.
 * Ruch idzie przez `trasa()` z `mapa.ts` — tę samą, którą liczy gracz — więc
 * przeciwnik zna dokładnie te same skróty, te same strefy kontroli potworów
 * i te same bryły budynków, a "wróg przeszedł przez bramę" nie może się
 * zdarzyć, bo nie ma drugiej reguły ruchu, która mogłaby się z pierwszą
 * rozjechać. Walka idzie przez `createBattle`/`runBattle` z `battle.ts` —
 * tę samą maszynę, którą `tools/balance.ts` rozgrywa tysiącami bitew na
 * sekundę i którą odgrywa `BattleScene`.
 *
 * Granice wiedzy: każda strona wybiera cele wyłącznie spośród pól
 * odsłoniętych w JEJ WŁASNEJ mgle (`odkryteOf(s, kto)`), nigdy w mgle
 * przeciwnika ani na całej mapie. AI nie zna nagrody, której jeszcze nie
 * widziało. To jedyny sposób, żeby "przeciwnik" nie znaczył "wszechwiedzące
 * oszustwo" — ośmiolatek wyłapuje przeciwnika, który zawsze idzie prosto po
 * najlepszy łup, natychmiast.
 *
 * Decyzja o strażnicach: w tej grze NIE MA osobnej bramy z kluczem — jedyna
 * rzecz, która blokuje wejście do krainy, to strefa kontroli potwora
 * (`strzezoneProzez`), i blokuje każdego jednakowo, bo `trasa()` jest jedna
 * dla obu stron. Przeciwnik dostaje więc "klucze" do świata dokładnie w tym
 * samym sensie co gracz: może iść, dokąd dojdzie, pod warunkiem że pokona to,
 * co stoi na drodze. Efekt jest równoważny wariantowi "klucze od dnia
 * pierwszego" — przeciwnik może wyjść ze swojej doliny i naciskać gracza —
 * ale bez jednej linijki nowego kodu blokującego, bo istniejąca reguła ZoC
 * już to robi symetrycznie. Tempo obu stron jest więc takie samo: kto
 * pierwszy urośnie dość, żeby przejść przez własnego strażnika granicznego,
 * ten pierwszy wychodzi na drugą połowę mapy.
 *
 * Bezpieczeństwo ataku: żaden cel nie trafia na listę kandydatów, dopóki
 * `wygramy()` — wywołanie tej samej `createBattle`/`runBattle`, powtórzone
 * z kilkoma ziarnami — nie przewidzi wygranej. AI nigdy nie rusza w stronę
 * strażnika, o którym wie, że go rozbije.
 */

import {
  budowlaPoId,
  bohaterOf,
  obiektNa,
  odkryteOf,
  odpowiedzNaPytanie,
  odslon,
  odwiedz,
  skarbiecOf,
  strzezoneProzez,
  trasa,
  zasiegNaTure,
  zbuduj,
  KOSZT_ODDZIALU,
  type Bohater,
  type Krok,
  type Obiekt,
  type Oddzial,
  type StanMapy,
  type Wlasciciel,
} from './mapa';
import { dolacz, zywe } from './armia';
import { createBattle, makeRng, runBattle } from './battle';
import { factionById } from './factions';
import { moznaBudowac, profilZamku } from './zamki';
import type { UnitDef } from './units';

/** Widok mapy z perspektywy `kto`: to samo `s`, inny bohater na czele. */
function widokStrony(s: StanMapy, kto: Wlasciciel): StanMapy {
  return { ...s, bohater: bohaterOf(s, kto) };
}

/** Oddziały mapowe → definicje jednostek, dokładnie jak w `BattleScene`. */
function jednostki(oddzialy: Oddzial[]): UnitDef[] {
  const wynik: UnitDef[] = [];
  for (const o of oddzialy) {
    const f = factionById(o.frakcja);
    const def = f?.units[o.tier];
    if (def) wynik.push({ ...def, count: o.ile });
  }
  return wynik;
}

/**
 * Czy atak się opłaca. Trzy rozegrania tej samej bitwy (ta sama funkcja co
 * `tools/balance.ts`, inne ziarno) i wymóg wygranej w większości — jedna
 * symulacja potrafi trafić na pechowy układ kolejności, a decyzja "atakować"
 * nie powinna zależeć od jednego rzutu.
 */
function wygramy(atak: Oddzial[], obrona: Oddzial[], ziarno: number): boolean {
  const lewa = jednostki(atak);
  if (lewa.length === 0) return false;
  const prawa = jednostki(obrona);
  if (prawa.length === 0) return true;
  let wygrane = 0;
  for (let proba = 0; proba < 3; proba++) {
    const rng = makeRng(ziarno + proba * 104729 + lewa.length * 13 + prawa.length * 7);
    const bitwa = createBattle({ units: lewa }, { units: prawa }, [], rng);
    if (runBattle(bitwa).outcome === 'player') wygrane++;
  }
  // Wszystkie trzy próby muszą wygrać, nie większość: to samo tempo dla obu
  // stron, ale ostrożniejsze — atak dopiero, gdy przewaga jest niepodważalna,
  // nie ledwie prawdopodobna. Różnica trafia głównie w to, JAK SZYBKO którakolwiek
  // strona zaczyna wygrywać starcia o cudzą krainę, więc przesuwa oba progi
  // (dzień 40 i dzień 25) w tę samą stronę, nie faworyzuje żadnej strony.
  return wygrane === 3;
}

/** Ilu stworków bohatera przeżyło bitwę — z tej samej `Battle`, żadnej drugiej księgi. */
function zastosujOcalalych(
  bohater: Bohater,
  sprzedBitwa: Oddzial[],
  bitwa: ReturnType<typeof createBattle>
) {
  const ocalali: Oddzial[] = [];
  for (const u of bitwa.units) {
    if (u.side !== 'player' || u.count <= 0) continue;
    const oryginal = sprzedBitwa.find((o) => o.tier === u.def.tier) ?? sprzedBitwa[0];
    ocalali.push({
      sprite: u.def.sprite,
      nazwa: u.def.name,
      ile: u.count,
      frakcja: oryginal?.frakcja ?? 'grota',
      tier: u.def.tier,
    });
  }
  bohater.armia = bohater.armia.map(() => null);
  for (const o of ocalali) dolacz(bohater.armia, o);
}

/**
 * Rozstrzyga starcie `kto` z konkretnym obrońcą.
 *
 * Zamek jest wyjątkiem: nie "zbiera się" jak potwór, tylko zmienia
 * właściciela — dokładnie ta sama zasada, którą gracz dostaje w
 * `AdventureScene.zakonczBitwe`. Bez tego wyjątku wygrana bitwa o miasto
 * kasowałaby zamek z mapy zamiast go przejąć.
 */
function rozstrzygnijBitwe(s: StanMapy, kto: Wlasciciel, obrona: Obiekt, ziarno: number) {
  const bohater = bohaterOf(s, kto);
  const przed = zywe(bohater.armia);
  const rng = makeRng(ziarno + s.dzien * 7919 + obrona.id * 104729 + 1);
  const bitwa = createBattle(
    { units: jednostki(przed) },
    { units: jednostki(obrona.oddzialy ?? []) },
    [],
    rng
  );
  const { outcome } = runBattle(bitwa);
  zastosujOcalalych(bohater, przed, bitwa);

  if (outcome === 'player') {
    if (obrona.rodzaj === 'zamek') {
      obrona.wlasciciel = kto;
      obrona.oddzialy = [];
    } else {
      obrona.zebrany = true;
      if (obrona.oddzialy) obrona.oddzialy = [];
    }
    return;
  }
  // Przegrana: bohater wraca do własnego zamku i traci resztę dnia — tak
  // samo jak graczowi w AdventureScene.
  const domowyZamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === kto);
  if (domowyZamek) {
    bohater.x = domowyZamek.x;
    bohater.y = domowyZamek.y;
  }
  bohater.ruch = 0;
}

/** Ile jest warty cel — proste priorytety, nie ranking bliski wszechwiedzy. */
function wartoscObiektu(o: Obiekt): number {
  if (o.rodzaj === 'zamek') return 400;
  if (o.rodzaj === 'kopalnia') return 120;
  if (o.rodzaj === 'artefakt') return 90;
  if (o.rodzaj === 'skrzynia') return 60;
  if (o.rodzaj === 'budynek') {
    const b = budowlaPoId(o.budynek);
    if (b?.efekt.typ === 'gniazdo') return 150;
    // Budowla, do której da się wracać co kilka dni (stajnia, wiatrak), nie
    // ma wygrywać z eksploracją: bez tego AI osiada w pętli między dwiema
    // odnawialnymi nagrodami zamiast iść dalej po mapie, którą jeszcze widzi
    // tylko w połowie.
    if (b?.odnowa !== undefined && b.odnowa > 0) return 5;
    return 40;
  }
  if (o.rodzaj === 'surowiec') return 20 + (o.ile ?? 0);
  // Sam potwór nie daje łupu, ale strażnik graniczny blokuje przejście na
  // resztę mapy — bez punktacji AI nigdy by z nim nie zaczęło walki, bo nic
  // za nim jeszcze nie widać (leży za mgłą, którą właśnie ten potwór
  // zasłania). Wartość skromna: gospodarka i tak ma pierwszeństwo, dopóki
  // jest, co budować i zbierać bliżej domu.
  if (o.rodzaj === 'potwor') return 70;
  return 0;
}

interface Cel {
  kroki: Krok[];
}

/** Wartość samej eksploracji brzegu mgły — tyle co skromna budowla. */
const WARTOSC_EKSPLORACJI = 30;

/**
 * Który dzień AI wolno pierwszy raz wycelować w zamek gracza. Dostrojone
 * przez `tools/wrog-symulacja.ts` pod dwie liczby naraz: bierny gracz ma
 * przegrać do dnia 40, grający normalnie nie może paść przed dniem 25.
 */
const DZIEN_PIERWSZEGO_NATARCIA = 27;

/**
 * Najlepszy osiągalny, WYGRYWALNY i ZNANY cel dla `kto`. Trzy sita w tej
 * kolejności: `odkryteOf(s, kto)` (znany), `trasa()` (osiągalny — ta sama
 * funkcja co gracz), `wygramy()` (wygrywalny — ta sama bitwa co gracz). Cel,
 * który nie przejdzie któregokolwiek, po prostu nie istnieje dla tej tury.
 */
function znajdzCel(s: StanMapy, kto: Wlasciciel, ziarno: number): Cel | undefined {
  const widok = widokStrony(s, kto);
  const mgla = odkryteOf(s, kto);
  const bohater = bohaterOf(s, kto);
  let najlepszy: (Cel & { ocena: number }) | undefined;

  for (const o of s.obiekty) {
    if (o.zebrany) continue;
    if (!mgla[o.y]?.[o.x]) continue;
    if (o.wlasciciel === kto) continue; // już nasze

    // Przeciwnik potrzebuje czasu, żeby w ogóle zebrać wyprawę na stolicę —
    // to samo tempo, które w Heroes 3 daje przewagę pierwszym dniom: nikt
    // nie rusza na cudzy zamek, zanim zdąży wystawić armię wartą tej wyprawy.
    // Dotyczy WYŁĄCZNIE AI atakującego gracza — sam gracz może uderzyć na
    // zamek przeciwnika, gdy tylko go znajdzie i pokona; próg mierzy, jak
    // szybko PRZECIWNIK zagraża graczowi, nie odwrotnie.
    if (o.rodzaj === 'zamek' && kto === 'wrog' && s.dzien < DZIEN_PIERWSZEGO_NATARCIA) continue;

    // Budowla na odnowie (albo jednorazowa i już użyta) nie da dziś nic
    // więcej — ten sam warunek co w `odwiedzBudowle`. Bez niego AI depcze
    // w kółko własne ślady zamiast iść dalej.
    if (o.rodzaj === 'budynek') {
      const b = budowlaPoId(o.budynek);
      if (b && o.uzyteDnia !== undefined && b.odnowa !== 0) {
        if (b.odnowa === undefined) continue;
        if (b.odnowa - (s.dzien - o.uzyteDnia) > 0) continue;
      }
    }

    const kroki = trasa(widok, o.x, o.y);
    if (!kroki || kroki.length === 0) continue;

    // Straż ma pierwszeństwo przed obiektem — tak samo jak w scenie gracza
    // (AdventureScene.dalej): jeśli pole wejścia leży w strefie kontroli
    // potwora, to ten potwór broni dostępu, nie obiekt sam w sobie.
    const straz = strzezoneProzez(widok, o.x, o.y);
    const obronca = straz ?? (o.oddzialy?.length ? o : undefined);
    if (obronca && !wygramy(zywe(bohater.armia), obronca.oddzialy ?? [], ziarno)) continue;

    const koszt = kroki.reduce((a, k) => a + k.koszt, 0);
    const ocena = wartoscObiektu(o) / (koszt + 1);
    if (ocena <= 0) continue;
    if (!najlepszy || ocena > najlepszy.ocena) najlepszy = { kroki, ocena };
  }

  // Brzeg własnej mgły liczy się do tego samego rankingu, nie jako ostatnia
  // deska ratunku. Inaczej byle odnawialna budowla o groszowej wartości
  // zawsze wygrywałaby z eksploracją, bo cokolwiek niepuste bije `undefined`
  // — a wtedy AI krążyłoby po własnym, dawno poznanym kącie mapy, zamiast
  // iść dalej, jak tylko coś — cokolwiek — zostanie do odwiedzenia w zasięgu.
  // Eksploracja NIE traci na koszcie: cel eksploracji jest z założenia
  // daleki (patrz `znajdzFrontowe`), więc dzielenie przez koszt zawsze
  // przegrywałoby z byle bliską drobnicą i z powrotem zamieniałoby AI w
  // maszynę do skubania okolicy zamiast w odkrywcę.
  const front = znajdzFrontowe(s, kto);
  if (front && (!najlepszy || WARTOSC_EKSPLORACJI > najlepszy.ocena)) {
    najlepszy = { kroki: front.kroki, ocena: WARTOSC_EKSPLORACJI };
  }
  return najlepszy;
}

/**
 * Kiedy nie ma żadnego znanego, wartego celu, AI idzie na brzeg WŁASNEJ
 * mgły — najbliższe nieodkryte pole sąsiadujące z odkrytym. Bez tego AI
 * odwiedziłoby wszystko w zasięgu wzroku i stałoby w miejscu do końca gry:
 * eksploracja musi czasem iść w nieznane, tak samo jak u gracza, który też
 * nie widzi, co jest za następnym wzgórzem, dopóki tam nie dojdzie.
 */
function znajdzFrontowe(s: StanMapy, kto: Wlasciciel): Cel | undefined {
  const widok = widokStrony(s, kto);
  const mgla = odkryteOf(s, kto);
  const bohater = bohaterOf(s, kto);

  // Środek już poznanego terenu. Brzeg NAJBLIŻSZY bohaterowi prawie zawsze
  // leży tuż obok niego, po tej samej stronie, którą właśnie przemierzył —
  // więc "idź do najbliższej dziury" trzyma AI w kółko przy jednym skrawku
  // mapy, zamiast pchać poznawanie DALEJ, tam gdzie jeszcze nic nie wie.
  // Odległość od środka poznanego terenu wskazuje kierunek, w którym mgła
  // faktycznie jeszcze się cofa.
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < s.wys; y++) {
    for (let x = 0; x < s.szer; x++) {
      if (!mgla[y][x]) continue;
      sx += x;
      sy += y;
      n++;
    }
  }
  const srodekX = n ? sx / n : bohater.x;
  const srodekY = n ? sy / n : bohater.y;

  const brzegi: Array<{ x: number; y: number; odSrodka: number }> = [];
  for (let y = 0; y < s.wys; y++) {
    for (let x = 0; x < s.szer; x++) {
      if (mgla[y][x]) continue;
      // Pole zajęte przez prawdziwy obiekt (zamek, kopalnia, strażnik…) nie
      // jest "eksploracją" — to cel, który ma przejść przez `znajdzCel` i
      // jego sprawdzenie `wygramy()`. Bez tego wykluczenia AI potrafiło trafić
      // frontowym poszukiwaniem prosto na broniony zamek i zaatakować go BEZ
      // sprawdzenia szans, czyli dokładnie ten samobójczy atak, którego ma
      // unikać.
      if (obiektNa(s, x, y)) continue;
      let naBrzegu = false;
      for (let dy = -1; dy <= 1 && !naBrzegu; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= s.wys || nx >= s.szer) continue;
          if (mgla[ny][nx]) {
            naBrzegu = true;
            break;
          }
        }
      }
      if (!naBrzegu) continue;
      const odSrodka = (x - srodekX) ** 2 + (y - srodekY) ** 2;
      brzegi.push({ x, y, odSrodka });
    }
  }
  // Najdalej od środka poznanego terenu = prawdziwa krawędź eksploracji, nie
  // przypadkowa dziura tuż przy bohaterze.
  brzegi.sort((a, b) => b.odSrodka - a.odSrodka);

  // Spośród prawdziwie dalekich brzegów bierzemy ten najtańszy DLA BOHATERA —
  // kierunek wyznacza środek mgły, ale drogę i tak liczy `trasa()`.
  let najlepszy: { kroki: Krok[]; koszt: number } | undefined;
  for (const b of brzegi.slice(0, 40)) {
    const kroki = trasa(widok, b.x, b.y);
    if (!kroki || kroki.length === 0) continue;
    const koszt = kroki.reduce((a, k) => a + k.koszt, 0);
    if (!najlepszy || koszt < najlepszy.koszt) najlepszy = { kroki, koszt };
  }
  return najlepszy;
}

/** Wejście na pole z obiektem — decyzje przy pytaniach są celowo najprostsze. */
function wejdzNa(s: StanMapy, kto: Wlasciciel, o: Obiekt, ziarno: number) {
  const wynik = odwiedz(s, o, kto);
  if (wynik.bitwaZ) {
    rozstrzygnijBitwe(s, kto, wynik.bitwaZ, ziarno);
    return;
  }
  if (wynik.pytanie) {
    // Arena: bierze pierwszą opcję (atak). Ośrodek ewolucji: próbuje "tak" —
    // `odpowiedzNaPytanie` sama odmówi bez kamieni, więc próba jest bezpieczna.
    odpowiedzNaPytanie(s, wynik.pytanie, wynik.pytanie.opcje[0]?.klucz ?? 'nie', kto);
  }
  if (wynik.wybor) {
    // Skrzynia: zawsze bierze pokeballe — prosta, przewidywalna decyzja.
    skarbiecOf(s, kto).pokeball += wynik.wybor.pokeballe;
    wynik.wybor.obiekt.zebrany = true;
  }
  if (wynik.przenies) {
    const bohater = bohaterOf(s, kto);
    bohater.x = wynik.przenies.x;
    bohater.y = wynik.przenies.y;
    odslon(s, undefined, undefined, kto);
  }
}

/**
 * Cel, do którego bohater aktualnie zmierza — trwa między dniami, dopóki nie
 * dotrze albo cel nie straci sensu. Bez tej pamięci odległy cel (np. zamek
 * przeciwnika o kilka dni drogi) codziennie przegrywał z czymś bliższym,
 * które akurat tego dnia wypadło wyżej w rankingu — a wynikiem był bohater
 * kursujący w kółko między dwoma punktami bliżej domu, zamiast kiedykolwiek
 * dotrzeć dokądkolwiek dalej.
 */
const lepkiCel = new WeakMap<Bohater, { x: number; y: number }>();

function wybierzCel(s: StanMapy, kto: Wlasciciel, ziarno: number): Cel | undefined {
  const bohater = bohaterOf(s, kto);
  const widok = widokStrony(s, kto);
  const zapamietany = lepkiCel.get(bohater);
  if (zapamietany) {
    const obiekt = obiektNa(s, zapamietany.x, zapamietany.y);
    const nieaktualny = !!obiekt && (obiekt.zebrany || obiekt.wlasciciel === kto);
    if (!nieaktualny) {
      const kroki = trasa(widok, zapamietany.x, zapamietany.y);
      if (kroki && kroki.length > 0) return { kroki };
    }
    lepkiCel.delete(bohater);
  }
  const cel = znajdzCel(s, kto, ziarno);
  if (cel) {
    const ostatni = cel.kroki[cel.kroki.length - 1];
    lepkiCel.set(bohater, { x: ostatni.x, y: ostatni.y });
  }
  return cel;
}

/** Rusza bohaterem `kto`, dopóki starcza ruchu i jest dokąd iść. */
function ruszSie(s: StanMapy, kto: Wlasciciel, ziarno: number) {
  const bohater = bohaterOf(s, kto);
  for (let straz = 0; straz < 64 && bohater.ruch > 0; straz++) {
    const cel = wybierzCel(s, kto, ziarno);
    if (!cel) break;
    const ile = zasiegNaTure(bohater, cel.kroki);
    if (ile === 0) break;

    for (let i = 0; i < ile; i++) {
      const k = cel.kroki[i];
      bohater.ruch -= k.koszt;
      bohater.x = k.x;
      bohater.y = k.y;
      odslon(s, undefined, undefined, kto);
    }

    if (ile < cel.kroki.length) continue; // dojdzie dalej jutro
    lepkiCel.delete(bohater); // dotarł — jutro wybiera na nowo

    const widok = widokStrony(s, kto);
    const naObiekcie = obiektNa(s, bohater.x, bohater.y);
    const straznik = strzezoneProzez(widok, bohater.x, bohater.y);
    if (straznik && straznik !== naObiekcie) {
      rozstrzygnijBitwe(s, kto, straznik, ziarno);
      if (bohater.ruch > 0) {
        const podNogami = obiektNa(s, bohater.x, bohater.y);
        if (podNogami) wejdzNa(s, kto, podNogami, ziarno);
      }
    } else if (naObiekcie) {
      wejdzNa(s, kto, naObiekcie, ziarno);
    }
  }
}

/** Kolejność, w jakiej AI stawia budynki: przyrost i dochód przed dekoracją. */
function priorytetBudowy(id: string): number {
  if (id.startsWith('siedlisko')) return 0;
  if (id === 'fort') return 1;
  if (id.startsWith('ratusz')) return 2;
  return 3;
}

/** Rozbudowa zamku i werbunek dla `kto` — te same `zbuduj`/`moznaBudowac` co gracz. */
function rozbudujIWerbuj(s: StanMapy, kto: Wlasciciel) {
  const zamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && o.wlasciciel === kto);
  if (!zamek) return;
  const skarbiec = skarbiecOf(s, kto);
  const frakcja = zamek.frakcjaZamku ?? 'grota';
  const profil = profilZamku(frakcja);
  const postawione = zamek.postawione ?? [];

  const kandydaci = profil.budynki
    .filter((b) => !postawione.includes(b.id) && moznaBudowac(b, postawione))
    .sort((a, b) => priorytetBudowy(a.id) - priorytetBudowy(b.id));
  for (const b of kandydaci) {
    if (zbuduj(s, zamek, b.id, kto).ok) break; // jeden budynek dziennie
  }

  if (!zamek.dostepne) return;
  const f = factionById(frakcja);
  if (!f) return;
  const bohater = bohaterOf(s, kto);
  for (let tier = zamek.dostepne.length - 1; tier >= 0; tier--) {
    const def = f.units[tier];
    if (!def) continue;
    const koszt = KOSZT_ODDZIALU[tier];
    const ile = Math.min(zamek.dostepne[tier], Math.floor(skarbiec.pokeball / koszt));
    if (ile <= 0) continue;
    skarbiec.pokeball -= ile * koszt;
    zamek.dostepne[tier] -= ile;
    dolacz(bohater.armia, { sprite: def.sprite, nazwa: def.name, ile, frakcja, tier });
  }
}

/**
 * Cała tura strony `kto`: najpierw gospodarka (budowa, werbunek — kolejność
 * jak w Heroes 3: rano miasto, potem wyprawa), potem ruch bohaterem.
 * Wywołać RAZ dziennie, po `nowaTura(s)`. `ziarno` różnicuje losowość bitew
 * między niezależnymi przebiegami symulacji — w prawdziwej grze zostaje 0.
 */
export function turaAI(s: StanMapy, kto: Wlasciciel, ziarno = 0): void {
  rozbudujIWerbuj(s, kto);
  ruszSie(s, kto, ziarno);
}

/** Wygodny alias na potrzeby gry: tura przeciwnika gracza. */
export function turaWroga(s: StanMapy, ziarno = 0): void {
  turaAI(s, 'wrog', ziarno);
}
