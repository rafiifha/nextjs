# Dokumentasi Implementasi Teknologi

Dokumen ini menjelaskan **tiga teknologi eksternal utama** pada sistem Toko Naning beserta **script implementasi** dan **penjelasan fungsi tiap bagian kode**.

| Teknologi | Fungsi di sistem | Jenis |
|-----------|------------------|-------|
| **Pakasir** | Payment gateway (QRIS / transfer / e-wallet) | REST API |
| **Fonnte** | Pengiriman WhatsApp (OTP, notifikasi, struk) | REST API |
| **OpenStreetMap** | Peta lokasi pengiriman + pencarian alamat (Nominatim) + tile peta (Leaflet) | API + Tile + Library |

---

# 1. Pakasir (Payment Gateway)

## 1.1 Ringkasan

**Pakasir** digunakan untuk membuat, membatalkan, dan mengecek transaksi pembayaran non-tunai. Setelah pelanggan/kasir checkout dengan metode non-tunai, sistem memanggil API Pakasir. Saat pembayaran lunas, Pakasir mengirim **webhook** ke endpoint aplikasi.

| Item | Nilai |
|------|-------|
| Base URL | `https://app.pakasir.com/api` |
| Auth | `project` + `api_key` (dari `.env`) |
| File utama | `services/pakasirService.ts` |
| Webhook | `POST /api/payment/pakasir/notify` |
| Dipakai di | `OrderService`, `CashierService`, `retry-payment`, `PaymentService` |

### Variabel lingkungan

```env
PAKASIR_API_KEY=...
PAKASIR_PROJECT=...
```

Definisi di `lib/env.ts`:

```ts
PAKASIR_API_KEY: process.env.PAKASIR_API_KEY!,
PAKASIR_PROJECT: process.env.PAKASIR_PROJECT!,
```

---

## 1.2 Script lengkap — `services/pakasirService.ts`

