// Sprawdzenie WSZYSTKICH plansz z rejestru `MAPY` — bez przeglądarki.
//
// `probe-mapa.ts` zna „Dwie Doliny" na wylot (grzbiety w wierszach 21 i 45,
// trzy akty kluczy, gospodarka doliny). Ta sonda pyta każdą planszę o to, co
// musi być prawdą na KAŻDEJ mapie, niezależnie od jej układu:
//
//   * tło jest z tego rysunku (odcisk) i leży tam, gdzie wskazuje rejestr;
//   * obiekty stoją na przejezdnym terenie i każdy da się podejść;
//   * cele misji są osiągalne — z kluczami zbieranymi po kolei, tak jak
//     zbiera je gracz, a nie „wszystkie naraz";
//   * nie ma zamkniętych na głucho kawałków łąki, do których nie da się wejść;
//   * straże czegoś pilnują, a zamek wroga nie leży o jeden dzień od startu;
//   * artefakt-cel misji leży na mapie dokładnie raz i nie wypada z żadnego
//     losowania (skrzynia, wóz, chata jasnowidza).
//
//   npx tsx tools/probe-mapy.ts

import {
  ARTEFAKTY,
  TEREN_INFO,
  artefaktPoId,
  kosztPola,
  obiektNa,
  polaZajete,
  trasa,
  wGranicach,
  zamknietaBrama,
  type Obiekt,
  type StanMapy,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import { MAPY } from '../src/data/mapy';
import { KAMPANIA } from '../src/data/kampania';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const ZNAK: Record<string, string> = {
  trawa: '.',
  sciezka: '=',
  piasek: ',',
  jalowa: 'j',
  snieg: 's',
  bagno: 'b',
  las: 'T',
  skaly: '#',
  woda: '~',
};

const obok = (w: Set<string>, o: { x: number; y: number }) =>
  [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => (dx || dy) && w.has(`${o.x + dx},${o.y + dy}`)));

/**
 * Pola osiągalne ze startu ZASADAMI GRY: mury budowli (`polaZajete`) i zamknięte
 * bramy blokują, potwory nie (pokonuje się je i idzie dalej), a otwarte są
 * tylko bramy w barwach z `klucze`.
 */
function osiagalne(s: StanMapy, klucze: string[]): Set<string> {
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
        if (widziane.has(k) || !mozna(nx, ny)) continue;
        widziane.add(k);
        // Na obiekt nie wchodzi się w przelocie — z wyjątkiem potwora
        // (bitwa i dalej) i wejść zamku/kopalni/budowli, na których się staje.
        const o = obiektNa(kopia, nx, ny);
        if (o && ['surowiec', 'artefakt', 'skrzynia'].includes(o.rodzaj)) continue;
        kolejka.push([nx, ny]);
      }
  }
  return widziane;
}

/**
 * Klucze zbierane PO KOLEI: z tym, co otwarte, zbieramy namioty w zasięgu,
 * otwieramy ich bramy i powtarzamy. Namiot za własną bramą nigdy nie
 * wpadnie — i to jest dokładnie ta pomyłka, która zamyka mapę na głucho.
 */
function kluczePoKolei(s: StanMapy): { klucze: string[]; widziane: Set<string>; etapy: number[] } {
  let klucze: string[] = [];
  const etapy: number[] = [];
  for (;;) {
    const widziane = osiagalne(s, klucze);
    etapy.push(widziane.size);
    const nowe = s.obiekty
      .filter((o) => o.rodzaj === 'namiot' && obok(widziane, o) && !klucze.includes(o.klucz ?? ''))
      .map((o) => o.klucz ?? '');
    if (nowe.length === 0) return { klucze, widziane, etapy };
    klucze = [...new Set([...klucze, ...nowe])];
  }
}

/**
 * Plansze sprzed tej sondy, na których zamknięte kieszenie terenu zostają
 * świadomie. „Dwie Doliny" mają ich 325 pól — śnieżne i trawiaste niecki
 * wewnątrz masywów górskich — a mapa jest zamrożona: odcisk tła, ślepe
 * porównania i strojenie AI robiono na tym właśnie rysunku. Nowe plansze
 * zasypuje generator (`ZASYP_ODCIETE` w `tools/mapy/<id>.py`).
 */
const ZASTANE_ODCIECIA: Record<string, string> = {
  'dwie-doliny': 'niecki w masywach górskich, plansza zamrożona (odcisk, ślepe porównania, strojenie AI)',
};

