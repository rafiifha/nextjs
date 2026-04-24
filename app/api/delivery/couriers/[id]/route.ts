import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined;

    const courier = await prisma.courier.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(courier);
  } catch (error: any) {
    console.error('Update courier error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Kurir tidak ditemukan' }, { status: 404 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Nomor whatsapp kurir sudah dipakai' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal update kurir' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courier = await prisma.courier.update({
      where: { id: Number(id) },
      data: { isActive: false },
    });

    return NextResponse.json(courier);
  } catch (error: any) {
    console.error('Delete courier error:', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Kurir tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Gagal menonaktifkan kurir' }, { status: 500 });
  }
}
