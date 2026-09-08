'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';

export default function StudentAttendancePage() {
  const [tab, setTab] = useState<'masuk' | 'keluar'>('masuk');
  const [nis, setNis] = useState('');
  const [studentInfo, setStudentInfo] = useState<{ nama: string; dudi: string } | null>(null);
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ambil Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude}, ${pos.coords.longitude}`),
        () => setLocation('Lokasi tidak diizinkan')
      );
    }
  }, []);

  // Nyalakan Kamera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error('Kamera gagal diakses:', err);
      }
    }
    startCamera();
  }, []);

  // Cari Data Siswa Berdasarkan NIS
  const handleNisChange = async (value: string) => {
    setNis(value);
    if (value.length >= 3) {
      const { data } = await supabase
        .from('master_siswa')
        .select('nama, dudi')
        .eq('nis', value)
        .single();
      if (data) setStudentInfo(data);
      else setStudentInfo(null);
    } else {
      setStudentInfo(null);
    }
  };

  // Tangkap Foto dari WebCam
  const capturePhoto = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  // Submit Absen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis) return alert('Silakan masukkan NIS terlebih dahulu!');
    
    setLoading(true);
    const capturedPhoto = capturePhoto();
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      if (tab === 'masuk') {
        const { error } = await supabase.from('presensi').insert({
          nis,
          nama: studentInfo?.nama || 'Siswa PKL',
          dudi: studentInfo?.dudi || '-',
          tanggal: today,
          waktu_masuk: currentTime,
          lokasi: location,
          foto_bukti: capturedPhoto,
          status: 'hadir',
        });
        if (error) throw error;
        alert('Absen Masuk Berhasil!');
      } else {
        const { error } = await supabase
          .from('presensi')
          .update({ jam_keluar: currentTime })
          .eq('nis', nis)
          .eq('tanggal', today);
        if (error) throw error;
        alert('Absen Keluar Berhasil!');
      }
      setNis('');
      setStudentInfo(null);
    } catch (err: any) {
      alert('Gagal absen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
        
        {/* Header Judul Rapi Bertingkat */}
        <div className="border-b pb-4">
          <div className="flex justify-end mb-2">
            <a
              href="/login"
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1"
            >
              🔒 <span>Login Pengelola / DUDI</span>
            </a>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Absensi Siswa PKL
            </h1>
            <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              Fakultas Sains dan Teknologi
            </h2>
            <h3 className="text-xs font-semibold text-slate-600">
              Universitas Labuhanbatu
            </h3>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('masuk')}
            className={`py-2 text-xs font-bold rounded-md transition ${
              tab === 'masuk' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            Absen Masuk
          </button>
          <button
            onClick={() => setTab('keluar')}
            className={`py-2 text-xs font-bold rounded-md transition ${
              tab === 'keluar' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            Absen Keluar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ketik NIS Siswa</label>
            <input
              type="text"
              required
              value={nis}
              onChange={(e) => handleNisChange(e.target.value)}
              placeholder="Masukkan Nomor Induk Siswa..."
              className="w-full px-3 py-2 border rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-blue-600"
            />
            {studentInfo && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800">
                <p className="font-bold">{studentInfo.nama}</p>
                <p className="text-[10px] text-slate-600">Mitra: {studentInfo.dudi}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Lokasi GPS</label>
            <input
              type="text"
              readOnly
              value={location || 'Mengambil lokasi...'}
              className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-600 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Kamera Bukti {tab === 'masuk' ? 'Masuk' : 'Keluar'}
            </label>
            <div className="relative rounded-lg overflow-hidden border bg-black aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition"
          >
            {loading ? 'Proses Absen...' : `Kirim ${tab === 'masuk' ? 'Absen Masuk' : 'Absen Keluar'}`}
          </button>
        </form>

      </div>
    </div>
  );
}