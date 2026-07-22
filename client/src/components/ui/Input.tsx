import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

const fieldCls =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-on-surface bg-white transition-all ' +
  'focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldCls} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`${fieldCls} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-bold text-on-surface-muted uppercase tracking-wider mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] font-medium text-on-surface-muted mt-2 px-1">{hint}</p>}
    </div>
  );
}
