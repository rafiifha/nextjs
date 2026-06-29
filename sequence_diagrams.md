# Dokumentasi Sequence Diagram - Sistem Kasir & E-Commerce Toko Naning

Dokumen ini berisi 21 sequence diagram untuk alur proses sistem kasir dan e-commerce Toko Naning menggunakan format **Mermaid.js**.

### Aturan Simbol UML Sequence Diagram

| No | Simbol | Nama | Deskripsi |
|----|--------|------|-----------|
| 1 | 🧑 (stick figure) | **Actor** | Pengguna sistem atau sistem eksternal pihak ketiga |
| 2 | ▯ (kotak + garis) | **Lifeline** | Objek/komponen internal sistem (`<<View>>`, `<<Controller>>`, `<<Service>>`, `<<Entity>>`) |
| 3 | ▮ (bar tipis di lifeline) | **Activation** | Menandakan waktu di mana objek sedang aktif atau menjalankan proses tertentu |
| 4 | → (solid line) | **Call Message** | Pemanggilan method/operasi ke objek lain |
| 5 | ⇠ (dashed line) | **Return Message** | Nilai kembalian dari operasi yang dipanggil |
| 6 | ↻ (loop ke diri sendiri) | **Self Message** | Objek memanggil method miliknya sendiri (nested activation) |

### Aktor Sistem

| Aktor | Role di DB | Deskripsi |
|-------|-----------|-----------|
| **Pelanggan** | `customer` | Pengguna publik yang register, browse, beli produk online |
| **Admin** | `admin` | Pemilik toko. Akses: Laporan, Kelola Produk, Kelola Pegawai |
| **Kasir** | `kasir` | Pegawai. Akses: Halaman Kasir (POS), Manajemen Pesanan |

### Aktor Pihak Ketiga (External System)

| Aktor | Deskripsi |
|-------|-----------|
| **FonnteAPI** | API pengiriman pesan WhatsApp |
| **PakasirAPI** | Payment gateway (QRIS, VA) |
| **PusherService** | Realtime broadcast event |
| **MobileBanking** | Aplikasi bank/e-wallet milik pelanggan |

---

### 1. Sequence Diagram Register
Alur pendaftaran akun pelanggan baru. Registrasi hanya menghasilkan user dengan role `customer`.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>RegisterPage
    participant Controller as <<Controller>><br/>AuthController
    participant Service as <<Service>><br/>AuthService
    participant Entity as <<Entity>><br/>User

    Pelanggan->>View: inputDataRegistrasi(name, phone, password)
    activate View
    View->>Controller: register(request)
    activate Controller
    Controller->>Service: register(name, phone, password)
    activate Service
    Service->>Entity: findFirst(phone)
    activate Entity
    Entity-->>Service: data user / null
    deactivate Entity

    alt User Sudah Terdaftar
        Service-->>Controller: throw Error "sudah terdaftar"
        Controller-->>View: 400 Bad Request
        View-->>Pelanggan: Tampilkan Pesan Nomor Sudah Digunakan
    else User Belum Terdaftar
        Service->>Service: hashPassword(password)
        activate Service
        deactivate Service

        Service->>Entity: create(name, phone, hashedPassword, role='customer')
        activate Entity
        Entity-->>Service: data user baru
        deactivate Entity

        Service->>Service: generateToken(userId, role)
        activate Service
        deactivate Service

        Service-->>Controller: { message, token, user }
        Controller-->>View: 200 OK (JSON)
        View-->>Pelanggan: Redirect ke LoginPage
    end
    deactivate Service
    deactivate Controller
    deactivate View
```

---

### 2. Sequence Diagram Login
Alur autentikasi pengguna (Pelanggan/Admin/Kasir). Setelah login, keranjang belanja guest dimigrasikan ke akun user.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>LoginPage
    participant Controller as <<Controller>><br/>AuthController
    participant Service as <<Service>><br/>AuthService
    participant Entity as <<Entity>><br/>User
    participant CartSvc as <<Service>><br/>CartService

    Pelanggan->>View: inputKredensial(identifier, password)
    activate View
    View->>Controller: login(request)
    activate Controller
    Controller->>Service: login(email, phone, password)
    activate Service
    Service->>Entity: findFirst(email OR phone)
    activate Entity
    Entity-->>Service: data user (hashed password)
    deactivate Entity

    alt User Tidak Ditemukan / Password Salah
        Service-->>Controller: throw Error "salah"
        Controller-->>View: 401 Unauthorized
        View-->>Pelanggan: Tampilkan Pesan Login Gagal
    else Kredensial Valid
        Service->>Service: bcrypt.compare(password, hash)
        activate Service
        deactivate Service

        Service->>Service: generateToken(userId, role)
        activate Service
        deactivate Service

        Service-->>Controller: { message, token, user }
        Controller-->>View: 200 OK (JSON token & user)

        View->>View: saveToLocalStorage(token, user)
        activate View
        deactivate View

        View->>CartSvc: migrateCartToUser(userId)
        activate CartSvc
        CartSvc-->>View: migrasi selesai
        deactivate CartSvc

        View-->>Pelanggan: Redirect (customer→/produk, admin→/admin/dashboard, kasir→/admin/kasir)
    end
    deactivate Service
    deactivate Controller
    deactivate View
```

---

