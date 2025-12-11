import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const debt = await prisma.debt.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!debt) {
      return NextResponse.json(
        { error: 'Data hutang tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(debt);
  } catch (error) {
    console.error('Get debt error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data hutang' },
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
    const { customerName, customerPhone, amount, paidAmount, status, dueDate } = body;

    const debt = await prisma.debt.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(customerName && { customerName }),
        ...(customerPhone && { customerPhone }),
        ...(amount !== undefined && { amount }),
        ...(paidAmount !== undefined && { paidAmount }),
        ...(status && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
    });

    return NextResponse.json(debt);
  } catch (error) {
    console.error('Update debt error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate data hutang' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.debt.delete({
      where: { id: parseInt(params.id) },
    });

    return NextResponse.json({ message: 'Data hutang berhasil dihapus' });
  } catch (error) {
    console.error('Delete debt error:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data hutang' },
      { status: 500 }
    );
  }
}

