
import React, { useState, useEffect } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  // Forçamos o reset do erro se o componente for remontado
  useEffect(() => {
    setHasError(false);
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-28 h-28',
    xl: 'w-14 h-14 sm:w-16 sm:h-16'
  };

  /**
   * No Vite + Vercel, o caminho "/erp/decoty_logo.png" é o padrão para arquivos na pasta public quando base é /erp.
   * Adicionamos um timestamp opcional apenas se houver erro persistente de cache, 
   * mas por padrão, o caminho absoluto é o mais seguro.
   */
  const logoUrl = "/erp/decoty_logo.png";

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg border border-zinc-800 transition-all duration-300 select-none ${sizeClasses[size]} ${className}`}>
      {!hasError ? (
        <img 
          src={logoUrl} 
          alt="Decoty Boutique" 
          className="w-full h-full object-contain p-0.5"
          onError={() => {
            // Se a imagem falhar (arquivo corrompido ou 404), mostramos o fallback "D"
            setHasError(true);
          }}
        />
      ) : (
        <span 
          className="font-rouge text-white pt-1 animate-fade-in font-medium" 
          style={{ 
            fontSize: size === 'lg' ? '4.5rem' : size === 'xl' ? '3rem' : size === 'md' ? '2.2rem' : '1.5rem',
            lineHeight: 1
          }}
        >
          D
        </span>
      )}
    </div>
  );
};