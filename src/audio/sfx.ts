/**
 * Dźwięk walki.
 *
 * Do tej pory gra była całkowicie niema — jedyny kanał, który nie dostał nic.
 * Tu siedzi cała obsługa: wczytanie próbek, ich dobór do zdarzeń bitwy,
 * i dwie rzeczy, bez których dźwięk w grze turowej męczy zamiast pomagać:
 * losowanie wariantu i dławik częstotliwości.
 *
 * Próbki: Kenney (kenney.nl), licencja CC0 — patrz public/audio/LICENCJA.md.
 * CC0 nie wymaga podpisu, ale podpis i tak jest, bo to uczciwe.
 *
 * ŚWIADOMY ZAKRES: tylko zdarzenia walki. Żadnych kliknięć, najechań ani
 * potwierdzeń — w bitwie jest kilkadziesiąt zdarzeń i dźwięk interfejsu
 * dołożony do tego zamienia się w terkot.
 *
 * Podkład muzyczny JEST, ale trzymany krótko za uzdę: cicho, z narostem
 * i z zanikiem na koniec bitwy. Muzyka w gatunku turowym gra przez cały czas
 * myślenia gracza, więc łatwiej nią zaszkodzić niż pomóc.
 */

import Phaser from 'phaser';

/** Nazwa pliku w public/audio (bez rozszerzenia) = klucz w Phaserze. */
const PLIKI = [
  'ciecie-1',
  'ciecie-2',
  'ciecie-3',
  'trafienie-1',
  'trafienie-2',
  'trafienie-mocne',
  'trafienie-slabe',
  'przewaga',
  'smierc',
  'strzal',
  'pocisk',
  'krok',
] as const;

/**
 * Podkład muzyczny. Osobno od próbek, bo rządzi się innymi prawami: gra
 * bez przerwy, musi być wyraźnie cichszy od zdarzeń i nie wolno mu ruszyć
 * z pełnej głośności.
 *
 * Utwór: „Cynic Battle Loop", CC0, OpenGameArt — patrz public/audio/LICENCJA.md.
 * Wybrany za DŁUGOŚĆ (92 s), nie za charakter: krótsza pętla obraca się
 * w typowej bitwie po kilka razy i to słychać. Podmiana to jeden plik
 * i jedna linia niżej.
 */
const MUZYKA = 'motyw-bitwy';
/** Docelowa głośność podkładu. Ma być tłem, nie treścią. */
const MUZYKA_GLOSNOSC = 0.18;
/** Wejście i wyjście podkładu (ms). Muzyka włączona na sztywno szarpie. */
const NAROST = 1800;
const ZANIK = 900;

/**
 * Zdarzenia, na które gra reaguje dźwiękiem, i próbki im przypisane.
 *
 * Kilka próbek na zdarzenie to nie ozdoba. Ten sam plik odtworzony dwadzieścia
 * razy w jednej bitwie przestaje brzmieć jak cios, a zaczyna jak zacinająca się
 * płyta — ucho wyłapuje powtórzenie znacznie szybciej niż oko.
 */
const ZDARZENIA = {
  /** Zamach bronią, tuż przed trafieniem. */
  ciecie: { pliki: ['ciecie-1', 'ciecie-2', 'ciecie-3'], glosnosc: 0.35 },
  /** Zwykłe trafienie wręcz. */
  trafienie: { pliki: ['trafienie-1', 'trafienie-2'], glosnosc: 0.5 },
  /** Trafienie z przewagą typu — mocniejsze uderzenie plus dzwon. */
  trafienieMocne: { pliki: ['trafienie-mocne'], glosnosc: 0.55 },
  /** Trafienie w odporny typ — głuche, bez blasku. */
  trafienieSlabe: { pliki: ['trafienie-slabe'], glosnosc: 0.4 },
  /** Dzwon przewagi typu, dokładany NAD trafieniem. */
  przewaga: { pliki: ['przewaga'], glosnosc: 0.3 },
  /** Oddział schodzi z planszy. */
  smierc: { pliki: ['smierc'], glosnosc: 0.5 },
  /** Wypuszczenie pocisku przez strzelca. */
  strzal: { pliki: ['strzal'], glosnosc: 0.35 },
  /** Pocisk dolatuje. */
  pocisk: { pliki: ['pocisk'], glosnosc: 0.45 },
  /** Krok oddziału przy przemieszczeniu. */
  krok: { pliki: ['krok'], glosnosc: 0.22 },
} as const;

export type Zdarzenie = keyof typeof ZDARZENIA;

/** Wczytanie próbek. Wołane z `preload` sceny. */
export function loadSfx(scene: Phaser.Scene) {
  for (const k of [...PLIKI, MUZYKA])
    scene.load.audio(k, `${import.meta.env.BASE_URL}audio/${k}.ogg`);
}

/**
 * Stan dźwięku dla sceny.
 *
 * `ostatnie` to dławik: chwila, w której dane zdarzenie zabrzmiało ostatni raz.
 * Bez niego łańcuch cios → odwet → drugi cios potrafi wystrzelić trzy próbki
 * w kilkanaście milisekund i zamiast trzech uderzeń słychać jedno chrupnięcie
 * o potrójnej głośności. Osobno pilnujemy, ile próbek gra naraz — przy
 * dwunastu oddziałach i wybuchowym końcu rundy suma potrafi przesterować.
 */
