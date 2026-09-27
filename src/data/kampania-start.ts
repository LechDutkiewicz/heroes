import { planszaPrzygody } from './plansza';
import { dolacz } from './armia';
import { doswDoPoziomu, ewoluujOdPoziomu, nowyStworek } from './stworki';
import { FACTIONS, factionById } from './factions';
import { odznakaSali, type Oddzial, type StanMapy } from './mapa';
import { SLOTY_ARMII, znormalizuj } from './armia';
import {
  type BohaterPrzenoszony,
  type Misja,
  type PostepKampanii,
  misjaPoId,
  punkty,
} from './kampania';

/**
 * Start misji kampanii: świeża plansza, bohater z poprzedniej misji i wybrany
 * bonus. Jedyne miejsce, które składa te trzy rzeczy — woła je ekran kampanii
 * (pierwsze wejście) i ekran porażki („spróbuj jeszcze raz").
 */
export function rozpocznijMisje(p: PostepKampanii, m: Misja, bonus: number): StanMapy {
  const s = planszaPrzygody(m.mapa);
  s.misja = m.id;
  s.bohater.imie = p.trener;

  // Bohater z poprzedniej misji: wszystko, co zdobył, oprócz miejsca.
  if (p.bohater) Object.assign(s.bohater, structuredClone(p.bohater), { imie: p.trener });
  // Drużyna z poprzedniej misji zastępuje startową planszy — ci sami
  // stworki, wyspani (nowa misja to nowy dzień w Centrum Pokemon).
  if (p.druzyna?.length) s.bohater.armia = znormalizuj(structuredClone(p.druzyna).slice(0, SLOTY_ARMII));

  const b = m.bonusy[bonus] ?? m.bonusy[0];
  if (b.typ === 'surowiec') s.skarbiec[b.surowiec] += b.ile;
  else if (b.typ === 'artefakt') {
    if (!s.bohater.artefakty.includes(b.artefakt)) s.bohater.artefakty.push(b.artefakt);
  } else if (b.typ === 'statystyka') {
    s.bohater.atak += b.atak ?? 0;
    s.bohater.obrona += b.obrona ?? 0;
  } else if (b.typ === 'oddzial') {
    // Oddział z frakcji, którą bohater już prowadzi — mieszanie frakcji
    // w nagrodzie wyglądałoby na pomyłkę.
    const frakcja = s.bohater.armia.find((o) => o)?.frakcja ?? 'bor';
    const f = factionById(frakcja) ?? FACTIONS[0];
    const nowy = nowyStworek(f.id, b.tier, b.poziom);
    if (nowy) dolacz(s.bohater.armia, nowy);
  }

  // Strojenie misji pod drużynę, która przychodzi z poprzedniej (etap 6).
  if (m.poziomDruzyny) for (const o of s.bohater.armia) if (o) podciagnij(o, m.poziomDruzyny);
  if (m.wrogPoziomy) {
    const wrog = [
      ...s.wrogBohater.armia,
      ...s.obiekty.filter((o) => o.rodzaj === 'zamek' && o.wlasciciel === 'wrog').flatMap((o) => [
        ...(o.oddzialy ?? []),
        ...(o.garnizon ?? []),
      ]),
    ];
    for (const o of wrog) if (o) podciagnij(o, o.poziom + m.wrogPoziomy);
  }
  return s;
}

/** Stworek co najmniej na poziomie `poziom` — z doświadczeniem i ewolucją, jak po treningu. */
function podciagnij(o: Oddzial, poziom: number) {
  if (o.poziom >= poziom) return;
  o.poziom = poziom;
  o.dosw = doswDoPoziomu(poziom);
  ewoluujOdPoziomu(o);
}

/**
 * Drużyna w postaci, która przechodzi do następnej misji: sami stworki
 * z drużyny bohatera (garnizony zostają na planszy), wszyscy obudzeni.
 */
export function druzynaDoPrzeniesienia(s: StanMapy): Oddzial[] {
  return structuredClone(
    s.bohater.armia
      .filter((o): o is Oddzial => !!o && o.ile > 0)
      .map((o) => ({ ...o, ile: 1, omdlaly: undefined }))
  );
}

/** Bohater w postaci, która przechodzi do następnej misji. */
export function bohaterDoPrzeniesienia(s: StanMapy): BohaterPrzenoszony {
  const b = s.bohater;
  return structuredClone({
    imie: b.imie,
    atak: b.atak,
    obrona: b.obrona,
    artefakty: b.artefakty,
    doswiadczenie: b.doswiadczenie,
    umiejetnosci: b.umiejetnosci,
    poziomOdebrany: b.poziomOdebrany,
  });
}

/**
 * Zapisuje wygraną misję w postępie: wynik, bohatera na następną misję
 * i wyczyszczony wybór bonusu. Zwraca nowy postęp — nie zapisuje go sam,
 * o chwili zapisu decyduje scena.
 */
export function zaliczMisje(p: PostepKampanii, s: StanMapy): PostepKampanii {
  const m = misjaPoId(s.misja);
  if (!m) return p;
  return {
    ...p,
    ukonczone: p.ukonczone.includes(m.id) ? p.ukonczone : [...p.ukonczone, m.id],
    wyniki: { ...p.wyniki, [m.id]: { dni: s.dzien, punkty: punkty(s.dzien) } },
    bohater: bohaterDoPrzeniesienia(s),
    druzyna: druzynaDoPrzeniesienia(s),
    odznaki: [...new Set([...(p.odznaki ?? []), ...(s.odznaki ?? []).map(odznakaSali)])],
    bonus: undefined,
  };
}
