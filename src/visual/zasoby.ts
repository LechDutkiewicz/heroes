import Phaser from 'phaser';
import { WERSJA } from '../wersja';

/**
 * Znacznik budowania doklejany do adresów wczytywanych plików.
 *
 * Po co
 * -----
 * Vite nadaje kodowi i stylom nazwy z odciskiem treści, więc po wdrożeniu
 * zawsze pobiera się nowa wersja. Pliki z `public/` nazw nie zmieniają — trawa
 * to zawsze `mapa/teren/teren-trawa.png` — więc przeglądarka podaje je
 * z pamięci podręcznej i gracz po wdrożeniu ogląda starą grafikę. Z zewnątrz
 * wygląda to dokładnie jak niewdrożona zmiana i tak właśnie zostało zgłoszone.
 *
 * Dlaczego tak, a nie przy każdym `load.image`
 * --------------------------------------------
 * Wywołań wczytywania są dziesiątki w trzech scenach i każde nowe trzeba by
 * pamiętać. Phaser zgłasza zdarzenie przy DODAWANIU pliku do kolejki, a adres
 * przelicza dopiero przy pobieraniu — jest więc jedno miejsce, w którym da się
 * dopisać znacznik wszystkim naraz i nie da się o nim zapomnieć.
 *
 * Znacznikiem jest ODCISK COMMITA, ten sam, którym podpisuje się build.
 * Wcześniej był to znacznik czasu budowania, co działało, ale unieważniało
 * pamięć podręczną także wtedy, gdy nic się nie zmieniło. Odcisk commita
 * zmienia się dokładnie wtedy, gdy zmienia się zawartość.
 */
export function wersjonujZasoby(scena: Phaser.Scene) {
  scena.load.on(
    Phaser.Loader.Events.ADD,
    (_klucz: string, _typ: string, _loader: unknown, plik: { url?: unknown }) => {
      // Pliki podane jako gotowe dane (base64, obiekt JSON) nie mają adresu.
      if (typeof plik.url !== 'string' || plik.url.startsWith('data:')) return;
      if (plik.url.includes('?')) return;
      plik.url = `${plik.url}?v=${WERSJA.commit}`;
    }
  );
}
