
import { X, BookOpen, Check, Loader2, DollarSign, CreditCard, Wallet, Calendar, Receipt, ArrowLeft, ChevronRight, ChevronDown, Package, Info, Percent, History, Clock, TrendingUp, User as UserIcon, PieChart, Banknote, CheckCircle2, Ticket } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { backendService, PaymentFees } from '../services/backendService';
import { Client, Sale, SaleItem, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface CrediarioPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: Client;
  sales: Sale[];
}

type Step = 'select-sale' | 'payment-details';

export const CrediarioPaymentModal: React.FC<CrediarioPaymentModalProps> = ({ isOpen, onClose, onSuccess, client, sales }) => {
  const { user } = useAuth(); 
  const [step, setStep] = useState<Step>('select-sale');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [method, setMethod] = useState('Pix');
  const [installments, setInstallments] = useState(1);
  const [amountToPayStr, setAmountToPayStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fees, setFees] = useState<PaymentFees | null>(null);

  const METHODS = [
    { id: 'Pix', label: 'Pix', icon: '💠' },
    { id: 'Cartão de Crédito', label: 'Cartão de Crédito', icon: <CreditCard size={20} /> },
    { id: 'Cartão de Débito', label: 'Cartão de Débito', icon: <CreditCard size={20} /> },
    { id: 'Dinheiro', label: 'Dinheiro', icon: <DollarSign size={20} /> }
  ];

  useEffect(() => {
    if (isOpen) {
      setStep('select-sale');
      setSelectedSale(null);
      setMethod('Pix');
      setInstallments(1);
      setAmountToPayStr('');
      setLoading(false);
      
      Promise.all([
          backendService.getUsers(),
          backendService.getPaymentFees()
      ]).then(([usersData, feesData]) => {
          setUsers(usersData);
          setFees(feesData);
      });
    }
  }, [isOpen]);

  const resolveUserName = (userId: string) => {
    const profile = users.find(u => u.id === userId);
    if (profile) return profile.name;
    if (userId?.length > 30) return 'Vendedor';
    return userId || 'Sistema';
  };

  const getFeeInfo = useCallback((amount: number, methodName: string, numInstallments: number) => {
      if (!fees) return { value: 0, percent: 0 };
      let percent = 0;
      if (methodName === 'Cartão de Débito') {
        percent = fees.debit;
      } else if (methodName === 'Cartão de Crédito') {
        percent = numInstallments > 1 ? fees.credit_installment : fees.credit_spot;
      }
      return { value: amount * (percent / 100), percent };
  }, [fees]);

  /**
   * Calcula o valor total atual e efetivo da venda, 
   * considerando apenas itens vendidos (não devolvidos).
   */
  const calculateEffectiveSaleTotal = useCallback((sale: Sale) => {
    if (sale.status === 'cancelled') return 0;
    
    const soldItemsSubtotal = sale.items
      ?.filter(i => i.status === 'sold')
      .reduce((acc, i) => acc + i.subtotal, 0) || 0;
    
    if (soldItemsSubtotal === 0) return 0;

    // Subtrai descontos extras e uso de vale-presente do subtotal dos itens vendidos
    return Math.max(0, soldItemsSubtotal - (sale.desconto_extra || 0) - (sale.uso_vale_presente || 0));
  }, []);

  // Vendas de crediário - AGORA INCLUI AS PAGAS PARA HISTÓRICO
  const crediarioSales = useMemo(() => {
    return sales.filter(s => s.metodo_pagamento === 'Crediário' && s.status === 'completed')
      .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  }, [sales]);

  const saleStats = useMemo(() => {
      if (!selectedSale) return null;
      
      const total = calculateEffectiveSaleTotal(selectedSale);
      
      let totalPaid = 0;
      let totalNet = 0;

      selectedSale.pagamentos_crediario?.forEach(p => {
          totalPaid += p.valor;
          const { value: historicalFeeValue } = getFeeInfo(p.valor, p.metodo, (p as any).parcelas || 1);
          totalNet += (p.valor - historicalFeeValue);
      });

      const remaining = Math.max(0, total - totalPaid);
      const progress = total > 0 ? (totalPaid / total) * 100 : 0;
      const isPaid = selectedSale.status_pagamento === 'pago' || remaining < 0.01;
      
      return { 
          total, 
          paid: totalPaid, 
          netReceived: totalNet,
          remaining, 
          progress,
          isPaid
      };
  }, [selectedSale, getFeeInfo, calculateEffectiveSaleTotal]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numberValue = Number(value) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setAmountToPayStr(formatted);
  };

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const handleSave = async () => {
    const amount = parseCurrency(amountToPayStr);
    if (amount <= 0 || !method || !selectedSale || !saleStats) return;
    
    if (amount > saleStats.remaining + 0.01) {
        alert("O valor informado é maior que o saldo devedor desta venda.");
        return;
    }

    setLoading(true);
    const success = await backendService.processCrediarioPayment(
        client.id, 
        amount,
        selectedSale.id,
        method,
        user?.id || '',
        method === 'Cartão de Crédito' ? installments : 1
    );
    
    if (success) {
        onSuccess();
        onClose();
    } else {
        alert("Erro ao registrar pagamento.");
    }
    setLoading(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-7xl h-full sm:h-auto sm:max-h-[92vh] overflow-hidden border-0 sm:border border-zinc-200 dark:border-zinc-800 flex flex-col">
        
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {step !== 'select-sale' && (
                <button 
                    onClick={() => setStep('select-sale')}
                    className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors -ml-2"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <BookOpen size={20} className="shrink-0" />
                <h2 className="font-bold text-base sm:text-lg truncate">Histórico de Crediário</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 sm:p-6 bg-white dark:bg-zinc-900">
            {step === 'select-sale' && (
                <div className="space-y-6 max-w-2xl mx-auto py-8 px-4 sm:px-0">
                    <div className="flex flex-col items-center text-center space-y-2 mb-8">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
                            <Wallet size={28} className="sm:size-8" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-zinc-800 dark:text-white">Selecione uma venda</h3>
                        <p className="text-zinc-500 text-sm">Visualizando todas as vendas em crediário de <span className="font-bold text-zinc-700 dark:text-zinc-300">{client.nome}</span></p>
                    </div>
                    
                    <div className="space-y-3">
                        {crediarioSales.map(sale => {
                            const effectiveTotal = calculateEffectiveSaleTotal(sale);
                            const paid = sale.pagamentos_crediario?.reduce((sum, p) => sum + p.valor, 0) || 0;
                            const remaining = Math.max(0, effectiveTotal - paid);
                            const progress = effectiveTotal > 0 ? (paid / effectiveTotal) * 100 : 0;
                            const isFullyPaid = sale.status_pagamento === 'pago' || remaining < 0.01;

                            if (effectiveTotal === 0 && !isFullyPaid) return null;

                            return (
                                <button 
                                    key={sale.id}
                                    onClick={() => { setSelectedSale(sale); setStep('payment-details'); }}
                                    className={`w-full p-4 sm:p-5 border rounded-2xl transition-all flex flex-col gap-4 group shadow-sm hover:shadow-md ${isFullyPaid ? 'bg-zinc-50/50 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-800' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:border-red-500'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg shrink-0 ${isFullyPaid ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}>
                                                {isFullyPaid ? <Check size={20} /> : <Receipt size={20} />}
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">Venda #{sale.ui_id || sale.id.slice(0,8)}</p>
                                                    {isFullyPaid && <Badge variant="success" className="text-[8px] h-4">Quitada</Badge>}
                                                </div>
                                                <p className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1">
                                                    <Calendar size={10} /> {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase mb-0.5">{isFullyPaid ? 'Valor Pago' : 'Saldo Devedor'}</p>
                                            <p className={`text-base sm:text-lg font-black ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {formatCurrency(isFullyPaid ? effectiveTotal : remaining)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400">
                                            <span>Progresso</span>
                                            <span>{Math.floor(progress)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        {crediarioSales.length === 0 && (
                            <div className="py-16 text-center text-zinc-400 italic space-y-3">
                                <Info size={48} className="mx-auto opacity-10" />
                                <p>Este cliente não possui vendas de crediário registradas.</p>
                                <Button variant="secondary" size="sm" onClick={onClose}>Voltar para o histórico</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 'payment-details' && selectedSale && saleStats && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8 h-full animate-fade-in-up">
                    {/* COLUNA ESQUERDA: RESUMO E HISTÓRICO */}
                    <div className="lg:col-span-7 space-y-6 p-4 sm:p-6 lg:p-0 overflow-y-auto custom-scrollbar">
                        <div className={`rounded-2xl border p-4 sm:p-6 shadow-sm ${saleStats.isPaid ? 'bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp size={14} /> Resumo da Venda Efetiva
                                </h3>
                                {saleStats.isPaid && <Badge variant="success" className="animate-pulse">Totalmente Quitada</Badge>}
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Total Efetivo</p>
                                    <p className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">{formatCurrency(saleStats.total)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Total Recebido</p>
                                    <p className="text-base sm:text-lg font-black text-zinc-700 dark:text-zinc-200">{formatCurrency(saleStats.paid)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Líquido Lojista</p>
                                    <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400" title="Valor já recebido subtraindo as taxas bancárias">{formatCurrency(saleStats.netReceived)}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] font-bold text-red-600 uppercase tracking-tighter">Falta Receber</p>
                                    <p className="text-base sm:text-lg font-black text-red-600 dark:text-red-500">{formatCurrency(saleStats.remaining)}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <Badge variant={saleStats.isPaid ? 'success' : 'warning'} className="text-[9px] font-black uppercase border-0">
                                        {saleStats.isPaid ? 'Venda Paga' : 'Compromisso Ativo'}
                                    </Badge>
                                    <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">{Math.floor(saleStats.progress)}%</span>
                                </div>
                                <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden p-0.5">
                                    <div className={`h-full rounded-full transition-all duration-700 ${saleStats.isPaid ? 'bg-emerald-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} style={{ width: `${saleStats.progress}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <History size={14} /> Histórico de Recebimentos
                            </h3>
                            <div className="space-y-2">
                                {selectedSale.pagamentos_crediario && selectedSale.pagamentos_crediario.length > 0 ? (
                                    selectedSale.pagamentos_crediario.map((pay) => {
                                        const { value: feeValue, percent: feePercent } = getFeeInfo(pay.valor, pay.metodo, (pay as any).parcelas || 1);
                                        return (
                                            <div key={pay.id} className="flex items-center gap-3 sm:gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                                                    <Check size={18} strokeWidth={3} className="sm:size-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm sm:text-base font-black text-zinc-800 dark:text-zinc-100">
                                                          {formatCurrency(pay.valor)}
                                                        </p>
                                                        {feeValue > 0 && (
                                                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 rounded-md">
                                                              <span className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400">
                                                                  - {formatCurrency(feeValue)} ({feePercent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%)
                                                              </span>
                                                          </div>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 font-bold uppercase flex items-center gap-1 mt-0.5">
                                                        <Calendar size={10} /> {new Date(pay.data).toLocaleDateString('pt-BR')} às {new Date(pay.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase">
                                                      {pay.metodo} {(pay as any).parcelas > 1 ? `${(pay as any).parcelas}x` : ''}
                                                    </p>
                                                    <p className="text-[9px] sm:text-[10px] text-zinc-500 font-medium italic">por {resolveUserName(pay.responsavel_nome)}</p>
                                                </div>
                                            </div>
                                        );
                                    }).reverse()
                                ) : (
                                    <div className="py-12 text-center bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                                        <History size={32} className="mx-auto text-zinc-300 mb-2" />
                                        <p className="text-xs text-zinc-400 italic">Nenhum pagamento registrado ainda.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: REGISTRAR RECEBIMENTO (PADRÃO NOVA VENDA) */}
                    <div className="lg:col-span-5 bg-zinc-50/50 dark:bg-zinc-950/30 border-l border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 lg:min-h-[500px]">
                        {saleStats.isPaid ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={40} className="sm:size-12" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-lg sm:text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">Venda Liquidada</h4>
                                    <p className="text-zinc-500 text-sm max-w-[280px]">Esta transação já foi totalmente quitada pelo cliente no sistema.</p>
                                </div>
                                <Button variant="outline" className="w-full max-w-[240px] h-12 font-bold" onClick={() => setStep('select-sale')}>
                                    Ver outras vendas
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar">
                                <div className="space-y-1">
                                    <h3 className="text-base sm:text-lg font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                        <Wallet size={22} className="text-emerald-600 shrink-0" /> 4. Registrar Recebimento
                                    </h3>
                                    <p className="text-xs text-zinc-500">Selecione o valor e a forma de pagamento do cliente.</p>
                                </div>

                                {/* GRID DE MÉTODOS (PADRÃO NOVA VENDA) */}
                                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                  {METHODS.map(m => {
                                    const isSelected = method === m.id;
                                    return (
                                      <button 
                                        key={m.id} 
                                        onClick={() => { setMethod(m.id); setInstallments(1); }} 
                                        className={`group p-3 sm:p-4 rounded-xl border text-xs sm:text-sm font-bold flex flex-col items-center gap-2 transition-all relative ${isSelected ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 scale-[1.02] shadow-sm' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}
                                      >
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700'}`}>
                                            {typeof m.icon === 'string' ? <span className="text-2xl sm:text-3xl leading-none">{m.icon}</span> : <div className="size-5 sm:size-6">{m.icon}</div>}
                                        </div>
                                        <span className="truncate w-full text-center leading-tight">{m.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {method === 'Cartão de Crédito' && (
                                  <div className="space-y-2 animate-fade-in">
                                    <label className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Parcelamento</label>
                                    <div className="relative">
                                        <select 
                                            value={installments} 
                                            onChange={(e) => setInstallments(Number(e.target.value))} 
                                            className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-sm sm:text-base text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                                        >
                                            {[1,2,3,4,5].map(i => {
                                                const currentAmount = parseCurrency(amountToPayStr);
                                                return (
                                                    <option key={i} value={i}>
                                                        {i}x de {formatCurrency(currentAmount / i)} sem juros
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                    </div>
                                  </div>
                                )}

                                {/* INPUT DE VALOR (PADRÃO NOVA VENDA) */}
                                <div className="space-y-4 pt-4 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Valor do Pagamento</label>
                                            <button 
                                                onClick={() => setAmountToPayStr(saleStats.remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2}))}
                                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 transition-colors uppercase"
                                            >
                                                Quitar Total
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">R$</span>
                                            <input 
                                                type="text" 
                                                inputMode="numeric"
                                                value={amountToPayStr}
                                                onChange={handleCurrencyChange}
                                                className="w-full pl-12 pr-4 py-4 text-2xl sm:text-3xl font-black bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-0 outline-none transition-all text-zinc-900 dark:text-white shadow-sm"
                                                placeholder="0,00"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {/* RESUMO NOVO SALDO */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex justify-between text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                                            <span>Saldo Atual</span>
                                            <span>{formatCurrency(saleStats.remaining)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                                            <span>Amortização</span>
                                            <span>- {formatCurrency(parseCurrency(amountToPayStr))}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase">Saldo Remanescente</span>
                                                <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                                                    {formatCurrency(Math.max(0, saleStats.remaining - parseCurrency(amountToPayStr)))}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] sm:text-[10px] text-emerald-600 font-bold uppercase flex items-center justify-end gap-1"><Banknote size={12} /> Líquido Est.</p>
                                                <p className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300">
                                                    {formatCurrency(parseCurrency(amountToPayStr) - getFeeInfo(parseCurrency(amountToPayStr), method, installments).value)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        variant="success" 
                                        className="w-full h-14 sm:h-16 text-base sm:text-lg font-black gap-3 shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition-all rounded-2xl mt-4" 
                                        disabled={!method || loading || !amountToPayStr || parseCurrency(amountToPayStr) <= 0} 
                                        onClick={handleSave}
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24} /> Confirmar Recebimento</>}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
