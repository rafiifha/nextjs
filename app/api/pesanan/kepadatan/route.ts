import { NextResponse } from 'next/server';
import { OrderController } from '@/app/controllers/OrderController';

const orderController = new OrderController();

export async function GET() {
  return orderController.getStoreDensity();
}
