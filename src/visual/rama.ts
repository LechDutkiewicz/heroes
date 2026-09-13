/**
 * Materiał interfejsu: wnęki, listwy, narożniki, pierścienie.
 *
 * Powstało po pierwszej rundzie ślepych porównań ekranu bohatera, w której
 * pięć kawałków na sześć przegrało z komercyjnym wzorcem — i wszystkie pięć
 * werdyktów mówiło DOKŁADNIE to samo: „płaski prostokąt z jednym obrysem
 * zamiast krawędzi z profilem", „brak wgłębienia", „brak cienia rzuconego",
 * „przedmiot leży NA kafelku zamiast W gnieździe".
 *
 * To nie było pięć osobnych usterek, tylko jedna: `plate()` umie zrobić
 * kształt WYPUKŁY i nic poza tym. Cały ekran składał się więc z wypukłości
 * leżących na wypukłościach, bez ani jednego zagłębienia — a to zagłębienie
 * jest tym, co odróżnia gniazdo od naklejki.
 *
 * Stąd ten plik. Trzy kształty i jedna faktura, wszystkie z tym samym
 * kierunkiem światła co reszta gry (z góry):
 *
 *  - `wneka` — dziura w materiale: ciemne dno, cień od górnej krawędzi,
 *    rozjaśnienie przy dolnej. Tam wchodzą artefakty, gniazda umiejętności
 *    i tła paneli.
 *  - `listwa` — wypukły pas z profilem trójwarstwowym: ciemny kontur,
 *    jasna fazka od góry, przygaszenie od dołu.
 *  - `naroznik` — okucie rogu ramy. Nie kreska, tylko blaszka z nitem:
 *    to ono mówi, że okno jest przedmiotem, a nie prostokątem.
 *  - `faktura` — ledwo widoczne prążki. Bez nich duża płaszczyzna czyta się
 *    jako pole koloru z arkusza stylów, a nie jako powierzchnia.
 */

import Phaser from 'phaser';
import { C } from './theme';
import { mix } from './hud';

type Pen = Phaser.GameObjects.Graphics;

/**
 * Cień rzucony pod kształt. Osobno, bo `plate` rysuje go tylko jako obwódkę
 * przesuniętą w dół — na oknie wyskakującym potrzebna jest miękka plama
 * z rozmyciem, żeby okno naprawdę uniosło się nad ekranem.
 */
export function cienPod(g: Pen, x: number, y: number, w: number, h: number, r: number, moc = 0.4) {
  for (let i = 7; i >= 1; i--) {
    g.fillStyle(C.shadow, (moc / 7) * (8 - i) * 0.32);
    g.fillRoundedRect(x - i * 1.6, y - i * 0.6 + 7, w + i * 3.2, h + i * 1.9, r + i);
  }
}

/**
 * Wnęka — zagłębienie w materiale.
 *
 * Kolejność warstw jest tu całym trikiem i nie wolno jej zmieniać: najpierw
 * ciemne dno, potem CIEŃ OD GÓRY (bo światło pada z góry, więc górna krawędź
 * rzuca w dół), na końcu wąskie rozjaśnienie przy dolnej krawędzi — odbicie
 * światła od dna. Odwrócenie tych dwóch daje wypukłość, nie dziurę.
 */
export function wneka(
  g: Pen,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  dno: number = mix(C.panelDeep, C.shadow, 0.42),
  moc = 1
) {
  g.fillStyle(dno, 1);
  g.fillRoundedRect(x, y, w, h, r);

  // Cień od górnej i lewej krawędzi — kilka pasków o malejącej mocy zamiast
  // jednego, bo pojedynczy pasek czyta się jak kreska, a nie jak rozmycie.
  //
  // Pierwsza wersja miała ten cień o połowę słabszy i krytycy trzech kawałków
  // niezależnie napisali to samo: „brak wewnętrznego cienia od górnej
  // krawędzi, przedmiot leży NA gnieździe zamiast W nim". Zagłębienie robi
  // się kontrastem, nie subtelnością — przy mocy poniżej ~0,4 na górze
  // wnęka wygląda po prostu na ciemniejszy prostokąt.
  const gleb = Math.min(14, h * 0.38);
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    g.fillStyle(C.shadow, 0.5 * moc * (1 - t) * (1 - t));
    g.fillRoundedRect(x + 1, y + 1 + t * gleb, w - 2, gleb * 0.55, r * 0.8);
  }
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    g.fillStyle(C.shadow, 0.34 * moc * (1 - t));
    g.fillRoundedRect(x + 1 + t * 5, y + 2, Math.min(7, w * 0.22), h - 4, r * 0.6);
  }

  // Odbicie przy dnie: to ono robi z ciemnego prostokąta zagłębienie.
  g.fillStyle(C.white, 0.16 * moc);
  g.fillRoundedRect(x + r * 0.6, y + h - Math.min(6, h * 0.18), w - r * 1.2, 3.5, 2);
  g.fillStyle(C.white, 0.08 * moc);
  g.fillRoundedRect(x + w - Math.min(5, w * 0.16), y + r * 0.6, 3, h - r * 1.2, 2);

  // Kontur wnęki — ciemniejszy od dna, inaczej wnęka wtapia się w otoczenie.
  g.lineStyle(2, mix(C.shadow, C.panelDeep, 0.25), 0.9 * moc);
  g.strokeRoundedRect(x, y, w, h, r);
  // Fazka NA ZEWNĄTRZ wnęki — i kierunek jest tu odwrotny niż w środku.
  //
  // Pierwsza wersja kładła jasną kreskę nad górną krawędzią i krytyk napisał
  // wprost, że gniazdo „wystaje zamiast się zapadać". Miał rację: światło
  // z góry rozjaśnia górną krawędź obiektu WYPUKŁEGO. Przy dziurze jest na
  // odwrót — nad otworem materiał wchodzi w cień, a rozświetla się dopiero
  // dolna warga, bo to ona jest zwrócona do światła.
  g.lineStyle(2, C.shadow, 0.35 * moc);
  g.beginPath();
  g.moveTo(x + r * 0.7, y - 1.5);
  g.lineTo(x + w - r * 0.7, y - 1.5);
  g.strokePath();
  g.lineStyle(2, C.white, 0.28 * moc);
  g.beginPath();
  g.moveTo(x + r * 0.7, y + h + 1.5);
  g.lineTo(x + w - r * 0.7, y + h + 1.5);
  g.strokePath();
}

