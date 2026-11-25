# Dua lapis per slot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setiap slot rak yang cukup dalam punya lapis Depan dan Belakang; lapis belakang berdiri di atas penyangga di 3D.

**Architecture:** Posisi buku mendapat kolom opsional `layer`; semua aturan slot (urutan, kapasitas, buku di luar slot) memakai lapis sebagai kunci tambahan. Rak mendapat `backRiserCm` opsional. Aturan "rak menjadi dangkal" masuk ke `countBooksOutside`/`returnBooksOutside` yang sudah ada sehingga konfirmasi ubah bentuk rak ikut menanganinya. Geometri 3D lapis belakang dihitung oleh fungsi murni baru.

**Tech Stack:** React 19, TypeScript 7, Zustand 5, Dexie 4, three / @react-three/fiber, shadcn/ui (Radix), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-25-double-stack-design.md`

## Global Constraints

- Lapis: `'depan' | 'belakang'`; posisi tanpa `layer` = `'depan'`. Tidak ada versi Dexie atau versi cadangan baru.
- Lapis belakang tersedia bila `shelf.depthCm >= 26` (`MIN_DOUBLE_DEPTH_CM`).
- Penyangga: `Shelf.backRiserCm` opsional, bawaan 5, rentang 0–15, dibulatkan 0,5 cm.
- Buku tidak pernah terhapus sebagai efek samping; yang kehilangan tempat kembali ke Belum ditata setelah konfirmasi.
- Label posisi: `Rak 1 T2K1` (depan), `Rak 1 T2K1 belakang` (belakang).
- Istilah UI: "lapis depan", "lapis belakang", "penyangga"; teks UI bahasa Indonesia.
- Commit kecil (Conventional Commits), tanpa trailer co-author; `npm test` dan `npm run build` tetap hijau kecuali commit `test:` yang sengaja merah.
- Gaya komponen shadcn ditulis sebagai class utility (CSS aplikasi ada di `@layer components`).

## Review Focus

1. Data lama tanpa `layer` dan file cadangan lama tanpa `layer`/`backRiserCm` → semua buku tetap di lapis depan, urutannya tidak berubah. (Task 2, Task 3)
2. Rak dibuat lebih dangkal dari 26 cm saat lapis belakang berisi → konfirmasi menyebut jumlah buku belakang; Batal tidak mengubah apa pun. (Task 6)
3. Urutan dua lapis independen: menaruh/memindah/mengeluarkan di satu lapis tidak menggeser `order` lapis lain. (Task 2)
4. Penyangga lebih tinggi dari slot, atau 0 → buku belakang tidak menembus papan atas maupun lapis depan. (Task 7)
5. Pencarian memilih buku di lapis belakang → panel slot langsung menampilkan lapis belakang. (Task 4)

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `src/domain/types.ts` | `Layer`, `Placement.layer?`, `Shelf.backRiserCm?` |
| `src/domain/shelves.ts` | konstanta + `canDoubleStack`, `riserOf`, `clampRiser` |
| `src/domain/placement.ts` | `layerOf`, aturan urutan/kapasitas per lapis, `moveToLayer`, aturan dangkal di `ShelfLayout` |
| `src/domain/backup.ts` | validasi `layer` dan `backRiserCm` |
| `src/store/dataStore.ts` | `placeBooks(…, layer)`, `moveToLayer`, sanitasi riser, impor |
| `src/store/uiStore.ts` | `slotLayer`, `setSlotLayer`, `selectSlot(slot, layer?)` |
| `src/ui/common/labels.ts` | label posisi dengan lapis |
| `src/ui/SearchBox.tsx` | buka lapis buku yang dipilih |
| `src/ui/room/SlotPanel.tsx` | pilihan lapis, isi per lapis, tombol pindah lapis |
| `src/ui/room/ShelfPanel.tsx` | kolom "Penyangga belakang", kedalaman lewat `reshape` |
| `src/ui/scene/layers.ts` (baru) | geometri z lapis belakang + penyangga |
| `src/ui/scene/BooksMesh.tsx` | buku per lapis + penyangga |
| `src/ui/scene/SlotHits.tsx` | merah bila salah satu lapis meluap |

---

### Task 1: Tipe dan aturan rak dua lapis

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/shelves.ts`
- Test: `tests/domain/shelves.test.ts`

