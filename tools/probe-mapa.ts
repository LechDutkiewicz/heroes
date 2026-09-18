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
  polaZajete,
  trasa,
  zamknietaBrama,
  wGranicach,
  type StanMapy,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { nowaTura } from '../src/data/mapa';
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
    .map((w) =>
      w
        .map(
          (t) =>
            ({
              trawa: '.',
              sciezka: '=',
              piasek: ',',
              jalowa: 'j',
              snieg: 's',
              bagno: 'b',
              las: 'T',
              skaly: '#',
              woda: '~',
            })[t]
        )
        .join('')
    )
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

console.log('\n=== do każdego obiektu da się podejść ===');
// Liczymy to na PRAWDZIWYM stanie gry, z pełną listą obiektów.
//
// Pierwsza wersja usuwała najpierw potwory („za strażą też ma być dojście”)
// i to cicho fałszowało wynik: `polaBryly` pomija pola muru stykające się
// z cudzym wejściem, więc po usunięciu potworów mury ROSŁY i sonda widziała
// blokady, których w grze nie ma. Potwory i tak nie zamykają drogi na stałe —
// pokonuje się je i idzie dalej — więc tutaj traktujemy je jak pola przejezdne.
{
  // Strażnice liczymy jako OTWARTE: klucz do każdej leży po tej stronie bramy,
  // co sprawdza osobna sekcja „trzy akty". Tutaj pytamy o co innego — czy
  // plansza nie ma kawałków odciętych na zawsze przez mury budowli.
  const otwarta: StanMapy = {
    ...s,
    bryly: undefined,
    obiekty: s.obiekty.map((o) => (o.rodzaj === 'straznica' ? { ...o, zebrany: true } : o)),
  };
  const bryly = polaZajete(otwarta);
  const przejezdne = (x: number, y: number) =>
    wGranicach(otwarta, x, y) &&
    TEREN_INFO[otwarta.teren[y][x]].koszt !== null &&
    !bryly.has(`${x},${y}`) &&
    !zamknietaBrama(otwarta, x, y);
  const widziane = new Set([`${s.bohater.x},${s.bohater.y}`]);
  const kolejka = [[s.bohater.x, s.bohater.y]];
  while (kolejka.length) {
    const [x, y] = kolejka.pop()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (!widziane.has(k) && przejezdne(nx, ny)) {
          widziane.add(k);
          kolejka.push([nx, ny]);
        }
      }
  }
  const bezDojscia = s.obiekty.filter(
    (o) =>
      ![-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => widziane.has(`${o.x + dx},${o.y + dy}`)))
  );
  sprawdz(
    `do wszystkich ${s.obiekty.length} obiektów da się podejść`,
    bezDojscia.length === 0,
    bezDojscia.slice(0, 5).map((o) => `${o.nazwa} (${o.x},${o.y})`).join(', ')
  );
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
const straze = s.obiekty.filter((o) => o.rodzaj === 'straznica');
sprawdz('cztery strażnice graniczne stoją na mapie', straze.length === 4, straze.map((o) => o.nazwa).join(', '));
for (const g of straze) {
  sprawdz(`${g.nazwa} stoi poza zasięgiem pierwszego dnia`, !wZasiegu.includes(g));
}
const namioty = s.obiekty.filter((o) => o.rodzaj === 'namiot');
sprawdz('każda barwa klucza ma swój namiot', namioty.length === 2 && new Set(namioty.map((o) => o.klucz)).size === 2, namioty.map((o) => o.klucz).join(', '));