interface Stan {
  wlaczony: boolean;
  ostatnie: Map<Zdarzenie, number>;
  gra: number;
  muzyka?: Phaser.Sound.BaseSound;
}

const stany = new WeakMap<Phaser.Scene, Stan>();

/** Minimalny odstęp między dwoma wystąpieniami TEGO SAMEGO zdarzenia (ms). */
const ODSTEP = 60;
/** Ile próbek może grać jednocześnie, zanim zaczniemy pomijać kolejne. */
const NARAZ = 6;

/**
 * Włącza dźwięk w scenie. Wołane z `create`.
 *
 * Przeglądarka nie pozwoli odtworzyć niczego, dopóki gracz nie dotknie strony —
 * to nie jest błąd do obejścia, tylko reguła, którą trzeba obsłużyć. Phaser
 * sam odblokuje kontekst przy pierwszym kliknięciu; nam wystarczy nie krzyczeć
 * o błędach do tego czasu.
 */
export function initSfx(scene: Phaser.Scene, wlaczony = true) {
  stany.set(scene, { wlaczony, ostatnie: new Map(), gra: 0 });
}

/**
 * Włącza podkład muzyczny.
 *
 * Osobno od `initSfx`, bo start muzyki musi poczekać na gest gracza. Autoplay
 * jest zablokowany w każdej dzisiejszej przeglądarce i próba obejścia tego
 * kończy się nie muzyką, tylko wyjątkiem w konsoli. Jeśli kontekst jest
 * zamknięty, podpinamy się pod zdarzenie `unlocked` i ruszamy dopiero wtedy —
 * czyli w praktyce przy pierwszym kliknięciu na planszę.
 */
export function startMusic(scene: Phaser.Scene) {
  const s = stany.get(scene);
  if (!s || s.muzyka || !scene.cache.audio.exists(MUZYKA)) return;

  const puscic = () => {
    if (!s.wlaczony || s.muzyka) return;
    const m = scene.sound.add(MUZYKA, { loop: true, volume: 0 });
    s.muzyka = m;
    m.play();
    // Narost głośności zamiast startu z pełnej — wejście muzyki ma być
    // niezauważalne, a nie oznajmione.
    scene.tweens.add({
      targets: m,
      volume: MUZYKA_GLOSNOSC,
      duration: NAROST,
      ease: 'Sine.easeOut',
    });
  };

  if (scene.sound.locked) scene.sound.once('unlocked', puscic);
  else puscic();
}

/**
 * Wygasza podkład — na koniec bitwy.
 *
 * Ucięcie muzyki w tej samej klatce, w której pada ostatni oddział, brzmi jak
 * awaria odtwarzacza. Ekran końca ma swój moment ciszy, więc muzyka schodzi
 * pod niego, a nie razem z nim.
 */
export function stopMusic(scene: Phaser.Scene) {
  const s = stany.get(scene);
  const m = s?.muzyka;
  if (!s || !m) return;
  s.muzyka = undefined;
  scene.tweens.add({
    targets: m,
    volume: 0,
    duration: ZANIK,
    ease: 'Sine.easeIn',
    onComplete: () => m.destroy(),
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
    startMusic(scene);
  } else {
    // `stopAll` zdejmuje też podkład, więc czyścimy uchwyt — inaczej po
    // ponownym włączeniu `startMusic` uznałby, że muzyka już gra, i zostałaby
    // cisza aż do końca bitwy.
    s.muzyka = undefined;
    scene.sound.stopAll();
  }
  return s.wlaczony;
}

/**
 * Odtwarza zdarzenie.
 *
 * @param sila 0-1, skaluje głośność — draśnięcie ma brzmieć ciszej niż cios,
 *             który wybija pół oddziału. Poniżej pewnej granicy nie schodzimy,
 *             bo dźwięk, którego nie słychać, to tylko zużyty kanał.
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
    // Lekkie rozstrojenie wysokości przy każdym odtworzeniu. Ta sama próbka
    // zagrana w kółko brzmi mechanicznie; ±7% wystarczy, żeby dwa ciosy pod
    // rząd nie były słyszalnie tym samym plikiem, a za mało, żeby zabrzmiało
    // to jak zwolniona taśma.
    detune: Phaser.Math.Between(-120, 120),
  });
  // Sprzątamy po sobie: każde odtworzenie tworzy obiekt, a w bitwie jest ich
  // kilkaset. Bez tego lista dźwięków sceny rośnie do końca rozgrywki.
  dzwiek.once('complete', () => {
    s.gra--;
    dzwiek.destroy();
  });
  dzwiek.once('stop', () => dzwiek.destroy());
  try {
    dzwiek.play();
  } catch {
    // Kontekst dźwięku jeszcze zablokowany (gracz nic nie kliknął) — to stan
    // normalny w pierwszych sekundach, nie awaria. Zwalniamy licznik i cisza.
    s.gra--;
  }
}
