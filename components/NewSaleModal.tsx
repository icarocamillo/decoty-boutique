import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ShoppingCart, Search, Package, User, ArrowRight, Filter, Check, CreditCard, DollarSign, Wallet, AlertCircle, ArrowLeft, Ticket, UserPlus, Gift } from 'lucide-react';
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

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'];

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSaleComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Steps: 'client' -> 'products' -> 'payment'
  const [step, setStep] = useState<'client' | 'products' | 'payment'>('client');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  
  // Configs dinâmicas
  const [discountsConfig, setDiscountsConfig] = useState<PaymentDiscounts | null>(null);
  const [feesConfig, setFeesConfig] = useState<PaymentFees | null>(null);
  
  // Loading & Processing
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client Selection State
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isUnregisteredClient, setIsUnregisteredClient] = useState(false);
  
  // New Client Flow State
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);

  // Product Selection State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Payment State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [installments, setInstallments] = useState(1);
  
  // Novo Estado para Desconto Extra (String Formatada)
  const [extraDiscountStr, setExtraDiscountStr] = useState('');
  const [showExtraDiscount, setShowExtraDiscount] = useState(false);

  // NOVO: Estado para Vale Presente
  const [useGiftCard, setUseGiftCard] = useState(false);

  // Helper para converter string formatada BRL para número
  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  // Valor numérico derivado para cálculos
  const extraDiscount = parseCurrency(extraDiscountStr);

  // Handler estilo ATM
  const handleExtraDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setExtraDiscountStr(formatted);
  };

  // Body Scroll Lock Effect
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Initial Load
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        mockService.getProducts(),
        mockService.getClients(),
        mockService.getPaymentDiscounts(),
        mockService.getPaymentFees(),
        mockService.getSuppliers() // Carrega fornecedores para pegar marcas
      ])
      .then(([productsData, clientsData, discData, feesData, suppliersData]) => {
        setProducts(productsData);
        setClients(clientsData);
        setDiscountsConfig(discData);
        setFeesConfig(feesData);
        
        // Processa marcas dinâmicas
        const supplierBrands = suppliersData
            .map(s => s.fantasy_name)
            .filter((name): name is string => !!name && name.trim() !== '');
        const uniqueBrands = Array.from(new Set(supplierBrands)).sort();
        setBrands(uniqueBrands);
      })
      .catch(err => console.error("Error loading data", err))
      .finally(() => setLoading(false));

      // Reset States
      setStep('client');
      setCart([]);
      setClientSearchTerm('');
      setProductSearchTerm('');
      setSelectedBrand('');
      setSelectedClient(null);
      setIsUnregisteredClient(false);
      setIsClientFormOpen(false);
      
      // Payment Resets
      setSelectedPaymentMethod('');
      setInstallments(1);
      setExtraDiscountStr('');
      setShowExtraDiscount(false);
      setUseGiftCard(false); // Reset vale
    }
  }, [isOpen]);

  // --- Logic Step 1: Client ---

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
    if (e.target.checked) {
      setSelectedClient(null);
    }
  };

  const canProceedToProducts = selectedClient !== null || isUnregisteredClient;

  // New Client Flow Handlers
  const handleOpenClientForm = () => {
    setIsClientFormOpen(true);
  };

  const handleClientFormSuccess = async () => {
    // Recarrega a lista de clientes
    const updatedClients = await mockService.getClients();
    setClients(updatedClients);
    setIsClientFormOpen(false);
    // Opcional: Se quiser limpar a busca para ver o novo cliente, descomente:
    // setClientSearchTerm(''); 
  };

  // --- Logic Step 2: Products ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto_id === product.id);
      
      if (existing) {
        if (existing.quantidade < product.quantidade_estoque) {
          const newQty = existing.quantidade + 1;
          return prev.map(item => 
            item.produto_id === product.id 
              ? { ...item, quantidade: newQty, subtotal: newQty * item.preco_unitario, desconto: 0 }
              : item
          );
        }
        return prev;
      }

      return [...prev, {
        produto_id: product.id,
        nome: product.nome,
        marca: product.marca,
        cor: product.cor,
        tamanho: product.tamanho,
        preco_unitario: product.preco_venda,
        preco_custo: product.preco_custo, // SNAPSHOT DO CUSTO AQUI
        quantidade: 1,
        subtotal: product.preco_venda,
        estoque_maximo: product.quantidade_estoque,
        desconto: 0,
        percentual_desconto: 0
      }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.produto_id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.produto_id === productId) {
        const newQty = item.quantidade + delta;
        if (newQty > 0 && newQty <= item.estoque_maximo) {
          // Nota: No passo 2, desconto é 0. O recalculo acontece no passo 3.
          return {
            ...item,
            quantidade: newQty,
            subtotal: newQty * item.preco_unitario, 
            desconto: 0
          };
        }
      }
      return item;
    }));
  };

  const filteredProducts = useMemo(() => {
    const list = products.filter(p => 
      p.quantidade_estoque > 0 && 
      (p.nome.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
       p.cor.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
       p.id_decoty.toLowerCase().includes(productSearchTerm.toLowerCase())) &&
      (selectedBrand ? p.marca === selectedBrand : true)
    );
    // Sort by stock descending
    return list.sort((a, b) => b.quantidade_estoque - a.quantidade_estoque);
  }, [products, productSearchTerm, selectedBrand]);

  const getStockBadgeProps = (qty: number) => {
    if (qty === 0) return { variant: 'destructive' as const, label: '0 un', icon: AlertCircle };
    if (qty <= 2) return { variant: 'warning' as const, label: `${qty} un`, icon: AlertCircle };
    return { variant: 'success' as const, label: `${qty} un`, icon: Package };
  };

  // --- Logic Step 3: Payment Rules & Calc ---

  // Regra de Desconto por Item (Dinâmica) - CLIENTE
  const calculateItemDiscount = (item: CartItem, method: string, numInstallments: number) => {
     let percent = 0;
     const rates = discountsConfig || { pix: 10, debit: 7, credit_spot: 4 }; // Fallback safe
     
     if (method === 'Pix') {
        percent = rates.pix / 100;
     } else if (method === 'Cartão de Débito') {
        percent = rates.debit / 100;
     } else if (method === 'Cartão de Crédito') {
        if (numInstallments === 1) {
            percent = rates.credit_spot / 100;
        } else {
            percent = 0; // Parcelado não tem desconto para cliente nesta regra
        }
     }
     
     const totalItemPrice = item.quantidade * item.preco_unitario;
     const discountValue = totalItemPrice * percent;
     
     return {
        desconto: discountValue,
        percentual: percent * 100,
        subtotal: totalItemPrice - discountValue
     };
  };

  // Efeito para recalcular carrinho sempre que método ou parcelas mudarem
  useEffect(() => {
     if (step === 'payment') {
        setCart(prevCart => prevCart.map(item => {
           const calc = calculateItemDiscount(item, selectedPaymentMethod, installments);
           return {
              ...item,
              desconto: calc.desconto,
              subtotal: calc.subtotal,
              percentual_desconto: calc.percentual
           };
        }));
     }
  }, [selectedPaymentMethod, installments, step, discountsConfig]);

  // Resetar parcelas se mudar método
  useEffect(() => {
     if (selectedPaymentMethod !== 'Cartão de Crédito') {
        setInstallments(1);
     }
  }, [selectedPaymentMethod]);

  // Totals Calculation PRELIMINARY (To use inside render)
  const subtotalItensOriginal = cart.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0);
  const totalDescontoPagamento = cart.reduce((acc, item) => acc + (item.desconto || 0), 0);
  const subtotalComDescontoPagamento = subtotalItensOriginal - totalDescontoPagamento;
  const subtotalAfterExtra = Math.max(0, subtotalComDescontoPagamento - extraDiscount);

  // Vale Presente Logic
  const clientBalance = selectedClient?.saldo_vale_presente || 0;
  // O valor a ser usado do vale é o menor entre o Saldo Disponível e o Total Restante da Venda
  const giftCardUsedAmount = useGiftCard ? Math.min(clientBalance, subtotalAfterExtra) : 0;

  // Final Total
  const finalTotal = Math.max(0, subtotalAfterExtra - giftCardUsedAmount);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- Finalize Sale ---

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedPaymentMethod) return;
    
    const clientName = isUnregisteredClient ? "Cliente não cadastrado" : selectedClient?.nome || "Desconhecido";
    const clientId = selectedClient?.id;
    const clientCpf = selectedClient?.cpf; 

    // Calcula Taxa da Maquininha (Custo da Operação) para salvar na venda
    let feePercent = 0;
    const currentFees = feesConfig || { debit: 1.99, credit_spot: 3.19, credit_installment: 4.99 };
    
    if (selectedPaymentMethod === 'Cartão de Débito') {
       feePercent = currentFees.debit;
    } else if (selectedPaymentMethod === 'Cartão de Crédito') {
       if (installments === 1) feePercent = currentFees.credit_spot;
       else feePercent = currentFees.credit_installment;
    }
    // Pix assume-se taxa 0 ou não configurada aqui por enquanto (ou add depois)

    // O valor sujeito a taxa é o FINAL que passa na maquininha (já descontado vale presente)
    const finalTotalValue = finalTotal; 
    const feeValue = finalTotalValue * (feePercent / 100);

    const appliedFeesSnapshot = {
      porcentagem: feePercent,
      valor: feeValue
    };

    // Ajustado para capturar Nome e E-mail para histórico da venda
    const salespersonInfo = `${user?.user_metadata?.name || 'Usuário'} - ${user?.email || ''}`;

    setIsSubmitting(true);
    // Pass fees snapshot and giftCardUsed
    const success = await mockService.createSale(
       cart, 
       { name: clientName, id: clientId, cpf: clientCpf }, 
       selectedPaymentMethod,
       installments,
       extraDiscount,
       appliedFeesSnapshot,
       salespersonInfo, // Salva string combinada no campo vendedor
       giftCardUsedAmount // Passa o valor usado do vale
    );
    setIsSubmitting(false);

    if (success) {
      alert("Venda Realizada com sucesso!");
      onSaleComplete();
      onClose();
      navigate('/home');
    } else {
      alert("Erro ao finalizar a venda. Tente novamente.");
    }
  };

  const handleBackStep = () => {
    if (step === 'products') setStep('client');
    if (step === 'payment') setStep('products');
  };

  // Helper para exibir porcentagem de desconto prevista no selector
  const getRateForDisplay = (key: keyof PaymentDiscounts) => {
    return discountsConfig ? discountsConfig[key] : 0;
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    switch(step) {
        case 'client': return 'Passo 1: Identificar Cliente';
        case 'products': return 'Passo 2: Selecionar Produtos';
        case 'payment': return 'Passo 3: Pagamento';
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        {/* Modal Main Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800">
          
          {/* Header - Fixed */}
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-3">
              {step !== 'client' && (
                <button 
                  onClick={handleBackStep}
                  className="p-2 -ml-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"
                  title="Voltar"
                >
                  <ArrowLeft size={24} />
                </button>
              )}

              <div className="bg-emerald-600 p-2 rounded-lg text-white">
                <ShoppingCart size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-800 dark:text-white">
                  Nova Venda - {getStepTitle().split(': ')[1]}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {step === 'client' 
                      ? 'Selecione um cliente para iniciar' 
                      : step === 'products' 
                          ? `Cliente: ${isUnregisteredClient ? 'Não cadastrado' : selectedClient?.nome}` 
                          : 'Confira os itens e selecione a forma de pagamento'
                    }
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
              <X size={24} />
            </button>
          </div>

          {/* Content - Flexible */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            
            {/* STEP 1: CLIENT */}
            {step === 'client' && (
              <div className="flex-1 p-6 flex flex-col h-full animate-fade-in overflow-hidden">
                  <div className="flex flex-col h-full max-w-4xl mx-auto w-full gap-4">
                    {/* Top Section: Search and List */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden min-h-0">
                      <div className="p-6 border-b border-zinc-100 dark:border-zinc-700 shrink-0 bg-zinc-50 dark:bg-zinc-800">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Buscar Cliente Cadastrado</label>
                          <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                            <input 
                              type="text"
                              placeholder="Nome, E-mail, Celular ou CPF..."
                              className="w-full pl-12 pr-4 py-3 border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:opacity-50"
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              disabled={isUnregisteredClient}
                            />
                          </div>
                      </div>

                      {!isUnregisteredClient && (
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 overscroll-contain">
                          {filteredClients.length > 0 ? (
                            filteredClients.map(client => (
                              <div 
                                key={client.id}
                                onClick={() => handleSelectClient(client)}
                                className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition-all ${
                                  selectedClient?.id === client.id 
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                                    : 'border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                                }`}
                              >
                                  <div className="flex items-center gap-3 w-full">
                                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${selectedClient?.id === client.id ? 'bg-emerald-200 text-emerald-700' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500'}`}>
                                      <User size={16} />
                                    </div>
                                    <div className="flex items-center gap-2 overflow-hidden w-full pr-2">
                                      <span className="font-bold text-zinc-900 dark:text-white whitespace-nowrap">{client.nome}</span>
                                      {client.cpf && (
                                        <Badge variant="outline" className="text-[10px] font-mono whitespace-nowrap hidden sm:inline-flex">
                                          CPF: {client.cpf}
                                        </Badge>
                                      )}
                                      <span className="text-sm text-zinc-500 dark:text-zinc-400 font-normal truncate hidden sm:inline">
                                        - {client.email || client.celular || 'Sem contato'}
                                      </span>
                                    </div>
                                  </div>
                                  {selectedClient?.id === client.id && <Check className="text-emerald-600 shrink-0" size={18} />}
                              </div>
                            ))
                          ) : (
                            // CLIENT NOT FOUND + CREATE BUTTON
                            clientSearchTerm.length > 0 && (
                              <div className="flex flex-col items-center justify-center h-full py-10 text-center animate-fade-in">
                                  <div className="bg-zinc-100 dark:bg-zinc-700 p-4 rounded-full mb-3">
                                    <User size={32} className="text-zinc-400" />
                                  </div>
                                  <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-1">Cliente não encontrado</p>
                                  <p className="text-xs text-zinc-400 mb-4">Verifique a busca ou cadastre um novo.</p>
                                  
                                  <Button onClick={handleOpenClientForm} className="flex items-center gap-2">
                                    <UserPlus size={18} />
                                    Cadastrar Cliente
                                  </Button>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      {isUnregisteredClient && (
                          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8">
                              <User size={48} className="mb-4 opacity-50" />
                              <p>Venda para cliente não cadastrado selecionada.</p>
                              <p className="text-sm">Os dados do cliente não serão salvos para histórico.</p>
                          </div>
                      )}
                    </div>

                    {/* Bottom Section: Options and Action */}
                    <div className="shrink-0 space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                          <input 
                            type="checkbox" 
                            id="unregistered"
                            className="w-5 h-5 rounded border-zinc-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={isUnregisteredClient}
                            onChange={handleUnregisteredChange}
                          />
                          <label htmlFor="unregistered" className="cursor-pointer select-none text-zinc-700 dark:text-zinc-300 font-medium">
                            Cliente não cadastrado (Venda Balcão)
                          </label>
                        </div>

                        <Button 
                          variant="success"
                          className="w-full py-4 text-lg"
                          disabled={!canProceedToProducts}
                          onClick={() => setStep('products')}
                        >
                          Avançar para produtos <ArrowRight size={20} className="ml-2" />
                        </Button>
                    </div>
                  </div>
              </div>
            )}

            {/* STEP 2: PRODUCTS */}
            {step === 'products' && (
              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden animate-fade-in min-h-0">
                  {/* Left: Product List */}
                  <div className="w-full md:w-[65%] lg:w-[70%] flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-0">
                      {/* Toolbar */}
                      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex gap-4 shrink-0">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                          <input 
                            type="text"
                            placeholder="Buscar produtos..."
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="relative w-48">
                          <select 
                            className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                            value={selectedBrand}
                            onChange={(e) => setSelectedBrand(e.target.value)}
                          >
                            <option value="">Todas as Marcas</option>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* List */}
                      <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50 dark:bg-zinc-900 overscroll-contain">
                        <div className="flex flex-col gap-2">
                            {loading ? (
                              <div className="text-center py-10 text-zinc-400">Carregando...</div>
                            ) : filteredProducts.length === 0 ? (
                              <div className="text-center py-10 text-zinc-400">Nenhum produto encontrado.</div>
                            ) : (
                              filteredProducts.map(product => {
                                const cartItem = cart.find(c => c.produto_id === product.id);
                                const inCartQty = cartItem ? cartItem.quantidade : 0;
                                const available = product.quantidade_estoque - inCartQty;
                                const stockStatus = getStockBadgeProps(product.quantidade_estoque);
                                const StockIcon = stockStatus.icon;

                                return (
                                  <div 
                                    key={product.id} 
                                    onClick={() => available > 0 && addToCart(product)}
                                    className={`
                                      group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                                      ${available === 0 
                                        ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 opacity-60 cursor-not-allowed' 
                                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10'
                                      }
                                    `}
                                  >
                                    <div className="flex-1 min-w-0 pr-4">
                                      <div className="flex items-center gap-2 mb-0.5">
                                          <span className="font-bold text-zinc-800 dark:text-white text-sm truncate" title={product.nome}>
                                            {product.nome}
                                          </span>
                                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
                                            {product.tamanho}
                                          </Badge>
                                      </div>
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                          <span className="font-medium">{product.marca}</span>
                                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                                          <span className="truncate">{product.cor}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                      <div className="flex items-center gap-1.5">
                                          <Badge variant={stockStatus.variant} className="flex items-center gap-1 px-2 py-0.5 h-6">
                                              <StockIcon size={12} />
                                              {stockStatus.label}
                                          </Badge>
                                      </div>
                                      <div className="text-right min-w-[70px]">
                                          <span className="block text-sm font-bold text-zinc-900 dark:text-white">
                                            {formatCurrency(product.preco_venda)}
                                          </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                        </div>
                      </div>
                  </div>

                  {/* Right: Cart Preview */}
                  <div className="w-full md:w-[35%] lg:w-[30%] bg-white dark:bg-zinc-950 flex flex-col h-full border-l border-zinc-200 dark:border-zinc-800 shadow-xl z-10 min-h-0">
                      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                          <ShoppingCart size={18} /> Carrinho ({cart.length})
                        </h3>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/30 dark:bg-zinc-950 overscroll-contain">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2 opacity-50">
                              <ShoppingCart size={48} strokeWidth={1} />
                              <p>Seu carrinho está vazio</p>
                              <p className="text-xs text-center px-6">Clique nos produtos à esquerda para adicionar</p>
                            </div>
                        ) : (
                            cart.map(item => (
                              <div key={item.produto_id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                      <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{item.nome}</p>
                                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.marca} • {item.cor} • <span className="font-bold text-zinc-700 dark:text-zinc-300">{item.tamanho}</span></p>
                                    </div>
                                    <p className="font-semibold text-sm text-zinc-900 dark:text-white">{formatCurrency(item.subtotal)}</p>
                                  </div>

                                <div className="flex justify-between items-center pt-2 border-t border-zinc-50 dark:border-zinc-800">
                                    <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                                        <button 
                                          onClick={() => updateQuantity(item.produto_id, -1)}
                                          className="w-8 h-8 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-l-lg transition-colors"
                                        >
                                          -
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium text-zinc-900 dark:text-white">{item.quantidade}</span>
                                        <button 
                                          onClick={() => updateQuantity(item.produto_id, 1)}
                                          disabled={item.quantidade >= item.estoque_maximo}
                                          className="w-8 h-8 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-r-lg transition-colors disabled:opacity-30"
                                        >
                                          +
                                        </button>
                                    </div>
                                    
                                    <button 
                                      onClick={() => removeFromCart(item.produto_id)}
                                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
                                    >
                                      <Trash2 size={14} /> Remover
                                    </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-zinc-500 dark:text-zinc-400">Total a Pagar</span>
                          <span className="text-3xl font-bold text-zinc-900 dark:text-white">{formatCurrency(finalTotal)}</span>
                        </div>
                        <Button 
                          variant="success"
                          className="w-full h-14 text-lg font-bold shadow-lg shadow-emerald-900/20 rounded-xl flex items-center justify-center gap-2"
                          onClick={() => setStep('payment')}
                          disabled={cart.length === 0}
                        >
                          Avançar para pagamento <ArrowRight size={20} />
                        </Button>
                      </div>
                  </div>
              </div>
            )}

            {/* STEP 3: PAYMENT */}
            {step === 'payment' && (
              <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden animate-fade-in min-h-0">
                  
                  {/* Left: Summary */}
                  <div className="w-full md:w-[60%] flex flex-col bg-zinc-50/50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto overscroll-contain flex-1">
                      <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-4 flex items-center gap-2 sticky top-0 bg-zinc-50/50 dark:bg-zinc-900/90 backdrop-blur-sm pb-2 z-10">
                        <ShoppingCart size={20} /> Resumo do Pedido ({cart.reduce((a, b) => a + b.quantidade, 0)} itens)
                      </h3>
                      
                      <div className="space-y-3">
                        {cart.map(item => (
                            <div key={item.produto_id} className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                              <div className="flex-1">
                                  <p className="font-bold text-zinc-900 dark:text-white">{item.nome}</p>
                                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.marca} • {item.tamanho} • {item.cor}</p>
                                  <p className="text-xs text-zinc-400 mt-1">
                                    {item.quantidade}x {formatCurrency(item.preco_unitario)}
                                  </p>
                              </div>

                              <div className="text-right min-w-[100px]">
                                  <p className="font-bold text-lg text-zinc-900 dark:text-white">{formatCurrency(item.subtotal)}</p>
                                  {item.percentual_desconto && item.percentual_desconto > 0 ? (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        {Math.round(item.percentual_desconto)}% OFF (-{formatCurrency(item.desconto || 0)})
                                    </p>
                                  ) : null}
                              </div>
                            </div>
                        ))}
                      </div>
                  </div>

                  {/* Right: Payment Method & Totals */}
                  <div className="w-full md:w-[40%] bg-white dark:bg-zinc-900 p-8 flex flex-col h-full shadow-xl overflow-y-auto min-h-0">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-zinc-800 dark:text-white mb-4 flex items-center gap-2">
                          <Wallet size={20} /> Forma de Pagamento
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {PAYMENT_METHODS.map(method => (
                              <button
                                key={method}
                                onClick={() => setSelectedPaymentMethod(method)}
                                className={`p-4 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2 justify-center text-center h-24
                                  ${selectedPaymentMethod === method 
                                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600' 
                                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                  }`}
                              >
                                {method === 'Pix' && <div className="text-2xl">💠</div>}
                                {method.includes('Crédito') && <CreditCard size={24} />}
                                {method.includes('Débito') && <CreditCard size={24} />}
                                {method === 'Dinheiro' && <DollarSign size={24} />}
                                {method}
                              </button>
                          ))}
                        </div>

                        {/* Installments Selector (Only for Credit Card) */}
                        {selectedPaymentMethod === 'Cartão de Crédito' && (
                          <div className="mb-6 animate-fade-in">
                              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Parcelamento</label>
                              <select 
                                className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={installments}
                                onChange={(e) => setInstallments(Number(e.target.value))}
                              >
                                {(() => {
                                    // Lógica de Projeção Dinâmica
                                    // Usa valor total final (já descontado vale presente)
                                    const totalBase = Math.max(0, subtotalItensOriginal - giftCardUsedAmount); 
                                    
                                    // Cenário 1x: Aplica desconto configurado
                                    const rateSpot = getRateForDisplay('credit_spot');
                                    // Desconto incide sobre o saldo a pagar
                                    const total1x = Math.max(0, (totalBase * (1 - rateSpot/100)) - extraDiscount);
                                    
                                    // Cenário 2x-5x: Sem desconto para cliente (Configurado no modal)
                                    const totalParceled = Math.max(0, totalBase - extraDiscount);

                                    return (
                                      <>
                                        <option value={1}>1x de {formatCurrency(total1x)} ({rateSpot > 0 ? `${rateSpot}% de desconto` : 'sem desconto'})</option>
                                        {[2, 3, 4, 5].map(num => (
                                          <option key={num} value={num}>
                                            {num}x de {formatCurrency(totalParceled / num)} (Total: {formatCurrency(totalParceled)})
                                          </option>
                                        ))}
                                      </>
                                    );
                                })()}
                              </select>
                          </div>
                        )}

                        {/* Extra Discount Button */}
                        <div className="mb-4">
                          <button 
                            onClick={() => setShowExtraDiscount(!showExtraDiscount)}
                            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                          >
                              <Ticket size={16} /> 
                              {showExtraDiscount ? 'Remover Desconto Extra' : 'Adicionar Desconto Extra'}
                          </button>

                          {showExtraDiscount && (
                              <div className="mt-3 animate-fade-in">
                                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 block">Valor do Desconto (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">R$</span>
                                    <input 
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="0,00"
                                      className="w-full pl-8 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                      value={extraDiscountStr}
                                      onChange={handleExtraDiscountChange}
                                    />
                                </div>
                              </div>
                          )}
                        </div>

                        {/* Vale Presente Option */}
                        {clientBalance > 0 && (
                           <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg animate-fade-in">
                              <label className="flex items-start gap-3 cursor-pointer">
                                 <input 
                                    type="checkbox"
                                    className="mt-1 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 bg-transparent"
                                    checked={useGiftCard}
                                    onChange={(e) => setUseGiftCard(e.target.checked)}
                                 />
                                 <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                       <span className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1">
                                          <Gift size={14} /> Utilizar Vale Presente
                                       </span>
                                       <span className="text-xs font-mono bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                                          Saldo: {formatCurrency(clientBalance)}
                                       </span>
                                    </div>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-1">
                                       Abater do valor total da compra.
                                    </p>
                                 </div>
                              </label>
                           </div>
                        )}
                      </div>

                      <div className="mt-auto space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-6 shrink-0">
                          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                            <span>Subtotal Itens</span>
                            <span>{formatCurrency(subtotalItensOriginal)}</span>
                          </div>
                          {totalDescontoPagamento > 0 && (
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <span>Desconto Pagamento</span>
                                <span>- {formatCurrency(totalDescontoPagamento)}</span>
                            </div>
                          )}
                          {extraDiscount > 0 && (
                            <div className="flex justify-between text-blue-600 dark:text-blue-400">
                                <span>Desconto Extra</span>
                                <span>- {formatCurrency(extraDiscount)}</span>
                            </div>
                          )}
                          {/* Exibe desconto de Vale Presente se usado */}
                          {giftCardUsedAmount > 0 && (
                             <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                                <span>Vale Presente</span>
                                <span>- {formatCurrency(giftCardUsedAmount)}</span>
                             </div>
                          )}

                          <div className="flex justify-between items-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-lg font-medium text-zinc-900 dark:text-white">Total Final</span>
                            <span className="text-4xl font-bold text-zinc-900 dark:text-white">{formatCurrency(finalTotal)}</span>
                          </div>

                          <Button 
                            variant="success"
                            className="w-full h-16 text-xl font-bold shadow-lg shadow-emerald-900/20 rounded-xl mt-6"
                            onClick={handleCheckout}
                            disabled={isSubmitting || !selectedPaymentMethod}
                          >
                            {isSubmitting ? 'Processando...' : 'Finalizar Venda'}
                          </Button>
                      </div>
                  </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Nested Client Form Modal */}
      <ClientFormModal
        isOpen={isClientFormOpen}
        onClose={() => setIsClientFormOpen(false)}
        onSuccess={handleClientFormSuccess}
        clientToEdit={null} // Always creating new here
      />
    </>
  );
};