console.log('\n=== portal ma dokąd przenosić ===');
// Skrót, który skraca o jedno pole, nie jest skrótem.
//
// Generator stawiał oba końce pary gdziekolwiek w strefie i raz wylosował je
// na polach (26,7) i (27,7) — obok siebie. Dla gracza to dziwactwo, dla AI
// przeciwnika pułapka bez wyjścia: wchodziło w jeden koniec, wypadało na
// drugim i tak przez resztę partii. Od dwudziestego dnia wróg stał w miejscu
// z armią rosnącą do dwustu i nigdy nie ruszał na gracza — a sonda planszy
// nie miała o to ani jednego pytania.
const portale = s.obiekty.filter((o) => o.rodzaj === 'budynek' && o.budynek === 'portal');
sprawdz('portale stoją parami', portale.length % 2 === 0, `${portale.length} sztuk`);
for (let i = 0; i < portale.length; i += 2) {
  const a = portale[i];
  const b = portale[i + 1];
  if (!b) break;
  const odl = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  sprawdz(
    `para portali (${a.x},${a.y}) ↔ (${b.x},${b.y}) przenosi o co najmniej 20 pól`,
    odl >= 20,
    `${odl} pól`
  );
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
    sprawdz(`grzbiet ${nazwa} ma dwie strażnice`, wTym.length === 2, wTym.map((o) => o.nazwa).join(', '));
    for (const o of wTym) {
      // Brama blokuje trzy pola w swoim rzędzie (własne i dwa obok), więc
      // zamyka przejście tylko wtedy, gdy KAŻDA jego kolumna mieści się w tej
      // trójce. Przy przejściu szerszym niż trzy pola brama jest ozdobą.
      const przejscie = grupy.find((k) => k.some((x) => Math.abs(x - o.x) <= 1));
      sprawdz(
        `${o.nazwa} zamyka przejście na całą szerokość`,
        przejscie !== undefined && przejscie.every((x) => Math.abs(x - o.x) <= 1),
        przejscie ? `brama x ${o.x}, przejście x ${przejscie[0]}–${przejscie[przejscie.length - 1]}` : 'brak przejścia'
      );
    }
    // Obie strażnice jednego grzbietu otwiera TEN SAM klucz — inaczej mapa ma
    // cztery drobne zadania zamiast dwóch aktów.
    sprawdz(
      `oba przejścia grzbietu ${nazwa} otwiera ten sam klucz`,
      new Set(wTym.map((o) => o.klucz)).size === 1,
      wTym.map((o) => o.klucz).join(', ')
    );
  }
}

console.log('\n=== mapa ma trzy akty i da się je przejść po kolei ===');
// Namiot postawiony ZA bramą, którą sam otwiera, zamyka mapę na głucho:
// plansza wygląda normalnie i po prostu nie da się jej skończyć. Sprawdzamy
// więc drogę tak, jak przechodzi ją gracz — zasadami GRY, nie własnym modelem.
{
  const osiagalneZ = (klucze: string[]) => {
    const kopia: StanMapy = {
      ...s,
      bryly: undefined,
      obiekty: s.obiekty.map((o) =>
        o.rodzaj === 'straznica' && klucze.includes(o.klucz ?? '') ? { ...o, zebrany: true } : o
      ),
    };
    const bryly = polaZajete(kopia);
    const mozna = (x: number, y: number) =>
      wGranicach(kopia, x, y) &&
      TEREN_INFO[kopia.teren[y][x]].koszt !== null &&
      !bryly.has(`${x},${y}`) &&
      !zamknietaBrama(kopia, x, y);
    const widziane = new Set([`${s.bohater.x},${s.bohater.y}`]);
    const kolejka = [[s.bohater.x, s.bohater.y]];
    while (kolejka.length) {
      const [x, y] = kolejka.pop()!;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
          if (!widziane.has(k) && mozna(nx, ny)) {
            widziane.add(k);
            kolejka.push([nx, ny]);
          }
        }
    }
    return widziane;
  };
  const doszlo = (widziane: Set<string>, o: { x: number; y: number }) =>
    [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => widziane.has(`${o.x + dx},${o.y + dy}`)));

  const namiotZielony = s.obiekty.find((o) => o.rodzaj === 'namiot' && o.klucz === 'zielony')!;
  const namiotNiebieski = s.obiekty.find((o) => o.rodzaj === 'namiot' && o.klucz === 'niebieski')!;
  const zamekWroga = s.obiekty.find((o) => o.rodzaj === 'zamek' && !o.nasz)!;

  const bezKluczy = osiagalneZ([]);
  const zZielonym = osiagalneZ(['zielony']);
  const zOboma = osiagalneZ(['zielony', 'niebieski']);

  sprawdz('akt I: bez kluczy da się dojść do zielonego namiotu', doszlo(bezKluczy, namiotZielony), `${bezKluczy.size} pól`);
  sprawdz('akt II: z zielonym kluczem da się dojść do niebieskiego namiotu', doszlo(zZielonym, namiotNiebieski), `${zZielonym.size} pól`);
  sprawdz('akt III: z obydwoma da się dojść do zamku wroga', doszlo(zOboma, zamekWroga), `${zOboma.size} pól`);
  sprawdz('bez kluczy zamek wroga jest NIEosiągalny', !doszlo(bezKluczy, zamekWroga));
  sprawdz('każdy akt otwiera nowy kawałek mapy', bezKluczy.size < zZielonym.size && zZielonym.size < zOboma.size,
    `${bezKluczy.size} → ${zZielonym.size} → ${zOboma.size}`);
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
  // Widełki wzięte z POMIARU pięciu oficjalnych map 72 × 72 na dwóch graczy
  // (Faeries, Gorlam's Tentacle Swampland, Hatchet Axe and Saw, Unexpected
  // Inheritance, When Dragons Clash — patrz `tools/profil-wzorca.py`): obiekt
  // co 4,1 / 4,8 / 5,3 / 10,6 / 12,5 pola przejezdnego. Pierwsza wersja tego
  // sprawdzenia wymagała 12–30 i była zgadywana, zanim którakolwiek z tych map
  // została zmierzona — nasza plansza wychodziła przez to „za gęsta”, będąc
  // rzadszą od trzech z pięciu wzorców.
  sprawdz('obiekt co 4–20 pól przejezdnych (jak na mapach M z Heroes 3)', naObiekt >= 4 && naObiekt <= 20, `co ${naObiekt.toFixed(1)}`);
}