### 3. Sequence Diagram Lupa Password
Alur reset kata sandi. Sistem generate password baru lalu mengirimkannya via WhatsApp menggunakan API Fonnte.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>LupaPasswordPage
    participant Controller as <<Controller>><br/>AuthController
    participant Service as <<Service>><br/>AuthService
    participant Entity as <<Entity>><br/>User
    participant WA as <<Service>><br/>WhatsAppService
    actor Fonnte as FonnteAPI

    Pelanggan->>View: kirimRequestReset(identifier)
    activate View
    View->>Controller: forgotPassword(request)
    activate Controller
    Controller->>Service: forgotPassword(identifier)
    activate Service
    Service->>Entity: findFirst(email OR phone)
    activate Entity
    Entity-->>Service: data user
    deactivate Entity

    alt User Tidak Ditemukan
        Service-->>Controller: throw Error "tidak ditemukan"
        Controller-->>View: 404 Not Found
        View-->>Pelanggan: Tampilkan Pesan Pengguna Tidak Ditemukan
    else User Ditemukan
        Service->>Service: generateNewPassword()
        activate Service
        deactivate Service

        Service->>Service: bcrypt.hash(newPassword)
        activate Service
        deactivate Service

        Service->>Entity: update(userId, hashedPassword)
        activate Entity
        Entity-->>Service: user terupdate
        deactivate Entity

        Service->>WA: sendWhatsAppMessage(phone, message)
        activate WA
        WA->>WA: normalizeWhatsAppNumber(phone)
        activate WA
        deactivate WA

        WA->>Fonnte: POST /send (target, message)
        activate Fonnte
        Fonnte-->>WA: response status
        deactivate Fonnte
        WA-->>Service: WhatsApp terkirim
        deactivate WA

        Service-->>Controller: { success, message }
        Controller-->>View: 200 OK
        View-->>Pelanggan: Tampilkan Pesan Password Baru Dikirim ke WhatsApp
    end
    deactivate Service
    deactivate Controller
    deactivate View
```

---

### 4. Sequence Diagram Kelola Profil
Alur modifikasi data profil pengguna (nama, email, nomor HP, password). Berlaku untuk semua role.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>ProfilPage
    participant Controller as <<Controller>><br/>UserController
    participant Service as <<Service>><br/>UserService
    participant Entity as <<Entity>><br/>User

    Pelanggan->>View: updateProfil(name, email, phone, password)
    activate View
    View->>Controller: updateProfile(request)
    activate Controller
    Controller->>Service: updateProfile(id, name, email, phone, password)
    activate Service

    opt Password Diubah
        Service->>Service: bcrypt.hash(password)
        activate Service
        deactivate Service
    end

    Service->>Entity: update(id, dataToUpdate)
    activate Entity
    Entity-->>Service: data user terupdate
    deactivate Entity
    Service-->>Controller: updatedUser
    deactivate Service
    Controller-->>View: 200 OK (JSON user)
    deactivate Controller

    View->>View: updateLocalStorage(user)
    activate View
    deactivate View

    View-->>Pelanggan: Tampilkan Pesan Profil Berhasil Diperbarui
    deactivate View
```

---

### 5. Sequence Diagram Browse Produk
Alur pelanggan menelusuri dan mencari katalog produk di halaman publik `/produk`.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>ProdukPage
    participant Controller as <<Controller>><br/>ProductController
    participant Service as <<Service>><br/>ProductService
    participant Entity as <<Entity>><br/>Product

    Pelanggan->>View: bukaHalamanProduk()
    activate View
    View->>Controller: getProducts(request)
    activate Controller
    Controller->>Service: getProductsPaginated(page, limit)
    activate Service
    Service->>Entity: findMany(skip, take, include variants & category)
    activate Entity
    Entity-->>Service: daftar produk beserta varian
    deactivate Entity
    Service-->>Controller: { data, total }
    deactivate Service
    Controller-->>View: 200 OK (JSON data, total, page, totalPages)
    deactivate Controller
    View-->>Pelanggan: Tampilkan Katalog Produk Beserta Harga Varian
    deactivate View
```

---

### 6. Sequence Diagram Tambah ke Keranjang
Alur penambahan produk ke keranjang belanja. Keranjang disimpan di LocalStorage client-side, dipisahkan per userId.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>ProdukPage
    participant Service as <<Service>><br/>CartService
    participant Entity as <<Entity>><br/>LocalStorage

    Pelanggan->>View: klikTambahKeKeranjang(productId, priceType, qty)
    activate View
    View->>Service: addToCart(productId, product, variantId, priceType, price, qty)
    activate Service
    Service->>Entity: getItem("tokonaning_cart_{userId}")
    activate Entity
    Entity-->>Service: data keranjang saat ini (JSON)
    deactivate Entity

    Service->>Service: cekItemSudahAda(productId, priceType)
    activate Service
    deactivate Service

    alt Item Sudah Ada di Keranjang
        Service->>Service: incrementQuantity()
        activate Service
        deactivate Service
    else Item Belum Ada
        Service->>Service: pushNewItem()
        activate Service
        deactivate Service
    end

    Service->>Entity: setItem("tokonaning_cart_{userId}", updatedJSON)
    activate Entity
    Entity-->>Service: tersimpan
    deactivate Entity

    Service->>Service: dispatchEvent("cartUpdated")
    activate Service
    deactivate Service

    Service-->>View: data keranjang terbaru
    deactivate Service
    View-->>Pelanggan: Tampilkan Badge Keranjang Terupdate
    deactivate View
```

---

