import Phaser from 'phaser';

/**
 * Animowana woda na mapie przygody — liczona przez shader, klatka po klatce.
 *
 * Skąd to się wzięło
 * ------------------
 * Wcześniej woda była animowana czterema gotowymi obrazami planszy, między
 * którymi scena przełączała się co pół sekundy. To dwie klatki na sekundę:
 * oko widzi przeskoki, nie ruch — i tak też zostało to zgłoszone („loop nie
 * wygląda jak płynny loop"). Żadne poprawianie tych czterech klatek tego nie
 * naprawi, bo problem jest w liczbie klatek, a nie w ich treści. Pełna
 * animacja z obrazów wymagałaby kilkudziesięciu tekstur 1728 × 1728.
 *
 * Dlatego woda jest teraz LICZONA przy każdym rysowaniu. Kosztuje jedną
 * dodatkową operację rysowania na klatkę, a daje ruch ciągły i praktycznie
 * niepowtarzalny.
 *
 * Jak to działa
 * -------------
 * Kwadrat shadera leży dokładnie na planszy i przepisuje ją piksel w piksel;
 * ZMIENIA tylko te piksele, które maska oznacza jako wodę. Dzięki temu nie ma
 * problemu z mieszaniem przezroczystości na styku wody z lądem — brzeg jest
 * dokładnie tam, gdzie go namalowano, bo pochodzi z tej samej maski.
 *
 * Na wodę składa się pięć rzeczy, z których każda robi co innego:
 *
 *  1. Falowanie — trzy warstwy bezszwowego szumu płynące w różne strony
 *     z różną prędkością. Jedna warstwa daje wzór powtarzający się w rytmie
 *     tekstury; kilka o niewspółmiernych prędkościach nakłada się na siebie
 *     z okresem, którego w praktyce się nie doczeka.
 *  2. Załamanie światła — obraz namalowanej wody jest próbkowany z lekkim
 *     przesunięciem wynikającym z nachylenia fali. To jest ta rzecz, przez
 *     którą woda wygląda na PRZEZROCZYSTĄ, a nie na pomalowaną blachę.
 *  3. Głębia — bliżej brzegu woda jaśnieje i wpada w turkus, dalej ciemnieje
 *     i sinieje. Bez tego tafla jest jednolita i płaska.
 *  4. Piana — pas przy brzegu, oddychający wolniej niż fale, z poszarpaną
 *     krawędzią z tego samego szumu. To ona sprzedaje wrażenie, że woda
 *     dochodzi do lądu, a nie kończy się na nim.
 *  5. Iskry — ostre odbicie słońca na grzbietach fal, od góry z prawej,
 *     tak jak pada światło na wszystkim innym w tej grze.
 */

/** Ile pikseli świata przypada na jeden bok tekstury zmarszczek. */
const BOK_ZMARSZCZEK = 512;

