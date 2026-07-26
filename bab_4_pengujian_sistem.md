### 4.1 Implementasi Sistem

Implementasi sistem merupakan tahap meletakkan dan menguji sistem agar siap dioperasikan. Tahap implementasi ini menjabarkan spesifikasi perangkat keras dan perangkat lunak yang digunakan, baik dalam lingkungan pengembangan (lokal) maupun lingkungan produksi (*cloud hosting*).

#### 4.1.1 Implementasi Perangkat Keras
Implementasi perangkat keras menjabarkan spesifikasi perangkat keras yang digunakan untuk membangun, mengoperasikan, dan menjalankan platform pemesanan dan manajemen toko di Toko Naning, baik pada sisi pengembangan lokal maupun *server hosting* tempat aplikasi dan database bermukim secara *online*. Spesifikasi perangkat keras yang digunakan dapat dilihat pada Tabel 4.1.

**Tabel 4. 1 Implementasi Perangkat Keras**

| No | Perangkat Keras | Spesifikasi |
| :--- | :--- | :--- |
| 1 | Prosesor | 11th Gen Intel(R) Core(TM) i5-11400H @ 2.70GHz |
| 2 | Penyimpanan | 512 GB SSD |
| 3 | Memori (RAM) | 16 GB |
| 4 | Graphics Card / VGA | NVIDIA GeForce GTX 1650 Max-Q Design (4 GB) |
| 5 | Server Hosting Aplikasi | Vercel Cloud Serverless (AWS Lambda Infrastructure, Hobby Tier, 360 GB-Hrs Fluid Provisioned Memory, 4h Active CPU) |
| 6 | Server Hosting Database | Neon Cloud Database Infrastructure (PostgreSQL Serverless, Auto-scaling 0.25 - 2 Compute Units / CU, Storage 0.5 GB, Bandwidth 5 GB) |

#### 4.1.2 Implementasi Perangkat Lunak
Implementasi perangkat lunak menjelaskan tentang perangkat lunak pendukung, spesifikasi *hosting*, *Database Management System* (DBMS), serta *Application Programming Interface* (API) eksternal yang terintegrasi di dalam platform pemesanan dan manajemen toko di Toko Naning. Perangkat lunak yang digunakan dapat dilihat pada Tabel 4.2.

**Tabel 4. 2 Implementasi Perangkat Lunak**

| No | Perangkat Lunak | Spesifikasi |
| :--- | :--- | :--- |
| 1 | Sistem Operasi | Windows 11 |
| 2 | Teks Editor | Visual Studio Code / Antigravity |
| 3 | Web Browser | Google Chrome / Mozilla Firefox |
| 4 | Spesifikasi Hosting Aplikasi | Vercel Hobby Tier (Serverless Next.js App, 100 GB Fast Data Transfer, 1M Function Invocations, 1M Edge Requests) |
| 5 | Spesifikasi DBMS | Neon Serverless PostgreSQL (PostgreSQL v16, Quota Storage 0.5 GB, 100 CU-hrs Compute) & Prisma ORM (v6.19.0) |
| 6 | Payment Gateway API | Pakasir REST API v1 (Layanan integrasi pembayaran digital QRIS & Virtual Account) |
| 7 | WhatsApp Gateway API | Fonnte REST API v1 (Layanan pengiriman kode OTP verifikasi akun & notifikasi WhatsApp) |
| 8 | Map & Geolocation API | Leaflet.js (v1.9.4) & OpenStreetMap Standard Tile API (Penentu titik koordinat GPS & kalkulasi ongkir per zona) |
| 9 | Real-time Gateway API | Pusher Channels API v7 (Layanan sinkronisasi transaksi real-time POS kasir & admin) |




---

### 4.2 Pengujian Sistem


Pengujian sistem merupakan tahapan lanjutan dari pembangunan sistem yang telah direncanakan dan dibuat sebelumnya. Pengujian ini dilakukan dengan tujuan untuk menemukan kesalahan, bug, atau ketidaksesuaian fungsionalitas dari sistem yang dibangun, sehingga dapat diketahui apakah sistem telah sesuai dengan tujuan rancangan serta kebutuhan pengguna Toko Naning.

#### 4.2.1 Skenario Pengujian Blackbox