```ts
import { env } from '@/lib/env';

export interface PakasirTransactionRequest {
  order_id: string;
  amount: number;
}

export interface PakasirTransactionResponse {
  payment: {
    project: string;
    order_id: string;
    amount: number;
    fee: number;
    total_payment: number;
    payment_method: string;
    payment_number: string;
    expired_at: string;
  };
}

class PakasirService {
  private readonly baseUrl = 'https://app.pakasir.com/api';
  
  /**
   * Membuat transaksi baru ke Pakasir
   */
  async createTransaction(method: string, data: PakasirTransactionRequest): Promise<PakasirTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/transactioncreate/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: env.PAKASIR_PROJECT,
        api_key: env.PAKASIR_API_KEY,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pakasir API Error:', errorText);
      throw new Error(`Gagal membuat transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Membatalkan transaksi
   */
  async cancelTransaction(data: PakasirTransactionRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/transactioncancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: env.PAKASIR_PROJECT,
        api_key: env.PAKASIR_API_KEY,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pakasir API Error:', errorText);
      throw new Error(`Gagal membatalkan transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Mengambil detail transaksi
   */
  async getTransactionDetail(orderId: string, amount: number): Promise<any> {
    const params = new URLSearchParams({
      project: env.PAKASIR_PROJECT,
      api_key: env.PAKASIR_API_KEY,
      order_id: orderId,
      amount: amount.toString(),
    });

    const response = await fetch(`${this.baseUrl}/transactiondetail?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pakasir API Error:', errorText);
      throw new Error(`Gagal mengambil detail transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

export const pakasirService = new PakasirService();
```

### Penjelasan baris / fungsi

| Bagian | Penjelasan |
|--------|------------|
| `import { env }` | Ambil kredensial Pakasir dari konfigurasi terpusat agar tidak hardcode secret. |
| `PakasirTransactionRequest` | Kontrak data request: `order_id` (string, contoh `INV-12`) dan `amount` (nominal). |
| `PakasirTransactionResponse` | Bentuk respons sukses: objek `payment` berisi nomor bayar, fee, total, metode, masa berlaku. |
| `baseUrl` | Endpoint root API Pakasir. |
| **`createTransaction(method, data)`** | Membuat transaksi baru. Path: `/transactioncreate/{method}` — `method` = jenis pembayaran (qris, dll.). |
| `fetch(..., POST)` | Kirim HTTP POST ke Pakasir. |
| `headers Content-Type` | Body dikirim sebagai JSON. |
| `body: project, api_key, ...data` | Autentikasi + data order digabung dalam satu payload. |
| `if (!response.ok)` | Jika HTTP gagal (4xx/5xx), baca teks error, log, lalu throw agar caller bisa rollback order. |
| `return response.json()` | Parse JSON respons menjadi objek TypeScript. |
| **`cancelTransaction(data)`** | Batalkan transaksi yang sudah dibuat (saat order dibatalkan / retry payment). Endpoint: `/transactioncancel`. |
| Logika error sama | Pastikan kegagalan cancel tidak silent — dicatat di console lalu dilempar. |
| **`getTransactionDetail(orderId, amount)`** | Cek status/detail transaksi via GET + query string. |
| `URLSearchParams` | Susun query `project`, `api_key`, `order_id`, `amount` dengan aman (encode otomatis). |
| `export const pakasirService` | Singleton instance agar dipanggil konsisten dari service lain. |

### Endpoint API Pakasir yang dipakai

| Method | Endpoint | Fungsi di aplikasi |
|--------|----------|--------------------|
| POST | `/api/transactioncreate/{method}` | Buat pembayaran saat checkout |
| POST | `/api/transactioncancel` | Batalkan transaksi lama |
| GET | `/api/transactiondetail?...` | Ambil detail transaksi |

---

## 1.3 Webhook Pakasir — alur konfirmasi bayar

### Route — `app/api/payment/pakasir/notify/route.ts`

```ts
import { NextRequest } from 'next/server';
import { PaymentController } from '@/app/controllers/PaymentController';

const paymentController = new PaymentController();

export async function POST(req: NextRequest) {
  return paymentController.handlePakasirWebhook(req);
}
```

| Baris / bagian | Penjelasan |
|----------------|------------|
| `POST(req)` | Pakasir memanggil endpoint ini saat status pembayaran berubah. |
| `handlePakasirWebhook` | Delegasi ke controller → service. |

### Controller — `app/controllers/PaymentController.ts`

```ts
async handlePakasirWebhook(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await this.paymentService.handlePakasirWebhook(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    // mapping error → HTTP 400 / 404 / 500
  }
}
```

| Bagian | Penjelasan |
|--------|------------|
| `request.json()` | Baca payload webhook. |
| `paymentService.handlePakasirWebhook` | Logika bisnis update status pesanan. |
| Status 400 | Project tidak valid / format `order_id` salah. |
| Status 404 | Pesanan tidak ditemukan di DB. |
| Status 500 | Error tak terduga. |

### Service — cuplikan inti `PaymentService.handlePakasirWebhook`

```ts
async handlePakasirWebhook(data: any) {
  const { amount, order_id, project, status, payment_method } = data;

  if (project !== env.PAKASIR_PROJECT) {
    throw new Error('Project tidak valid');
  }

  if (status !== 'completed') {
    return { success: true, message: 'Status diabaikan' };
  }

  // Parse INV-123 → 123
  let numericId = 0;
  if (order_id.startsWith('INV-')) {
    numericId = parseInt(order_id.substring(4), 10);
  } else {
    numericId = parseInt(order_id, 10);
  }

  // Cari order → update status paid → trigger realtime → kirim WA receipt
}
```

| Bagian | Penjelasan |
|--------|------------|
| Destructure `data` | Ambil field penting dari webhook. |
| Cek `project` | Keamanan: tolak webhook dari project lain. |
| Cek `status !== 'completed'` | Hanya proses pembayaran yang sudah lunas. |
| Parse `INV-` | Konversi `order_id` Pakasir ke ID numerik database. |
| Update `status: 'paid'` | Tandai pesanan lunas. |
| `triggerOrderEvent` | Broadcast realtime (Pusher) ke UI. |
| `sendReceipt(...)` | Kirim bukti transaksi WhatsApp via Fonnte (async). |

### Contoh pemanggilan create transaksi (di `OrderService`)

```ts
const pakasirRes = await pakasirService.createTransaction(paymentMethod, {
  order_id: `INV-${order.id}`,
  amount: totalHarga,
});

const { payment_number, fee, total_payment, amount } = pakasirRes.payment;
// Simpan paymentNumber, paymentFee, expiredAt ke order
```

| Bagian | Penjelasan |
|--------|------------|
| `paymentMethod` | Jenis metode ke Pakasir (path parameter). |
| `INV-${order.id}` | Format ID invoice agar unik & bisa di-parse di webhook. |
| `payment_number` | Nomor/VA/QR yang ditampilkan ke pelanggan. |
| Rollback stok + hapus order | Jika Pakasir gagal, transaksi dibatalkan di sisi aplikasi. |

### Diagram alur singkat

```
Checkout non-tunai
  → OrderService/CashierService
  → pakasirService.createTransaction()
  → Simpan payment_number ke DB
  → Pelanggan bayar
  → Pakasir webhook POST /api/payment/pakasir/notify
  → PaymentService update status = paid
  → Fonnte kirim bukti transaksi
```

---

# 2. Fonnte (WhatsApp Gateway)

## 2.1 Ringkasan

**Fonnte** mengirim pesan WhatsApp untuk OTP, notifikasi pesanan, bukti transaksi, dan info pengiriman.

| Item | Nilai |
|------|-------|
| Base URL default | `https://api.fonnte.com` |
| Endpoint kirim | `POST /send` |
| Auth | Header `Authorization: {FONNTE_API_KEY}` |
| File utama | `services/whatsappService.ts` |
| Dipakai di | `AuthService` (OTP), `OrderService`, `PaymentService` |

### Variabel lingkungan

```env
FONNTE_API_KEY=...
FONNTE_API_URL=https://api.fonnte.com
```

---

## 2.2 Script lengkap — `services/whatsappService.ts`

```ts
import axios from 'axios';
import { env } from '@/lib/env';

const fonnteApi = axios.create({
  baseURL: env.FONNTE_API_URL,
  timeout: 15000,
  headers: {
    'Authorization': (env.FONNTE_API_KEY || '').trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

function normalizeWhatsAppNumber(rawPhone: string) {
  const trimmed = (rawPhone || '').trim();
  if (!trimmed) {
    throw new Error('Nomor WhatsApp kosong');
  }

  // Keep digits only (drop spaces, +, -, parentheses)
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    throw new Error(`Format nomor WhatsApp tidak valid: ${rawPhone}`);
  }

  // Indonesia normalization: 08xx -> 628xx, 8xx -> 628xx, 62xx -> 62xx
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  } else if (!digits.startsWith('62')) {
    digits = `62${digits}`;
  }

  if (digits.length < 10) {
    throw new Error(`Nomor WhatsApp terlalu pendek: ${rawPhone}`);
  }

  return digits;
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const normalizedPhone = normalizeWhatsAppNumber(phone);
    const response = await fonnteApi.post('/send', {
      target: normalizedPhone,
      message: message,
    });

    const data = response.data;
    if (data?.status === false) {
      throw new Error(data?.reason || data?.message || 'Fonnte menolak permintaan');
    }

    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Fonnte WhatsApp error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error('Fonnte WhatsApp error:', error);
    }
    throw error;
  }
}

export async function sendOrderNotification(phone: string, orderData: { ... }) {
  // susun template "Pesanan Baru" → sendWhatsAppMessage
}

export async function sendReceipt(phone: string, orderData: { ... }) {
  // susun template "Bukti Transaksi" → sendWhatsAppMessage
}

export async function sendCourierDeliveryNotification(phone: string, orderData: { ... }) {
  // susun template tugas kurir → sendWhatsAppMessage
}

export async function sendCustomerShippingNotification(phone: string, orderData: { ... }) {
  // susun template pesanan dikirim → sendWhatsAppMessage
}
```

> Catatan: template lengkap tiap notifikasi ada di file `dokumentasi-notifikasi.md` dan di source `whatsappService.ts`.

### Penjelasan fungsi inti

#### A. Inisialisasi client Axios (`fonnteApi`)

| Baris / opsi | Penjelasan |
|--------------|------------|
| `axios.create` | Buat instance HTTP khusus Fonnte (reuse config). |
| `baseURL` | Root API dari env. |
| `timeout: 15000` | Batas tunggu 15 detik agar request tidak menggantung. |
| `Authorization` | Token API Fonnte; `.trim()` buang spasi tak sengaja di `.env`. |
| `Content-Type` / `Accept` | Request & expect JSON. |

#### B. `normalizeWhatsAppNumber(rawPhone)`

| Baris | Penjelasan |
|-------|------------|
| `trim()` | Buang spasi ujung. |
| Throw jika kosong | Validasi dasar. |
| `replace(/\D/g, '')` | Sisakan digit saja (hapus `+`, `-`, spasi, kurung). |
| `08xx → 62xx` | Format lokal Indonesia ke format internasional. |
| `8xx → 628xx` | Handle input tanpa nol di depan. |
| Sudah `62` | Biarkan. |
| Selain itu | Paksa prefix `62`. |
| Cek panjang `< 10` | Tolak nomor terlalu pendek. |
| `return digits` | Nomor siap dikirim ke Fonnte. |

#### C. `sendWhatsAppMessage(phone, message)` — fungsi inti kirim

| Baris | Penjelasan |
|-------|------------|
| `normalizeWhatsAppNumber(phone)` | Standarisasi nomor sebelum kirim. |
| `fonnteApi.post('/send', { target, message })` | Panggil API Fonnte endpoint `/send`. |
| `target` | Nomor tujuan (format 62...). |
| `message` | Isi pesan (bisa markdown WhatsApp: `*bold*`). |
| `data?.status === false` | Fonnte bisa return HTTP 200 tapi status gagal — harus dicek. |
| Log axios error | Bantu debugging (status HTTP + body). |
| `throw error` | Propagate ke caller (OTP gagal → user lihat error, dll.). |

#### D. Fungsi template (wrapper)

| Fungsi | Penerima | Kapan dipanggil |
|--------|----------|-----------------|
| `sendOrderNotification` | Pelanggan | Setelah order dibuat |
| `sendReceipt` | Pelanggan | Setelah bayar / kirim struk |
| `sendCourierDeliveryNotification` | Kurir | Status → shipped |
| `sendCustomerShippingNotification` | Pelanggan | Status → shipped |

Pola tiap wrapper:
1. Format daftar item / field jadi string.
2. Susun template pesan.
3. Panggil `sendWhatsAppMessage(phone, message)`.

---

## 2.3 Integrasi OTP via Fonnte — `AuthService.sendOtp`

```ts
async sendOtp(phone: string, type: 'register' | 'forgot_password') {
  // validasi nomor terdaftar / belum
  // hapus OTP lama
  const code = this.generateOtpCode(); // 6 digit
  // simpan ke DB, expires 5 menit
  const message = `🔐 *Kode OTP ${typeLabel} - Toko Naning* ... *${code}* ...`;
  await sendWhatsAppMessage(phone, message);
}
```

| Bagian | Penjelasan |
|--------|------------|
| `type` | Bedakan OTP registrasi vs reset password. |
| `generateOtpCode` | Random 100000–999999. |
| Simpan DB | Agar bisa diverifikasi nanti. |
| `sendWhatsAppMessage` | Kirim kode lewat Fonnte. |
| Catch error | Ubah jadi pesan ramah: "Gagal mengirim OTP..." |

### Diagram alur singkat

```
Event bisnis (OTP / order / bayar / kirim)
  → Susun template pesan
  → normalizeWhatsAppNumber()
  → POST https://api.fonnte.com/send
  → WhatsApp terkirim ke penerima
```

---

# 3. OpenStreetMap (Peta, Nominatim, Leaflet)

## 3.1 Ringkasan

OpenStreetMap (OSM) dipakai untuk **memilih lokasi pengiriman** dan **menghitung jarak/ongkir**.

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| Tile peta | OSM tile + **Leaflet** / **react-leaflet** | Tampilkan peta interaktif |
| Geocoding (cari alamat → koordinat) | **Nominatim** OSM | Autocomplete alamat |
| Reverse geocoding (koordinat → alamat) | **Nominatim** OSM | Isi alamat saat klik peta |
| Hitung jarak | **Haversine** di `DeliveryService` | Jarak toko → tujuan + zona ongkir |

| Item | Nilai |
|------|-------|
| Tile URL | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Nominatim search | `https://nominatim.openstreetmap.org/search?...` |
| Nominatim reverse | `https://nominatim.openstreetmap.org/reverse?...` |
| File UI peta | `components/map-picker.tsx` |
| File hitung ongkir | `app/services/DeliveryService.ts` |
| Dipakai di | `app/checkout/page.tsx` |

Library (`package.json`): `leaflet`, `react-leaflet`, `@types/leaflet`.

---

## 3.2 Script peta — `components/map-picker.tsx`

### A. Import & fix icon Leaflet

```ts
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '.../marker-icon-2x.png',
    iconUrl: '.../marker-icon.png',
    shadowUrl: '.../marker-shadow.png',
  });
}
```

| Bagian | Penjelasan |
|--------|------------|
| `'use client'` | Komponen client-only (Leaflet butuh `window`). |
| `react-leaflet` | Binding React untuk Leaflet. |
| `leaflet.css` | Styling default peta. |
| Fix `_getIconUrl` | Bug bundler Next.js: icon marker default sering hilang; diganti URL CDN. |
| `typeof window !== 'undefined'` | Hindari error SSR. |

### B. Props

```ts
interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: [number, number];
  flyToPosition?: [number, number] | null;
}
```

| Prop | Penjelasan |
|------|------------|
| `onLocationSelect` | Callback ke checkout saat user klik peta. |
| `initialPosition` | Posisi awal marker (jika ada). |
| `flyToPosition` | Animasi pindah kamera ke koordinat (hasil pencarian alamat). |

### C. `LocationMarker` — klik peta untuk pilih titik

```ts
function LocationMarker({ onLocationSelect, initialPosition }) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null);

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
    },
  });

  useEffect(() => {
    if (initialPosition) setPosition(initialPosition);
  }, [initialPosition]);

  const destinationIcon = L.icon({ /* marker biru */ });

  return position === null ? null : (
    <Marker position={position} icon={destinationIcon}>
      <Popup>...</Popup>
    </Marker>
  );
}
```

| Bagian | Penjelasan |
|--------|------------|
| `useMapEvents({ click })` | Hook Leaflet: dengarkan klik di peta. |
| `e.latlng` | Ambil latitude & longitude klik. |
| `setPosition` | Update marker visual. |
| `onLocationSelect` | Kirim koordinat ke parent (checkout → hitung ongkir + reverse geocode). |
| Sync `initialPosition` | Jika parent set posisi baru (dari autocomplete), marker ikut. |
| `L.icon` biru | Marker khusus lokasi pengiriman. |
| `Popup` | Tampilkan label + koordinat. |

### D. `FlyToLocation` — animasi kamera

```ts
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 1.2 });
    }
  }, [position, map]);
  return null;
}
```

| Bagian | Penjelasan |
|--------|------------|
| `useMap()` | Akses instance peta Leaflet. |
| `flyTo(pos, zoom, opts)` | Animasi pindah ke lokasi hasil pencarian Nominatim. |
| Zoom `16` | Level dekat (detail jalan). |
| `return null` | Komponen tanpa UI, hanya side-effect. |

### E. `MapContent` — tile OSM + child components

```ts
function MapContent({ onLocationSelect, initialPosition, flyToPosition }) {
  // tunggu map pane siap → setIsReady
  return (
    <>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker ... />
      <FlyToLocation position={flyToPosition || null} />
    </>
  );
}
```

| Bagian | Penjelasan |
|--------|------------|
| Cek `tilePane` / timeout | Pastikan peta fully init sebelum render child (hindari race di Next.js). |
| **`TileLayer`** | Lapisan gambar peta dari server tile **OpenStreetMap**. |
| `url {s}/{z}/{x}/{y}` | Subdomain + zoom + tile X/Y — standar OSM. |
| `attribution` | Wajib kredit OSM. |

### F. `MapPicker` (default export)

```ts
export default function MapPicker({ onLocationSelect, initialPosition, flyToPosition }) {
  const [isClient, setIsClient] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setMapKey(1), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) return <div>Memuat peta...</div>;

  return (
    <MapContainer
      key={mapKey}
      center={initialPosition || [-6.2088, 106.8456]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <MapContent ... />
    </MapContainer>
  );
}
```

| Bagian | Penjelasan |
|--------|------------|
| `isClient` | Render peta hanya di browser (hindari SSR crash). |
| `mapKey` | Force remount MapContainer setelah mount client. |
| Placeholder "Memuat peta..." | UI saat belum ready. |
| `MapContainer` | Root peta Leaflet. |
| `center` default | Fallback koordinat (Jakarta) jika belum ada posisi. |
| `zoom={13}` | Zoom awal sedang. |
| `scrollWheelZoom` | Zoom dengan scroll mouse diizinkan. |

Di checkout, komponen diload dengan:

```ts
const MapPicker = dynamic(() => import('@/components/map-picker'), { ssr: false });
```

Agar tidak di-render di server sama sekali.

---

## 3.3 Nominatim (cari & reverse alamat) — `app/checkout/page.tsx`

### A. Forward geocoding (ketik alamat → saran)

```ts
const res = await fetch(
  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&countrycodes=id&limit=5`
);
const data = await res.json();
setAddressSuggestions(data);
```

| Parameter / bagian | Penjelasan |
|--------------------|------------|
| `/search` | Endpoint Nominatim: teks → daftar lokasi. |
| `format=json` | Respons JSON. |
| `q=` | Query teks alamat (di-encode). |
| `countrycodes=id` | Batasi hasil ke Indonesia. |
| `limit=5` | Maksimal 5 saran. |
| `debouncedQuery` | Delay 500ms agar tidak spam API tiap ketikan. |
| Minimal 3 huruf | Kurangi request sia-sia. |

Saat user pilih saran:

```ts
const lat = parseFloat(suggestion.lat);
const lng = parseFloat(suggestion.lon);
setFlyToPosition([lat, lng]); // peta flyTo
// lalu POST /api/delivery/calculate
```

### B. Reverse geocoding (klik peta → alamat)

```ts
const geoRes = await fetch(
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
);
const geoData = await geoRes.json();
setDestinationAddress(geoData.display_name);
```

| Bagian | Penjelasan |
|--------|------------|
| `/reverse` | Endpoint Nominatim: koordinat → nama alamat. |
| `lat` / `lon` | Dari klik `MapPicker`. |
| `display_name` | Alamat lengkap yang diisi ke form pengiriman. |

---

## 3.4 Hitung jarak & ongkir (Haversine) — `DeliveryService.ts`

Koordinat toko (titik asal):

```ts
const STORE_LAT = -6.98680382532075;
const STORE_LNG = 107.82755858678257;
const MAX_DISTANCE_KM = 10;
```

### Script fungsi jarak & zona

```ts
private toRadians(value: number) {
  return (value * Math.PI) / 180;
}

private haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = this.toRadians(lat2 - lat1);
  const dLng = this.toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

private getZoneAndFee(distanceKm: number) {
  if (distanceKm <= 3) return { zone: 1, shippingFee: 15000 };
  if (distanceKm <= 6) return { zone: 2, shippingFee: 20000 };
  if (distanceKm <= 10) return { zone: 3, shippingFee: 25000 };
  return null;
}

calculateShippingFee(lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Koordinat tidak valid');
  }

  const distanceKm = this.haversineDistanceKm(STORE_LAT, STORE_LNG, lat, lng);
  if (distanceKm > MAX_DISTANCE_KM) {
    throw new Error('Lokasi di luar jangkauan pengiriman (maksimal 10 km)');
  }

  const zoneData = this.getZoneAndFee(distanceKm);
  if (!zoneData) {
    throw new Error('Lokasi di luar jangkauan pengiriman (maksimal 10 km)');
  }

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    zone: zoneData.zone,
    shippingFee: zoneData.shippingFee,
    store: { lat: STORE_LAT, lng: STORE_LNG },
  };
}
```

### Penjelasan baris / fungsi

| Fungsi / baris | Penjelasan |
|----------------|------------|
| `STORE_LAT` / `STORE_LNG` | Titik asal = lokasi toko. |
| `MAX_DISTANCE_KM = 10` | Batas jangkauan pengiriman. |
| `toRadians` | Derajat → radian (rumus Haversine butuh radian). |
| `earthRadiusKm = 6371` | Radius rata-rata bumi (km). |
| `dLat` / `dLng` | Selisih lintang/bujur dalam radian. |
| Rumus `a` | Bagian tengah formula Haversine (chord length). |
| `atan2(√a, √(1-a))` | Hitung sudut pusat → dikali radius = jarak km. |
| `getZoneAndFee` | Mapping jarak → zona & tarif ongkir. |
| Zona 1 (≤3 km) | Rp 15.000 |
| Zona 2 (≤6 km) | Rp 20.000 |
| Zona 3 (≤10 km) | Rp 25.000 |
| `> 10 km` | Tolak (di luar jangkauan). |
| `Number.isFinite` | Tolak NaN / Infinity. |
| `toFixed(2)` | Bulatkan jarak 2 desimal untuk tampilan. |

### API route

`POST /api/delivery/calculate` → `DeliveryController.calculateShippingFee` → `DeliveryService.calculateShippingFee`.

Body request:

```json
{ "lat": -6.98, "lng": 107.82 }
```

Respons sukses:

```json
{
  "distanceKm": 2.45,
  "zone": 1,
  "shippingFee": 15000,
  "store": { "lat": -6.98..., "lng": 107.82... }
}
```

### Diagram alur OSM di checkout

```
User ketik alamat
  → Nominatim /search (autocomplete)
  → Pilih saran → set lat/lng → MapPicker flyTo
  → POST /api/delivery/calculate (Haversine)
  → Tampil ongkir

