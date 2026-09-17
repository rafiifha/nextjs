'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Store, Flame, Clock, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

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
    // Poll every 15 seconds for live update
    const interval = setInterval(fetchDensity, 15000);
    return () => clearInterval(interval);
  }, []);

  const isRamai = density.status === 'ramai' || density.count >= 7;
  // Calculate active bar count (max 7)
  const activeLevel = Math.min(density.count, 7);

  return (
    <Card className="border-yellow-200/80 bg-gradient-to-br from-[#fffdf0] via-white to-yellow-50/50 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden relative">
      {/* Decorative top accent line */}
      <div className={`h-1.5 w-full ${isRamai ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} />

      <CardContent className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isRamai ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-700'}`}>
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base leading-tight">Indikator Kepadatan Toko</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRamai ? 'bg-yellow-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isRamai ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                </span>
                <span className="text-xs text-slate-500 font-medium">Real-time Live</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
            isRamai 
              ? 'bg-yellow-100 text-yellow-900 border-yellow-300 animate-pulse' 
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {isRamai ? (
              <>
                <Flame className="h-3.5 w-3.5 text-yellow-700 fill-yellow-500" />
                <span>Ramai ({density.count} Diproses)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Sepi ({density.count} Diproses)</span>
              </>
            )}
          </div>
        </div>

        {/* 7-Segment Gauge Meter */}
        <div className="my-4">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
            <span>Tingkat Kepadatan: <strong className="text-slate-900">{density.count} pesanan</strong></span>
            <span className="text-[11px] text-slate-400">1-6: Sepi | 7+: Ramai</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((segment) => {
              const isActive = activeLevel >= segment;
              const isSegmentRamai = segment >= 7;

              let barBg = 'bg-slate-100';
              if (isActive) {
                if (isRamai || isSegmentRamai) {
                  barBg = 'bg-gradient-to-t from-yellow-500 to-amber-600 shadow-sm';
                } else {
                  barBg = 'bg-gradient-to-t from-emerald-400 to-teal-500 shadow-sm';
                }
              }

              return (
                <div key={segment} className="flex flex-col items-center gap-1">
                  <div 
                    className={`h-3.5 w-full rounded-md transition-all duration-500 ${barBg}`} 
                    title={`Indikator ${segment}${segment === 7 ? '+' : ''}`}
                  />
                  <span className={`text-[10px] font-semibold ${isActive ? (isSegmentRamai ? 'text-yellow-700' : 'text-emerald-600') : 'text-slate-400'}`}>
                    {segment === 7 ? '7+' : segment}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Description & Helper Note */}
        <div className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
          isRamai 
            ? 'bg-yellow-50/90 border-yellow-200 text-yellow-900' 
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
        }`}>
          {isRamai ? (
            <AlertTriangle className="h-4 w-4 text-yellow-700 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium leading-snug">{density.description}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Pesanan diproses saat ini: <span className="font-bold text-slate-800">{density.count} pesanan</span>
            </p>
          </div>
          <button 
            onClick={fetchDensity} 
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors shrink-0 rounded hover:bg-white/50"
            title="Perbarui status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-yellow-600' : ''}`} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
