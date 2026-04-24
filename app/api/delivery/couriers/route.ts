import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const couriers = await prisma.courier.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(couriers);
  } catch (error) {
    console.error('Get couriers error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data kurir' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').trim();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nama dan nomor whatsapp wajib diisi' }, { status: 400 });
    }

    const courier = await prisma.courier.create({
      data: {
        name,
        phone,
      },
    });

    return NextResponse.json(courier, { status: 201 });
  } catch (error: any) {
    console.error('Create courier error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Nomor whatsapp kurir sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah kurir' }, { status: 500 });
  }
}
