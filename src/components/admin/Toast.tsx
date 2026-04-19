'use client';

import { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const accent =
            t.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100'
              : t.type === 'error'
                ? 'border-red-500/30 bg-red-950/80 text-red-100'
                : 'border-zinc-700 bg-zinc-900 text-zinc-100';
          const iconColor =
            t.type === 'success'
              ? 'text-emerald-400'
              : t.type === 'error'
                ? 'text-red-400'
                : 'text-zinc-400';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto animate-slide-in-toast flex items-center gap-2.5 px-3.5 py-2.5 rounded-md shadow-xl backdrop-blur text-[12px] font-medium border ${accent}`}
            >
              <span className={`${iconColor} font-bold leading-none`}>
                {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes slideInToast {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-toast {
          animation: slideInToast 0.25s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
