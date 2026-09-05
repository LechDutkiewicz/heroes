import type { Skarbiec, Surowiec } from './mapa';
import { MNOZNIK_FORTU } from './zasady-h3';

/**
 * Zamki: budynki, ich koszty, warunki i ekonomia.
 *
 * Wzorowane na Heroes 3, ale okrojone. Zostawiamy to, co daje decyzje:
 *   - ratusz daje dochód i to on finansuje wszystko inne,
 *   - fort podnosi przyrost we WSZYSTKICH siedliskach naraz,
 *   - siedliska otwierają kolejne poziomy oddziałów,
 *   - a każdy budynek wymaga czegoś wcześniejszego.
 *
 * Wycięliśmy magię, targ, gildię złodziei i ulepszenia siedlisk — nie dlatego,
 * że są złe, tylko dlatego, że każdy z nich to osobna mechanika do wytłumaczenia
 * ośmiolatkowi. Ścieżka „ratusz → fort → siedliska" wystarcza, żeby wybór
 * „co dziś budować" był prawdziwy.
 *
 * Frakcje różnią się NIE listą budynków, tylko ich nazwami, kolejnością
 * kosztów i tym, w co są tanie. Bór buduje tanio siedliska niskich poziomów
 * (armia liczna i szybka), Zbocze drogo, ale od razu wysokich (armia mała
 * i ciężka), Grota siedzi pośrodku i najtaniej stawia ratusze (gra ekonomią).
 */

export type RodzajBudynku = 'ratusz' | 'fort' | 'siedlisko' | 'specjalny';

export interface Budynek {
  id: string;
  nazwa: string;
  opis: string;
  rodzaj: RodzajBudynku;
  koszt: Partial<Skarbiec>;
  /** Co musi już stać, żeby dało się to postawić. */
  wymaga: string[];
  /** Dla siedliska: który poziom oddziału otwiera (0–5). */
  poziom?: number;
  /** Dla ratusza: ile pokeballi dziennie dokłada. */
  dochod?: number;
  /**
   * Miejsce na panoramie miasta: `x` to ułamek szerokości ekranu, `y` to
   * GŁĘBIA — 0 znaczy „przy horyzoncie", 1 „na samym przodzie". Scena przelicza
   * głębię na wysokość i na perspektywę (co dalej, to mniejsze), więc te dwie
   * liczby wystarczą, żeby ustawić budynek w krajobrazie.
   */
  x: number;
  y: number;
  /** Względna wielkość bryły — waga budynku, niezależna od głębi. */
  skala: number;
}

export interface ProfilZamku {
  frakcja: string;
  nazwa: string;
  /** Co dokłada codziennie budynek specjalny tej frakcji. */
  dar: { surowiec: Surowiec; ile: number };
  /**
   * Barwa wiodąca miasta — paski interfejsu biorą z niej akcent, żeby ekran
   * i panorama należały do jednego miejsca.
   *
   * Barw NIEBA i ZIEMI tu nie ma celowo: panorama jest malowana w
   * `tools/rysuj_miasto.py` i to tam leży jej paleta. Trzymanie tych samych
   * liczb w dwóch miejscach kończy się tym, że jedno się zmienia, a drugie nie,
   * i nikt nie wie, które jest prawdziwe.
   */
  barwa: number;
  /** Krótkie zdanie na ekranie miasta. */
  motto: string;
  budynki: Budynek[];
}

/**
 * Wspólny szkielet. Każda frakcja dostaje te same DZIEWIĘĆ budynków —
 * trzy ratusze, fort, sześć siedlisk minus jedno, które zastępuje budynek
 * specjalny — ale własne nazwy, koszty i rozstawienie na panoramie.
 *
 * Ta sama liczba budynków w każdym mieście jest celowa: dzięki temu żadna
 * frakcja nie ma po prostu „więcej rzeczy", a różnice są w cenach i w tym,
 * co dostajesz wcześniej.
 */
