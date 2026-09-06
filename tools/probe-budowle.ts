// Budowle odwiedzane — czy każda naprawdę coś robi, i to raz.
//
// Po co osobna sonda: efekty budowli są jednorazowe albo odnawialne co kilka
// dni, więc błąd w nich wygląda w grze niewinnie („nic się nie stało") i nie
// wywala niczego. Bez sprawdzenia liczbami nie da się odróżnić budowli, która
// dała +1 do ataku, od budowli, która nie zrobiła nic — a to jest różnica
// między nagrodą za nadłożenie drogi a straconą turą.
//
//   npx tsx tools/probe-budowle.ts

import {
  BUDOWLE,
  brylaObiektu,
  doUlepszenia,
  kosztPola,
  nowaTura,
  odpowiedzNaPytanie,
  odwiedz,
  polaBryly,
  ruchNaDzis,
  statystyki,
  type Obiekt,
  type StanMapy,
} from '../src/data/mapa';
import { planszaPrzygody } from '../src/data/plansza';
import {
  ARENA_BONUS,
  EWOLUCJA_KOSZT,
  OBSERWATORIUM_PROMIEN,
  STAJNIA_BONUS,
  STAJNIA_DNI,
} from '../src/data/zasady-h3';

let bledy = 0;
const sprawdz = (co: string, ok: boolean, szczegol = '') => {
  if (!ok) bledy++;
  console.log(`  ${ok ? 'OK  ' : 'ŹLE '} ${co}${szczegol ? ` — ${szczegol}` : ''}`);
};

/** Świeża plansza dla każdej próby — efekty są trwałe, więc muszą być osobne. */
const swiat = () => planszaPrzygody();

const budowla = (s: StanMapy, id: string): Obiekt => {
  const o = s.obiekty.find((x) => x.budynek === id);
  if (!o) throw new Error(`Na planszy nie ma budowli ${id}`);
  return o;
};

console.log('=== każda budowla z tablicy stoi na planszy ===');
{
  const s = swiat();
  for (const id of Object.keys(BUDOWLE)) {
    const ile = s.obiekty.filter((o) => o.budynek === id).length;
    sprawdz(`${id} rozstawiona`, ile > 0, `${ile} szt.`);
  }
}

console.log('\n=== statystyki: obóz treningowy i kamienna wieża ===');
{
  const s = swiat();
  const przed = statystyki(s.bohater);
  const o = budowla(s, 'oboz-treningowy');
  const w1 = odwiedz(s, o);
  sprawdz('obóz podnosi atak', statystyki(s.bohater).atak === przed.atak + 1, w1.opis);
  const w2 = odwiedz(s, o);
  sprawdz(
    'drugie wejście nie daje nic',
    statystyki(s.bohater).atak === przed.atak + 1 && w2.opis.includes('już'),
    w2.opis.replace('\n', ' / ')
  );

  const o2 = budowla(s, 'kamienna-wieza');
  const obronaPrzed = statystyki(s.bohater).obrona;
  odwiedz(s, o2);
  sprawdz('wieża podnosi obronę', statystyki(s.bohater).obrona === obronaPrzed + 1);
}

console.log('\n=== arena: wybór, nie nagroda ===');
{
  const s = swiat();
  const o = budowla(s, 'arena');
  const w = odwiedz(s, o);
  sprawdz('arena pyta, zamiast dawać', w.pytanie !== undefined && w.opis === '');
  const przed = statystyki(s.bohater);
  const opis = odpowiedzNaPytanie(s, w.pytanie!, 'obrona');
  sprawdz(
    `wybrana obrona rośnie o ${ARENA_BONUS}`,
    statystyki(s.bohater).obrona === przed.obrona + ARENA_BONUS,
    opis
  );
  sprawdz('atak zostaje bez zmian', statystyki(s.bohater).atak === przed.atak);
  sprawdz('drugie wejście odprawia z niczym', odwiedz(s, o).opis.includes('już'));
}

