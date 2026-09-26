import { planszaPrzygody } from './plansza';
import { dolacz } from './armia';
import { FACTIONS, factionById } from './factions';
import type { StanMapy } from './mapa';
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

  // Bohater z poprzedniej misji: wszystko, co zdobył, oprócz armii i miejsca.
  if (p.bohater) Object.assign(s.bohater, structuredClone(p.bohater), { imie: p.trener });

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
    const u = f.units[b.tier];
    if (u) dolacz(s.bohater.armia, { sprite: u.sprite, nazwa: u.name, ile: b.ile, frakcja: f.id, tier: b.tier });
  }
  return s;
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
    bonus: undefined,
  };
}
