import { NextRequest } from 'next/server';
import { DeliveryController } from '@/app/controllers/DeliveryController';

const deliveryController = new DeliveryController();

export async function POST(request: NextRequest) {
  return deliveryController.calculateShippingFee(request);
}
