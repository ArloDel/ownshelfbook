# Mode Jelajahi (berjalan di dalam ruangan) — desain

## Maksud dan alasan
Setelah rak ditata, pemilik ingin **menikmati hasilnya** seperti berdiri dan berjalan di dalam ruangan koleksinya: tanpa panel dan tombol, dari tinggi mata, mendekati rak dan membaca punggung buku. Sekarang kamera hanya orbit dari luar, layar selalu penuh panel, dan klik di rak selalu memilih/mengubah sesuatu.

## Tujuan
- Tombol **Jelajahi** di toolbar Ruang 3D masuk ke mode berjalan; **Esc** atau tombol **Keluar** kembali, kamera kembali ke posisi semula.
- Saat Jelajahi: top bar, panel, toolbar, dan keterangan disembunyikan; hanya tombol Keluar dan petunjuk singkat.
- Kamera di **tinggi mata 160 cm**; berjalan dengan **W A S D / panah**, **Shift** berlari; **seret** untuk menoleh; **klik/ketuk lantai** untuk berjalan ke titik itu.
- **Tidak menembus** dinding atau rak.
- **Arahkan kursor** ke buku → kartu kecil (judul+volume, penulis bila ada, posisi) dan buku sedikit menyala; **klik buku** → kartu tetap tampil sampai klik di tempat lain.
- Bekerja dengan mouse+keyboard dan layar sentuh (ketuk lantai = jalan, seret = menoleh, ketuk buku = kartu).

## Bukan tujuan
- Mengubah apa pun saat Jelajahi (tidak bisa memilih rak, menaruh buku, menggeser rak).
- Pointer lock / gaya game (pilihan A) dan lompat antar titik pandang (pilihan C).
- Naik tangga, melompat, atau melihat dari luar ruangan saat Jelajahi.
- Joystick layar sentuh.

## Anti-tujuan
- Pengguna terjebak (tidak tahu cara keluar), atau tombol keyboard ikut mengetik di kolom input.
- Kamera menembus dinding/rak atau keluar ruangan.
- Gerak yang memusingkan bagi pengguna yang meminta gerak dikurangi.
- Data berubah karena klik saat menjelajah.

## Batasan
- Satuan cm di dunia data, meter di kamera (`group scale 0.01`).
- Kamera sekarang `OrbitControls` (`makeDefault`) + `CameraFocus` (animasi, menghormati reduced motion).
- Buku digambar `InstancedMesh` dengan `raycast` dimatikan; label dekat kamera sudah ada.
- Tapak rak berputar dihitung di `domain/shelves.ts` (`footprintCorners`, belum diekspor).
- UI bahasa Indonesia, shadcn/ui, gaya minimalis.

## Pendekatan
- **A. Pointer lock (gaya game)** — paling imersif; butuh klik untuk mengunci kursor, Esc melepasnya, tidak jalan di HP. Ditolak.
- **B. Seret untuk menoleh + WASD + klik lantai untuk berjalan** — **dipilih pemilik.** Kursor tetap biasa untuk menunjuk buku; jalan di HP lewat ketukan.
- **C. Lompat antar titik pandang** — paling sederhana, tidak terasa berjalan. Ditolak.

## Rincian

### Status dan masuk/keluar
- `uiStore.exploring: boolean` + `startExplore()` / `stopExplore()`. Hanya di halaman Ruang 3D. Masuk membatalkan pilihan rak/slot yang sedang tampil di panel (panel memang tersembunyi), **tanpa** mengubah data.
- Saat masuk: simpan posisi + target kamera orbit; kamera pindah ke **titik awal**: berdiri 150 cm di depan rak terdekat ke pusat ruangan, menghadap rak itu; bila tak ada rak, di tengah ruangan menghadap dinding belakang. Bila titik itu menabrak sesuatu, geser ke titik bebas terdekat (pusat ruangan sebagai cadangan).
- Saat keluar: kembalikan posisi + target kamera orbit yang disimpan.
- Masuk membatalkan animasi "Fokus ke rak" yang sedang berjalan. *(Keputusan pembangun.)*
- Bila titik awal dan pusat ruangan sama-sama di dalam rak, cari titik bebas terdekat dengan menyusuri lingkaran yang membesar dari pusat ruangan (langkah 10 cm). *(Keputusan pembangun.)*
- Pindah ke halaman Koleksi saat Jelajahi = keluar dulu.

