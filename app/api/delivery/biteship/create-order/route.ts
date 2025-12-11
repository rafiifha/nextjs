import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/services/biteshipService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log request data for debugging
    console.log('📦 Biteship create order request:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    const missingFields: string[] = [];
    
    if (!body.origin_contact_name) missingFields.push('origin_contact_name');
    if (!body.origin_contact_phone) missingFields.push('origin_contact_phone');
    if (!body.origin_address) missingFields.push('origin_address');
    if (!body.destination_contact_name) missingFields.push('destination_contact_name');
    if (!body.destination_contact_phone) missingFields.push('destination_contact_phone');
    if (!body.destination_address) missingFields.push('destination_address');
    if (!body.courier_company) missingFields.push('courier_company');
    if (!body.courier_type) missingFields.push('courier_type');
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      missingFields.push('items (must be non-empty array)');
    }
    
    // Check for at least one origin identifier
    if (!body.origin_postal_code && !body.origin_coordinate && !body.origin_area_id) {
      missingFields.push('origin_postal_code, origin_coordinate, or origin_area_id');
    }
    
    // Check for at least one destination identifier
    if (!body.destination_postal_code && !body.destination_coordinate && !body.destination_area_id) {
      missingFields.push('destination_postal_code, destination_coordinate, or destination_area_id');
    }
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
          received: Object.keys(body)
        },
        { status: 400 }
      );
    }
    
    const order = await createOrder(body);
    
    if (order.success) {
      console.log('✅ Biteship order created successfully');
      console.log('Order ID:', order.id);
      console.log('Tracking ID:', order.courier?.tracking_id);
      console.log('Waybill ID:', order.courier?.waybill_id);
      return NextResponse.json(order);
    } else {
      console.error('❌ Biteship order failed:', order);
      return NextResponse.json(
        { error: order.message || 'Gagal membuat order pengiriman', details: order },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Biteship create order error:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Gagal membuat order pengiriman';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.response?.data || error.message 
      },
      { status: error.response?.status || 500 }
    );
  }
}

