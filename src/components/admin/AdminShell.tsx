'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

/**
 * Admin layout chrome. Public admin routes (login / forgot-password /
 * reset-password) get the bare content — no sidebar — so a logged-out user
 * never sees navigation to places they can't access.
 *
 * The authenticated shell is a dark, Vercel / GitHub-style surface:
 *   - zinc-950 page background
 *   - zinc-900 sticky sidebar
 *   - zinc-50 foreground text
 * Inputs and surfaces inside the main region layer on top of this with
 * zinc-900/zinc-800 borders.
 */
const PUBLIC_ADMIN_PREFIXES = [
  '/admin/login',
  '/admin/forgot-password',
  '/admin/reset-password',
  // Davet linkini açan kişi henüz login değil ve sidebar'a ihtiyacı yok —
  // Aktivasyon ekranı tek başına AuthLayout içinde görünsün.
  '/admin/accept-invite',
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isPublic = PUBLIC_ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) {
    // Authenticated shell (sidebar etc.) is skipped entirely for public routes.
    return <div className="admin-scope text-zinc-900">{children}</div>;
  }

  return (
    <div className="admin-scope flex min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
      {/* Global ⌘K command palette — mounted once so every admin page shares it. */}
      <CommandPalette />
    </div>
  );
}
