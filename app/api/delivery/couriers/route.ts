import { NextRequest } from 'next/server';
import { DeliveryController } from '@/app/controllers/DeliveryController';
import { UserService } from '@/app/services/UserService';
import { NextResponse } from 'next/server';

const deliveryController = new DeliveryController();
const userService = new UserService();

export async function GET(request: NextRequest) {
  const includeAll = request.nextUrl.searchParams.get('all') === 'true';
  return deliveryController.getCouriers(includeAll);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const courier = await userService.createCourier(body);
    return NextResponse.json(courier, { status: 201 });
  } catch (error: any) {
    console.error('Create courier error:', error);
    if (error.message === 'Nama, nomor HP, dan password wajib diisi') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Nomor HP kurir sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Gagal menambah kurir' }, { status: 500 });
  }
}