### 7. Sequence Diagram Pilih Metode Pengiriman
Alur pemilihan metode pengiriman (pickup/delivery) dan penghitungan jarak & ongkir saat delivery dipilih.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>CheckoutPage
    participant Controller as <<Controller>><br/>DeliveryController
    participant Service as <<Service>><br/>DeliveryService

    Pelanggan->>View: pilihMetodePengiriman(method)
    activate View

    alt Metode = "pickup" (Ambil Sendiri)
        View->>View: setShippingFee(0)
        activate View
        deactivate View

        View->>View: hideMapComponent()
        activate View
        deactivate View

        View-->>Pelanggan: Tampilkan Info Alamat Toko & Ongkir Rp 0
    else Metode = "delivery" (Diantar)
        View->>View: renderLeafletMap()
        activate View
        deactivate View

        Pelanggan->>View: pilihTitikLokasiDiPeta(lat, lng)
        View->>Controller: calculateShippingFee(request)
        activate Controller
        Controller->>Service: calculateShippingFee(lat, lng)
        activate Service

        Service->>Service: haversineDistanceKm(storeLat, storeLng, lat, lng)
        activate Service
        deactivate Service

        Service->>Service: getZoneAndFee(distanceKm)
        activate Service
        deactivate Service

        Service-->>Controller: { distanceKm, zone, shippingFee, store }
        deactivate Service
        Controller-->>View: 200 OK (JSON shippingData)
        deactivate Controller
        View-->>Pelanggan: Tampilkan Jarak, Zona, Ongkir & Total Harga Terupdate
    end
    deactivate View
```

---

### 8. Sequence Diagram Hitung Jarak Lokasi
Alur penghitungan jarak menggunakan rumus Haversine antara koordinat toko dan pelanggan.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>CheckoutPage
    participant Controller as <<Controller>><br/>DeliveryController
    participant Service as <<Service>><br/>DeliveryService

    Pelanggan->>View: pilihTitikLokasiDiPeta(lat, lng)
    activate View
    View->>Controller: calculateShippingFee(request)
    activate Controller
    Controller->>Service: calculateShippingFee(lat, lng)
    activate Service

    Service->>Service: toRadians(storeLat)
    activate Service
    deactivate Service

    Service->>Service: toRadians(lat)
    activate Service
    deactivate Service

    Service->>Service: haversineDistanceKm(storeLat, storeLng, lat, lng)
    activate Service
    Note over Service: dLat = toRadians(lat2 - lat1)<br/>dLng = toRadians(lng2 - lng1)<br/>a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLng/2)<br/>distance = 6371 * 2 * atan2(√a, √(1-a))
    deactivate Service

    Service-->>Controller: distanceKm
    deactivate Service
    Controller-->>View: 200 OK (JSON { distanceKm })
    deactivate Controller
    View-->>Pelanggan: Tampilkan Jarak Lokasi
    deactivate View
```

---

### 9. Sequence Diagram Hitung Ongkir
Alur penentuan tarif ongkos kirim berdasarkan zona jarak setelah jarak dihitung oleh Haversine.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>CheckoutPage
    participant Controller as <<Controller>><br/>DeliveryController
    participant Service as <<Service>><br/>DeliveryService

    Pelanggan->>View: pilihTitikLokasiDiPeta(lat, lng)
    activate View
    View->>Controller: calculateShippingFee(request)
    activate Controller
    Controller->>Service: calculateShippingFee(lat, lng)
    activate Service

    Service->>Service: haversineDistanceKm(storeLat, storeLng, lat, lng)
    activate Service
    deactivate Service

    alt distanceKm > 10 km
        Service-->>Controller: throw Error "Lokasi di luar jangkauan (max 10 km)"
        deactivate Service
        Controller-->>View: 400 Bad Request
        deactivate Controller
        View-->>Pelanggan: Tampilkan Pesan Error Lokasi Terlalu Jauh
    else distanceKm <= 10 km
        Service->>Service: getZoneAndFee(distanceKm)
        activate Service
        Note over Service: <= 3km → Zona 1 (Rp 15.000)<br/><= 6km → Zona 2 (Rp 20.000)<br/><= 10km → Zona 3 (Rp 25.000)
        deactivate Service

        Service-->>Controller: { distanceKm, zone, shippingFee, store }
        deactivate Service
        Controller-->>View: 200 OK (JSON shippingData)
        deactivate Controller
        View-->>Pelanggan: Tampilkan Zona, Ongkir & Total Harga Terupdate
    end
    deactivate View
```

---

### 10. Sequence Diagram Checkout Pesanan
Alur pelanggan membuat pesanan dari halaman checkout. Stok dicek dan dikurangi, lalu notifikasi WhatsApp dikirim.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>CheckoutPage
    participant Controller as <<Controller>><br/>OrderController
    participant Service as <<Service>><br/>OrderService
    participant ProductEntity as <<Entity>><br/>Product
    participant OrderEntity as <<Entity>><br/>Order
    participant VariantEntity as <<Entity>><br/>ProductVariant
    participant WA as <<Service>><br/>WhatsAppService
    actor Fonnte as FonnteAPI

    Pelanggan->>View: klikBuatPesanan()
    activate View
    View->>Controller: createOrder(request)
    activate Controller
    Controller->>Service: createOrder(data)
    activate Service
    Service->>ProductEntity: findMany(productIds, include variants)
    activate ProductEntity
    ProductEntity-->>Service: data produk & stok
    deactivate ProductEntity

    Service->>Service: validasiStok(items, products)
    activate Service
    deactivate Service

    alt Stok Tidak Cukup
        Service-->>Controller: throw Error "Stok tidak mencukupi"
        Controller-->>View: 400 Bad Request
        View-->>Pelanggan: Tampilkan Pesan Error Stok
    else Stok Cukup
        Service->>OrderEntity: create(orderData, items)
        activate OrderEntity
        OrderEntity-->>Service: data order baru (status pending)
        deactivate OrderEntity

        Service->>VariantEntity: update(decrement stock per item)
        activate VariantEntity
        VariantEntity-->>Service: stok terpotong
        deactivate VariantEntity

        Service->>WA: sendOrderNotification(phone, orderDetails)
        activate WA
        WA->>Fonnte: POST /send (target, message)
        activate Fonnte
        Fonnte-->>WA: response status
        deactivate Fonnte
        WA-->>Service: WhatsApp terkirim
        deactivate WA

        Service-->>Controller: data order final
        deactivate Service
        Controller-->>View: 201 Created (JSON order)
        deactivate Controller
        View-->>Pelanggan: Redirect ke Halaman Detail/Pembayaran Pesanan
    end
    deactivate View
```

