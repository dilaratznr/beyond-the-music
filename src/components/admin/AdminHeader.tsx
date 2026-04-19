'use client';

import { signOut, useSession } from 'next-auth/react';

/**
 * Optional top bar. AdminShell currently omits this in favor of a self-sufficient
 * sidebar — kept here for pages/experiments that want a classic header.
 */
export default function AdminHeader() {
  const { data: session } = useSession();

  return (
    <header className="h-14 bg-zinc-950/80 backdrop-blur border-b border-zinc-900 flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Admin Panel</h2>
      </div>
      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-zinc-100 leading-tight">{session.user.name}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {(session.user as { role: string }).role}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 hover:text-white border border-zinc-800 rounded-md transition-colors"
            >
              Çıkış
            </button>
          </>
        )}
      </div>
    </header>
  );
}