Pengujian *blackbox* difokuskan pada pemenuhan persyaratan fungsional dari perangkat lunak yang telah dibangun. Metode ini menguji fungsionalitas aplikasi tanpa harus mengetahui struktur kode internal program. Pengujian dilakukan dengan memberikan masukan (input) pada antarmuka sistem dan memeriksa hasil keluaran (output) apakah sudah sesuai dengan yang diharapkan.

Rencana dan skenario pengujian *blackbox* pada sistem Toko Naning yang telah direvisi dapat dilihat pada Tabel 4.14.

**Tabel 4.14 Skenario Pengujian Blackbox Sistem Toko Naning**

| No | Komponen yang Diuji | Butir Uji | Jenis Pengujian |
| :--- | :--- | :--- | :--- |
| 1 | Autentikasi & Akun Pengguna | 1. Login Pengguna<br>2. Registrasi Akun Pelanggan<br>3. Reset Lupa Password<br>4. Pembaruan data profil pelanggan | *Blackbox* |
| 2 | Belanja & Pemesanan Online | 1. Pencarian produk dan filter kategori produk<br>2. Pengaturan keranjang belanja (Cart Drawer)<br>3. Pengisian form checkout dan pemilihan alamat<br>4. Perhitungan ongkir per zona<br>5. Checkout & instruksi pembayaran digital | *Blackbox* |
| 3 | Transaksi POS Kasir (Offline) | 1. Pemilihan produk dan varian harga di kasir<br>2. Input uang tunai diterima & hitung kembalian<br>3. Penyelesaian transaksi & cetak struk pembayaran | *Blackbox* |
| 4 | Manajemen Pesanan | 1. Pemantauan daftar pesanan online & offline oleh Kasir<br>2. Konfirmasi pembayaran tunai<br>3. Penunjukan kurir dan pembaruan status kiriman | *Blackbox* |
| 5 | Manajemen Data Master | 1. Pengelolaan (tambah/ubah/hapus) data produk<br>2. Pengaturan varian harga dan stok online/offline<br>3. Pengelolaan data akun kasir dan data kurir | *Blackbox* |
| 6 | Laporan Penjualan & Laba Rugi | 1. Ekspor dan pengunduhan laporan penjualan | *Blackbox* |

---

#### 4.2.2 Kasus dan Hasil Pengujian

Pengujian dilakukan untuk menguji dan mengetahui setiap proses sistem yang sudah dibuat apakah sudah memenuhi kriteria yang telah dibutuhkan dan bebas dari terjadinya kesalahan fatal.

##### 4.2.2.1 Pengujian Login Pengguna
Pengujian pada halaman login dilakukan untuk menguji proses autentikasi akun pengguna baik untuk role pelanggan, kasir, maupun admin. Rincian pengujian dapat dilihat pada Tabel 4.15.

**Tabel 4.15 Hasil Pengujian Login Pengguna**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Nomor HP/Email: `admin@naning.com`, Password: `password123` (data valid) |
| **Yang Diharapkan** | Berhasil login dan sistem mengalihkan pengguna ke halaman dashboard sesuai role. |
| **Pengamatan** | Sistem memvalidasi token JWT dan memindahkan halaman ke `/admin/dashboard`. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Nomor HP/Email: `admin@naning.com`, Password: `salahpassword` (password salah) |
| **Yang Diharapkan** | Login gagal dan memunculkan notifikasi "Email/Nomor HP atau password salah". |
| **Pengamatan** | Sistem menolak autentikasi dan menampilkan pesan peringatan error. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.2 Pengujian Registrasi Akun Pelanggan
Pengujian registrasi dilakukan untuk menguji kelayakan pendaftaran pengguna baru menggunakan kode verifikasi OTP WhatsApp. Rincian pengujian dapat dilihat pada Tabel 4.16.

**Tabel 4.16 Hasil Pengujian Registrasi Akun Pelanggan**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Nama: `Budi`, Nomor HP: `081234567890`, Password: `password123`, Kode OTP: `123456` (valid) |
| **Yang Diharapkan** | Akun tersimpan ke database dan diarahkan ke halaman login dengan sukses. |
| **Pengamatan** | Database menyimpan data user dengan role `customer` dan memunculkan toast berhasil. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Nama: `Budi`, Nomor HP: `081234567890`, Password: `password123`, Kode OTP: `999999` (salah) |
| **Yang Diharapkan** | Pendaftaran gagal dan memunculkan notifikasi "Kode OTP salah atau kedaluwarsa". |
| **Pengamatan** | Sistem mendeteksi OTP tidak cocok, tidak menyimpan data, dan menampilkan warning. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.3 Pengujian Reset Lupa Password
Pengujian reset password digunakan untuk memastikan pelanggan yang lupa kata sandinya dapat memperbaruinya melalui verifikasi OTP WhatsApp. Rincian pengujian dapat dilihat pada Tabel 4.17.

