import { TestBed } from '@angular/core/testing';
import type { Coord } from '@sinkmyship/game';
import { Board } from './board';

async function render(inputs: {
  size: number;
  idPrefix: string;
  label: string;
  rowLabelSide?: 'start' | 'end';
  shipCells?: readonly Coord[];
  draftCells?: readonly Coord[];
  rejected?: Coord | null;
  interactive?: boolean;
  shielded?: boolean;
  alert?: boolean;
}) {
  const fixture = TestBed.createComponent(Board);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const text = (els: NodeListOf<Element>) => [...els].map((e) => e.textContent?.trim());
  return { fixture, root, text };
}

describe('Board', () => {
  it('letters the columns, numbers the rows and captions the table', async () => {
    const { root, text } = await render({ size: 4, idPrefix: 'player', label: 'You' });

    expect(root.querySelector('caption')?.textContent?.trim()).toBe('You');
    expect(text(root.querySelectorAll('th[scope="col"]'))).toEqual(['A', 'B', 'C', 'D']);
    expect(text(root.querySelectorAll('th[scope="row"]'))).toEqual(['1', '2', '3', '4']);
    expect(root.querySelectorAll('td.cell').length).toBe(16);
  });

  it('gives every cell a unique id from the prefix and its coordinate', async () => {
    const { root } = await render({ size: 6, idPrefix: 'computer', label: 'Computer' });
    const ids = [...root.querySelectorAll('td.cell')].map((c) => c.id);

    expect(ids.length).toBe(36);
    expect(new Set(ids).size).toBe(36);
    expect(ids[0]).toBe('computer-A1');
    expect(ids[7]).toBe('computer-B2');
    expect(ids.at(-1)).toBe('computer-F6');
  });

  it('puts the row numbers first by default and last for rowLabelSide "end"', async () => {
    const start = await render({ size: 4, idPrefix: 'p', label: 'P' });
    const firstRow = start.root.querySelector('tbody tr');
    expect(firstRow?.firstElementChild?.tagName).toBe('TH');
    expect(firstRow?.lastElementChild?.tagName).toBe('TD');

    const end = await render({ size: 4, idPrefix: 'c', label: 'C', rowLabelSide: 'end' });
    const row = end.root.querySelector('tbody tr');
    expect(row?.firstElementChild?.tagName).toBe('TD');
    expect(row?.lastElementChild?.tagName).toBe('TH');
    expect(row?.lastElementChild?.textContent?.trim()).toBe('1');
  });

  it('marks ship, draft and rejected cells and names them for screen readers', async () => {
    const { root } = await render({
      size: 4,
      idPrefix: 'player',
      label: 'You',
      shipCells: [{ row: 0, col: 0 }],
      draftCells: [{ row: 1, col: 1 }],
      rejected: { row: 2, col: 2 },
    });

    expect(root.querySelector('#player-A1')?.classList).toContain('ship');
    expect(root.querySelector('#player-A1')?.textContent?.trim()).toBe('A1, ship');
    expect(root.querySelector('#player-B2')?.classList).toContain('draft');
    expect(root.querySelector('#player-C3')?.classList).toContain('rejected');
    expect(root.querySelectorAll('.ship, .draft, .rejected').length).toBe(3);
    expect(root.querySelector('button')).toBeNull();
  });

  it('turns cells into buttons that emit their coordinate when interactive', async () => {
    const { fixture, root } = await render({
      size: 4,
      idPrefix: 'player',
      label: 'You',
      rejected: { row: 0, col: 1 },
      interactive: true,
    });
    const clicked: Coord[] = [];
    fixture.componentInstance.cellClick.subscribe((c) => clicked.push(c));

    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.length).toBe(16);
    expect(buttons[1]?.getAttribute('aria-label')).toBe('B1, water, not allowed');
    root.querySelector<HTMLButtonElement>('button[aria-label="C2, water"]')?.click();

    expect(clicked).toEqual([{ row: 1, col: 2 }]);
  });

  it('draws the shield ring and the alert on an overlay around the cells, not the host', async () => {
    const { fixture, root } = await render({ size: 6, idPrefix: 'player', label: 'You' });
    const ring = () => root.querySelector('.frame > .cell-ring');
    expect(ring()).toBeNull();

    fixture.componentRef.setInput('shielded', true);
    await fixture.whenStable();
    expect(ring()?.classList).toContain('shielded');
    expect(ring()?.classList).not.toContain('end');
    expect(ring()?.getAttribute('aria-hidden')).toBe('true');
    // A sibling of the table, so the caption and labels stay outside it.
    expect(ring()?.previousElementSibling?.tagName).toBe('TABLE');
    expect(root.classList).not.toContain('shielded');
    expect(root.style.getPropertyValue('--board-size')).toBe('6');

    fixture.componentRef.setInput('shielded', false);
    fixture.componentRef.setInput('alert', true);
    await fixture.whenStable();
    expect(ring()?.classList).toContain('alert');
    expect(ring()?.classList).not.toContain('shielded');
    expect(root.classList).not.toContain('alert');

    fixture.componentRef.setInput('alert', false);
    await fixture.whenStable();
    expect(ring()).toBeNull();
  });

  it('places the ring past the row numbers on either side', async () => {
    const { root } = await render({
      size: 8,
      idPrefix: 'computer',
      label: 'Computer',
      rowLabelSide: 'end',
      shielded: true,
    });
    expect(root.querySelector('.cell-ring')?.classList).toContain('end');
    expect(root.style.getPropertyValue('--board-size')).toBe('8');
  });
});
