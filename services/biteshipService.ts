import axios from 'axios';
import { env } from '@/lib/env';

const biteshipApi = axios.create({
  baseURL: 'https://api.biteship.com/v1',
  headers: {
    'Authorization': `Bearer ${env.BITESHIP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface ShippingRateRequest {
  origin_postal_code?: number;
  destination_postal_code?: number;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  origin_area_id?: string;
  destination_area_id?: string;
  couriers: string;
  items: Array<{
    name: string;
    description: string;
    value: number;
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity: number;
  }>;
  courier_insurance?: number;
  destination_cash_on_delivery?: number;
  destination_cash_on_delivery_type?: '7_days' | '5_days' | '3_days';
  type?: string;
}

export interface ShippingRatePricing {
  available_collection_method: string[];
  available_for_cash_on_delivery: boolean;
  available_for_proof_of_delivery: boolean;
  available_for_instant_waybill_id: boolean;
  available_for_insurance: boolean;
  company: string;
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  currency: string;
  description: string;
  duration: string;
  shipment_duration_range: string;
  shipment_duration_unit: string;
  service_type: string;
  shipping_type: string;
  shipping_fee: number;
  shipping_fee_discount?: number;
  shipping_fee_surcharge?: number;
  insurance_fee?: number;
  cash_on_delivery_fee?: number;
  price: number;
  tax_lines: any[];
  type: string;
}

export interface ShippingRateResponse {
  success: boolean;
  object: string;
  message: string;
  code: number;
  origin?: any;
  destination?: any;
  pricing: ShippingRatePricing[];
}

export async function getShippingRates(data: ShippingRateRequest): Promise<ShippingRateResponse> {
  try {
    console.log('🚀 Request to Biteship API:', JSON.stringify(data, null, 2));
    const response = await biteshipApi.post('/rates/couriers', data);
    console.log('✅ Biteship API Response:', JSON.stringify(response.data, null, 2));
    console.log('📦 Pricing array:', response.data.pricing);
    return response.data;
  } catch (error: any) {
    console.error('❌ Biteship error:', error.response?.data || error.message);
    throw error;
  }
}

export interface CreateOrderRequest {
  shipper_contact_name?: string;
  shipper_contact_phone?: string;
  shipper_contact_email?: string;
  shipper_organization?: string;
  origin_contact_name: string;
  origin_contact_phone: string;
  origin_contact_email?: string;
  origin_address: string;
  origin_note?: string;
  origin_postal_code?: number;
  origin_coordinate?: {
    latitude: number;
    longitude: number;
  };
  origin_area_id?: string;
  origin_location_id?: string;
  origin_collection_method?: 'pickup' | 'drop_off';
  destination_contact_name: string;
  destination_contact_phone: string;
  destination_contact_email?: string;
  destination_address: string;
  destination_note?: string;
  destination_postal_code?: number;
  destination_coordinate?: {
    latitude: number;
    longitude: number;
  };
  destination_area_id?: string;
  destination_location_id?: string;
  destination_cash_on_delivery?: number;
  destination_cash_on_delivery_type?: '7_days' | '5_days' | '3_days';
  destination_proof_of_delivery?: boolean;
  destination_proof_of_delivery_note?: string;
  courier_company: string;
  courier_type: string;
  courier_insurance?: number;
  delivery_type: 'now' | 'scheduled';
  delivery_date?: string; // YYYY-MM-DD
  delivery_time?: string; // HH:mm
  order_note?: string;
  metadata?: any;
  reference_id?: string;
  tags?: string[];
  items: Array<{
    name: string;
    description: string;
    category?: string;
    value: number;
    quantity: number;
    height: number;
    length: number;
    weight: number;
    width: number;
    sku?: string;
  }>;
}

export interface BiteshipOrderResponse {
  success: boolean;
  message: string;
  object: string;
  id: string;
  draft_order_id?: string;
  shipper?: any;
  origin: any;
  destination: any;
  courier: {
    tracking_id: string;
    waybill_id: string;
    company: string;
    type: string;
    link?: string;
    insurance?: any;
  };
  delivery: any;
  reference_id?: string;
  items: any[];
  currency: string;
  price: number;
  status: string;
}

export async function createOrder(data: CreateOrderRequest): Promise<BiteshipOrderResponse> {
  try {
    console.log('🚀 Sending request to Biteship API...');
    console.log('Request URL:', `${biteshipApi.defaults.baseURL}/orders`);
    console.log('Request data:', JSON.stringify(data, null, 2));
    
    const response = await biteshipApi.post('/orders', data);
    
    console.log('✅ Biteship API response received');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Biteship create order error:');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response headers:', error.response.headers);
    }
    
    if (error.request) {
      console.error('Request made but no response received:', error.request);
    }
    
    throw error;
  }
}

export interface TrackingResponse {
  success: boolean;
  message: string;
  object: string;
  id: string;
  waybill_id: string;
  courier: {
    company: string;
    driver_name?: string;
    driver_phone?: string;
    driver_photo_url?: string;
    driver_plate_number?: string;
  };
  origin: {
    contact_name: string;
    address: string;
  };
  destination: {
    contact_name: string;
    address: string;
  };
  history: Array<{
    note: string;
    service_type: string;
    updated_at: string;
    status: string;
  }>;
  link?: string;
  order_id?: string;
  status: string;
}

export async function getTracking(trackingId: string): Promise<TrackingResponse> {
  try {
    const response = await biteshipApi.get(`/trackings/${trackingId}`);
    return response.data;
  } catch (error: any) {
    console.error('Biteship tracking error:', error.response?.data || error.message);
    throw error;
  }
}

