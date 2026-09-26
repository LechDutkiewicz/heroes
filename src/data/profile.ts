/**
 * Profile graczy — „kto gra?", jak konta w grach dla całej rodziny.
 *
 * Skąd się wziął: tata dwójki dzieci zgłosił, że gra ma JEDEN postęp
 * kampanii i JEDEN zapis, więc kampania Eli, Janka i taty nadpisywały się
 * nawzajem. Teraz każdy profil ma w localStorage własne klucze:
 *
 *   heroes-profile-v1                      rejestr: lista profili i aktywny
 *   heroes-profil-<id>-kampania            postęp kampanii (kampania.ts)
 *   heroes-profil-<id>-zapis-<slot>        zapisy mapy, slot 1–6 albo „auto” (zapis.ts)
 *
 * Imię profilu to imię GRACZA (np. „Tata”), a nie trenera kampanii —
 * trenera (Janek albo Ela) wybiera się dalej na ekranie kampanii.
 *
 * Migracja: gra sprzed profili trzymała postęp pod `heroes-kampania-v1`,
 * a zapis mapy pod `heroes-zapis-mapy-v1`. Przy każdym odczycie rejestru
 * sprawdzamy, czy któryś z tych kluczy istnieje, i jeśli tak — przenosimy
 * go do profilu nazwanego jak trener z zapisu. Stare klucze kasujemy
 * DOPIERO po udanym zapisie i odczycie nowych, więc przy pełnym limicie
 * przeglądarki nic nie przepada (zostają i spróbujemy następnym razem).
 *
 * Każdy dostęp do localStorage jest w try/catch: prywatna karta, wyłączone
 * dane stron albo pełny limit nie mogą wywrócić gry — co najwyżej gra nie
 * zapamięta profilu do następnej sesji (trzymamy go wtedy w pamięci).
 */

export interface Profil {
  id: string;
  imie: string;
  /** Data założenia (ISO) — porządek na liście. */
  utworzony: string;
}

interface Rejestr {
  v: 1;
  aktywny: string | null;
  profile: Profil[];
}

const KLUCZ_REJESTRU = 'heroes-profile-v1';
/** Klucze gry sprzed profili — czytane tylko przez migrację. */
export const STARY_KLUCZ_POSTEPU = 'heroes-kampania-v1';
export const STARY_KLUCZ_ZAPISU = 'heroes-zapis-mapy-v1';

export const MAKS_PROFILI = 6;
export const MAKS_DLUGOSC_IMIENIA = 14;

// ————————————————————————————————————————————————— imiona trenerów

/**
 * Imię trenera po zmianach w grze. Bohaterka nazywała się kiedyś Ola —
 * zapisy i rekordy sprzed zmiany mają to imię, a obrazki i barwy są już
 * pod „Ela". Stare imię czytamy jako nowe, zamiast gubić postęp.
 */
const DAWNE_IMIONA: Record<string, string> = { Ola: 'Ela' };
export const imieTrenera = (imie: string) => DAWNE_IMIONA[imie] ?? imie;

// ————————————————————————————————————————————————— localStorage bez wyjątków

export function czytajKlucz(klucz: string): string | null {
  try {
    return localStorage.getItem(klucz);
  } catch {
    return null;
  }
}

export function piszKlucz(klucz: string, wartosc: string): boolean {
  try {
    localStorage.setItem(klucz, wartosc);
    return true;
  } catch {
    return false;
  }
}

export function usunKlucz(klucz: string): void {
  try {
    localStorage.removeItem(klucz);
  } catch {
    // nie było czego kasować albo magazyn niedostępny
  }
}

function wszystkieKlucze(): string[] {
  try {
    const wynik: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) wynik.push(k);
    }
    return wynik;
  } catch {
    return [];
  }
}

/** Klucz danych profilu: `co` to „kampania” albo „zapis-<slot>”. */
export const kluczProfilu = (id: string, co: string) => `heroes-profil-${id}-${co}`;

// ————————————————————————————————————————————————— rejestr

/**
 * Rejestr trzymany w pamięci, gdy localStorage nie przyjmuje zapisu —
 * żeby w prywatnej karcie wybrany profil przeżył choć do końca sesji.
 */
let awaryjny: Rejestr | null = null;

