import React from 'react';

export const PLPSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col gap-4 animate-pulse">
          <div className="aspect-[3/4] bg-zinc-100 rounded-2xl w-full" />
          <div className="space-y-2">
            <div className="h-4 bg-zinc-100 rounded w-3/4" />
            <div className="h-4 bg-zinc-100 rounded w-1/2" />
            <div className="h-6 bg-zinc-100 rounded w-1/3 mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
};