ATAU

User klik peta (Leaflet + OSM tiles)
  → lat/lng dari klik
  → Nominatim /reverse → isi alamat
  → POST /api/delivery/calculate
  → Tampil ongkir
```

---

# 4. Ringkasan integrasi ketiga teknologi

```
┌─────────────┐     createTransaction      ┌─────────┐
│  Checkout / │ ─────────────────────────► │ Pakasir │
│  Kasir      │ ◄──── payment_number ────── │         │
└──────┬──────┘                            └────┬────┘
       │                                        │ webhook completed
       │                                        ▼
       │                               ┌────────────────┐
       │                               │ PaymentService │
       │                               │ status = paid  │
       │                               └────────┬───────┘
       │                                        │
       │  sendOrder / OTP / receipt / shipping  ▼
       │                               ┌─────────┐
       └──────────────────────────────►│ Fonnte  │──► WhatsApp user/kurir
                                       └─────────┘

┌─────────────┐  tiles + klik peta   ┌──────────────────┐
│  Checkout   │ ◄──────────────────► │ OpenStreetMap    │
│  MapPicker  │  Nominatim search/   │ + Leaflet         │
│             │  reverse             └────────┬─────────┘
└──────┬──────┘                               │ lat/lng
       │                                      ▼
       │                             ┌─────────────────┐
       └────────────────────────────►│ DeliveryService │
                                     │ Haversine+zona  │
                                     └─────────────────┘
