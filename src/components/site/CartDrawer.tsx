
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Link } from 'react-router-dom';

export const CartDrawer: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount, isCartOpen, setIsCartOpen } = useCart();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 text-white p-2 rounded-xl">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-zinc-900">Seu pedido</h2>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    {cartCount === 1 ? '1 item' : `${cartCount} itens`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-200">
                    <ShoppingBag size={40} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 font-medium">Seu pedido está vazio</p>
                    <p className="text-xs text-zinc-400">Que tal explorar nossas novidades?</p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 px-8 py-3 bg-zinc-900 text-white text-[11px] uppercase font-black tracking-widest rounded-full hover:bg-black transition-colors"
                  >
                    Ver Coleções
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map((item) => (
                    <motion.div 
                      key={item.produto_id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 group"
                    >
                      <div className="w-24 aspect-[3/4] bg-zinc-50 rounded-xl overflow-hidden shrink-0">
                        <img 
                          src={`https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=300`} 
                          alt={item.nome}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <div className="flex-1 flex flex-col pt-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">{item.marca}</p>
                            <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors">{item.nome}</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Tamanho: {item.tamanho} • Cor: {item.cor}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.produto_id)}
                            className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-zinc-50 rounded-lg p-1">
                            <button 
                              onClick={() => updateQuantity(item.produto_id, item.quantidade - 1)}
                              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-500"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-zinc-800">{item.quantidade}</span>
                            <button 
                              onClick={() => updateQuantity(item.produto_id, item.quantidade + 1)}
                              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-zinc-500"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-zinc-900">{formatCurrency(item.subtotal)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-500 text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-900 font-bold text-xl">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                </div>
                
                <p className="text-[10px] text-zinc-400 text-center uppercase tracking-widest font-bold">
                  Descontos calculados no checkout
                </p>

                <div className="flex flex-col gap-3">
                  <Link
                    to="/finalizar-pedido"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-xs uppercase font-black tracking-[0.2em] transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                  >
                    Finalizar Pedido
                    <ArrowRight size={18} />
                  </Link>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="w-full bg-transparent hover:bg-zinc-100 text-zinc-600 py-3 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all"
                  >
                    Continuar Comprando
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
