import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'outline-primary' | 'subtle-primary' | 'danger' | 'danger-solid';
type Size = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-1.5 font-bold rounded-xl transition-all duration-200 ' +
  'cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  'active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-md shadow-primary/10 hover:bg-primary-dark hover:shadow-lg',
  outline: 'border border-gray-200 text-on-surface-muted hover:bg-surface hover:text-on-surface',
  'outline-primary': 'border border-primary/20 text-primary hover:bg-primary-light',
  'subtle-primary': 'bg-primary-light text-primary border border-primary/10 hover:bg-primary/10',
  danger: 'bg-red-50/50 text-red-600 border border-red-100/80 hover:bg-red-50 hover:text-red-700',
  'danger-solid': 'bg-red-600 text-white shadow-md shadow-red-600/10 hover:bg-red-700 hover:shadow-lg',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-5 py-2.5',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