**Interfaces:**
- Produces: `type Layer = 'depan' | 'belakang'`; `Placement` = `{ shelfId; row; col; order; layer?: Layer }`; `Shelf.backRiserCm?: number`.
- Produces (shelves.ts): `MIN_DOUBLE_DEPTH_CM = 26`, `DEFAULT_RISER_CM = 5`, `MAX_RISER_CM = 15`, `canDoubleStack(shelf: Pick<Shelf,'depthCm'>): boolean`, `riserOf(shelf: Pick<Shelf,'backRiserCm'>): number` (tidak ada/tidak sah → 5), `clampRiser(v: number): number` (0–15, kelipatan 0,5; NaN → 5).

- [ ] **Step 1: Write the failing tests**

```ts
test('two layers need a shelf at least 26 cm deep', () => {
  expect(canDoubleStack({ depthCm: 26 })).toBe(true);
  expect(canDoubleStack({ depthCm: 25.9 })).toBe(false);
  expect(canDoubleStack(createShelf('dinding', 'D'))).toBe(false);
  expect(canDoubleStack(createShelf('rak-buku', 'R'))).toBe(true);
});
test('riser defaults to 5 cm and is clamped to 0–15 in 0.5 steps', () => {
  expect(riserOf({})).toBe(5);
  expect(riserOf({ backRiserCm: 8 })).toBe(8);
  expect([clampRiser(-2), clampRiser(7.3), clampRiser(40), clampRiser(NaN)]).toEqual([0, 7.5, 15, 5]);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/domain/shelves.test.ts` — Expected: FAIL (`canDoubleStack` not exported).
- [ ] **Step 3: Commit test** — `git commit -m "test: shelves at least 26 cm deep hold two layers; riser defaults to 5 cm"`
- [ ] **Step 4: Implement** the types and the four exports above.
- [ ] **Step 5: Run** the test file — Expected: PASS; `npx tsc -b` clean.
- [ ] **Step 6: Commit** — `git commit -m "feat: layer type and double-stack shelf rules"`

### Task 2: Urutan, kapasitas, dan pindah lapis di domain

