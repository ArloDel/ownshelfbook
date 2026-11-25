# Gambar punggung per seri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pemilik memberi satu gambar per seri; gambar dipotong menjadi strip punggung, disimpan di browser dan cadangan, dan tampil di punggung buku 3D dengan nomor volume saat dekat.

**Architecture:** Gambar disimpan sebagai data URL di tabel Dexie baru `covers` (kunci = `series ?? title`) dan di store sebagai `covers: Record<string, string>`. Perhitungan potongan murni dipisah dari kode canvas agar bisa dites; kode canvas tipis dan dicek di browser. 3D membagi buku menjadi polos dan bergambar; tiap seri bergambar punya `InstancedMesh` sendiri dengan tekstur hanya di sisi punggung.

**Tech Stack:** React 19, TypeScript 7, Zustand 5, Dexie 4, three / @react-three/fiber / drei, shadcn/ui, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-26-series-spine-images-design.md`

## Global Constraints

- Kunci gambar: `series ?? title` (sama dengan `groupBooks`).
- Strip: tinggi 512 px, lebar = 512 × (tebal ÷ tinggi volume pertama seri), minimal 16 px; WebP kualitas 0,8, fallback PNG.
- Posisi potongan: 0–1 (UI 0–100 %), bawaan 0,5.
- Cadangan versi 3 dengan `covers?: { key, image }[]`; versi 1 dan 2 tetap diterima. `image` harus diawali `data:image/` dan ≤ 300.000 karakter; selain itu `File cadangan tidak valid: gambar ke-N`.
- Impor: file dengan kolom `covers` mengganti semua gambar; file tanpa kolom itu membiarkan gambar yang ada.
- Dexie versi 3 hanya menambah tabel `covers: 'key'`.
- Teks UI: dialog `Gambar punggung — <seri>`, tombol `Pilih file`, `Simpan`, `Hapus gambar`, `Batal`, slider `Posisi potongan`, petunjuk `atau tempel (Ctrl+V) / seret gambar ke sini`, galat `File ini bukan gambar yang bisa dibaca.`, tombol kepala seri `aria-label="Gambar punggung <seri>"`.
- Commit kecil (Conventional Commits), tanpa trailer co-author.

## Review Focus

1. Memulihkan cadangan versi 2 setelah membuat gambar → gambar tetap ada. (Task 3)
2. Cadangan berisi gambar raksasa atau bukan `data:image/` → ditolak dengan pesan, data lama utuh. (Task 2)
3. File yang bukan gambar (mis. PDF) dipilih/ditempel di dialog → pesan galat, tidak ada yang tersimpan. (Task 5)
4. Seri bergambar yang semua bukunya dihapus lalu ditambah lagi → gambar muncul kembali. (Task 3)
5. Buku bergambar disorot dari pencarian → sorotan tetap terlihat di 3D. (Task 6)

---

### Task 1: Kunci seri dan perhitungan potongan

**Files:**
- Create: `src/domain/covers.ts`
- Test: `tests/domain/covers.test.ts`

**Interfaces:**
- Produces: `seriesKey(b: Pick<Book,'series'|'title'>): string`; `seriesSpineRatio(books: Book[], key: string): number` (tebal ÷ tinggi volume terkecil seri itu; tanpa buku → 1/8); `spineCrop(srcW: number, srcH: number, ratio: number, pos: number): { sx: number; sy: number; sw: number; sh: number; outW: number; outH: number }` — `sh = srcH`, `sw = min(srcW, srcH × ratio)`, `sx = (srcW − sw) × clamp(pos,0,1)`, `sy = 0`, `outH = 512`, `outW = max(16, round(512 × ratio))`.

- [ ] **Step 1: Write the failing tests**
  - `seriesKey({ series: 'Naruto', title: 'Naruto' })` = `'Naruto'`; `seriesKey({ title: 'Laskar Pelangi' })` = `'Laskar Pelangi'`.
  - `seriesSpineRatio` untuk seri komik bawaan = `1.5 / 18`; seri tak dikenal = `0.125`.
  - `spineCrop(1000, 1500, 1.5/18, 0.5)` → `{ sx: 437.5, sy: 0, sw: 125, sh: 1500, outW: 43, outH: 512 }`; `pos 0` → `sx 0`; `pos 1` → `sx 875`; gambar sempit `spineCrop(50, 1500, 0.25, 0.5)` → `sw 50, sx 0`; `outW` minimal 16 untuk `ratio 0.01`.
- [ ] **Step 2: Run** `npx vitest run tests/domain/covers.test.ts` — Expected: FAIL (module missing). **Step 3: Commit test.**
- [ ] **Step 4: Implement**; **Step 5: Run** — PASS. **Step 6: Commit** `feat: series key and spine crop maths`.

### Task 2: Penyimpanan dan cadangan versi 3

**Files:**
- Modify: `src/domain/types.ts` (`Cover`, `AppData.covers?`), `src/persistence/db.ts`, `src/persistence/repo.ts`, `src/domain/backup.ts`
- Test: `tests/persistence/covers.test.ts`, `tests/domain/backup.test.ts`

**Interfaces:**
- Produces: `interface Cover { key: string; image: string }`; `AppData.covers?: Cover[]`; `BACKUP_VERSION = 3`; repo `loadAll()` returns `covers` (array, bisa kosong); `saveCover(c: Cover): Promise<void>`; `deleteCover(key: string): Promise<void>`; `replaceAll(d: AppData)` — mengganti tabel `covers` hanya bila `d.covers !== undefined`. `transact` juga mencakup `db.covers`. `MAX_COVER_CHARS = 300_000` di `backup.ts`.

- [ ] **Step 1: Write the failing tests**
  - persistence: setelah `saveCover({key:'Naruto', image:'data:image/webp;base64,AAA'})`, `loadAll().covers` memuatnya; `deleteCover('Naruto')` menghapus; `replaceAll({...d, covers: undefined})` membiarkan gambar; `replaceAll({...d, covers: []})` mengosongkan.
  - backup: round trip dengan `covers`; file versi 2 tanpa `covers` → `covers` `undefined`; `image: 'http://x'` → throw `gambar ke-1`; `image` 300.001 karakter → throw `gambar ke-1`; versi 4 tetap ditolak.
- [ ] **Step 2: Run** — FAIL. **Step 3: Commit test.**
- [ ] **Step 4: Implement** (Dexie `db.version(3).stores({ ...STORES, covers: 'key' })`).
- [ ] **Step 5: Run** `npm test` — PASS. **Step 6: Commit** `feat: store spine images and carry them in backups`.

### Task 3: Store

**Files:**
- Modify: `src/store/dataStore.ts`
- Test: `tests/store/dataStore.test.ts`

**Interfaces:**
- Consumes: Task 2 repo + backup.
- Produces: `DataState.covers: Record<string, string>`; `setCover(key: string, image: string): Promise<void>`; `removeCover(key: string): Promise<void>`; `hydrate` mengisi `covers`; `exportData` menyertakan `covers`; `importData` mengganti `covers` hanya bila file punya `covers`. Penulisan lewat `commit` (rollback + error) seperti aksi lain.

- [ ] **Step 1: Write the failing tests**
  - `setCover` tersimpan dan terbaca oleh store baru setelah `hydrate`; `removeCover` menghapus.
  - ekspor lalu impor → gambar kembali.
  - impor file versi 2 (`toBackup` lalu ubah `version: 2` dan hapus `covers`) setelah `setCover` → gambar tetap ada.
  - hapus semua buku seri bergambar lalu `addSeries` seri yang sama → `covers['Naruto']` masih ada.
- [ ] **Step 2–6:** RED, commit test, implement, `npm test` PASS, commit `feat: store keeps series spine images`.

### Task 4: Pemrosesan gambar di browser

**Files:**
- Create: `src/ui/collection/spineImage.ts`

**Interfaces:**
- Consumes: `spineCrop` (Task 1).
- Produces: `loadImage(source: Blob): Promise<HTMLImageElement>` (reject dengan `Error('File ini bukan gambar yang bisa dibaca.')` bila bukan `image/*` atau gagal decode); `renderSpine(img: HTMLImageElement, ratio: number, pos: number): string` (canvas → `toDataURL('image/webp', 0.8)`, bila hasil tidak diawali `data:image/webp` pakai `image/png`).

- [ ] **Step 1:** Implement (jsdom tak punya canvas; modul ini di-mock di tes UI dan dicek di browser pada Task 7).
- [ ] **Step 2:** `npx tsc -b` bersih. **Step 3: Commit** `feat: load an image and render a spine strip`.

### Task 5: Dialog di halaman Koleksi

**Files:**
- Create: `src/ui/collection/SpineImageDialog.tsx`
- Modify: `src/ui/collection/CollectionPage.tsx`
- Test: `tests/ui/spineImage.test.tsx` (mock `../../src/ui/collection/spineImage` dengan `vi.mock`: `loadImage` resolve `{ naturalWidth: 1000, naturalHeight: 1500 }` atau reject untuk file `application/pdf`; `renderSpine` → `'data:image/webp;base64,SPINE'`)

**Interfaces:**
- Consumes: store `covers`, `setCover`, `removeCover`; `seriesKey`, `seriesSpineRatio`; `loadImage`, `renderSpine`.
- UI: tombol ikon (lucide `Image`) di kepala seri dengan `aria-label` dari Global Constraints; bila ada gambar, `<img>` thumbnail di dalam tombol. Dialog shadcn: input file tersembunyi + tombol `Pilih file`, area tempel/seret (`onPaste` membaca `clipboardData.files[0]`, `onDrop` membaca `dataTransfer.files[0]`), slider `Posisi potongan` (input `type="range"` 0–100, label terlihat), pratinjau `<img alt="Pratinjau punggung">`, tombol `Simpan` (disabled tanpa gambar), `Hapus gambar` (hanya bila ada), `Batal`.

- [ ] **Step 1: Write the failing tests**
  - pilih file PNG lewat `user.upload` → pratinjau tampil; `Simpan` → `covers['Naruto']` = `'data:image/webp;base64,SPINE'`; dialog tertutup; tombol kepala seri berisi `<img>`.
  - `renderSpine` dipanggil dengan `ratio` = `1.5/18` dan `pos` 0,5; ubah slider ke 20 → panggilan terakhir `pos` 0,2.
  - unggah `application/pdf` → pesan `File ini bukan gambar yang bisa dibaca.`, `Simpan` disabled, store tidak berubah.
  - seri bergambar: `Hapus gambar` → `covers['Naruto']` hilang.
  - tempel: `fireEvent.paste` dengan `clipboardData.files` berisi PNG → pratinjau tampil.
- [ ] **Step 2–6:** RED, commit test, implement, `npm test` PASS, commit `feat: pick a spine image for a series in the collection`.

### Task 6: 3D — punggung bergambar dan nomor volume

**Files:**
- Create: `src/ui/scene/covers3d.ts`
- Modify: `src/ui/scene/BooksMesh.tsx`, `src/ui/scene/Scene.tsx` (teruskan `covers`)
- Test: `tests/ui/scene-math.test.ts`

**Interfaces:**
- Produces: `splitByCover(placed: PlacedBook[], covers: Record<string,string>): { plain: PlacedBook[]; covered: Map<string, PlacedBook[]> }` (kunci = `seriesKey(book)`); `spineLabelText(book: Book, hasCover: boolean): string` (bergambar dengan `volume` → `String(volume)`; lainnya → `bookLabel(book)`).
- `BooksMesh` menerima `covers`. Mesh lama hanya menggambar `plain` (+ garis punggung). Tiap entri `covered` → `InstancedMesh` dengan material array 6 sisi: indeks 4 (+z, punggung) `MeshStandardMaterial` dengan `map` = `TextureLoader` dari data URL (`colorSpace = SRGBColorSpace`), sisi lain material warna seri (instanceColor). Sorotan pencarian: buku tersorot memakai warna kuning `#ffd54a` di sisi samping dan `emissive` kecil pada punggung. `SpineLabels` memakai `spineLabelText`; untuk label nomor volume ukuran huruf `min(size[0]*0.8, 2.2)` dan diletakkan di 85 % bawah punggung dengan latar tipis (plane gelap 60 % opasitas di belakang teks).

- [ ] **Step 1: Write the failing tests**
  - `splitByCover`: dua seri, satu bergambar → `plain` berisi seri lain saja, `covered.get('Naruto')` berisi semua buku Naruto yang tampil.
  - `spineLabelText`: bergambar + volume 12 → `'12'`; bergambar tanpa volume → judul; tidak bergambar → `bookLabel`.
- [ ] **Step 2–6:** RED, commit test, implement, `npm test` + `npm run build` PASS, commit `feat: spine images on the 3D shelves with volume numbers up close`.

### Task 7: Cek di browser

- [ ] Jalankan dev server (`dev` di `.claude/launch.json`). Tambah seri, buka dialog, pilih gambar nyata (mis. buat PNG lewat canvas di konsol lalu tempel, atau file dari disk), geser slider, simpan. Pastikan: strip tersimpan ≤ ~30 KB, punggung 3D menampilkan gambar, nomor volume terbaca saat dekat, tidak ada galat di konsol, ekspor berisi `covers`.
- [ ] Catat hasil di ledger; perbaiki temuan dengan tes merah dulu bila menyentuh logika.
