import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const debts = await prisma.debt.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(debts);
  } catch (error) {
    console.error('Get debts error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data hutang' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, amount, dueDate } = body;

    if (!customerName || !customerPhone || !amount) {
      return NextResponse.json(
        { error: 'Nama, telepon, dan jumlah harus diisi' },
        { status: 400 }
      );
    }

    const status = amount > 0 ? 'unpaid' : 'paid';

    const debt = await prisma.debt.create({
      data: {
        customerName,
        customerPhone,
        amount,
        paidAmount: 0,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error('Create debt error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat data hutang' },
      { status: 500 }
    );
  }
}

