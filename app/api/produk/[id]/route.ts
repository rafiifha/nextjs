import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(resolvedParams.id) },
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const body = await request.json();
    const { name, categoryId, variants } = body;

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    console.log('PUT request - params:', resolvedParams, 'id:', resolvedParams.id);
    
    if (!resolvedParams.id) {
      console.error('Missing product ID in params');
      return NextResponse.json(
        { error: 'ID produk tidak ditemukan' },
        { status: 400 }
      );
    }
    
    const productId = parseInt(resolvedParams.id);
    
    if (isNaN(productId) || productId <= 0) {
      console.error('Invalid product ID:', resolvedParams.id, 'parsed:', productId);
      return NextResponse.json(
        { error: `ID produk tidak valid: ${resolvedParams.id}` },
        { status: 400 }
      );
    }

    if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { error: 'Nama, kategori, dan varian harga harus diisi' },
        { status: 400 }
      );
    }
    
    // Get existing product
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, variants: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
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

    // Delete existing variants and create new ones
    await prisma.productVariant.deleteMany({
      where: { productId },
    });

    // Update product with new variants
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        categoryId: parseInt(categoryId),
        variants: {
          create: variants.map((variant: any) => {
            // Parse price
            let price: number | null = null;
            if (variant.price !== undefined && variant.price !== null && variant.price !== '') {
              const parsed = typeof variant.price === 'string' ? parseInt(variant.price) : variant.price;
              price = isNaN(parsed) ? null : parsed;
            }
            
            // Parse stock
            let stock: number | null = null;
            if (variant.stock !== undefined && variant.stock !== null && variant.stock !== '') {
              const parsed = typeof variant.stock === 'string' ? parseInt(variant.stock) : variant.stock;
              stock = isNaN(parsed) ? null : parsed;
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
            
            return {
              priceType: variant.priceType,
              price: price,
              stock: stock,
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
        variants: {
          orderBy: { priceType: 'asc' },
        },
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate produk', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const productId = parseInt(resolvedParams.id);
    
    if (isNaN(productId) || productId <= 0) {
      console.error('Invalid product ID:', resolvedParams.id);
      return NextResponse.json(
        { error: 'ID produk tidak valid' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Delete product (variants will be deleted automatically due to onDelete: Cascade)
    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ message: 'Produk berhasil dihapus' });
  } catch (error: any) {
    console.error('Delete product error:', error);
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Produk tidak dapat dihapus karena masih digunakan dalam pesanan' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Gagal menghapus produk', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}
