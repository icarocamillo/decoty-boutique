import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShoppingBag, CreditCard, Truck, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Carrinho, 2: Checkout, 3: Sucesso

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Mock cart for visualization
  const cartItems = [
    { id: '1', name: 'Vestido Midi Floral', price: 189.90, quantity: 1, color: 'Azul', size: 'M' },
    { id: '2', name: 'Blusa de Seda', price: 129.90, quantity: 1, color: 'Branco', size: 'P' },
  ];

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = 0; // Grátis
  const total = subtotal + shipping;

  return (
    <div className="py-12 bg-zinc-50 min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 sm:px-6">
        
        {/* Stepper */}
        <div className="max-w-3xl mx-auto mb-12 flex items-center justify-between">
          {[
            { id: 1, name: 'Carrinho' },
            { id: 2, name: 'Pagamento' },
            { id: 3, name: 'Confirmação' }
          ].map((s, idx) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-2">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                   step >= s.id ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'
                 }`}>
                   {step > s.id ? <CheckCircle2 size={20} /> : s.id}
                 </div>
                 <span className={`text-[10px] uppercase font-black tracking-widest ${
                   step >= s.id ? 'text-zinc-900' : 'text-zinc-400'
                 }`}>{s.name}</span>
              </div>
              {idx < 2 && (
                <div className={`flex-1 h-px mb-6 ${step > s.id ? 'bg-zinc-900' : 'bg-zinc-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
            {/* Cart List */}
            <div className="lg:col-span-8 space-y-4">
              <h2 className="text-2xl font-serif text-zinc-950 mb-6">Seu Carrinho</h2>
              {cartItems.map(item => (
                <Card key={item.id} className="p-4 flex gap-4 items-center">
                  <div className="w-20 h-24 bg-zinc-100 rounded-lg overflow-hidden shrink-0">
                    <img src="https://images.unsplash.com/photo-1539109132314-3475961ecf4c?q=80&w=200" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-zinc-900">{item.name}</h3>
                    <p className="text-xs text-zinc-500 mb-2">{item.color} / {item.size}</p>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                          <button className="w-8 h-8 flex items-center justify-center hover:bg-zinc-50">-</button>
                          <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                          <button className="w-8 h-8 flex items-center justify-center hover:bg-zinc-50">+</button>
                       </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-zinc-900">{formatCurrency(item.price)}</p>
                    <button className="text-[10px] uppercase font-bold text-red-500 mt-2 hover:underline">Remover</button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-4">
               <Card className="p-6 sticky top-24 border-zinc-200 shadow-xl">
                  <h3 className="text-lg font-serif mb-6">Resumo do Pedido</h3>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                      <span>Frete</span>
                      <span className="text-emerald-600 font-bold">Grátis</span>
                    </div>
                    <div className="h-px bg-zinc-100" />
                    <div className="flex justify-between text-lg font-black text-zinc-900">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full h-14 rounded-2xl bg-zinc-900 text-white hover:bg-black font-bold uppercase tracking-widest text-xs"
                    onClick={() => setStep(2)}
                  >
                    Finalizar Compra
                  </Button>
                  <Link to="/" className="block text-center mt-4 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors">
                    Continuar Comprando
                  </Link>
               </Card>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-4xl mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Delivery */}
                <div className="space-y-6">
                   <h3 className="text-xl font-serif flex items-center gap-2">
                     <MapPin size={20} /> Endereço de Entrega
                   </h3>
                   <div className="grid grid-cols-1 gap-4">
                      <input type="text" placeholder="CEP" className="bg-white border p-4 rounded-xl text-sm" />
                      <input type="text" placeholder="Rua" className="bg-white border p-4 rounded-xl text-sm" />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Número" className="bg-white border p-4 rounded-xl text-sm" />
                        <input type="text" placeholder="Apto/Bloco" className="bg-white border p-4 rounded-xl text-sm" />
                      </div>
                      <input type="text" placeholder="Bairro" className="bg-white border p-4 rounded-xl text-sm" />
                      <input type="text" placeholder="Cidade" className="bg-white border p-4 rounded-xl text-sm" />
                   </div>
                </div>

                {/* Payment */}
                <div className="space-y-6">
                   <h3 className="text-xl font-serif flex items-center gap-2">
                     <CreditCard size={20} /> Método de Pagamento
                   </h3>
                   <div className="space-y-3">
                      <div className="p-4 rounded-2xl border-2 border-zinc-900 bg-white flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-3">
                           <CreditCard size={20} />
                           <div>
                              <p className="text-sm font-bold">Cartão de Crédito</p>
                              <p className="text-[10px] text-zinc-500 uppercase">Até 6x sem juros</p>
                           </div>
                        </div>
                        <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                           <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl border border-zinc-200 bg-white flex items-center justify-between cursor-pointer hover:border-zinc-400 transition-colors">
                        <div className="flex items-center gap-3">
                           <ShoppingBag size={20} />
                           <div>
                              <p className="text-sm font-bold">Pix</p>
                              <p className="text-[10px] text-zinc-500 uppercase">Aprovação imediata</p>
                           </div>
                        </div>
                        <div className="w-5 h-5 rounded-full border border-zinc-200" />
                      </div>
                   </div>

                   <Button 
                    className="w-full h-14 rounded-2xl bg-zinc-900 text-white hover:bg-black font-bold uppercase tracking-widest text-xs mt-8"
                    onClick={() => setStep(3)}
                  >
                    Confirmar e Pagar
                  </Button>
                </div>
             </div>
          </div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center py-20"
          >
             <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} />
             </div>
             <h2 className="text-4xl font-serif text-zinc-950 mb-4">Pedido Recebido!</h2>
             <p className="text-zinc-600 mb-10 leading-relaxed">
               Obrigada por comprar na Decoty Boutique. <br />
               Seu pedido <strong>#12345</strong> foi confirmado e já estamos preparando tudo com muito carinho.
             </p>
             <div className="space-y-4">
                <Button className="w-full h-12 rounded-xl bg-zinc-900 text-white" onClick={() => navigate('/')}>
                   Continuar Comprando
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-xl border-zinc-200" onClick={() => navigate('/my-account')}>
                   Ver Meus Pedidos
                </Button>
             </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};
