import { NextRequest } from 'next/server';
import { DeliveryController } from '@/app/controllers/DeliveryController';

const deliveryController = new DeliveryController();

export async function GET(request: NextRequest) {
  const includeAll = request.nextUrl.searchParams.get('all') === 'true';
  return deliveryController.getCouriers(includeAll);
}

export async function POST(request: NextRequest) {
  return deliveryController.createCourier(request);
}
