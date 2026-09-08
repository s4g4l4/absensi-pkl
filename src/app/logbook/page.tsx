'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LogbookData {
  id: string;
  tanggal: string;
  kegiatan: string;
  kendala?: string;
  created_at?: string;
}

export default function LogbookPage() {
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [kegiatan, setKegiatan] = useState('');
  const [kendala, setKendala] = useState('');
  const [listLogbook, setListLogbook] = useState<LogbookData[]>([]);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState('');

  // State Filter & Search Logbook
  const [searchKeyword, setSearchKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State Modal Edit Logbook
  const [editItem, setEditItem] = useState<LogbookData | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editKegiatan, setEditKegiatan] = useState('');
  const [editKendala, setEditKendala] = useState('');

  // Ambil Data Logbook dari Supabase
  const fetchLogbook = async () => {
    try {
      const { data, error } = await supabase
        .from('logbook')
        .select('*')
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setListLogbook(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil data logbook:', err.message);
    }
  };

  useEffect(() => {
    fetchLogbook();
  }, []);

  // --- Logic Filter Logbook ---
  const filteredLogbook = listLogbook.filter((item) => {
    const keyword = searchKeyword.toLowerCase();
    const matchKeyword =
      item.kegiatan.toLowerCase().includes(keyword) ||
      (item.kendala || '').toLowerCase().includes(keyword);
    const matchStart = startDate ? item.tanggal >= startDate : true;
    const matchEnd = endDate ? item.tanggal <= endDate : true;
    return matchKeyword && matchStart && matchEnd;
  });

  const handleResetFilter = () => {
    setSearchKeyword('');
    setStartDate('');
    setEndDate('');
  };

  // Simpan Jurnal Kegiatan Baru
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kegiatan) return setPesan('Deskripsi kegiatan wajib diisi.');

    setLoading(true);
    setPesan('');

    try {
      const { error } = await supabase.from('logbook').insert([
        {
          tanggal,
          kegiatan,
          kendala: kendala || '-',
        },
      ]);

      if (error) throw error;

      setPesan('Jurnal kegiatan berhasil disimpan!');
      setKegiatan('');
      setKendala('');
      fetchLogbook();
    } catch (err: any) {
      setPesan('Gagal menyimpan jurnal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Fungsi Hapus Logbook ---
  const handleDelete = async (id: string) => {
    const konfirmasi = confirm('Apakah Anda yakin ingin menghapus jurnal kegiatan ini?');
    if (!konfirmasi) return;

    try {
      const { error } = await supabase.from('logbook').delete().eq('id', id);
      if (error) throw error;
      alert('Jurnal berhasil dihapus!');
      fetchLogbook();
    } catch (err: any) {
      alert('Gagal menghapus jurnal: ' + err.message);
    }
  };

  // --- Buka Modal Edit ---
  const handleOpenEdit = (item: LogbookData) => {
    setEditItem(item);
    setEditTanggal(item.tanggal);
    setEditKegiatan(item.kegiatan);
    setEditKendala(item.kendala || '');
  };

  // --- Simpan Perubahan Edit ---
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      const { error } = await supabase
        .from('logbook')
        .update({
          tanggal: editTanggal,
          kegiatan: editKegiatan,
          kendala: editKendala || '-',
        })
        .eq('id', editItem.id);

      if (error) throw error;

      alert('Jurnal kegiatan berhasil diperbarui!');
      setEditItem(null);
      fetchLogbook();
    } catch (err: any) {
      alert('Gagal memperbarui jurnal: ' + err.message);
    }
  };

  // --- Fungsi Ekspor ke Excel (Mengikuti Data Filter) ---
  const exportToExcel = () => {
    const dataFormatted = filteredLogbook.map((item, index) => ({
      No: index + 1,
      Tanggal: item.tanggal,
      'Deskripsi Kegiatan': item.kegiatan,
      'Kendala / Solusi': item.kendala || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logbook PKL');
    XLSX.writeFile(
      workbook,
      `Jurnal_Logbook_PKL_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  // --- Fungsi Ekspor ke PDF (Mengikuti Data Filter) ---
  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.text('Laporan Jurnal Kegiatan Harian PKL', 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

    const tableColumn = ['No', 'Tanggal', 'Deskripsi Kegiatan', 'Kendala / Solusi'];
    const tableRows = filteredLogbook.map((item, index) => [
      index + 1,
      item.tanggal,
      item.kegiatan,
      item.kendala || '-',
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: {
        2: { cellWidth: 80 },
        3: { cellWidth: 50 },
      },
    });

    doc.save(
      `Jurnal_Logbook_PKL_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Logbook / Jurnal Kegiatan PKL
            </h1>
            <p className="text-sm text-slate-500">
              Catat dan pantau aktivitas pekerjaan harian selama masa PKL.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg font-medium hover:bg-slate-700 transition"
            >
              Form Absen
            </a>
            <a
              href="/rekap"
              className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Rekap Absensi
            </a>
          </div>
        </div>

        {/* Form Input Logbook */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
          <h2 className="text-lg font-semibold text-slate-700">
            Isi Jurnal Hari Ini
          </h2>

          {pesan && (
            <div className="p-3 text-sm rounded bg-blue-50 text-blue-700 font-medium">
              {pesan}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tanggal Kegiatan
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full md:w-1/3 px-3 py-2 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Deskripsi Kegiatan / Rincian Pekerjaan
              </label>
              <textarea
                required
                rows={3}
                value={kegiatan}
                onChange={(e) => setKegiatan(e.target.value)}
                placeholder="Tuliskan tugas atau proyek yang dikerjakan hari ini..."
                className="w-full px-3 py-2 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kendala yang Dihadapi (Opsional)
              </label>
              <input
                type="text"
                value={kendala}
                onChange={(e) => setKendala(e.target.value)}
                placeholder="Misal: Koneksi internet lambat, error paket instalasi, dll."
                className="w-full px-3 py-2 border rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition disabled:bg-slate-400"
            >
              {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
            </button>
          </form>
        </div>

        {/* Form Filter & Search Logbook */}
        <div className="bg-white p-4 rounded-xl shadow-md grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Kata Kunci</label>
            <input
              type="text"
              placeholder="Cari kegiatan/kendala..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
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

        {/* Tabel Riwayat Logbook */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <h2 className="text-lg font-semibold text-slate-700">
              Riwayat Jurnal Kegiatan
            </h2>
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg transition font-medium"
              >
                📥 Export Excel
              </button>
              <button
                onClick={exportToPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-2 rounded-lg transition font-medium"
              >
                📄 Export PDF
              </button>
              <button
                onClick={fetchLogbook}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg transition font-medium"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <th className="p-3">NO</th>
                  <th className="p-3">TANGGAL</th>
                  <th className="p-3">KEGIATAN</th>
                  <th className="p-3">KENDALA / SOLUSI</th>
                  <th className="p-3 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredLogbook.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Tidak ada jurnal yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogbook.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="p-3 font-medium whitespace-nowrap">
                        {item.tanggal}
                      </td>
                      <td className="p-3">{item.kegiatan}</td>
                      <td className="p-3 text-slate-500">
                        {item.kendala || '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-2.5 py-1.5 rounded font-medium transition"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
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

      {/* Pop-up Modal Edit Logbook */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Edit Jurnal Kegiatan</h2>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Kegiatan</label>
                <input
                  type="date"
                  required
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi Kegiatan</label>
                <textarea
                  required
                  rows={3}
                  value={editKegiatan}
                  onChange={(e) => setEditKegiatan(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kendala / Solusi</label>
                <input
                  type="text"
                  value={editKendala}
                  onChange={(e) => setEditKendala(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
                />
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