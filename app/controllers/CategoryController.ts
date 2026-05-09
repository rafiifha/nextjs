import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '../services/CategoryService';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async getCategories() {
    try {
      const categories = await this.categoryService.getAllCategories();
      return NextResponse.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data kategori' },
        { status: 500 }
      );
    }
  }

  async createCategory(request: NextRequest) {
    try {
      const body = await request.json();
      const { name, priceTypes } = body;

      const category = await this.categoryService.createCategory(name, priceTypes);
      return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
      console.error('Create category error:', error);
      
      const errorMessage = error.message;
      if (errorMessage === 'Nama kategori dan jenis harga harus diisi' || errorMessage === 'Kategori dengan nama ini sudah ada') {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Gagal membuat kategori' },
        { status: 500 }
      );
    }
  }
}
