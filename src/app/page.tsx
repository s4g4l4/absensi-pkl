'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';

export default function FormAbsensiPage() {
  const [tab, setTab] = useState<'masuk' | 'keluar'>('masuk');
  const [inputNis, setInputNis] = useState('');
  const [siswaData, setSiswaData] = useState<any>(null);
  const [lokasi, setLokasi] = useState('Mencari lokasi...');
  const [foto, setFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Cari data siswa otomatis saat NIS diketik
  const handleCariNis = async (nis: string) => {
    setInputNis(nis);
    if (nis.length >= 3) {
      const { data } = await supabase
        .from('master_siswa')
        .select('*')
        .eq('nis', nis.trim())
        .single();
      
      if (data) {
        setSiswaData(data);
        setPesan('');
      } else {
        setSiswaData(null);
      }
    } else {
      setSiswaData(null);
    }
  };

  // Ambil Lokasi GPS
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLokasi(`${pos.coords.latitude}, ${pos.coords.longitude}`),
        (err) => setLokasi('Gagal mengambil GPS: ' + err.message)
      );
    }
  }, []);

  // Akses Kamera
  useEffect(() => {
    if (tab === 'masuk') {
      navigator.mediaDevices
        ?.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error('Kamera error:', err));
    }
  }, [tab]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 320;
    canvas.height = videoRef.current.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setFoto(canvas.toDataURL('image/jpeg'));
    }
  };

  // Submit Absen Masuk
  const handleAbsenMasuk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaData) return setPesan('NIS tidak terdaftar! Periksa kembali NIS kamu.');
    if (!foto) return setPesan('Silakan ambil foto bukti terlebih dahulu!');

    setLoading(true);
    setPesan('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('id-ID');

      const { error } = await supabase.from('presensi').insert([
        {
          nis: siswaData.nis,
          nama: siswaData.nama,
          dudi: siswaData.sekolah || siswaData.dudi,
          tanggal: today,
          waktu_masuk: nowTime,
          lokasi,
          foto_bukti: foto,
          status: 'hadir',
        },
      ]);

      if (error) throw error;

      setPesan(`Absen masuk berhasil untuk ${siswaData.nama}!`);
      setInputNis('');
      setSiswaData(null);
      setFoto(null);
    } catch (err: any) {
      setPesan('Gagal absen masuk: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Absen Keluar
  const handleAbsenKeluar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaData) return setPesan('NIS tidak terdaftar!');

    setLoading(true);
    setPesan('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('id-ID');

      const { data, error: findError } = await supabase
        .from('presensi')
        .select('*')
        .eq('nis', siswaData.nis)
        .eq('tanggal', today)
        .order('id', { ascending: false })
        .limit(1);

      if (findError) throw findError;

      if (!data || data.length === 0) {
        setPesan(`NIS "${siswaData.nis}" (${siswaData.nama}) belum melakukan absen masuk hari ini.`);
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('presensi')
        .update({ jam_keluar: nowTime })
        .eq('id', data[0].id);

      if (updateError) throw updateError;

      setPesan(`Absen keluar berhasil untuk ${siswaData.nama}!`);
      setInputNis('');
      setSiswaData(null);
    } catch (err: any) {
      setPesan('Gagal absen keluar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden p-6 space-y-6">
        {/* KODE BARU */}
{/* Header Judul Resmi Bertingkat */}
<div className="border-b pb-4 mb-4">
  {/* Tombol Login Pengelola (Pojok Kanan Atas) */}
  <div className="flex justify-end mb-2">
    <a
      href="/login"
      className="text-[11px] bg-slate-800 hover:bg-slate-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1"
    >
      🔒 <span>Login Pengelola / DUDI</span>
    </a>
  </div>

  {/* Judul Bertingkat Rapi & Simetris */}
  <div className="text-center space-y-0.5">
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
  <a href="/login" className="self-start md:self-auto text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 font-medium transition">
    🔒 Login Pengelola / DUDI
  </a>
</div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => { setTab('masuk'); setPesan(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === 'masuk' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            Absen Masuk
          </button>
          <button
            onClick={() => { setTab('keluar'); setPesan(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${tab === 'keluar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
          >
            Absen Keluar
          </button>
        </div>

        {pesan && (
          <div className="p-3 text-sm rounded bg-blue-50 text-blue-700 font-medium text-center">
            {pesan}
          </div>
        )}

        <form onSubmit={tab === 'masuk' ? handleAbsenMasuk : handleAbsenKeluar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ketik NIS Siswa</label>
            <input
              type="text"
              required
              placeholder="Masukkan Nomor Induk Siswa..."
              value={inputNis}
              onChange={(e) => handleCariNis(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {siswaData ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 space-y-1">
              <div><strong>Siswa Ditemukan:</strong> {siswaData.nama}</div>
              <div><strong>Asal DUDI/Sekolah:</strong> {siswaData.sekolah || siswaData.dudi}</div>
            </div>
          ) : inputNis.length >= 3 ? (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-600 text-center">
              Siswa dengan NIS "{inputNis}" tidak ditemukan dalam sistem.
            </div>
          ) : null}

          {tab === 'masuk' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi GPS</label>
                <input type="text" readOnly value={lokasi} className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-600 font-mono" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kamera Bukti Masuk</label>
                <div className="bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
                  {foto ? <img src={foto} alt="Bukti" className="w-full h-auto" /> : <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />}
                </div>
                <button type="button" onClick={capturePhoto} className="w-full mt-2 bg-slate-800 text-white text-xs py-2 rounded-lg hover:bg-slate-700">
                  {foto ? '📷 Ambil Ulang Foto' : '📷 Ambil Foto'}
                </button>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || !siswaData}
            className={`w-full text-white font-semibold py-2.5 rounded-lg text-sm transition ${tab === 'masuk' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:bg-slate-300`}
          >
            {loading ? 'Proses...' : tab === 'masuk' ? 'Kirim Absen Masuk' : 'Kirim Absen Keluar'}
          </button>
        </form>
      </div>
    </div>
  );
}