interface Szkielet {
  id: string;
  rodzaj: RodzajBudynku;
  poziom?: number;
  dochod?: number;
  wymaga: string[];
  x: number;
  y: number;
  skala: number;
}

const SZKIELET: Szkielet[] = [
  // Rozstawienie czyta się jak krajobraz, nie jak tabela: ratusz pośrodku,
  // przy drodze, bo to serce miasta; fort z tyłu po lewej, bo mur należy do
  // obrzeży; siedliska od najniższego z przodu po najwyższe w głębi — dzięki
  // temu w miarę rozbudowy miasto rośnie WGŁĄB, a nie przybywa mu wierszy.
  { id: 'ratusz1', rodzaj: 'ratusz', dochod: 6, wymaga: [], x: 0.5, y: 0.45, skala: 1.0 },
  { id: 'ratusz2', rodzaj: 'ratusz', dochod: 14, wymaga: ['ratusz1'], x: 0.5, y: 0.45, skala: 1.15 },
  {
    id: 'ratusz3',
    rodzaj: 'ratusz',
    dochod: 26,
    wymaga: ['ratusz2', 'fort'],
    x: 0.5,
    y: 0.45,
    skala: 1.3,
  },
  { id: 'fort', rodzaj: 'fort', wymaga: ['ratusz1'], x: 0.22, y: 0.14, skala: 1.15 },
  { id: 'siedlisko1', rodzaj: 'siedlisko', poziom: 0, wymaga: [], x: 0.09, y: 0.6, skala: 0.62 },
  {
    id: 'siedlisko2',
    rodzaj: 'siedlisko',
    poziom: 1,
    wymaga: ['siedlisko1'],
    x: 0.3,
    y: 0.82,
    skala: 0.66,
  },
  {
    id: 'siedlisko3',
    rodzaj: 'siedlisko',
    poziom: 2,
    wymaga: ['siedlisko1'],
    x: 0.66,
    y: 0.8,
    skala: 0.7,
  },
  {
    id: 'siedlisko4',
    rodzaj: 'siedlisko',
    poziom: 3,
    wymaga: ['fort', 'siedlisko2'],
    x: 0.89,
    y: 0.52,
    skala: 0.76,
  },
  {
    id: 'siedlisko5',
    rodzaj: 'siedlisko',
    poziom: 4,
    wymaga: ['fort', 'siedlisko3'],
    x: 0.83,
    y: 0.2,
    skala: 0.85,
  },
  {
    id: 'siedlisko6',
    rodzaj: 'siedlisko',
    poziom: 5,
    wymaga: ['ratusz2', 'siedlisko5'],
    x: 0.36,
    y: 0.04,
    skala: 1.0,
  },
  // Skrajne `x` trzymamy poniżej 0.9: przy 0.95 bryła wychodziła poza prawą
  // krawędź okna i była ucięta ramą — krytyk wytknął to dwa razy z rzędu.
  { id: 'specjalny', rodzaj: 'specjalny', wymaga: ['ratusz2'], x: 0.62, y: 1.0, skala: 0.55 },
];

/**
 * Mnożniki cen. Suma wszystkich trzech profili jest zbliżona — inaczej jedna
 * frakcja byłaby po prostu tańsza, co nie jest wyborem, tylko przewagą.
 * Różnica jest w ROZKŁADZIE: co jest tanie na początku, a co drogie później.
 */
const PROFILE: Record<string, { siedliskaNiskie: number; siedliskaWysokie: number; ratusz: number }> =
  {
    bor: { siedliskaNiskie: 0.75, siedliskaWysokie: 1.25, ratusz: 1.0 },
    grota: { siedliskaNiskie: 1.0, siedliskaWysokie: 1.0, ratusz: 0.8 },
    zbocze: { siedliskaNiskie: 1.3, siedliskaWysokie: 0.8, ratusz: 1.1 },
  };

