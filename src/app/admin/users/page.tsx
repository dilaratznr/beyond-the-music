'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/admin/Toast';

interface Permission {
  section: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissions: Permission[];
}

const SECTION_LABELS: Record<string, string> = {
  GENRE: 'Genres', ARTIST: 'Artists', ALBUM: 'Albums', ARCHITECT: 'Architects',
  ARTICLE: 'Articles', LISTENING_PATH: 'Listening Paths', MEDIA: 'Media',
  THEORY: 'Theory', AI_MUSIC: 'AI Music',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then((data) => { if (Array.isArray(data)) setUsers(data); setLoading(false); });
  }, []);

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !isActive } : u));
    toast(isActive ? 'Kullanıcı pasife alındı' : 'Kullanıcı aktif edildi');
  }

  async function deleteUser(userId: string) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.ok) { setUsers((prev) => prev.filter((u) => u.id !== userId)); toast('Kullanıcı silindi'); }
    else toast('Silme hatası', 'error');
  }

  function getPermissionSummary(perms: Permission[]): string {
    if (perms.length === 0) return 'No permissions';
    return perms.map((p) => SECTION_LABELS[p.section] || p.section).join(', ');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Users & Permissions</h1>
          <p className="text-xs text-zinc-500 mt-1">Manage users and assign section-based permissions</p>
        </div>
        <Link href="/admin/users/new" className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800">
          + Add User
        </Link>
      </div>

      {loading ? <p className="text-zinc-500 text-sm">Loading...</p> : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    user.role === 'SUPER_ADMIN' ? 'bg-violet-500' : user.role === 'ADMIN' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                      {!user.isActive && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">Inactive</span>}
                    </div>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'SUPER_ADMIN' ? 'bg-violet-100 text-violet-700' :
                    user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                  {user.role !== 'SUPER_ADMIN' && (
                    <div className="flex gap-1">
                      <Link href={`/admin/users/${user.id}`}
                        className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-[10px] rounded-md hover:bg-zinc-200 font-medium">
                        Edit
                      </Link>
                      <button onClick={() => toggleActive(user.id, user.isActive)}
                        className={`px-2.5 py-1 text-[10px] rounded-md font-medium ${user.isActive ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteUser(user.id)}
                        className="px-2.5 py-1 bg-red-50 text-red-600 text-[10px] rounded-md hover:bg-red-100 font-medium">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {user.role !== 'SUPER_ADMIN' && (
                <div className="px-5 pb-4 border-t border-zinc-50">
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 mt-2 flex items-center gap-1"
                  >
                    <span>{expandedUser === user.id ? '▼' : '▶'}</span>
                    Permissions: {getPermissionSummary(user.permissions)}
                  </button>
                  {expandedUser === user.id && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {Object.entries(SECTION_LABELS).map(([key, label]) => {
                        const perm = user.permissions.find((p) => p.section === key);
                        return (
                          <div key={key} className={`px-3 py-2 rounded-lg text-xs ${perm ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50 border border-zinc-100'}`}>
                            <p className={`font-medium ${perm ? 'text-emerald-700' : 'text-zinc-400'}`}>{label}</p>
                            {perm && (
                              <div className="flex gap-1 mt-1">
                                {perm.canCreate && <span className="px-1 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px]">C</span>}
                                {perm.canEdit && <span className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px]">E</span>}
                                {perm.canDelete && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-[9px]">D</span>}
                                {perm.canPublish && <span className="px-1 py-0.5 bg-violet-100 text-violet-600 rounded text-[9px]">P</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
