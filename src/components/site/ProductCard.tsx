
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Encontrar o menor preço entre as variantes
  const minPrice = product.variants && product.variants.length > 0
    ? Math.min(...product.variants.map(v => v.preco_venda))
    : 0;

  // Extrair tamanhos únicos e ordenar corretamente
  const sizes = product.variants 
    ? (Array.from(new Set(product.variants.map(v => v.tamanho))) as string[]).sort((a, b) => {
        const order = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'G4', 'G5'];
        return order.indexOf(a) - order.indexOf(b);
      })
    : [];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const installmentValue = minPrice / 5;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSize) {
      alert('Por favor, selecione um tamanho');
      return;
    }
    console.log('Adicionado ao carrinho:', { product, selectedSize });
    // Futura integração com carrinho real aqui
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group flex flex-col relative"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-50 rounded-2xl mb-4">
        <Link to={`/produto/Decoty-${product.ui_id}`} className="block w-full h-full">
          <img 
            src={`https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop`} 
            alt={product.nome}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </Link>
        
        {/* Heart Icon Overlay */}
        <button className="absolute top-4 right-4 z-20 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 duration-300">
           <Heart size={16} />
        </button>

        {/* Hover Actions Overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none group-hover:pointer-events-auto">
          <div className="flex flex-col gap-4">
            {/* Size Selector */}
            <div className="flex flex-wrap gap-2 justify-center">
              {sizes.length > 0 ? sizes.map(size => (
                <button
                  key={size}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedSize(size);
                  }}
                  className={`w-10 h-8 text-[11px] font-black border transition-all flex items-center justify-center rounded-lg backdrop-blur-md ${
                    selectedSize === size 
                      ? 'bg-white text-black border-white shadow-lg' 
                      : 'bg-black/20 text-white border-white/60 hover:bg-black/40 hover:border-white'
                  }`}
                >
                  {size}
                </button>
              )) : (
                <span className="text-[10px] text-white/60 uppercase font-bold tracking-widest">Tamanho único</span>
              )}
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-md flex items-center justify-center gap-2 text-[10px] uppercase font-black tracking-widest transition-colors shadow-lg"
            >
              <ShoppingBag size={14} />
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>

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