console.log('\n=== drzewo wiedzy: pełny awans ===');
{
  const s = swiat();
  const o = budowla(s, 'drzewo-wiedzy');
  const przed = statystyki(s.bohater).atak + statystyki(s.bohater).obrona;
  odwiedz(s, o);
  sprawdz(
    'doświadczenie wystarcza na awans',
    statystyki(s.bohater).atak + statystyki(s.bohater).obrona > przed,
    `${s.bohater.doswiadczenie} dośw.`
  );
}

console.log('\n=== wieża obserwacyjna: mgła znika WOKÓŁ WIEŻY ===');
{
  const s = swiat();
  const o = budowla(s, 'wieza-obserwacyjna');
  const przed = s.odkryte.flat().filter(Boolean).length;
  const w = odwiedz(s, o);
  const po = s.odkryte.flat().filter(Boolean).length;
  sprawdz('odsłoniła nowe pola', po > przed, `${przed} → ${po}`);
  sprawdz('scena dostaje sygnał do przemalowania mgły', w.odkryto === true);
  sprawdz(
    'odsłonięte jest pole daleko od bohatera, przy wieży',
    s.odkryte[Math.max(0, o.y - OBSERWATORIUM_PROMIEN + 1)][o.x] === true
  );
}

console.log('\n=== ranczo i źródło: punkty ruchu ===');
{
  const s = swiat();
  const o = budowla(s, 'ranczo');
  const przed = s.bohater.ruch;
  odwiedz(s, o);
  sprawdz('ranczo dokłada ruch od razu', s.bohater.ruch === przed + STAJNIA_BONUS);
  const naDzis = ruchNaDzis(s);
  sprawdz(
    'bonus trzyma się przez kolejne dni',
    naDzis === statystyki(s.bohater).ruchMax + STAJNIA_BONUS
  );
  for (let i = 0; i < STAJNIA_DNI; i++) nowaTura(s);
  sprawdz(
    `po ${STAJNIA_DNI} dniach bonus wygasa`,
    ruchNaDzis(s) === statystyki(s.bohater).ruchMax,
    `dzień ${s.dzien}`
  );
  sprawdz('przed upływem tygodnia ranczo odprawia z kwitkiem', odwiedz(s, o).opis.includes('Wróć'));
  while (s.dzien < 8) nowaTura(s);
  const ruchPrzed = s.bohater.ruch;
  odwiedz(s, o);
  sprawdz('po tygodniu ranczo znów daje ruch', s.bohater.ruch === ruchPrzed + STAJNIA_BONUS);

  const z = budowla(s, 'zrodlo');
  s.bohater.ruch = 12;
  odwiedz(s, z);
  sprawdz('źródło odnawia pełen zapas', s.bohater.ruch === ruchNaDzis(s));
  s.bohater.ruch = 12;
  odwiedz(s, z);
  sprawdz('drugi raz tego samego dnia — nie', s.bohater.ruch === 12);
  nowaTura(s);
  s.bohater.ruch = 12;
  odwiedz(s, z);
  sprawdz('nazajutrz znowu działa', s.bohater.ruch === ruchNaDzis(s));
}

console.log('\n=== portal: para i przeniesienie ===');
{
  const s = swiat();
  const portale = s.obiekty.filter((o) => o.budynek === 'portal');
  sprawdz('portale chodzą parami', portale.length >= 2 && portale.every((p) => p.para !== undefined));
  const w = odwiedz(s, portale[0]);
  const drugi = s.obiekty.find((o) => o.id === portale[0].para)!;
  sprawdz(
    'przenosi na pole bliźniaka',
    w.przenies?.x === drugi.x && w.przenies?.y === drugi.y,
    `${w.przenies?.x},${w.przenies?.y}`
  );
  sprawdz('portal działa wielokrotnie', odwiedz(s, portale[0]).przenies !== undefined);
  // Portal przez grzbiet obchodziłby strażników przełęczy i unieważniał układ
  // mapy — obie połówki pary muszą leżeć po tej samej stronie pasma.
  sprawdz(
    'oba końce po tej samej stronie grzbietu',
    portale.every((p) => p.y < 19) || portale.every((p) => p.y > 22),
    portale.map((p) => `${p.x},${p.y}`).join(' ↔ ')
  );
}

