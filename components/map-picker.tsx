'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPosition?: [number, number];
  flyToPosition?: [number, number] | null;
}

function LocationMarker({ onLocationSelect, initialPosition }: { onLocationSelect: (lat: number, lng: number) => void; initialPosition?: [number, number] }) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null);

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const newPosition: [number, number] = [lat, lng];
      setPosition(newPosition);
      // Always call callback when user clicks
      console.log('Map clicked:', lat, lng);
      onLocationSelect(lat, lng);
    },
  });

  // Update position when initialPosition changes
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  // Create custom icon for destination (blue pin)
  const destinationIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return position === null ? null : (
    <Marker position={position} icon={destinationIcon}>
      <Popup>
        <div className="text-sm">
          <p className="font-semibold">Lokasi Pengiriman</p>
          <p className="text-gray-600">{position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
        </div>
      </Popup>
    </Marker>
  );
}


// Component to fly map to a given position
function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, { duration: 1.2 });
    }
  }, [position, map]);

  return null;
}

// Component to ensure map is ready before rendering children
function MapContent({ onLocationSelect, initialPosition, flyToPosition }: { onLocationSelect: (lat: number, lng: number) => void; initialPosition?: [number, number]; flyToPosition?: [number, number] | null }) {
  const map = useMap();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (map && map.getPane) {
      // Check if map pane is available
      try {
        const pane = map.getPane('tilePane');
        if (pane) {
          // Map is fully initialized
          setIsReady(true);
        } else {
          // Wait a bit more
          const timer = setTimeout(() => {
            setIsReady(true);
          }, 150);
          return () => clearTimeout(timer);
        }
      } catch (error) {
        // If error, wait and retry
        const timer = setTimeout(() => {
          setIsReady(true);
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [map]);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker onLocationSelect={onLocationSelect} initialPosition={initialPosition} />
      <FlyToLocation position={flyToPosition || null} />
    </>
  );
}

export default function MapPicker({ onLocationSelect, initialPosition, flyToPosition }: MapPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setIsClient(true);
    // Force re-render after client mount to ensure MapContainer is ready
    const timer = setTimeout(() => {
      setMapKey(1);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Memuat peta...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 relative">
      <MapContainer
        key={mapKey} // Force re-render when client is ready
        center={initialPosition || [-6.2088, 106.8456]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapContent onLocationSelect={onLocationSelect} initialPosition={initialPosition} flyToPosition={flyToPosition} />
      </MapContainer>
      {/* Legend for destination pin only */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="font-medium">Lokasi Pengiriman</span>
        </div>
      </div>
    </div>
  );
}
