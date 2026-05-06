import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, description, action }) => {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col transition-colors duration-300 ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center">{title}</h3>}
            {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 flex-1 min-w-0 text-zinc-900 dark:text-zinc-100">
        {children}
      </div>
    </div>
  );
};