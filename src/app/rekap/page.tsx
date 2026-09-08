'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PresensiData {
  id: string;
  nama: string;
  tanggal: string;
  waktu_masuk: string;
  jam_keluar?: string;
  foto_bukti: string;
  lokasi: string;
  status: string;
}

export default function RekapAbsensiPage() {
  const [dataAbsen, setDataAbsen] = useState<PresensiData[]>([]);
  const [loading, setLoading] = useState(true);

  // State Filter & Search
  const [searchNama, setSearchNama] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State Modal Edit
  const [editItem, setEditItem] = useState<PresensiData | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editMasuk, setEditMasuk] = useState('');
  const [editKeluar, setEditKeluar] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const fetchAbsen = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('presensi')
        .select('*')
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setDataAbsen(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil data rekap:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsen();
  }, []);

  // --- Logic Filter Data ---
  const filteredData = dataAbsen.filter((item) => {
    const matchNama = (item.nama || '').toLowerCase().includes(searchNama.toLowerCase());
    const matchStart = startDate ? item.tanggal >= startDate : true;
    const matchEnd = endDate ? item.tanggal <= endDate : true;
    return matchNama && matchStart && matchEnd;
  });

  const handleResetFilter = () => {
    setSearchNama('');
    setStartDate('');
    setEndDate('');
  };

  // --- Fungsi Hapus Data ---
  const handleDelete = async (id: string, nama: string) => {
    const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus data presensi "${nama || 'Tanpa Nama'}"?`);
    if (!konfirmasi) return;

    try {
      const { error } = await supabase.from('presensi').delete().eq('id', id);
      if (error) throw error;
      alert('Data berhasil dihapus!');
      fetchAbsen();
    } catch (err: any) {
      alert('Gagal menghapus data: ' + err.message);
    }
  };

  // --- Buka Modal Edit ---
  const handleOpenEdit = (item: PresensiData) => {
    setEditItem(item);
    setEditNama(item.nama || '');
    setEditMasuk(item.waktu_masuk || '');
    setEditKeluar(item.jam_keluar || '');
    setEditStatus(item.status || 'hadir');
  };

  // --- Simpan Perubahan Edit ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      const { error } = await supabase
        .from('presensi')
        .update({
          nama: editNama,
          waktu_masuk: editMasuk,
          jam_keluar: editKeluar || null,
          status: editStatus,
        })
        .eq('id', editItem.id);

      if (error) throw error;

      alert('Data berhasil diperbarui!');
      setEditItem(null);
      fetchAbsen();
    } catch (err: any) {
      alert('Gagal memperbarui data: ' + err.message);
    }
  };

  // --- Export Excel (Mengikuti Data yang Terfilter) ---
  const exportToExcel = () => {
    const dataFormatted = filteredData.map((item, index) => ({
      No: index + 1,
      Tanggal: item.tanggal,
      Nama: item.nama || '-',
      'Waktu Masuk': item.waktu_masuk,
      'Waktu Keluar': item.jam_keluar || '-',
      'Lokasi GPS': item.lokasi,
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
    XLSX.writeFile(workbook, `Rekap_Absensi_PKL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Export PDF (Mengikuti Data yang Terfilter) ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Laporan Rekapitulasi Presensi PKL', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    const tableColumn = ['No', 'Tanggal', 'Nama', 'Masuk', 'Keluar', 'Lokasi GPS', 'Status'];
    const tableRows = filteredData.map((item, index) => [
      index + 1,
      item.tanggal,
      item.nama || '-',
      item.waktu_masuk,
      item.jam_keluar || '-',
      item.lokasi,
      item.status,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`Rekap_Absensi_PKL_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Dashboard Rekap Absensi PKL
            </h1>
            <p className="text-sm text-slate-500">
              Daftar presensi harian siswa PKL beserta lokasi GPS dan bukti foto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3.5 py-2 rounded-lg transition font-medium"
            >
              📥 Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="bg-rose-600 hover:bg-rose-700 text-white text-sm px-3.5 py-2 rounded-lg transition font-medium"
            >
              📄 Export PDF
            </button>
            <button
              onClick={fetchAbsen}
              className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-3.5 py-2 rounded-lg transition"
            >
              Refresh
            </button>
            <a
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3.5 py-2 rounded-lg transition"
            >
              Form Absensi
            </a>
          </div>
        </div>

        {/* Form Filter & Search */}
        <div className="bg-white p-4 rounded-xl shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Nama Siswa</label>
            <input
              type="text"
              placeholder="Ketik nama..."
              value={searchNama}
              onChange={(e) => setSearchNama(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              onClick={handleResetFilter}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition border"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="p-4">NO</th>
                  <th className="p-4">TANGGAL</th>
                  <th className="p-4">NAMA</th>
                  <th className="p-4">WAKTU MASUK</th>
                  <th className="p-4">WAKTU KELUAR</th>
                  <th className="p-4">FOTO BUKTI</th>
                  <th className="p-4">LOKASI GPS</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Memuat data rekap presensi...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Tidak ada data presensi yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="p-4 font-medium whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        {item.nama || '-'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {item.waktu_masuk}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-600">
                        {item.jam_keluar || '-'}
                      </td>
                      <td className="p-4">
                        {item.foto_bukti ? (
                          <img
                            src={item.foto_bukti}
                            alt="Bukti Absen"
                            className="w-12 h-12 object-cover rounded-lg border shadow-sm"
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Tidak ada foto
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-blue-600">
                        📍 {item.lokasi}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-2.5 py-1.5 rounded font-medium transition"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nama)}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs px-2.5 py-1.5 rounded font-medium transition"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pop-up Modal Edit Data */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Edit Data Presensi</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Siswa</label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Waktu Masuk</label>
                <input
                  type="text"
                  required
                  value={editMasuk}
                  onChange={(e) => setEditMasuk(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Waktu Keluar</label>
                <input
                  type="text"
                  value={editKeluar}
                  onChange={(e) => setEditKeluar(e.target.value)}
                  placeholder="Misal: 17:00:00"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                >
                  <option value="hadir">hadir</option>
                  <option value="izin">izin</option>
                  <option value="sakit">sakit</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}