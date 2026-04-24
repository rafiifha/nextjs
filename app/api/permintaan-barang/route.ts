import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get all product requests (admin only)
export async function GET(request: NextRequest) {
  try {
    const requests = await prisma.productRequest.findMany({
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Get product requests error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data permintaan barang' },
      { status: 500 }
    );
  }
}

// POST - Create new product request (customer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, categoryId, customerName, customerPhone, notes } = body;

    if (!productName || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Nama produk, nama pelanggan, dan nomor whatsapp harus diisi' },
        { status: 400 }
      );
    }

    // Parse categoryId safely
    let parsedCategoryId: number | null = null;
    if (categoryId) {
      const parsed = parseInt(categoryId);
      if (!isNaN(parsed) && parsed > 0) {
        parsedCategoryId = parsed;
      }
    }

    const productRequest = await prisma.productRequest.create({
      data: {
        productName,
        categoryId: parsedCategoryId,
        customerName,
        customerPhone,
        notes: notes || null,
        status: 'pending',
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(productRequest, { status: 201 });
  } catch (error: any) {
    console.error('Create product request error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    return NextResponse.json(
      { 
        error: 'Gagal membuat permintaan barang',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

