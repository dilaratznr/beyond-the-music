import SessionProvider from '@/components/admin/SessionProvider';
import AdminShell from '@/components/admin/AdminShell';
import { ToastProvider } from '@/components/admin/Toast';

export const metadata = { title: 'Admin - Beyond The Music' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </SessionProvider>
  );
}
