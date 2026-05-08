import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Phone, AlertCircle, X, CreditCard, Banknote, Smartphone, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useData } from '@/contexts/DataContext';

type PaymentMethod = 'pix' | 'credito' | 'debito';

export const CheckoutPage: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { paymentDiscounts } = useData();
  const [stockError, setStockError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [installments, setInstallments] = useState(1);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const discountInfo = useMemo(() => {
    if (!paymentDiscounts) return { percent: 0, value: 0 };

    let percent = 0;
    if (paymentMethod === 'pix') percent = paymentDiscounts.pix || 0;
    else if (paymentMethod === 'debito') percent = paymentDiscounts.debit || 0;
    else if (paymentMethod === 'credito' && installments === 1) percent = paymentDiscounts.credit_spot || 0;

    const value = cartTotal * (percent / 100);
    return { percent, value };
  }, [paymentMethod, paymentDiscounts, cartTotal, installments]);

  const finalTotal = cartTotal - discountInfo.value;

  const handleCheckoutWhatsApp = () => {
    const phone = "5519997526144";
    const businessName = "Decoty Boutique";

    let message = `Olá ${businessName}! \n\nGostaria de finalizar meu pedido:\n\n`;

    cart.forEach(item => {
      message += `• *${item.nome}*\n  Cor: ${item.cor} | Tam: ${item.tamanho}\n  Qtd: ${item.quantidade}x ${formatCurrency(item.preco_unitario)}\n\n`;
    });

    const paymentLabel = {
      pix: 'PIX',
      credito: installments === 1 ? 'Cartão de Crédito (À Vista)' : `Cartão de Crédito (${installments}x)`,
      debito: 'Cartão de Débito'
    }[paymentMethod];

    message += `*Subtotal:* ${formatCurrency(cartTotal)}\n`;
    if (discountInfo.value > 0) {
      message += `*Desconto (${discountInfo.percent}%):* -${formatCurrency(discountInfo.value)}\n`;
    }
    message += `*Método de Pagamento:* ${paymentLabel}\n`;
    if (paymentMethod === 'credito' && installments > 1) {
      message += `*Parcelamento:* ${installments}x de ${formatCurrency(finalTotal / installments)}\n`;
    }
    message += `*Total Final: ${formatCurrency(finalTotal)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const handleUpdateQuantity = (variantId: string, newQty: number, item: any) => {
    if (newQty > item.estoque_maximo) {
      setStockError(`Desculpe! O item "${item.nome}" possui apenas ${item.estoque_maximo} unidades em estoque.`);
      return;
    }
    updateQuantity(variantId, newQty);
  };

  return (
    <div className="py-12 bg-white min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 sm:px-6">

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-zinc-100 pb-12">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 text-emerald-600 mb-3">
                <ShoppingBag size={20} />
                <span className="text-[10px] uppercase font-black tracking-[0.3em]">Finalização</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-serif text-zinc-950 mb-4">Seu pedido</h1>
              <p className="text-zinc-500 text-lg leading-relaxed">
                Confira os itens selecionados e finalize seu pedido para atendimento via WhatsApp.
              </p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-200">
                <ShoppingBag size={48} />
              </div>
              <h2 className="text-2xl font-serif text-zinc-900 mb-4">Seu pedido está vazio</h2>
              <p className="text-zinc-500 mb-8">Navegue pelas nossas coleções e encontre o seu look perfeito.</p>
              <Link to="/catalogo">
                <Button size="lg" className="rounded-2xl bg-zinc-900 px-10">Explorar Loja</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Item List */}
              <div className="lg:col-span-8 space-y-12">
                <div className="space-y-8">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-black">01</span>
                    <h2 className="text-xl font-serif font-black text-zinc-900 uppercase">Confira seu pedido</h2>
                  </div>
                  {cart.map((item) => (
                    <motion.div
                      key={item.produto_id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative flex flex-col sm:flex-row gap-6 p-6 rounded-3xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50 transition-all duration-500"
                    >
                      {/* Image container with blur effect on hover */}
                      <div className="relative w-full sm:w-40 aspect-[3/4] rounded-2xl overflow-hidden shrink-0 shadow-sm">
                        <img
                          src={`https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400`}
                          alt={item.nome}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 mb-1 block">
                              {item.marca}
                            </span>
                            <h3 className="text-xl font-serif font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors">
                              {item.nome}
                            </h3>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.produto_id)}
                            className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-all shadow-sm active:scale-95"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                          <div className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-600 shadow-sm">
                            TAM: <span className="text-zinc-900">{item.tamanho}</span>
                          </div>
                          <div className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-600 shadow-sm">
                            COR: <span className="text-zinc-900">{item.cor}</span>
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100/50">
                          <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-2xl p-1.5 shadow-sm">
                            <button
                              onClick={() => handleUpdateQuantity(item.produto_id, item.quantidade - 1, item)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-50 rounded-xl transition-all text-zinc-400 hover:text-zinc-900"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-black text-zinc-900 leading-none">{item.quantidade}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.produto_id, item.quantidade + 1, item)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-50 rounded-xl transition-all text-zinc-400 hover:text-zinc-900"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-zinc-900">{formatCurrency(item.subtotal)}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatCurrency(item.preco_unitario)} / un</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="sticky top-32 space-y-8">
                  {/* Payment Method Selection - Now in Black Card */}
                  <Card className="!p-0 border border-white/5 bg-zinc-950/80 backdrop-blur-xl text-white rounded-[2rem] shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12" />

                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center text-xs font-black shrink-0">02</div>
                        <div>
                          <h3 className="text-lg font-serif font-black text-white uppercase tracking-tight leading-none">Escolha o pagamento</h3>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">de sua preferência</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 relative z-10">
                        {[
                          { id: 'pix', label: 'PIX', icon: () => <span className="text-lg">💠</span>, desc: paymentDiscounts?.pix ? `${paymentDiscounts.pix}% de desc.` : 'Instantâneo' },
                          { id: 'credito', label: 'Crédito', icon: CreditCard, desc: installments === 1 && paymentDiscounts?.credit_spot ? `${paymentDiscounts.credit_spot}% de desc. à vista` : 'Até 5x s/ juros' },
                          { id: 'debito', label: 'Débito', icon: CreditCard, desc: paymentDiscounts?.debit ? `${paymentDiscounts.debit}% de desc.` : 'À vista' }
                        ].map((method) => (
                          <div
                            key={method.id}
                            onClick={() => {
                              setPaymentMethod(method.id as PaymentMethod);
                              if (method.id !== 'credito') setInstallments(1);
                            }}
                            className={`group relative p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden cursor-pointer ${paymentMethod === method.id
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50'
                              }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${paymentMethod === method.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-800 text-zinc-500 group-hover:text-white'
                                }`}>
                                {typeof method.icon === 'function' ? <method.icon /> : <method.icon size={20} strokeWidth={1.5} />}
                              </div>

                              <div className="flex-1">
                                <p className={`font-black uppercase tracking-widest text-[10px] mb-0.5 transition-colors ${paymentMethod === method.id ? 'text-emerald-400' : 'text-zinc-300'
                                  }`}>{method.label}</p>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter leading-none">{method.desc}</p>
                              </div>
                            </div>

                            {/* Installment Selector for Credit */}
                            {method.id === 'credito' && paymentMethod === 'credito' && (
                              <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-5 gap-1.5">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                      key={n}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInstallments(n);
                                      }}
                                      className={`h-9 rounded-lg border text-[10px] font-black transition-all ${installments === n
                                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'border-zinc-700 bg-zinc-800/80 text-zinc-500 hover:text-white'
                                        }`}
                                    >
                                      {n}x
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest text-center">
                                  {installments === 1
                                    ? `Total: ${formatCurrency(finalTotal)} à vista`
                                    : `${installments}x de ${formatCurrency(finalTotal / installments)}`}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-4">
                    <Card className="!p-0 border border-white/5 bg-zinc-950/80 backdrop-blur-xl text-white rounded-[2rem] shadow-2xl relative overflow-hidden group">
                      <div className="p-8">
                        {/* Step Title Header inside card */}
                        <div className="flex items-center gap-3 mb-8 relative z-10">
                          <span className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center text-xs font-black shrink-0">03</span>
                          <h3 className="text-lg font-serif font-black text-white uppercase leading-none">Finalização do pedido</h3>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-emerald-500/20" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-zinc-800/50 rounded-full blur-3xl -ml-16 -mb-16" />

                        <div className="space-y-4 mb-8 relative z-10">
                          <div className="flex justify-between text-zinc-400 text-sm">
                            <span className="uppercase tracking-widest font-bold text-[10px]">Subtotal</span>
                            <span className="font-bold">{formatCurrency(cartTotal)}</span>
                          </div>

                          {discountInfo.value > 0 && (
                            <div className="flex justify-between text-emerald-400 text-sm animate-in fade-in slide-in-from-right-2 duration-500">
                              <span className="uppercase tracking-widest font-black text-[10px] flex items-center gap-1.5">
                                <Tag size={12} strokeWidth={3} />
                                Desconto ({discountInfo.percent}%)
                              </span>
                              <span className="font-black">-{formatCurrency(discountInfo.value)}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-zinc-400 text-sm">
                            <span className="uppercase tracking-widest font-bold text-[10px]">Envio</span>
                            <span className="text-emerald-400 font-black tracking-widest text-[10px] uppercase">A combinar</span>
                          </div>
                          <div className="pt-4 border-t border-zinc-800" />
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-2">
                            <span className="uppercase tracking-[0.2em] font-black text-[10px] text-zinc-400 lg:mb-1">Total Estimado:</span>
                            <span className="text-2xl xl:text-3xl font-black text-emerald-400 leading-none">{formatCurrency(finalTotal)}</span>
                          </div>
                        </div>

                        <Button
                          className="w-full h-16 rounded-[1.25rem] bg-zinc-800 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-[11px] transition-all relative z-10 flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] border-none"
                          onClick={handleCheckoutWhatsApp}
                        >
                          <Phone size={18} fill="currentColor" />
                          Comprar pelo WhatsApp
                        </Button>

                        <p className="mt-6 text-[10px] text-zinc-400 text-center leading-relaxed font-medium uppercase tracking-widest px-4">
                          Você será redirecionado para o WhatsApp da Decoty para finalizar seu atendimento.
                        </p>
                      </div>
                    </Card>
                  </div>

                  <Link to="/catalogo" className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-all p-4 group">
                    <ArrowRight size={16} className="rotate-180 transition-transform group-hover:-translate-x-1" />
                    Continuar Escolhendo
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Error Modal */}
      <AnimatePresence>
        {stockError && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStockError(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 sm:p-10"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-serif font-black text-zinc-900 mb-4">Estoque insuficiente</h3>
                <p className="text-zinc-500 leading-relaxed mb-8">
                  {stockError}
                </p>
                <Button
                  onClick={() => setStockError(null)}
                  className="w-full h-14 rounded-2xl bg-zinc-900 text-white font-bold"
                >
                  Entendido
                </Button>
              </div>
              <button
                onClick={() => setStockError(null)}
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
