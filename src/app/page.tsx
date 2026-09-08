'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';

// Data Master 20 Siswa PKL (NIS, Nama, dan Asal Sekolah)
const DATA_MASTER_SISWA = [
  { nis: '1001', nama: 'Ahmad Rizky', sekolah: 'SMKN 1 Rantau Prapat' },
  { nis: '1002', nama: 'Budi Santoso', sekolah: 'SMKN 1 Rantau Prapat' },
  { nis: '1003', nama: 'Citra Dewi', sekolah: 'SMKN 1 Rantau Prapat' },
  { nis: '1004', nama: 'Dedi Pratama', sekolah: 'SMKN 1 Rantau Prapat' },
  { nis: '1005', nama: 'Eka Saputra', sekolah: 'SMKN 1 Rantau Prapat' },
  { nis: '1006', nama: 'Fajar Hidayat', sekolah: 'SMKN 2 Rantau Utara' },
  { nis: '1007', nama: 'Gita Gutawa', sekolah: 'SMKN 2 Rantau Utara' },
  { nis: '1008', nama: 'Hendra Wijaya', sekolah: 'SMKN 2 Rantau Utara' },
  { nis: '1009', nama: 'Indah Lestari', sekolah: 'SMKN 2 Rantau Utara' },
  { nis: '1010', nama: 'Joko Susilo', sekolah: 'SMKN 2 Rantau Utara' },
  { nis: '1011', nama: 'Kiki Amalia', sekolah: 'SMA Negeri 1 Labuhanbatu' },
  { nis: '1012', nama: 'Lani Triani', sekolah: 'SMA Negeri 1 Labuhanbatu' },
  { nis: '1013', nama: 'Muhammad Arifin', sekolah: 'SMA Negeri 1 Labuhanbatu' },
  { nis: '1014', nama: 'Nadia Putri', sekolah: 'SMA Negeri 1 Labuhanbatu' },
  { nis: '1015', nama: 'Oky Kurniawan', sekolah: 'SMA Negeri 1 Labuhanbatu' },
  { nis: '1016', nama: 'Putri Ramadhani', sekolah: 'SMK Swasta Pemda' },
  { nis: '1017', nama: 'Rian Hidayat', sekolah: 'SMK Swasta Pemda' },
  { nis: '1018', nama: 'Siti Sarah', sekolah: 'SMK Swasta Pemda' },
  { nis: '1019', nama: 'Taufik Hidayat', sekolah: 'SMK Swasta Pemda' },
  { nis: '1020', nama: 'Yulia Ningsih', sekolah: 'SMK Swasta Pemda' },
];