**Tabel 4.17 Hasil Pengujian Reset Lupa Password**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Nomor HP: `081234567890`, Kode OTP: `654321` (valid), Password Baru: `baru1234` |
| **Yang Diharapkan** | Kata sandi diperbarui di database dan dialihkan kembali ke login. |
| **Pengamatan** | Password baru dienkripsi bcrypt dan berhasil digunakan saat login berikutnya. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Nomor HP: `081299999999` (belum terdaftar), Kode OTP: `111111` |
| **Yang Diharapkan** | Sistem menolak memproses OTP dan memunculkan notifikasi "Nomor tidak terdaftar". |
| **Pengamatan** | Sistem memblokir alur reset dan menampilkan pesan kesalahan nomor tidak dikenali. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.4 Pengujian Pembaruan Data Profil Pelanggan
Pengujian ini memvalidasi perubahan informasi profil pelanggan secara aman. Rincian pengujian dapat dilihat pada Tabel 4.18.

**Tabel 4.18 Hasil Pengujian Pembaruan Data Profil Pelanggan**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Nama Profil: `Budi Prasetyo`, Email: `budi.p@gmail.com` |
| **Yang Diharapkan** | Profil terupdate dan memunculkan toast "Profil berhasil diperbarui". |
| **Pengamatan** | Sistem memperbarui data database dan menampilkan nama baru di header aplikasi. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Nama Profil: ` ` (kosong) |
| **Yang Diharapkan** | Sistem menolak perubahan dan memunculkan pesan validasi "Nama tidak boleh kosong". |
| **Pengamatan** | Field form memunculkan pesan error di bawah input dan mencegah pengiriman request. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.5 Pengujian Pencarian Produk dan Filter Kategori Produk
Pengujian pencarian dan penyaringan dilakukan untuk mempermudah pencarian kebutuhan sembako. Rincian pengujian dapat dilihat pada Tabel 4.19.

**Tabel 4.19 Hasil Pengujian Pencarian & Filter Kategori**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Kata Kunci: `Beras`, Kategori: `Sembako` |
| **Yang Diharapkan** | Katalog hanya memunculkan produk beras yang tergolong dalam kategori sembako. |
| **Pengamatan** | Sistem memfilter produk berdasarkan input dan menampilkan daftar produk secara dinamis. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Kata Kunci: `Elektronik` |
| **Yang Diharapkan** | Katalog menampilkan pesan "Produk tidak ditemukan". |
| **Pengamatan** | Layar katalog kosong dan menampilkan keterangan bahwa barang tidak tersedia. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.6 Pengujian Pengaturan Keranjang Belanja (Cart Drawer)
Pengujian keranjang belanja untuk menguji fungsionalitas penambahan, pengeditan kuantitas, dan penghapusan item belanja. Rincian pengujian dapat dilihat pada Tabel 4.20.

**Tabel 4.20 Hasil Pengujian Pengaturan Keranjang Belanja**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Klik "+ Keranjang", ubah jumlah = `3`, klik hapus item |
| **Yang Diharapkan** | Produk masuk ke Cart Drawer, kuantitas berubah, total harga berlipat, dan item hilang saat dihapus. |
| **Pengamatan** | Semua fungsi penambahan, perkalian harga, dan penghapusan berjalan responsif. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Klik tombol tambah (+) kuantitas saat jumlah item menyamai sisa stok online |
| **Yang Diharapkan** | Tombol tambah (+) kuantitas dinonaktifkan (disabled) untuk mencegah kuantitas melebihi stok yang tersedia. |
| **Pengamatan** | Tombol tambah (+) kuantitas tidak dapat diklik karena dalam kondisi disabled. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.7 Pengujian Pengisian Form Checkout dan Pemilihan Alamat
Pengujian checkout bertujuan menguji kebenaran perekaman data pengiriman fisik pelanggan. Rincian pengujian dapat dilihat pada Tabel 4.21.

