/**
 * Siatka sześciokątna w układzie „odd-r", jak plansza bitwy w Heroes 3.
 *
 * Hexy stoją wierzchołkiem do góry, a rzędy nieparzyste są przesunięte o pół
 * hexa w prawo. Każdy hex ma sześciu sąsiadów w tej samej odległości — znika
 * problem kwadratów, gdzie skos jest albo zakazany, albo tańszy niż powinien.
 *
 * Tu siedzi sama matematyka siatki, bez rysowania — dzięki temu da się ją
 * przetestować bez uruchamiania gry.
 */

export interface Cell {
  col: number;
  row: number;
}

/**
 * Przesunięcia do sześciu sąsiadów. Zależą od parzystości rzędu, bo rzędy
 * nieparzyste są odsunięte w prawo: [rzędy parzyste, rzędy nieparzyste].
 */
export const HEX_DIRS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [
    [1, 0],
    [0, -1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ],
  [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [0, 1],
    [1, 1],
  ],
];

/** Sąsiedzi mieszczący się w granicach planszy. */
export function hexNeighbours(cell: Cell, cols: number, rows: number): Cell[] {
  return HEX_DIRS[cell.row & 1]
    .map(([dc, dr]) => ({ col: cell.col + dc, row: cell.row + dr }))
    .filter((c) => c.col >= 0 && c.col < cols && c.row >= 0 && c.row < rows);
}

/**
 * Współrzędne trójosiowe („cube"). W nich odległość na hexach to zwykła suma
 * różnic podzielona na pół — w układzie kolumna/rząd nie liczy się jej wprost.
 */
export function toCube(c: Cell) {
  const x = c.col - (c.row - (c.row & 1)) / 2;
  return { x, y: -x - c.row, z: c.row };
}

export function hexDistance(a: Cell, b: Cell): number {
  const p = toCube(a);
  const q = toCube(b);
  return (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + Math.abs(p.z - q.z)) / 2;
}
