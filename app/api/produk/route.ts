import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categoryId, variants } = body;

    if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { error: 'Nama, kategori, dan varian harga harus diisi' },
        { status: 400 }
      );
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate price types match category
    const categoryPriceTypes = category.priceTypes;
    const variantPriceTypes = variants.map((v: any) => v.priceType);
    const invalidTypes = variantPriceTypes.filter((type: string) => !categoryPriceTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      return NextResponse.json(
        { error: `Jenis harga tidak valid untuk kategori ini: ${invalidTypes.join(', ')}. Kategori ini hanya mendukung: ${categoryPriceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create product with variants
    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        variants: {
          create: variants.map((variant: any) => {
            // Parse price
            let price: number | null = null;
            if (variant.price !== undefined && variant.price !== null && variant.price !== '') {
              const parsed = typeof variant.price === 'string' ? parseInt(variant.price) : variant.price;
              price = isNaN(parsed) ? null : parsed;
            }
            
            // Parse stock_online
            let stockOnline: number | null = null;
            if (variant.stock_online !== undefined && variant.stock_online !== null && variant.stock_online !== '') {
              const parsed = typeof variant.stock_online === 'string' ? parseInt(variant.stock_online) : variant.stock_online;
              stockOnline = isNaN(parsed) ? null : parsed;
            }
            
            // Parse stock_offline
            let stockOffline: number | null = null;
            if (variant.stock_offline !== undefined && variant.stock_offline !== null && variant.stock_offline !== '') {
              const parsed = typeof variant.stock_offline === 'string' ? parseInt(variant.stock_offline) : variant.stock_offline;
              stockOffline = isNaN(parsed) ? null : parsed;
            }
            
            // Parse dimensions and weight
            let length: number | null = null;
            if (variant.length !== undefined && variant.length !== null && variant.length !== '') {
              const parsed = typeof variant.length === 'string' ? parseInt(variant.length) : variant.length;
              length = isNaN(parsed) ? null : parsed;
            }
            
            let width: number | null = null;
            if (variant.width !== undefined && variant.width !== null && variant.width !== '') {
              const parsed = typeof variant.width === 'string' ? parseInt(variant.width) : variant.width;
              width = isNaN(parsed) ? null : parsed;
            }
            
            let height: number | null = null;
            if (variant.height !== undefined && variant.height !== null && variant.height !== '') {
              const parsed = typeof variant.height === 'string' ? parseInt(variant.height) : variant.height;
              height = isNaN(parsed) ? null : parsed;
            }
            
            let weight: number | null = null;
            if (variant.weight !== undefined && variant.weight !== null && variant.weight !== '') {
              const parsed = typeof variant.weight === 'string' ? parseInt(variant.weight) : variant.weight;
              weight = isNaN(parsed) ? null : parsed;
            }
            
            // Always include all fields, even if null
            return {
              priceType: variant.priceType,
              price: price ?? null,
              stock_online: stockOnline ?? null,
              stock_offline: stockOffline ?? null,
              length: length,
              width: width,
              height: height,
              weight: weight,
            };
          }),
        },
      },
      include: {
        category: true,
        variants: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat produk', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

