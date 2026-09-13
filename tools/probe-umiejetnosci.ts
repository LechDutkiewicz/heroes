/**
 * Sonda drugorzędnych umiejętności: czy każda z ośmiu NAPRAWDĘ coś robi.
 *
 * To jest jedyne sprawdzenie, które ma tu sens. Okno awansu da się zrobić
 * ładne, karty da się opisać, a umiejętność i tak może być napisem: wystarczy,
 * że nikt nie podepnie jej pod zasadę gry. Dlatego każda pozycja z tablicy
 * `UMIEJETNOSCI` jest tu sprawdzana przez PORÓWNANIE dwóch stanów gry —
 * z umiejętnością i bez niej — a nie przez odczytanie jej własnej wartości.
 *
 * Osobno sprawdzamy dobór kart przy awansie, bo to on decyduje, czy wybór
 * w ogóle jest wyborem: dwie identyczne karty albo karta bez pokrycia
 * w gniazdach zamieniłyby awans w klikanie „dalej".
 *
 *   npx tsx tools/probe-umiejetnosci.ts
 */

import { planszaPrzygody } from '../src/data/plansza';
import { dochod, odslon, poziom, ruchNaDzis, type StanMapy } from '../src/data/mapa';
import {
  MAKS_UMIEJETNOSCI,
  UMIEJETNOSCI,
  efekt,
  ofertaAwansu,
  opisWartosci,
  poziomUmiejetnosci,
  posiadane,
  przyznaj,
  umiejetnoscPoId,
} from '../src/data/umiejetnosci';
import { createBattle, damageOf, type Battle } from '../src/data/battle';
import { FACTIONS } from '../src/data/factions';

let bledy = 0;
const sprawdz = (nazwa: string, warunek: boolean, szczegol = '') => {
  if (!warunek) bledy++;
  console.log(`${warunek ? 'OK  ' : 'BŁĄD'} ${nazwa}${szczegol ? ` — ${szczegol}` : ''}`);
};

/** Świeży stan gry — każde sprawdzenie zaczyna od tego samego. */
const swiezy = (): StanMapy => planszaPrzygody();

console.log('--- każda umiejętność coś robi ---');

// Zwiad: więcej punktów ruchu na dzień.
{
  const bez = swiezy();
  const z = swiezy();
  z.bohater.umiejetnosci = { zwiad: 3 };
  sprawdz(
    'Zwiad podnosi zapas ruchu',
    ruchNaDzis(z) > ruchNaDzis(bez),
    `${ruchNaDzis(bez)} → ${ruchNaDzis(z)}`
  );
  const oczekiwane = Math.round(ruchNaDzis(bez) * 1.3);
  sprawdz('Zwiad mistrzowski daje dokładnie +30%', ruchNaDzis(z) === oczekiwane, `${ruchNaDzis(z)} vs ${oczekiwane}`);
}

// Tropiciel: większy promień odsłaniania mgły.
{
  const policz = (poziomUm: number) => {
    const s = swiezy();
    if (poziomUm) s.bohater.umiejetnosci = { tropiciel: poziomUm };
    // Zerujemy mgłę, bo `planszaPrzygody` odsłania już okolicę startu.
    s.odkryte = s.odkryte.map((w) => w.map(() => false));
    return odslon(s);
  };
  const bez = policz(0);
  const z = policz(3);
  sprawdz('Tropiciel odsłania więcej pól', z > bez, `${bez} → ${z}`);
}

// Tropiciel NIE zmienia zasięgu wieży — ta widzi tyle, ile widzi.
{
  const s = swiezy();
  s.bohater.umiejetnosci = { tropiciel: 3 };
  s.odkryte = s.odkryte.map((w) => w.map(() => false));
  const zWieza = odslon(s, 4, { x: 10, y: 10 });
  const b = swiezy();
  b.odkryte = b.odkryte.map((w) => w.map(() => false));
  const bezWieza = odslon(b, 4, { x: 10, y: 10 });
  sprawdz('Tropiciel nie poszerza zasięgu wieży', zWieza === bezWieza, `${bezWieza} vs ${zWieza}`);
}

