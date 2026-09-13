// Sprawdzenie pierwszej planszy — bez przeglądarki, bez rysowania.
//
// Po co: rysunek mapy to tekst, a w tekście łatwo o wiersz krótszy o jeden
// znak albo o obiekt postawiony na lesie. Jedno i drugie widać dopiero
// w grze, i to jako coś zupełnie innego („nie da się tam wejść").
//
//   npx tsx tools/probe-mapa.ts

import {
  TEREN_INFO,
  kosztPola,
  obiektNa,
  trasa,
  wGranicach,
  type StanMapy,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { MAPA_H, MAPA_W, OKNO_H, OKNO_W } from '../src/visual/uklad';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';




let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const s: StanMapy = planszaPrzygody();

console.log('=== kształt planszy ===');
sprawdz('wszystkie wiersze równej długości', s.teren.every((w) => w.length === s.szer), `${s.szer} × ${s.wys}`);

console.log('\n=== układ mieści się w oknie gry ===');
sprawdz('szerokość', MAPA_W <= OKNO_W, `${MAPA_W} ≤ ${OKNO_W}`);
sprawdz('wysokość', MAPA_H <= OKNO_H, `${MAPA_H} ≤ ${OKNO_H}`);
// Plansza jest teraz większa od okna — to ona wymusiła przewijanie.
sprawdz('plansza większa od okna (jest co przewijać)', s.szer > 14 && s.wys > 12, `${s.szer} × ${s.wys}`);

console.log('\n=== tło zgodne z rysunkiem planszy ===');
// Tło jest generowane z `RYSUNEK` przez tools/render_mapa.py. Bez tej kontroli
// łatwo zmienić planszę w kodzie i oglądać stare tło: pola zmieniają koszty
// i przejezdność, a obrazek pokazuje poprzedni układ. Taki rozjazd wygląda
// jak usterka silnika, a nie jak zapomniane przegenerowanie.
{
  const rysunek = s.teren
    .map((w) => w.map((t) => ({ trawa: '.', sciezka: '=', piasek: ',', las: 'T', skaly: '#', woda: '~' })[t]).join(''))
    .join('\n');
  const teraz = createHash('sha256').update(rysunek, 'utf8').digest('hex').slice(0, 16);
  let zapisany = '(brak pliku)';
  try {
    zapisany = JSON.parse(readFileSync('public/mapa/plansza.json', 'utf8')).odcisk;
  } catch {
    /* zostaje „brak pliku" */
  }
  sprawdz(
    'odcisk planszy zgadza się z wygenerowanym tłem',
    teraz === zapisany,
    teraz === zapisany ? teraz : `kod ${teraz} ≠ tło ${zapisany} — uruchom: python3 tools/render_mapa.py`
  );
}

console.log('\n=== obiekty ===');
let zleStojace = 0;
for (const o of s.obiekty) {
  const nateren = wGranicach(s, o.x, o.y) ? s.teren[o.y][o.x] : null;
  if (!(nateren !== null && TEREN_INFO[nateren].koszt !== null)) {
    zleStojace++;
    sprawdz(`${o.nazwa} (${o.x},${o.y})`, false, nateren === null ? 'poza planszą' : TEREN_INFO[nateren].nazwa);
  }
}
sprawdz(`wszystkie ${s.obiekty.length} obiektów stoi na terenie przejezdnym`, zleStojace === 0);
const zajete = new Set(s.obiekty.map((o) => `${o.x},${o.y}`));
sprawdz('żadne dwa obiekty nie stoją na tym samym polu', zajete.size === s.obiekty.length);
sprawdz(
  'bohater nie startuje na obiekcie ani w skałach',
  !obiektNa(s, s.bohater.x, s.bohater.y) && kosztPola(s, s.bohater.x, s.bohater.y) !== null
);

console.log('\n=== dostępność (bez uwzględniania strażników) ===');
// Każdy obiekt musi dać się osiągnąć. Trasa nie przechodzi PRZEZ obiekty,
// więc jeśli potwór zamyka jedyne przejście do zamku, wyjdzie to właśnie tu.
for (const o of s.obiekty) {
  // Osiągalność sprawdzamy z POMINIĘCIEM strażników: część mapy leży celowo
  // za potworem i dopóki się go nie pokona, trasy tam nie ma. To jest zamysł,
  // a nie usterka. Interesuje nas, czy plansza nie rozpada się na kawałki
  // niepołączone terenem.
  const bezStrazy: StanMapy = { ...s, obiekty: s.obiekty.filter((x) => x.rodzaj !== 'potwor') };
  const t = trasa(bezStrazy, o.x, o.y);
  if (t === null && !(o.x === s.bohater.x && o.y === s.bohater.y)) {
    sprawdz(`da się dojść do: ${o.nazwa} (${o.x},${o.y})`, false, 'brak trasy');
  }
}

console.log('\n=== pierwsza tura ma sens ===');
// Gra dla ośmiolatka: w pierwszej turze musi być coś do zrobienia, ale nie
// wszystko naraz — inaczej albo nie ma nagrody, albo nie ma następnej tury.
const wZasiegu = s.obiekty.filter((o) => {
  const t = trasa(s, o.x, o.y);
  return t !== null && t.reduce((a, k) => a + k.koszt, 0) <= s.bohater.ruchMax;
});
// Poprzednia wersja tego sprawdzenia wymagała 2–4 osiągalnych obiektów i była
// dobrana do planszy 14 × 12. Po przejściu na 36 × 36 i punkty ruchu z Heroes 3
// (1500–2000, czyli 15–20 pól dziennie) w pierwszym dniu widać kilkanaście
// obiektów — i tak właśnie wygląda pierwszy dzień w Heroes 3. Nie liczba jest
// tu istotna, tylko dwie rzeczy: żeby było co robić i żeby nie dało się od razu
// pojechać na koniec mapy.
sprawdz('w pierwszym dniu jest co robić', wZasiegu.length >= 3, `${wZasiegu.length} obiektów`);
const wrogiZamek = s.obiekty.find((o) => o.rodzaj === 'zamek' && !o.nasz)!;
sprawdz(
  'zamek przeciwnika NIE jest osiągalny pierwszego dnia',
  !wZasiegu.includes(wrogiZamek)
);
const straze = s.obiekty.filter(
  (o) => o.nazwa.startsWith('Strażnik ') || o.nazwa.startsWith('Wódz ')
);
sprawdz('cztery straże graniczne stoją na mapie', straze.length === 4, straze.map((o) => o.nazwa).join(', '));
for (const g of straze) {
  sprawdz(`${g.nazwa} stoi poza zasięgiem pierwszego dnia`, !wZasiegu.includes(g));
}

console.log('\n=== grzbiety dzielą mapę na trzy pasy ===');
// Cały układ stoi na tym, że przez KAŻDY grzbiet prowadzą dokładnie dwa
// przejścia i oba są pilnowane. Rozmycie granic w generatorze potrafi wybić
// trzecią dziurę szeroką na pole — nie widać tego ani na obrazku, ani w kodzie,
// a mapa cicho przestaje być tą mapą: da się wejść bokiem, omijając straż.
const RDZENIE: Array<[string, number, number]> = [
  ['północny', 21, 22],
  ['południowy', 45, 46],
];
{
  const przejezdne = (x: number, y: number) => TEREN_INFO[s.teren[y][x]].koszt !== null;
  for (const [nazwa, y0, y1] of RDZENIE) {
    const kolumny: number[] = [];
    for (let x = 0; x < s.szer; x++) {
      let wolna = true;
      for (let y = y0; y <= y1; y++) if (!przejezdne(x, y)) wolna = false;
      if (wolna) kolumny.push(x);
    }
    const grupy = kolumny.reduce<number[][]>((a, x) => {
      if (a.length && x === a[a.length - 1][a[a.length - 1].length - 1] + 1) a[a.length - 1].push(x);
      else a.push([x]);
      return a;
    }, []);
    sprawdz(
      `przez grzbiet ${nazwa} prowadzą dokładnie dwa przejścia`,
      grupy.length === 2,
      grupy.map((g) => `x ${g[0]}–${g[g.length - 1]}`).join(', ')
    );
    // Przejście szersze niż trzy pola da się obejść: strażnik blokuje pas
    // szeroki na trzy. To jest ta sama pomyłka, która raz już przepuściła
    // 74% mapy bez jednej bitwy.
    for (const g of grupy) {
      sprawdz(`przejście x ${g[0]}–${g[g.length - 1]} jest wąskie`, g.length <= 3, `${g.length} pola`);
    }
    // Straż stoi PRZY przejściu (w jego wylocie albo w nim), nie obok.
    const wTym = straze.filter((o) => Math.abs(o.y - y0) <= 2 || Math.abs(o.y - y1) <= 2);
    sprawdz(`grzbiet ${nazwa} ma dwie straże`, wTym.length === 2, wTym.map((o) => o.nazwa).join(', '));
    for (const o of wTym) {
      sprawdz(
        `${o.nazwa} zamyka przejście`,
        grupy.some((k) => k.some((x) => Math.abs(x - o.x) <= 1)),
        `(${o.x},${o.y})`
      );
    }
  }
}

console.log('\n=== ile mapy stoi otworem bez jednej bitwy ===');
// Miara, dla której powstała ta sekcja: jeśli straże da się obejść, plansza
// przestaje mieć pasy, a wygląda dokładnie tak samo. Dolina gracza to około
// trzeciej części planszy i tyle ma być dostępne od razu — nie połowa.
{
  const blok = new Set<string>();
  for (const o of s.obiekty) {
    if (o.rodzaj !== 'potwor' || o.zebrany) continue;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) blok.add(`${o.x + dx},${o.y + dy}`);
  }
  const przejezdne = (x: number, y: number) =>
    wGranicach(s, x, y) && TEREN_INFO[s.teren[y][x]].koszt !== null;
  let wszystkie = 0;
  for (let y = 0; y < s.wys; y++) for (let x = 0; x < s.szer; x++) if (przejezdne(x, y)) wszystkie++;
  const widziane = new Set([`${s.bohater.x},${s.bohater.y}`]);
  const kolejka = [[s.bohater.x, s.bohater.y]];
  while (kolejka.length) {
    const [x, y] = kolejka.pop()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (!widziane.has(k) && !blok.has(k) && przejezdne(nx, ny)) {
          widziane.add(k);
          kolejka.push([nx, ny]);
        }
      }
  }
  const proc = Math.round((widziane.size * 100) / wszystkie);
  sprawdz('bez wygranej bitwy stoi otworem od ćwierci do połowy planszy', proc >= 22 && proc <= 50, `${proc}%`);
}

