# Dokumentasi Notifikasi Sistem — Toko Naning

Dokumen ini merangkum **semua jenis notifikasi / umpan balik** yang ada di proyek, agar bisa dipakai untuk perancangan notifikasi, skripsi, atau prompt ke AI lain.

**Kanal notifikasi:**
1. **WhatsApp (Fonnte)** — pesan keluar ke pengguna/kurir
2. **Toast UI (Sonner)** — notifikasi popup di aplikasi
3. **Inline error** — pesan error di form (bukan toast)

---

## A. Notifikasi WhatsApp (Fonnte) — 6 jenis

Sumber kode: `services/whatsappService.ts`, `app/services/AuthService.ts`, `app/services/OrderService.ts`, `app/services/PaymentService.ts`.

| No | Nama Notifikasi | Penerima | Trigger / Event | Fungsi / File |
|----|-----------------|----------|-----------------|---------------|
| 1 | Kode OTP Registrasi | Calon pelanggan | Kirim OTP saat register | `AuthService.sendOtp(phone, 'register')` |
| 2 | Kode OTP Reset Password | Pelanggan terdaftar | Kirim OTP lupa password | `AuthService.sendOtp(phone, 'forgot_password')` |
| 3 | Pesanan Baru | Pelanggan | Checkout / buat pesanan | `sendOrderNotification` |
| 4 | Bukti Transaksi | Pelanggan | Pembayaran sukses / kirim struk | `sendReceipt` |
| 5 | Tugas Pengiriman Baru | Kurir | Status pesanan → `shipped` + kurir dipilih | `sendCourierDeliveryNotification` |
| 6 | Pesanan Sedang Dikirim | Pelanggan | Status pesanan → `shipped` (paralel dengan no. 5) | `sendCustomerShippingNotification` |

### Template pesan WhatsApp

#### 1. OTP Registrasi / Reset Password
```
🔐 *Kode OTP {Registrasi|Reset Password} - Toko Naning*

Kode verifikasi Anda:

*{kode 6 digit}*

Kode berlaku 5 menit. Jangan bagikan kode ini kepada siapapun.
```

#### 2. Pesanan Baru
```
📦 *Pesanan Baru - Toko Naning*

ID Pesanan: #{orderId}
Nama: {customerName}

*Detail Pesanan:*
- {item} ({qty}x) = Rp {harga}
...
[Subtotal + Ongkir jika ada]
*Total: Rp {totalHarga}*

Terima kasih atas pesanan Anda!
```

#### 3. Bukti Transaksi
```
🧾 *Bukti Transaksi - Toko Naning*

ID Pesanan: #{orderId}
Nama: {customerName}
Status: {pending|paid|processing|delivered}
Tanggal: {createdAt}

*Detail Pesanan:*
- {item} ({qty}x) = Rp {harga}
...
*Total: Rp {totalHarga}*

Terima kasih telah berbelanja di Toko Naning! 🛒
```

#### 4. Tugas Pengiriman (Kurir)
```
🚚 *Tugas Pengiriman Baru - Toko Naning*

Pelanggan: {customerName} ({customerPhone})
Alamat: {shippingAddress}

📦 Produk:
- {item} ({qty}x)

📝 Catatan: {shippingNotes atau '-'}
```

#### 5. Pesanan Sedang Dikirim (Pelanggan)
```
🚚 *Pesanan Sedang Dikirim - Toko Naning*

Halo {customerName},
Pesanan Anda sedang dikirim.

No. Pesanan: #{orderId}
Alamat Tujuan: {shippingAddress}
Kurir: {courierName} ({courierPhone})

Terima kasih sudah berbelanja di Toko Naning 🙏
```

---

## B. Notifikasi Toast UI (Sonner) — ~77 jenis unik

Library: `sonner`. Dipasang global di `app/layout.tsx` (`<Toaster richColors position="top-right" />`).

Tipe: `success` | `error` | `warning` | `info` | `confirm` (toast biasa).

