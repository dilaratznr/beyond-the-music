'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/admin/Toast';

interface Settings { [key: string]: string; }

const SETTING_GROUPS = [
  {
    title: 'Hero Section',
    description: 'Ana sayfa hero alanı - başlık, açıklama, video ve butonlar',
    fields: [
      { key: 'hero_title_tr', label: 'Hero Başlık (TR)', type: 'text' },
      { key: 'hero_title_en', label: 'Hero Title (EN)', type: 'text' },
      { key: 'hero_subtitle_tr', label: 'Alt Başlık (TR)', type: 'text' },
      { key: 'hero_subtitle_en', label: 'Subtitle (EN)', type: 'text' },
      { key: 'hero_desc_tr', label: 'Açıklama (TR)', type: 'textarea' },
      { key: 'hero_desc_en', label: 'Description (EN)', type: 'textarea' },
      { key: 'hero_video_url', label: 'Video URL (.mp4)', type: 'text' },
      { key: 'hero_poster_url', label: 'Poster Image URL (video yüklenene kadar)', type: 'text' },
      { key: 'hero_cta_text_tr', label: 'CTA Buton (TR)', type: 'text' },
      { key: 'hero_cta_text_en', label: 'CTA Button (EN)', type: 'text' },
      { key: 'hero_cta2_text_tr', label: 'İkinci Buton (TR)', type: 'text' },
      { key: 'hero_cta2_text_en', label: 'Second Button (EN)', type: 'text' },
    ],
  },
  {
    title: 'Culture Banner',
    description: 'Ana sayfa alt bölüm - "Müzik Sadece Dinlenmez" alanı',
    fields: [
      { key: 'culture_banner_title_tr', label: 'Banner Başlık (TR)', type: 'textarea' },
      { key: 'culture_banner_title_en', label: 'Banner Title (EN)', type: 'textarea' },
      { key: 'culture_banner_desc_tr', label: 'Banner Açıklama (TR)', type: 'textarea' },
      { key: 'culture_banner_desc_en', label: 'Banner Description (EN)', type: 'textarea' },
      { key: 'culture_banner_image', label: 'Banner Arka Plan Görseli URL', type: 'text' },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((data) => { setSettings(data); setLoading(false); });
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSaving(false);
    if (res.ok) toast('Ayarlar kaydedildi');
    else toast('Kaydetme hatası', 'error');
  }

  function updateField(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <p className="text-zinc-500 text-sm">Loading settings...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Site Settings</h1>
          <p className="text-xs text-zinc-500 mt-1">Ana sayfa içerikleri, başlıklar, görseller ve video ayarları</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {SETTING_GROUPS.map((group) => (
          <div key={group.title} className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">{group.title}</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">{group.description}</p>
            </div>
            <div className="p-5 space-y-4">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                    {field.label}
                    <span className="text-zinc-400 font-normal ml-2">({field.key})</span>
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={settings[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-zinc-50 resize-none"
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={settings[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none bg-zinc-50"
                    />
                  )}
                  {field.key.includes('url') && settings[field.key] && (
                    <div className="mt-2">
                      {field.key.includes('video') ? (
                        <video src={settings[field.key]} className="w-full max-w-sm h-24 object-cover rounded-lg" muted />
                      ) : (
                        <img src={settings[field.key]} alt="" className="w-full max-w-sm h-24 object-cover rounded-lg" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
