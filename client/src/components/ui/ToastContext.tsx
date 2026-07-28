import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border text-sm font-medium transition-all duration-300 transform animate-in slide-in-from-bottom-5 cursor-pointer ${
              toast.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-700/50'
                : toast.type === 'error'
                ? 'bg-rose-900/90 text-white border-rose-700/50'
                : toast.type === 'warning'
                ? 'bg-amber-900/90 text-white border-amber-700/50'
                : 'bg-slate-900/90 text-white border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
              )}
              {toast.type === 'error' && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300">✕</span>
              )}
              {toast.type === 'warning' && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">!</span>
              )}
              {toast.type === 'info' && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">i</span>
              )}
              <span>{toast.message}</span>
            </div>
            <button className="text-white/60 hover:text-white text-xs">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
