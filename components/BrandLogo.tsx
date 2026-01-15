
import React, { useState, useEffect } from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 'md' }) => {
  const [hasError, setHasError] = useState(false);

  // Reseta o estado de erro ao montar o componente
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
   * Importante: No Vite, arquivos dentro da pasta 'public/' devem ser 
   * referenciados com caminho absoluto começando com barra '/'.
   * Certifique-se de que o arquivo na pasta public se chama exatamente 'logo.png' (minúsculo).
   */
  const logoUrl = "/logo.png";

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg border border-zinc-800 transition-all duration-300 select-none ${sizeClasses[size]} ${className}`}>
      {!hasError ? (
        <img 
          src={logoUrl} 
          alt="Decoty Boutique" 
          className="w-full h-full object-contain p-0.5"
          onError={() => {
            console.error(`ERRO DE LOGO: Não foi possível carregar ${logoUrl}. Verifique se o arquivo está na pasta 'public' e se o nome está correto.`);
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