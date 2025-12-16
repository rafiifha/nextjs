import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        products: {
          include: {
            variants: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data kategori' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, priceTypes } = body;

    if (!name || !priceTypes || !Array.isArray(priceTypes) || priceTypes.length === 0) {
      return NextResponse.json(
        { error: 'Nama kategori dan jenis harga harus diisi' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        priceTypes,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Kategori dengan nama ini sudah ada' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Gagal membuat kategori' },
      { status: 500 }
    );
  }
}


