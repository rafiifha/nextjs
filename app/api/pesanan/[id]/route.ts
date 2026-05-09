import { NextRequest } from 'next/server';
import { OrderController } from '@/app/controllers/OrderController';

const orderController = new OrderController();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return orderController.getOrderById(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return orderController.updateOrder(request, context);
}
