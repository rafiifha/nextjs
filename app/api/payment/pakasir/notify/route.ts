import { NextRequest } from 'next/server';
import { PaymentController } from '@/app/controllers/PaymentController';

const paymentController = new PaymentController();

export async function POST(req: NextRequest) {
  return paymentController.handlePakasirWebhook(req);
}