### B1. Checkout — `app/checkout/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 1 | error | Lokasi Di Luar Jangkauan | Maksimal 10km (atau pesan API) |
| 2 | error | Gagal | Coba pilih lokasi lagi. |
| 3 | warning | Data Belum Lengkap | Nama dan nomor whatsapp harus diisi |
| 4 | warning | Keranjang Kosong | Tambahkan produk terlebih dahulu |
| 5 | warning | Metode Pembelian Belum Dipilih | Silakan pilih metode pembelian terlebih dahulu (Ambil Sendiri atau Antar) |
| 6 | warning | Metode Pembayaran Belum Dipilih | Silakan pilih metode pembayaran terlebih dahulu |
| 7 | warning | Alamat Kosong | Lengkapi alamat pengiriman |
| 8 | warning | Lokasi Belum Dipilih | Pilih titik pengiriman di peta |
| 9 | warning | Di Luar Jangkauan | Lokasi di luar radius 10km |
| 10 | warning | Metode Tidak Valid | Pesanan antar wajib pembayaran non-tunai. |
| 11 | error | Gagal Membuat Pesanan | (pesan error dari API) |
| 12 | success | Pesanan Berhasil | Silakan lakukan pembayaran tunai saat ambil pesanan. |
| 13 | error | Terjadi Kesalahan | (error.message) |

### B2. Produk — `app/produk/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 14 | error | Harga Belum Tersedia | Produk ini belum memiliki harga. Silakan hubungi admin. |
| 15 | success | Produk Ditambahkan | `{nama} ({tipe harga}) berhasil ditambahkan ke keranjang` |
| 16 | error | Gagal Menambahkan | Gagal menambahkan produk ke keranjang. Silakan coba lagi |

### B3. Keranjang — `components/cart-drawer.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 17 | info | Produk Dihapus | Produk telah dihapus dari keranjang |
| 18 | success | Jumlah Diperbarui | Jumlah produk telah diubah menjadi `{n}` |
| 19 | warning | Keranjang masih kosong | — |

### B4. Pesanan pelanggan — `app/pesanan/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 20 | success | Pembayaran Berhasil! | Pesanan `#{id}` Anda berhasil dibayar dan sedang diproses. |
| 21 | error | Gagal Memuat Pesanan | Terjadi kesalahan saat memuat data. / (error.message) |

### B5. Login — `app/login/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 22 | success | Registrasi Berhasil! | Silakan login dengan akun baru Anda. |

### B6. Profil — `app/profil/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 23 | error | Error | Nama tidak boleh kosong |
| 24 | error | Error | Password dan Konfirmasi Password tidak cocok |
| 25 | success | Berhasil | Profil berhasil diperbarui |
| 26 | error | Gagal | (error.message) |

### B7. Kasir — `app/admin/kasir/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 27 | success | Pembayaran Terkonfirmasi! | Pesanan telah dibayar dan lunas. |
| 28 | success | Disalin | Nomor pembayaran berhasil disalin. |
| 29 | error | Error | Data produk tidak valid |
| 30 | error | Error | Data varian tidak valid |
| 31 | error | Error | Harga produk tidak valid |
| 32 | error | Error | Stok tidak tersedia |
| 33 | error | Error | Stok tersedia hanya `{n}` unit |
| 34 | error | Error | Nama dan nomor whatsapp harus diisi |
| 35 | error | Error | Keranjang masih kosong |
| 36 | error | Error | Pilih metode pembayaran terlebih dahulu |
| 37 | error | Error | Uang yang diterima harus diisi |
| 38 | error | Error | Uang tidak mencukupi! Kurang: `{rupiah}` |
| 39 | error | Error | (pesan error API dinamis) |
| 40 | success | Berhasil | Pesanan berhasil dibuat! / Pesanan berhasil dibuat! Kembalian: `{rupiah}` |
| 41 | success | Berhasil | Pesanan berhasil dibuat! Silakan bayar. |
| 42 | error | Error | Terjadi kesalahan saat checkout |
| 43 | info | Status masih pending. | — |

### B8. Admin pesanan — `app/admin/pesanan/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 44 | error | Gagal update status | Gagal mengupdate status pesanan / (error.message) |
| 45 | error | Tidak Dapat Mencetak Struk | Pesanan yang telah dibatalkan tidak dapat dicetak struknya. |
| 46 | warning | Kurir belum dipilih | Pilih kurir sebelum ubah status pengiriman. |

### B9. Admin pengiriman — `app/admin/pengiriman/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 47 | warning | Kurir belum dipilih | Pilih kurir dulu sebelum kirim. |
| 48 | error | Gagal update status | (pesan API) / Terjadi kesalahan |
| 49 | success | Status diperbarui | Pesanan masuk dalam pengiriman. **atau** Pesanan ditandai selesai. |

