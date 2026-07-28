import type { ComponentType } from 'react';

type Tone = 'slate' | 'amber' | 'emerald';
type Size = 'md' | 'lg';

const tones: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-400 border-slate-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const sizes: Record<Size, { box: string; icon: string }> = {
  md: { box: 'w-16 h-16', icon: 'w-8 h-8' },
  lg: { box: 'w-20 h-20', icon: 'w-10 h-10' },
};

interface IconBadgeProps {
  icon: ComponentType<{ className?: string }>;
  tone?: Tone;
  size?: Size;
}

export function IconBadge({ icon: Icon, tone = 'slate', size = 'md' }: IconBadgeProps) {
  const { box, icon } = sizes[size];
  return (
    <div className={`${box} ${tones[tone]} rounded-3xl flex items-center justify-center mx-auto border`}>
      <Icon className={icon} />
    </div>
  );
}