/** Ceny bazowe. Pokeballe niosą główny ciężar; odłamki są bramką na później. */
const CENY: Record<string, Partial<Skarbiec>> = {
  ratusz1: { pokeball: 20 },
  ratusz2: { pokeball: 45, odlamek: 3 },
  ratusz3: { pokeball: 90, odlamek: 8, kamien: 2 },
  fort: { pokeball: 35, odlamek: 5 },
  siedlisko1: { pokeball: 12 },
  siedlisko2: { pokeball: 20, jagoda: 4 },
  siedlisko3: { pokeball: 32, jagoda: 6 },
  siedlisko4: { pokeball: 50, odlamek: 4 },
  siedlisko5: { pokeball: 75, odlamek: 7, kamien: 1 },
  siedlisko6: { pokeball: 120, odlamek: 12, kamien: 3 },
  specjalny: { pokeball: 60, kamien: 2 },
};

function skalujKoszt(id: string, profil: (typeof PROFILE)[string]): Partial<Skarbiec> {
  const bazowy = CENY[id];
  let mn = 1;
  if (id.startsWith('ratusz')) {
    mn = profil.ratusz;
  } else if (id.startsWith('siedlisko')) {
    // Mnożnik przechodzi PŁYNNIE od poziomu pierwszego do szóstego, zamiast
    // skakać na granicy „niskie/wysokie". Przy skoku czwarte siedlisko Zbocza
    // wychodziło tańsze od trzeciego — cena przestawała rosnąć z poziomem
    // i wyższy oddział był po prostu okazją, co psuło całą kolejność rozwoju.
    const poziom = Number(id.slice(-1)) - 1;
    const t = poziom / 5;
    mn = profil.siedliskaNiskie + (profil.siedliskaWysokie - profil.siedliskaNiskie) * t;
  }
  const wynik: Partial<Skarbiec> = {};
  for (const [co, ile] of Object.entries(bazowy)) {
    wynik[co as Surowiec] = Math.max(1, Math.round(ile * mn));
  }
  return wynik;
}

/** Nazwy i opisy — jedyne miejsce, w którym miasta mówią własnym głosem. */
const NAZWY: Record<string, Record<string, [string, string]>> = {
  bor: {
    ratusz1: ['Polana Zbiorów', 'Codziennie znosi tu pokeballe znalezione w lesie.'],
    ratusz2: ['Wielka Polana', 'Więcej rąk, więcej znalezisk.'],
    ratusz3: ['Serce Boru', 'Cały las pracuje na twój obóz.'],
    fort: ['Palisada', 'Obrona i wyraźnie szybszy przyrost we wszystkich gniazdach.'],
    siedlisko1: ['Gniazdo Iskier', 'Tu wykluwają się Pyroko.'],
    siedlisko2: ['Suchy Konar', 'Flamiry lubią ciepłe drewno.'],
    siedlisko3: ['Rosista Kotlina', 'Aquino potrzebują mgły.'],
    siedlisko4: ['Strumień', 'Torrenary płyną z prądem.'],
    siedlisko5: ['Zielona Kopuła', 'Verdiko rosną w cieniu koron.'],
    siedlisko6: ['Prastare Drzewo', 'Silvena budzi się raz na jakiś czas.'],
    specjalny: ['Krzew Jagodowy', 'Dokłada jagody każdego dnia.'],
  },
  grota: {
    ratusz1: ['Składnica', 'Pokeballe wypłukane z podziemnej rzeki.'],
    ratusz2: ['Wielka Składnica', 'Głębiej znaczy więcej.'],
    ratusz3: ['Skarbiec Groty', 'Podziemia oddają wszystko, co połknęły.'],
    fort: ['Zapora', 'Obrona i wyraźnie szybszy przyrost we wszystkich gniazdach.'],
    siedlisko1: ['Lodowa Nisza', 'Glacyny lubią zimno.'],
    siedlisko2: ['Zarodnikowa Komora', 'Sporeksy mnożą się w ciemności.'],
    siedlisko3: ['Ciepły Komin', 'Cindro grzeje się przy szczelinie.'],
    siedlisko4: ['Grzybowe Pole', 'Sporiny rosną powoli i twardo.'],
    siedlisko5: ['Podziemne Jezioro', 'Aquatory nie znoszą światła.'],
    siedlisko6: ['Krater', 'Vulkarony budzą się w gorącu.'],
    specjalny: ['Żyła Odłamków', 'Dokłada odłamki każdego dnia.'],
  },
  zbocze: {
    ratusz1: ['Obozowisko', 'Pokeballe wygrzebane z popiołu.'],
    ratusz2: ['Osada Popielna', 'Więcej namiotów, więcej łupu.'],
    ratusz3: ['Kuźnia Zbocza', 'Popiół zamienia się w bogactwo.'],
    fort: ['Wał Popielny', 'Obrona i wyraźnie szybszy przyrost we wszystkich gniazdach.'],
    siedlisko1: ['Bazaltowy Próg', 'Bazalty stygną tu latami.'],
    siedlisko2: ['Gorące Źródło', 'Ashko wygrzewają się w parze.'],
    siedlisko3: ['Obsydianowy Zwał', 'Obsydiany trzeba wykuć.'],
    siedlisko4: ['Żarowisko', 'Cyndery nie gasną.'],
    siedlisko5: ['Osuwisko', 'Lawiny czekają na pierwszy ruch.'],
    siedlisko6: ['Komin Wulkanu', 'Sadziny schodzą tylko na wojnę.'],
    specjalny: ['Piec Ewolucji', 'Dokłada kamień ewolucji każdego dnia.'],
  },
};

