# Setup Database Neon

## Cara Menggunakan Branch Development

1. **Buka Neon Dashboard**
   - Login ke https://console.neon.tech
   - Pilih project Anda

2. **Switch ke Branch Development**
   - Di dashboard, cari dropdown "Branch" di bagian Monitoring
   - Pilih "development" (bukan "production Default")

3. **Copy Connection String**
   - Setelah switch ke branch development
   - Klik "Connection Details" atau "Connection String"
   - Copy connection string yang baru

4. **Update .env File**
   - Buka file `.env` di project
   - Ganti `DATABASE_URL` dengan connection string dari branch development
   - Format: `postgresql://user:password@host/database?sslmode=require`

5. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Catatan

- **Development Branch**: Untuk development/testing (bisa di-suspend jika tidak digunakan)
- **Production Branch**: Untuk production (selalu aktif, lebih mahal)

Untuk development, gunakan branch development agar lebih hemat dan aman.

