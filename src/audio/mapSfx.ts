/**
 * Dźwięk mapy przygody i miasta.
 *
 * Ten sam wzorzec co `sfx.ts` (walka): próbki wołane wprost z miejsca
 * zdarzenia w scenie, bez szyny zdarzeń, ze stanem trzymanym per-scena
 * w WeakMap. Osobny moduł, bo `sfx.ts` świadomie ogranicza się do walki
 * (patrz jego nagłówek) — mapa i miasto to inny zestaw zdarzeń i inna
 * (dłuższa) muzyka.
 *
 * Próbki jednorazowe (krok, zajęcie, zbiór, wejście, awans, budowa) i pętle
 * (ambient budowli, podkład mapy/miasta) są w tym wydaniu SYNTEZOWANE, nie
 * pobrane — środowisko builda nie ma dostępu do kenney.nl/opengameart.org
 * (proxy odrzuca połączenie), więc nie dało się powtórzyć drogi z walki co
 * do joty. Pliki i ich pochodzenie: `public/audio/LICENCJA.md`. Podmiana na
 * prawdziwe próbki CC0 w tym samym stylu to wyłącznie podłożenie plików pod
 * te same nazwy w `public/audio` — kod się nie zmienia.
 */

import Phaser from 'phaser';

const PLIKI = [
  'krok-mapa',
  'zajecie',
  'zbior',
  'wejscie',
  'awans',
  'budowa',
  'ambient-kopalnia',
  'ambient-wieza',
] as const;

const ZDARZENIA = {
  /** Krok bohatera po mapie. */
  krok: { pliki: ['krok-mapa'], glosnosc: 0.16 },
  /** Zajęcie kopalni albo gniazda. */
  zajecie: { pliki: ['zajecie'], glosnosc: 0.5 },
  /** Podniesienie surowca albo artefaktu z ziemi. */
  zbior: { pliki: ['zbior'], glosnosc: 0.4 },
  /** Wejście do budowli odwiedzanej / bramy zamku. */
  wejscie: { pliki: ['wejscie'], glosnosc: 0.35 },
  /** Otwarcie okna awansu na nowy poziom. */
  awans: { pliki: ['awans'], glosnosc: 0.55 },
  /** Ukończenie budowy w mieście. */
  budowa: { pliki: ['budowa'], glosnosc: 0.45 },
} as const;

export type Zdarzenie = keyof typeof ZDARZENIA;

/** Ambient budowli, słyszalny stojąc na niej lub tuż obok — patrz `aktualizujAmbient`. */
const AMBIENT: Record<string, { plik: string; glosnosc: number }> = {
  kopalnia: { plik: 'ambient-kopalnia', glosnosc: 0.24 },
  'wieza-obserwacyjna': { plik: 'ambient-wieza', glosnosc: 0.2 },
};

/** Głośność ambientu na polu sąsiednim względem tego, gdzie się stoi. */
const AMBIENT_SASIAD = 0.4;

/** Muzyka mapy przygody i miasta — jeden uniwersalny podkład na scenę. */
export const MUZYKA_MAPA = { klucz: 'muzyka-mapa', glosnosc: 0.15, narost: 2200, zanik: 1000 };
export const MUZYKA_MIASTO = { klucz: 'muzyka-miasto', glosnosc: 0.16, narost: 1600, zanik: 800 };

/** Wczytanie próbek. Wołane z `preload` sceny. */
export function loadSfx(scene: Phaser.Scene, muzyka: { klucz: string }) {
  for (const k of [...PLIKI, muzyka.klucz])
    scene.load.audio(k, `${import.meta.env.BASE_URL}audio/${k}.wav`);
}

interface Ambient {
  klucz: string;
  dzwiek: Phaser.Sound.BaseSound;
}

interface Stan {
  wlaczony: boolean;
  ostatnie: Map<Zdarzenie, number>;
  gra: number;
  muzyka?: Phaser.Sound.BaseSound;
  muzykaCfg?: { klucz: string; glosnosc: number; narost: number; zanik: number };
  ambient?: Ambient;
  /** Dźwięki w trakcie wygaszania tweenem — `stopMusic` i wygaszanie
   * ambientu czyszczą swoje pole (`muzyka`/`ambient`) NATYCHMIAST, żeby
   * `startMusic` nie uznał, że coś już gra. Prawdziwy obiekt dźwięku żyje
   * do końca tweenu tylko w jego domknięciu — więc gdyby scena zamknęła się
   * w międzyczasie, nic by go nie widziało. Ta lista to jedyne miejsce,
   * gdzie taki gasnący dźwięk jest w tym oknie widoczny z zewnątrz. */
  gasnace: Phaser.Sound.BaseSound[];
}

const stany = new WeakMap<Phaser.Scene, Stan>();

const ODSTEP = 80;
const NARAZ = 6;