const pusty = (): Rejestr => ({ v: 1, aktywny: null, profile: [] });

function parsujRejestr(s: string | null): Rejestr | null {
  if (!s) return null;
  try {
    const r = JSON.parse(s) as Partial<Rejestr>;
    if (!r || !Array.isArray(r.profile)) return null;
    const profile = r.profile.filter(
      (p): p is Profil => !!p && typeof p.id === 'string' && typeof p.imie === 'string'
    );
    const aktywny = typeof r.aktywny === 'string' && profile.some((p) => p.id === r.aktywny) ? r.aktywny : null;
    return { v: 1, aktywny, profile };
  } catch {
    return null;
  }
}

function zapiszRejestr(r: Rejestr): void {
  if (piszKlucz(KLUCZ_REJESTRU, JSON.stringify(r))) awaryjny = null;
  else awaryjny = structuredClone(r);
}

function wczytajRejestr(): Rejestr {
  const r = awaryjny ? structuredClone(awaryjny) : (parsujRejestr(czytajKlucz(KLUCZ_REJESTRU)) ?? pusty());
  if (migruj(r)) zapiszRejestr(r);
  return r;
}

const noweId = () => `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Imię tak, jak je zapiszemy: bez spacji na brzegach i podwójnych w środku, najwyżej 14 znaków. */
export const oczyscImie = (imie: string) => imie.replace(/\s+/g, ' ').trim().slice(0, MAKS_DLUGOSC_IMIENIA);

const toSamo = (a: string, b: string) => a.toLocaleLowerCase('pl') === b.toLocaleLowerCase('pl');

// ————————————————————————————————————————————————— migracja

/** Czy profil ma już jakiekolwiek dane (postęp albo zapis). */
function maDane(id: string): boolean {
  const przedrostek = kluczProfilu(id, '');
  return wszystkieKlucze().some((k) => k.startsWith(przedrostek));
}

/**
 * Przenosi dane gry sprzed profili do profilu. Zwraca `true`, gdy zmienił
 * rejestr (trzeba go zapisać).
 *
 * Profil docelowy: istniejący o tym samym imieniu, jeśli jest jeszcze pusty
 * — inaczej nowy („Janek 2”), żeby nie nadpisać cudzej kampanii.
 */
function migruj(r: Rejestr): boolean {
  const postepS = czytajKlucz(STARY_KLUCZ_POSTEPU);
  const zapisS = czytajKlucz(STARY_KLUCZ_ZAPISU);
  if (postepS === null && zapisS === null) return false;

  let postep: { trener?: string; bohater?: { imie?: string } } | null = null;
  let stan: { bohater?: { imie?: string }; obiekty?: unknown } | null = null;
  try {
    postep = postepS ? JSON.parse(postepS) : null;
  } catch {
    postep = null;
  }
  try {
    stan = zapisS ? JSON.parse(zapisS) : null;
  } catch {
    stan = null;
  }
  // Ola → Ela: w postępie i w bohaterze zapisu, zanim cokolwiek zapiszemy.
  if (postep?.trener) postep.trener = imieTrenera(postep.trener);
  if (postep?.bohater?.imie) postep.bohater.imie = imieTrenera(postep.bohater.imie);
  if (stan?.bohater?.imie) stan.bohater.imie = imieTrenera(stan.bohater.imie);

  const doPrzeniesienia = !!postep || !!(stan && typeof stan === 'object' && stan.obiekty);
  // Oba stare klucze nieczytelne — zostawiamy je w spokoju, bez zakładania
  // pustego profilu przy każdym odczycie.
  if (!doPrzeniesienia) return false;

  const bazowe = oczyscImie(postep?.trener || stan?.bohater?.imie || 'Gracz') || 'Gracz';
  let profil = r.profile.find((p) => toSamo(p.imie, bazowe) && !maDane(p.id));
  const nowyProfil = !profil;
  if (!profil) {
    let imie = bazowe;
    for (let n = 2; r.profile.some((p) => toSamo(p.imie, imie)); n++) imie = `${bazowe.slice(0, MAKS_DLUGOSC_IMIENIA - 3)} ${n}`;
    profil = { id: noweId(), imie, utworzony: new Date().toISOString() };
  }

  // Każdy klucz osobno: przenosimy, sprawdzamy odczytem i dopiero wtedy
  // kasujemy stary. Przy nieudanym zapisie stary klucz zostaje, jak był.
  let przeniesiono = false;
  if (postep) {
    const k = kluczProfilu(profil.id, 'kampania');
    const nowy = JSON.stringify(postep);
    if (piszKlucz(k, nowy) && czytajKlucz(k) === nowy) {
      usunKlucz(STARY_KLUCZ_POSTEPU);
      przeniesiono = true;
    }
  }
  if (stan && typeof stan === 'object' && stan.obiekty) {
    // Pierwszy wolny slot (w nowym profilu to slot 1).
    let slot = 1;
    while (slot < 6 && czytajKlucz(kluczProfilu(profil.id, `zapis-${slot}`)) !== null) slot++;
    const k = kluczProfilu(profil.id, `zapis-${slot}`);
    const nowy = JSON.stringify({ v: 2, zapisano: new Date().toISOString(), przeniesiony: true, stan });
    if (piszKlucz(k, nowy) && czytajKlucz(k) === nowy) {
      usunKlucz(STARY_KLUCZ_ZAPISU);
      przeniesiono = true;
    }
  }
  // Nic się nie udało zapisać (pełny limit, magazyn tylko do odczytu) —
  // rejestr zostaje bez zmian, stare klucze też; spróbujemy przy następnym
  // odczycie rejestru.
  if (!przeniesiono) return false;
  if (nowyProfil) r.profile.push(profil);
  // Przeniesione dane stają się bieżącą grą — tak jak były nią przed zmianą.
  r.aktywny = profil.id;
  return true;
}

// ————————————————————————————————————————————————— API

export function listaProfili(): Profil[] {
  return wczytajRejestr().profile;
}

export function aktywnyProfil(): Profil | null {
  const r = wczytajRejestr();
  return r.profile.find((p) => p.id === r.aktywny) ?? null;
}

export function ustawAktywny(id: string): void {
  const r = wczytajRejestr();
  if (!r.profile.some((p) => p.id === id)) return;
  r.aktywny = id;
  zapiszRejestr(r);
}

export type WynikDodania = { ok: true; profil: Profil } | { ok: false; blad: string };

/** Zakłada profil i od razu go wybiera. Błąd jest zdaniem do pokazania dziecku. */
export function dodajProfil(imie: string): WynikDodania {
  const czyste = oczyscImie(imie);
  if (!czyste) return { ok: false, blad: 'Wpisz imię.' };
  const r = wczytajRejestr();
  if (r.profile.some((p) => toSamo(p.imie, czyste))) return { ok: false, blad: `Gracz „${czyste}" już jest na liście.` };
  if (r.profile.length >= MAKS_PROFILI) return { ok: false, blad: `Może być najwyżej ${MAKS_PROFILI} graczy.` };
  const profil: Profil = { id: noweId(), imie: czyste, utworzony: new Date().toISOString() };
  r.profile.push(profil);
  r.aktywny = profil.id;
  zapiszRejestr(r);
  return { ok: true, profil };
}

/** Usuwa profil razem z jego kampanią i wszystkimi zapisami. */
export function usunProfil(id: string): void {
  const r = wczytajRejestr();
  r.profile = r.profile.filter((p) => p.id !== id);
  if (r.aktywny === id) r.aktywny = null;
  zapiszRejestr(r);
  const przedrostek = kluczProfilu(id, '');
  for (const k of wszystkieKlucze()) if (k.startsWith(przedrostek)) usunKlucz(k);
}

/**
 * Profil, do którego gra ma coś zapisać, nawet gdy nikt go nie wybrał
 * (np. gra otwarta wprost na mapie adresem `?ekran=mapa`): aktywny, a bez
 * niego pierwszy z listy, a bez listy — nowy „Gracz”.
 */
export function wymusProfil(): Profil {
  const r = wczytajRejestr();
  const aktywny = r.profile.find((p) => p.id === r.aktywny);
  if (aktywny) return aktywny;
  let profil = r.profile[0];
  if (!profil) {
    profil = { id: noweId(), imie: 'Gracz', utworzony: new Date().toISOString() };
    r.profile.push(profil);
  }
  r.aktywny = profil.id;
  zapiszRejestr(r);
  return profil;
}
