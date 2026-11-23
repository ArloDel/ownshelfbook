# OwnShelfBook — Desain

Tanggal: 2026-11-23
Status: draft, menunggu persetujuan

## 1. Maksud dan alasan

Website pribadi untuk mencatat koleksi komik dan buku **per buku satuan**, lalu menata koleksi itu ke dalam **rak 3D** yang ada di sebuah ruangan virtual. Alurnya:

1. **Tata ruang**: letakkan rak-rak di ruangan 3D (geser, putar).
2. **Atur rak**: pilih model rak, atur jumlah tingkat/kolom, tinggi tiap tingkat dan lebar tiap kolom.
3. **Isi rak**: taruh buku-buku dari koleksi ke slot (tingkat × kolom) di rak.

Yang membuat ini istimewa dibanding katalog biasa: koleksi bisa dilihat dan ditata sebagai ruang rak 3D, bukan hanya daftar.

## 2. Tujuan, non-tujuan, anti-tujuan

**Tujuan (v1)**
- Mencatat buku satuan (judul, seri, volume, jenis komik/buku), termasuk tambah berseri sekaligus (mis. "Naruto vol 1–72").
- Ruangan 3D tempat rak bisa ditambah, digeser, diputar, dihapus.
- Rak yang bisa dikustom: model jadi + jumlah tingkat/kolom + tinggi per tingkat + lebar per kolom + kedalaman + warna.
- Menaruh buku ke slot rak; buku yang belum ditaruh ada di daftar "Belum ditata".
- Mencari buku dan menunjukkan letaknya di rak 3D.
- Data tersimpan di browser, dengan ekspor/impor file cadangan.

**Non-tujuan (v1)**
- Akun, login, sinkronisasi antar perangkat, halaman publik/berbagi.
- Sampul buku asli / gambar sampul; tampilan buku cukup balok berwarna dengan judul di punggung.
- Rak modular bebas (menyusun dari kubus sesuka hati), rak bundar/sudut/tangga.
- Ruangan dengan bentuk custom (denah L, beberapa ruangan). Satu ruangan persegi panjang saja.
- Pengalaman edit di HP. Di HP cukup bisa dibuka; target utama desktop.
- Pencarian metadata otomatis (ISBN, API buku).
- Undo/redo (keputusan pengguna). Pengamannya: dialog konfirmasi untuk aksi berisiko (hapus buku, hapus/mengecilkan rak, impor) + ekspor cadangan.
- Pengisian otomatis ke slot berikutnya saat slot penuh (keputusan pengguna).

**Anti-tujuan** (gagal meski secara teknis jalan)
- Data hilang diam-diam: misalnya mengubah jumlah tingkat rak lalu buku di slot yang hilang lenyap tanpa jejak.
- Mengisi koleksi terasa lambat dan merepotkan (harus mengetik 72 volume satu per satu).
- Editor 3D yang membingungkan: sulit memilih rak, kamera "nyasar", tidak jelas sedang mengubah apa.

## 3. Batasan

- Hanya satu pengguna, satu perangkat, tanpa server. Situs statis (bisa di-host di Netlify/Vercel/GitHub Pages).
- Penyimpanan: IndexedDB di browser. Struktur data dibuat rapi agar kelak bisa dipindah ke database online.
- Desktop browser modern (Chrome/Edge/Firefox terbaru).

## 4. Pendekatan yang dipertimbangkan

| Pendekatan | Kelebihan | Kekurangan |
|---|---|---|
| **1. React + React Three Fiber (three.js) + IndexedDB (Dexie)** — *dipilih* | UI form dan 3D berbagi satu state; ekosistem drei menyediakan kamera orbit, gizmo geser/putar, teks 3D | Perlu build tool (Vite) |
| 2. three.js murni + JS biasa | Ringan, sedikit dependensi | Sinkronisasi panel/form ↔ 3D manual; cepat berantakan untuk aplikasi banyak form |
| 3. Babylon.js | Mesin lengkap dengan gizmo/inspector bawaan | Lebih berat, integrasi dengan UI form kurang mulus; kelebihannya lebih untuk game |

Pengguna memilih **pendekatan 1**, karena aplikasi ini separuh katalog (form, daftar) dan separuh editor 3D.

Untuk kustomisasi rak, dipertimbangkan: (A) model jadi + parameter, (B) modular bebas, (C) model jadi + parameter + ukuran per tingkat/kolom. Pengguna memilih **C**.

## 5. Yang sudah diputuskan pengguna

