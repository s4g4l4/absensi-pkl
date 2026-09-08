'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RekapPage() {
  const router = useRouter();
  const [dataPresensi, setDataPresensi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  // Modal State untuk Edit Data (Hanya Admin BAAK)
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Cek Hak Akses Login & Role
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('is_logged_in');
    const role = localStorage.getItem('user_role') || '';

    if (!isLoggedIn) {
      // Jika belum login, kembalikan ke halaman login
      router.push('/login');
      return;
    }

    setUserRole(role);
    fetchData();
  }, [router]);

  // Ambil Data Presensi dari Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('presensi')
        .select('*')
        .order('tanggal', { ascending: false });

      if (error) throw error;
      setDataPresensi(data || []);
    } catch (err: any) {
      alert('Gagal mengambil data rekap: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout Pengelola
  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('user_role');
    router.push('/login');
  };

  // Filter Data berdasarkan Nama/Keyword dan Rentang Tanggal
  const filteredData = dataPresensi.filter((item) => {
    const matchesSearch = item.nama?.toLowerCase().includes(search.toLowerCase());
    const matchesDate =
      (!startDate || item.tanggal >= startDate) &&
      (!endDate || item.tanggal <= endDate);
    return matchesSearch && matchesDate;
  });

  // Hapus Data (Khusus Admin BAAK)
  const handleDelete = async (id: number, nama: string) => {
    if (userRole !== 'admin_baak') {
      alert('Akses Ditolak: Hanya Admin (BAAK) yang berhak menghapus data!');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus data presensi milik "${nama}"?`)) {
      try {
        const { error } = await supabase.from('presensi').delete().eq('id', id);
        if (error) throw error;
        alert('Data berhasil dihapus!');
        fetchData();
      } catch (err: any) {
        alert('Gagal menghapus data: ' + err.message);
      }
    }
  };

  // Buka Modal Edit (Khusus Admin BAAK)
  const handleOpenEdit = (item: any) => {
    if (userRole !== 'admin_baak') {
      alert('Akses Ditolak: Hanya Admin (BAAK) yang berhak mengubah data!');
      return;
    }
    setEditData({ ...item });
    setShowModalEdit(true);
  };

  // Simpan Perubahan Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;

    try {
      const { error } = await supabase
        .from('presensi')
        .update({
          nama: editData.nama,
          tanggal: editData.tanggal,
          waktu_masuk: editData.waktu_masuk,
          jam_keluar: editData.jam_keluar,
          status: editData.status,
        })
        .eq('id', editData.id);

      if (error) throw error;
      alert('Data presensi berhasil diperbarui!');
      setShowModalEdit(false);
      fetchData();
    } catch (err: any) {
      alert('Gagal memperbarui data: ' + err.message);
    }
  };

  // Ekspor Excel
  const exportToExcel = () => {
    const dataFormatted = filteredData.map((item, index) => ({
      No: index + 1,
      Nama_Siswa: item.nama,
      Tanggal: item.tanggal,
      Jam_Masuk: item.waktu_masuk || '-',
      Jam_Keluar: item.jam_keluar || '-',
      Status: item.status,
      Lokasi: item.lokasi || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Presensi');
    XLSX.writeFile(workbook, `Rekap_Presensi_PKL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Ekspor PDF Laporan Resmi
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Kop Surat FST ULB
    doc.setFontSize(14);
    doc.text('UNIVERSITAS LABUHANBATU - FAKULTAS SAINS DAN TEKNOLOGI', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('BIRO ADMINISTRASI AKADEMIK DAN KEMAHASINSAAN (BAAK)', 105, 21, { align: 'center' });
    doc.text('Jl. SM. Raja No. 126-A Rantauprapat, Labuhanbatu - Sumatera Utara', 105, 26, { align: 'center' });
    doc.line(14, 30, 196, 30);

    doc.setFontSize(12);
    doc.text('LAPORAN REKAPITULASI PRESENSI PKL SISWA', 105, 38, { align: 'center' });

    const tableRows = filteredData.map((item, index) => [
      index + 1,
      item.nama,
      item.tanggal,
      item.waktu_masuk || '-',
      item.jam_keluar || '-',
      item.status,
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['No', 'Nama Siswa', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102] },
    });

    doc.save(`Laporan_Presensi_PKL_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Map Teks Jabatan
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin_baak': return 'Admin (BAAK)';
      case 'guru': return 'Guru Pembimbing';
      case 'staff_baak': return 'Staff BAAK';
      case 'kaprodi': return 'Ka.Prodi';
      case 'dekan': return 'Dekan';
      default: return 'Pengelola';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6 space-y-6">
        
        {/* Header & Status Login Role */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Rekapitulasi Presensi PKL</h1>
            <p className="text-xs text-slate-500 mt-1">
              Login Sebagai: <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{getRoleLabel(userRole)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/logbook" className="text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition">
              📘 Jurnal Logbook
            </a>
            <button
              onClick={handleLogout}
              className="text-xs bg-rose-600 text-white px-3 py-2 rounded hover:bg-rose-700 transition"
            >
              🚪 Keluar / Logout
            </button>
          </div>
        </div>

        {/* Filter & Tombol Ekspor */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cari Nama Siswa</label>
            <input
              type="text"
              placeholder="Ketik nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-xs text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 border rounded text-xs text-slate-800"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={exportToExcel}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 rounded transition"
            >
              📥 Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium py-2 rounded transition"
            >
              📄 PDF Laporan
            </button>
          </div>
        </div>

        {/* Tabel Rekapitulasi Presensi */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="p-3 border">No</th>
                <th className="p-3 border">Nama Siswa / NIS</th>
                <th className="p-3 border">Tanggal</th>
                <th className="p-3 border">Jam Masuk</th>
                <th className="p-3 border">Jam Keluar</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border text-center">Foto Bukti</th>
                <th className="p-3 border text-center">Aksi (Admin Only)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">Memuat data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">Tidak ada data presensi ditemukan.</td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 border text-center">{index + 1}</td>
                    <td className="p-3 border font-medium text-slate-800">{item.nama}</td>
                    <td className="p-3 border">{item.tanggal}</td>
                    <td className="p-3 border text-emerald-700 font-mono">{item.waktu_masuk || '-'}</td>
                    <td className="p-3 border text-blue-700 font-mono">{item.jam_keluar || '-'}</td>
                    <td className="p-3 border">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold uppercase text-[10px]">
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 border text-center">
                      {item.foto_bukti ? (
                        <img src={item.foto_bukti} alt="Bukti" className="w-10 h-10 object-cover rounded mx-auto border" />
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    {/* Kolom Aksi Terproteksi Role */}
                    <td className="p-3 border text-center">
                      {userRole === 'admin_baak' ? (
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] px-2 py-1 rounded font-medium transition"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nama)}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] px-2 py-1 rounded font-medium transition"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Read-Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Edit Data (Khusus Admin BAAK) */}
      {showModalEdit && editData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Edit Data Presensi (Admin BAAK)</h3>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nama Siswa</label>
                <input
                  type="text"
                  value={editData.nama}
                  onChange={(e) => setEditData({ ...editData, nama: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editData.tanggal}
                  onChange={(e) => setEditData({ ...editData, tanggal: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-slate-800"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jam Masuk</label>
                  <input
                    type="text"
                    value={editData.waktu_masuk || ''}
                    onChange={(e) => setEditData({ ...editData, waktu_masuk: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jam Keluar</label>
                  <input
                    type="text"
                    value={editData.jam_keluar || ''}
                    onChange={(e) => setEditData({ ...editData, jam_keluar: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-slate-800"
                >
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpha">Alpha</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalEdit(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
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