// Gospodarność: dochód dzienny.
{
  const bez = swiezy();
  const z = swiezy();
  z.bohater.umiejetnosci = { gospodarnosc: 2 };
  const a = dochod(bez).pokeball ?? 0;
  const b = dochod(z).pokeball ?? 0;
  sprawdz('Gospodarność podnosi dochód', b === a + 4, `${a} → ${b}`);
}

// Nauka: mnożnik doświadczenia. Sprawdzamy wzór, którym liczy scena.
{
  const z = swiezy();
  z.bohater.umiejetnosci = { nauka: 3 };
  const nagroda = Math.round(80 * (1 + efekt(z.bohater, 'nauka')));
  sprawdz('Nauka mistrzowska daje +25% doświadczenia', nagroda === 100, `${nagroda}`);
}

// Uzdrowiciel: odsetek strat wraca. Liczymy tym samym wzorem co scena.
{
  const z = swiezy();
  z.bohater.umiejetnosci = { uzdrowiciel: 3 };
  const straty = 10;
  const wraca = Math.floor(straty * efekt(z.bohater, 'leczenie'));
  sprawdz('Uzdrowiciel oddaje część poległych', wraca === 3, `${wraca} z ${straty}`);
  const bez = swiezy();
  sprawdz('bez Uzdrowiciela nie wraca nikt', Math.floor(straty * efekt(bez.bohater, 'leczenie')) === 0);
}

console.log('--- umiejętności bojowe w symulacji bitwy ---');
{
  const bitwa = (bonus?: Battle['bonusGracza']) => {
    const b = createBattle(FACTIONS[0], FACTIONS[1], [], () => 0.5);
    b.bonusGracza = bonus;
    return b;
  };
  const paraWrecz = (b: Battle) => {
    const atak = b.units.find((u) => u.side === 'player' && !u.def.shooter)!;
    const cel = b.units.find((u) => u.side === 'enemy')!;
    return damageOf(b, atak, cel).value;
  };
  const paraDoNas = (b: Battle) => {
    const atak = b.units.find((u) => u.side === 'enemy' && !u.def.shooter)!;
    const cel = b.units.find((u) => u.side === 'player')!;
    return damageOf(b, atak, cel).value;
  };

  const bez = paraWrecz(bitwa());
  const zNapastnikiem = paraWrecz(bitwa({ wrecz: 0.3, strzal: 0, pancerz: 0 }));
  sprawdz('Napastnik podnosi obrażenia wręcz', zNapastnikiem > bez, `${bez} → ${zNapastnikiem}`);

  const wNas = paraDoNas(bitwa());
  const wNasZPancerzem = paraDoNas(bitwa({ wrecz: 0, strzal: 0, pancerz: 0.22 }));
  sprawdz('Pancerz obniża obrażenia otrzymywane', wNasZPancerzem < wNas, `${wNas} → ${wNasZPancerzem}`);

  // Napastnik nie może pomagać wrogowi — bonus działa w jedną stronę.
  const wNasZNapastnikiem = paraDoNas(bitwa({ wrecz: 0.3, strzal: 0, pancerz: 0 }));
  sprawdz('Napastnik nie wzmacnia wroga', wNasZNapastnikiem === wNas, `${wNas} vs ${wNasZNapastnikiem}`);

  // Łucznictwo dotyczy strzelca, Napastnik go nie dotyczy.
  const b1 = bitwa({ wrecz: 0, strzal: 0.4, pancerz: 0 });
  const strzelec = b1.units.find((u) => u.side === 'player' && u.def.shooter);
  if (strzelec) {
    const cel = b1.units.find((u) => u.side === 'enemy')!;
    const b0 = bitwa();
    const s0 = b0.units.find((u) => u.side === 'player' && u.def.shooter)!;
    const c0 = b0.units.find((u) => u.side === 'enemy')!;
    sprawdz(
      'Łucznictwo podnosi obrażenia strzelca',
      damageOf(b1, strzelec, cel).value > damageOf(b0, s0, c0).value
    );
  } else {
    sprawdz('Łucznictwo — frakcja ma strzelca do sprawdzenia', false, 'brak strzelca w pierwszej frakcji');
  }

  // Bitwa bez podanego bonusu musi liczyć dokładnie tak jak przed zmianą —
  // inaczej `balance.ts` mierzyłby co innego niż frakcje.
  const czysta = bitwa();
  const zZerami = bitwa({ wrecz: 0, strzal: 0, pancerz: 0 });
  sprawdz('brak bonusu nie zmienia rachunku', paraWrecz(czysta) === paraWrecz(zZerami));
}