### B10. Admin pegawai — `app/admin/pegawai/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 50 | success | Kasir ditambahkan | Akun kasir baru berhasil dibuat. |
| 51 | error | Gagal tambah kasir | (error.message) |
| 52 | error | Gagal hapus kasir | (pesan API) / Terjadi kesalahan |
| 53 | success | Kasir dihapus | Akun kasir berhasil dihapus. |
| 54 | warning | Password kosong | Isi password baru dulu. |
| 55 | error | Gagal reset password | (pesan API) / Terjadi kesalahan |
| 56 | success | Password direset | Password kasir berhasil diperbarui. |
| 57 | success | Kurir ditambahkan | Kurir baru berhasil masuk daftar. |
| 58 | error | Gagal tambah kurir | (error.message) |
| 59 | error | Gagal aktifkan kurir | (pesan API) / Terjadi kesalahan |
| 60 | error | Gagal nonaktifkan kurir | (pesan API) / Terjadi kesalahan |
| 61 | success | Kurir diaktifkan | Kurir berhasil diaktifkan kembali. |
| 62 | success | Kurir dinonaktifkan | Kurir berhasil dipindah dari daftar aktif. |
| 63 | error | Terjadi kesalahan | — |

### B11. Admin produk — `app/admin/produk/page.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 64 | error | Error | File harus berupa gambar |
| 65 | success | Berhasil | Gambar berhasil diunggah |
| 66 | error | Error | Gagal mengunggah gambar |
| 67 | error | Error | Semua field harus diisi |
| 68 | error | Error | ID produk tidak ditemukan |
| 69 | success | Berhasil | Produk berhasil diupdate |
| 70 | error | Error | Gagal mengupdate produk |
| 71 | success | Berhasil | Produk berhasil ditambahkan |
| 72 | error | Error | Gagal menambahkan produk |
| 73 | error | Error | Terjadi kesalahan |
| 74 | success | Berhasil | Produk berhasil dihapus |
| 75 | error | Error | Gagal menghapus produk |
| 76 | confirm | Yakin ingin menghapus produk ini? | Toast konfirmasi aksi hapus |

### B12. Laporan penjualan — `components/laporan-penjualan.tsx`

| No | Tipe | Judul | Deskripsi |
|----|------|-------|-----------|
| 77 | error | Rentang Tanggal Tidak Valid | Tanggal awal tidak boleh lebih besar dari tanggal akhir. |

---

## C. Inline Error (Form Auth) — bukan toast

Ditampilkan sebagai teks merah di halaman (`setError`), bukan popup Sonner.

### C1. Login — `app/login/page.tsx`

| No | Pesan |
|----|-------|
| 1 | Email/Phone atau password salah. Silakan coba lagi. |
| 2 | Tidak dapat terhubung ke database. Silakan coba lagi nanti. |
| 3 | Tidak dapat terhubung ke server. Pastikan server berjalan dan coba lagi. |
| 4 | Login gagal / Terjadi kesalahan saat login (fallback) |

### C2. Register — `app/register/page.tsx` (+ pesan dari `AuthService`)

| No | Pesan |
|----|-------|
| 5 | Nama harus diisi |
| 6 | Nomor WhatsApp harus diisi |
| 7 | Password minimal 6 karakter |
| 8 | Password tidak cocok |
| 9 | Gagal mengirim OTP |
| 10 | Nomor WhatsApp sudah terdaftar |
| 11 | Gagal mengirim OTP. Pastikan nomor WhatsApp aktif. |
| 12 | Masukkan 6 digit kode OTP |
| 13 | Kode OTP salah |
| 14 | Kode OTP sudah kadaluarsa. Silakan minta kode baru. |
| 15 | Kode OTP tidak ditemukan. Silakan minta kode baru. |
| 16 | Verifikasi gagal |
| 17 | Registrasi gagal |
| 18 | Email atau nomor WhatsApp sudah terdaftar |
| 19 | Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu. |
| 20 | Gagal mengirim ulang |
| 21 | Terjadi kesalahan. Cek koneksi internet Anda. |
| 22 | Terjadi kesalahan saat registrasi. |
| 23 | Terjadi kesalahan. |

### C3. Lupa password — `app/lupa-password/page.tsx` (+ pesan dari `AuthService`)

