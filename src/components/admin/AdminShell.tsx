'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';

/**
 * Admin layout: public routes (login, accept-invite) bare, no sidebar.
 * Authenticated shell is dark Vercel/GitHub style (zinc-950 bg, z-900 sidebar).
 */
const PUBLIC_ADMIN_PREFIXES = [
  '/admin/login',
  '/admin/accept-invite', // No sidebar for unauth users activating invites
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