/**
 * Barwy i dar budynku specjalnego.
 *
 * Dar jest półtora raza większy od zwykłej kopalni tego samego surowca —
 * inaczej budynek za sześćdziesiąt pokeballi dawałby dokładnie tyle, co
 * kopalnia zajęta za darmo po drodze, i nikt by go nie postawił. Kamień
 * ewolucji jest wyjątkiem: jeden dziennie, bo to najrzadszy surowiec w grze
 * i dwa dziennie wywracałyby cenę wszystkiego, co za niego kupujemy.
 */
const BARWY: Record<
  string,
  {
    barwa: number;
    niebo: number;
    ziemia: number;
    motto: string;
    dar: { surowiec: Surowiec; ile: number };
  }
> = {
  bor: {
    barwa: 0x66bb6a,
    niebo: 0x9fd8b0,
    ziemia: 0x3d6b3a,
    motto: 'Las żywi tych, którzy go słuchają.',
    dar: { surowiec: 'jagoda', ile: 3 },
  },
  grota: {
    barwa: 0xab47bc,
    niebo: 0x2b2350,
    ziemia: 0x3a3358,
    motto: 'W ciemności rośnie to, czego nikt nie widzi.',
    dar: { surowiec: 'odlamek', ile: 2 },
  },
  zbocze: {
    barwa: 0xff7043,
    niebo: 0x6b3b2e,
    ziemia: 0x4a3630,
    motto: 'Popiół pamięta każdy ogień.',
    dar: { surowiec: 'kamien', ile: 1 },
  },
};

function zbudujProfil(frakcja: string, nazwaMiasta: string): ProfilZamku {
  const profil = PROFILE[frakcja] ?? PROFILE.bor;
  const nazwy = NAZWY[frakcja] ?? NAZWY.bor;
  const b = BARWY[frakcja] ?? BARWY.bor;
  return {
    frakcja,
    nazwa: nazwaMiasta,
    dar: b.dar,
    barwa: b.barwa,
    motto: b.motto,
    budynki: SZKIELET.map((s) => ({
      id: s.id,
      nazwa: nazwy[s.id][0],
      opis: nazwy[s.id][1],
      rodzaj: s.rodzaj,
      koszt: skalujKoszt(s.id, profil),
      wymaga: s.wymaga,
      poziom: s.poziom,
      dochod: s.dochod,
      x: s.x,
      y: s.y,
      skala: s.skala,
    })),
  };
}

