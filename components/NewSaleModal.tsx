
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ShoppingCart, Search, Package, User, ArrowRight, Filter, Check, CreditCard, DollarSign, Wallet, AlertCircle, ArrowLeft, Ticket, UserPlus, Gift, Handshake, Info, Minus, RefreshCw, List } from 'lucide-react';
import { Product, CartItem, Client } from '../types';
import { backendService, PaymentDiscounts, PaymentFees } from '../services/backendService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useNavigate } from 'react-router-dom';
import { ClientFormModal } from './ClientFormModal';
import { useAuth } from '../contexts/AuthContext';
import { formatProductId } from '../utils';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleComplete: () => void;
}

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Crediário'];
const CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas', 'Pulseira', 'Brinco', 'Colar'];

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSaleComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [step, setStep] = useState<'client' | 'products' | 'payment'>('client');
  const [activeTab, setActiveTab] = useState<'search' | 'cart'>('search'); // Nova aba para mobile
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [discountsConfig, setDiscountsConfig] = useState<PaymentDiscounts | null>(null);
  const [feesConfig, setFeesConfig] = useState<PaymentFees | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isUnregisteredClient, setIsUnregisteredClient] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Payment
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
        backendService.getProducts(),
        backendService.getClients(),
        backendService.getPaymentDiscounts(),
        backendService.getPaymentFees(),
        backendService.getSuppliers()
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
      setActiveTab('search');
      setCart([]);
      setClientSearchTerm('');
      setProductSearchTerm('');
      setSelectedBrand('');
      setSelectedCategory('');
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

  const updateQuantity = (productId: string, newQtyStr: string) => {
    const newQty = parseInt(newQtyStr) || 0;
    setCart(prev => prev.map(item => {
      if (item.produto_id === productId) {
        const validatedQty = Math.max(0, Math.min(newQty, item.estoque_maximo));
        return { ...item, quantidade: validatedQty, subtotal: validatedQty * item.preco_unitario, desconto: 0 };
      }
      return item;
    }));
  };

  const adjustQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.produto_id === productId) {
        const newQty = Math.max(0, Math.min(item.quantidade + delta, item.estoque_maximo));
        return { ...item, quantidade: newQty, subtotal: newQty * item.preco_unitario, desconto: 0 };
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

    const sellerId = user?.id || '';

    setIsSubmitting(true);
    const success = await backendService.createSale(
       cart, { name: clientName, id: selectedClient?.id, cpf: selectedClient?.cpf }, 
       selectedPaymentMethod, installments, extraDiscount, { porcentagem: feePercent, valor: feeValue },
       sellerId, giftCardUsedAmount
    );
    setIsSubmitting(false);

    if (success) {
      alert("Venda Realizada com sucesso!");
      onSaleComplete();
      onClose();
    } else {
      alert("Erro ao finalizar a venda. Verifique se o seu perfil de usuário está ativo.");
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm && !selectedBrand && !selectedCategory) return [];
    
    return products.filter(p => {
      const vid = formatProductId(p).toLowerCase();
      const term = productSearchTerm.toLowerCase();
      return p.quantidade_estoque > 0 && 
      (p.nome.toLowerCase().includes(term) || 
       p.cor.toLowerCase().includes(term) ||
       vid.includes(term)) &&
      (!selectedBrand || p.marca === selectedBrand) &&
      (!selectedCategory || p.categoria === selectedCategory);
    }).sort((a, b) => b.quantidade_estoque - a.quantidade_estoque).slice(0, 15);
  }, [products, productSearchTerm, selectedBrand, selectedCategory]);

  const getPaymentDiscountValue = (method: string) => {
    if (!discountsConfig) return 0;
    if (method === 'Pix') return discountsConfig.pix;
    if (method === 'Cartão de Débito') return discountsConfig.debit;
    if (method === 'Cartão de Crédito' && installments === 1) return discountsConfig.credit_spot;
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-none sm:rounded-xl shadow-2xl w-full max-w-7xl h-full sm:h-[92vh] flex flex-col overflow-hidden animate-fade-in-up border-0 sm:border border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'client' && <button onClick={() => setStep(step === 'payment' ? 'products' : 'client')} className="p-2 -ml-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><ArrowLeft size={24} /></button>}
            <div className="bg-emerald-600 p-2 rounded-lg text-white"><ShoppingCart size={20} className="sm:w-6 sm:h-6" /></div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-zinc-800 dark:text-white">Nova Venda</h2>
              <p className="text-[10px] sm:text-sm text-zinc-500 truncate max-w-[150px] sm:max-w-none">{step === 'client' ? 'Identificar Cliente' : step === 'products' ? `Cliente: ${selectedClient?.nome || 'Balcão'}` : 'Pagamento'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* STEP 1: CLIENT SELECTION */}
          {step === 'client' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950/50 custom-scrollbar">
              <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm my-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input type="text" placeholder="Buscar cliente..." className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} disabled={isUnregisteredClient} />
                </div>
                {!isUnregisteredClient && (
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {filteredClients.map(c => (
                      <div key={c.id} onClick={() => handleSelectClient(c)} className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${selectedClient?.id === c.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><User size={16} className="text-zinc-500" /></div><span className="font-bold text-zinc-800 dark:text-zinc-200">{c.nome}</span></div>
                        {selectedClient?.id === c.id && <Check className="text-emerald-600" size={18} />}
                      </div>
                    ))}
                    {filteredClients.length === 0 && clientSearchTerm && <p className="text-center py-4 text-zinc-400 text-sm italic">Nenhum cliente encontrado.</p>}
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

          {/* STEP 2: PRODUCT SELECTION */}
          {step === 'products' && (
            <>
              {/* MOBILE TABS HEADER */}
              <div className="flex lg:hidden bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                  <button 
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'search' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-transparent text-zinc-500'}`}
                  >
                    <Search size={18} /> Produtos
                  </button>
                  <button 
                    onClick={() => setActiveTab('cart')}
                    className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'cart' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-transparent text-zinc-500'}`}
                  >
                    <div className="relative">
                        <ShoppingCart size={18} />
                        {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{cart.length}</span>}
                    </div>
                    Carrinho
                  </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white dark:bg-zinc-900">
                
                {/* SIDEBAR: SEARCH AND FILTERS (Visible on Desktop OR when Tab Search is active) */}
                <div className={`${activeTab === 'search' ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/3 border-r border-zinc-100 dark:border-zinc-800 p-4 sm:p-6 flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0 h-full`}>
                  <div className="space-y-4">
                    <label className="text-sm sm:text-base font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <Search size={18} /> 1. Adicionar Produtos
                    </label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Nome ou ID visual..." 
                          className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow" 
                          value={productSearchTerm} 
                          onChange={(e) => setProductSearchTerm(e.target.value)} 
                        />
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        <select className="w-full py-2 px-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white outline-none" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                            <option value="">Marcas</option>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select className="w-full py-2 px-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white outline-none" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                            <option value="">Categorias</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    {/* SEARCH RESULTS */}
                    <div className="space-y-2 pr-1 h-full">
                      {filteredProducts.map(product => (
                        <button 
                          key={product.id} 
                          className="w-full text-left p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-lg flex items-center justify-between transition-colors group active:scale-[0.98]" 
                          onClick={() => addToCart(product)}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{product.nome}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{formatProductId(product)} • {product.tamanho}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0 ml-2">
                            <Badge variant={product.quantidade_estoque <= 2 ? 'warning' : 'success'} className="text-[9px] px-1 py-0">{product.quantidade_estoque} un</Badge>
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">{formatCurrency(product.preco_venda)}</span>
                          </div>
                        </button>
                      ))}
                      {productSearchTerm && filteredProducts.length === 0 && (
                         <p className="text-center py-8 text-zinc-400 text-xs italic">Nenhum produto encontrado.</p>
                      )}
                      {!productSearchTerm && !selectedBrand && !selectedCategory && (
                          <div className="py-10 text-center opacity-30">
                              <Package size={48} className="mx-auto mb-2 text-zinc-400" />
                              <p className="text-xs text-zinc-500">Busque produtos acima</p>
                          </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MAIN CONTENT: EXPANDED CART LIST (Visible on Desktop OR when Tab Cart is active) */}
                <div className={`${activeTab === 'cart' ? 'flex' : 'hidden'} lg:flex flex-1 p-4 sm:p-6 flex-col min-h-0 bg-zinc-100 dark:bg-zinc-950 overflow-hidden`}>
                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <label className="text-sm sm:text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2"><ShoppingCart size={22} /> 2. Itens no Carrinho ({cart.length})</label>
                      {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-medium text-zinc-400 hover:text-red-500 transition-colors">Limpar tudo</button>}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar scroll-smooth">
                      {cart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-40 py-10">
                            <Package size={64} className="mb-4" />
                            <p className="text-center font-medium">O carrinho está vazio.</p>
                          </div>
                      ) : (
                          cart.map((item) => (
                              <div key={item.produto_id} className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all flex flex-col sm:flex-row items-center gap-3 sm:gap-6 group animate-fade-in-up">
                                  <div className="flex-1 min-w-0 w-full">
                                      <div className="flex items-center gap-2 mb-0.5">
                                          <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white truncate">{item.nome}</h4>
                                          <Badge variant="outline" className="text-[9px] sm:text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 dark:text-zinc-300 dark:border-zinc-700">{item.tamanho}</Badge>
                                      </div>
                                      <div className="flex wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
                                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono border border-zinc-200 dark:border-zinc-700">{item.marca}</span>
                                          <span className={`font-bold ${item.estoque_maximo <= 2 ? 'text-amber-600' : 'text-zinc-400 dark:text-zinc-500'}`}>Estoque: {item.estoque_maximo} un</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 bg-zinc-50 dark:bg-zinc-800/50 p-1.5 sm:p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full sm:w-auto justify-between sm:justify-start">
                                      <div className="flex items-center gap-2">
                                          <button 
                                            onClick={() => adjustQuantity(item.produto_id, -1)} 
                                            className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm active:scale-90"
                                          >
                                            <Minus size={16} strokeWidth={3} />
                                          </button>
                                          <input 
                                            type="number" 
                                            className="w-12 sm:w-16 h-9 sm:h-10 text-center font-bold text-sm sm:text-base bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400 text-zinc-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                            value={item.quantidade} 
                                            onChange={(e) => updateQuantity(item.produto_id, e.target.value)} 
                                          />
                                          <button 
                                            onClick={() => adjustQuantity(item.produto_id, 1)} 
                                            className="h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center bg-white dark:bg-zinc-800 border border-green-200 dark:border-green-900/50 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shadow-sm active:scale-90"
                                          >
                                            <Plus size={16} strokeWidth={3} />
                                          </button>
                                      </div>
                                      <div className="text-right min-w-[80px] sm:min-w-[90px]">
                                          <p className="text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase">Subtotal</p>
                                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(item.subtotal)}</p>
                                      </div>
                                  </div>
                                  <button onClick={() => setCart(cart.filter(i => i.produto_id !== item.produto_id))} className="p-2 text-zinc-300 hover:text-red-500 transition-colors shrink-0 hidden sm:block">
                                    <Trash2 size={18} />
                                  </button>
                                  <button onClick={() => setCart(cart.filter(i => i.produto_id !== item.produto_id))} className="sm:hidden w-full py-2 text-xs font-bold text-red-500 flex items-center justify-center gap-1 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                                    <Trash2 size={14} /> Remover do carrinho
                                  </button>
                              </div>
                          ))
                      )}
                  </div>

                  {/* BOTTOM SUMMARY BAR (Visible on Cart Tab or Desktop) */}
                  <div className="mt-4 p-4 lg:p-6 bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex flex-col items-center sm:items-start">
                      <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Parcial do Carrinho</span>
                      <span className="text-xl sm:text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white">{formatCurrency(finalTotal)}</span>
                    </div>
                    <Button 
                      variant="success" 
                      className="w-full sm:w-auto px-6 sm:px-10 h-12 lg:h-14 text-sm sm:text-lg font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all active:scale-95" 
                      onClick={() => setStep('payment')} 
                      disabled={cart.length === 0}
                    >
                      Prosseguir para Pagamento <ArrowRight size={20} />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 3: PAYMENT */}
          {step === 'payment' && (
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden custom-scrollbar bg-white dark:bg-zinc-900">
              <div className="flex-1 p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950/30 lg:overflow-y-auto space-y-3 custom-scrollbar">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 mb-4"><Package size={18} /> 3. Resumo do Pedido</h3>
                {cart.map(item => (
                  <div key={item.produto_id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-start shadow-sm transition-all hover:shadow-md">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{item.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">{item.marca}</span>
                        <span className="text-zinc-300">•</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 dark:text-zinc-300 dark:border-zinc-700">{item.tamanho}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                      {item.percentual_desconto && item.percentual_desconto > 0 ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 w-fit px-1.5 rounded mt-1">Desconto Pagamento: -{Math.round(item.percentual_desconto)}%</p>
                      ) : null}
                    </div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 shrink-0">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
              <div className="w-full lg:w-[480px] bg-white dark:bg-zinc-900 p-4 sm:p-6 lg:p-8 lg:overflow-y-auto space-y-6 border-l border-zinc-200 dark:border-zinc-800 custom-scrollbar shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100"><Wallet size={20} /> 4. Forma de Pagamento</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {PAYMENT_METHODS.map(method => {
                    const isDisabled = method === 'Crediário' && isUnregisteredClient;
                    const discount = getPaymentDiscountValue(method);
                    const isSelected = selectedPaymentMethod === method;
                    
                    return (
                      <button 
                        key={method} 
                        disabled={isDisabled}
                        onClick={() => { setSelectedPaymentMethod(method); setUseGiftCard(false); }} 
                        className={`group p-3 sm:p-4 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center gap-2 transition-all relative ${isDisabled ? 'opacity-30 cursor-not-allowed grayscale' : isSelected ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 scale-[1.02] shadow-sm' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
                        
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'}`}>
                          {method === 'Pix' && <span className="text-3xl sm:text-4xl leading-none">💠</span>}
                          {method.includes('Cartão') && <CreditCard size={20} className="sm:w-6 sm:h-6" />}
                          {method === 'Dinheiro' && <DollarSign size={20} className="sm:w-6 sm:h-6" />}
                          {method === 'Crediário' && <Handshake size={20} className="sm:w-6 sm:h-6" />}
                        </div>

                        <span className="truncate w-full text-center">{method}</span>
                        {discount > 0 && !isDisabled && (
                          <span className="absolute -top-1.5 -right-1 bg-emerald-600 text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">-{discount}%</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedPaymentMethod === 'Crediário' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs flex gap-2 border border-emerald-100 dark:border-emerald-900/30 animate-fade-in">
                        <Info size={16} className="shrink-0" />
                        <span>O valor será lançado como saldo devedor para o cliente. Descontos automáticos desabilitados.</span>
                    </div>
                )}

                {selectedPaymentMethod === 'Cartão de Crédito' && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Parcelamento</label>
                    <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm sm:text-base text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                      {[1,2,3,4,5].map(i => (
                        <option key={i} value={i}>
                          {i}x de {formatCurrency(finalTotal / i)} sem juros
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button onClick={() => setShowExtraDiscount(!showExtraDiscount)} className={`flex items-center gap-2 text-xs font-bold transition-colors ${showExtraDiscount ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
                        <Ticket size={14} /> {showExtraDiscount ? 'Remover Desconto Extra' : 'Adicionar Desconto Extra'}
                    </button>
                    {showExtraDiscount && (
                        <div className="relative animate-fade-in">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">R$</span>
                           <input type="text" inputMode="numeric" value={extraDiscountStr} onChange={handleExtraDiscountChange} className="w-full pl-9 pr-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0,00" />
                        </div>
                    )}

                    {selectedClient && selectedClient.saldo_vale_presente && selectedClient.saldo_vale_presente > 0 ? (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 sm:p-4 rounded-xl animate-fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1"><Gift size={14} /> Vale Presente Disponível</span>
                                <span className="font-bold text-sm sm:text-base text-amber-800 dark:text-amber-300">{formatCurrency(selectedClient.saldo_vale_presente)}</span>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={useGiftCard} onChange={(e) => setUseGiftCard(e.target.checked)} className="w-4 h-4 text-amber-600 rounded border-amber-300 bg-transparent" />
                                <span className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200">Usar saldo para abater valor</span>
                            </label>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-2 sm:space-y-3 pt-4 sm:pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between text-xs sm:text-sm text-zinc-500 dark:text-zinc-400"><span>Subtotal</span><span>{formatCurrency(subtotalItensOriginal)}</span></div>
                  {totalDescontoPagamento > 0 && <div className="flex justify-between text-xs sm:text-sm text-emerald-600 dark:text-emerald-400"><span>Descontos Pagamento</span><span>- {formatCurrency(totalDescontoPagamento)}</span></div>}
                  {extraDiscount > 0 && <div className="flex justify-between text-xs sm:text-sm text-blue-600 dark:text-blue-400"><span>Desconto Extra</span><span>- {formatCurrency(extraDiscount)}</span></div>}
                  {giftCardUsedAmount > 0 && <div className="flex justify-between text-xs sm:text-sm text-amber-600 dark:text-amber-500"><span>Vale Presente</span><span>- {formatCurrency(giftCardUsedAmount)}</span></div>}
                  <div className="flex justify-between items-end pt-3 sm:pt-4 border-t border-zinc-100 dark:border-zinc-800"><span className="font-medium text-base sm:text-lg text-zinc-800 dark:text-zinc-200">Total Final</span><span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">{formatCurrency(finalTotal)}</span></div>
                  <Button variant="success" className="w-full h-12 sm:h-14 text-base sm:text-lg mt-4 sm:mt-6 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-95" onClick={handleCheckout} disabled={isSubmitting || !selectedPaymentMethod}>{isSubmitting ? <><RefreshCw className="animate-spin" size={20} /> Processando...</> : 'Finalizar Venda'}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
