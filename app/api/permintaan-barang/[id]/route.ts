import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get single product request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productRequest = await prisma.productRequest.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
      },
    });

    if (!productRequest) {
      return NextResponse.json(
        { error: 'Permintaan barang tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(productRequest);
  } catch (error) {
    console.error('Get product request error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data permintaan barang' },
      { status: 500 }
    );
  }
}

// PUT - Update product request status (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid' },
        { status: 400 }
      );
    }

    const productRequest = await prisma.productRequest.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return NextResponse.json(productRequest);
  } catch (error) {
    console.error('Update product request error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate status permintaan barang' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.productRequest.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Permintaan barang berhasil dihapus' });
  } catch (error) {
    console.error('Delete product request error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus permintaan barang' },
      { status: 500 }
    );
  }
}

