# Per-row Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every shelf row (tingkat) gets its own column count and column widths, while the shelf keeps one inner width so it stays a rectangle.

**Architecture:** `Shelf.colWidthsCm` becomes `number[][]` (one list per row) plus a new `Shelf.innerWidthCm`. Pure shape functions in `src/domain/shelves.ts` keep the invariant; the store gets one `reshapeShelf` action that replaces the old `resizeShelf`; old data is migrated in Dexie v2 and backup v2 (v1 still importable).

**Tech Stack:** unchanged (React, R3F, Zustand, Dexie, Vitest).

**Spec:** `docs/superpowers/specs/2026-11-23-per-row-columns-design.md` (extends `2026-11-23-ownshelfbook-design.md`). UI copy in Indonesian.

## Global Constraints

- **Commits (see `CLAUDE.md`):** commit as often and as small as possible; at least after each failing test and each passing implementation. Never add Claude as co-author.
- Invariant for every row r: `Σ colWidthsCm[r] + (colWidthsCm[r].length − 1) × boardThicknessCm = innerWidthCm`.
- Column width minimum 5 cm (`DIM_MIN_CM`); columns per row 1..20 (`MAX_ROWS_COLS`).
- Outer shelf width = `innerWidthCm + 2 × boardThicknessCm`.
- Presets must render exactly as before (rak-buku outer 80 cm, kubus outer 142 cm).
- Shrinking a row's column count unplaces books in removed columns after a confirm stating the count; books are never deleted.
- Widths are rounded to 0.1 cm; rounding remainder always goes to the row's last column.
- Backup `BACKUP_VERSION = 2`; v1 files import by converting each shelf's flat `colWidthsCm` to every row.

## Review Focus

1. **Column width typed larger than the room in its row** (would push the last column below 5 cm): clamp so the last column is exactly 5 cm. Test → Task 1.
2. **"Lebar rak" made smaller than the busiest row needs** (`n × 5 + (n − 1) × board`): clamp the inner width up to that minimum; no column below 5 cm. Test → Task 1.
3. **Existing IndexedDB data and v1 backup files**: shelves convert with books keeping their placements. Test → Task 3.
4. **Reducing one row's column count with books in removed columns**: confirm, unplace those books only; books in other rows and in kept columns stay. Test → Tasks 2 and 6.
5. **Imported v2 file whose row widths don't add up or whose `colWidthsCm` length ≠ row count**: lengths mismatch → rejected; widths that don't add up → refit to `innerWidthCm`. Test → Tasks 3 and 4.

---

## File Structure

- `src/domain/types.ts` — `Shelf.colWidthsCm: number[][]`, new `Shelf.innerWidthCm`; `ShelfV1` type for migration.
- `src/domain/shelves.ts` — presets (flat pattern), `createShelf`, geometry, and new shape functions + `migrateShelfV1`.
- `src/domain/placement.ts` — `countBooksOutside` / `returnBooksOutside` take a shelf layout.
- `src/persistence/db.ts` — Dexie version 2 with upgrade.
- `src/domain/backup.ts` — v2 format, v1 accepted.
- `src/store/dataStore.ts` — `reshapeShelf` replaces `resizeShelf`; sanitize/import refit rows.
- `src/ui/scene/ShelfMesh.tsx`, `SlotHits.tsx`, `BooksMesh.tsx`, `src/ui/room/SlotPanel.tsx` — per-row column loops.
- `src/ui/room/ShelfPanel.tsx` — per-row editor.

---