const FRAGMENT = `
// Czas rośnie bez końca i mnoży się przez prędkości fal, więc przy średniej
// precyzji po kilku minutach gry przesunięcia zaczynają skakać co pół piksela.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uPlansza;
uniform sampler2D uMaska;
uniform sampler2D uZmarszczki;
uniform float uCzas;
uniform vec2 uKafelki;
// Rozmiar planszy w pikselach świata.
uniform vec2 uPlanszaPx;
// Lewy górny róg ramy mapy na ekranie, a po nim przesunięcie kamery.
uniform vec4 uWidok;
// Wysokość bufora: gl_FragCoord liczy od DOŁU, a scena od góry.
uniform float uWysokoscBufora;

// Wysokość fali w danym punkcie: dwie warstwy szumu płynące osobno.
// Prędkości są celowo niewspółmierne (0.021 i 0.017 to nie jest ta sama
// liczba przez przypadek) — gdyby jedna była wielokrotnością drugiej, wzór
// wracałby do siebie i pętla byłaby widoczna.
float wysokosc(vec2 p) {
  float a = texture2D(uZmarszczki, p + vec2(0.021, 0.012) * uCzas).r;
  float b = texture2D(uZmarszczki, p * 2.3 - vec2(0.017, -0.014) * uCzas).g;
  float c = texture2D(uZmarszczki, p * 4.7 + vec2(0.009, 0.026) * uCzas).b;
  return a * 0.55 + b * 0.30 + c * 0.15;
}

void main() {
  // Współrzędne liczymy z położenia piksela NA EKRANIE, a nie ze współrzędnych
  // tekstury kwadratu. Kwadrat siedzi w kontenerze świata, a ten jest przesuwany
  // kamerą i przycinany maską — współrzędne kwadratu tego nie odwzorowują.
  // Droga przez ekran jest dłuższa, ale liczy dokładnie to, co widać: piksel
  // ramy mapy przeliczony na piksel świata i dopiero potem na teksturę.
  vec2 ekran = vec2(gl_FragCoord.x, uWysokoscBufora - gl_FragCoord.y);
  vec2 swiat = ekran - uWidok.xy + uWidok.zw;
  vec2 uv = swiat / uPlanszaPx;
  // Phaser wgrywa obrazy do karty odwrócone w pionie, więc próbkowanie planszy
  // i maski idzie po odbitej współrzędnej. Bez tego shader czytał teren
  // z lustrzanego odbicia mapy: woda z południa wychodziła na północy.
  vec2 t = vec2(uv.x, 1.0 - uv.y);
  vec4 tlo = texture2D(uPlansza, t);
  vec3 m = texture2D(uMaska, t).rgb;

  // Ląd przepisujemy bez zmian. Kwadrat obejmuje całą planszę, bo tylko wtedy
  // nie trzeba go dopasowywać do kształtu wody ani mieszać przezroczystości.
  if (m.r < 0.02) {
    gl_FragColor = tlo;
    return;
  }

  vec2 p = uv * uKafelki;
  float h = wysokosc(p);
  // Nachylenie fali z różnicy wysokości. Krok jest w jednostkach tekstury
  // zmarszczek, więc nie zmienia się razem z rozmiarem planszy.
  // Krok celowo duży: nachylenie liczone z sąsiednich pikseli łapie najdrobniejszy
  // szum i odbicie słońca rozsypuje się wtedy na ekranie jak śnieg na starym
  // telewizorze. Z szerszego kroku wychodzi nachylenie CAŁEJ fali, a nie ziarna.
  float e = 0.03;
  vec2 nachylenie = vec2(wysokosc(p + vec2(e, 0.0)) - h, wysokosc(p + vec2(0.0, e)) - h);

  float glebia = m.g;
  float dno = m.b;

  // Załamanie wygaszamy przy samym brzegu. Przesunięcie próbki wciąga tam
  // piksele LĄDU do wody — przy pierwszym podejściu wokół całego jeziora
  // ciągnęła się przez to piaskowa poświata, jakby brzeg świecił.
  float silaZalamania = 0.016 * smoothstep(0.0, 0.30, glebia);
  vec3 woda = texture2D(uPlansza, t + nachylenie * silaZalamania).rgb;

  // Barwa głębi. Mieszamy z obrazem, a nie zastępujemy go, żeby woda została
  // spójna z resztą namalowanego terenu.
  vec3 plytka = vec3(0.62, 0.93, 0.93);
  vec3 gleboka = vec3(0.16, 0.53, 0.76);
  vec3 barwa = mix(plytka, gleboka, clamp(glebia * 0.9 + dno * 0.2, 0.0, 1.0));
  // Namalowana woda ma już własne kaustyki i mocny kolor — i to ona ma zostać.
  // Przy mocniejszym mieszaniu shader ją po prostu zamalowywał: ruch owszem był,
  // ale jezioro robiło się szare i wypadało z palety reszty mapy. Barwa głębi
  // dokłada więc tylko tyle, żeby środek akwenu był ciemniejszy niż płycizna.
  woda = mix(woda, barwa, 0.06 + 0.14 * glebia);

  // Fala jako jaśniejsze grzbiety i ciemniejsze doliny.
  woda *= 0.94 + 0.13 * h;

  // Iskry: wąskie, ostre odbicie tam, gdzie grzbiet jest ustawiony do słońca.
  // Słońce od góry z prawej — tak samo jak cienie budowli.
  vec2 slonce = normalize(vec2(0.6, -0.8));
  float odbicie = clamp(dot(normalize(nachylenie + vec2(0.0001)), slonce), 0.0, 1.0);
  // Iskra siedzi na samym czubku fali, a nie na całym jej zboczu: bez tego
  // mnożnika rozświetlone są długie grzbiety i wychodzi z tego biała koronka
  // rozciągnięta po całej tafli.
  float grzbiet = smoothstep(0.70, 0.95, h);
  woda += pow(odbicie, 6.0) * grzbiet * (0.28 + 0.22 * glebia);

  // Piana przy brzegu. Próg oddycha wolno (fala przypływu), a szum sprawia,
  // że krawędź jest poszarpana zamiast być równoległą do brzegu wstążką.
  float oddech = 0.5 + 0.5 * sin(uCzas * 0.8 + h * 5.0);
  float prog = 0.20 + 0.08 * oddech;
  float piana = smoothstep(prog, prog - 0.11, glebia) * smoothstep(0.01, 0.10, glebia);
  piana *= 0.25 + 0.75 * smoothstep(0.35, 0.75, h);
  woda = mix(woda, vec3(0.95, 0.98, 1.0), clamp(piana, 0.0, 0.7));

  // Na samym styku z lądem woda wtapia się w to, co namalowano — inaczej
  // shader rysowałby własny brzeg tuż obok brzegu z tekstury. Wygaszenie idzie
  // po DWÓCH rzeczach naraz: po masce (ile tu w ogóle wody) i po odległości od
  // brzegu. Sama maska nie wystarczyła: w pasie, gdzie namalowana woda dopiero
  // przechodzi w trawę, rozjaśnianie i piana robiły z ciepłych pikseli brzegu
  // różową obwódkę wokół całego jeziora.
  float wglab = smoothstep(0.0, 0.22, glebia);
  gl_FragColor = vec4(mix(tlo.rgb, woda, m.r * wglab), tlo.a);
}
`;

