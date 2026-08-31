'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Truck,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Package,
  FileText,
  RefreshCw,
  Loader2,
  Camera,
  Upload,
  X,
  Eye,
  SwitchCamera,
  MessageCircle,
  Copy,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  priceType: string;
  product: {
    id: number;
    name: string;
  };
}

interface DeliveryOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  status: string;
  totalHarga: number;
  shippingFee: number | null;
  shippingAddress: string | null;
  shippingLat: number | null;
  shippingLng: number | null;
  shippingZone: number | null;
  shippingDistance: number | null;
  shippingNotes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  proofOfDelivery: string | null;
  items: OrderItem[];
  courier: { id: number; name: string; phone: string | null } | null;
}

/**
 * Halaman Pengiriman Kurir - Desain Simple & Langsung pada Inti.
 */
export default function KurirPengirimanPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [tab, setTab] = useState<'aktif' | 'selesai'>('aktif');
  const [copiedAddressId, setCopiedAddressId] = useState<number | null>(null);

  // State modal kamera (WebRTC)
  const [cameraActive, setCameraActive] = useState(false);
  const [activeOrderIdForCamera, setActiveOrderIdForCamera] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // State modal zoom foto bukti
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const fetchOrders = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch('/api/kurir/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setOrders(await res.json());
      } else {
        toast.error('Gagal memuat data pengiriman');
      }
    } catch {
      toast.error('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ================= OTOMATIS UPLOAD & UBAH STATUS KE TERKIRIM =================

  const uploadAndMarkDelivered = async (orderId: number, file: File) => {
    const token = getToken();
    if (!token) {
      toast.error('Sesi login telah berakhir');
      return;
    }

    setUpdatingId(orderId);

    try {
      // 1. Upload foto bukti ke server (/api/upload -> Vercel Blob)
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'proof-of-delivery');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json();
        throw new Error(uploadErr.error || 'Gagal mengunggah foto');
      }

      const uploadResult = await uploadRes.json();
      const proofOfDeliveryUrl = uploadResult.url;

      // 2. Kirim update status ke delivered beserta URL foto bukti
      const res = await fetch(`/api/kurir/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'delivered',
          proofOfDelivery: proofOfDeliveryUrl,
        }),
      });

      if (res.ok) {
        toast.success('Pesanan Berhasil Diselesaikan! 🎉');
        await fetchOrders();
        setTab('selesai');
      } else {
        const data = await res.json();
        toast.error('Gagal menyelesaikan pesanan', { description: data.error });
      }
    } catch (err: any) {
      toast.error('Gagal memproses foto bukti', { description: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  // ================= CAMERA WEBRTC FUNCTIONS =================

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setCameraError('Izin kamera belum aktif. Anda bisa menggunakan tombol pilih file galeri.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setActiveOrderIdForCamera(null);
    setCameraError(null);
  };

  const openCameraModal = (orderId: number) => {
    setActiveOrderIdForCamera(orderId);
    setCameraActive(true);
    startCamera(facingMode);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !activeOrderIdForCamera) return;

    const targetOrderId = activeOrderIdForCamera;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `proof-order-${targetOrderId}-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        stopCamera();
        uploadAndMarkDelivered(targetOrderId, file);
      },
      'image/jpeg',
      0.85
    );
  };

  const handleFileInput = (orderId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar.');
      return;
    }

    uploadAndMarkDelivered(orderId, file);
    if (fileInputRefs.current[orderId]) {
      fileInputRefs.current[orderId]!.value = '';
    }
  };

  // ================= UTILITIES =================

  const getWhatsAppUrl = (phone: string, customerName: string, orderId: number) => {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }
    const text = encodeURIComponent(
      `Halo kak ${customerName}, saya kurir dari Toko Naning mau mengantarkan pesanan #${orderId}.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const handleCopyAddress = (orderId: number, address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopiedAddressId(orderId);
    toast.success('Alamat tersalin');
    setTimeout(() => setCopiedAddressId(null), 2000);
  };

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeOrders = orders.filter((o) => ['paid', 'processing', 'shipped'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const displayOrders = tab === 'aktif' ? activeOrders : completedOrders;

  const getStatusPill = (status: string) => {
    if (status === 'shipped')
      return (
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
          Sedang Dikirim
        </span>
      );
    if (status === 'delivered')
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          Selesai
        </span>
      );
    return (
      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
        Siap Kirim
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Daftar Pengiriman</h1>
          <p className="text-sm text-gray-600">Ambil foto bukti untuk menyelesaikan pengantaran pesanan.</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchOrders();
          }}
          disabled={loading}
          className="bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('aktif')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'aktif'
              ? 'bg-[#ffd700] text-gray-900 shadow-sm font-bold'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Siap Diantar ({activeOrders.length})
        </button>
        <button
          onClick={() => setTab('selesai')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'selesai'
              ? 'bg-[#ffd700] text-gray-900 shadow-sm font-bold'
              : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Selesai ({completedOrders.length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span>Memuat data pengiriman...</span>
          </CardContent>
        </Card>
      ) : displayOrders.length === 0 ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            {tab === 'aktif'
              ? 'Tidak ada pesanan yang perlu diantar saat ini.'
              : 'Belum ada riwayat pesanan selesai.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayOrders.map((order) => {
            const isUpdatingThisOrder = updatingId === order.id;

            return (
              <Card key={order.id} className="border-gray-200 shadow-sm bg-white overflow-hidden">
                {/* Header Card */}
                <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold text-gray-900">
                          Pesanan #{order.id}
                        </CardTitle>
                        {getStatusPill(order.status)}
                      </div>

                      {/* Recipient & WhatsApp Button */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <User className="h-4 w-4 text-gray-500" />
                          {order.customerName}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {order.customerPhone}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-md flex items-center gap-1 shadow-xs"
                          onClick={() =>
                            window.open(
                              getWhatsAppUrl(order.customerPhone, order.customerName, order.id),
                              '_blank'
                            )
                          }
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Chat WhatsApp
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatRupiah(order.totalHarga)}
                      </p>
                      {order.shippingFee !== null && (
                        <p className="text-xs text-gray-500">
                          Ongkir: {formatRupiah(order.shippingFee)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Body Card */}
                <CardContent className="pt-4 space-y-4 text-sm text-gray-700">
                  {/* Address & Logistics Info */}
                  <div className="grid gap-2 sm:grid-cols-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                      <div>
                        <span className="font-medium text-gray-900">{order.shippingAddress || '-'}</span>
                        {order.shippingAddress && (
                          <button
                            type="button"
                            className="ml-2 inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                            onClick={() => handleCopyAddress(order.id, order.shippingAddress!)}
                          >
                            {copiedAddressId === order.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedAddressId === order.id ? 'Tersalin' : 'Salin'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      {order.shippingZone && <p>Zona: Zona {order.shippingZone}</p>}
                      {order.shippingDistance && <p>Jarak: {order.shippingDistance} km</p>}
                    </div>
                  </div>

                  {/* Notes if any */}
                  {order.shippingNotes && (
                    <div className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-900 border border-yellow-200 flex items-start gap-1.5">
                      <FileText className="h-4 w-4 text-yellow-700 shrink-0 mt-0.5" />
                      <span>
                        <strong>Catatan:</strong> {order.shippingNotes}
                      </span>
                    </div>
                  )}

                  {/* Product items */}
                  <div className="border border-gray-100 rounded-lg p-3 space-y-1.5 text-xs">
                    <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-gray-500" />
                      Rincian Barang ({order.items.length} produk):
                    </p>
                    <div className="space-y-1 pl-5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-gray-600">
                          <span>
                            {item.product.name} ({item.quantity}x {item.priceType})
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Completed Proof Photo */}
                  {order.proofOfDelivery && (
                    <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                          <ImageIcon className="h-4 w-4 text-green-600" />
                          Foto Bukti Pengiriman Tersimpan
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => setZoomImageUrl(order.proofOfDelivery)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Perbesar Foto
                        </Button>
                      </div>
                      <div
                        className="relative h-36 w-full max-w-xs overflow-hidden rounded-md border border-gray-200 cursor-pointer group bg-black"
                        onClick={() => setZoomImageUrl(order.proofOfDelivery)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.proofOfDelivery}
                          alt="Bukti Pengiriman"
                          className="h-full w-full object-cover group-hover:opacity-90 transition"
                        />
                      </div>
                      {order.deliveredAt && (
                        <p className="text-[11px] text-gray-500">
                          Terkirim pada: {formatDate(order.deliveredAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Section (Active Deliveries) */}
                  {order.status !== 'delivered' && (
                    <div className="pt-2 border-t border-gray-100">
                      {isUpdatingThisOrder ? (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs text-gray-700 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-800" />
                          <span>Mengunggah foto & menyelesaikan pesanan...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            className="bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs h-9 flex items-center gap-2"
                            onClick={() => openCameraModal(order.id)}
                          >
                            <Camera className="h-4 w-4 text-[#ffd700]" />
                            Ambil Foto Bukti (Kamera)
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs h-9 flex items-center gap-2"
                            onClick={() => fileInputRefs.current[order.id]?.click()}
                          >
                            <Upload className="h-4 w-4 text-gray-500" />
                            Pilih dari Galeri
                          </Button>

                          {/* Hidden file input */}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[order.id] = el;
                            }}
                            onChange={(e) => handleFileInput(order.id, e)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= MODAL KAMERA (WEBRTC) ================= */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-black border border-gray-800 shadow-2xl flex flex-col">
            {/* Header Modal Kamera */}
            <div className="flex items-center justify-between p-3 bg-gray-900 text-white">
              <span className="font-semibold text-xs flex items-center gap-1.5 text-[#ffd700]">
                <Camera className="h-4 w-4" /> Foto Bukti Pengiriman
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white p-1.5 h-7 w-7"
                  onClick={toggleCameraFacing}
                  title="Ganti Kamera"
                >
                  <SwitchCamera className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white p-1.5 h-7 w-7"
                  onClick={stopCamera}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Video Viewfinder */}
            <div className="relative bg-black h-72 flex items-center justify-center overflow-hidden">
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#ffd700] mb-2" />
                  <span className="text-xs">Membuka kamera...</span>
                </div>
              )}

              {cameraError ? (
                <div className="p-4 text-center text-red-400 text-xs space-y-2">
                  <p>{cameraError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 text-white hover:bg-gray-800 text-xs"
                    onClick={() => {
                      if (activeOrderIdForCamera) {
                        fileInputRefs.current[activeOrderIdForCamera]?.click();
                        stopCamera();
                      }
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Pilih File Galeri
                  </Button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Shutter Bar */}
            <div className="p-3 bg-gray-950 text-white flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white text-xs"
                onClick={stopCamera}
              >
                Batal
              </Button>

              <button
                type="button"
                disabled={cameraLoading || !!cameraError}
                onClick={takeSnapshot}
                className="h-12 w-12 rounded-full border-2 border-white bg-red-600 hover:bg-red-500 active:scale-95 transition shadow-lg flex items-center justify-center disabled:opacity-40"
                title="Ambil Foto"
              >
                <div className="h-8 w-8 rounded-full bg-white/20" />
              </button>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white text-xs"
                onClick={() => {
                  if (activeOrderIdForCamera) {
                    fileInputRefs.current[activeOrderIdForCamera]?.click();
                    stopCamera();
                  }
                }}
              >
                Galeri
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ZOOM FOTO ================= */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-w-lg w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 bg-gray-900 text-white">
              <span className="text-xs font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-[#ffd700]" />
                Foto Bukti Pengiriman
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-300 hover:text-white"
                onClick={() => setZoomImageUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomImageUrl}
                alt="Bukti Pengiriman Full"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
