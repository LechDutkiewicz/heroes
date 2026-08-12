// Czy drzewko budynków w ogóle da się przejść — i czy warto.
//
// Po co: drzewko rozwoju łatwo napisać tak, że wygląda sensownie i jest
// nieprzechodnie — budynek wymagający czegoś, czego nie da się postawić,
// albo cena, na którą nigdy nie starczy dochodu. Jedno i drugie objawia się
// dopiero po godzinie gry, kiedy dziecko utknie.
//
//   npx tsx tools/probe-zamki.ts

import {
  ZAMKI,
  dochodZamku,
  moznaBudowac,
  przyrostZamku,
  stacNas,
  zaplac,
  type Budynek,
} from '../src/data/zamki';
import type { Skarbiec } from '../src/data/mapa';

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

const suma = (k: Partial<Skarbiec>) => Object.values(k).reduce((a, b) => a + b, 0);

for (const [id, profil] of Object.entries(ZAMKI)) {
  console.log(`\n=== ${profil.nazwa} (${id}) ===`);

  // --- warunki dają się spełnić ---
  const postawione: string[] = [];
  let obrot = 0;
  while (obrot++ < 40) {
    const nastepny = profil.budynki.find((b) => moznaBudowac(b, postawione));
    if (!nastepny) break;
    postawione.push(nastepny.id);
  }
  sprawdz(
    'każdy budynek da się w końcu postawić',
    postawione.length === profil.budynki.length,
    `${postawione.length} z ${profil.budynki.length}` +
      (postawione.length < profil.budynki.length
        ? `; nieosiągalne: ${profil.budynki
            .filter((b) => !postawione.includes(b.id))
            .map((b) => b.id)
            .join(', ')}`
        : '')
  );

  // --- ceny rosną wraz z poziomem siedliska ---
  const siedliska = profil.budynki.filter((b) => b.rodzaj === 'siedlisko');
  const rosnaco = siedliska.every(
    (b, i) => i === 0 || suma(b.koszt) > suma(siedliska[i - 1].koszt)
  );
  sprawdz(
    'siedlisko wyższego poziomu kosztuje więcej',
    rosnaco,
    siedliska.map((b) => suma(b.koszt)).join(' < ')
  );

  // --- fort naprawdę zmienia przyrost ---
  const bazowy = [3, 2, 2, 1, 1, 1];
  const wszystkie = profil.budynki.map((b) => b.id);
  const bezFortu = przyrostZamku(
    wszystkie.filter((x) => x !== 'fort'),
    bazowy
  );
  const zFortem = przyrostZamku(wszystkie, bazowy);
  sprawdz(
    'fort podnosi przyrost we wszystkich siedliskach',
    zFortem.every((x, i) => x > bezFortu[i]),
    `${bezFortu.join(',')} → ${zFortem.join(',')}`
  );

  // --- niepostawione siedlisko nie daje nic ---
  sprawdz(
    'siedlisko, którego nie ma, nie daje oddziałów',
    przyrostZamku(['ratusz1'], bazowy).every((x) => x === 0)
  );

  // --- dochód rośnie z ratuszem ---
  const d1 = dochodZamku(['ratusz1'], id);
  const d3 = dochodZamku(['ratusz1', 'ratusz2', 'ratusz3'], id);
  sprawdz('lepszy ratusz daje większy dochód', d3 > d1, `${d1} → ${d3}`);

  // --- da się to rozbudować w rozsądnym czasie ---
  //
  // Symulacja: startujemy z tym, co ma gracz na początku planszy, dostajemy
  // dochód z ratusza plus skromny wpływ z mapy i budujemy, co się da.
  // Interesuje nas nie dokładna liczba dni, tylko to, czy w ogóle się kończy.
  const skarbiec: Skarbiec = { pokeball: 15, jagoda: 6, kamien: 1, odlamek: 2 };
  const stoi: string[] = [];
  let dzien = 0;
  while (dzien++ < 200 && stoi.length < profil.budynki.length) {
    skarbiec.pokeball += dochodZamku(stoi, id) + 4;
    skarbiec.jagoda += 3;
    skarbiec.odlamek += 2;
    if (dzien % 4 === 0) skarbiec.kamien += 1;
    let zbudowano = true;
    while (zbudowano) {
      zbudowano = false;
      const kandydat: Budynek | undefined = profil.budynki.find(
        (b) => moznaBudowac(b, stoi) && stacNas(skarbiec, b.koszt)
      );
      if (kandydat) {
        zaplac(skarbiec, kandydat.koszt);
        stoi.push(kandydat.id);
        zbudowano = true;
      }
    }
  }
  sprawdz(
    'całe miasto da się rozbudować',
    stoi.length === profil.budynki.length,
    `${stoi.length} budynków w ${dzien} dni`
  );
  sprawdz(
    'rozbudowa zajmuje 20–120 dni (jest co robić, ale nie w nieskończoność)',
    dzien >= 20 && dzien <= 120,
    `${dzien} dni`
  );
}

// --- frakcje różnią się rozkładem cen, nie sumą ---
console.log('\n=== porównanie frakcji ===');
const sumy = Object.entries(ZAMKI).map(([id, p]) => ({
  id,
  razem: p.budynki.reduce((a, b) => a + suma(b.koszt), 0),
  poczatek: p.budynki
    .filter((b) => ['siedlisko1', 'siedlisko2', 'siedlisko3'].includes(b.id))
    .reduce((a, b) => a + suma(b.koszt), 0),
}));
for (const s of sumy) console.log(`  ${s.id}: razem ${s.razem}, start ${s.poczatek}`);
const min = Math.min(...sumy.map((s) => s.razem));
const max = Math.max(...sumy.map((s) => s.razem));
sprawdz(
  'żadna frakcja nie jest po prostu tańsza (różnica sum poniżej 15%)',
  (max - min) / min < 0.15,
  `${min} … ${max}`
);
sprawdz(
  'ale początki różnią się wyraźnie (ponad 25%)',
  (Math.max(...sumy.map((s) => s.poczatek)) - Math.min(...sumy.map((s) => s.poczatek))) /
    Math.min(...sumy.map((s) => s.poczatek)) >
    0.25,
  sumy.map((s) => `${s.id} ${s.poczatek}`).join(', ')
);

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
