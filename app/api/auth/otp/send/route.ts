import { NextRequest } from 'next/server';
import { AuthController } from '@/app/controllers/AuthController';

const authController = new AuthController();

export async function POST(request: NextRequest) {
  return authController.sendOtp(request);
}
