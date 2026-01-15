
import React, { useState } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-28 h-28',
    xl: 'w-14 h-14 sm:w-16 sm:h-16'
  };

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg border border-zinc-800 transition-all duration-300 select-none ${sizeClasses[size]} ${className}`}>
      {!hasError ? (
        <img 
          src="./logo.png" 
          alt="Decoty Logo" 
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <span 
          className="font-rouge text-white pt-1 animate-fade-in" 
          style={{ fontSize: size === 'lg' ? '4.5rem' : size === 'xl' ? '3rem' : size === 'md' ? '2.2rem' : '1.5rem' }}
        >
          D
        </span>
      )}
    </div>
  );
};