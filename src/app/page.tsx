'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function AbsenPage() {
  const [jenisAbsen, setJenisAbsen] = useState<'masuk' | 'keluar'>('masuk');
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState<{ lat: number; lng: number } | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Akses Kamera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Gagal mengakses kamera:', err);
      }
    }
    startCamera();
  }, []);

  // Akses Lokasi GPS
  const ambilLokasi = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLokasi({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setPesan('Gagal mengambil lokasi GPS: ' + error.message);
        }
      );
    } else {
      setPesan('Browser tidak mendukung Geolocation.');
    }
  };

  useEffect(() => {
    ambilLokasi();
  }, []);

  // Tangkap Foto
  const ambilFoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setFoto(dataUrl);
      }
    }
  };

  // Kirim Form Absensi (Masuk / Keluar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama) return setPesan('Nama wajib diisi.');
    if (!lokasi) return setPesan('Lokasi GPS belum terdeteksi.');
    
    setLoading(true);
    setPesan('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().split(' ')[0];

      if (jenisAbsen === 'masuk') {
        if (!foto) {
          setLoading(false);
          return setPesan('Foto bukti kehadiran wajib diambil untuk Absen Masuk!');
        }

        // Convert Base64 Foto ke File
        const res = await fetch(foto);
        const blob = await res.blob();
        const fileName = `absen_${Date.now()}.jpg`;

        // Upload ke Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('absensi')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('absensi')
          .getPublicUrl(fileName);

        // Insert Absen Masuk
        const { error: insertError } = await supabase.from('presensi').insert([
          {
    nama,
    tanggal: today,
    waktu_masuk: currentTime,
    lokasi: `${lokasi.lat}, ${lokasi.lng}`,
    foto_bukti: publicUrlData.publicUrl,
    status: 'hadir',
  },
]);

        if (insertError) throw insertError;
        setPesan('Absen Masuk Berhasil!');
      } else {
        // Absen Keluar: Cari data absen masuk hari ini berdasarkan nama
        const { data: existing, error: searchError } = await supabase
          .from('presensi')
          .select('id')
          .eq('nama', nama)
          .eq('tanggal', today)
          .single();

        if (searchError || !existing) {
          throw new Error('Data Absen Masuk hari ini tidak ditemukan untuk nama ini.');
        }

        // Update Jam Keluar & Lokasi Keluar
        const { error: updateError } = await supabase
          .from('presensi')
          .update({
            jam_keluar: currentTime,
            lokasi_keluar: `${lokasi.lat}, ${lokasi.lng}`,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        setPesan('Absen Keluar Berhasil! Selamat Istirahat.');
      }

      setFoto(null);
    } catch (err: any) {
      setPesan('Gagal memproses absen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">Form Absensi PKL</h1>
          <div className="flex gap-2">
            <a href="/rekap" className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded font-medium">Rekap</a>
            <a href="/logbook" className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded font-medium">Logbook</a>
          </div>
        </div>

        {pesan && (
          <div className="p-3 text-sm rounded bg-blue-50 text-blue-700 font-medium">
            {pesan}
          </div>
        )}

        {/* Tab Pilihan Jenis Absen */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg text-sm font-semibold">
          <button
            type="button"
            onClick={() => setJenisAbsen('masuk')}
            className={`py-2 rounded-md transition ${
              jenisAbsen === 'masuk' ? 'bg-white shadow text-blue-600' : 'text-slate-500'
            }`}
          >
            Absen Masuk
          </button>
          <button
            type="button"
            onClick={() => setJenisAbsen('keluar')}
            className={`py-2 rounded-md transition ${
              jenisAbsen === 'keluar' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'
            }`}
          >
            Absen Keluar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Masukkan nama siswa"
              className="w-full px-3 py-2 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi GPS</label>
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
              {lokasi ? `Lat: ${lokasi.lat}, Lng: ${lokasi.lng}` : 'Mencari lokasi...'}
            </div>
          </div>

          {/* Kamera Hanya Wajib untuk Absen Masuk */}
          {jenisAbsen === 'masuk' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kamera Bukti Masuk</label>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              </div>
              <canvas ref={canvasRef} width={320} height={240} className="hidden" />

              <button
                type="button"
                onClick={ambilFoto}
                className="w-full mt-2 bg-slate-800 text-white text-xs py-2 rounded-lg hover:bg-slate-700 transition"
              >
                Ambil Foto
              </button>

              {foto && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-emerald-600 font-medium mb-1">Foto Berhasil Diambil!</p>
                  <img src={foto} alt="Preview" className="w-24 h-24 object-cover mx-auto rounded border" />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white font-semibold py-2.5 rounded-lg transition ${
              jenisAbsen === 'masuk'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:bg-slate-400`}
          >
            {loading ? 'Memproses...' : jenisAbsen === 'masuk' ? 'Kirim Absen Masuk' : 'Kirim Absen Keluar'}
          </button>
        </form>
      </div>
    </div>
  );
}