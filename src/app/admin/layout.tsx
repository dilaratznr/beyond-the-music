import SessionProvider from '@/components/admin/SessionProvider';
import AdminShell from '@/components/admin/AdminShell';
import AdminAuthGate from '@/components/admin/AdminAuthGate';
import { ToastProvider } from '@/components/admin/Toast';

// Search engine'ler admin paneli index'lemesin — link paylaşıldığında
// snippet de göstermesin. Robots.txt + middleware Cache-Control no-store
// zaten var; bu metadata third-party crawler'lara da açıkça söyler.
export const metadata = {
  title: 'Admin - Beyond The Music',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // AdminAuthGate server-side gate'tir: middleware'in defense-in-depth
  // katmanı. Public admin route'ları (login, accept-invite) muaf,
  // protected olanlar için session yoksa /admin/login'e redirect.
  return (
    <SessionProvider>
      <ToastProvider>
        <AdminAuthGate>
          <AdminShell>{children}</AdminShell>
        </AdminAuthGate>
      </ToastProvider>
    </SessionProvider>
  );
}
