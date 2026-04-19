'use client';

import { useMemo } from 'react';
import {
  PERMISSION_SECTIONS,
  PERMISSION_ACTIONS,
  PERMISSION_TEMPLATES,
  PermissionAction,
  actionLabel,
} from '@/lib/user-admin-constants';

export interface PermState {
  enabled: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export const EMPTY_PERM: PermState = {
  enabled: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canPublish: false,
};

export function buildInitialPermissions(): Record<string, PermState> {
  return Object.fromEntries(PERMISSION_SECTIONS.map((s) => [s.key, { ...EMPTY_PERM }]));
}

/**
 * Matrix editor for section × (create/edit/delete/publish). Drives the
 * same state both the /new and /[id] pages hold, so the super admin sees
 * an identical grid in both places.
 */
export default function PermissionGrid({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, PermState>;
  onChange: (next: Record<string, PermState>) => void;
  disabled?: boolean;
}) {
  const enabledCount = useMemo(
    () => Object.values(value).filter((v) => v.enabled).length,
    [value],
  );

  function setSection(key: string, next: PermState) {
    onChange({ ...value, [key]: next });
  }

  function toggleEnabled(key: string) {
    const current = value[key];
    if (current.enabled) {
      setSection(key, { ...EMPTY_PERM });
    } else {
      // Enabling a section gives sensible defaults (read+edit), not full access.
      setSection(key, { enabled: true, canCreate: true, canEdit: true, canDelete: false, canPublish: false });
    }
  }

  function togglePerm(key: string, perm: PermissionAction) {
    const current = value[key];
    if (!current.enabled) return;
    setSection(key, { ...current, [perm]: !current[perm] });
  }

  function toggleColumn(perm: PermissionAction) {
    const enabledSections = Object.entries(value).filter(([, v]) => v.enabled);
    if (enabledSections.length === 0) return;
    const allOn = enabledSections.every(([, v]) => v[perm]);
    const next = { ...value };
    for (const [k, v] of enabledSections) {
      next[k] = { ...v, [perm]: !allOn };
    }
    onChange(next);
  }

  function applyTemplate(templateId: string) {
    const template = PERMISSION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const next: Record<string, PermState> = {};
    for (const s of PERMISSION_SECTIONS) {
      const out = template.apply(s.key);
      next[s.key] = out ? { enabled: true, ...out } : { ...EMPTY_PERM };
    }
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Templates + summary */}
      <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-zinc-800/80">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Şablon</span>
        {PERMISSION_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => applyTemplate(t.id)}
            title={t.descriptionTr}
            className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] rounded-md hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.labelTr}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[11px] text-zinc-400">
          <strong className="text-zinc-100 font-semibold">{enabledCount}</strong> / {PERMISSION_SECTIONS.length} bölüm aktif
        </span>
      </div>

      {/* Column header with quick-fill */}
      <div className="hidden md:grid grid-cols-[minmax(180px,1fr)_repeat(4,60px)] gap-2 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
        <span>Bölüm</span>
        {PERMISSION_ACTIONS.map((a) => {
          const lbl = actionLabel(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggleColumn(a)}
              disabled={disabled || enabledCount === 0}
              className="text-center hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={`Tüm aktif bölümlerde ${lbl.tr.toLowerCase()} iznini değiştir`}
            >
              {lbl.tr}
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        {PERMISSION_SECTIONS.map((section) => {
          const perm = value[section.key];
          return (
            <div
              key={section.key}
              className={`rounded-md border transition-colors ${
                perm.enabled
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              }`}
            >
              <div className="md:grid md:grid-cols-[minmax(180px,1fr)_repeat(4,60px)] md:gap-2 flex flex-col md:items-center px-3 py-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={perm.enabled}
                    disabled={disabled}
                    onChange={() => toggleEnabled(section.key)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/40 focus:ring-offset-0"
                  />
                  <span className="w-5 text-center text-zinc-500 text-sm">{section.icon}</span>
                  <span className={`text-xs font-medium ${perm.enabled ? 'text-zinc-100' : 'text-zinc-400'}`}>
                    {section.labelTr}
                  </span>
                  <span className="text-[10px] text-zinc-500">{section.labelEn}</span>
                </label>

                {/* Action toggles */}
                <div className="flex md:contents gap-1.5 mt-2 md:mt-0 ml-7 md:ml-0">
                  {PERMISSION_ACTIONS.map((a) => {
                    const lbl = actionLabel(a);
                    const on = perm[a];
                    const activeCls =
                      a === 'canDelete'
                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                        : a === 'canPublish'
                          ? 'bg-violet-500/10 text-violet-300 border-violet-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => togglePerm(section.key, a)}
                        disabled={disabled || !perm.enabled}
                        aria-pressed={on}
                        aria-label={`${section.labelTr} — ${lbl.tr}`}
                        className={`h-7 md:h-7 md:w-full flex-1 md:flex-none inline-flex items-center justify-center gap-1 border rounded-md text-[10px] font-bold uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          on && perm.enabled
                            ? activeCls
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                        }`}
                        title={`${lbl.tr} (${lbl.en})`}
                      >
                        <span className="md:hidden">{lbl.tr}</span>
                        <span className="hidden md:inline">{lbl.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 pt-2 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-emerald-500/60 rounded" /> Oluştur (C)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-emerald-500/60 rounded" /> Düzenle (E)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-red-500/60 rounded" /> Sil (D)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-violet-500/60 rounded" /> Yayınla (P)
        </span>
      </div>
    </div>
  );
}
