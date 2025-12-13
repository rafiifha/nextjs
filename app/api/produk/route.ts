import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, hargaDus, hargaPak, hargaRenceng, stock_online, stock_offline } = body;

    if (!name || hargaDus === undefined || hargaPak === undefined || hargaRenceng === undefined) {
      return NextResponse.json(
        { error: 'Nama dan harga harus diisi' },
        { status: 400 }
      );
    }

    // Default stock jika tidak diisi
    const onlineStock = stock_online !== undefined ? stock_online : 0;
    const offlineStock = stock_offline !== undefined ? stock_offline : 0;

    const product = await prisma.product.create({
      data: {
        name,
        hargaDus,
        hargaPak,
        hargaRenceng,
        stock_online: onlineStock,
        stock_offline: offlineStock,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat produk' },
      { status: 500 }
    );
  }
}