**Tabel 4.21 Hasil Pengujian Checkout & Alamat**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Nama: `Budi`, No HP: `081234567890`, Alamat: `Jl. Melati No. 4`, Pin GPS Leaflet ditandai |
| **Yang Diharapkan** | Data pengiriman terekam lengkap beserta koordinat latitude dan longitude peta. |
| **Pengamatan** | Koordinat GPS berhasil ditarik dari Leaflet Map API dan siap dikirim ke database. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Checkout tanpa menandai titik pengiriman pada peta (GPS kosong) |
| **Yang Diharapkan** | Sistem melarang checkout dan memunculkan toast "Silakan pilih titik koordinat di peta". |
| **Pengamatan** | Tombol "Buat Pesanan" memicu validasi error koordinat kosong. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.8 Pengujian Perhitungan Ongkir Per Zona
Pengujian ini bertujuan memvalidasi kebenaran penghitungan biaya kirim otomatis berbasis zona koordinat GPS. Rincian pengujian dapat dilihat pada Tabel 4.22.

**Tabel 4.22 Hasil Pengujian Perhitungan Ongkir**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Menempatkan pin GPS dengan jarak 2.5 km (Zona 1) |
| **Yang Diharapkan** | Ongkos kirim terhitung otomatis sebesar tarif Zona 1 (misal Rp 5.000). |
| **Pengamatan** | Sistem menghitung jarak koordinat secara matematis dan menyesuaikan nilai ongkir secara real-time. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Menempatkan pin GPS dengan jarak 22 km (Di luar batas jangkauan Toko Naning) |
| **Yang Diharapkan** | Muncul pesan "Lokasi di luar jangkauan kurir" dan mengunci transaksi. |
| **Pengamatan** | Sistem melarang pengiriman jarak jauh dan menyarankan opsi "Ambil di Toko". |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.9 Pengujian Checkout & Instruksi Pembayaran Digital
Pengujian ini memvalidasi proses penerbitan Virtual Account / QRIS melalui integrasi Pakasir API. Rincian pengujian dapat dilihat pada Tabel 4.23.

**Tabel 4.23 Hasil Pengujian Pembayaran Digital**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Klik tombol "Buat Pesanan" dan memilih metode pembayaran QRIS |
| **Yang Diharapkan** | Halaman beralih ke instruksi pembayaran lengkap dengan barcode QRIS dan countdown waktu bayar. |
| **Pengamatan** | Barcode QRIS sukses diunduh dari API Pakasir dengan tenggat waktu kedaluwarsa 15 menit. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Request checkout saat API pihak ketiga (Pakasir) mengalami offline / gangguan server |
| **Yang Diharapkan** | Muncul keterangan "Gagal menghubungi server pembayaran, harap pilih opsi pembayaran lain". |
| **Pengamatan** | Sistem menampilkan catch error terarah dan menyarankan opsi transaksi ulang. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.10 Pengujian Pemilihan Produk dan Varian Harga di Kasir
Pengujian transaksi offline kasir (POS) dalam mengenali multi-varian harga kemasan (dus/pak/item). Rincian pengujian dapat dilihat pada Tabel 4.24.

**Tabel 4.24 Hasil Pengujian Pemilihan Produk POS**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Memilih produk "Minyak Bimoli", memilih varian harga "Dus" |
| **Yang Diharapkan** | Item masuk ke keranjang kasir POS dengan nominal harga grosir per dus yang sesuai. |
| **Pengamatan** | Subtotal POS kasir langsung mendeteksi harga khusus varian kemasan dus. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Memilih varian produk dengan stok offline bernilai `0` |
| **Yang Diharapkan** | Sistem mengunci tombol pilihan produk dan melarang penambahan barang. |
| **Pengamatan** | Label tombol varian berubah menjadi "Habis" dan tidak bisa diklik oleh kasir. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.11 Pengujian Input Uang Tunai Diterima & Hitung Kembalian
Pengujian ini bertujuan memvalidasi keakuratan nominal kembalian kasir. Rincian pengujian dapat dilihat pada Tabel 4.25.

