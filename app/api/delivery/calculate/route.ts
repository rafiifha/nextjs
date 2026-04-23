import { NextRequest, NextResponse } from 'next/server';

const STORE_LAT = -6.98680382532075;
const STORE_LNG = 107.82755858678257;
const MAX_DISTANCE_KM = 10;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getZoneAndFee(distanceKm: number) {
  if (distanceKm <= 3) {
    return { zone: 1, shippingFee: 15000 };
  }
  if (distanceKm <= 6) {
    return { zone: 2, shippingFee: 20000 };
  }
  if (distanceKm <= 10) {
    return { zone: 3, shippingFee: 25000 };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Koordinat tidak valid' }, { status: 400 });
    }

    const distanceKm = haversineDistanceKm(STORE_LAT, STORE_LNG, lat, lng);
    if (distanceKm > MAX_DISTANCE_KM) {
      return NextResponse.json(
        { error: 'Lokasi di luar jangkauan pengiriman (maksimal 10 km)' },
        { status: 400 }
      );
    }

    const zoneData = getZoneAndFee(distanceKm);
    if (!zoneData) {
      return NextResponse.json(
        { error: 'Lokasi di luar jangkauan pengiriman (maksimal 10 km)' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      distanceKm: Number(distanceKm.toFixed(2)),
      zone: zoneData.zone,
      shippingFee: zoneData.shippingFee,
      store: { lat: STORE_LAT, lng: STORE_LNG },
    });
  } catch (error) {
    console.error('Calculate delivery error:', error);
    return NextResponse.json({ error: 'Gagal menghitung ongkir' }, { status: 500 });
  }
}