const misjeNaPlanszy = (id: string) => KAMPANIA.misje.filter((m) => m.mapa === id);

for (const [id, plansza] of Object.entries(MAPY)) {
  console.log(`\n##### ${plansza.nazwa} (${id}) #####`);
  const s: StanMapy = planszaPrzygody(id);

  console.log('=== kształt i tło ===');
  sprawdz(
    'wszystkie wiersze równej długości',
    s.teren.every((w) => w.length === s.szer),
    `${s.szer} × ${s.wys}`
  );
  {
    const rysunek = s.teren.map((w) => w.map((t) => ZNAK[t]).join('')).join('\n');
    const teraz = createHash('sha256').update(rysunek, 'utf8').digest('hex').slice(0, 16);
    let zapisany = '(brak pliku)';
    try {
      zapisany = JSON.parse(readFileSync(`public/${plansza.tlo}plansza.json`, 'utf8')).odcisk;
    } catch {
      /* zostaje „brak pliku" */
    }
    sprawdz(
      'odcisk planszy zgadza się z wygenerowanym tłem',
      teraz === zapisany,
      teraz === zapisany ? teraz : `kod ${teraz} ≠ tło ${zapisany} — uruchom: python3 tools/render_mapa.py ${id}`
    );
    for (const plik of ['plansza-0.jpg', 'woda-maska.png']) {
      sprawdz(`tło ma ${plik}`, existsSync(`public/${plansza.tlo}${plik}`), `public/${plansza.tlo}${plik}`);
    }
  }

  console.log('=== obiekty ===');
  const zleStojace = s.obiekty.filter(
    (o) => !(wGranicach(s, o.x, o.y) && TEREN_INFO[s.teren[o.y][o.x]].koszt !== null)
  );
  sprawdz(
    `wszystkie ${s.obiekty.length} obiektów stoi na terenie przejezdnym`,
    zleStojace.length === 0,
    zleStojace.slice(0, 5).map((o) => `${o.nazwa} (${o.x},${o.y})`).join(', ')
  );
  sprawdz(
    'żadne dwa obiekty nie stoją na tym samym polu',
    new Set(s.obiekty.map((o) => `${o.x},${o.y}`)).size === s.obiekty.length
  );
  sprawdz(
    'bohater nie startuje na obiekcie ani w skałach',
    !obiektNa(s, s.bohater.x, s.bohater.y) && kosztPola(s, s.bohater.x, s.bohater.y) !== null
  );

  console.log('=== dojścia, klucze i cele ===');
  const { klucze, widziane, etapy } = kluczePoKolei(s);
  const bramy = [...new Set(s.obiekty.filter((o) => o.rodzaj === 'straznica').map((o) => o.klucz))];
  sprawdz(
    'każda barwa bramy ma swój namiot i da się go zdobyć po kolei',
    bramy.every((k) => klucze.includes(k ?? '')),
    bramy.length ? `bramy: ${bramy.join(', ')}; etapy: ${etapy.join(' → ')} pól` : 'plansza bez bram'
  );
  const bezDojscia = s.obiekty.filter((o) => !obok(widziane, o));
  sprawdz(
    `do wszystkich ${s.obiekty.length} obiektów da się podejść`,
    bezDojscia.length === 0,
    bezDojscia.slice(0, 5).map((o) => `${o.nazwa} (${o.x},${o.y})`).join(', ')
  );
  const zamkiWroga = s.obiekty.filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog');
  sprawdz(
    'plansza ma zamek przeciwnika',
    zamkiWroga.length > 0,
    zamkiWroga.map((z) => `${z.nazwa} (${z.x},${z.y})`).join(', ')
  );

  // Kawałki łąki zamknięte na głucho. Pole przejezdne, na które nie da się
  // wejść nawet bez obiektów, wygląda jak zwykły teren — i dziecko będzie
  // klikać w nie w nieskończoność. Liczymy po samym terenie.
  {
    const teren = (x: number, y: number) => wGranicach(s, x, y) && TEREN_INFO[s.teren[y][x]].koszt !== null;
    const w = new Set([`${s.bohater.x},${s.bohater.y}`]);
    const kol = [[s.bohater.x, s.bohater.y]];
    while (kol.length) {
      const [x, y] = kol.pop()!;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const k = `${x + dx},${y + dy}`;
          if (!w.has(k) && teren(x + dx, y + dy)) {
            w.add(k);
            kol.push([x + dx, y + dy]);
          }
        }
    }
    let odciete = 0;
    for (let y = 0; y < s.wys; y++) for (let x = 0; x < s.szer; x++) if (teren(x, y) && !w.has(`${x},${y}`)) odciete++;
    if (id in ZASTANE_ODCIECIA && odciete > 0) {
      console.log(`  UWAGA ${odciete} pól zamkniętych na głucho — ${ZASTANE_ODCIECIA[id]}`);
    } else {
      sprawdz('nie ma zamkniętych na głucho kawałków przejezdnego terenu', odciete === 0, `${odciete} pól`);
    }
  }

  for (const m of misjeNaPlanszy(id)) {
    const z = m.zwyciestwo;
    if (z.typ === 'zamki') {
      sprawdz(
        `misja „${m.tytul}": do każdego zamku wroga da się dojść`,
        zamkiWroga.every((o) => obok(widziane, o))
      );
    } else if (z.typ === 'artefakt') {
      const cele = s.obiekty.filter((o) => o.rodzaj === 'artefakt' && o.artefakt === z.artefakt);
      sprawdz(`misja „${m.tytul}": artefakt ${z.artefakt} leży na mapie dokładnie raz`, cele.length === 1);
      sprawdz(
        `misja „${m.tytul}": do artefaktu da się dojść`,
        cele.every((o) => obok(widziane, o)),
        cele.map((o) => `(${o.x},${o.y})`).join(', ')
      );
      // Cel misji ma być pod strażą — „wódz ukrył Kamień", nie „Kamień leży".
      const straz = cele.flatMap((o) =>
        s.obiekty.filter((q) => q.rodzaj === 'potwor' && Math.max(Math.abs(q.x - o.x), Math.abs(q.y - o.y)) <= 2)
      );
      sprawdz(`misja „${m.tytul}": artefaktu pilnuje straż`, straz.length > 0, straz.map((q) => q.nazwa).join(', '));
    }
    const termin = m.porazka.find((w) => w.typ === 'termin');
    if (termin && termin.typ === 'termin') {
      // Najkrótsza trasa do celu w dniach, przy ruchu startowym — dolna granica,
      // bo bohater po drodze walczy i zbiera. Ma się zmieścić w jednej trzeciej
      // terminu, inaczej na grę po drodze nie zostaje czasu.
      const cel =
        z.typ === 'artefakt'
          ? s.obiekty.find((o) => o.rodzaj === 'artefakt' && o.artefakt === z.artefakt)
          : zamkiWroga[0];
      if (cel) {
        const bez = { ...s, bryly: undefined, obiekty: s.obiekty.filter((o) => o.rodzaj !== 'potwor' || o === cel) };
        const t = trasa(bez, cel.x, cel.y);
        const koszt = t ? t.reduce((a, k) => a + k.koszt, 0) : Infinity;
        const dni = Math.ceil(koszt / s.bohater.ruchMax);
        sprawdz(
          `misja „${m.tytul}": sam marsz do celu zajmuje najwyżej 1/3 terminu`,
          dni * 3 <= termin.dni,
          `${dni} dni marszu przy terminie ${termin.dni}`
        );
      }
    }
  }

  console.log('=== cel misji nie wypada z losowania ===');
  {
    const misyjne = new Set(ARTEFAKTY.filter((a) => a.klasa === 'misja').map((a) => a.id));
    const zLosowania = s.obiekty.filter(
      (o) =>
        (o.rodzaj !== 'artefakt' && o.artefakt && misyjne.has(o.artefakt)) ||
        (o.nagroda?.artefakt && misyjne.has(o.nagroda.artefakt))
    );
    const luzem = s.obiekty.filter(
      (o) =>
        o.rodzaj === 'artefakt' &&
        artefaktPoId(o.artefakt ?? '')?.klasa === 'misja' &&
        !misjeNaPlanszy(id).some((m) => m.zwyciestwo.typ === 'artefakt' && m.zwyciestwo.artefakt === o.artefakt)
    );
    sprawdz(
      'żadna skrzynia, wóz ani chata nie daje artefaktu-celu misji',
      zLosowania.length === 0,
      zLosowania.map((o) => o.nazwa).join(', ')
    );
    sprawdz('artefakt-cel leży tylko na planszy swojej misji', luzem.length === 0);
  }

  console.log('=== pierwszy dzień ===');
  const wZasiegu = s.obiekty.filter((o) => {
    const t = trasa(s, o.x, o.y);
    return t !== null && t.reduce((a, k) => a + k.koszt, 0) <= s.bohater.ruchMax;
  });
  sprawdz('w pierwszym dniu jest co robić', wZasiegu.length >= 3, `${wZasiegu.length} obiektów`);
  sprawdz(
    'żaden zamek przeciwnika NIE jest osiągalny pierwszego dnia',
    zamkiWroga.every((z) => !wZasiegu.includes(z))
  );

  console.log('=== straże czegoś pilnują ===');
  {
    const NAGRODY = ['surowiec', 'skrzynia', 'artefakt', 'kopalnia', 'namiot', 'jasnowidz', 'budynek', 'zamek'];
    const straze = s.obiekty.filter((o) => o.rodzaj === 'potwor');
    const pilnuje = (m: Obiekt) =>
      s.obiekty.some(
        (o) => o !== m && NAGRODY.includes(o.rodzaj) && Math.max(Math.abs(o.x - m.x), Math.abs(o.y - m.y)) <= 3
      );
    // …albo przejścia: strażnik brodu czy grobli pilnuje DROGI, nie skrzyni.
    const wPrzejsciu = (m: Obiekt) => {
      const wolne = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [m.x + dx, m.y + dy]))
        .filter(([x, y]) => wGranicach(s, x, y) && TEREN_INFO[s.teren[y][x]].koszt !== null).length;
      return wolne <= 6;
    };
    const bezCelu = straze.filter((m) => !pilnuje(m) && !wPrzejsciu(m));
    sprawdz(
      'każda straż pilnuje nagrody albo przejścia',
      bezCelu.length * 10 <= straze.length,
      `${straze.length - bezCelu.length} z ${straze.length}` +
        (bezCelu.length ? `; bez celu: ${bezCelu.slice(0, 4).map((m) => `(${m.x},${m.y})`).join(' ')}` : '')
    );
    const podstawowe = s.obiekty.filter(
      (o) => o.rodzaj === 'kopalnia' && (o.surowiec === 'jagoda' || o.surowiec === 'odlamek')
    );
    const pilnowane = podstawowe.filter((k) =>
      straze.some((m) => Math.abs(m.x - k.x) <= 1 && Math.abs(m.y - k.y) <= 1)
    );
    sprawdz('żadna kopalnia jagód ani odłamków nie jest pilnowana', pilnowane.length === 0, `${pilnowane.length} z ${podstawowe.length}`);
    const blisko = s.obiekty.filter(
      (o) => o.rodzaj === 'potwor' && Math.max(Math.abs(o.x - s.bohater.x), Math.abs(o.y - s.bohater.y)) <= 2
    );
    sprawdz('żadna straż nie stoi na progu startu', blisko.length === 0);
  }

  console.log('=== portale ===');
  {
    const portale = s.obiekty.filter((o) => o.rodzaj === 'budynek' && o.budynek === 'portal');
    sprawdz('portale stoją parami', portale.length % 2 === 0, `${portale.length} sztuk`);
    const minOdl = Math.min(20, Math.floor(s.szer / 3));
    for (let i = 0; i + 1 < portale.length; i += 2) {
      const [a, b] = [portale[i], portale[i + 1]];
      const odl = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      sprawdz(`para portali (${a.x},${a.y}) ↔ (${b.x},${b.y}) przenosi o ≥ ${minOdl} pól`, odl >= minOdl, `${odl}`);
    }
  }

  console.log('=== gęstość i mgła ===');
  {
    let przejezdnych = 0;
    for (let y = 0; y < s.wys; y++)
      for (let x = 0; x < s.szer; x++) if (TEREN_INFO[s.teren[y][x]].koszt !== null) przejezdnych++;
    const naObiekt = przejezdnych / s.obiekty.length;
    // Widełki z pomiaru oficjalnych map Heroes 3 (patrz `probe-mapa.ts`).
    sprawdz('obiekt co 4–20 pól przejezdnych', naObiekt >= 4 && naObiekt <= 20, `co ${naObiekt.toFixed(1)}`);
    const odkrytych = s.odkryte.flat().filter(Boolean).length;
    sprawdz(
      'na starcie odsłonięty jest tylko fragment',
      odkrytych > 20 && odkrytych < s.szer * s.wys * 0.2,
      `${odkrytych} z ${s.szer * s.wys}`
    );
  }
}

// Każda misja kampanii ma swoją planszę w rejestrze.
console.log('\n##### kampania #####');
for (const m of KAMPANIA.misje) {
  sprawdz(`misja ${m.nr} („${m.tytul}") ma planszę ${m.mapa}`, m.mapa in MAPY);
}

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