/**
 * Włącza dźwięk w scenie. Wołane z `create`.
 *
 * `stopMusic`/`stopAmbient` wygaszają tweenem, a ten dogrywa się dopiero
 * po kilkuset ms. Kłopot: `pokazZamek` i `zacznijBitwe` wołają je tuż przed
 * `scene.start(...)` — sceny w Phaserze dzielą jeden globalny menedżer
 * dźwięku, ale mają WŁASNY menedżer tweenów, który usypia w tej samej
 * klatce, w której `scene.start` rusza. Tween ginie w połowie, `destroy()`
 * z jego `onComplete` nigdy nie leci, a dźwięk — bo żyje w menedżerze
 * globalnym, nie scenowym — zostaje osierocony i gra dalej w nieskończoność
 * pod nowo wystartowaną sceną. Efekt: w mieście słychać podkład mapy i miasta
 * naraz. Nasłuch na `shutdown` to siatka bezpieczeństwa — niezależnie od
 * tego, czy tween zdążył dobiec końca, scena przy zamknięciu ubija swój
 * dźwięk natychmiast.
 */
export function initSfx(scene: Phaser.Scene, wlaczony = true) {
  stany.set(scene, { wlaczony, ostatnie: new Map(), gra: 0, gasnace: [] });
  scene.events.once('shutdown', () => {
    const s = stany.get(scene);
    if (!s) return;
    s.muzyka?.destroy();
    s.muzyka = undefined;
    s.ambient?.dzwiek.destroy();
    s.ambient = undefined;
    for (const d of s.gasnace) d.destroy();
    s.gasnace = [];
  });
}

/** Startuje podkład muzyczny sceny — patrz `sfx.ts#startMusic`, ten sam wzorzec z opóźnieniem do gestu gracza. */
export function startMusic(
  scene: Phaser.Scene,
  muzyka: { klucz: string; glosnosc: number; narost: number; zanik: number }
) {
  const s = stany.get(scene);
  if (!s || s.muzyka || !scene.cache.audio.exists(muzyka.klucz)) return;
  s.muzykaCfg = muzyka;

  const puscic = () => {
    if (!s.wlaczony || s.muzyka) return;
    const m = scene.sound.add(muzyka.klucz, { loop: true, volume: 0 });
    s.muzyka = m;
    m.play();
    scene.tweens.add({
      targets: m,
      volume: muzyka.glosnosc,
      duration: muzyka.narost,
      ease: 'Sine.easeOut',
    });
  };

  if (scene.sound.locked) scene.sound.once('unlocked', puscic);
  else puscic();
}

/** Wygasza podkład — przy wyjściu ze sceny (bitwa, miasto). */
export function stopMusic(scene: Phaser.Scene) {
  const s = stany.get(scene);
  const m = s?.muzyka;
  if (!s || !m) return;
  s.muzyka = undefined;
  scene.tweens.killTweensOf(m);
  const zanik = s.muzykaCfg?.zanik ?? 800;
  if (!m.isPlaying) {
    m.destroy();
    return;
  }
  // Dopóki tween nie skończy, `m` żyje tylko tutaj i w domknięciu poniżej —
  // `gasnace` to jedyny sposób, żeby siatka bezpieczeństwa z `initSfx` mogła
  // go ubić, gdyby scena zamknęła się, zanim tween dobiegnie końca.
  s.gasnace.push(m);
  scene.tweens.add({
    targets: m,
    volume: 0,
    duration: zanik,
    ease: 'Sine.easeIn',
    onComplete: () => {
      m.destroy();
      s.gasnace = s.gasnace.filter((d) => d !== m);
    },
  });
}

export function sfxEnabled(scene: Phaser.Scene) {
  return stany.get(scene)?.wlaczony ?? false;
}

/** Przełącza wyciszenie. Zwraca stan PO przełączeniu. */
export function toggleSfx(scene: Phaser.Scene) {
  const s = stany.get(scene);
  if (!s) return false;
  s.wlaczony = !s.wlaczony;
  if (s.wlaczony) {
    if (s.muzykaCfg) startMusic(scene, s.muzykaCfg);
  } else {
    s.muzyka = undefined;
    s.ambient = undefined;
    scene.sound.stopAll();
  }
  return s.wlaczony;
}

/**
 * Odtwarza zdarzenie mapy/miasta. Patrz `sfx.ts#sfx` — ten sam dławik
 * (ODSTEP) i limit jednoczesnych próbek (NARAZ), bo te same powody:
 * łańcuch zdarzeń w jednej klatce i sumowanie głośności.
 */