/**
 * Tworzy kwadrat shadera pokrywający planszę.
 *
 * Zwraca `null`, gdy renderer nie jest WebGL-owy albo gdy utworzenie shadera
 * się nie powiedzie: wtedy zostaje sama namalowana plansza, czyli nieruchoma
 * woda. To jest świadomy zapas — brak animacji jest do przeżycia, brak mapy nie.
 */
export function dodajWode(
  scena: Phaser.Scene,
  szer: number,
  wys: number,
  kamera: () => Phaser.Cameras.Scene2D.Camera
): Phaser.GameObjects.Shader | null {
  if (scena.game.renderer.type !== Phaser.WEBGL) return null;
  if (!scena.textures.exists('woda-maska') || !scena.textures.exists('woda-zmarszczki')) return null;

  try {
    const kwadrat = scena.add.shader(
      {
        name: 'woda',
        fragmentSource: FRAGMENT,
        setupUniforms: (ustaw: (nazwa: string, wartosc: unknown) => void) => {
          // Sampler'y trzeba przypisać do jednostek ręcznie: silnik podpina
          // tekstury pod jednostki 0…N, ale nie wie, jak nazywają się w kodzie.
          ustaw('uPlansza', 0);
          ustaw('uMaska', 1);
          ustaw('uZmarszczki', 2);
          // Czas zawijamy co godzinę: sam w sobie rośnie bez końca, a mnożony
          // przez prędkości fal w końcu przekracza dokładność liczb w shaderze.
          ustaw('uCzas', (scena.time.now / 1000) % 3600);
          ustaw('uKafelki', [szer / BOK_ZMARSZCZEK, wys / BOK_ZMARSZCZEK]);
          ustaw('uPlanszaPx', [szer, wys]);
          const k = kamera();
          ustaw('uWidok', [k.x, k.y, k.scrollX, k.scrollY]);
          // Phaser trzyma płótno w rozmiarze gry (skalowanie idzie stylami CSS),
          // więc wysokość gry jest tu zarazem wysokością bufora karty.
          ustaw('uWysokoscBufora', scena.scale.height);
        },
      },
      0,
      0,
      szer,
      wys,
      ['plansza-0', 'woda-maska', 'woda-zmarszczki']
    );
    return kwadrat.setOrigin(0, 0);
  } catch {
    return null;
  }
}
