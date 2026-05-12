import React from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { useData } from '@/contexts/DataContext';
import { ProductCard } from '@/components/site/ProductCard';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const FavoritesPage: React.FC = () => {
  const { products, favoriteIds } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const favoriteProducts = products.filter(p => favoriteIds.includes(p.id));

  if (!user) {
    return (
      <div className="py-20 flex flex-col items-center justify-center container mx-auto px-4">
        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6">
          <User size={40} />
        </div>
        <h2 className="text-2xl font-serif text-zinc-950 mb-2">Acesso Restrito</h2>
        <p className="text-zinc-500 mb-8 text-center max-w-md">
          Você precisa estar logada para salvar seus produtos favoritos e acessá-los em qualquer dispositivo.
        </p>
        <Link to="/entrar" className="bg-zinc-900 text-white px-8 py-3 rounded-full font-bold hover:bg-black transition-colors">
          Entrar na Conta
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 bg-zinc-50 min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate('/minha-conta')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-3xl font-serif text-zinc-950">Meus Favoritos</h2>
              <p className="text-sm text-zinc-500">Peças que você amou e quer guardar.</p>
            </div>
          </div>

          {favoriteProducts.length === 0 ? (
            <Card className="p-16 text-center border-none shadow-sm flex flex-col items-center justify-center bg-white rounded-3xl">
              <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200 mb-6">
                <Heart size={48} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Sua lista está vazia</h3>
              <p className="text-zinc-500 mb-8 max-w-sm">
                Navegue pela nossa vitrine e clique no coração para salvar as peças que você mais gostar.
              </p>
              <Link to="/catalogo" className="bg-zinc-900 text-white px-10 py-4 rounded-full font-bold hover:bg-black transition-colors shadow-lg">
                Explorar Vitrine
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {favoriteProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper for check if is logged in
import { User } from 'lucide-react';