export default function FormAbsensiPage() {
  const [tab, setTab] = useState<'masuk' | 'keluar'>('masuk');
  const [selectedNis, setSelectedNis] = useState('');
  const [lokasi, setLokasi] = useState('Mencari lokasi...');
  const [foto, setFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Ambil data siswa berdasarkan NIS yang dipilih
  const siswaTerpilih = DATA_MASTER_SISWA.find((s) => s.nis === selectedNis);

  // Ambil Lokasi GPS
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLokasi(`${pos.coords.latitude}, ${pos.coords.longitude}`);
        },
        (err) => setLokasi('Gagal mengambil lokasi GPS: ' + err.message)
      );
    } else {
      setLokasi('Browser tidak mendukung Geolocation.');
    }
  }, []);

  // Akses Kamera untuk Absen Masuk
  useEffect(() => {
    if (tab === 'masuk') {
      navigator.mediaDevices
        ?.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => console.error('Kamera tidak dapat diakses:', err));
    }
  }, [tab]);

  // Ambil Foto dari Kamera
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
    if (!siswaTerpilih) return setPesan('Silakan pilih NIS siswa!');
    if (!foto) return setPesan('Silakan ambil foto bukti terlebih dahulu!');

    setLoading(true);
    setPesan('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('id-ID');

      // Nama yang disimpan mencakup [NIS] Nama Lengkap (Sekolah)
      const namaLengkapFormatted = `[${siswaTerpilih.nis}] ${siswaTerpilih.nama} (${siswaTerpilih.sekolah})`;

      const { error } = await supabase.from('presensi').insert([
        {
          nama: namaLengkapFormatted,
          tanggal: today,
          waktu_masuk: nowTime,
          lokasi,
          foto_bukti: foto,
          status: 'hadir',
        },
      ]);

      if (error) throw error;

      setPesan(`Absen masuk berhasil untuk ${siswaTerpilih.nama} (NIS: ${siswaTerpilih.nis})!`);
      setSelectedNis('');
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
    if (!siswaTerpilih) return setPesan('Silakan pilih NIS siswa!');

    setLoading(true);
    setPesan('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('id-ID');

      // Format nama pencarian
      const searchPattern = `%[${siswaTerpilih.nis}]%`;

      const { data, error: findError } = await supabase
        .from('presensi')
        .select('*')
        .ilike('nama', searchPattern)
        .eq('tanggal', today)
        .order('id', { ascending: false })
        .limit(1);

      if (findError) throw findError;

      if (!data || data.length === 0) {
        setPesan(`Siswa dengan NIS "${siswaTerpilih.nis}" (${siswaTerpilih.nama}) belum absen masuk hari ini.`);
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('presensi')
        .update({ jam_keluar: nowTime })
        .eq('id', data[0].id);

      if (updateError) throw updateError;

      setPesan(`Absen keluar berhasil untuk ${siswaTerpilih.nama}!`);
      setSelectedNis('');
    } catch (err: any) {
      setPesan('Gagal absen keluar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h1 className="text-xl font-bold text-slate-800">Form Absensi PKL</h1>
          <div className="flex gap-2">
            <a
              href="/rekap"
              className="text-xs bg-slate-800 text-white px-2.5 py-1.5 rounded hover:bg-slate-700 transition"
            >
              Rekap
            </a>
            <a
              href="/logbook"
              className="text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded hover:bg-blue-700 transition"
            >
              Logbook
            </a>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setTab('masuk');
              setPesan('');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
              tab === 'masuk'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Absen Masuk
          </button>
          <button
            onClick={() => {
              setTab('keluar');
              setPesan('');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${
              tab === 'keluar'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Absen Keluar
          </button>
        </div>

        {pesan && (
          <div className="p-3 text-sm rounded bg-blue-50 text-blue-700 font-medium text-center">
            {pesan}
          </div>
        )}

        {/* Form Absen Masuk */}
        {tab === 'masuk' ? (
          <form onSubmit={handleAbsenMasuk} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pilih NIS (Nomor Induk Siswa)
              </label>
              <select
                required
                value={selectedNis}
                onChange={(e) => setSelectedNis(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
              >
                <option value="">-- Pilih NIS Siswa --</option>
                {DATA_MASTER_SISWA.map((siswa) => (
                  <option key={siswa.nis} value={siswa.nis}>
                    NIS: {siswa.nis} — {siswa.nama} ({siswa.sekolah})
                  </option>
                ))}
              </select>
            </div>

            {siswaTerpilih && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                <div><strong>Nama:</strong> {siswaTerpilih.nama}</div>
                <div><strong>Sekolah:</strong> {siswaTerpilih.sekolah}</div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Lokasi GPS
              </label>
              <input
                type="text"
                readOnly
                value={lokasi}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kamera Bukti Masuk
              </label>
              <div className="bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[180px]">
                {foto ? (
                  <img src={foto} alt="Bukti Foto" className="w-full h-auto" />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full mt-2 bg-slate-800 text-white text-xs py-2 rounded-lg font-medium hover:bg-slate-700 transition"
              >
                {foto ? '📷 Ambil Ulang Foto' : '📷 Ambil Foto'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:bg-slate-400 text-sm"
            >
              {loading ? 'Proses...' : 'Kirim Absen Masuk'}
            </button>
          </form>
        ) : (
          /* Form Absen Keluar */
          <form onSubmit={handleAbsenKeluar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pilih NIS (Nomor Induk Siswa)
              </label>
              <select
                required
                value={selectedNis}
                onChange={(e) => setSelectedNis(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
              >
                <option value="">-- Pilih NIS Siswa --</option>
                {DATA_MASTER_SISWA.map((siswa) => (
                  <option key={siswa.nis} value={siswa.nis}>
                    NIS: {siswa.nis} — {siswa.nama} ({siswa.sekolah})
                  </option>
                ))}
              </select>
            </div>

            {siswaTerpilih && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                <div><strong>Nama:</strong> {siswaTerpilih.nama}</div>
                <div><strong>Sekolah:</strong> {siswaTerpilih.sekolah}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition disabled:bg-slate-400 text-sm"
            >
              {loading ? 'Proses...' : 'Kirim Absen Keluar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}