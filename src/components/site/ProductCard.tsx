
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-xl overflow-hidden border border-zinc-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
    >
      <Link to={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-zinc-100">
        <img 
          src={`https://images.unsplash.com/photo-1539109132314-3475961ecf4c?q=80&w=600&auto=format&fit=crop`} 
          alt={product.nome}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Badge de Marca */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-zinc-900 rounded-full shadow-sm">
            {product.marca}
          </span>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="mb-2">
           <h3 className="text-zinc-900 font-semibold text-sm line-clamp-1">{product.nome}</h3>
           <p className="text-zinc-500 text-xs">{product.categoria}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-zinc-400 uppercase font-bold">A partir de</p>
            <p className="text-lg font-black text-zinc-900 leading-none">
              {formatCurrency(minPrice)}
            </p>
          </div>
          
          <Link to={`/product/${product.id}`}>
            <Button size="sm" className="rounded-full px-4 h-9 shadow-sm">
              Ver
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
