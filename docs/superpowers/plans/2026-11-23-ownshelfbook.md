# OwnShelfBook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-user, browser-only website to catalogue comics/books per volume and arrange them on customizable 3D shelves placed in a 3D room.

**Architecture:** Pure TypeScript domain modules (books, shelves, placement, backup) hold every rule and are unit-tested. A Zustand store applies domain functions and writes through to IndexedDB (Dexie). React renders a 2D Collection page and a 3D Room page (React Three Fiber) that both read the same store.

**Tech Stack:** Vite, React 18+, TypeScript (strict), Zustand, Dexie, @react-three/fiber, @react-three/drei, Vitest, @testing-library/react, jsdom, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-23-ownshelfbook-design.md` — read it alongside this plan. UI copy is in **Indonesian**.

## Global Constraints

- **Commits (see `CLAUDE.md`):** commit as often and as small as possible — the "Commit" step in each task is a minimum, not the only commit. Commit at least after the failing test, after the passing implementation, and after each new file/component, dependency or config change. Never add Claude as co-author: no `Co-Authored-By` trailer, no "Generated with Claude Code" line.

- Single user, single device, no server, no login. Static build (`npm run build` → `dist/`).
- Persistence: IndexedDB via Dexie; every change auto-saved.
- All dimensions in **centimeters** in data and domain code. The 3D scene renders cm data inside a root `<group scale={0.01}>` so the camera works in meters.
- Default book sizes: komik thickness 1.5 cm, height 18 cm; buku thickness 3 cm, height 21 cm.
- Rows/columns are only added/removed **at the end** (top row, rightmost column). Row index 0 = bottom, col index 0 = left as seen from the front.
- Books are **never deleted** as a side effect: shrinking/deleting a shelf returns them to "Belum ditata" (placement `null`) after a confirmation that states the count.
- No auto-flow into the next slot when a slot is full; overflow is allowed and flagged.
- No undo/redo. Risky actions (delete book, delete/shrink shelf, import) require a confirm dialog.
- Import replaces all data; never merges.
- Backup file name: `ownshelfbook-backup-YYYY-MM-DD.json`, content `{ version, room, shelves, books }`. Current `version` = `1`.
- Desktop-first; target ~2,000 books and ~20 shelves without stutter.
- Out of scope for v1: accounts/sync, cover images, modular/round/corner shelves, multi-room, wall snapping, ISBN lookup, undo, auto-fill.

## Review Focus

1. **Corrupt or foreign import file** (not JSON, wrong `version`, missing fields): reject with a message and leave existing data untouched. Test → Task 5.
2. **Bad bulk-add ranges** (from > to, non-integers, range > 500 volumes): refuse with a message, create nothing. Test → Task 2.
3. **Nonsense shelf dimensions** typed in the panel (0, negative, empty, NaN): clamp to a minimum of 5 cm / maximum of 300 cm; never produce invisible or NaN geometry. Test → Task 3.
4. **Room resized smaller than the shelf layout**: shelves are clamped back inside the room instead of being lost outside. Test → Task 3.
5. **Deleting a placed book or removing books from a slot**: the remaining books in that slot keep a contiguous `order` (0..n-1) so the slot renders without gaps or collisions. Test → Task 4.

---

## File Structure

```
src/
  domain/
    types.ts          Book, Shelf, Room, Placement, ShelfModel, BookType, AppData
    books.ts          createBook, createSeriesBooks, seriesColor, BOOK_DEFAULTS
    shelves.ts        SHELF_PRESETS, createShelf, shelfSize, slotRect, resizeShelf,
                      clampDim, clampShelfToRoom, shelvesOverlap
    placement.ts      placeBooks, unplaceBooks, moveInSlot, booksInSlot, slotUsage,
                      countBooksOutside, returnBooksOutside, normalizeOrders
    search.ts         searchBooks
    backup.ts         BACKUP_VERSION, toBackup, parseBackup, backupFileName
  persistence/
    db.ts             Dexie database (tables: books, shelves, meta)
    repo.ts           loadAll, saveBooks, deleteBooks, saveShelves, deleteShelf, saveRoom, replaceAll
  store/
    dataStore.ts      useDataStore (room, shelves, books + actions)
    uiStore.ts        useUiStore (page, mode, selection, focus)
  ui/
    App.tsx           top bar (nav, search, export/import), page switch
    collection/       CollectionPage.tsx, BookForm.tsx, SeriesForm.tsx
    room/             RoomPage.tsx, UnplacedList.tsx, ShelfPanel.tsx, SlotPanel.tsx, RoomSettings.tsx
    scene/            Scene.tsx, RoomMesh.tsx, ShelfMesh.tsx, BooksMesh.tsx, CameraFocus.tsx
    common/           ConfirmDialog.tsx, NumberField.tsx
  main.tsx