console.log('\n=== gniazdo: zajmuje się, a nie zbiera ===');
{
  const s = swiat();
  const o = budowla(s, 'gniazdo');
  const zamek = s.obiekty.find((z) => z.rodzaj === 'zamek' && z.nasz)!;
  const w = odwiedz(s, o);
  sprawdz('gniazdo zostaje na mapie', !o.zebrany && o.nasz === true && w.zajete === o);
  const przed = [...zamek.dostepne!];
  nowaTura(s);
  const po = zamek.dostepne!;
  sprawdz(
    'nazajutrz w zamku czeka więcej oddziałów niż z samego miasta',
    po.some((ile, i) => ile > przed[i]),
    `${przed.join('/')} → ${po.join('/')}`
  );
}

console.log('\n=== ośrodek ewolucji: kamienie zamieniają się w awans ===');
{
  const s = swiat();
  const o = budowla(s, 'osrodek-ewolucji');
  s.skarbiec.kamien = EWOLUCJA_KOSZT;
  const u = doUlepszenia(s.bohater)!;
  const w = odwiedz(s, o);
  sprawdz('pyta o zgodę', w.pytanie !== undefined);
  const opis = odpowiedzNaPytanie(s, w.pytanie!, 'tak');
  const oddzial = s.bohater.armia[u.indeks];
  sprawdz('oddział awansował o poziom', oddzial.tier === u.oddzial.tier + 1, opis.replace('\n', ' / '));
  sprawdz('liczebność spadła, ale oddział został', oddzial.ile >= 1 && oddzial.ile <= u.oddzial.ile);
  sprawdz('kamienie zapłacone', s.skarbiec.kamien === 0);
  const w2 = odwiedz(s, o);
  sprawdz('bez kamieni ośrodek mówi, czego trzeba', w2.pytanie === undefined && w2.opis.includes('kamieni'));
}

console.log('\n=== drobiazgi jednorazowe ===');
{
  const s = swiat();
  for (const id of ['ognisko', 'chatka', 'woz']) {
    const o = budowla(s, id);
    const przed = { ...s.skarbiec };
    const arte = s.bohater.artefakty.length;
    const w = odwiedz(s, o);
    const cos =
      s.bohater.artefakty.length > arte ||
      Object.entries(s.skarbiec).some(([k, v]) => v > przed[k as keyof typeof przed]);
    sprawdz(`${id} daje nagrodę`, cos, w.opis.replace('\n', ' / '));
    sprawdz(`${id} znika z mapy`, o.zebrany === true);
  }

  const w = budowla(s, 'wiatrak');
  const przed = { ...s.skarbiec };
  odwiedz(s, w);
  sprawdz('wiatrak sypie surowcem', s.skarbiec[w.surowiec!] === przed[w.surowiec!] + (w.ile ?? 0));
  sprawdz('wiatrak zostaje na mapie', !w.zebrany);
  const po = { ...s.skarbiec };
  odwiedz(s, w);
  sprawdz('drugi raz tego samego dnia — nic', s.skarbiec[w.surowiec!] === po[w.surowiec!]);
}

console.log('\n=== bryły i dostępność ===');
{
  const s = swiat();
  for (const o of s.obiekty.filter((x) => x.rodzaj === 'budynek')) {
    sprawdz(
      `${o.budynek} stoi na polu, na które da się wejść`,
      kosztPola(s, o.x, o.y) !== null,
      `${o.x},${o.y}`
    );
  }
  const zBryla = s.obiekty.filter((o) => o.rodzaj === 'budynek' && brylaObiektu(o));
  sprawdz('budowle wielopolowe mają nieprzejezdne mury', zBryla.every((o) => polaBryly(s, o).length > 0), `${zBryla.length} szt.`);
}

console.log(`\n${bledy === 0 ? 'Wszystko się zgadza.' : `Błędów: ${bledy}`}`);
process.exit(bledy === 0 ? 0 : 1);
