'use client';

import { ROLE_INFO } from '@/lib/user-admin-constants';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

const ROLES: Role[] = ['EDITOR', 'ADMIN', 'SUPER_ADMIN'];

const ACCENT_CLASSES: Record<
  string,
  { border: string; bg: string; dot: string; text: string; ring: string }
> = {
  violet: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    dot: 'bg-violet-400',
    text: 'text-violet-300',
    ring: 'focus:ring-violet-500/40',
  },
  blue: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-400',
    text: 'text-blue-300',
    ring: 'focus:ring-blue-500/40',
  },
  emerald: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    ring: 'focus:ring-emerald-500/40',
  },
};

/**
 * Big-card role picker. Each card explains what the role can actually do,
 * so a fresh super admin never has to guess "what does Editor mean?".
 */
export default function RoleSelector({
  value,
  onChange,
  disabled,
  disableSuperAdmin,
  disableSuperAdminReason,
}: {
  value: string;
  onChange: (role: Role) => void;
  disabled?: boolean;
  // Used when editing yourself — preserve your own super-admin role.
  disableSuperAdmin?: boolean;
  disableSuperAdminReason?: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {ROLES.map((role) => {
        const info = ROLE_INFO[role];
        const accent = ACCENT_CLASSES[info.accent];
        const selected = value === role;
        const isDisabled = disabled || (role === 'SUPER_ADMIN' && disableSuperAdmin);
        return (
          <button
            key={role}
            type="button"
            onClick={() => !isDisabled && onChange(role)}
            disabled={isDisabled}
            aria-pressed={selected}
            className={`relative text-left p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${accent.ring} ${
              selected
                ? `${accent.border} ${accent.bg}`
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
                <span
                  className={`text-sm font-semibold tracking-tight ${selected ? accent.text : 'text-zinc-100'}`}
                >
                  {info.labelTr}
                </span>
              </div>
              {selected && (
                <span className={`text-[10px] font-bold uppercase tracking-wider ${accent.text}`}>
                  Seçili
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{info.descriptionTr}</p>
            {role === 'SUPER_ADMIN' && disableSuperAdmin && disableSuperAdminReason && (
              <p className="text-[10px] text-zinc-500 mt-2 italic">{disableSuperAdminReason}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