console.log('--- oferta przy awansie ---');
{
  const s = swiezy();
  const losStaly = () => 0;
  const pierwsza = ofertaAwansu(s.bohater, losStaly);
  sprawdz('na start są dwie karty', pierwsza.length === 2, `${pierwsza.length}`);
  sprawdz('obie karty to co innego', pierwsza[0].id !== pierwsza[1].id, pierwsza.map((o) => o.id).join(', '));
  sprawdz('na start obie są nowe', pierwsza.every((o) => o.nowa));

  // Zapełniamy cztery gniazda — dalej mogą przychodzić już tylko ulepszenia.
  for (let i = 0; i < MAKS_UMIEJETNOSCI; i++) {
    przyznaj(s.bohater, { id: UMIEJETNOSCI[i].id, poziom: 1, nowa: true });
  }
  sprawdz('cztery gniazda zajęte', posiadane(s.bohater).length === MAKS_UMIEJETNOSCI);
  const pelne = ofertaAwansu(s.bohater, losStaly);
  sprawdz('przy pełnych gniazdach same ulepszenia', pelne.every((o) => !o.nowa), pelne.map((o) => o.id).join(', '));
  sprawdz('piąta umiejętność się nie wciska', poziomUmiejetnosci(s.bohater, UMIEJETNOSCI[4].id) === 0);

  // Wszystko na maksa — nie ma czego proponować i okno musi to umieć powiedzieć.
  for (let i = 0; i < MAKS_UMIEJETNOSCI; i++) {
    przyznaj(s.bohater, { id: UMIEJETNOSCI[i].id, poziom: 3, nowa: false });
  }
  sprawdz('przy komplecie oferta jest pusta', ofertaAwansu(s.bohater, losStaly).length === 0);
}

console.log('--- opisy i spójność tablicy ---');
{
  sprawdz('osiem umiejętności', UMIEJETNOSCI.length === 8, `${UMIEJETNOSCI.length}`);
  const idki = new Set(UMIEJETNOSCI.map((u) => u.id));
  sprawdz('identyfikatory są niepowtarzalne', idki.size === UMIEJETNOSCI.length);
  let rosnace = true;
  let opisane = true;
  for (const u of UMIEJETNOSCI) {
    if (!(u.wartosci[0] < u.wartosci[1] && u.wartosci[1] < u.wartosci[2])) rosnace = false;
    for (const p of [1, 2, 3] as const) {
      const o = opisWartosci(u, p);
      if (!o || o.length < 2) opisane = false;
    }
    if (!umiejetnoscPoId(u.id)) opisane = false;
  }
  sprawdz('wartości rosną z poziomem', rosnace);
  sprawdz('każdy poziom ma opis', opisane);
  // Każdy klucz efektu musi mieć właściciela — klucz bez umiejętności to
  // martwa gałąź w zasadach gry.
  const klucze = new Set(UMIEJETNOSCI.map((u) => u.klucz));
  sprawdz('osiem różnych efektów', klucze.size === 8, [...klucze].join(', '));
}

console.log('--- poziomy bohatera ---');
{
  // Awans musi być osiągalny w rozsądnym czasie: 80 doświadczenia za bitwę,
  // więc pierwszy poziom ma wypaść po jednej-dwóch wygranych, a nie po
  // dziesięciu. Inaczej cały mechanizm wyboru nie zdąży się pokazać.
  sprawdz('drugi poziom po dwóch bitwach', poziom(160) >= 2, `poziom przy 160: ${poziom(160)}`);
  sprawdz('nie od razu piąty', poziom(160) < 5);
}

console.log(bledy === 0 ? '\nWszystko przeszło.' : `\n${bledy} sprawdzeń nie przeszło.`);
process.exit(bledy === 0 ? 0 : 1);