tests/                mirrors src/ (domain/*.test.ts, persistence/*.test.ts, store/*.test.ts, ui/*.test.tsx)
```

---

### Task 1: Project scaffold + domain types + book creation

**Files:**
- Create: Vite React-TS project at repo root (keep `docs/`), `vitest.config.ts` (or `test` block in `vite.config.ts`), `tests/setup.ts`
- Create: `src/domain/types.ts`, `src/domain/books.ts`
- Test: `tests/domain/books.test.ts`

**Interfaces:**
- Produces (`types.ts`): exactly the `Book`, `Shelf`, `Room`, `ShelfModel`, `BookType` interfaces from spec §6.2, plus
  `type Placement = NonNullable<Book['placement']>`,
  `type SlotRef = { shelfId: string; row: number; col: number }`,
  `interface AppData { room: Room; shelves: Shelf[]; books: Book[] }`.
- Produces (`books.ts`):
  - `BOOK_DEFAULTS: Record<BookType, { thicknessCm: number; heightCm: number }>`
  - `seriesColor(name: string): string` — deterministic hex color from a string hash (same input → same output).
  - `createBook(input: { title: string; type: BookType; series?: string; volume?: number; author?: string; notes?: string; color?: string }): Book` — `id` via `crypto.randomUUID()`, `placement: null`, sizes from `BOOK_DEFAULTS`, color defaults to `seriesColor(series ?? title)`, `createdAt: Date.now()`. Throws `Error('Judul wajib diisi')` on blank title.

- [ ] **Step 1: Scaffold and tooling**

Run `git init`, scaffold Vite `react-ts` into the repo root without touching `docs/`, install deps:
`npm i zustand dexie three @react-three/fiber @react-three/drei` and
`npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb @types/three`.
Configure Vitest with `environment: 'jsdom'`, `setupFiles: ['tests/setup.ts']` (`setup.ts` imports `fake-indexeddb/auto` and `@testing-library/jest-dom/vitest`). Add script `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests** in `tests/domain/books.test.ts`

```ts
test('createBook komik uses komik defaults', () => {
  const b = createBook({ title: 'Naruto', type: 'komik', series: 'Naruto', volume: 3 });
  expect(b).toMatchObject({ title: 'Naruto', volume: 3, thicknessCm: 1.5, heightCm: 18, placement: null });
  expect(b.id).toBeTruthy();
});
test('createBook buku uses buku defaults', () => {
  expect(createBook({ title: 'Laskar Pelangi', type: 'buku' })).toMatchObject({ thicknessCm: 3, heightCm: 21 });
});
test('createBook rejects blank title', () => {
  expect(() => createBook({ title: '  ', type: 'buku' })).toThrow('Judul wajib diisi');
});
test('seriesColor is deterministic and hex', () => {
  expect(seriesColor('Naruto')).toBe(seriesColor('Naruto'));
  expect(seriesColor('Naruto')).toMatch(/^#[0-9a-f]{6}$/);
});
test('books of the same series share default color', () => {
  expect(createBook({ title: 'A', type: 'komik', series: 'One Piece' }).color)
    .toBe(createBook({ title: 'B', type: 'komik', series: 'One Piece' }).color);
});
```

- [ ] **Step 3: Run** `npm test -- books` → FAIL (module not found).
- [ ] **Step 4: Implement** `types.ts` and `books.ts` per Interfaces.
- [ ] **Step 5: Run** `npm test -- books` → PASS. Run `npm run build` → succeeds.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: scaffold app; feat: book domain types and creation"` (add a `.gitignore` with `node_modules` and `dist` first).

---

### Task 2: Bulk add series

**Files:**
- Modify: `src/domain/books.ts`
- Test: `tests/domain/books.test.ts`

**Interfaces:**
- Consumes: `createBook` (Task 1).
- Produces: `createSeriesBooks(input: { series: string; type: BookType; from: number; to: number; author?: string }): Book[]` — one book per volume, `title = series`, `volume = n`, ascending. Throws `Error` with an Indonesian message when: series blank; `from`/`to` not positive integers; `from > to`; `to - from + 1 > 500`. Also exports `MAX_SERIES_BATCH = 500`.

- [ ] **Step 1: Failing tests**

```ts
test('creates volumes from..to inclusive', () => {
  const books = createSeriesBooks({ series: 'Naruto', type: 'komik', from: 1, to: 72 });
  expect(books).toHaveLength(72);
  expect(books[0].volume).toBe(1); expect(books[71].volume).toBe(72);
  expect(new Set(books.map(b => b.id)).size).toBe(72);
});
test.each([
  [{ from: 5, to: 1 }], [{ from: 0, to: 3 }], [{ from: 1.5, to: 3 }], [{ from: 1, to: 501 }],
])('rejects bad range %o', (r) => {
  expect(() => createSeriesBooks({ series: 'X', type: 'komik', ...r })).toThrow();
});
test('rejects blank series', () => {
  expect(() => createSeriesBooks({ series: '', type: 'komik', from: 1, to: 2 })).toThrow();
});
```

- [ ] **Step 2: Run** `npm test -- books` → FAIL.
- [ ] **Step 3: Implement** `createSeriesBooks`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: bulk add series volumes`.

---

### Task 3: Shelf presets and geometry

**Files:**
- Create: `src/domain/shelves.ts`
- Test: `tests/domain/shelves.test.ts`

**Interfaces:**
- Consumes: `Shelf`, `ShelfModel`, `Room` (Task 1).
- Produces:
  - `SHELF_PRESETS: Record<ShelfModel, { label: string; rowHeightsCm: number[]; colWidthsCm: number[]; depthCm: number; elevationCm: number; hasBackPanel: boolean }>` with values:
    - `rak-buku` "Rak buku": rows `[33,33,33,33,33]`, cols `[76]`, depth 30, elevation 0, back panel true
    - `kubus` "Rak kubus": rows `[33,33,33,33]`, cols `[33,33,33,33]`, depth 35, elevation 0, back panel false
    - `dinding` "Rak dinding": rows `[25,25]`, cols `[100]`, depth 20, elevation 120, back panel false
    - `rendah` "Rak rendah": rows `[35,35]`, cols `[40,40,40]`, depth 35, elevation 0, back panel true
  - `DEFAULT_BOARD_CM = 2`, `DEFAULT_SHELF_COLOR = '#b08355'`, `DIM_MIN_CM = 5`, `DIM_MAX_CM = 300`.
  - `createShelf(model: ShelfModel, name: string, position?: {x:number; z:number}): Shelf` — copies preset arrays (no shared references), `rotationY: 0`.
  - `shelfSize(s: Shelf): { width: number; height: number; depth: number }` — width = Σcols + (cols+1)·board; height = Σrows + (rows+1)·board; depth = depthCm.
  - `slotRect(s: Shelf, row: number, col: number): { x: number; y: number; width: number; height: number }` — inner slot box in shelf-local cm; local origin = center of the footprint at the shelf's base (bottom board underside); `x` = left edge of slot relative to center, `y` = top surface of the board under the slot.
  - `clampDim(v: number): number` — NaN/≤0 → `DIM_MIN_CM`; clamp to `[DIM_MIN_CM, DIM_MAX_CM]`.
  - `resizeShelf(s: Shelf, rows: number, cols: number): Shelf` — rows/cols clamped to 1..20; add at the end by repeating the last height/width; remove from the end.
  - `clampShelfToRoom(s: Shelf, room: Room): Shelf` — keeps the rotated footprint's axis-aligned bounding box inside `[-room.widthCm/2, room.widthCm/2] × [-room.depthCm/2, room.depthCm/2]`.
  - `shelvesOverlap(a: Shelf, b: Shelf): boolean` — oriented-rectangle (SAT) intersection of footprints; touching edges = false.

- [ ] **Step 1: Failing tests** (assert these exact values)

```ts
test('shelfSize of rak-buku', () => {
  expect(shelfSize(createShelf('rak-buku', 'R'))).toEqual({ width: 80, height: 177, depth: 30 });
});
test('slotRect bottom-left of kubus', () => {
  // width = 4*33 + 5*2 = 142 → left edge -71, first slot starts after one board
  expect(slotRect(createShelf('kubus', 'K'), 0, 0)).toEqual({ x: -69, y: 2, width: 33, height: 33 });
});
test('slotRect row 1 col 1 of kubus', () => {
  expect(slotRect(createShelf('kubus', 'K'), 1, 1)).toEqual({ x: -34, y: 37, width: 33, height: 33 });
});
test('presets are not shared by reference', () => {
  const a = createShelf('rak-buku', 'A'); a.rowHeightsCm[0] = 99;
  expect(createShelf('rak-buku', 'B').rowHeightsCm[0]).toBe(33);
});
test('resizeShelf adds and removes at the end', () => {
  const s = { ...createShelf('rendah', 'R'), rowHeightsCm: [20, 40], colWidthsCm: [10, 30, 50] };
  expect(resizeShelf(s, 3, 2)).toMatchObject({ rowHeightsCm: [20, 40, 40], colWidthsCm: [10, 30] });
});
test.each([[0, 5], [-3, 5], [NaN, 5], [1000, 300], [42, 42]])('clampDim(%s) = %s', (i, o) => {
  expect(clampDim(i)).toBe(o);
});
test('clampShelfToRoom pulls an outside shelf back in', () => {
  const s = { ...createShelf('rak-buku', 'R'), position: { x: 1000, z: 0 } };
  const c = clampShelfToRoom(s, { widthCm: 400, depthCm: 300, heightCm: 260 });
  expect(c.position.x).toBe(200 - 40);
});
test('shelvesOverlap', () => {
  const a = createShelf('rak-buku', 'A', { x: 0, z: 0 });
  expect(shelvesOverlap(a, createShelf('rak-buku', 'B', { x: 50, z: 0 }))).toBe(true);
  expect(shelvesOverlap(a, createShelf('rak-buku', 'C', { x: 80, z: 0 }))).toBe(false);
  expect(shelvesOverlap(a, { ...createShelf('rak-buku', 'D', { x: 60, z: 0 }), rotationY: 90 })).toBe(false);
});
```

- [ ] **Step 2: Run** `npm test -- shelves` → FAIL.
- [ ] **Step 3: Implement** `shelves.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: shelf presets and geometry`.

---

### Task 4: Placement rules

**Files:**
- Create: `src/domain/placement.ts`
- Test: `tests/domain/placement.test.ts`

**Interfaces:**
- Consumes: `Book`, `Shelf`, `SlotRef` (Task 1), `slotRect` (Task 3).
- Produces (all pure, return new arrays, never mutate):
  - `booksInSlot(books: Book[], slot: SlotRef): Book[]` — sorted by `order`.
  - `placeBooks(books: Book[], ids: string[], slot: SlotRef): Book[]` — appends `ids` (in given order) after existing books in the slot; books moved from another slot leave a contiguous order behind.
  - `unplaceBooks(books: Book[], ids: string[]): Book[]` — sets `placement: null`, re-normalizes affected slots.
  - `moveInSlot(books: Book[], id: string, newIndex: number): Book[]` — reorder within its slot.
  - `normalizeOrders(books: Book[]): Book[]` — per slot, re-numbers `order` to 0..n-1 keeping the relative order.
  - `slotUsage(books: Book[], shelf: Shelf, row: number, col: number): { usedCm: number; capacityCm: number; overflow: boolean; tooTall: boolean }` — `usedCm` = Σ thickness; `capacityCm` = slot width; `tooTall` = any book height > slot height.
  - `countBooksOutside(books: Book[], shelfId: string, rows: number, cols: number): number` — books on that shelf with `row >= rows || col >= cols`.
  - `returnBooksOutside(books: Book[], shelfId: string, rows: number, cols: number): Book[]` — those books → `placement: null`. Deleting a shelf = `returnBooksOutside(books, id, 0, 0)`.

- [ ] **Step 1: Failing tests** — build fixtures with `createBook` + `createShelf('kubus', …)`; assert:
  - `placeBooks` three books into empty slot → orders `[0,1,2]`; placing two more → `[3,4]`.
  - moving the middle book of a 3-book slot to another slot → origin orders `[0,1]` (Review Focus #5).
  - `unplaceBooks` of the first book → remaining orders `[0,1]` and the removed book has `placement === null` (Review Focus #5).
  - `moveInSlot(id of order 2, 0)` → that book has order 0, others 1 and 2.
  - `slotUsage` with 23 komik (34.5 cm) in a 33 cm slot → `{ usedCm: 34.5, capacityCm: 33, overflow: true }`; 22 komik → `overflow: false`.
  - `slotUsage` with one buku (21 cm) in a slot with height 20 → `tooTall: true`.
  - shelf with books at (row 3, col 0) and (row 0, col 3): `countBooksOutside(books, id, 3, 4)` = 1; `countBooksOutside(books, id, 3, 3)` = 2; `returnBooksOutside(books, id, 3, 3)` leaves both with `placement === null` and does not reduce `books.length`.
  - books on a different shelf are untouched by `returnBooksOutside`.
- [ ] **Step 2: Run** `npm test -- placement` → FAIL.
- [ ] **Step 3: Implement** `placement.ts`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: placement rules`.

---

### Task 5: Persistence and backup

**Files:**
- Create: `src/persistence/db.ts`, `src/persistence/repo.ts`, `src/domain/backup.ts`
- Test: `tests/persistence/repo.test.ts`, `tests/domain/backup.test.ts`

**Interfaces:**
- Consumes: `AppData`, `Book`, `Shelf`, `Room` (Task 1).
- Produces:
  - `db.ts`: Dexie DB named `ownshelfbook`, version 1, tables `books: 'id, series, placement.shelfId'`, `shelves: 'id'`, `meta: 'key'` (room stored as `{ key: 'room', value: Room }`).
  - `DEFAULT_ROOM: Room = { widthCm: 500, depthCm: 400, heightCm: 260 }`.
  - `repo.ts`: `loadAll(): Promise<AppData>` (returns `DEFAULT_ROOM` + empty arrays on a fresh DB), `saveBooks(b: Book[])`, `deleteBooks(ids: string[])`, `saveShelves(s: Shelf[])`, `deleteShelf(id: string)`, `saveRoom(r: Room)`, `replaceAll(d: AppData)` (single transaction: clear + bulkPut), `requestPersistentStorage(): Promise<boolean>` (calls `navigator.storage?.persist?.()`, false if unavailable). All writes return `Promise<void>`.
  - `backup.ts`: `BACKUP_VERSION = 1`, `toBackup(d: AppData): string` (pretty JSON `{ version, room, shelves, books }`), `parseBackup(text: string): AppData` — throws `Error` (Indonesian message) if not JSON, `version !== 1`, or any book/shelf/room lacks required fields with correct primitive types; `backupFileName(date: Date): string` → `ownshelfbook-backup-YYYY-MM-DD.json` (local date).

- [ ] **Step 1: Failing tests**
  - repo: fresh DB → `loadAll()` equals `{ room: DEFAULT_ROOM, shelves: [], books: [] }`; save 2 books + 1 shelf + room, `loadAll()` returns them; `deleteBooks` removes; `replaceAll` replaces everything (old ids gone). Reset DB between tests (`await db.delete(); await db.open()`).
  - backup: `parseBackup(toBackup(data))` deep-equals `data`; `parseBackup('nope')`, `parseBackup('{"version":2,...}')`, and a payload whose book lacks `title` each throw (Review Focus #1); `backupFileName(new Date(2026, 10, 3))` = `ownshelfbook-backup-2026-11-03.json`.
- [ ] **Step 2: Run** `npm test -- repo backup` → FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: IndexedDB persistence and backup format`.

---

### Task 6: Stores

**Files:**
- Create: `src/store/dataStore.ts`, `src/store/uiStore.ts`
- Test: `tests/store/dataStore.test.ts`

**Interfaces:**
- Consumes: all domain functions (Tasks 1–5), repo (Task 5).
- Produces `useDataStore` (Zustand) with state `{ loaded: boolean; room: Room; shelves: Shelf[]; books: Book[] }` and async actions (each updates state, then awaits the matching repo write):
  - `hydrate()`; `addBook(input)`; `addSeries(input)`; `updateBook(id, patch: Partial<Omit<Book,'id'|'placement'>>)`; `deleteBooks(ids)` (normalizes orders of affected slots);
  - `addShelf(model: ShelfModel): string` (name `"Rak N"`, positioned at room center, clamped; returns id); `updateShelf(id, patch: Partial<Shelf>)` (applies `clampDim` to every dimension and `clampShelfToRoom`); `resizeShelf(id, rows, cols)` (calls `returnBooksOutside` first); `duplicateShelf(id): string` (offset +20 cm x, clamped, no books); `deleteShelf(id)` (returns its books first);
  - `placeBooks(ids, slot)`; `unplaceBooks(ids)`; `moveInSlot(id, index)`;
  - `setRoom(room)` (clamps every shelf into the new room — Review Focus #4); `importData(text: string)` (uses `parseBackup`; on throw rethrows and leaves state and DB untouched); `exportData(): string`.
- Produces `useUiStore`: `{ page: 'room' | 'collection'; mode: 'tata' | 'isi'; selectedShelfId: string | null; selectedSlot: SlotRef | null; checkedBookIds: string[]; highlightBookId: string | null; focusShelfId: string | null }` with plain setters `setPage`, `setMode`, `selectShelf`, `selectSlot`, `toggleChecked`, `clearChecked`, `focusBook(id: string | null)` (also sets `focusShelfId` to that book's shelf), `focusShelf(id: string | null)`. Store actions `placeBooks`/`resizeShelf` share names with domain functions; alias the domain imports. Switching mode clears `selectedSlot`.

Confirmation dialogs live in the UI, not the store; the UI uses `countBooksOutside` to word them before calling `resizeShelf`/`deleteShelf`.

- [ ] **Step 1: Failing tests** (reset store + DB in `beforeEach`)
  - `addSeries` 1–3 then `hydrate()` on a fresh store instance → 3 books reloaded from DB.
  - place 3 books in kubus slot (3,3), `resizeShelf(id, 3, 4)` → 3 books still in `books`, all `placement === null`.
  - `deleteShelf` keeps the books, unplaced.
  - `updateShelf(id, { depthCm: -10 })` → `depthCm === 5`.
  - `setRoom({ widthCm: 100, depthCm: 100, heightCm: 260 })` with a shelf at x = 200 → shelf x within bounds.
  - `importData('garbage')` rejects; `books` and DB unchanged (Review Focus #1).
- [ ] **Step 2: Run** `npm test -- dataStore` → FAIL.
- [ ] **Step 3: Implement** both stores.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: data and UI stores`.

---

### Task 7: App shell + Collection page

**Files:**
- Create: `src/ui/App.tsx`, `src/ui/common/ConfirmDialog.tsx`, `src/ui/common/NumberField.tsx`, `src/ui/collection/CollectionPage.tsx`, `BookForm.tsx`, `SeriesForm.tsx`; modify `src/main.tsx`
- Test: `tests/ui/collection.test.tsx`

**Interfaces:**
- Consumes: `useDataStore`, `useUiStore` (Task 6).
- Produces: `<App/>` (calls `hydrate()` and `requestPersistentStorage()` on mount, shows "Memuat…" until `loaded`; top bar: "OwnShelfBook", tabs "Ruang 3D" / "Koleksi", search slot (filled in Task 11), "Ekspor"/"Impor" slots (Task 11)); `<ConfirmDialog open title message confirmLabel onConfirm onCancel/>`; `<NumberField label value onChange min max step/>` (commits on blur/Enter, never emits NaN).
- Collection page: books grouped by `series ?? title`, sorted by volume; each row shows title, volume, type, status ("Ditata: <rak> T<row+1>K<col+1>" or "Belum ditata"); filter by type (Semua/Komik/Buku) and status (Semua/Ditata/Belum ditata); buttons "Tambah buku", "Tambah berseri" (forms show domain error messages inline); edit (title, series, volume, type, author, notes, color, thickness, height); delete with ConfirmDialog "Hapus N buku?".

- [ ] **Step 1: Failing tests** (Testing Library, real store with fake-indexeddb)
  - Fill "Tambah berseri" with Naruto, komik, 1–5, submit → 5 rows visible under group "Naruto".
  - Submit series with from 5 to 1 → error message visible, 0 books (Review Focus #2).
  - Delete a book → confirm dialog appears; after confirm the row is gone.
- [ ] **Step 2: Run** `npm test -- collection` → FAIL.
- [ ] **Step 3: Implement** the components.
- [ ] **Step 4: Run** → PASS; `npm run dev`, add a series manually, reload the page → data still there.
- [ ] **Step 5: Commit** `feat: app shell and collection page`.

---

### Task 8: 3D scene rendering (read-only)

**Files:**
- Create: `src/ui/scene/Scene.tsx`, `RoomMesh.tsx`, `ShelfMesh.tsx`, `BooksMesh.tsx`, `src/ui/room/RoomPage.tsx`
- Test: `tests/ui/scene-math.test.ts` (only the pure layout helper below)

**Interfaces:**
- Consumes: `shelfSize`, `slotRect`, `SHELF_PRESETS`, `booksInSlot` (Tasks 3–4), stores (Task 6).
- Produces:
  - `layoutBooksInSlot(books: Book[], rect: {x,y,width,height}): { id: string; x: number; y: number; width: number; height: number; visible: boolean }[]` (export from `BooksMesh.tsx` or a sibling `layout.ts`) — books stand left→right starting at `rect.x`; `x` = book's center; a book whose right edge exceeds `rect.x + rect.width` gets `visible: false` (spec leaves overflow drawing to builder; this plan hides overflowed books).
  - `<Scene/>`: Canvas, root `<group scale={0.01}>`, lights, `OrbitControls` (makeDefault), `RoomMesh` (floor + two back walls sized from `room`), one `ShelfMesh` per shelf (boards as boxes: bottom/top/sides, inner horizontal + vertical dividers, back panel if preset says so; at `position.x, elevationCm, position.z`, rotated `rotationY`), `BooksMesh` drawing all placed books with a single `InstancedMesh` (per-instance color), spine text (`drei <Text>` with "title volume", rotated onto the spine) only when the camera is within 2.5 m of that shelf.
  - `RoomPage`: layout from spec §6.4 — left `UnplacedList` slot, center `<Scene/>`, right panel slot, mode toggle "Tata" / "Isi".

- [ ] **Step 1: Failing test** for `layoutBooksInSlot`: 3 books of 10 cm in rect `{x:0, y:2, width:25, height:30}` → centers 5 and 15 visible, third `visible: false`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** helper + components. **Step 4: Run** → PASS.
- [ ] **Step 5: Visual check** — `npm run dev`; create shelves of all 4 models via the store from the console or temporary seed; place books; verify in the browser: boards align with books, dividers sit at the configured widths, wall shelf floats at 120 cm, 2,000 placed books keep orbiting smooth. Remove any temporary seed code.
- [ ] **Step 6: Commit** `feat: render room, shelves and books in 3D`.

---

### Task 9: Mode Tata (arrange shelves)

**Files:**
- Create: `src/ui/room/ShelfPanel.tsx`, `src/ui/room/RoomSettings.tsx`; modify `Scene.tsx`, `ShelfMesh.tsx`, `RoomPage.tsx`
- Modify: `src/domain/shelves.ts` (add `snapPosition`, `snapRotation`)
- Test: `tests/domain/shelves.test.ts`, `tests/ui/shelfPanel.test.tsx`

**Interfaces:**
- Consumes: store actions `addShelf`, `updateShelf`, `resizeShelf`, `duplicateShelf`, `deleteShelf`, `setRoom`; `shelvesOverlap`, `countBooksOutside`.
- Produces:
  - `snapPosition(p: {x,z}, gridCm = 5): {x,z}`; `snapRotation(deg: number, stepDeg = 15): number` (normalized to 0..359).
  - Interaction: in mode "tata", click a shelf → `selectShelf` (selected shelf drawn with an outline/emissive tint); dragging a selected shelf moves it on the floor plane (raycast to y = 0, snapped, clamped; OrbitControls disabled while dragging; persisted on pointer-up); rotate buttons ⟲/⟳ ±15° in the panel, plus an angle field; shelves that overlap any other shelf tint red.
  - "+ Tambah rak" menu listing the 4 preset labels → `addShelf` then select it.
  - `ShelfPanel`: name, model (read-only label), color, depth, elevation (only for `dinding`), rows count, cols count, one `NumberField` per row height (labelled "Tingkat 1" = bottom) and per column width ("Kolom 1" = left), buttons "Duplikat" and "Hapus rak". Reducing rows/cols or deleting: if `countBooksOutside > 0`, ConfirmDialog "N buku akan dikembalikan ke Belum ditata" before acting.
  - `RoomSettings` (gear button): width/depth/height `NumberField`s → `setRoom`.

- [ ] **Step 1: Failing tests** — `snapPosition({x: 12.4, z: -7.6})` = `{x: 10, z: -10}`; `snapRotation(-20)` = 345; `snapRotation(368)` = 15. Panel test: shelf with 2 books in the top row, change rows from 5 to 4 → dialog text contains "2 buku akan dikembalikan ke Belum ditata"; cancel → rows still 5; confirm → rows 4.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Visual check** in the browser: add each model, drag, rotate, overlap turns red, shrink the room → shelves move inside, reload keeps layout.
- [ ] **Step 6: Commit** `feat: arrange mode for shelves`.

---

### Task 10: Mode Isi (fill shelves)

**Files:**
- Create: `src/ui/room/UnplacedList.tsx`, `src/ui/room/SlotPanel.tsx`; modify `ShelfMesh.tsx`, `RoomPage.tsx`
- Test: `tests/ui/fill.test.tsx`

**Interfaces:**
- Consumes: store `placeBooks`, `unplaceBooks`, `moveInSlot`; `booksInSlot`, `slotUsage`; ui `selectSlot`, `toggleChecked`, `clearChecked`.
- Produces:
  - In mode "isi" shelves cannot be dragged; each slot has an invisible hit box (from `slotRect`) → click → `selectSlot`; the selected slot is outlined; overflowed slots show a warning tint.
  - `UnplacedList` (left, visible in both modes): unplaced books grouped by series with a text filter, checkbox per book and per series group ("pilih semua volume"), count of checked.
  - `SlotPanel` (right, mode isi): header "<rak> · Tingkat r · Kolom c", capacity bar "usedCm / capacityCm cm" with "Meluap" warning when `overflow` and "Ada buku lebih tinggi dari tingkat" when `tooTall`; ordered list with ↑/↓ (`moveInSlot`) and "Keluarkan" (`unplaceBooks`); button "Taruh di slot ini (N)" enabled when a slot is selected and N > 0 → `placeBooks(checked, slot)` then `clearChecked`.
  - A "Fokus ke rak" button in `SlotPanel` sets `focusShelfId`; `CameraFocus` (Task 11) consumes it. Until Task 11 lands the button may be a no-op.
  - Drag from list into 3D is **not** in this task (nice-to-have; skip).

- [ ] **Step 1: Failing test** — with a selected slot (set via `useUiStore`), check 3 books in `UnplacedList`, click "Taruh di slot ini (3)" → SlotPanel lists 3 books, UnplacedList no longer shows them; click "Keluarkan" on one → it returns to UnplacedList and SlotPanel shows 2.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Visual check** — place 40 komik in a 33 cm slot: "Meluap" shows, overflowed books hidden in 3D, all 40 still listed.
- [ ] **Step 6: Commit** `feat: fill mode for placing books`.

---

### Task 11: Search, focus, export/import

**Files:**
- Create: `src/domain/search.ts`, `src/ui/scene/CameraFocus.tsx`; modify `App.tsx`, `Scene.tsx`, `BooksMesh.tsx`
- Test: `tests/domain/search.test.ts`, `tests/ui/backup.test.tsx`

**Interfaces:**
- Consumes: `useDataStore.exportData/importData`, `backupFileName`, `useUiStore.focusBook`.
- Produces:
  - `searchBooks(books: Book[], query: string, limit = 20): Book[]` — case-insensitive match on title/series/author; a trailing number in the query matches `volume` (e.g. "naruto 34" → Naruto vol 34 first). Empty query → `[]`.
  - Top-bar search box with a results dropdown ("Naruto 34 — Rak 1 T2K1" or "Belum ditata"). Choosing a placed book → `setPage('room')`, `focusBook(id)`: `CameraFocus` animates OrbitControls target/camera to that shelf, the book's slot is outlined and the book instance highlighted for ~3 s. Choosing an unplaced book → room page, `UnplacedList` filter set to its title and the row highlighted.
  - "Ekspor" downloads `exportData()` as `backupFileName(new Date())` (Blob + temporary `<a download>`).
  - "Impor" opens a file picker → ConfirmDialog "Ganti semua data dengan isi file ini?" → `importData(text)`; on error show the message in an alert/toast, data unchanged.

- [ ] **Step 1: Failing tests** — `searchBooks` with Naruto 1–72 and "One Piece" 1–3: `"naruto 34"` → first result volume 34; `"piece"` → 3 results; `""` → `[]`. Import UI: choose a file containing `"oops"` → confirm → error text visible, book count unchanged.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: End-to-end check** in the browser: export, delete a book, import the file → book restored; search a placed volume → camera flies to it.
- [ ] **Step 6: Final verification** — `npm test` all green, `npm run build` succeeds, `npx tsc --noEmit` clean.
- [ ] **Step 7: Commit** `feat: search, camera focus, export and import`.
