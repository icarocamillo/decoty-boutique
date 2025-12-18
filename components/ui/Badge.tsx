import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
    outline: "text-zinc-950 border border-zinc-200 dark:text-zinc-200 dark:border-zinc-700",
    secondary: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
    destructive: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};