import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 });
    }

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Upload to Vercel Blob Storage
    const blob = await put(filename, file, {
      access: 'public',
    });

    console.log(`📁 File uploaded to Blob: ${blob.url}`);

    // Return the public Blob URL
    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Gagal mengunggah file', details: error.message },
      { status: 500 }
    );
  }
}
