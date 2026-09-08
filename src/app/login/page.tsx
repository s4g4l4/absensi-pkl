'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [role, setRole] = useState('admin_baak');
  const [dudiName, setDudiName] = useState('SMKN 1 Rantau Utara');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Password untuk Role Management Kampus
    const PASS_KEY: Record<string, string> = {
      admin_baak: 'admin123',
      staff_baak: 'staff123',
      kaprodi: 'kaprodi123',
      dekan: 'dekan123',
    };

    // 2. Password Khusus Masing-Masing DUDI / Sekolah Mitra
    // 💡 GANTI PASSWORD DI BAWAH INI SESUAI DATA DUDI KAMU
    const DUDI_PASS_KEY: Record<string, string> = {
      'SMKN 1 Rantau Utara': 'smkn1ru123',
      'SMKN 1 Rantau Prapat': 'smkn1rp123',
      'SMA Negeri 1 Labuhanbatu': 'sman1lab123',
      'SMK Swasta Pemda': 'smkpemda123',
    };

    let isValid = false;

    if (role === 'dudi') {
      // Cek password berdasarkan DUDI yang dipilih
      if (password === DUDI_PASS_KEY[dudiName]) {
        isValid = true;
      }
    } else {
      // Cek password role management
      if (password === PASS_KEY[role]) {
        isValid = true;
      }
    }

    if (isValid) {
      localStorage.setItem('user_role', role);
      localStorage.setItem('is_logged_in', 'true');
      if (role === 'dudi') {
        localStorage.setItem('user_dudi', dudiName);
      } else {
        localStorage.removeItem('user_dudi');
      }
      router.push('/rekap');
    } else {
      setError('Password salah! Silakan periksa kembali password atau DUDI yang dipilih.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center">Login Pengelola / DUDI PKL</h2>
        
        {error && (
          <div className="p-3 text-xs bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Jabatan / Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-slate-800"
            >
              <option value="admin_baak">Admin (BAAK) — Full Edit/Hapus</option>
              <option value="staff_baak">Staff BAAK — Read Only</option>
              <option value="kaprodi">Ka.Prodi — Read Only</option>
              <option value="dekan">Dekan — Read Only</option>
              <option value="dudi">Pembimbing DUDI / Sekolah</option>
            </select>
          </div>

          {role === 'dudi' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Nama DUDI / Sekolah Anda</label>
              <select
                value={dudiName}
                onChange={(e) => setDudiName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-slate-800"
              >
                {/* 💡 TAMBAH ATAU UBAH PILIHAN DUDI DI SINI */}
                <option value="SMKN 1 Rantau Utara">SMKN 1 Rantau Utara</option>
                <option value="SMKN 1 Rantau Prapat">SMKN 1 Rantau Prapat</option>
                <option value="SMA Negeri 1 Labuhanbatu">SMA Negeri 1 Labuhanbatu</option>
                <option value="SMK Swasta Pemda">SMK Swasta Pemda</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password Akses</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password..."
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-slate-800"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg text-sm transition"
          >
            Masuk Ke Rekapitulasi
          </button>
        </form>
      </div>
    </div>
  );
}