console.log('\n=== straże czegoś pilnują ===');
// Zgłoszenie z rozgrywki brzmiało: „stwory są rozrzucone trochę losowo".
// Było trafne — każdy strażnik dostawał jeden obiekt na głowę, więc stada
// stały porozrzucane po planszy zamiast pilnować czegoś, po co warto przyjść.
// W Heroes 3 stado stoi w przejściu, przy wejściu do kopalni albo przed
// zakątkiem, w którym leży kilka rzeczy naraz.
{
  const NAGRODY = ['surowiec', 'skrzynia', 'artefakt', 'kopalnia', 'namiot', 'jasnowidz'];
  const straze = s.obiekty.filter((o) => o.rodzaj === 'potwor' && !o.zebrany);
  const pilnuje = (m: typeof straze[number]) =>
    s.obiekty.filter(
      (o) =>
        o !== m &&
        NAGRODY.includes(o.rodzaj) &&
        Math.max(Math.abs(o.x - m.x), Math.abs(o.y - m.y)) <= 3
    ).length;
  const zNagroda = straze.filter((m) => pilnuje(m) > 0);
  const zeSkarbcem = straze.filter((m) => pilnuje(m) >= 3);
  sprawdz(
    'każda straż ma przy sobie coś wartego pilnowania',
    zNagroda.length * 10 >= straze.length * 9,
    `${zNagroda.length} z ${straze.length}`
  );
  sprawdz(
    'część straży pilnuje całych zakątków, nie pojedynczej rzeczy',
    zeSkarbcem.length >= 6,
    `${zeSkarbcem.length} straży z trzema nagrodami w zasięgu`
  );
}

console.log('\n=== podstawowe kopalnie stoją otworem ===');
// W Heroes 3 tartak i kopalnia rudy przy strefie startowej są niepilnowane
// albo pilnowane symbolicznie: bez nich nie ma z czego zacząć, więc straż przy
// nich nie jest wyborem, tylko karą za pierwszy tydzień.
{
  const podstawowe = s.obiekty.filter(
    (o) => o.rodzaj === 'kopalnia' && (o.surowiec === 'jagoda' || o.surowiec === 'odlamek')
  );
  const pilnowane = podstawowe.filter((k) =>
    s.obiekty.some(
      (m) =>
        m.rodzaj === 'potwor' &&
        !m.zebrany &&
        Math.abs(m.x - k.x) <= 1 &&
        Math.abs(m.y - k.y) <= 1
    )
  );
  sprawdz(
    'żadna kopalnia jagód ani odłamków nie jest pilnowana',
    pilnowane.length === 0,
    `${pilnowane.length} z ${podstawowe.length} pilnowanych`
  );
}

