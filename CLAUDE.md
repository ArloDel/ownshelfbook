# OwnShelfBook — aturan proyek

## Commit
- **Commit sesering mungkin, sekecil mungkin.** Satu commit = satu perubahan logis yang utuh. Jangan menumpuk banyak perubahan dalam satu commit.
- Pecah setiap tugas di rencana menjadi beberapa commit, misalnya:
  - tes yang gagal (`test: ...`) → implementasi yang membuatnya lulus (`feat: ...`) → rapikan (`refactor: ...`);
  - tiap file/komponen baru, perubahan konfigurasi, penambahan dependensi, dan dokumentasi masing-masing commit sendiri.
- Setiap commit harus dalam kondisi sehat: `npm test` dan `npm run build` tetap jalan (kecuali commit `test:` yang sengaja berisi tes gagal sebelum implementasinya).
- Pesan commit memakai Conventional Commits: `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`, `style:`.

## Atribusi
- **Jangan pernah menyertakan Claude sebagai co-author/collaborator.** Tidak ada trailer `Co-Authored-By: Claude ...`, tidak ada teks "Generated with Claude Code", dan tidak ada link sesi di pesan commit maupun deskripsi PR.
- Commit memakai identitas git milik pemilik repo, tanpa mengubah `user.name`/`user.email`.