---

### 11. Sequence Diagram Generate Kode Pembayaran
Alur pembuatan kode pembayaran (VA number / QRIS) melalui integrasi API Pakasir saat pelanggan memilih metode non-tunai di halaman pembayaran.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>PaymentPage
    participant Controller as <<Controller>><br/>OrderController
    participant Service as <<Service>><br/>OrderService
    participant Entity as <<Entity>><br/>Order
    participant PakasirSvc as <<Service>><br/>PakasirService
    actor PakasirAPI as PakasirAPI

    Pelanggan->>View: pilihMetodePembayaran(method)
    activate View
    View->>Controller: generatePaymentCode(orderId, method)
    activate Controller
    Controller->>Service: generatePaymentCode(orderId, method)
    activate Service

    Service->>Entity: findUnique(orderId)
    activate Entity
    Entity-->>Service: data order (amount)
    deactivate Entity

    Service->>PakasirSvc: createTransaction(method, { orderId, amount })
    activate PakasirSvc

    PakasirSvc->>PakasirSvc: buildRequestBody(project, apiKey, orderId, amount)
    activate PakasirSvc
    deactivate PakasirSvc

    PakasirSvc->>PakasirAPI: POST /transactioncreate/{method}
    activate PakasirAPI
    PakasirAPI-->>PakasirSvc: { payment: { payment_number, fee, total_payment, expired_at } }
    deactivate PakasirAPI

    PakasirSvc-->>Service: PakasirTransactionResponse
    deactivate PakasirSvc

    Service->>Entity: update(orderId, { paymentNumber, paymentFee, expiredAt })
    activate Entity
    Entity-->>Service: order terupdate dengan kode pembayaran
    deactivate Entity

    Service-->>Controller: paymentInfo
    deactivate Service
    Controller-->>View: 200 OK (JSON paymentInfo)
    deactivate Controller
    View-->>Pelanggan: Tampilkan Kode Pembayaran / QRIS & Batas Waktu
    deactivate View
```

---

### 12. Sequence Diagram Melakukan Pembayaran
Alur pembayaran online berdasarkan peninjauan rincian tagihan, cek kedaluwarsa (pembatalan order jika habis), pemilihan metode digital (pencetakan kode bayar), transfer pembayaran oleh pelanggan, deteksi keberhasilan, dan pembaruan status menjadi lunas.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>PaymentPage
    participant Controller as <<Controller>><br/>PaymentController
    participant Service as <<Service>><br/>PaymentService
    participant Entity as <<Entity>><br/>Order
    actor PakasirAPI as PakasirAPI

    %% 1. Meninjau rincian tagihan
    Pelanggan->>View: bukaHalamanPembayaran(orderId)
    activate View
    View->>Controller: checkExpiration(orderId)
    activate Controller
    Controller->>Service: checkExpiration(orderId)
    activate Service
    Service->>Entity: findUnique(orderId)
    activate Entity
    Entity-->>Service: data order (expiredAt)
    deactivate Entity

    %% 2. Apakah waktu kedaluwarsa habis?
    alt Ya (Kedaluwarsa Habis)
        Service->>Entity: update(orderId, status='cancelled')
        activate Entity
        Entity-->>Service: order dibatalkan
        deactivate Entity
        Service-->>Controller: status cancelled
        Controller-->>View: Tampilkan Pesan Kedaluwarsa
        View-->>Pelanggan: Pesanan Dibatalkan
    else Tidak (Kedaluwarsa Belum Habis)
        Service-->>Controller: status pending
        Controller-->>View: Tampilkan Pilihan Pembayaran
        View-->>Pelanggan: Tampilkan Tagihan

        %% 3. Memilih metode & Memicu pencetakan kode bayar
        Pelanggan->>View: pilihMetodePembayaran(method)
        View->>Controller: generatePaymentCode(orderId, method)
        Controller->>Service: generatePaymentCode(orderId, method)
        Service->>PakasirAPI: POST /transactioncreate/{method}
        activate PakasirAPI
        PakasirAPI-->>Service: payment_number (kode bayar)
        deactivate PakasirAPI
        Service->>Entity: update(orderId, paymentNumber)
        activate Entity
        Entity-->>Service: updated
        deactivate Entity
        Service-->>Controller: paymentInfo
        Controller-->>View: 200 OK (paymentInfo)
        View-->>Pelanggan: Tampilkan Kode Pembayaran

        %% 4. Melakukan pembayaran & Mendeteksi keberhasilan
        Pelanggan->>PakasirAPI: melakukanPembayaran(kode bayar)
        activate PakasirAPI
        PakasirAPI->>Controller: POST /api/payment/webhook (paymentData)
        deactivate PakasirAPI
        Controller->>Service: handleWebhook(paymentData)

        %% 5. Memperbarui status pesanan menjadi sudah lunas
        Service->>Entity: update(orderId, status='paid')
        activate Entity
        Entity-->>Service: order terupdate (status paid)
        deactivate Entity
        Service-->>Controller: success
        Controller-->>View: 200 OK (Lunas)
        View-->>Pelanggan: Tampilkan Pembayaran Berhasil
    end
    deactivate Service
    deactivate Controller
    deactivate View
```

---

