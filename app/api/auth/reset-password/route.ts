import { NextRequest, NextResponse } from 'next/server';
import { UserController } from '@/app/controllers/UserController';
import { verifyToken } from '@/lib/auth';

const userController = new UserController();

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.split(' ')[1]);
}

export async function POST(request: NextRequest) {
  const authUser = getAuthUser(request);
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
  }
  return userController.resetEmployeePassword(request);
}