**Files:**
- Modify: `src/domain/placement.ts`
- Test: `tests/domain/placement.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `canDoubleStack`, `riserOf`.
- Produces:
  - `layerOf(p: Placement): Layer` (`p.layer ?? 'depan'`)
  - `booksInSlot(books, slot: SlotRef, layer?: Layer): Book[]` — tanpa `layer` = kedua lapis.
  - `normalizeOrders(books)` — kunci rak|tingkat|kolom|lapis.
  - `placeBooks(books, ids, slot, layer: Layer = 'depan')` — menulis `layer` eksplisit.
  - `moveInSlot(books, id, newIndex)` — di dalam lapis buku itu.
  - `moveToLayer(books, id, layer: Layer): Book[]` — ke ujung lapis tujuan; tak berubah bila belum ditata atau sudah di lapis itu.
  - `slotUsage(books, shelf, row, col, layer: Layer = 'depan')` — `tooTall` lapis belakang memakai `rect.height - riserOf(shelf)`.
  - `ShelfLayout = Pick<Shelf,'id'|'rowHeightsCm'|'colWidthsCm'> & { depthCm?: number }` — bila `depthCm` ada dan `< 26`, buku lapis belakang rak itu dihitung "di luar" oleh `countBooksOutside`/`returnBooksOutside`.

- [ ] **Step 1: Write the failing tests** (gunakan rak `kubus`, slot `{row:0,col:0}`):
  - `placeBooks(…, 'belakang')` memberi `layer: 'belakang'` dan `order` 0..n-1 terpisah dari lapis depan (lapis depan berisi 2 buku dengan order 0,1 tetap 0,1).
  - Buku dengan `placement` tanpa `layer` → `layerOf` = `'depan'`; `booksInSlot(books, slot, 'depan')` memuatnya.
  - `moveToLayer(books, idDepan0, 'belakang')` → buku itu `layer 'belakang'`, `order` = jumlah lama lapis belakang; buku depan sisanya dinormalkan ke 0..n-1.
  - `moveToLayer` pada buku yang belum ditata mengembalikan array yang sama (`toBe(books)`).
  - `moveInSlot` pada buku belakang hanya menukar urutan di lapis belakang.
  - `slotUsage(…, 'belakang')`: komik 18 cm di slot 33 cm dengan `backRiserCm: 16` → `tooTall: true`; dengan riser 5 → `false`. `usedCm` hanya menghitung lapis itu.
  - `countBooksOutside(books, { ...shelf, depthCm: 20 })` = jumlah buku belakang rak itu; `returnBooksOutside` mengosongkan hanya mereka; dengan `depthCm: 30` = 0.
- [ ] **Step 2: Run** `npx vitest run tests/domain/placement.test.ts` — Expected: FAIL.
- [ ] **Step 3: Commit test** — `git commit -m "test: per-layer order, capacity, layer moves and shallow-shelf rule"`
- [ ] **Step 4: Implement** the interfaces above in `placement.ts`.
- [ ] **Step 5: Run** `npm test` — Expected: all PASS (old tests unchanged).
- [ ] **Step 6: Commit** — `git commit -m "feat: books keep order and capacity per layer and can move between layers"`

### Task 3: Cadangan, impor, dan aksi store

**Files:**
- Modify: `src/domain/backup.ts`, `src/store/dataStore.ts`
- Test: `tests/domain/backup.test.ts`, `tests/store/dataStore.test.ts`

**Interfaces:**
- Consumes: Task 2 (`placeBooks`, `moveToLayer`, `returnBooksOutside` with depth), Task 1 (`clampRiser`, `canDoubleStack`).
- Produces (store): `placeBooks(ids: string[], slot: SlotRef, layer?: Layer): Promise<void>`, `moveToLayer(id: string, layer: Layer): Promise<void>`. `reshapeShelf` dan `updateShelf` meneruskan `depthCm` ke `returnBooksOutside` (reshape) sehingga buku belakang kembali bila rak < 26 cm. `sanitizeShelf` menjepit `backRiserCm` dengan `clampRiser` bila ada.

- [ ] **Step 1: Write the failing tests**
  - backup: buku dengan `placement.layer: 'belakang'` lolos; `layer: 'samping'` → error `buku ke-1`; rak dengan `backRiserCm: 'x'` → error `rak ke-1`; file lama tanpa kedua kolom tetap lolos.
  - store: `placeBooks(ids, slot, 'belakang')` tersimpan dan terbaca ulang setelah `hydrate` dengan `layer 'belakang'`.
  - store: `moveToLayer(id, 'belakang')` tersimpan.
  - store: `reshapeShelf(id, { ...shelf, depthCm: 20 })` dengan 2 buku belakang → keduanya `placement: null`, buku depan tetap.
  - store: `importData` dengan buku belakang pada rak `depthCm: 20` → buku itu `placement: null`; `backRiserCm: 99` → 15.
- [ ] **Step 2: Run** the two test files — Expected: FAIL.
- [ ] **Step 3: Commit test** — `git commit -m "test: backups, import and store actions understand layers"`
- [ ] **Step 4: Implement** validation in `checkBook`/`checkShelf`, the store actions, the depth-aware `reshapeShelf`, riser sanitising, and the import rule (in `normaliseImport`, after slot validation: back-layer books on a shelf where `!canDoubleStack` → `placement: null`).
- [ ] **Step 5: Run** `npm test` — Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: store, backup and import keep books on the back layer"`

### Task 4: Lapis di UI store, label posisi, dan pencarian

**Files:**
- Modify: `src/store/uiStore.ts`, `src/ui/common/labels.ts`, `src/ui/SearchBox.tsx`
- Test: `tests/store/uiStore.test.ts`, `tests/ui/search.test.tsx`, `tests/ui/collection.test.tsx`

