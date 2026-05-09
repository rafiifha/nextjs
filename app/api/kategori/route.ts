import { NextRequest } from 'next/server';
import { CategoryController } from '@/app/controllers/CategoryController';

const categoryController = new CategoryController();

export async function GET() {
  return categoryController.getCategories();
}

export async function POST(request: NextRequest) {
  return categoryController.createCategory(request);
}