### 13. Sequence Diagram Lihat Riwayat Pesanan
Alur pelanggan melihat daftar riwayat pesanan miliknya di halaman `/pesanan`.

```mermaid
sequenceDiagram
    actor Pelanggan
    participant View as <<View>><br/>PesananPage
    participant Controller as <<Controller>><br/>OrderController
    participant Service as <<Service>><br/>OrderService
    participant Entity as <<Entity>><br/>Order

    Pelanggan->>View: bukaHalamanPesanan()
    activate View
    View->>Controller: getOrders(request)
    activate Controller
    Controller->>Service: checkExpiredOrders()
    activate Service
    Service-->>Controller: expired orders diproses
    deactivate Service

    Controller->>Service: getOrdersByCustomerPaginated(userId, page, limit)
    activate Service
    Service->>Entity: findMany(userId, skip, take, include items & product & variant)
    activate Entity
    Entity-->>Service: data pesanan pelanggan
    deactivate Entity

    Service->>Service: mapAndNormalizeOrders()
    activate Service
    deactivate Service

    Service-->>Controller: { data, total }
    deactivate Service
    Controller-->>View: 200 OK (JSON data, total, page, totalPages)
    deactivate Controller
    View-->>Pelanggan: Tampilkan Daftar Riwayat Pesanan
    deactivate View
```

---

### 14. Sequence Diagram Kelola Produk
Alur Admin mengelola produk (tambah/edit/hapus) beserta varian harga. Hanya role `admin` yang bisa mengakses.

```mermaid
sequenceDiagram
    actor Admin
    participant View as <<View>><br/>AdminProdukPage
    participant Controller as <<Controller>><br/>ProductController
    participant Service as <<Service>><br/>ProductService
    participant Entity as <<Entity>><br/>Product

    Admin->>View: kelolaProduk(action, productData)
    activate View
    View->>Controller: request(action, data)
    activate Controller
    Controller->>Service: action(data)
    activate Service

    alt Tambah Produk
        Service->>Entity: create(name, categoryId, variants)
        activate Entity
        Entity-->>Service: data produk baru
        deactivate Entity
    else Edit Produk
        Service->>Entity: update(id, data)
        activate Entity
        Entity-->>Service: data produk terupdate
        deactivate Entity
    else Hapus Produk
        Service->>Entity: delete(id)
        activate Entity
        Entity-->>Service: produk terhapus
        deactivate Entity
    end

    Service-->>Controller: result
    deactivate Service
    Controller-->>View: 200/201 OK (JSON)
    deactivate Controller
    View-->>Admin: Refresh Daftar Produk & Tampilkan Toast Sukses
    deactivate View
```

---

### 15. Sequence Diagram Kelola Pegawai
Alur Admin mengelola data pegawai yang terbagi menjadi akun kasir (tambah dengan password, reset password, hapus) dan data kurir (tambah tanpa password, aktifkan/nonaktifkan status) sesuai dengan tab manajemen yang dipilih.

```mermaid
sequenceDiagram
    actor Admin
    participant View as <<View>><br/>AdminPegawaiPage
    participant Controller as <<Controller>><br/>UserController
    participant Service as <<Service>><br/>UserService
    participant Entity as <<Entity>><br/>User

    %% Switch Tab / Load Data
    Admin->>View: klikTabPegawai("kasir" / "kurir")
    activate View
    View->>Controller: getPegawai(role)
    activate Controller
    Controller->>Service: getPegawaiByRole(role)
    activate Service
    Service->>Entity: findMany(role)
    activate Entity
    Entity-->>Service: data daftar pegawai
    deactivate Entity
    Service-->>Controller: list pegawai
    deactivate Service
    Controller-->>View: 200 OK (JSON list)
    deactivate Controller
    View-->>Admin: Tampilkan Daftar Kasir / Kurir
    deactivate View

    %% Actions
    alt Tambah Kasir
        Admin->>View: inputDataKasir(nama, phone, password)
        activate View
        View->>Controller: createKasir(nama, phone, password)
        activate Controller
        Controller->>Service: createKasir(nama, phone, password)
        activate Service
        Service->>Service: bcrypt.hash(password)
        activate Service
        deactivate Service
        Service->>Entity: create(nama, phone, hash, role='kasir')
        activate Entity
        Entity-->>Service: kasir baru
        deactivate Entity
        Service-->>Controller: success
        deactivate Service
        Controller-->>View: 201 Created
        deactivate Controller
        View-->>Admin: Refresh List & Tampilkan Toast Sukses
        deactivate View

    else Tambah Kurir
        Admin->>View: inputDataKurir(nama, phone)
        activate View
        View->>Controller: createKurir(nama, phone)
        activate Controller
        Controller->>Service: createKurir(nama, phone)
        activate Service
        Service->>Entity: create(nama, phone, role='kurir', status='active')
        activate Entity
        Entity-->>Service: kurir baru
        deactivate Entity
        Service-->>Controller: success
        deactivate Service
        Controller-->>View: 201 Created
        deactivate Controller
        View-->>Admin: Refresh List & Tampilkan Toast Sukses
        deactivate View

    else Reset Password Kasir
        Admin->>View: klikResetPassword(kasirId)
        activate View
        View->>Controller: resetPassword(kasirId, newPassword)
        activate Controller
        Controller->>Service: resetPassword(kasirId, newPassword)
        activate Service
        Service->>Service: bcrypt.hash(newPassword)
        activate Service
        deactivate Service
        Service->>Entity: update(kasirId, { password: hash })
        activate Entity
        Entity-->>Service: password terupdate
        deactivate Entity
        Service-->>Controller: success
        deactivate Service
        Controller-->>View: 200 OK
        deactivate Controller
        View-->>Admin: Tampilkan Toast Sukses Reset
        deactivate View

    else Hapus Kasir
        Admin->>View: klikHapusKasir(kasirId)
        activate View
        View->>Controller: deleteKasir(kasirId)
        activate Controller
        Controller->>Service: deleteKasir(kasirId)
        activate Service
        Service->>Entity: delete(kasirId)
        activate Entity
        Entity-->>Service: kasir terhapus
        deactivate Entity
        Service-->>Controller: success
        deactivate Service
        Controller-->>View: 200 OK
        deactivate Controller
        View-->>Admin: Refresh List Kasir
        deactivate View

    else Ubah Status Kurir (Aktifkan / Nonaktifkan)
        Admin->>View: klikNonaktifkanKurir(kurirId)
        activate View
        View->>Controller: updateKurirStatus(kurirId, status='inactive')
        activate Controller
        Controller->>Service: updateKurirStatus(kurirId, status)
        activate Service
        Service->>Entity: update(kurirId, { status })
        activate Entity
        Entity-->>Service: status terupdate
        deactivate Entity
        Service-->>Controller: success
        deactivate Service
        Controller-->>View: 200 OK
        deactivate Controller
        View-->>Admin: Refresh List Kurir
        deactivate View
    end
```