**Interfaces:**
- Produces: `UiState.slotLayer: Layer` (awal `'depan'`), `setSlotLayer(layer: Layer)`, `selectSlot(slot: SlotRef | null, layer: Layer = 'depan')` menyetel `slotLayer` juga. `placementLabel(b, shelves)` menambah `" belakang"` untuk lapis belakang.

- [ ] **Step 1: Write the failing tests**
  - uiStore: `selectSlot(slot, 'belakang')` → `slotLayer 'belakang'`; `selectSlot(other)` → kembali `'depan'`.
  - collection: buku belakang tampil `Rak 1 T1K1 belakang`.
  - search: memilih buku belakang dari hasil → `slotLayer 'belakang'` dan `selectedSlot` slot buku itu.
- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Commit test** — `git commit -m "test: placement labels and search follow the layer"`
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** `npm test` — Expected: PASS. **Step 6: Commit** — `git commit -m "feat: placement labels and search open the book's layer"`

### Task 5: Panel slot per lapis

**Files:**
- Modify: `src/ui/room/SlotPanel.tsx`
- Test: `tests/ui/fill.test.tsx`

**Interfaces:**
- Consumes: store `placeBooks(ids, slot, layer)`, `moveToLayer`, `moveInSlot`, `unplaceBooks`; ui `slotLayer`, `setSlotLayer`; domain `booksInSlot(…, layer)`, `slotUsage(…, layer)`, `canDoubleStack`.
- UI (rak dua lapis): `ToggleGroup` `role="radiogroup"` `aria-label="Lapis"` dengan item `Depan`, `Belakang` (gaya seperti Tata/Isi di `RoomPage.tsx`). Untuk lapis terpilih: bar kapasitas, teks `x / y cm terisi · n buku`, peringatan, tombol `Taruh di slot ini (n)` (menaruh ke `slotLayer`), daftar isi dengan ↑ ↓ X dan tombol ikon pindah (`aria-label` `Pindah <judul> ke belakang` / `ke depan`, ikon lucide `ArrowLeftRight`). Ringkasan lapis lain: `Belakang: n buku` / `Depan: n buku`. Rak satu lapis: tanpa pilihan lapis dan tanpa tombol pindah (perilaku sekarang).

- [ ] **Step 1: Write the failing tests** (setup `kubus` seperti `fill.test.tsx`):
  - pilih radio `Belakang`, centang 2 buku, klik `Taruh di slot ini (2)` → `waitFor` kedua buku `layer 'belakang'`; region slot memuat `Depan: 0 buku`.
  - klik `Pindah Naruto 1 ke belakang` di lapis depan → buku itu `layer 'belakang'`.
  - rak `dinding`: tidak ada `radiogroup` `Lapis` dan tidak ada tombol `Pindah …`.
- [ ] **Step 2: Run** `npx vitest run tests/ui/fill.test.tsx` — Expected: FAIL. **Step 3: Commit test** — `git commit -m "test: slot panel places, lists and moves books per layer"`
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** `npm test` — Expected: PASS. **Step 6: Commit** — `git commit -m "feat: slot panel with front and back layers"`

### Task 6: Panel rak — penyangga dan kedalaman

**Files:**
- Modify: `src/ui/room/ShelfPanel.tsx`
- Test: `tests/ui/shelfPanel.test.tsx`

**Interfaces:**
- Consumes: `canDoubleStack`, `riserOf`, `clampRiser`, `MAX_RISER_CM`; `reshape()` di panel (sudah ada) dengan `countBooksOutside` yang kini sadar kedalaman.
- UI: bila `canDoubleStack(shelf)`, `NumberField label="Penyangga belakang"` (min 0, max 15, suffix cm) di bagian Bentuk → `updateShelf(id, { backRiserCm: clampRiser(v) })`. Kolom `Kedalaman` memakai `reshape({ ...shelf, depthCm: v })`.

- [ ] **Step 1: Write the failing tests**
  - `Penyangga belakang` tampil untuk `kubus` dengan nilai `5`; ubah ke `8{Enter}` → `backRiserCm 8`; tidak tampil untuk `dinding`.
  - `kubus` dengan 2 buku belakang: ubah `Kedalaman` ke `20{Enter}` → dialog berisi `2 buku akan dikembalikan ke Belum ditata`; `Batal` → `depthCm` tetap 35; ulangi dan konfirmasi `Kurangi` → buku belakang `placement: null`, `depthCm 20`.