```

---

# 5. Daftar file sumber

| Teknologi | File |
|-----------|------|
| **Pakasir** | `services/pakasirService.ts` |
| | `app/services/PaymentService.ts` |
| | `app/controllers/PaymentController.ts` |
| | `app/api/payment/pakasir/notify/route.ts` |
| | `app/services/OrderService.ts` (createTransaction) |
| | `app/services/CashierService.ts` (createTransaction) |
| | `app/api/pesanan/[id]/retry-payment/route.ts` |
| | `lib/env.ts` |
| **Fonnte** | `services/whatsappService.ts` |
| | `app/services/AuthService.ts` (OTP) |
| | `app/services/OrderService.ts` (notifikasi) |
| | `app/services/PaymentService.ts` (receipt) |
| | `lib/env.ts` |
| **OpenStreetMap** | `components/map-picker.tsx` |
| | `app/checkout/page.tsx` (Nominatim + MapPicker) |
| | `app/services/DeliveryService.ts` (Haversine) |
| | `app/controllers/DeliveryController.ts` |
| | `app/api/delivery/calculate/route.ts` |

---

# 6. Dependensi terkait (`package.json`)

| Package | Untuk |
|---------|-------|
| `axios` | Client HTTP Fonnte |
| `leaflet` | Engine peta |
| `react-leaflet` | Komponen React untuk Leaflet |
| `@types/leaflet` | TypeScript types Leaflet |

Pakasir memakai `fetch` native (tanpa package khusus).

---

*Dokumen ini disusun dari implementasi aktual di codebase Next.js Toko Naning. Cocok dipakai sebagai bahan bab implementasi teknologi / lampiran skripsi, atau sebagai konteks untuk AI lain.*