---

### 16. Sequence Diagram Lihat Laporan
Alur Admin melihat rekap laporan penjualan di halaman dashboard. Hanya role `admin` yang bisa mengakses.

```mermaid
sequenceDiagram
    actor Admin
    participant View as <<View>><br/>AdminDashboardPage
    participant Controller as <<Controller>><br/>OrderController
    participant Service as <<Service>><br/>OrderService
    participant Entity as <<Entity>><br/>Order

    Admin->>View: bukaHalamanLaporan()
    activate View
    View->>Controller: getOrders(request, filters)
    activate Controller
    Controller->>Service: getAllOrders({ page, limit, search, status })
    activate Service
    Service->>Entity: findMany(where status, search, skip, take)
    activate Entity
    Entity-->>Service: data semua pesanan
    deactivate Entity

    Service->>Service: mapAndNormalizeOrders()
    activate Service
    deactivate Service

    Service-->>Controller: { orders, total, page, limit, totalPages }
    deactivate Service
    Controller-->>View: 200 OK (JSON laporan)
    deactivate Controller

    View->>View: hitungRekapPenjualan()
    activate View
    deactivate View

    View-->>Admin: Tampilkan Grafik & Tabel Laporan Penjualan
    deactivate View
```

---

### 17. Sequence Diagram Kelola Pesanan
Alur Kasir membuat pesanan offline di kasir (POS), mencakup membuka halaman kasir, mencari produk (beserta penanganan notifikasi jika tidak ditemukan), menambah produk ke keranjang belanja, menginput data pelanggan, membuat pesanan baru, dan mengarahkan ke proses pembayaran.

```mermaid
sequenceDiagram
    actor Kasir
    participant View as <<View>><br/>KasirPage
    participant ProductCtrl as <<Controller>><br/>ProductController
    participant OrderCtrl as <<Controller>><br/>OrderController
    participant ProductSvc as <<Service>><br/>ProductService
    participant OrderSvc as <<Service>><br/>OrderService
    participant ProductEntity as <<Entity>><br/>Product
    participant OrderEntity as <<Entity>><br/>Order

    %% 1. Membuka Halaman Kasir
    Kasir->>View: bukaHalamanKasir()
    activate View
    View->>ProductCtrl: getProducts()
    activate ProductCtrl
    ProductCtrl->>ProductSvc: getAllProducts()
    activate ProductSvc
    ProductSvc->>ProductEntity: findMany()
    activate ProductEntity
    ProductEntity-->>ProductSvc: daftar produk
    deactivate ProductEntity
    ProductSvc-->>ProductCtrl: daftar produk
    deactivate ProductSvc
    ProductCtrl-->>View: 200 OK (JSON produk)
    deactivate ProductCtrl
    View-->>Kasir: Tampilkan Halaman Kasir (POS)
    deactivate View

    %% 2. Mencari Produk
    loop Cari Produk
        Kasir->>View: inputKataKunci(keyword)
        activate View
        View->>ProductCtrl: searchProducts(keyword)
        activate ProductCtrl
        ProductCtrl->>ProductSvc: searchProducts(keyword)
        activate ProductSvc
        ProductSvc->>ProductEntity: findMany(where keyword)
        activate ProductEntity
        ProductEntity-->>ProductSvc: hasil pencarian
        deactivate ProductEntity

        alt Produk Tidak Ditemukan
            ProductSvc-->>ProductCtrl: null / list kosong
            ProductCtrl-->>View: 200 OK (data kosong)
            View-->>Kasir: Tampilkan Notifikasi Produk Tidak Ditemukan
        else Produk Ditemukan
            ProductSvc-->>ProductCtrl: data produk
            deactivate ProductSvc
            ProductCtrl-->>View: 200 OK (data produk)
            deactivate ProductCtrl
            View-->>Kasir: Tampilkan Hasil Pencarian Produk
            deactivate View

            %% 3. Pilih produk & tambah ke keranjang
            Kasir->>View: pilihProdukDanTambahKeKeranjang(productId, qty)
            activate View
            View->>View: tambahKeKeranjangLokal()
            activate View
            deactivate View
            View-->>Kasir: Tampilkan Keranjang Terupdate
            deactivate View
        end
    end

    %% 4. Input data pelanggan & Membuat Pesanan
    Kasir->>View: inputDataPelanggan(nama, noHP)
    activate View
    Kasir->>View: klikBuatPesanan()
    View->>OrderCtrl: createOfflineOrder(customerData, cartItems)
    activate OrderCtrl
    OrderCtrl->>OrderSvc: createOrder(orderData)
    activate OrderSvc
    OrderSvc->>OrderEntity: create(orderData)
    activate OrderEntity
    OrderEntity-->>OrderSvc: order baru dibuat
    deactivate OrderEntity
    OrderSvc-->>OrderCtrl: data order baru (status pending)
    deactivate OrderSvc
    OrderCtrl-->>View: 201 Created (JSON order)
    deactivate OrderCtrl

    %% 5. Mengarahkan ke proses pembayaran
    View-->>Kasir: Redirect ke Halaman Proses Pembayaran
    deactivate View
```

