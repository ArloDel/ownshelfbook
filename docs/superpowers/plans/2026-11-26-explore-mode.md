# Mode Jelajahi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tombol Jelajahi membawa pemilik berjalan di dalam ruangan 3D dari tinggi mata, tanpa panel, dengan kartu buku saat menunjuk buku.

**Architecture:** Status Jelajahi dan kartu buku ada di `uiStore`. Semua aturan gerak (tinggi mata, tabrakan, titik awal, menoleh, berjalan ke titik) adalah fungsi murni di `src/ui/scene/walk.ts` yang dites tanpa three.js. Komponen r3f `ExploreControls` menggantikan `OrbitControls` selama Jelajahi dan hanya menerjemahkan input ke fungsi-fungsi itu. UI DOM (Keluar, petunjuk, kartu) dirender `RoomPage`; App menyembunyikan top bar.

**Tech Stack:** React 19, TypeScript 7, Zustand 5, three / @react-three/fiber / drei, shadcn/ui, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-26-explore-mode-design.md`

## Global Constraints

- Tinggi mata 160 cm; ruangan < 180 cm → tinggi ruangan − 20 cm.
- Jalan 1,4 m/s (140 cm/s), lari 2,8 m/s (280 cm/s); menoleh 0,25°/px; pitch ±60°.
- Radius pemain 25 cm; jalan ke titik berhenti 30 cm sebelum titik; titik awal 150 cm di depan rak terdekat ke pusat; cari titik bebas dengan lingkaran membesar langkah 10 cm.
- Klik dihitung dengan aturan `isClick` (≤ 2 px).
- Reduced motion → jalan ke titik langsung pindah.
- Tidak ada perubahan data selama Jelajahi.
- Teks UI: tombol `Jelajahi`, tombol `Keluar`, petunjuk `WASD/panah untuk berjalan · Shift lari · seret untuk menoleh · klik lantai untuk berjalan ke sana · Esc keluar`.
- Satuan fungsi `walk.ts`: cm, sudut radian, posisi `{ x, z }` lantai.
- Commit kecil (Conventional Commits), tanpa trailer co-author.

## Review Focus

1. Esc saat kartu dipin → hanya menutup kartu; Esc berikutnya → keluar. (Task 6)
2. Menekan W saat fokus di kolom teks → tidak berjalan; saat fokus di tombol → tetap berjalan. (Task 4: `isTypingTarget`)
3. Ruangan sangat kecil / penuh rak → titik awal tetap di dalam ruangan dan bebas. (Task 2)
4. Rak diputar 45° → tidak bisa menembus sudutnya. (Task 2)
5. Pindah ke Koleksi saat Jelajahi → Jelajahi berakhir; kembali ke Ruang 3D → mode biasa. (Task 1)

---

### Task 1: Status Jelajahi di UI store

**Files:** Modify `src/store/uiStore.ts`, `tests/ui/helpers.ts` · Test `tests/store/uiStore.test.ts`

**Interfaces — Produces:**
- `exploring: boolean`; `startExplore(): void` (set `exploring`, kosongkan `selectedShelfId`, `selectedSlot`, `focusShelfId`); `stopExplore(): void` (juga kosongkan kartu).
- Kartu: `exploreCard: { bookId: string; x: number; y: number; pinned: boolean } | null`; `setExploreCard(card | null)`.
- `setPage(page)`: bila `page !== 'room'` → `exploring: false`, `exploreCard: null`.

- [ ] Tes gagal: `startExplore` menyetel `exploring` dan mengosongkan pilihan; `stopExplore` mengosongkan kartu; `setPage('collection')` saat Jelajahi → `exploring false`.
- [ ] Commit tes → implementasi → `npx vitest run tests/store/uiStore.test.ts` PASS → `helpers.ts` reset `exploring:false, exploreCard:null` → commit `feat: explore state in the UI store`.

### Task 2: Aturan gerak murni

**Files:** Create `src/ui/scene/walk.ts` · Modify `src/domain/shelves.ts` (ekspor `footprintCorners`) · Test `tests/ui/walk.test.ts`

**Interfaces — Produces:**
- `PLAYER_RADIUS_CM = 25`, `WALK_SPEED_CM = 140`, `RUN_SPEED_CM = 280`, `MAX_PITCH = Math.PI / 3`, `LOOK_RAD_PER_PX = (0.25 * Math.PI) / 180`.
- `eyeHeightCm(room: Room): number`.
- `isBlocked(p: {x;z}, room: Room, shelves: Shelf[]): boolean` — di luar `room ± radius` atau di dalam tapak rak berputar yang diperbesar radius (titik ke OBB: ubah ke koordinat lokal rak, bandingkan dengan setengah lebar/dalam + radius).
- `moveWithCollision(from, dx, dz, room, shelves): {x;z}` — coba dua sumbu; bila gabungan tertahan, coba sumbu X saja lalu Z saja (menyusur sisi).
- `startPoint(room, shelves): { x; z; yaw }` — rak dengan pusat terdekat ke (0,0): titik = pusat rak + 150 cm ke arah depannya (`rotationY`), `yaw` menghadap rak; tanpa rak: (0, 0) menghadap −z (dinding belakang). Bila tertahan: cari titik bebas pada lingkaran radius 10, 20, 30… cm di sekitar (0,0), 16 arah per lingkaran.
- `look(yaw, pitch, dxPx, dyPx): { yaw; pitch }` — pitch dijepit ±`MAX_PITCH`.
- `stepToward(pos, target, maxStepCm): { pos; done }` — berhenti 30 cm sebelum target (`done` true bila sudah ≤ 30 cm).

- [ ] Tes gagal:
  - `eyeHeightCm` 260→160, 150→130.
  - `isBlocked` di tengah ruangan kosong → false; 10 cm dari dinding → true; di dalam kubus → true; 20 cm di luar sisi kubus → true (radius 25), 30 cm → false; kubus `rotationY 45`: titik di dekat sudut yang berada di luar AABB lama tapi di dalam OBB → true.
  - `moveWithCollision` menuju dinding kubus secara miring → hanya komponen sejajar sisi yang dipakai (posisi bergeser menyusur).
  - `startPoint` satu kubus di (0, −150) rotasi 0 (depan = +z) → `{ x: 0, z: 0 }`, `yaw` menghadap −z (ke rak); ruangan 60×60 cm penuh rak → titik hasil tidak `isBlocked` atau pusat ruangan bila tak ada yang bebas.
  - `look` menjepit pitch di ±π/3.
  - `stepToward` berhenti 30 cm sebelum target; langkah tidak melebihi `maxStepCm`.
- [ ] RED → commit tes → implement → PASS → commit `feat: walking rules — eye height, collisions, start point, look and walk-to`.

### Task 3: Ruangan tertutup saat Jelajahi

**Files:** Modify `src/ui/scene/RoomMesh.tsx`, `src/ui/scene/Scene.tsx` · Test `tests/ui/scene-math.test.ts`

**Interfaces — Produces:** `roomWalls(room: Room, closed: boolean): { key: string; position: [n,n,n]; size: [n,n,n] }[]` (cm) — terbuka: `back`, `left` (seperti sekarang); tertutup: + `front`, `right`, `ceiling`. `RoomMesh` menerima `closed?: boolean` dan menggambar dari `roomWalls` (+ list dinding untuk setiap dinding).

- [ ] Tes gagal: terbuka → kunci `['back','left']`; tertutup → `['back','left','front','right','ceiling']`; langit-langit di `y = heightCm`.
- [ ] RED → commit → implement (Scene meneruskan `closed={exploring}`) → PASS → commit `feat: closed room while exploring`.

### Task 4: Kontrol berjalan

**Files:** Create `src/ui/scene/ExploreControls.tsx` · Modify `src/ui/scene/Scene.tsx`, `src/ui/scene/CameraFocus.tsx` · Test `tests/ui/walk.test.ts` (`isTypingTarget`)

**Interfaces:**
- Consumes: Task 2 semua; `uiStore.exploring`, `stopExplore`.
- Produces: `isTypingTarget(el: EventTarget | null): boolean` (input/textarea/select/contenteditable → true) di `walk.ts`.
- `ExploreControls`: saat mount simpan posisi+target kamera orbit; letakkan kamera di `startPoint` pada `eyeHeightCm`; tombol W/A/S/D/panah/Shift (abaikan bila `isTypingTarget`); seret pointer di canvas → `look`; `useFrame` gerak dengan `moveWithCollision`; klik lantai (`onFloorClick` dari `RoomMesh` saat Jelajahi) → target jalan → `stepToward` tiap frame (reduced motion: langsung `moveWithCollision` sampai target dalam satu langkah); tombol gerak membatalkan target. Saat unmount: kembalikan posisi+target orbit.
- `Scene`: `OrbitControls` hanya dirender bila `!exploring`; `ExploreControls` bila `exploring`; `CameraFocus` diam bila `exploring` (dan animasi berjalan dibatalkan saat masuk).

- [ ] Tes gagal `isTypingTarget`: `<input>`, `<textarea>`, elemen `contenteditable` → true; `<button>`, `null` → false.
- [ ] RED → commit → implement → `npm test` + `npx tsc -b` → commit `feat: walk and look around the room while exploring`.

### Task 5: Menunjuk buku

**Files:** Modify `src/ui/scene/BooksMesh.tsx` · Create `src/ui/room/ExploreCard.tsx` · Test `tests/ui/explore.test.tsx`

**Interfaces:**
- `BooksMesh` menerima `pickable?: boolean`; bila true, mesh buku utama memakai raycast normal dan `onPointerMove` → `setExploreCard({ bookId, x: clientX, y: clientY, pinned: false })` (kecuali kartu dipin), `onPointerOut` → kosongkan bila tidak dipin, `onClick` (isClick) → `pinned: true`. Buku yang sedang ditunjuk dinaikkan kecerahan warnanya (`color.offsetHSL(0, 0, 0.15)`) — bukan `highlightBookId`.
- `ExploreCard` (DOM, posisi `fixed` di `x+12, y+12`): judul+volume (`bookLabel`), penulis bila ada, `placementLabel`; `role="status"` `aria-label="Buku ditunjuk"`.

- [ ] Tes gagal (render `ExploreCard` dengan store): kartu menampilkan `Naruto 12`, penulis, `Rak 1 T1K1`; tanpa kartu → tidak dirender.
- [ ] RED → commit → implement → PASS → commit `feat: point at a book to see its card while exploring`.

### Task 6: Antarmuka Jelajahi

**Files:** Modify `src/ui/room/RoomPage.tsx`, `src/ui/App.tsx`, `src/styles.css` · Test `tests/ui/roomPage.test.tsx`, `tests/ui/app.test.tsx`

**Interfaces:** Tombol `Jelajahi` (ikon `Footprints`) di toolbar setelah `Separator`; saat Jelajahi: `RoomPage` hanya merender kanvas, tombol `Keluar` (pojok kanan atas), petunjuk (pudar setelah 4 detik via CSS animation, dimatikan pada reduced motion), dan `ExploreCard`; `App` tidak merender top bar. Esc (window keydown): kartu dipin → kosongkan kartu; selain itu → `stopExplore`.

- [ ] Tes gagal:
  - klik `Jelajahi` → panel `Belum ditata` dan toolbar `Alat ruang` hilang, tombol `Keluar` ada; klik `Keluar` → kembali.
  - Esc dengan kartu dipin → kartu hilang, masih Jelajahi; Esc lagi → keluar.
  - App: saat `exploring`, tablist `Halaman` tidak ada.
- [ ] RED → commit → implement → `npm test` PASS → commit `feat: Jelajahi button, exit and a clean screen while exploring`.

### Task 7: Cek di browser

- [ ] Dev server `dev`: masuk Jelajahi, berjalan ke rak dengan WASD, coba menembus rak dan dinding (tertahan, menyusur), klik lantai, seret menoleh, tunjuk buku (kartu + nyala), klik (dipin), Esc dua kali, keluar → kamera orbit kembali. Cek dinding depan/kanan/langit-langit ada saat Jelajahi dan hilang setelahnya. Catat di ledger; temuan logika diperbaiki dengan tes merah dulu.
