'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export interface StoreDensityData {
  count: number;
  status: 'sepi' | 'ramai';
  label: string;
  threshold: number;
  description: string;
}

interface StoreDensityCardProps {
  initialData?: StoreDensityData;
}

export function StoreDensityCard({ initialData }: StoreDensityCardProps) {
  const [density, setDensity] = useState<StoreDensityData>(
    initialData || {
      count: 0,
      status: 'sepi',
      label: 'Sepi',
      threshold: 7,
      description: 'Antrean toko lancar. Pesanan Anda dapat segera diproses.',
    }
  );
  const [loading, setLoading] = useState(false);

  const fetchDensity = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pesanan/kepadatan?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setDensity(data);
      }
    } catch (err) {
      console.error('Error fetching store density:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchDensity, 15000);
    return () => clearInterval(interval);
  }, []);

  const isRamai = density.status === 'ramai' || density.count >= 7;
  const activeLevel = Math.min(density.count, 7);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm p-4 shadow-xs transition-all duration-200 hover:border-slate-300/80">
      {/* Baris 1: Header & Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                isRamai ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isRamai ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-xs font-semibold text-slate-600">
            Kepadatan Toko
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge Minimalis */}
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isRamai
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {isRamai ? 'Ramai' : 'Lancar'}
          </span>

          <button
            onClick={fetchDensity}
            disabled={loading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Perbarui"
            aria-label="Perbarui kepadatan toko"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-slate-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Baris 2: Metrik Pesanan */}
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900">
          {density.count}
        </span>
        <span className="text-xs text-slate-500">
          pesanan sedang diproses
        </span>
      </div>

      {/* Baris 3: Segmented Bar Tipis */}
      <div className="flex gap-1.5 my-2.5">
        {[1, 2, 3, 4, 5, 6, 7].map((segment) => {
          const isActive = activeLevel >= segment;
          return (
            <div
              key={segment}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                isActive
                  ? isRamai
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                  : 'bg-slate-100'
              }`}
            />
          );
        })}
      </div>

      {/* Baris 4: Deskripsi Singkat */}
      <p className="text-[11px] text-slate-500 leading-snug">
        {density.description}
      </p>
    </div>
  );
}