- [ ] **Step 2: Run** — Expected: FAIL. **Step 3: Commit test** — `git commit -m "test: shelf panel sets the riser and confirms a shallower shelf"`
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Run** `npm test` — Expected: PASS. **Step 6: Commit** — `git commit -m "feat: riser height setting and depth changes that return back-layer books"`

### Task 7: 3D — lapis belakang dan penyangga

**Files:**
- Create: `src/ui/scene/layers.ts`
- Modify: `src/ui/scene/BooksMesh.tsx`, `src/ui/scene/SlotHits.tsx`
- Test: `tests/ui/scene-math.test.ts`

**Interfaces:**
- Produces (`layers.ts`):
  - `LAYER_GAP_CM = 0.5`
  - `backSpace(shelf: Shelf, frontDeepestCm: number): { zMin: number; zMax: number }` — rentang z (cm, lokal rak) untuk lapis belakang: `zMin = -depth/2 + (hasBackPanel ? 0.6 : 0)`, `zMax = depth/2 - 1 - frontDeepestCm - LAYER_GAP_CM`.
  - `backBookDepth(bookDepthCm: number, space: {zMin; zMax}): number` = `max(2, min(bookDepthCm, zMax - zMin - 1))`.
  - `backBookZ(depthCm: number, space): number` = `space.zMin + 1 + depthCm/2` (rata ke belakang).
  - `riserBox(slot: SlotBox, space, riserCm: number): { position: [number,number,number]; size: [number,number,number] } | null` — `null` bila `riserCm <= 0`; lebar `slot.width - 0.4`, tinggi `min(riserCm, slot.height)`, dalam `zMax - zMin`.
- `placedBookBoxes(books, shelves)`: lapis depan seperti sekarang; lapis belakang memakai rect `{ ...rect, y: rect.y + riser, height: max(0, rect.height - riser) }`, kedalaman/z dari fungsi di atas dengan `frontDeepestCm` = kedalaman buku depan terdalam di slot itu (0 bila kosong). Lean, variasi tinggi, dan garis punggung berlaku per lapis. `PlacedBook` mendapat `layer: Layer`.
- `BooksMesh` menggambar penyangga (instanced atau mesh biasa) untuk tiap slot yang lapis belakangnya berisi; warna kayu rak digelapkan (`bandColor` dari `bookLook.ts` boleh dipakai ulang).
- `SlotHits`: `over` = lapis depan atau belakang meluap.

- [ ] **Step 1: Write the failing tests**
  - `backSpace(rakBuku30Panel, 15)` → `{ zMin: -14.4, zMax: -1.5 }`; `backBookDepth(15, space)` = 11.9 (lebih tipis, tidak tembus); `backBookZ(11.9, space) + 11.9/2 <= space.zMax`.
  - kubus 35 tanpa panel, komik depan 13: `backBookDepth(13, backSpace(kubus, 13))` = 13.
  - `riserBox(slot33, space, 0)` → `null`; `riserBox(slot33, space, 40).size[1]` = 33.
  - `placedBookBoxes`: buku belakang di `kubus` punya `local[1]` (pusat y) = `slot.y + 5 + tinggi/2` dan `layer 'belakang'`; buku depan tak berubah.
- [ ] **Step 2: Run** `npx vitest run tests/ui/scene-math.test.ts` — Expected: FAIL. **Step 3: Commit test** — `git commit -m "test: back-layer depth, position and riser geometry"`
- [ ] **Step 4: Implement** `layers.ts`, then `placedBookBoxes`, riser drawing, `SlotHits`.
- [ ] **Step 5: Run** `npm test` and `npm run build` — Expected: PASS. Check in the browser (dev server `dev` in `.claude/launch.json`): kubus with books on both layers shows the back row raised and visible above the front row; no book passes through another or the top board.
- [ ] **Step 6: Commit** — `git commit -m "feat: back layer stands on a riser behind the front layer in 3D"`