export const ZAMKI: Record<string, ProfilZamku> = {
  bor: zbudujProfil('bor', 'Bór Szmaragdowy'),
  grota: zbudujProfil('grota', 'Grota Księżycowa'),
  zbocze: zbudujProfil('zbocze', 'Zbocze Popielne'),
};

export const profilZamku = (frakcja: string) => ZAMKI[frakcja] ?? ZAMKI.bor;

/** Czy stać nas na budynek. */
export function stacNas(skarbiec: Skarbiec, koszt: Partial<Skarbiec>) {
  return Object.entries(koszt).every(([co, ile]) => skarbiec[co as Surowiec] >= ile);
}

/** Czy warunki są spełnione (i czy budynek już nie stoi). */
export function moznaBudowac(b: Budynek, postawione: string[]) {
  return !postawione.includes(b.id) && b.wymaga.every((w) => postawione.includes(w));
}

export function zaplac(skarbiec: Skarbiec, koszt: Partial<Skarbiec>) {
  for (const [co, ile] of Object.entries(koszt)) skarbiec[co as Surowiec] -= ile;
}

/**
 * Dzienny przyrost oddziałów w zamku. Fort podnosi go wszędzie o połowę —
 * to jedyny budynek, który działa na całe miasto naraz, i dlatego jest
 * najciekawszą decyzją: brać go zamiast kolejnego siedliska czy po nim.
 */
export function przyrostZamku(postawione: string[], bazowy: number[]) {
  const mnoznik = postawione.includes('fort') ? MNOZNIK_FORTU : 1;
  return bazowy.map((ile, poziom) => {
    const jest = postawione.includes(`siedlisko${poziom + 1}`);
    return jest ? Math.max(1, Math.round(ile * mnoznik)) : 0;
  });
}

/** Dzienny dochód w pokeballach z ratuszy (liczy się najlepszy postawiony). */
export function dochodZamku(postawione: string[], frakcja: string) {
  const b = profilZamku(frakcja).budynki.filter(
    (x) => x.rodzaj === 'ratusz' && postawione.includes(x.id)
  );
  return b.reduce((max, x) => Math.max(max, x.dochod ?? 0), 0);
}

/**
 * Wszystko, co miasto daje dziennie: pokeballe z ratusza i surowiec z budynku
 * specjalnego. Jedno miejsce, bo pasek surowców na mapie i ekran miasta muszą
 * pokazywać ten sam dochód — dwa osobne rachunki rozjeżdżają się przy
 * pierwszej zmianie cen i wtedy pasek kłamie.
 */
export function daryZamku(
  postawione: string[],
  frakcja: string
): Partial<Record<Surowiec, number>> {
  const suma: Partial<Record<Surowiec, number>> = {};
  const zloto = dochodZamku(postawione, frakcja);
  if (zloto > 0) suma.pokeball = zloto;
  if (postawione.includes('specjalny')) {
    const dar = profilZamku(frakcja).dar;
    suma[dar.surowiec] = (suma[dar.surowiec] ?? 0) + dar.ile;
  }
  return suma;
}

/** Budynek po identyfikatorze — scena pyta o nazwy i koszty po `id`. */
export function budynek(frakcja: string, id: string) {
  return profilZamku(frakcja).budynki.find((b) => b.id === id);
}

/**
 * Czego brakuje do postawienia budynku. Zwraca listę par surowiec–ile, bo
 * „nie stać cię" bez podania czego brakuje jest dla dziecka ślepym zaułkiem:
 * widzi zablokowany przycisk i nie wie, czego szukać na mapie.
 */
export function brakuje(skarbiec: Skarbiec, koszt: Partial<Skarbiec>) {
  return Object.entries(koszt)
    .map(([co, ile]) => ({ surowiec: co as Surowiec, ile: ile - skarbiec[co as Surowiec] }))
    .filter((x) => x.ile > 0);
}
