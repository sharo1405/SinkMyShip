import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { coordLabel, type Coord } from '@sinkmyship/game';

/** Which side of the grid shows the row numbers. */
export type RowLabelSide = 'start' | 'end';

/**
 * What a cell shows: open water, a placed ship, a block of the ship being placed, or the
 * result of a shot at it (a sunk ship's blocks show `sunk`).
 */
export type CellMark = 'water' | 'ship' | 'draft' | 'miss' | 'hit' | 'sunk';

interface BoardCell {
  readonly at: Coord;
  /** Coordinate such as `B3`: column letter, then row number. */
  readonly coord: string;
  /** Unique DOM id: `<idPrefix>-<coord>`, e.g. `player-B3`. */
  readonly id: string;
  readonly mark: CellMark;
  readonly glyph: string;
  readonly rejected: boolean;
  /** In the row or column of a radar scan being shown. */
  readonly scanned: boolean;
  /** A ship square a radar scan found: drawn with a white border on top of its mark. */
  readonly radar: boolean;
  /** Accessible name, e.g. `B3, ship`. */
  readonly name: string;
}

interface BoardRow {
  readonly number: number;
  readonly cells: readonly BoardCell[];
}

const MARK_NAMES: Record<CellMark, string> = {
  water: 'water',
  ship: 'ship',
  draft: 'ship being placed',
  miss: 'miss',
  hit: 'hit',
  sunk: 'sunk',
};

/** Shape drawn in shot cells, so results never rely on colour alone. */
const MARK_GLYPHS: Record<CellMark, string> = {
  water: '',
  ship: '',
  draft: '',
  miss: '•',
  hit: '✕',
  sunk: '✕',
};

const key = ({ row, col }: Coord): string => `${row},${col}`;

/**
 * A square board of `size` × `size` cells. Columns are lettered A, B, C… across the top and
 * rows numbered 1, 2, 3… down the `rowLabelSide` (left for `start`, right for `end`).
 * Every cell gets a page-unique id built from `idPrefix` and its coordinate.
 *
 * Ship and draft cells are filled with `shipColor`; shots show grey with a dot (miss) or
 * red with a cross (hit, sunk). The `rejected` cell gets a dashed red border (dashed, so it
 * doesn't rely on colour alone). With `interactive`, every cell is a button that emits
 * `cellClick`. Rendered as a table so screen readers announce each cell's column and row
 * headers.
 *
 * Radar results are an overlay, separate from the marks: `scannedCells` are lightly tinted
 * and `radarCells` get a white border, while each cell keeps its own mark, so a hidden ship
 * stays water underneath. `aiming` shows a crosshair cursor over the cells.
 */
@Component({
  selector: 'app-board',
  styleUrl: './board.scss',
  templateUrl: './board.html',
  host: {
    '[style.--ship-color]': 'shipColor()',
  },
})
export class Board {
  readonly size = input.required<number>();
  readonly idPrefix = input.required<string>();
  /** Caption shown above the board and used as its accessible name. */
  readonly label = input.required<string>();
  readonly rowLabelSide = input<RowLabelSide>('start');
  readonly shipCells = input<readonly Coord[]>([]);
  readonly draftCells = input<readonly Coord[]>([]);
  readonly missCells = input<readonly Coord[]>([]);
  readonly hitCells = input<readonly Coord[]>([]);
  readonly sunkCells = input<readonly Coord[]>([]);
  readonly rejected = input<Coord | null>(null);
  readonly scannedCells = input<readonly Coord[]>([]);
  readonly radarCells = input<readonly Coord[]>([]);
  readonly aiming = input(false, { transform: booleanAttribute });
  readonly shipColor = input<string | null>(null);
  readonly interactive = input(false, { transform: booleanAttribute });

  readonly cellClick = output<Coord>();

  /** Column letters; boards are at most 26 wide. */
  protected readonly columns = computed(() =>
    Array.from({ length: this.size() }, (_, i) => String.fromCharCode(65 + i)),
  );

  protected readonly rows = computed<readonly BoardRow[]>(() => {
    const prefix = this.idPrefix();
    // Later layers win: a hit ship cell shows the hit, not the ship.
    const marks = new Map<string, CellMark>();
    const layers: [CellMark, readonly Coord[]][] = [
      ['ship', this.shipCells()],
      ['draft', this.draftCells()],
      ['miss', this.missCells()],
      ['hit', this.hitCells()],
      ['sunk', this.sunkCells()],
    ];
    for (const [mark, cells] of layers) {
      for (const c of cells) marks.set(key(c), mark);
    }
    const rejected = this.rejected();
    const rejectedKey = rejected ? key(rejected) : null;
    const scanned = new Set(this.scannedCells().map(key));
    const radar = new Set(this.radarCells().map(key));

    return Array.from({ length: this.size() }, (_, row) => ({
      number: row + 1,
      cells: Array.from({ length: this.size() }, (_, col): BoardCell => {
        const at = { row, col };
        const coord = coordLabel(at);
        const k = key(at);
        const mark = marks.get(k) ?? 'water';
        const isRejected = k === rejectedKey;
        const isRadar = radar.has(k);
        return {
          at,
          coord,
          id: `${prefix}-${coord}`,
          mark,
          glyph: MARK_GLYPHS[mark],
          rejected: isRejected,
          scanned: scanned.has(k),
          radar: isRadar,
          name:
            `${coord}, ${MARK_NAMES[mark]}` +
            (isRadar ? ', radar: ship square' : '') +
            (isRejected ? ', not allowed' : ''),
        };
      }),
    }));
  });
}