---

### 18. Sequence Diagram Proses Pembayaran (di Kasir)
Alur Kasir memproses pembayaran transaksi POS, mendukung metode tunai (input uang tunai, simpan transaksi, potong stok) dan digital (tampilkan QRIS/VA dari Pakasir, verifikasi pembayaran dengan alt sukses/gagal).

```mermaid
sequenceDiagram
    actor Kasir
    participant View as <<View>><br/>KasirPage
    participant Controller as <<Controller>><br/>CashierController
    participant Service as <<Service>><br/>CashierService
    participant OrderEntity as <<Entity>><br/>Order
    participant VariantEntity as <<Entity>><br/>ProductVariant
    actor PakasirAPI as PakasirAPI

    Kasir->>View: pilihMetodePembayaran(tunai / digital)
    activate View

    alt Tunai (Cash)
        Kasir->>View: inputPembayaranTunai(cashAmount)
        View->>Controller: prosesPembayaranTunai(orderId, cashAmount)
        activate Controller
        Controller->>Service: prosesPembayaranTunai(orderId, cashAmount)
        activate Service
        
        Service->>OrderEntity: update(orderId, status='paid', cashAmount)
        activate OrderEntity
        OrderEntity-->>Service: order terupdate (paid)
        deactivate OrderEntity

        Service->>VariantEntity: decrementStock(orderItems)
        activate VariantEntity
        VariantEntity-->>Service: stok terpotong
        deactivate VariantEntity

        Service-->>Controller: success (change / kembalian)
        deactivate Service
        Controller-->>View: 200 OK (JSON kembalian)
        deactivate Controller
        View-->>Kasir: Tampilkan Transaksi Berhasil & Kembalian

    else Digital (QRIS / VA)
        View->>Controller: generatePaymentCode(orderId, method='digital')
        activate Controller
        Controller->>Service: generatePaymentCode(orderId, method)
        activate Service
        Service->>PakasirAPI: POST /transactioncreate
        activate PakasirAPI
        PakasirAPI-->>Service: data QRIS / VA (payment_number, qr_string)
        deactivate PakasirAPI
        Service-->>Controller: paymentDetails
        deactivate Service
        Controller-->>View: 200 OK (JSON details)
        deactivate Controller
        View-->>Kasir: Tampilkan QRIS / VA di Layar

        %% Verifikasi Pembayaran
        Kasir->>View: klikVerifikasiPembayaran()
        View->>Controller: verifyPayment(orderId)
        activate Controller
        Controller->>Service: verifyPaymentStatus(orderId)
        activate Service
        Service->>PakasirAPI: GET /transactionstatus
        activate PakasirAPI
        PakasirAPI-->>Service: { status: 'PAID' / 'PENDING' }
        deactivate PakasirAPI

        alt Pembayaran Berhasil (Ya)
            Service->>OrderEntity: update(orderId, status='paid')
            activate OrderEntity
            OrderEntity-->>Service: order terupdate (paid)
            deactivate OrderEntity
            
            Service->>VariantEntity: decrementStock(orderItems)
            activate VariantEntity
            VariantEntity-->>Service: stok terpotong
            deactivate VariantEntity
            
            Service-->>Controller: success
            deactivate Service
            Controller-->>View: 200 OK (PAID)
            deactivate Controller
            View-->>Kasir: Tampilkan Transaksi Berhasil (Lunas)
        else Pembayaran Gagal (Tidak)
            Service-->>Controller: failure (PENDING/EXPIRED)
            deactivate Service
            Controller-->>View: 400 Bad Request
            deactivate Controller
            View-->>Kasir: Tampilkan Notifikasi Pembayaran Gagal
        end
    end
    deactivate View
```

---

### 19. Sequence Diagram Cetak Struk
Alur Kasir mencetak struk belanja fisik melalui printer thermal, mencakup pengambilan data pesanan, pemformatan nota thermal, pengiriman perintah cetak, dan penanganan kondisi berdasarkan status printer (menyala untuk mencetak vs mati untuk memunculkan notifikasi tidak aktif).