/**
 * Listwa — wypukły pas z profilem. Nagłówki, wstęgi tytułów, pas armii.
 *
 * `barwa` to materiał, `akcent` to kolor fazki. Domyślnie fazka jest złota,
 * bo to jedyny metal na tym ekranie i konsekwencja w tym miejscu robi więcej
 * niż dodatkowa barwa.
 */
export function listwa(
  g: Pen,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  barwa: number = C.panelDeep,
  akcent: number = C.gold
) {
  // 1. Ciemny kontur pod spodem — szerszy o 2 px z każdej strony.
  g.fillStyle(mix(C.shadow, barwa, 0.25), 1);
  g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, r + 2);
  // 2. Materiał.
  g.fillStyle(barwa, 1);
  g.fillRoundedRect(x, y, w, h, r);
  // 3. Gradient góra-dół w samym materiale.
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    g.fillStyle(C.white, 0.055 * (1 - t));
    g.fillRoundedRect(x + 2, y + 2 + t * h * 0.5, w - 4, h * 0.1, r * 0.5);
  }
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    g.fillStyle(C.shadow, 0.06 * t);
    g.fillRoundedRect(x + 2, y + h * 0.6 + t * h * 0.35, w - 4, h * 0.12, r * 0.5);
  }
  // 4. Fazka: jasna linia po górnej krawędzi, przygaszona po dolnej.
  g.lineStyle(1.5, C.white, 0.28);
  g.beginPath();
  g.moveTo(x + r * 0.8, y + 1.5);
  g.lineTo(x + w - r * 0.8, y + 1.5);
  g.strokePath();
  g.lineStyle(1.5, C.shadow, 0.3);
  g.beginPath();
  g.moveTo(x + r * 0.8, y + h - 1.5);
  g.lineTo(x + w - r * 0.8, y + h - 1.5);
  g.strokePath();
  // 5. Obrys metalu.
  g.lineStyle(2, akcent, 0.9);
  g.strokeRoundedRect(x, y, w, h, r);
}

/**
 * Okucie narożnika: blaszka z nitem, wpuszczona w róg ramy.
 *
 * `sx`/`sy` to kierunek, w którym okucie odchodzi od podanego punktu (1 albo
 * −1). Rysujemy je jako WYPEŁNIONY kształt, nie jako dwie kreski: kreski
 * czytają się jako obramowanie tabeli, blaszka jako część konstrukcji.
 */
export function naroznik(g: Pen, x: number, y: number, sx: number, sy: number, dl = 46) {
  // Okucie jest RYSOWANE, nie wycięte z prostokąta.
  //
  // Pierwsza wersja była wypełnionym kątownikiem i krytyk nazwał ją wprost
  // „niedokończonym żółtym prostokątem nachodzącym na ramę" — bo tym właśnie
  // była: dwie grube blaszki bez rysunku, wystające poza obrys. Teraz jest to
  // cienki, fazowany wąs z listkiem u nasady i ćwiekiem w kolanie, w całości
  // WEWNĄTRZ obrysu ramy.
  const gr = 4.5;

  /** Wąs: cienka listwa od kolana wzdłuż jednego boku, zwężająca się na końcu. */
  const was = (kx: number, ky: number, barwa: number, alfa: number, grubosc: number) => {
    g.lineStyle(grubosc, barwa, alfa);
    g.beginPath();
    g.moveTo(x + sx * dl, y + ky * grubosc * 0.2);
    g.lineTo(x + sx * gr * 1.6, y + ky * gr * 0.2);
    g.strokePath();
    g.beginPath();
    g.moveTo(x + kx * grubosc * 0.2, y + sy * dl);
    g.lineTo(x + kx * gr * 0.2, y + sy * gr * 1.6);
    g.strokePath();
  };

  // Cień pod okuciem — inaczej filigran leży płasko na materiale.
  g.save();
  g.translateCanvas(0, 2);
  was(sx, sy, C.shadow, 0.5, 5);
  g.restore();
  was(sx, sy, C.goldDeep, 1, 4.5);
  was(sx, sy, C.goldLight, 0.85, 1.8);

  // Ćwiek w kolanie: kula z fazą i światłem od góry.
  const nx = x + sx * (gr + 3);
  const ny = y + sy * (gr + 3);
  g.fillStyle(C.shadow, 0.7);
  g.fillCircle(nx, ny + 1.5, 6);
  g.fillStyle(C.goldDeep, 1);
  g.fillCircle(nx, ny, 5.4);
  g.fillStyle(C.gold, 1);
  g.fillCircle(nx, ny - 0.6, 4);
  g.fillStyle(C.goldLight, 0.9);
  g.fillCircle(nx - 1, ny - 1.6, 2.2);
  g.fillStyle(C.white, 0.8);
  g.fillCircle(nx - 1.4, ny - 2.2, 1);
}