### Task 1: Shelf shape model

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/shelves.ts`
- Test: `tests/domain/shelves.test.ts` (replace the two `resizeShelf` tests; keep the rest)

**Interfaces:**
- Produces (`types.ts`): `Shelf.colWidthsCm: number[][]`, `Shelf.innerWidthCm: number`; `type ShelfV1 = Omit<Shelf, 'colWidthsCm' | 'innerWidthCm'> & { colWidthsCm: number[] }`.
- Produces (`shelves.ts`), all pure, returning new objects:
  - `SHELF_PRESETS` unchanged (its `colWidthsCm` stays a flat pattern copied to every row).
  - `createShelf(model, name, position?)` → every row gets a copy of the preset pattern; `innerWidthCm = Σpattern + (n−1)·board`.
  - `shelfSize(s)` → width = `innerWidthCm + 2·board`.
  - `slotRect(s, row, col)` → x uses `colWidthsCm[row]`.
  - `columnCount(s: Shelf, row: number): number`.
  - `minInnerWidth(s: Shelf): number` = max over rows of `n·DIM_MIN_CM + (n−1)·board`.
  - `fitRow(widths: number[], innerWidthCm: number, board: number): number[]` — clamp each non-last width to ≥ 5, round to 0.1, then lower widths from the right (stopping at 5) until the last column = remainder ≥ 5.
  - `setRowCount(s: Shelf, rows: number): Shelf` — clamp 1..20; remove from top; new rows copy height and columns of the current top row.
  - `setColumnCount(s: Shelf, row: number, count: number): Shelf` — clamp 1..20 and so that `count·5 + (count−1)·board ≤ innerWidthCm`; equal split rounded to 0.1, remainder to last.
  - `setColumnWidth(s: Shelf, row: number, col: number, widthCm: number): Shelf` — ignored for the last column; otherwise set then `fitRow`.
  - `setInnerWidth(s: Shelf, innerWidthCm: number): Shelf` — clamp to `[minInnerWidth(s), 1000]`; scale every row proportionally then `fitRow`.
  - `migrateShelfV1(s: ShelfV1): Shelf` — copy the flat list to each row, compute `innerWidthCm`.
  - Remove `resizeShelf`.

- [ ] **Step 1: Failing tests** (replace the old `resizeShelf` tests)

```ts
test('presets render as before', () => {
  expect(shelfSize(createShelf('rak-buku', 'R')).width).toBe(80);
  expect(createShelf('kubus', 'K')).toMatchObject({ innerWidthCm: 138 });
  expect(createShelf('kubus', 'K').colWidthsCm).toEqual([[33, 33, 33, 33], [33, 33, 33, 33], [33, 33, 33, 33], [33, 33, 33, 33]]);
});
test('slotRect follows the row own columns', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 1, 2); // inner 76 → [37, 37]
  expect(s.colWidthsCm[1]).toEqual([37, 37]);
  expect(slotRect(s, 1, 1)).toMatchObject({ x: -40 + 2 + 37 + 2, width: 37 });
  expect(slotRect(s, 0, 0)).toMatchObject({ x: -38, width: 76 });
});
test('setColumnCount splits equally with remainder in the last column', () => {
  expect(setColumnCount(createShelf('rak-buku', 'R'), 0, 3).colWidthsCm[0]).toEqual([24, 24, 24]); // 76-4=72
  const s = { ...createShelf('rak-buku', 'R'), innerWidthCm: 77, colWidthsCm: [[77], [77], [77], [77], [77]] };
  expect(setColumnCount(s, 0, 3).colWidthsCm[0]).toEqual([24.3, 24.3, 24.4]);
});
test('setColumnCount cannot squeeze columns below 5 cm', () => {
  const s = setInnerWidth(createShelf('rak-buku', 'R'), 30);
  expect(columnCount(setColumnCount(s, 0, 20), 0)).toBe(4); // 4·5+3·2 = 26 ≤ 30, 5 cols = 33 > 30
});
test('setColumnWidth: last column absorbs the change', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 0, 2);
  expect(setColumnWidth(s, 0, 0, 50).colWidthsCm[0]).toEqual([50, 24]);
});
test('setColumnWidth clamps so the last column keeps 5 cm (Review Focus #1)', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 0, 2);
  expect(setColumnWidth(s, 0, 0, 500).colWidthsCm[0]).toEqual([69, 5]);
});
test('setInnerWidth scales rows and respects the minimum (Review Focus #2)', () => {
  const s = setColumnCount(createShelf('rak-buku', 'R'), 0, 2); // row 0 [37,37], others [76]
  const wide = setInnerWidth(s, 154);
  expect(wide.colWidthsCm[0]).toEqual([76, 76]);
  expect(wide.colWidthsCm[1]).toEqual([154]);
  expect(setInnerWidth(s, 1).innerWidthCm).toBe(12); // 2·5 + 2
});
test('setRowCount copies the top row when growing', () => {
  const s = setColumnCount(createShelf('rendah', 'R'), 1, 2);
  const g = setRowCount(s, 3);
  expect(g.rowHeightsCm).toEqual([35, 35, 35]);
  expect(g.colWidthsCm[2]).toEqual(g.colWidthsCm[1]);
  expect(setRowCount(s, 0).rowHeightsCm).toHaveLength(1);
});
test('fitRow keeps the invariant', () => {
  expect(fitRow([10, 10, 10], 50, 2)).toEqual([10, 10, 26]);
  expect(fitRow([40, 40], 50, 2)).toEqual([40, 8]);
  expect(fitRow([3, 100, 1], 50, 2)).toEqual([5, 36, 5]); // widths sum to 46, every column ≥ 5
});
test('migrateShelfV1 copies the flat pattern to every row', () => {
  const { innerWidthCm: _i, colWidthsCm: _c, ...rest } = createShelf('kubus', 'K');
  const m = migrateShelfV1({ ...rest, colWidthsCm: [30, 40] });
  expect(m.colWidthsCm).toEqual([[30, 40], [30, 40], [30, 40], [30, 40]]);
  expect(m.innerWidthCm).toBe(72);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/domain/shelves.test.ts` → FAIL (missing exports).
- [ ] **Step 3: Implement** the types and functions listed in Interfaces. Commit types separately from functions.
- [ ] **Step 4: Run** → PASS. (Other test files and `tsc` will be red until Tasks 2–6; that is expected inside this branch.)
- [ ] **Step 5: Commit** `feat: per-row column shape model`.

---

### Task 2: Placement against a per-row layout

**Files:** Modify `src/domain/placement.ts`; Test `tests/domain/placement.test.ts`.

**Interfaces:**
- Consumes: `Shelf` (Task 1).
- Produces: `type ShelfLayout = Pick<Shelf, 'id' | 'rowHeightsCm' | 'colWidthsCm'>`;
  `countBooksOutside(books: Book[], layout: ShelfLayout): number` and `returnBooksOutside(books: Book[], layout: ShelfLayout): Book[]` — a book on `layout.id` is outside when `row >= rowHeightsCm.length` or `col >= colWidthsCm[row].length`. Deleting a shelf = layout with `rowHeightsCm: [], colWidthsCm: []`.

- [ ] **Step 1: Failing tests** — update the "books outside a shrunk shelf" block to the new signature, plus (Review Focus #4):

```ts
test('shrinking one row only unplaces books in that row removed columns', () => {
  const s = createShelf('kubus', 'K');
  const [a, b, c] = Array.from({ length: 3 }, () => createBook({ title: 'X', type: 'komik' }));
  const books: Book[] = [
    { ...a, placement: { shelfId: s.id, row: 1, col: 3, order: 0 } }, // removed
    { ...b, placement: { shelfId: s.id, row: 1, col: 0, order: 0 } }, // kept
    { ...c, placement: { shelfId: s.id, row: 2, col: 3, order: 0 } }, // other row, kept
  ];
  const next = setColumnCount(s, 1, 2);
  expect(countBooksOutside(books, next)).toBe(1);
  const r = returnBooksOutside(books, next);
  expect(r.map((x) => x.placement === null)).toEqual([true, false, false]);
});
```
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run tests/domain` → PASS.
- [ ] **Step 5: Commit** `feat: books outside a per-row shelf layout`.

---

### Task 3: Migration — IndexedDB v2 and backup v2

**Files:** Modify `src/persistence/db.ts`, `src/domain/backup.ts`; Test `tests/persistence/migration.test.ts`, `tests/domain/backup.test.ts`.

**Interfaces:**
- Consumes: `migrateShelfV1`, `ShelfV1` (Task 1).
- Produces: `db.version(2).stores({...same...}).upgrade(tx => tx.table('shelves').toCollection().modify(...))` converting any shelf whose `colWidthsCm[0]` is a number; `BACKUP_VERSION = 2`; `parseBackup` accepts `version` 1 (shelves validated as v1 then `migrateShelfV1`) or 2 (validates `innerWidthCm` number, `colWidthsCm` array of non-empty number lists with `length === rowHeightsCm.length`, else throws).

- [ ] **Step 1: Failing tests**
  - migration (Review Focus #3): `await db.delete(); db.close();` open a raw `new Dexie('ownshelfbook')` with `version(1)` and the v1 stores, put a v1 shelf (`colWidthsCm: [33, 33]`, 3 rows) and a book placed at row 2 col 1, close it; `await db.open()`; `loadAll()` → shelf `colWidthsCm` `[[33,33],[33,33],[33,33]]`, `innerWidthCm` 68, book placement unchanged.
  - backup: a v1 payload (`version: 1`, flat `colWidthsCm`) parses to per-row lists; v2 round trip still equal; v2 with `colWidthsCm` length ≠ rows throws (Review Focus #5); `toBackup` writes `"version": 2`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run tests/domain/backup.test.ts tests/persistence` → PASS.
- [ ] **Step 5: Commit** `feat: migrate shelves to per-row columns in IndexedDB and backups`.

---

### Task 4: Store — `reshapeShelf`

**Files:** Modify `src/store/dataStore.ts`; Tests `tests/store/dataStore.test.ts`, `tests/store/dataStoreErrors.test.ts`.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `reshapeShelf(id: string, shape: Shelf): Promise<void>` replaces `resizeShelf` — sanitizes `shape` (keeps `id`), runs `returnBooksOutside(books, shape)`, commits books + shelf in one `commit` (rollback on failure, as today). `sanitizeShelf` now: rows capped at 20, each row capped at 20 columns, `innerWidthCm` clamped to `[minInnerWidth, 1000]` (non-finite → current sum), every row passed through `fitRow` (Review Focus #5). `deleteShelf` uses an empty layout. `normaliseImport` checks `col < colWidthsCm[row].length`.

- [ ] **Step 1: Failing tests** — update existing `resizeShelf` tests to `reshapeShelf(id, setRowCount(shelf, 3))`; add:
  - `reshapeShelf(id, setColumnCount(shelf, 1, 2))` with books at (1,3) and (1,0) → only (1,3) unplaced, in store and `loadAll()`.
  - import of a v2 file whose row 0 widths are `[10, 10]` with `innerWidthCm` 80 → row 0 refit to `[10, 68]`.
  - update `dataStoreErrors` "resize is all-or-nothing" to `reshapeShelf(id, setRowCount(shelf, 2))`; update "nonsense sizes" to per-row lists (`colWidthsCm: Array(4).fill(Array(50).fill(30))` → each row length 20).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run tests/store` → PASS.
- [ ] **Step 5: Commit** `feat: reshape shelves with per-row columns in the store`.

---

### Task 5: 3D and slot panel use per-row columns

**Files:** Modify `src/ui/scene/ShelfMesh.tsx` (`shelfBoards`), `src/ui/scene/SlotHits.tsx`, `src/ui/scene/BooksMesh.tsx` (`placedBookBoxes`), `src/ui/room/SlotPanel.tsx` (validity check); Test `tests/ui/scene-math.test.ts`.

**Interfaces:** Consumes `columnCount`, `slotRect` (Task 1). `shelfBoards` vertical dividers: for each row r and each c ≥ 1, a board at `x = slotRect(s, r, c).x − b/2`, `y` = row slot center, height = `rowHeightsCm[r]`.

- [ ] **Step 1: Failing test** — `shelfBoards(setColumnCount(createShelf('rak-buku','R'), 0, 3))` has `4 + 4 + 2 + 1` boards, and the two `v` boards sit at y = `2 + 33/2`. The kubus count becomes `4 + 3 + 12` (3 dividers × 4 rows, previously 3 full-height dividers) — update that expectation.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the four files. **Step 4: Run** `npx vitest run` → all green; `npx tsc -b --noEmit` clean.
- [ ] **Step 5: Commit** `feat: draw and pick per-row columns in 3D`.

---

### Task 6: Shelf panel per-row editor

**Files:** Modify `src/ui/room/ShelfPanel.tsx`, `src/styles.css`; Test `tests/ui/shelfPanel.test.tsx`; Docs: update `docs/superpowers/specs/2026-11-23-ownshelfbook-design.md` §6.2/§6.4 to point at the new spec.

**Interfaces:** Consumes `reshapeShelf` (Task 4), `setRowCount`, `setColumnCount`, `setColumnWidth`, `setInnerWidth`, `countBooksOutside` (Tasks 1–2). Every shape edit: compute `next` with a domain function; if `countBooksOutside(books, next) > 0` show the confirm ("N buku akan dikembalikan ke Belum ditata", confirm label "Kurangi"), else `reshapeShelf`.

UI labels (exact, used by tests): `Lebar rak` (shows the **outer** width `innerWidthCm + 2·board`; on change call `setInnerWidth(value − 2·board)`), `Jumlah tingkat`, per row a group `Tingkat N` (N = 1 is bottom) containing `Tinggi tingkat N`, `Jumlah kolom tingkat N`, width fields `Tingkat N kolom M` for every column except the last, and the last as read-only text `Kolom M: W cm (otomatis)`. The global `Jumlah kolom` and the separate "Lebar tiap kolom" section are removed.

- [ ] **Step 1: Failing tests** — rewrite the panel tests:
  - shrinking `Jumlah tingkat` with books in the top row still confirms (existing behaviour).
  - set `Jumlah kolom tingkat 2` to 2 → `colWidthsCm[1]` = `[37, 37]`, other rows unchanged, no dialog.
  - with a book at (1, 1) after that, set `Jumlah kolom tingkat 2` to 1 → dialog "1 buku akan dikembalikan ke Belum ditata"; confirm → book unplaced (Review Focus #4).
  - type 50 in `Tingkat 1 kolom 1` (row 0 has 2 cols) → `[50, 24]` and text `Kolom 2: 24 cm (otomatis)` visible.
  - `Lebar rak` 100 → `innerWidthCm` 96.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run` → all green; `npx tsc -b --noEmit`; `npm run build`.
- [ ] **Step 5: Browser check** — in `npm run dev`, set different column counts per row on a rak buku; dividers and books line up per row; reload keeps it.
- [ ] **Step 6: Commit** (panel, styles and docs as separate commits).
