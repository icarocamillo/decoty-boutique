
import React from 'react';
import { motion } from 'motion/react';
import { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  // Encontrar o menor preço entre as variantes
  const minPrice = product.variants && product.variants.length > 0
    ? Math.min(...product.variants.map(v => v.preco_venda))
    : 0;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const installmentValue = minPrice / 5;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group flex flex-col"
    >
      <Link to={`/produto/Decoty-${product.ui_id}`} className="block relative aspect-[3/4] overflow-hidden bg-zinc-50 rounded-2xl mb-4">
        <img 
          src={`https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop`} 
          alt={product.nome}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Heart Icon Overlay */}
        <button className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
             <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
           </svg>
        </button>
      </Link>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">{product.marca || 'Decoty'}</span>
        <Link to={`/produto/Decoty-${product.ui_id}`}>
          <h3 className="text-sm font-medium text-zinc-900 group-hover:text-zinc-600 transition-colors line-clamp-1">
            {product.nome}
          </h3>
        </Link>
        
        <div className="mt-2 flex flex-col">
          <p className="text-base font-bold text-zinc-900">
            {formatCurrency(minPrice)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Em até 5x de <span className="font-semibold">{formatCurrency(installmentValue)}</span> sem juros
          </p>
        </div>
      </div>
    </motion.div>
  );
};
