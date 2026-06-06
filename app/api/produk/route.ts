import { NextRequest } from 'next/server';
import { ProductController } from '@/app/controllers/ProductController';

const productController = new ProductController();

export async function GET(request: NextRequest) {
  return productController.getProducts(request);
}

export async function POST(request: NextRequest) {
  return productController.createProduct(request);
}
