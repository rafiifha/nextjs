import { NextRequest } from 'next/server';
import { OrderController } from '@/app/controllers/OrderController';

const orderController = new OrderController();

export async function GET() {
  return orderController.getOrders();
}

export async function POST(request: NextRequest) {
  return orderController.createOrder(request);
}
