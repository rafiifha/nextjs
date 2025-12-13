import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, hargaDus, hargaPak, hargaRenceng, stock_online, stock_offline } = body;

    const product = await prisma.product.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(name && { name }),
        ...(hargaDus !== undefined && { hargaDus }),
        ...(hargaPak !== undefined && { hargaPak }),
        ...(hargaRenceng !== undefined && { hargaRenceng }),
        ...(stock_online !== undefined && { stock_online }),
        ...(stock_offline !== undefined && { stock_offline }),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate produk' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}

