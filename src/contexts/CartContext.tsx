
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant } from '@/types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('decoty_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('decoty_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.produto_id === variant.id);
      if (existingItem) {
        const newQuantity = existingItem.quantidade + quantity;
        if (newQuantity > variant.quantidade_estoque) {
          return prev;
        }
        return prev.map(item =>
          item.produto_id === variant.id
            ? { ...item, quantidade: newQuantity, subtotal: newQuantity * item.preco_unitario }
            : item
        );
      }

      const getVariantImage = () => {
        if (!product.images || product.images.length === 0) return undefined;
        
        // 1. Destaque da cor
        const mainColorImage = product.images.find(img => img.cor === variant.cor && img.is_main);
        if (mainColorImage) return mainColorImage.url;
        
        // 2. Qualquer da cor
        const colorImage = product.images.find(img => img.cor === variant.cor);
        if (colorImage) return colorImage.url;
        
        // 3. Principal do catálogo
        const defaultImage = product.images.find(img => img.is_default_product_photo);
        if (defaultImage) return defaultImage.url;
        
        // 4. Primeira disponível
        return product.images[0].url;
      };

      const newItem: CartItem = {
        produto_id: variant.id,
        parent_id: product.id,
        nome: product.nome,
        marca: product.marca,
        cor: variant.cor,
        tamanho: variant.tamanho,
        preco_unitario: variant.preco_venda,
        preco_custo: variant.preco_custo,
        quantidade: quantity,
        subtotal: quantity * variant.preco_venda,
        estoque_maximo: variant.quantidade_estoque,
        imagem: getVariantImage()
      };

      return [...prev, newItem];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.produto_id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.produto_id === variantId) {
        if (quantity > item.estoque_maximo) {
            return item;
        }
        return { ...item, quantidade: quantity, subtotal: quantity * item.preco_unitario };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      cartCount,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
