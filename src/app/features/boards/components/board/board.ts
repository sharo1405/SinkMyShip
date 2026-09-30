import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { coordLabel, type Coord } from '@sinkmyship/game';

/** Which side of the grid shows the row numbers. */
export type RowLabelSide = 'start' | 'end';

/** What a cell shows: open water, a placed ship, or a block of the ship being placed. */
export type CellMark = 'water' | 'ship' | 'draft';

interface BoardCell {
  readonly at: Coord;
  /** Coordinate such as `B3`: column letter, then row number. */
  readonly coord: string;
  /** Unique DOM id: `<idPrefix>-<coord>`, e.g. `player-B3`. */
  readonly id: string;
  readonly mark: CellMark;
  readonly rejected: boolean;
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
};

const key = ({ row, col }: Coord): string => `${row},${col}`;

/**
 * A square board of `size` × `size` cells. Columns are lettered A, B, C… across the top and
 * rows numbered 1, 2, 3… down the `rowLabelSide` (left for `start`, right for `end`).
 * Every cell gets a page-unique id built from `idPrefix` and its coordinate.
 *
 * Ship and draft cells are filled with `shipColor`; the `rejected` cell gets a dashed red
 * border (dashed, so it doesn't rely on colour alone). With `interactive`, every cell is a
 * button that emits `cellClick`. Rendered as a table so screen readers announce each cell's
 * column and row headers.
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
  readonly rejected = input<Coord | null>(null);
  readonly shipColor = input<string | null>(null);
  readonly interactive = input(false, { transform: booleanAttribute });

  readonly cellClick = output<Coord>();

  /** Column letters; boards are at most 26 wide. */
  protected readonly columns = computed(() =>
    Array.from({ length: this.size() }, (_, i) => String.fromCharCode(65 + i)),
  );

  protected readonly rows = computed<readonly BoardRow[]>(() => {
    const prefix = this.idPrefix();
    const ships = new Set(this.shipCells().map(key));
    const draft = new Set(this.draftCells().map(key));
    const rejected = this.rejected();
    const rejectedKey = rejected ? key(rejected) : null;

    return Array.from({ length: this.size() }, (_, row) => ({
      number: row + 1,
      cells: Array.from({ length: this.size() }, (_, col): BoardCell => {
        const at = { row, col };
        const coord = coordLabel(at);
        const k = key(at);
        const mark: CellMark = ships.has(k) ? 'ship' : draft.has(k) ? 'draft' : 'water';
        const isRejected = k === rejectedKey;
        return {
          at,
          coord,
          id: `${prefix}-${coord}`,
          mark,
          rejected: isRejected,
          name: `${coord}, ${MARK_NAMES[mark]}${isRejected ? ', not allowed' : ''}`,
        };
      }),
    }));
  });
}