### Ruangan tertutup saat Jelajahi
- Selama Jelajahi, `RoomMesh` juga menggambar **dinding depan, dinding kanan (beserta list dinding yang sama), dan langit-langit** (warna dinding sedikit lebih terang). Keluar dari Jelajahi = kembali ke tampilan orbit terbuka seperti sekarang. *(Diputuskan pemilik.)*

### Bergerak
- Tinggi mata tetap **160 cm** (tidak bisa naik/turun); pada ruangan lebih rendah dari 180 cm, tinggi mata = tinggi ruangan − 20 cm. *(Keputusan pembangun.)*
- Kecepatan jalan **1,4 m/s**, lari (Shift) **2,8 m/s**; arah relatif terhadap arah pandang mendatar.
- Menoleh: seret mouse/jari mengubah yaw (bebas) dan pitch (dibatasi **±60°**); kepekaan 0,25° per piksel.
- Klik/ketuk **lantai** (gerakan pointer ≤ 2 px, aturan `isClick` yang sudah ada): berjalan lurus ke titik itu dengan kecepatan jalan, berhenti 30 cm sebelum titik atau saat tertahan. Menekan tombol gerak membatalkan jalan otomatis. Dengan **reduced motion**: langsung pindah (tanpa animasi), tetap ditahan tabrakan.
- Tombol gerak tidak aktif bila fokus ada di elemen input.

### Tabrakan
- Pemain = lingkaran radius **25 cm** di lantai.
- Dinding: posisi dijepit di dalam ruangan dikurangi radius.
- Rak: tapak berputar tiap rak (OBB) diperbesar radius; posisi baru yang masuk ke tapak dibatalkan per sumbu (geser menyusuri sisi, tidak berhenti total). Semua rak menahan, termasuk rak dinding.

### Melihat buku
- Saat Jelajahi, mesh buku utama boleh di-raycast; `instanceId` → buku. Hover → kartu kecil mengikuti kursor (judul+volume, penulis bila ada, `placementLabel`), buku tersebut dinaikkan kecerahannya. Sorotan hover **terpisah** dari `highlightBookId` pencarian (tidak memakai kuning dan tidak mengubah pengelompokan punggung bergambar). *(Keputusan pembangun.)* Klik buku → kartu "dipin" di posisi itu sampai klik lantai, badan rak, atau tempat kosong, atau Esc pertama (Esc kedua keluar).
- Di layar sentuh: ketuk buku = pin kartu.

### Antarmuka saat Jelajahi
- Top bar, panel kiri/kanan, toolbar bawah, keterangan: tidak dirender.
- Pojok kanan atas: tombol **Keluar** (ikon X + teks), fokus keyboard bisa mencapainya.
- Bawah tengah, kecil dan pudar setelah 4 detik: "WASD/panah untuk berjalan · Shift lari · seret untuk menoleh · klik lantai untuk berjalan ke sana · Esc keluar".
- Tombol **Jelajahi** di toolbar bawah Ruang 3D (ikon `Footprints`), di antara pemisah dan `Tambah rak`.

## Diserahkan ke pembangun
- Mengganti `OrbitControls` dengan kontrol sendiri saat Jelajahi (unmount/disable) — cara teknis bebas, selama kamera orbit kembali utuh.
- Bentuk kode tabrakan (fungsi murni di domain/ui yang dites tanpa three.js disarankan).
- Gaya kartu buku, selama mengikuti design system.
- Mengekspor `footprintCorners` atau menulis padanannya.
