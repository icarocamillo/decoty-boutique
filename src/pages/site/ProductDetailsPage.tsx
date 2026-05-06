import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShoppingBag, ChevronLeft, Star, ShieldCheck, Truck, RotateCcw } from 'lucide-react';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, isLoading } = useData();

  const product = useMemo(() => {
    return products.find(p => p.id === id);
  }, [id, products]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const selectedVariant = useMemo(() => {
    if (!product || !product.variants) return null;
    if (selectedVariantId) return product.variants.find(v => v.id === selectedVariantId);
    return product.variants[0];
  }, [product, selectedVariantId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-zinc-100 rounded-3xl" />
          <div className="space-y-6">
            <div className="h-10 bg-zinc-100 rounded-lg w-2/3" />
            <div className="h-6 bg-zinc-100 rounded-lg w-1/3" />
            <div className="h-32 bg-zinc-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-40 text-center">
        <h2 className="text-2xl font-serif mb-4">Produto não encontrado</h2>
        <Button onClick={() => navigate('/')}>Voltar para a Home</Button>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const colors = Array.from(new Set(product.variants?.map(v => v.cor) || []));
  const sizes = Array.from(new Set(product.variants?.map(v => v.tamanho) || []));

  return (
    <div className="pb-20">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors py-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Gallery Placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-100 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1539109132314-3475961ecf4c?q=80&w=1000&auto=format&fit=crop" 
                alt={product.nome}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbs placeholder */}
            <div className="grid grid-cols-4 gap-4">
               {[1,2,3,4].map(n => (
                 <div key={n} className="aspect-square rounded-xl bg-zinc-100 overflow-hidden cursor-pointer border-2 border-transparent hover:border-zinc-900 transition-colors">
                    <img src="https://images.unsplash.com/photo-1539109132314-3475961ecf4c?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover opacity-60" />
                 </div>
               ))}
            </div>
          </motion.div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="rounded-full border-zinc-200 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                  {product.marca}
                </Badge>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <span className="text-zinc-400 text-xs ml-1">(4.9)</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-zinc-950 mb-4">{product.nome}</h1>
              <p className="text-3xl font-black text-zinc-900">
                {selectedVariant ? formatCurrency(selectedVariant.preco_venda) : 'Preço sob consulta'}
              </p>
            </div>

            <div className="space-y-8">
              {/* Cores */}
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-3">Cores Disponíveis</span>
                <div className="flex flex-wrap gap-3">
                  {colors.map(cor => (
                    <button 
                      key={cor}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                        selectedVariant?.cor === cor 
                          ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-900'
                      }`}
                      onClick={() => {
                        const variant = product.variants?.find(v => v.cor === cor);
                        if (variant) setSelectedVariantId(variant.id);
                      }}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tamanhos */}
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-3">Tamanho</span>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(tamanho => {
                    const variant = product.variants?.find(v => v.tamanho === tamanho && (selectedVariant?.cor === v.cor));
                    const isOutOfStock = variant ? variant.quantidade_estoque <= 0 : true;

                    return (
                      <button 
                        key={tamanho}
                        disabled={isOutOfStock}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold border transition-all ${
                          selectedVariant?.tamanho === tamanho 
                            ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                            : isOutOfStock 
                              ? 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-900'
                        }`}
                        onClick={() => {
                          if (variant) setSelectedVariantId(variant.id);
                        }}
                      >
                        {tamanho}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 block mb-3">Sobre a Peça</span>
                <p className="text-zinc-600 leading-relaxed">
                  {product.descricao || 'Nenhuma descrição disponível para este produto.'}
                </p>
              </div>

              {/* Add to Cart */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="flex-1 h-14 rounded-2xl bg-zinc-900 text-white hover:bg-black font-bold flex items-center gap-3 shadow-xl"
                  disabled={!selectedVariant || selectedVariant.quantidade_estoque <= 0}
                >
                  <ShoppingBag size={20} />
                  Adicionar ao Carrinho
                </Button>
                <Button variant="outline" size="lg" className="h-14 w-14 rounded-2xl border-zinc-200 flex items-center justify-center p-0">
                   <Star size={20} className="text-zinc-400 hover:text-amber-500 transition-colors" />
                </Button>
              </div>

              {/* Perks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-zinc-100">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900">
                       <Truck size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-zinc-900">Frete Grátis</p>
                       <p className="text-[10px] text-zinc-500">Acima de R$ 300</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900">
                       <RotateCcw size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-zinc-900">Troca Fácil</p>
                       <p className="text-[10px] text-zinc-500">Até 30 dias</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-900">
                       <ShieldCheck size={18} />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-zinc-900">Pagamento Seguro</p>
                       <p className="text-[10px] text-zinc-500">Cartão ou PIX</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
