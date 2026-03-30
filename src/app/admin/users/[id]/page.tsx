'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const SECTIONS = [
  { key: 'GENRE', label: 'Genres' }, { key: 'ARTIST', label: 'Artists' },
  { key: 'ALBUM', label: 'Albums' }, { key: 'ARCHITECT', label: 'Architects' },
  { key: 'ARTICLE', label: 'Articles' }, { key: 'LISTENING_PATH', label: 'Listening Paths' },
  { key: 'MEDIA', label: 'Media' }, { key: 'THEORY', label: 'Theory' },
  { key: 'AI_MUSIC', label: 'AI Music' },
];

interface PermState { enabled: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canPublish: boolean; }

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', role: '', password: '' });
  const [permissions, setPermissions] = useState<Record<string, PermState>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, { enabled: false, canCreate: false, canEdit: false, canDelete: false, canPublish: false }]))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then((data) => {
      setForm({ name: data.name, email: data.email, role: data.role, password: '' });
      const perms = { ...permissions };
      for (const p of data.permissions || []) {
        perms[p.section] = { enabled: true, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete, canPublish: p.canPublish };
      }
      setPermissions(perms);
      setLoading(false);
    });
  }, [id]);

  function toggleSection(key: string) {
    setPermissions((prev) => {
      const current = prev[key];
      if (current.enabled) return { ...prev, [key]: { enabled: false, canCreate: false, canEdit: false, canDelete: false, canPublish: false } };
      return { ...prev, [key]: { enabled: true, canCreate: true, canEdit: true, canDelete: false, canPublish: false } };
    });
  }

  function togglePerm(key: string, perm: keyof Omit<PermState, 'enabled'>) {
    setPermissions((prev) => ({ ...prev, [key]: { ...prev[key], [perm]: !prev[key][perm] } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const permData = Object.entries(permissions)
      .filter(([, v]) => v.enabled)
      .map(([section, v]) => ({ section, canCreate: v.canCreate, canEdit: v.canEdit, canDelete: v.canDelete, canPublish: v.canPublish }));

    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, permissions: form.role !== 'SUPER_ADMIN' ? permData : undefined };
    if (form.password) body.password = form.password;

    const res = await fetch(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setError(data.error);
    else router.push('/admin/users');
  }

  if (loading) return <p className="text-zinc-500 text-sm">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-900 mb-1">Edit User</h1>
      <p className="text-xs text-zinc-500 mb-6">Update user details and permissions</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>}

        <div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">New Password (leave empty to keep)</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none" minLength={6} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none">
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
        </div>

        {form.role !== 'SUPER_ADMIN' && (
          <div className="bg-white p-5 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Section Permissions</h2>
            <div className="space-y-2">
              {SECTIONS.map((section) => {
                const perm = permissions[section.key];
                return (
                  <div key={section.key} className={`rounded-lg border p-3 transition-colors ${perm.enabled ? 'border-emerald-200 bg-emerald-50/50' : 'border-zinc-100 bg-zinc-50'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={perm.enabled} onChange={() => toggleSection(section.key)}
                          className="w-3.5 h-3.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
                        <span className={`text-xs font-medium ${perm.enabled ? 'text-zinc-900' : 'text-zinc-400'}`}>{section.label}</span>
                      </label>
                      {perm.enabled && (
                        <div className="flex gap-1.5">
                          {(['canCreate', 'canEdit', 'canDelete', 'canPublish'] as const).map((p) => (
                            <button key={p} type="button" onClick={() => togglePerm(section.key, p)}
                              className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${
                                perm[p]
                                  ? p === 'canDelete' ? 'bg-red-100 text-red-600' : p === 'canPublish' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'
                                  : 'bg-zinc-100 text-zinc-400'
                              }`}>
                              {p.replace('can', '')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
