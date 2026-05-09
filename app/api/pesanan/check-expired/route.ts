import { NextRequest } from 'next/server';
import { OrderController } from '@/app/controllers/OrderController';

const orderController = new OrderController();

// Endpoint to check and cancel expired orders
// This should be called periodically (e.g., via cron job or scheduled task)
export async function POST(request: NextRequest) {
  return orderController.checkExpiredOrders();
}

// GET endpoint for manual check (for testing)
export async function GET() {
  return orderController.getExpiredOrdersForTest();
}
