# Gambar punggung per seri — desain

## Maksud dan alasan
Di rak 3D, punggung buku sekarang hanya warna seri dan judul kecil yang muncul saat kamera dekat. Pemilik ingin seri dan volume **langsung dikenali** dari jauh, sehingga rak terasa seperti rak koleksinya sendiri. Tidak perlu punggung asli; cukup gambar yang khas untuk serinya. Pemilik bingung mencari gambar punggung, dan gambar punggung memang hampir tidak tersedia online, jadi aplikasi yang memotong gambar apa pun (biasanya sampul depan) menjadi strip punggung.

## Tujuan
- Satu gambar per **seri** (atau per judul untuk buku tanpa seri), dipakai di punggung semua volumenya.
- Gambar bisa diambil dari **file**, **tempel dari clipboard** (mis. hasil "Copy image" di browser), atau **seret-lepas** file.
- Aplikasi mengecilkan dan memotong gambar menjadi strip punggung; pemilik menggeser posisi potongan sebelum menyimpan.
- Di 3D, punggung buku yang serinya punya gambar menampilkan gambar itu; **nomor volume** tampil besar di punggung saat kamera dekat, agar tiap volume terbedakan.
- Gambar tersimpan di browser (tanpa internet) dan ikut ekspor/impor cadangan.

## Bukan tujuan
- Pencarian gambar online (cara 2) — menyusul setelah layanan diperiksa.
- Gambar per volume (cara 3).
- Mengedit gambar selain memotong (filter, putar, teks).

## Anti-tujuan
- Rak 3D menjadi patah-patah atau aplikasi lambat dibuka karena gambar.
- File foto besar (MB) tersimpan apa adanya.
- File cadangan lama gagal diimpor, atau impor cadangan baru di versi lama diam-diam kehilangan gambar tanpa pesan.

## Batasan
- Satu pengguna, offline, IndexedDB (Dexie, sekarang versi 2), cadangan JSON (sekarang versi 2).
- 3D: semua buku satu `InstancedMesh` + garis punggung (`BooksMesh.tsx`); label punggung hanya untuk rak dekat kamera (`SpineLabels`, jarak 2,5 m).
- Kunci seri sudah dipakai di banyak tempat: `series ?? title` (`groupBooks`).
- UI bahasa Indonesia, komponen shadcn/ui, gaya minimalis.

## Pendekatan
1. **Satu gambar per seri, diunggah/ditempel sendiri, nomor volume di atasnya** — **dipilih pemilik.** Sekali unggah untuk satu seri, offline, penyimpanan kecil.
2. Cari otomatis online — ditunda (butuh internet, hasil sering meleset, perlu cek izin akses gambar dari browser).
3. Satu gambar per volume — ditolak untuk sekarang (paling repot dan paling besar).

## Rincian

### Gambar dan penyimpanan
- **Potongan punggung:** strip vertikal setinggi penuh gambar sumber, dengan rasio lebar : tinggi = **tebal : tinggi buku seri itu** (pakai volume pertama; mis. komik 1,5 : 18), sehingga gambar tidak tertarik di punggung. *(Keputusan pembangun: semua volume satu seri biasanya berukuran sama.)* Pemilik menggeser posisi horizontal potongan (slider 0–100 %, bawaan 50 % = tengah). Hasil disimpan dengan tinggi **512 px** (lebar mengikuti rasio, minimal 16 px) sebagai **WebP** (fallback PNG), kualitas 0,8 — sekitar 10–30 KB.
- **Disimpan sebagai data URL** di tabel Dexie baru `covers`: `{ key: string; image: string; updatedAt: number }`, `key` = kunci seri (`series ?? title`). Dexie **versi 3** hanya menambah tabel; buku dan rak tidak berubah.
- **Ganti nama seri** (lewat edit buku): gambar tidak ikut pindah (kunci lama). Keputusan pembangun — lihat "Diserahkan ke pembangun".
- Hapus semua buku sebuah seri **tidak** menghapus gambarnya (dipakai lagi bila seri ditambah ulang). Gambar bisa dihapus manual.

### Cadangan
- `BACKUP_VERSION` → **3**, dengan `covers: { key, image }[]` (opsional di file). Versi 1 dan 2 tetap diterima (tanpa gambar). `image` harus string `data:image/...;base64,` dan paling panjang **300.000 karakter** (~220 KB); selain itu → "File cadangan tidak valid: gambar ke-N". *(Keputusan pembangun: batas ini menahan foto besar dari file luar tanpa memproses ulang gambar.)*
- **Impor:** bila file **punya** kolom `covers` (walau kosong), semua gambar diganti isinya. Bila file **tidak punya** `covers` (versi 1/2 atau v3 tanpa kolom itu), gambar yang ada di browser **dibiarkan**. *(Keputusan pembangun: memulihkan cadangan lama tidak boleh diam-diam menghapus gambar yang sudah dibuat.)*

### UI — halaman Koleksi
- Di kepala tiap seri: tombol ikon gambar (`aria-label "Gambar punggung <seri>"`); bila sudah ada gambar, thumbnail kecil strip punggung menggantikan ikon.
- Klik membuka **dialog "Gambar punggung — <seri>"** (shadcn Dialog):
  - Area pilih: tombol **Pilih file**, petunjuk "atau tempel (Ctrl+V) / seret gambar ke sini".
  - Pratinjau: gambar sumber kecil dengan kotak potongan, slider **Posisi potongan**, dan pratinjau strip punggung di sampingnya dengan nomor volume contoh.
  - Tombol **Simpan**, **Hapus gambar** (bila ada), **Batal**.
  - Gambar yang bukan gambar / gagal dibaca → pesan "File ini bukan gambar yang bisa dibaca."

### 3D
- Buku yang serinya punya gambar digambar oleh **`InstancedMesh` per seri bergambar**, dengan tekstur gambar itu hanya di **sisi depan (punggung)** kotak; sisi lain tetap warna seri. Buku tanpa gambar tetap di mesh lama. Garis punggung (bands) tidak digambar di atas punggung bergambar.
- Tekstur dibuat dari data URL saat gambar tersedia (tanpa menunggu saat aplikasi dibuka); ukuran 64×512 sehingga 100 seri ≈ 13 MB memori grafis.
- **Nomor volume:** untuk buku bergambar yang dekat kamera, label punggung menampilkan **nomor volume** besar di bagian bawah punggung (bukan judul penuh), dengan latar tipis agar terbaca di atas gambar. Buku bergambar tanpa nomor volume tetap memakai label judul seperti sekarang. *(Keputusan pembangun.)*
- Sorotan dari pencarian tetap terlihat pada buku bergambar (mis. tint kuning pada sisi samping, atau garis tepi).

## Diserahkan ke pembangun
- Ganti nama seri: biarkan gambar di kunci lama, atau pindahkan saat semua buku seri itu diganti namanya — pilih yang paling sederhana, catat.
- Cara menerapkan tekstur hanya ke sisi depan instanced box (material array per sisi atau UV/geometri khusus).
- Gaya persis dialog dan thumbnail, selama mengikuti design system.
- Tempat kode pemrosesan gambar (canvas) dan cara mengujinya di jsdom (mis. memisahkan perhitungan potongan yang murni dari pemanggilan canvas).
