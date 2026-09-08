'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [role, setRole] = useState('admin_baak');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password Sederhana untuk Pengelola
    const PASS_KEY: Record<string, string> = {
      admin_baak: 'admin123',
      guru: 'guru123',
      staff_baak: 'staff123',
      kaprodi: 'kaprodi123',
      dekan: 'dekan123',
    };

    if (password === PASS_KEY[role]) {
      localStorage.setItem('user_role', role);
      localStorage.setItem('is_logged_in', 'true');
      router.push('/rekap');
    } else {
      setError('Password salah! Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 text-center">Login Pengelola PKL</h2>
        {error && <div className="p-2 text-xs bg-rose-100 text-rose-700 rounded text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Jabatan / Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
            >
              <option value="admin_baak">Admin (BAAK) - 1 Orang</option>
              <option value="guru">Guru Pembimbing - 4 Orang</option>
              <option value="staff_baak">Staff BAAK - 3 Orang</option>
              <option value="kaprodi">Ka.Prodi - 3 Orang</option>
              <option value="dekan">Dekan - 1 Orang</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password Akses</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password..."
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
            />
          </div>
          <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition text-sm">
            Masuk Ke Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}