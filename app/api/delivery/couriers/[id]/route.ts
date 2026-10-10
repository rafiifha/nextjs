import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/app/services/UserService';

const userService = new UserService();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const phone = String(body?.phone || '').trim();
    const email = body?.email !== undefined ? (body.email ? String(body.email).trim().toLowerCase() : null) : undefined;
    const isActive = typeof body?.isActive === 'boolean' ? body.isActive : undefined;

    const courier = await userService.updateCourier(Number(id), {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(email !== undefined && { email }),
      ...(isActive !== undefined && { isActive }),
    });

    return NextResponse.json(courier);
  } catch (error: any) {
    console.error('Update courier error:', error);
    if (error.message === 'User kurir tidak ditemukan') {
      return NextResponse.json({ error: 'Kurir tidak ditemukan' }, { status: 404 });
    }
    if (error?.code === 'P2002') {
      const target = error?.meta?.target;
      if (Array.isArray(target) && target.includes('email')) {
        return NextResponse.json({ error: 'Email kurir sudah dipakai' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Nomor HP atau email kurir sudah dipakai' }, { status: 409 });
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
    const courier = await userService.toggleCourierActive(Number(id), false);
    return NextResponse.json(courier);
  } catch (error: any) {
    console.error('Delete courier error:', error);
    if (error.message === 'User kurir tidak ditemukan') {
      return NextResponse.json({ error: 'Kurir tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Gagal menonaktifkan kurir' }, { status: 500 });
  }
}
