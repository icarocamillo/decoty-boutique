
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    outline: "text-zinc-950 border border-zinc-200 dark:text-zinc-200 dark:border-zinc-700",
    secondary: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
    destructive: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
    success: "bg-green-100 text-green-700 border border-green-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
    info: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
    purple: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