export function sfx(scene: Phaser.Scene, co: Zdarzenie, sila = 1) {
  const s = stany.get(scene);
  if (!s || !s.wlaczony) return;

  const teraz = scene.time.now;
  const poprzednio = s.ostatnie.get(co) ?? -Infinity;
  if (teraz - poprzednio < ODSTEP) return;
  if (s.gra >= NARAZ) return;

  const def = ZDARZENIA[co];
  const klucz = def.pliki[Math.floor(Math.random() * def.pliki.length)];
  if (!scene.cache.audio.exists(klucz)) return;

  s.ostatnie.set(co, teraz);
  s.gra++;

  const dzwiek = scene.sound.add(klucz, {
    volume: def.glosnosc * (0.55 + 0.45 * Phaser.Math.Clamp(sila, 0, 1)),
    detune: Phaser.Math.Between(-80, 80),
  });
  dzwiek.once('complete', () => {
    s.gra--;
    dzwiek.destroy();
  });
  dzwiek.once('stop', () => dzwiek.destroy());
  try {
    dzwiek.play();
  } catch {
    s.gra--;
  }
}

/** Klucz ambientu dla obiektu mapy, jeśli akurat ma jakiś przypisany. */
function kluczAmbientu(o: { rodzaj: string; budynek?: string }): string | undefined {
  if (o.rodzaj === 'kopalnia') return 'kopalnia';
  if (o.rodzaj === 'budynek' && o.budynek === 'wieza-obserwacyjna') return 'wieza-obserwacyjna';
  return undefined;
}

/**
 * Tło budowli, słyszalne stojąc na kopalni/wieży obserwacyjnej albo na
 * polu bezpośrednio sąsiednim — głośniej na samej budowli, ciszej obok,
 * cisza dalej. Wołane z `odswiezWszystko`, czyli po każdej zmianie pozycji
 * bohatera; jeśli nic w zasięgu się nie zmieniło, funkcja i tak tylko
 * dostraja głośność, więc częste wołanie nic nie kosztuje.
 *
 * Jeden kanał na scenę, nie jeden na budowlę: dwie kopalnie obok siebie
 * nigdy się nie zdarzają na tej mapie, a gdyby się zdarzyły, słychać tę
 * bliższą — jak w H2, nie chór wszystkich naraz.
 */
export function aktualizujAmbient(
  scene: Phaser.Scene,
  bohater: { x: number; y: number },
  obiekty: Array<{ x: number; y: number; rodzaj: string; budynek?: string }>
) {
  const s = stany.get(scene);
  if (!s || !s.wlaczony) return;

  let najlepszy: { klucz: string; odleglosc: number } | undefined;
  for (const o of obiekty) {
    const klucz = kluczAmbientu(o);
    if (!klucz) continue;
    const odleglosc = Math.max(Math.abs(o.x - bohater.x), Math.abs(o.y - bohater.y));
    if (odleglosc > 1) continue;
    if (!najlepszy || odleglosc < najlepszy.odleglosc) najlepszy = { klucz, odleglosc };
  }

  const obecny = s.ambient;
  if (!najlepszy) {
    if (obecny) {
      s.ambient = undefined;
      s.gasnace.push(obecny.dzwiek);
      scene.tweens.add({
        targets: obecny.dzwiek,
        volume: 0,
        duration: 500,
        onComplete: () => {
          obecny.dzwiek.destroy();
          s.gasnace = s.gasnace.filter((d) => d !== obecny.dzwiek);
        },
      });
    }
    return;
  }

  const def = AMBIENT[najlepszy.klucz];
  const docelowa = def.glosnosc * (najlepszy.odleglosc === 0 ? 1 : AMBIENT_SASIAD);

  if (obecny && obecny.klucz === najlepszy.klucz) {
    scene.tweens.killTweensOf(obecny.dzwiek);
    scene.tweens.add({ targets: obecny.dzwiek, volume: docelowa, duration: 400 });
    return;
  }

  if (obecny) {
    s.gasnace.push(obecny.dzwiek);
    scene.tweens.add({
      targets: obecny.dzwiek,
      volume: 0,
      duration: 350,
      onComplete: () => {
        obecny.dzwiek.destroy();
        s.gasnace = s.gasnace.filter((d) => d !== obecny.dzwiek);
      },
    });
  }
  if (!scene.cache.audio.exists(def.plik)) return;

  const puscic = () => {
    const m = scene.sound.add(def.plik, { loop: true, volume: 0 });
    s.ambient = { klucz: najlepszy!.klucz, dzwiek: m };
    m.play();
    scene.tweens.add({ targets: m, volume: docelowa, duration: 500 });
  };
  if (scene.sound.locked) scene.sound.once('unlocked', puscic);
  else puscic();
}

/** Ucina ambient natychmiast — przy wyjściu ze sceny mapy. */
export function stopAmbient(scene: Phaser.Scene) {
  const s = stany.get(scene);
  const a = s?.ambient;
  if (!s || !a) return;
  s.ambient = undefined;
  scene.tweens.killTweensOf(a.dzwiek);
  a.dzwiek.destroy();
}
