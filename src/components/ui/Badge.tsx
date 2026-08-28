import React, { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    primary: 'bg-blue-50 text-blue-800 border border-blue-200/60 font-medium',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/60 font-medium',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/60 font-medium',
    info: 'bg-sky-50 text-sky-800 border border-sky-200/60 font-medium',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full whitespace-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