**Tabel 4.25 Hasil Pengujian Hitung Kembalian**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Total Belanja: Rp 45.000, Uang Diterima: Rp 50.000 |
| **Yang Diharapkan** | Sistem menghitung sisa kembalian uang tunai sebesar Rp 5.000 secara instan. |
| **Pengamatan** | Kalkulasi kembalian bernilai tepat dan tercetak di panel konfirmasi pembayaran. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Total Belanja: Rp 45.000, Uang Diterima: Rp 30.000 (Kurang) |
| **Yang Diharapkan** | Tombol konfirmasi terkunci dan memunculkan warning nominal kurang. |
| **Pengamatan** | Sistem menolak menyimpan transaksi dan memblokir tombol bayar. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.12 Pengujian Penyelesaian Transaksi & Cetak Struk Pembayaran
Pengujian ini menguji keluaran printer kasir setelah transaksi POS selesai dilakukan. Rincian pengujian dapat dilihat pada Tabel 4.26.

**Tabel 4.26 Hasil Pengujian Cetak Struk**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Klik tombol "Cetak Struk" pada transaksi offline POS sukses |
| **Yang Diharapkan** | Printer mengeluarkan struk kasir fisik dengan rincian item, subtotal, dan detail toko Naning. |
| **Pengamatan** | Jendela print peramban terbuka dengan layout cetak struk kasir 58mm yang presisi. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Klik "Cetak Struk" saat status koneksi printer terputus |
| **Yang Diharapkan** | Sistem memunculkan alert koneksi printer terganggu tanpa membatalkan transaksi yang sudah tercatat. |
| **Pengamatan** | Transaksi tetap aman di database, kasir diberi opsi cetak ulang nanti. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.13 Pengujian Pemantauan Daftar Pesanan Online & Offline oleh Kasir
Pengujian untuk menguji ketersediaan pemantauan transaksi real-time. Rincian pengujian dapat dilihat pada Tabel 4.27.

**Tabel 4.27 Hasil Pengujian Pemantauan Pesanan**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Masuk ke menu "Manajemen Pesanan" dan memfilter tab "paid" |
| **Yang Diharapkan** | Halaman menampilkan semua antrean transaksi baik online maupun offline yang telah terbayar. |
| **Pengamatan** | Daftar antrean tampil tepat sesuai status pembayaran yang dipilih secara real-time. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Memasukkan kata kunci pencarian yang tidak terdaftar di sistem (misalnya: "NamaFiktif123") |
| **Yang Diharapkan** | Sistem tidak crash, dan daftar pesanan menampilkan keterangan "Tidak ada pesanan ditemukan". |
| **Pengamatan** | Sistem memfilter data secara real-time dan menampilkan pesan penjelas "Tidak ada pesanan ditemukan" di tengah panel. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.14 Pengujian Konfirmasi Pembayaran Tunai
Pengujian pelunasan pesanan online dengan pembayaran tunai di toko. Rincian pengujian dapat dilihat pada Tabel 4.28.

**Tabel 4.28 Hasil Pengujian Konfirmasi Pembayaran Tunai**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Klik "Konfirmasi Pembayaran Tunai" pada order online pending |
| **Yang Diharapkan** | Status pesanan berubah menjadi `paid` dan stok offline disesuaikan. |
| **Pengamatan** | Status berganti secara instan dan invoice pelanggan terupdate otomatis. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| Kasus dan Hasil Uji (Data Salah) | |
| **Data Masukan** | Mengklik tombol "Set Sudah Dibayar" pada pesanan yang statusnya sudah kedaluwarsa (*expired*) atau dibatalkan (*cancelled*) |
| **Yang Diharapkan** | Tombol "Set Sudah Dibayar" berada dalam kondisi tidak aktif (*disabled*) secara visual dan tidak dapat diklik atau diproses untuk pelunasan. |
| **Pengamatan** | Sistem mendeteksi status pesanan bukan lagi `pending`, tombol *"Set Sudah Dibayar"* dinonaktifkan (disabled) secara visual (berwarna abu-abu) dan tidak merespons klik dari pengguna. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.15 Pengujian Penunjukan Kurir dan Pembaruan Status Kiriman
Pengujian pengantaran pesanan online ke alamat pelanggan. Rincian pengujian dapat dilihat pada Tabel 4.29.

**Tabel 4.29 Hasil Pengujian Penunjukan Kurir**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Memilih kurir "Budi Kurir", lalu mengklik tombol "Kirim Pesanan" |
| **Yang Diharapkan** | Status pesanan beralih menjadi `shipped` dan kurir terasosiasi pada order. |
| **Pengamatan** | Order sukses dimasukkan dalam daftar kirim kurir dengan status diperbarui. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Klik tombol "Kirim Pesanan" tanpa memilih nama kurir di dropdown |
| **Yang Diharapkan** | Muncul peringatan toast "Pilih kurir terlebih dahulu". |
| **Pengamatan** | Pengiriman dibatalkan oleh validasi program sebelum nama kurir diisi. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.16 Pengujian Pengelolaan (Tambah/Ubah/Hapus) Data Produk
Pengujian fungsionalitas manajemen katalog master produk oleh admin. Rincian pengujian dapat dilihat pada Tabel 4.30.