```mermaid
sequenceDiagram
    actor Kasir
    participant View as <<View>><br/>KasirPage
    participant Controller as <<Controller>><br/>OrderController
    participant Service as <<Service>><br/>OrderService
    participant Entity as <<Entity>><br/>Order
    participant PrintSvc as <<Service>><br/>WebPrintService
    participant Printer as <<Device>><br/>ThermalPrinter

    %% 1. Mengirim permintaan cetak struk & mengambil data transaksi
    Kasir->>View: klikCetakStruk(orderId)
    activate View
    View->>Controller: getOrderReceipt(orderId)
    activate Controller
    Controller->>Service: getOrderReceipt(orderId)
    activate Service
    Service->>Entity: findUnique(orderId, include items)
    activate Entity
    Entity-->>Service: data order detail
    deactivate Entity
    Service-->>Controller: data order detail
    deactivate Service
    Controller-->>View: 200 OK (JSON receiptData)
    deactivate Controller

    %% 2. Menyesuaikan format nota dengan perangkat pencetak
    View->>PrintSvc: formatReceipt(receiptData)
    activate PrintSvc
    PrintSvc->>PrintSvc: applyThermalFormat()
    activate PrintSvc
    deactivate PrintSvc
    PrintSvc-->>View: formattedReceipt
    deactivate PrintSvc

    %% 3. Mengirim data cetak ke perangkat printer
    View->>PrintSvc: printCommand(formattedReceipt)
    activate PrintSvc
    PrintSvc->>Printer: pingDevice()
    activate Printer

    %% 4. Apakah printer menyala?
    alt Ya (Printer Menyala)
        Printer-->>PrintSvc: status online / ready
        PrintSvc->>Printer: sendPrintData(formattedReceipt)
        Printer-->>PrintSvc: printing success
        deactivate Printer
        PrintSvc-->>View: success
        View-->>Kasir: Tampilkan Struk Berhasil Dicetak
    else Tidak (Printer Tidak Menyala)
        activate Printer
        Printer-->>PrintSvc: status offline / error
        deactivate Printer
        PrintSvc-->>View: error (printer inactive)
        deactivate PrintSvc
        View-->>Kasir: Tampilkan Notifikasi Printer Tidak Aktif (Data Transaksi Tetap)
    end
    deactivate View
```

---

### 20. Sequence Diagram Kelola Pesanan Online
Alur Kasir memproses pesanan online, meliputi pemfilteran daftar pesanan online, penugasan kurir pengantar, serta pengiriman notifikasi pengiriman WhatsApp secara paralel ke Pelanggan dan Kurir.

```mermaid
sequenceDiagram
    actor Kasir
    participant View as <<View>><br/>AdminPesananPage
    participant Controller as <<Controller>><br/>OrderController
    participant Service as <<Service>><br/>OrderService
    participant OrderEntity as <<Entity>><br/>Order
    participant CourierEntity as <<Entity>><br/>Courier
    participant WA as <<Service>><br/>WhatsAppService
    actor Fonnte as FonnteAPI

    %% 1. Tampilkan Daftar Pesanan Online (Filter)
    Kasir->>View: filterPesananOnline()
    activate View
    View->>Controller: getOrders(type='online')
    activate Controller
    Controller->>Service: getAllOrders(type='online')
    activate Service
    Service->>OrderEntity: findMany(type='online')
    activate OrderEntity
    OrderEntity-->>Service: list pesanan online
    deactivate OrderEntity
    Service-->>Controller: list pesanan online terformat
    deactivate Service
    Controller-->>View: 200 OK
    deactivate Controller
    View-->>Kasir: Tampilkan Daftar Pesanan Online
    deactivate View

    %% 2. Proses Pengiriman Pesanan Online
    Kasir->>View: kirimPesananOnline(orderId, courierId)
    activate View
    View->>Controller: shipOrder(orderId, courierId)
    activate Controller
    Controller->>Service: shipOrder(orderId, courierId)
    activate Service

    Service->>OrderEntity: findUnique(orderId)
    activate OrderEntity
    OrderEntity-->>Service: data order online
    deactivate OrderEntity

    Service->>CourierEntity: findUnique(courierId)
    activate CourierEntity
    CourierEntity-->>Service: data kurir aktif (no handphone)
    deactivate CourierEntity

    Service->>OrderEntity: update(orderId, { status: 'shipped', courierId })
    activate OrderEntity
    OrderEntity-->>Service: order terupdate
    deactivate OrderEntity

    par Kirim Notifikasi WhatsApp ke Kurir
        Service->>WA: sendCourierDeliveryNotification(courierPhone, details)
        activate WA
        WA->>Fonnte: POST /send (target, message)
        activate Fonnte
        Fonnte-->>WA: response status
        deactivate Fonnte
        WA-->>Service: WhatsApp terkirim
        deactivate WA
    and Kirim Notifikasi WhatsApp ke Pelanggan
        Service->>WA: sendCustomerShippingNotification(customerPhone, details)
        activate WA
        WA->>Fonnte: POST /send (target, message)
        activate Fonnte
        Fonnte-->>WA: response status
        deactivate Fonnte
        WA-->>Service: WhatsApp terkirim
        deactivate WA
    end

    Service-->>Controller: success
    deactivate Service
    Controller-->>View: 200 OK
    deactivate Controller
    View-->>Kasir: Tampilkan Status Pesanan Online Diperbarui (Shipped)
    deactivate View
```

---

### 21. Sequence Diagram Kirim WhatsApp
Alur pengiriman pesan WhatsApp melalui integrasi API Fonnte. Digunakan oleh berbagai fitur: notifikasi pesanan, struk, info pengiriman, reset password.

```mermaid
sequenceDiagram
    participant Caller as <<Service>><br/>CallerService
    participant WA as <<Service>><br/>WhatsAppService
    actor Fonnte as FonnteAPI
    actor Penerima

    Caller->>WA: sendWhatsAppMessage(phone, message)
    activate WA

    WA->>WA: normalizeWhatsAppNumber(phone)
    activate WA
    Note over WA: Hapus karakter non-digit<br/>08xx → 628xx<br/>8xx → 628xx<br/>Validasi panjang minimal 10 digit
    deactivate WA

    WA->>Fonnte: POST /send { target: normalizedPhone, message }
    activate Fonnte
    Fonnte->>Penerima: Kirim Pesan WhatsApp
    Fonnte-->>WA: { status: true/false, reason }
    deactivate Fonnte

    alt Fonnte Gagal (status: false)
        WA-->>Caller: throw Error (reason)
    else Fonnte Berhasil (status: true)
        WA-->>Caller: response data
    end
    deactivate WA
```
