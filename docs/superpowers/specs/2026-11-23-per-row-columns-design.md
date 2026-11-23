# Kolom per tingkat — Desain singkat

Tanggal: 2026-11-23 · Status: disetujui · Melanjutkan: `2026-11-23-ownshelfbook-design.md`

## Maksud
Tiap tingkat rak bisa punya jumlah kolom sendiri (mis. tingkat bawah 1 kolom lebar untuk buku besar, tingkat atas 3 kolom sempit untuk komik).

## Tujuan / non-tujuan / anti-tujuan
- **Tujuan:** jumlah kolom per tingkat bisa diatur; lebar tiap kolom tetap bisa diatur; rak tetap berbentuk kotak.
- **Non-tujuan:** tingkat dengan lebar berbeda (rak tidak beraturan); menyisipkan/menghapus kolom di tengah.
- **Anti-tujuan:** data lama (rak tersimpan, file cadangan v1) tidak terbaca; buku hilang saat kolom dikurangi.

## Pendekatan yang dipertimbangkan (dipilih pengguna: B)
| | Pendekatan | Trade-off |
|---|---|---|
| A | Lebar rak tetap, kolom dibagi rata | Paling sederhana; lebar kolom tak bisa diatur |
| **B** | **Lebar rak tetap, lebar kolom bisa diatur, kolom terakhir menyesuaikan** | Tetap kotak dan fleksibel; UI sedikit lebih banyak |
| C | Tiap tingkat bebas, lebar rak = tingkat terlebar | Bentuk tak beraturan, ruang kosong di ujung |

Cara membangun (keputusan saya): `colWidthsCm` menjadi daftar per tingkat + satu `innerWidthCm`. Alternatif "pola kolom bersama + override per tingkat" ditolak karena membuat setiap perhitungan punya dua jalur.

## Desain
**Data**
- `Shelf.innerWidthCm: number` — lebar dalam rak (antara dua sisi).
- `Shelf.colWidthsCm: number[][]` — `colWidthsCm[row]` = lebar kolom tingkat itu, kiri→kanan.
- Invarian: untuk setiap tingkat, `Σ lebar + (jumlah kolom − 1) × tebal papan = innerWidthCm`. Lebar kolom minimal 5 cm.
- Lebar luar rak = `innerWidthCm + 2 × tebal papan`.

**Perilaku edit**
- Ubah jumlah kolom satu tingkat (1..20) → kolom tingkat itu dibagi rata. Jika berkurang dan ada buku di kolom yang hilang → konfirmasi "N buku akan dikembalikan ke Belum ditata".
- Ubah lebar kolom i (bukan terakhir) → kolom terakhir menyesuaikan; nilai dibatasi agar kolom terakhir ≥ 5 cm. Kolom terakhir tampil sebagai nilai otomatis (tidak bisa diketik).
- Ubah "Lebar rak" → semua kolom di semua tingkat diskalakan proporsional (lalu dibulatkan, sisa ke kolom terakhir).
- Tambah tingkat (dari atas) → salin susunan kolom tingkat teratas sebelumnya. Kurangi tingkat → seperti sekarang.
- Kontrol global "Jumlah kolom" dihapus dari panel.

**3D:** papan sekat vertikal digambar per tingkat.

**Data lama**
- IndexedDB naik ke versi 2; upgrade mengubah `colWidthsCm: number[]` → disalin ke setiap tingkat, dan mengisi `innerWidthCm`.
- File cadangan versi 2. Impor menerima versi 1 (dikonversi dengan cara yang sama) dan versi 2.
- Preset rak menghasilkan susunan yang sama secara visual seperti sebelumnya.

## Diserahkan ke builder
Tata letak persis panel per tingkat, pembulatan angka, nama fungsi domain.