console.log('\n=== chata jasnowidza ma z czego zapłacić ===');
// Zadanie „przynieś X" jest zadaniem tylko wtedy, gdy X naprawdę leży po tej
// stronie mapy, po której stoi chata. Inaczej to nie zagadka, tylko ślepy
// zaułek: gracz dowiaduje się, czego chce jasnowidz, i nie ma gdzie tego wziąć.
{
  const pasY = (y: number) => (y < 21 ? 0 : y <= 46 ? 1 : 2);
  for (const chata of s.obiekty.filter((o) => o.rodzaj === 'jasnowidz')) {
    const co = chata.zadanie!.surowiec;
    const trzeba = chata.zadanie!.ile;
    // „Bliżej" znaczy: w tym samym pasie albo po stronie gracza (pas o wyższym
    // numerze), bo do chaty idzie się właśnie stamtąd.
    const dostepne = s.obiekty.filter((o) => pasY(o.y) >= pasY(chata.y));
    const kopalnie = dostepne.filter((o) => o.rodzaj === 'kopalnia' && o.surowiec === co).length;
    const zeStosow = dostepne
      .filter((o) => o.rodzaj === 'surowiec' && o.surowiec === co)
      .reduce((a, o) => a + (o.ile ?? 0), 0);
    sprawdz(
      `chata (${chata.x},${chata.y}) prosi o ${trzeba} × ${co} i jest skąd to wziąć`,
      kopalnie > 0 || zeStosow >= trzeba,
      `${kopalnie} kopalń + ${zeStosow} ze stosów`
    );
  }
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

console.log('\n=== straże rosną w czasie ===');
// Zgłoszenie z rozgrywki: „po kilku tygodniach stada są grupką na jeden
// strzał". Tak było — stos ustalał się przy składaniu planszy i zostawał taki
// do końca gry, więc zwlekanie nic nie kosztowało.
{
  const s2 = planszaPrzygody();
  const stado = s2.obiekty.find((o) => o.rodzaj === 'potwor' && !o.zebrany)!;
  const suma = (o: typeof stado) => (o.oddzialy ?? []).reduce((a, od) => a + od.ile, 0);
  const przed = suma(stado);
  for (let i = 0; i < 7; i++) nowaTura(s2);
  const poTygodniu = suma(stado);
  sprawdz('po tygodniu stado jest liczniejsze', poTygodniu > przed, `${przed} → ${poTygodniu}`);
  // A teraz długa gra: przyrost ma mieć SUFIT, inaczej mapa zamyka się sama
  // i po dwóch miesiącach nie da się jej przejść niezależnie od tego, jak
  // dobrze się grało.
  for (let i = 0; i < 120; i++) nowaTura(s2);
  const poDwóchMiesiacach = suma(stado);
  sprawdz(
    'przyrost ma sufit (najwyżej dwuipółkrotność)',
    poDwóchMiesiacach <= Math.round(przed * 2.5) + 1,
    `${przed} → ${poDwóchMiesiacach}`
  );
  sprawdz('pokonane stado nie rośnie', (() => {
    const s3 = planszaPrzygody();
    const m = s3.obiekty.find((o) => o.rodzaj === 'potwor')!;
    m.zebrany = true;
    const ile = (m.oddzialy ?? []).reduce((a, od) => a + od.ile, 0);
    for (let i = 0; i < 14; i++) nowaTura(s3);
    return (m.oddzialy ?? []).reduce((a, od) => a + od.ile, 0) === ile;
  })());
}

console.log('\n=== mgła wojny ===');
const odkrytych = s.odkryte.flat().filter(Boolean).length;
sprawdz('na starcie odsłonięty jest tylko fragment', odkrytych > 20 && odkrytych < s.szer * s.wys * 0.15, `${odkrytych} z ${s.szer * s.wys} pól`);
sprawdz('każdy obiekt daleko od startu jest zakryty', !s.obiekty.every((o) => s.odkryte[o.y][o.x]));

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