/**
 * Ząbkowanie pod gzymsem — rząd krótkich klocków wystających spod listwy.
 *
 * To jest ten jeden detal, który w architekturze odróżnia gzyms od paska
 * farby, i krytyk ramy wskazał go po nazwie. Każdy ząbek ma własne światło
 * (jaśniejszy czubek, ciemniejszy spód), bo rząd jednolitych prostokątów
 * czyta się jak kreskowanie, a nie jak rzeźba.
 */
export function zabkowanie(
  g: Pen,
  x: number,
  y: number,
  w: number,
  barwa: number = C.goldDeep,
  wys = 7
) {
  const szer = 7;
  const odstep = 6;
  const ile = Math.floor((w + odstep) / (szer + odstep));
  const start = x + (w - (ile * szer + (ile - 1) * odstep)) / 2;
  for (let i = 0; i < ile; i++) {
    const zx = start + i * (szer + odstep);
    g.fillStyle(C.shadow, 0.45);
    g.fillRect(zx - 0.5, y, szer + 1, wys + 2);
    g.fillStyle(barwa, 1);
    g.fillRect(zx, y, szer, wys);
    g.fillStyle(C.white, 0.3);
    g.fillRect(zx, y, szer, 2);
    g.fillStyle(C.shadow, 0.3);
    g.fillRect(zx, y + wys - 2, szer, 2);
  }
}

/**
 * Pierścień metalowy z fazowaniem i nacięciami — obręcz portretu.
 *
 * Płaskie koło w złocie wygląda jak żeton do gry planszowej. Dopiero ciemny
 * kontur zewnętrzny, wewnętrzny rowek i osiem nacięć na obwodzie robią z tego
 * odlew.
 */
export function pierscien(g: Pen, cx: number, cy: number, r: number, grubosc = 9) {
  g.fillStyle(C.shadow, 0.4);
  g.fillCircle(cx, cy + 3, r + 2);
  g.fillStyle(C.goldDeep, 1);
  g.fillCircle(cx, cy, r);
  g.fillStyle(C.gold, 1);
  g.fillCircle(cx, cy, r - 2);
  // Górna połowa jaśniejsza: światło z góry.
  g.fillStyle(C.goldLight, 0.5);
  g.slice(cx, cy, r - 2.5, Phaser.Math.DegToRad(190), Phaser.Math.DegToRad(350));
  g.fillPath();
  // Nacięcia — osiem, jak w obręczy odlewanej w formie.
  g.fillStyle(C.goldDeep, 0.75);
  for (let i = 0; i < 8; i++) {
    const a = Phaser.Math.DegToRad(i * 45 + 22);
    g.fillCircle(cx + Math.cos(a) * (r - grubosc / 2), cy + Math.sin(a) * (r - grubosc / 2), 2.4);
  }
  // Rowek wewnętrzny i dno pod portretem.
  g.fillStyle(mix(C.goldDeep, C.shadow, 0.4), 1);
  g.fillCircle(cx, cy, r - grubosc);
  g.fillStyle(mix(C.panel, C.panelDeep, 0.55), 1);
  g.fillCircle(cx, cy, r - grubosc - 2);
  g.fillStyle(C.shadow, 0.2);
  g.slice(cx, cy, r - grubosc - 2, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
  g.fillPath();
}

/**
 * Faktura: skośne prążki o znikomej mocy.
 *
 * Chodzi o coś, czego nie widać jako wzoru, ale co odbiera płaszczyźnie
 * płaskość. Przy mocy powyżej 0,05 zaczyna wyglądać jak tapeta, więc wartość
 * domyślna jest celowo na granicy widoczności.
 */
export function faktura(g: Pen, x: number, y: number, w: number, h: number, moc = 0.035) {
  const krok = 7;
  g.lineStyle(1, C.white, moc);
  for (let i = -h; i < w; i += krok) {
    g.beginPath();
    g.moveTo(x + Math.max(0, i), y + Math.max(0, -i));
    const dl = Math.min(h, w - i);
    g.lineTo(x + Math.max(0, i) + dl, y + Math.max(0, -i) + dl);
    g.strokePath();
  }
}