- Pencatatan **per buku satuan**, bukan label per slot.
- **Satu pengguna, data di browser**, plus ekspor/impor cadangan.
- Rak **model C**: model jadi; jumlah tingkat & kolom bisa diatur; tinggi tiap tingkat dan lebar tiap kolom bisa diatur satu per satu.
- Tampilan buku **sederhana dulu**.
- **Tanpa undo** di v1; **tanpa isi otomatis** ke slot berikutnya.
- Teknologi: **React + React Three Fiber + IndexedDB**.

## 6. Desain

### 6.1 Teknologi
- Vite + React + TypeScript.
- `@react-three/fiber`, `@react-three/drei` (OrbitControls, TransformControls atau drag kustom, Text).
- State aplikasi: Zustand. Persistensi: Dexie (IndexedDB).
- Satuan ukuran di seluruh aplikasi: **sentimeter** (1 unit three.js = 1 cm atau dikonversi konsisten — keputusan builder).

### 6.2 Model data (usulan saya)

```ts
type BookType = 'komik' | 'buku';

interface Book {
  id: string;
  title: string;          // judul tampil, mis. "Naruto"
  series?: string;        // nama seri (untuk pengelompokan & tambah berseri)
  volume?: number;
  type: BookType;
  author?: string;
  notes?: string;
  color: string;          // warna punggung buku; default otomatis dari seri
  thicknessCm: number;    // default: komik 1.5, buku 3
  heightCm: number;       // default: komik 18, buku 21
  placement: null | {
    shelfId: string;
    row: number;          // indeks tingkat, 0 = paling bawah
    col: number;          // indeks kolom, 0 = paling kiri (dilihat dari depan)
    order: number;        // urutan kiri→kanan di dalam slot
  };
  createdAt: number;
}

type ShelfModel = 'rak-buku' | 'kubus' | 'dinding' | 'rendah';

interface Shelf {
  id: string;
  name: string;           // mis. "Rak Komik 1"
  model: ShelfModel;
  position: { x: number; z: number };  // cm di lantai ruangan
  rotationY: number;      // derajat
  elevationCm: number;    // 0, kecuali rak dinding (menggantung)
  rowHeightsCm: number[]; // panjang = jumlah tingkat, bawah→atas
  innerWidthCm: number;   // lebar dalam rak (lihat 2026-11-23-per-row-columns-design.md)
  colWidthsCm: number[][]; // per tingkat: lebar kolom kiri→kanan
  depthCm: number;
  boardThicknessCm: number;
  color: string;
}

interface Room { widthCm: number; depthCm: number; heightCm: number; }
```

Satu ruangan, satu set rak, satu koleksi.

### 6.3 Model rak (preset)
Tiap model = nilai awal + gaya visual. Semua bisa diubah setelahnya.

| Model | Default | Gaya |
|---|---|---|
| Rak buku | 5 tingkat × 1 kolom, 80 cm lebar, 30 cm dalam | Panel belakang, alas di lantai |
| Kubus | 4 × 4, tiap sel ~33 cm | Tanpa panel belakang opsional, grid rata |
| Rak dinding | 1–2 tingkat × 1 kolom, 100 cm lebar, 20 cm dalam | Menggantung (elevationCm ~120), tanpa sisi samping besar |
| Rak rendah | 2 tingkat × 3 kolom | Pendek, alas di lantai |

Angka persis adalah keputusan builder.

### 6.4 Layar dan mode

```
┌──────────────────────────────────────────────────────────┐
│ OwnShelfBook   [Ruang 3D] [Koleksi]      [Ekspor][Impor] │
├───────────────┬──────────────────────────┬───────────────┤
│ Belum ditata  │                          │ Panel         │
│ (cari/filter) │   Ruang 3D               │ kontekstual:  │
│ ▮ Naruto 34   │   orbit / zoom / pan     │ - rak dipilih │
│ ▮ Naruto 35   │                          │ - slot dipilih│
│ ...           │   Mode: [Tata] [Isi]     │ - buku dipilih│
└───────────────┴──────────────────────────┴───────────────┘
```

**Halaman Koleksi** (2D): tabel/daftar semua buku, kelompok per seri, filter jenis/status ditata, tambah, edit, hapus. Tombol **Tambah berseri**: nama seri, jenis, volume dari–sampai → membuat banyak entri sekaligus.

**Ruang 3D — Mode Tata**
- "+ Tambah rak" → pilih model → rak muncul di tengah ruangan dan langsung terpilih.
- Klik rak untuk memilih (outline/sorotan). Geser di lantai dengan drag; putar dengan tombol/handle (snap 15°, Shift untuk bebas — usulan). Posisi di-snap ke grid 5 cm (usulan).
- Rak dibatasi di dalam ruangan. Tumpang-tindih antar rak **tidak dicegah** di v1, hanya ditandai visual (usulan saya: cukup peringatan warna).
- Panel kanan saat rak dipilih: nama, model, warna, kedalaman, jumlah tingkat, jumlah kolom, daftar tinggi tiap tingkat, daftar lebar tiap kolom, hapus/duplikat rak. Perubahan langsung terlihat di 3D.
- Ukuran ruangan bisa diatur di pengaturan.

