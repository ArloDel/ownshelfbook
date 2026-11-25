# Dua lapis per slot (double stack) — desain

## Maksud dan alasan
Pemilik koleksi menyimpan komik seperti di rak asli: dua lapis dalam satu slot, lapis belakang berdiri di atas penyangga (riser) sehingga punggung komik belakang tetap terlihat di atas lapis depan. Tujuannya menghemat tempat tanpa menyembunyikan koleksi, dan supaya tampilan 3D serta catatan posisi mencerminkan rak yang sebenarnya.

## Tujuan
- Setiap slot yang cukup dalam otomatis punya dua lapis: **Depan** dan **Belakang**. Tidak ada saklar per slot.
- Buku bisa ditaruh, diurutkan, dikeluarkan, dan **dipindah ke lapis lain** per lapis.
- Lapis belakang digambar di belakang lapis depan, di atas balok penyangga setinggi pengaturan rak.
- Kapasitas, "meluap", dan "terlalu tinggi" dihitung per lapis; lapis belakang memperhitungkan tinggi penyangga.
- Posisi buku menyebut lapisnya di semua tempat yang menampilkan posisi.

## Bukan tujuan
- Lebih dari dua lapis.
- Menumpuk buku mendatar (buku tidur) atau tumpukan vertikal.
- Saklar dua lapis per slot (pilihan B, tidak dipilih).
- Undo.

## Anti-tujuan (gagal walau "jalan")
- Data lama di browser atau file cadangan lama gagal dibaca, atau bukunya berpindah lapis.
- Buku terhapus diam-diam saat rak diubah. Aturan lama berlaku: buku yang kehilangan tempat kembali ke **Belum ditata**, setelah konfirmasi.
- Lapis belakang menutupi lapis depan di 3D, atau buku belakang menembus papan rak atas.

## Batasan
- Data per buku, satu pengguna, IndexedDB (Dexie), ekspor/impor cadangan JSON (versi 2).
- Semua ukuran dalam cm; aturan murni di `src/domain`, store menulis lewat transaksi dengan rollback.
- UI berbahasa Indonesia; komponen shadcn/ui; gaya minimalis (`.superdesign/design-system.md`).
- Dalam komik 13 cm, buku 15 cm (`BOOK_DEPTH` di `BooksMesh.tsx`). Preset: rak buku 30, kubus 35, dinding 20, rendah 35 cm.

## Pendekatan yang dipertimbangkan
1. **Kolom `layer` di posisi buku** — `placement.layer: 'depan' | 'belakang'`, opsional; tidak ada = `depan`. **Dipilih**: data lama tetap sah tanpa migrasi, semua aturan slot (bentuk rak, buku di luar slot, label) tetap membaca baris/kolom yang sama, dan lapis cukup jadi satu kunci tambahan untuk urutan.
2. **Lapis belakang sebagai kolom bayangan** (mis. kolom + 100) — murah, tapi merusak aturan ubah bentuk, hitung buku di luar slot, dan label posisi. Ditolak.
3. **Isi slot disimpan sebagai daftar per slot** — perombakan penyimpanan, pencarian, ekspor/impor tanpa manfaat tambahan. Ditolak.

## Keputusan yang sudah disetujui
- **Otomatis (pilihan A):** semua slot yang memenuhi syarat kedalaman punya lapis Depan dan Belakang.
- **Syarat kedalaman:** lapis Belakang tersedia bila `shelf.depthCm >= 26` (konstanta `MIN_DOUBLE_DEPTH_CM`, cukup untuk dua komik). Rak dinding (20 cm) satu lapis.
- **Tinggi penyangga per rak:** `Shelf.backRiserCm`, bawaan **5 cm**, diatur di panel rak (kolom "Penyangga belakang"), hanya tampil bila rak memenuhi syarat kedalaman. Rentang 0–15 cm, dibulatkan 0,5 cm.
- **Rak menjadi dangkal (< 26 cm) saat lapis belakang berisi:** konfirmasi seperti ubah bentuk rak ("N buku akan dikembalikan ke Belum ditata"), lalu buku lapis belakang rak itu kembali ke Belum ditata. Batal = kedalaman tidak berubah.
- **Panel slot (mode Isi):** pilihan lapis **Depan / Belakang** (ToggleGroup) menentukan ke lapis mana "Taruh di slot ini" menaruh buku. Isi slot ditampilkan per lapis, masing-masing dengan bar kapasitas dan urutan ↑↓ sendiri. Pada rak satu lapis pilihan lapis tidak ditampilkan.
- **Peringatan "terlalu tinggi":** lapis belakang memakai tinggi slot dikurangi `backRiserCm`.
- **Label posisi:** "Rak 1 T2K1" untuk depan, "Rak 1 T2K1 belakang" untuk belakang — di Koleksi dan hasil pencarian.
- **Pindah lapis:** tiap buku di daftar isi slot punya tombol "Pindah ke belakang" / "Pindah ke depan" (hanya pada rak dua lapis). Buku pindah ke ujung lapis tujuan; urutan kedua lapis dirapikan.
- **3D:** buku belakang rata ke dinding belakang slot (setelah panel belakang bila ada), berdiri di atas balok penyangga. Penyangga hanya digambar bila lapis belakang slot itu berisi.