| No | Pesan |
|----|-------|
| 24 | Nomor WhatsApp harus diisi |
| 25 | Password baru minimal 6 karakter |
| 26 | Password tidak cocok |
| 27 | Nomor WhatsApp tidak terdaftar |
| 28 | Gagal mengirim OTP |
| 29 | Gagal mengirim OTP. Pastikan nomor WhatsApp aktif. |
| 30 | Masukkan 6 digit kode OTP |
| 31 | Kode OTP salah |
| 32 | Kode OTP sudah kadaluarsa. Silakan minta kode baru. |
| 33 | Kode OTP tidak ditemukan. Silakan minta kode baru. |
| 34 | Verifikasi gagal |
| 35 | Gagal mereset password |
| 36 | Pengguna tidak ditemukan |
| 37 | Nomor WhatsApp belum diverifikasi. Silakan verifikasi OTP terlebih dahulu. |
| 38 | Gagal mengirim ulang |
| 39 | Terjadi kesalahan. Cek koneksi internet Anda. |
| 40 | Terjadi kesalahan. |

---

## D. Catatan dari Sequence Diagram (nama "Notifikasi")

Beberapa diagram sebut "notifikasi" untuk feedback UI kasir:

| No | Nama di diagram | Konteks | Realisasi di kode |
|----|-----------------|---------|-------------------|
| 1 | Notifikasi Produk Tidak Ditemukan | Kasir cari produk | Toast error / UI kasir |
| 2 | Notifikasi Pembayaran Gagal | Proses pembayaran kasir | Toast error |
| 3 | Notifikasi Printer Tidak Aktif | Cetak struk thermal | Disebut di diagram; di kode kasir print lewat popup window |

Halaman `app/payment/pending/page.tsx` juga menampilkan teks:
> "Kami akan mengirimkan notifikasi setelah pembayaran dikonfirmasi."

Realisasinya: toast **Pembayaran Berhasil!** di halaman pesanan + WhatsApp **Bukti Transaksi** (`sendReceipt`).

---

## E. Ringkasan angka

| Kanal | Jumlah (approx.) | Peran di perancangan |
|-------|------------------|----------------------|
| WhatsApp (Fonnte) | **6** | Notifikasi bisnis / eksternal |
| Toast Sonner | **~77** | Umpan balik UI in-app |
| Inline error auth | **~40** (ada overlap antar form) | Validasi & error form |
| **Total jenis feedback** | **~100+** | — |

---

## F. Saran struktur tabel perancangan (skripsi)

Gunakan kolom berikut:

| No | Nama Notifikasi | Event / Trigger | Penerima | Kanal | Tipe | Isi Pesan | Modul |
|----|-----------------|-----------------|----------|-------|------|-----------|-------|

**Rekomendasi pemisahan bab/tabel:**
- **Tabel 1 — Notifikasi WhatsApp**: hanya 6 item (inti komunikasi bisnis).
- **Tabel 2 — Notifikasi / Umpan Balik UI**: toast + inline error (opsional dikelompokkan per modul).

---

## G. File sumber utama

| File | Isi terkait |
|------|-------------|
| `services/whatsappService.ts` | Template & kirim WA: order, receipt, kurir, pelanggan |
| `app/services/AuthService.ts` | OTP register & forgot password |
| `app/services/OrderService.ts` | Trigger WA pesanan & pengiriman |
| `app/services/PaymentService.ts` | Trigger `sendReceipt` setelah bayar |
| `app/layout.tsx` | Global `<Toaster />` Sonner |
| `app/checkout/page.tsx` | Toast checkout |
| `app/admin/kasir/page.tsx` | Toast kasir/POS |
| `app/admin/pesanan/page.tsx` | Toast kelola pesanan |
| `app/admin/pengiriman/page.tsx` | Toast pengiriman |
| `app/admin/pegawai/page.tsx` | Toast kelola kasir/kurir |
| `app/admin/produk/page.tsx` | Toast CRUD produk |
| `app/produk/page.tsx` | Toast tambah keranjang |
| `components/cart-drawer.tsx` | Toast keranjang |
| `app/pesanan/page.tsx` | Toast status pembayaran |
| `app/profil/page.tsx` | Toast update profil |
| `app/login/page.tsx` | Toast + inline login |
| `app/register/page.tsx` | Inline register/OTP |
| `app/lupa-password/page.tsx` | Inline lupa password/OTP |
| `components/laporan-penjualan.tsx` | Toast validasi tanggal |

---

*Dokumen digenerate dari inventory kode proyek Next.js Toko Naning.*
