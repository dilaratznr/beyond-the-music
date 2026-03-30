'use client';

import { signOut, useSession } from 'next-auth/react';

export default function AdminHeader() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-800">Admin Panel</h2>
      </div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-800">{session.user.name}</p>
              <p className="text-xs text-zinc-500">{session.user.role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