**Ruang 3D — Mode Isi**
- Rak tidak bisa digeser; klik sebuah **slot** untuk memilihnya. Kamera bisa "fokus" ke rak yang dipilih.
- Panel kanan: daftar buku di slot itu berurutan (bisa diurutkan ulang, dikeluarkan), plus indikator kapasitas (total ketebalan vs lebar slot).
- Menambah buku ke slot: pilih dari daftar "Belum ditata" (centang beberapa → "Taruh di slot ini"), atau drag dari daftar ke slot di 3D (drag ke 3D = nice-to-have).
- Buku tampil sebagai balok berdiri kiri→kanan di slot, warna punggung, judul + volume sebagai teks di punggung (boleh disederhanakan/disembunyikan jika jauh dari kamera demi performa).

**Aturan ruang/slot**
- *Keputusan pengguna:* buku yang ditaruh ke slot **tidak** otomatis mengalir ke slot berikutnya bila tidak muat. Semua masuk ke slot yang dipilih; pengguna memindahkan sendiri.
- Jika total ketebalan buku > lebar slot: semua tetap tersimpan, slot ditandai "penuh/meluap", buku yang meluap tidak digambar atau digambar terpotong (keputusan builder), dan panel menampilkan peringatan.
- Jika buku lebih tinggi dari tingkat: tetap boleh, tandai peringatan.

> **Diperbarui:** jumlah dan lebar kolom kini diatur per tingkat — lihat `2026-11-23-per-row-columns-design.md`.

**Mengubah ukuran rak yang sudah berisi**
- Jumlah tingkat/kolom hanya bertambah/berkurang **dari ujung** (tingkat teratas, kolom paling kanan). Tidak ada hapus tingkat/kolom di tengah di v1, jadi indeks `row`/`col` buku lain tidak pernah bergeser. Tinggi/lebar tiap item tetap bisa diubah satu per satu.
- Mengurangi tingkat/kolom atau menghapus rak: buku di slot yang hilang **dipindah ke "Belum ditata"**, dengan konfirmasi yang menyebut jumlahnya ("12 buku akan dikembalikan ke Belum ditata"). Tidak pernah dihapus.

**Cari**
- Kotak cari global (judul/seri/volume). Memilih hasil: jika ditata → pindah ke Ruang 3D, kamera fokus ke rak, slot disorot; jika belum → tampil di daftar Belum ditata.

### 6.5 Penyimpanan dan cadangan
- Setiap perubahan disimpan otomatis ke IndexedDB.
- **Ekspor**: unduh satu file JSON (`ownshelfbook-backup-YYYY-MM-DD.json`) berisi `{ version, room, shelves, books }`.
- **Impor**: pilih file → konfirmasi "ganti semua data" → validasi skema → ganti. (Gabung data = di luar v1.)
- Simpan `version` skema agar migrasi kelak mungkin.
- Usulan: minta `navigator.storage.persist()` agar browser tidak membersihkan data otomatis.

### 6.6 Performa
Target nyaman: ~2.000 buku, ~20 rak. Builder boleh memakai instancing untuk balok buku dan mematikan teks punggung saat jauh.

## 7. Diserahkan ke builder
- Gaya visual UI (warna, tipografi), tampilan ruangan (lantai/dinding), pencahayaan.
- Angka default preset, batas minimum/maksimum ukuran.
- Cara implementasi drag/rotate (TransformControls vs drag kustom di bidang lantai).
- Pemilihan pustaka kecil (router, komponen UI, generator ID).
- Strategi pengujian.

## 8. Keputusan yang saya ambil (bukan dari pengguna)
- Satu ruangan persegi panjang; rak hanya di lantai (kecuali rak dinding dengan ketinggian).
- Ukuran default buku: komik 1,5 × 18 cm, buku 3 × 21 cm; bisa diubah per buku.
- Tumpang-tindih rak hanya diberi peringatan, tidak dicegah.
- Buku dari slot yang hilang kembali ke "Belum ditata", tidak dihapus.
- Impor = ganti semua data, tidak menggabung.
- Desktop-first.
- Tingkat/kolom hanya ditambah/dikurangi dari ujung (atas/kanan), supaya posisi buku tidak bergeser.
- Rak dinding tidak menempel otomatis ke dinding: digeser dan diputar sama seperti rak lain, hanya punya ketinggian (`elevationCm`) yang bisa diatur. Menempel ke dinding (snap) = di luar v1.
