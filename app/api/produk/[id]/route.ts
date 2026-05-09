import { NextRequest } from 'next/server';
import { ProductController } from '@/app/controllers/ProductController';

const productController = new ProductController();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return productController.getProductById(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return productController.updateProduct(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return productController.deleteProduct(request, context);
}
