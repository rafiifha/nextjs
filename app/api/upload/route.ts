import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * API Upload Handler (Vercel Blob Storage).
 * Menyimpan file foto bukti pengiriman dan gambar produk ke Vercel Blob.
 * Dilengkapi fallback penyimpanan lokal saat pengembangan di local environment.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'proof-of-delivery';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validasi format file gambar
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 });
    }

    // Validasi ukuran maksimal (5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB' },
        { status: 400 }
      );
    }

    // Generate path nama file yang unik
    const ext = file.name.split('.').pop() || 'jpg';
    const cleanFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const blobPath = `${folder}/${cleanFilename}`;

    // 1. Prioritas Utama: Simpan ke Vercel Blob Storage
    if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) {
      try {
        const blob = await put(blobPath, file, {
          access: 'public',
          contentType: file.type || 'image/jpeg',
        });
        console.log(`📁 Foto tersimpan di Vercel Blob: ${blob.url}`);
        return NextResponse.json({ url: blob.url });
      } catch (blobErr: any) {
        console.error('Gagal upload ke Vercel Blob:', blobErr);
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          console.warn(
            'Peringatan: BLOB_READ_WRITE_TOKEN belum diset di Environment Variables Vercel.'
          );
        }
      }
    }

    // 2. Fallback Lokal (untuk pengujian dev offline tanpa token blob)
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);

      await mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, cleanFilename);
      await writeFile(filePath, buffer);

      const localUrl = `/uploads/${folder}/${cleanFilename}`;
      console.log(`📁 Foto tersimpan di Local Storage: ${localUrl}`);

      return NextResponse.json({ url: localUrl });
    } catch (localErr: any) {
      throw new Error(
        'Penyimpanan lokal gagal. Pastikan Environment Variable BLOB_READ_WRITE_TOKEN sudah dikonfigurasi di dashboard Vercel.'
      );
    }
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Gagal mengunggah file', details: error.message },
      { status: 500 }
    );
  }
}
