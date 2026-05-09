import { NextRequest } from 'next/server';
import { UserController } from '@/app/controllers/UserController';

const userController = new UserController();

export async function PUT(request: NextRequest) {
  return userController.updateProfile(request);
}