## Rincian perilaku

### Data
- `Placement` bertambah `layer?: 'depan' | 'belakang'`. Pembaca memakai `layerOf(p) = p.layer ?? 'depan'`. Penulis selalu menulis `layer` saat menaruh buku.
- `Shelf` bertambah `backRiserCm?: number` (tidak ada = 5).
- Tidak ada versi Dexie baru dan tidak ada versi cadangan baru: kolom opsional. `parseBackup` menerima `layer` bila nilainya `'depan'`/`'belakang'` dan `backRiserCm` bila angka; nilai lain = file tidak valid (pesan buku/rak ke-N seperti sekarang).
- Impor (`normaliseImport`): buku lapis belakang pada rak yang tidak memenuhi syarat kedalaman dipindah ke Belum ditata, sama seperti posisi yang tidak sah. `backRiserCm` dijepit ke 0–15.

### Domain (`src/domain/placement.ts`)
- Kunci urutan menjadi rak|tingkat|kolom|**lapis**. `normalizeOrders`, `booksInSlot(books, slot, layer?)`, `placeBooks(books, ids, slot, layer)`, `moveInSlot` (tetap di lapis buku itu).
- Fungsi baru `moveToLayer(books, id, layer)`: buku pindah ke ujung lapis tujuan di slot yang sama; urutan dinormalkan. Tidak berbuat apa-apa bila buku belum ditata atau sudah di lapis itu.
- `booksInSlot` tanpa `layer` mengembalikan kedua lapis (untuk hal yang peduli slot saja, misalnya rak dihapus).
- `slotUsage(books, shelf, row, col, layer)` per lapis; `tooTall` lapis belakang memakai `slotHeight - riser`.
- Fungsi baru: `canDoubleStack(shelf)`, `countBackBooks(books, shelfId)` / `returnBackBooks(books, shelfId)` untuk aturan rak menjadi dangkal.
- Buku di luar slot (`countBooksOutside`/`returnBooksOutside`) tidak berubah: berlaku untuk kedua lapis.

### Store
- `placeBooks(ids, slot, layer = 'depan')`, `moveToLayer(id, layer)`.
- Ubah kedalaman rak lewat jalur yang bisa mengembalikan buku belakang dalam satu transaksi (mis. `reshapeShelf` menerima `depthCm`, atau aksi baru `setShelfDepth`). Pilihan teknisnya untuk pembangun.
- UI store: `slotLayer: 'depan' | 'belakang'` (bawaan depan). Pencarian yang memilih buku belakang ikut menyetel `slotLayer` ke belakang.

### UI
- **Panel rak (Tata):** kolom "Penyangga belakang" (cm) di bagian Bentuk, hanya bila `depthCm >= 26`. Kolom Kedalaman memakai konfirmasi bila ada buku belakang yang akan terlempar.
- **Panel slot (Isi):** di bawah judul, ToggleGroup Depan/Belakang (bila rak dua lapis). Untuk lapis terpilih: bar kapasitas, teks "x / y cm terisi · n buku", peringatan meluap/terlalu tinggi, tombol "Taruh di slot ini (n)", daftar isi dengan ↑ ↓ X. Tiap baris punya tombol ikon pindah lapis (label aksesibel "Pindah <judul> ke belakang/depan"). Lapis lain diringkas satu baris ("Belakang: 12 buku") agar terlihat ada isinya.
- **SlotHits (3D):** warna merah "meluap" bila salah satu lapis meluap.

### 3D (`BooksMesh.tsx`, `ShelfMesh.tsx`/baru)
- Depan: tetap seperti sekarang (rata depan).
- Belakang: `z = -depth/2 + backInset + bookDepth/2 + 1`, dengan `backInset` = 0,6 bila rak punya panel belakang. Dasar buku = `slot.y + riser`; tinggi dijepit ke `slot.height - riser`.
- Penyangga: kotak selebar slot (dikurangi 0,4 cm), setinggi `riser`, sedalam bagian belakang slot di belakang lapis depan, warna kayu rak sedikit lebih gelap. Hanya bila lapis belakang slot itu berisi dan `riser > 0`.
- **Ruang dalam tidak cukup** (keputusan pembangun, dicatat): bila dalam lapis depan + lapis belakang melebihi dalam slot (mis. dua lapis buku 15 cm di rak 30 cm berpanel), buku belakang **digambar lebih tipis** agar pas di sisa ruang di belakang buku depan terdalam slot itu (minimal 2 cm), dan penyangga sedalam sisa ruang itu. Hanya tampilan; batas 26 cm, aturan, dan data tidak berubah. Dua lapis tidak pernah saling tembus, termasuk saat penyangga 0.
- Miring buku terakhir (lean), variasi tinggi, dan garis punggung berlaku per lapis.

## Diserahkan ke pembangun
- Nama fungsi dan pemecahan file selain yang disebut di atas.
- Bentuk aksi store untuk ubah kedalaman (lihat Store).
- Warna persis penyangga dan jarak kecil antar lapis, selama tidak menembus papan dan tidak menutupi lapis depan.
- Teks petunjuk tambahan, selama memakai istilah "lapis depan / lapis belakang" dan "penyangga".
