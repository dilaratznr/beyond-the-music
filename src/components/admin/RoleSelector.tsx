'use client';

import { ROLE_INFO } from '@/lib/user-admin-constants';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';

const ROLES: Role[] = ['EDITOR', 'ADMIN', 'SUPER_ADMIN'];

/**
 * Big-card role picker. Each card explains what the role can actually do,
 * so a fresh super admin never has to guess "what does Editor mean?".
 *
 * Editoryal ton: kartlar tek renkli zinc — seçili kart sadece beyaz
 * çerçeve + dolu dot ile ayrılır. Renkli bloklar (violet/blue/emerald)
 * göz yorucu bulundu, editoryal dili bozuyordu.
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
        const selected = value === role;
        const isDisabled = disabled || (role === 'SUPER_ADMIN' && disableSuperAdmin);
        return (
          <button
            key={role}
            type="button"
            onClick={() => !isDisabled && onChange(role)}
            disabled={isDisabled}
            aria-pressed={selected}
            className={`relative text-left p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-zinc-500/30 ${
              selected
                ? 'border-zinc-100/60 bg-zinc-900'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${selected ? 'bg-zinc-100' : 'bg-zinc-600'}`}
                />
                <span
                  className={`text-sm font-semibold tracking-tight ${selected ? 'text-zinc-50' : 'text-zinc-100'}`}
                >
                  {info.labelTr}
                </span>
              </div>
              {selected && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
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