console.log('\n=== gęstość obiektów jak na mapie M z Heroes 3 ===');
{
  let przejezdnych = 0;
  for (let y = 0; y < s.wys; y++)
    for (let x = 0; x < s.szer; x++) if (TEREN_INFO[s.teren[y][x]].koszt !== null) przejezdnych++;
  const naObiekt = przejezdnych / s.obiekty.length;
  // Rzadziej niż co 30 pól robi się pustynia, gęściej niż co 12 — jarmark,
  // po którym nie da się przejść bez wejścia na coś.
  sprawdz('obiekt co 12–30 pól przejezdnych', naObiekt >= 12 && naObiekt <= 30, `co ${naObiekt.toFixed(1)}`);
}

console.log('\n=== gospodarka jest po stronie gracza ===');
// Pierwsza połowa gry to rozbudowa w bezpiecznym pasie. Jeżeli kopalnie
// rozejdą się po całej planszy, mapa traci podział i staje się przechadzką.
{
  const kopalnie = s.obiekty.filter((o) => o.rodzaj === 'kopalnia');
  const wDomu = kopalnie.filter((o) => o.y > 46);
  const wPasie = kopalnie.filter((o) => o.y >= 21 && o.y <= 46);
  sprawdz('dolina gracza ma co najmniej sześć kopalń', wDomu.length >= 6, `${wDomu.length} z ${kopalnie.length}`);
  sprawdz('pas sporny też ma o co walczyć', wPasie.length >= 5, `${wPasie.length} kopalń`);
  // To jest sprawdzenie, którego brak kosztował rundę: przy losowanych
  // surowcach dolina potrafiła nie dostać ANI JEDNEJ kopalni odłamków, a nimi
  // płaci się za całą górną połowę drzewka miasta. Mapa wyglądała dobrze
  // i nie dało się na niej skończyć zamku.
  for (const co of ['odlamek', 'jagoda', 'pokeball']) {
    sprawdz(
      `dolina ma własne źródło surowca: ${co}`,
      wDomu.some((o) => o.surowiec === co),
      wDomu.map((o) => o.surowiec).join(', ')
    );
  }
}

console.log('\n=== mgła wojny ===');
const odkrytych = s.odkryte.flat().filter(Boolean).length;
sprawdz('na starcie odsłonięty jest tylko fragment', odkrytych > 20 && odkrytych < s.szer * s.wys * 0.15, `${odkrytych} z ${s.szer * s.wys} pól`);
sprawdz('każdy obiekt daleko od startu jest zakryty', !s.obiekty.every((o) => s.odkryte[o.y][o.x]));

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
