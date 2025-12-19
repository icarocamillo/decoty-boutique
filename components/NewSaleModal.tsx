
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ShoppingCart, Search, Package, User, ArrowRight, Filter, Check, CreditCard, DollarSign, Wallet, AlertCircle, ArrowLeft, Ticket, UserPlus, Gift, Handshake, Info, Minus } from 'lucide-react';
import { Product, CartItem, Client } from '../types';
import { mockService, PaymentDiscounts, PaymentFees } from '../services/mockService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useNavigate } from 'react-router-dom';
import { ClientFormModal } from './ClientFormModal';
import { useAuth } from '../contexts/AuthContext';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleComplete: () => void;
}

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Crediário'];

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSaleComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState<'client' | 'products' | 'payment'>('client');
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [discountsConfig, setDiscountsConfig] = useState<PaymentDiscounts | null>(null);
  const [feesConfig, setFeesConfig] = useState<PaymentFees | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isUnregisteredClient, setIsUnregisteredClient] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [installments, setInstallments] = useState(1);
  const [extraDiscountStr, setExtraDiscountStr] = useState('');
  const [showExtraDiscount, setShowExtraDiscount] = useState(false);
  const [useGiftCard, setUseGiftCard] = useState(false);

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const extraDiscount = parseCurrency(extraDiscountStr);

  const handleExtraDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setExtraDiscountStr(formatted);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLoading(true);
      Promise.all([
        mockService.getProducts(),
        mockService.getClients(),
        mockService.getPaymentDiscounts(),
        mockService.getPaymentFees(),
        mockService.getSuppliers()
      ])
      .then(([productsData, clientsData, discData, feesData, suppliersData]) => {
        setProducts(productsData);
        setClients(clientsData);
        setDiscountsConfig(discData);
        setFeesConfig(feesData);
        const supplierBrands = suppliersData.map(s => s.fantasy_name).filter((name): name is string => !!name && name.trim() !== '');
        setBrands(Array.from(new Set(supplierBrands)).sort());
      })
      .finally(() => setLoading(false));

      setStep('client');
      setCart([]);
      setClientSearchTerm('');
      setProductSearchTerm('');
      setSelectedBrand('');
      setSelectedClient(null);
      setIsUnregisteredClient(false);
      setSelectedPaymentMethod('');
      setInstallments(1);
      setExtraDiscountStr('');
      setShowExtraDiscount(false);
      setUseGiftCard(false);
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients; 
    const lower = clientSearchTerm.toLowerCase();
    return clients.filter(c => 
      c.nome.toLowerCase().includes(lower) || 
      (c.email && c.email.toLowerCase().includes(lower)) ||
      (c.celular && c.celular.includes(lower)) ||
      (c.cpf && c.cpf.includes(lower))
    );
  }, [clients, clientSearchTerm]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setIsUnregisteredClient(false);
  };

  const handleUnregisteredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUnregisteredClient(e.target.checked);
    if (e.target.checked) setSelectedClient(null);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto_id === product.id);
      if (existing) {
        if (existing.quantidade < product.quantidade_estoque) {
          const newQty = existing.quantidade + 1;
          return prev.map(item => item.produto_id === product.id ? { ...item, quantidade: newQty, subtotal: newQty * item.preco_unitario, desconto: 0 } : item);
        }
        return prev;
      }
      return [...prev, {
        produto_id: product.id, nome: product.nome, marca: product.marca, cor: product.cor, tamanho: product.tamanho,
        preco_unitario: product.preco_venda, preco_custo: product.preco_custo, quantidade: 1, subtotal: product.preco_venda,
        estoque_maximo: product.quantidade_estoque, desconto: 0, percentual_desconto: 0
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.produto_id === productId) {
        const newQty = item.quantidade + delta;
        if (newQty > 0 && newQty <= item.estoque_maximo) return { ...item, quantidade: newQty, subtotal: newQty * item.preco_unitario, desconto: 0 };
      }
      return item;
    }));
  };

  const calculateItemDiscount = (item: CartItem, method: string, numInstallments: number) => {
     if (method === 'Crediário') return { desconto: 0, percentual: 0, subtotal: item.quantidade * item.preco_unitario };
     
     let percent = 0;
     const rates = discountsConfig || { pix: 0, debit: 0, credit_spot: 0 };
     if (method === 'Pix') percent = rates.pix / 100;
     else if (method === 'Cartão de Débito') percent = rates.debit / 100;
     else if (method === 'Cartão de Crédito' && numInstallments === 1) percent = rates.credit_spot / 100;
     
     const totalItemPrice = item.quantidade * item.preco_unitario;
     const discountValue = totalItemPrice * percent;
     return { desconto: discountValue, percentual: percent * 100, subtotal: totalItemPrice - discountValue };
  };

  useEffect(() => {
     if (step === 'payment') {
        setCart(prevCart => prevCart.map(item => {
           const calc = calculateItemDiscount(item, selectedPaymentMethod, installments);
           return { ...item, desconto: calc.desconto, subtotal: calc.subtotal, percentual_desconto: calc.percentual };
        }));
     }
  }, [selectedPaymentMethod, installments, step, discountsConfig]);

  const subtotalItensOriginal = cart.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0);
  const totalDescontoPagamento = cart.reduce((acc, item) => acc + (item.desconto || 0), 0);
  const subtotalComDescontoPagamento = subtotalItensOriginal - totalDescontoPagamento;
  const subtotalAfterExtra = Math.max(0, subtotalComDescontoPagamento - extraDiscount);
  const clientBalance = selectedClient?.saldo_vale_presente || 0;
  const giftCardUsedAmount = useGiftCard ? Math.min(clientBalance, subtotalAfterExtra) : 0;
  const finalTotal = Math.max(0, subtotalAfterExtra - giftCardUsedAmount);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedPaymentMethod) return;
    if (selectedPaymentMethod === 'Crediário' && isUnregisteredClient) {
        alert("Crediário disponível apenas para clientes cadastrados.");
        return;
    }
    
    const clientName = isUnregisteredClient ? "Cliente não cadastrado" : selectedClient?.nome || "Desconhecido";
    let feePercent = 0;
    const currentFees = feesConfig || { debit: 0, credit_spot: 0, credit_installment: 0 };
    if (selectedPaymentMethod === 'Cartão de Débito') feePercent = currentFees.debit;
    else if (selectedPaymentMethod === 'Cartão de Crédito') feePercent = installments === 1 ? currentFees.credit_spot : currentFees.credit_installment;
    const feeValue = finalTotal * (feePercent / 100);

    setIsSubmitting(true);
    const success = await mockService.createSale(
       cart, { name: clientName, id: selectedClient?.id, cpf: selectedClient?.cpf }, 
       selectedPaymentMethod, installments, extraDiscount, { porcentagem: feePercent, valor: feeValue },
       `${user?.user_metadata?.name || 'Usuário'} - ${user?.email || ''}`, giftCardUsedAmount
    );
    setIsSubmitting(false);

    if (success) {
      alert("Venda Realizada com sucesso!");
      onSaleComplete();
      onClose();
    } else {
      alert("Erro ao finalizar a venda.");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.quantidade_estoque > 0 && 
      (p.nome.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
       p.cor.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
       p.id_decoty.toLowerCase().includes(productSearchTerm.toLowerCase())) &&
      (!selectedBrand || p.marca === selectedBrand)
    ).sort((a, b) => b.quantidade_estoque - a.quantidade_estoque);
  }, [products, productSearchTerm, selectedBrand]);

  const getPaymentDiscountValue = (method: string) => {
    if (!discountsConfig) return 0;
    if (method === 'Pix') return discountsConfig.pix;
    if (method === 'Cartão de Débito') return discountsConfig.debit;
    if (method === 'Cartão de Crédito' && installments === 1) return discountsConfig.credit_spot;
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'client' && <button onClick={() => setStep(step === 'payment' ? 'products' : 'client')} className="p-2 -ml-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500"><ArrowLeft size={24} /></button>}
            <div className="bg-emerald-600 p-2 rounded-lg text-white"><ShoppingCart size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-zinc-800 dark:text-white">Nova Venda</h2>
              <p className="text-sm text-zinc-500">{step === 'client' ? 'Identificar Cliente' : step === 'products' ? `Cliente: ${selectedClient?.nome || 'Balcão'}` : 'Pagamento'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {step === 'client' && (
            <div className="flex-1 p-6 flex flex-col items-center gap-4 bg-zinc-50 dark:bg-zinc-950/50">
              <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input type="text" placeholder="Buscar cliente..." className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} disabled={isUnregisteredClient} />
                </div>
                {!isUnregisteredClient && (
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                    {filteredClients.map(c => (
                      <div key={c.id} onClick={() => handleSelectClient(c)} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${selectedClient?.id === c.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-500" /></div><span className="font-bold text-zinc-800 dark:text-zinc-200">{c.nome}</span></div>
                        {selectedClient?.id === c.id && <Check className="text-emerald-600" size={18} />}
                      </div>
                    ))}
                    {filteredClients.length === 0 && <p className="text-center py-4 text-zinc-400 text-sm italic">Nenhum cliente encontrado.</p>}
                  </div>
                )}
                <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-700">
                  <input type="checkbox" checked={isUnregisteredClient} onChange={handleUnregisteredChange} className="w-5 h-5 text-emerald-600 rounded border-zinc-300 bg-transparent" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Venda Balcão (Não registrado)</span>
                </label>
                <Button variant="success" className="w-full py-4 text-lg h-auto" disabled={!selectedClient && !isUnregisteredClient} onClick={() => setStep('products')}>Avançar para produtos <ArrowRight size={20} className="ml-2" /></Button>
              </div>
            </div>
          )}

          {step === 'products' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-4 bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input type="text" placeholder="Buscar produtos..." className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} />
                  </div>
                  <div className="relative">
                    <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Todas Marcas</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <Filter className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-zinc-50 dark:bg-zinc-950/50 custom-scrollbar">
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => addToCart(p)} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-400 dark:hover:border-emerald-600 cursor-pointer shadow-sm transition-all group">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{p.nome}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.marca} • {p.tamanho} • {p.cor}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <Badge variant={p.quantidade_estoque <= 2 ? 'warning' : 'success'}>{p.quantidade_estoque} un</Badge>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(p.preco_venda)}</span>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-center py-8 text-zinc-400 italic">Nenhum produto encontrado.</p>}
                </div>
              </div>
              <div className="w-80 bg-zinc-100 dark:bg-zinc-950 flex flex-col border-l border-zinc-200 dark:border-zinc-800 shadow-xl">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                  <ShoppingCart size={18} /> Carrinho ({cart.length})
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {cart.map(item => (
                    <div key={item.produto_id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.nome}</p>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 shrink-0">{formatCurrency(item.subtotal)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                          <button onClick={() => updateQuantity(item.produto_id, -1)} className="px-2 h-7 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300">-</button>
                          <span className="w-8 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">{item.quantidade}</span>
                          <button onClick={() => updateQuantity(item.produto_id, 1)} className="px-2 h-7 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300">+</button>
                        </div>
                        <button onClick={() => setCart(cart.filter(i => i.produto_id !== item.produto_id))} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
                    <span>Total Parcial</span>
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(finalTotal)}</span>
                  </div>
                  <Button variant="success" className="w-full h-12" onClick={() => setStep('payment')} disabled={cart.length === 0}>Avançar para pagamento</Button>
                </div>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-6 bg-zinc-50 dark:bg-zinc-950/30 overflow-y-auto space-y-3 custom-scrollbar">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"><Package size={18} /> Resumo do Pedido</h3>
                {cart.map(item => (
                  <div key={item.produto_id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-start shadow-sm transition-all hover:shadow-md">
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{item.nome}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                      {item.percentual_desconto && item.percentual_desconto > 0 ? (
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 w-fit px-1.5 rounded mt-1">Desconto Pagamento: -{Math.round(item.percentual_desconto)}%</p>
                      ) : null}
                    </div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
              <div className="w-96 bg-white dark:bg-zinc-900 p-8 overflow-y-auto space-y-6 border-l border-zinc-200 dark:border-zinc-800 custom-scrollbar">
                <h3 className="font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100"><Wallet size={20} /> Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map(method => {
                    const isDisabled = method === 'Crediário' && isUnregisteredClient;
                    const discount = getPaymentDiscountValue(method);
                    
                    return (
                      <button 
                        key={method} 
                        disabled={isDisabled}
                        onClick={() => { setSelectedPaymentMethod(method); setUseGiftCard(false); }} 
                        className={`p-4 rounded-xl border text-sm font-medium flex flex-col items-center gap-2 transition-all relative ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : selectedPaymentMethod === method ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
                        {method === 'Pix' && <span className="text-4xl">💠</span>}
                        {method.includes('Cartão') && <CreditCard size={30} />}
                        {method === 'Dinheiro' && <DollarSign size={30} />}
                        {method === 'Crediário' && <Handshake size={30} />}
                        <span>{method}</span>
                        {discount > 0 && !isDisabled && (
                          <span className="absolute -top-2 -right-1 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">-{discount}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedPaymentMethod === 'Crediário' && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs flex gap-2 border border-blue-100 dark:border-blue-900/30">
                        <Info size={16} className="shrink-0" />
                        <span>O valor será lançado como saldo devedor para o cliente. Descontos automáticos desabilitados.</span>
                    </div>
                )}

                {selectedPaymentMethod === 'Cartão de Crédito' && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase">Parcelamento</label>
                    <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500">
                      {[1,2,3,4,5,6].map(i => <option key={i} value={i}>{i}x sem juros</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button onClick={() => setShowExtraDiscount(!showExtraDiscount)} className={`flex items-center gap-2 text-xs font-bold transition-colors ${showExtraDiscount ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
                        <Ticket size={14} /> {showExtraDiscount ? 'Remover Desconto Extra (Negociação)' : 'Adicionar Desconto Extra (Negociação)'}
                    </button>
                    {showExtraDiscount && (
                        <div className="relative animate-fade-in">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                           <input type="text" inputMode="numeric" value={extraDiscountStr} onChange={handleExtraDiscountChange} className="w-full pl-9 pr-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="0,00" />
                        </div>
                    )}

                    {selectedClient && selectedClient.saldo_vale_presente && selectedClient.saldo_vale_presente > 0 ? (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1"><Gift size={14} /> Vale Presente Disponível</span>
                                <span className="font-bold text-amber-800 dark:text-amber-300">{formatCurrency(selectedClient.saldo_vale_presente)}</span>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={useGiftCard} onChange={(e) => setUseGiftCard(e.target.checked)} className="w-4 h-4 text-amber-600 rounded border-amber-300 bg-transparent" />
                                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">Usar saldo para abater valor</span>
                            </label>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400"><span>Subtotal</span><span>{formatCurrency(subtotalItensOriginal)}</span></div>
                  {totalDescontoPagamento > 0 && <div className="flex justify-between text-green-600 dark:text-green-400"><span>Descontos Pagamento</span><span>- {formatCurrency(totalDescontoPagamento)}</span></div>}
                  {extraDiscount > 0 && <div className="flex justify-between text-blue-600 dark:text-blue-400"><span>Desconto Extra</span><span>- {formatCurrency(extraDiscount)}</span></div>}
                  {giftCardUsedAmount > 0 && <div className="flex justify-between text-amber-600 dark:text-amber-500"><span>Vale Presente</span><span>- {formatCurrency(giftCardUsedAmount)}</span></div>}
                  <div className="flex justify-between items-end pt-4 border-t border-zinc-100 dark:border-zinc-800"><span className="font-medium text-lg text-zinc-800 dark:text-zinc-200">Total Final</span><span className="text-3xl font-bold text-zinc-900 dark:text-white">{formatCurrency(finalTotal)}</span></div>
                  <Button variant="success" className="w-full h-14 text-lg mt-6 shadow-lg shadow-emerald-900/20" onClick={handleCheckout} disabled={isSubmitting || !selectedPaymentMethod}>{isSubmitting ? 'Processando...' : 'Finalizar Venda'}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
