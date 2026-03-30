import SessionProvider from '@/components/admin/SessionProvider';
import Sidebar from '@/components/admin/Sidebar';
import { ToastProvider } from '@/components/admin/Toast';

export const metadata = { title: 'Admin - Beyond The Music' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-[#f8f8fa]">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1 p-5 overflow-auto">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