**Tabel 4.30 Hasil Pengujian Kelola Produk**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Mengisi Nama: `Beras Pandan Wangi`, Kategori: `Beras`, mengunggah gambar produk |
| **Yang Diharapkan** | Produk tersimpan ke database PostgreSQL dan langsung tampil di katalog. |
| **Pengamatan** | Produk terbuat dengan ID baru dan sukses disimpan beserta direktori gambarnya. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Menyimpan produk tanpa mengisi input Nama Produk (kosong) |
| **Yang Diharapkan** | Muncul pesan error "Nama produk wajib diisi" di form input. |
| **Pengamatan** | Form diblokir dari proses submisi dan memunculkan label peringatan berwarna merah. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.17 Pengujian Pengaturan Varian Harga dan Stok Online/Offline
Pengujian fleksibilitas pengaturan stok pemisah antara kasir offline dan penjualan online. Rincian pengujian dapat dilihat pada Tabel 4.31.

**Tabel 4.31 Hasil Pengujian Varian & Stok**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Edit varian "Item", Harga: Rp 15.000, Stok Online: `30`, Stok Offline: `50` |
| **Yang Diharapkan** | Stok online terupdate di katalog pembeli dan stok offline terupdate di POS kasir. |
| **Pengamatan** | Pengendalian alokasi stok berhasil terpisah secara dinamis di database. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Memasukkan nilai stok offline = `-5` (nilai negatif) |
| **Yang Diharapkan** | Sistem menolak perubahan dan memunculkan toast "Stok tidak boleh kurang dari nol". |
| **Pengamatan** | Validasi skema membatasi input angka negatif dan mereset nilai ke angka nol. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.18 Pengujian Pengelolaan Data Akun Kasir dan Data Kurir
Pengujian pendaftaran akun pegawai kasir dan kurir pengantaran. Rincian pengujian dapat dilihat pada Tabel 4.32.

**Tabel 4.32 Hasil Pengujian Kelola Kasir & Kurir**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Tambah Kasir (Nama: `Andi`, Telp: `081299998888`, Password: `kasirpassword`) |
| **Yang Diharapkan** | Akun kasir tersimpan dan Andi dapat login ke panel kasir dengan sukses. |
| **Pengamatan** | Akun baru terbuat di tabel `User` dengan penetapan level role `kasir`. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Mendaftarkan kasir dengan nomor handphone `081299998888` (sudah terdaftar) |
| **Yang Diharapkan** | Muncul pesan error database "Nomor HP sudah terdaftar". |
| **Pengamatan** | Sistem menolak duplikasi data unik (unique constraint) dan memunculkan warning error. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |

##### 4.2.2.19 Pengujian Ekspor dan Pengunduhan Laporan Penjualan
Pengujian ekspor data performa bisnis Toko Naning. Rincian pengujian dapat dilihat pada Tabel 4.33.

**Tabel 4.33 Hasil Pengujian Ekspor Laporan**

| Kasus dan Hasil Uji (Data Benar) | |
| :--- | :--- |
| **Data Masukan** | Memilih rentang waktu tanggal 1-30 Juni, klik "Ekspor ke CSV/Excel" |
| **Yang Diharapkan** | Berkas laporan penjualan berformat `.csv` atau `.xlsx` sukses terunduh ke perangkat. |
| **Pengamatan** | File spreadsheet berisi rekap pendapatan harian dan laba bersih berhasil terunduh. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
| **Kasus dan Hasil Uji (Data Salah)** | |
| **Data Masukan** | Ekspor laporan pada rentang tanggal kosong (tanpa transaksi) |
| **Yang Diharapkan** | Muncul pesan error "Tidak ada data penjualan pada periode ini". |
| **Pengamatan** | Sistem menampilkan toast warning dan membatalkan pengunduhan file kosong. |
| **Kesimpulan** | **[ √ ] Diterima** &nbsp;&nbsp;&nbsp;&nbsp; **[ ] Ditolak** |
