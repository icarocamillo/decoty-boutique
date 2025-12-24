
import { X, BookOpen, Check, Loader2, DollarSign, CreditCard, Wallet, Calendar, Receipt, ArrowLeft, ChevronRight, ChevronDown, Package, Info, Percent, History, Clock, TrendingUp, User as UserIcon, PieChart, Banknote, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { mockService, PaymentFees } from '../services/mockService';
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

  const METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'];

  useEffect(() => {
    if (isOpen) {
      setStep('select-sale');
      setSelectedSale(null);
      setMethod('Pix');
      setInstallments(1);
      setAmountToPayStr('');
      setLoading(false);
      
      // Busca usuários e configurações de taxas
      Promise.all([
          mockService.getUsers(),
          mockService.getPaymentFees()
      ]).then(([usersData, feesData]) => {
          setUsers(usersData);
          setFees(feesData);
      });
    }
  }, [isOpen]);

  // Função auxiliar para resolver o nome do responsável
  const resolveUserName = (userId: string) => {
    const profile = users.find(u => u.id === userId);
    if (profile) return profile.name;
    if (userId?.length > 30) return 'Vendedor';
    return userId || 'Sistema';
  };

  // Função para calcular taxa de um recebimento específico
  const calculateFeeValue = useCallback((amount: number, methodName: string, numInstallments: number) => {
      if (!fees) return 0;
      let percent = 0;
      if (methodName === 'Cartão de Débito') {
        percent = fees.debit;
      } else if (methodName === 'Cartão de Crédito') {
        // Se for 1 parcela usa taxa à vista, senão usa taxa de parcelamento
        percent = numInstallments === 1 ? fees.credit_spot : fees.credit_installment;
      }
      
      return amount * (percent / 100);
  }, [fees]);

  // Vendas de crediário (Todas do cliente, incluindo quitadas)
  const crediarioSales = useMemo(() => {
    // Filtramos apenas vendas onde o método foi "Crediário"
    // Removemos a verificação de s.status_pagamento para garantir que as "pagas" também apareçam
    return sales
      .filter(s => s.metodo_pagamento === 'Crediário' && s.status === 'completed')
      .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  }, [sales]);

  // Cálculos da Venda Selecionada (Incluindo Líquido Total)
  const saleStats = useMemo(() => {
      if (!selectedSale) return null;
      const total = selectedSale.valor_total;
      
      let totalPaid = 0;
      let totalNet = 0;

      selectedSale.pagamentos_crediario?.forEach(p => {
          totalPaid += p.valor;
          // Para o histórico, calculamos a taxa baseada no método usado no recebimento
          const historicalFee = calculateFeeValue(p.valor, p.metodo, 1);
          totalNet += (p.valor - historicalFee);
      });

      const remaining = Math.max(0, total - totalPaid);
      const progress = (totalPaid / total) * 100;
      const isPaid = remaining <= 0.01; // Tolerância de centavos
      
      return { 
          total, 
          paid: totalPaid, 
          netReceived: totalNet,
          remaining, 
          progress,
          isPaid
      };
  }, [selectedSale, calculateFeeValue]);

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
    
    if (amount > saleStats.remaining + 0.05) { // Tolerância de 5 centavos
        alert("O valor informado é maior que o saldo devedor desta venda.");
        return;
    }

    setLoading(true);
    const success = await mockService.processCrediarioPayment(
        client.id, 
        amount,
        selectedSale.id,
        method,
        user?.id || '' 
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
      <div className="bg-white dark:bg-zinc-900 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden border-0 sm:border border-zinc-200 dark:border-zinc-800 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'select-sale' && (
                <button 
                    onClick={() => setStep('select-sale')}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
            )}
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <BookOpen size={20} />
                <h2 className="font-bold text-lg">Receber Crediário</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            
            {/* ETAPA 1: SELECIONAR VENDA */}
            {step === 'select-sale' && (
                <div className="space-y-6 max-w-2xl mx-auto py-4">
                    <div className="flex flex-col items-center text-center space-y-2 mb-8">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mb-2">
                            <Wallet size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-800 dark:text-white">Selecione uma venda</h3>
                        <p className="text-zinc-500 text-sm">Visualizando histórico de crediário de <strong>{client.nome}</strong></p>
                    </div>
                    
                    <div className="space-y-3">
                        {crediarioSales.map(sale => {
                            const paid = sale.pagamentos_crediario?.reduce((sum, p) => sum + p.valor, 0) || 0;
                            const remaining = Math.max(0, sale.valor_total - paid);
                            const progress = (paid / sale.valor_total) * 100;
                            const isFullyPaid = remaining <= 0.05;

                            return (
                                <button 
                                    key={sale.id}
                                    onClick={() => { setSelectedSale(sale); setStep('payment-details'); }}
                                    className={`w-full p-5 border rounded-2xl bg-white dark:bg-zinc-900 transition-all flex flex-col gap-4 group shadow-sm hover:shadow-md ${
                                        isFullyPaid 
                                        ? 'border-zinc-100 dark:border-zinc-800' 
                                        : 'border-zinc-200 dark:border-zinc-800 hover:border-red-500 dark:hover:border-red-500'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-zinc-400">
                                                <Receipt size={20} />
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
                                        <div className="text-right">
                                            <p className="text-xs text-zinc-400 font-bold uppercase mb-0.5">{isFullyPaid ? 'Total da Venda' : 'Saldo Devedor'}</p>
                                            <p className={`text-lg font-black ${isFullyPaid ? 'text-zinc-500' : 'text-red-600 dark:text-red-400'}`}>
                                                {formatCurrency(isFullyPaid ? sale.valor_total : remaining)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400">
                                            <span>Progresso de Quitação</span>
                                            <span>{Math.floor(progress)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${isFullyPaid ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                        {crediarioSales.length === 0 && (
                            <div className="py-16 text-center text-zinc-400 italic space-y-3 animate-fade-in">
                                <Info size={48} className="mx-auto opacity-10" />
                                <p>Este cliente não possui vendas marcadas como "Crediário".</p>
                                <Button variant="secondary" size="sm" onClick={onClose} className="mt-4">Voltar para o histórico</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ETAPA 2: DETALHES E PAGAMENTO */}
            {step === 'payment-details' && selectedSale && saleStats && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
                    
                    {/* COLUNA ESQUERDA: RESUMO DA VENDA E HISTÓRICO */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Status Card */}
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp size={14} /> Desempenho de Pagamento
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Total da Venda</p>
                                    <p className="text-xl font-black text-zinc-900 dark:text-white">{formatCurrency(saleStats.total)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Total Recebido (Bruto)</p>
                                    <p className="text-xl font-black text-zinc-700 dark:text-zinc-200">{formatCurrency(saleStats.paid)}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Líquido Lojista</p>
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(saleStats.netReceived)}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <Badge variant={saleStats.isPaid ? "success" : "warning"} className="text-[10px] font-black uppercase">
                                        {saleStats.isPaid ? 'Venda Quitada' : `Falta Receber: ${formatCurrency(saleStats.remaining)}`}
                                    </Badge>
                                    <span className="text-sm font-black text-zinc-900 dark:text-white">{Math.floor(saleStats.progress)}% quitado</span>
                                </div>
                                <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden p-0.5">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: `${saleStats.progress}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Itens da Venda */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Package size={14} /> Itens Comprados
                            </h3>
                            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                                {selectedSale.items?.filter(i => i.status === 'sold').map(item => (
                                    <div key={item.id} className="p-3 flex justify-between items-center bg-white dark:bg-zinc-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                <Badge variant="outline" className="px-1 text-[8px]">{item.tamanho}</Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{item.nome_produto}</p>
                                                <p className="text-[10px] text-zinc-400 uppercase font-medium">{item.marca}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-zinc-900 dark:text-white">{formatCurrency(item.subtotal)}</p>
                                                {item.status_pagamento === 'pago' ? (
                                                    <Badge variant="success" className="text-[8px] h-3 px-1">Item Quitado</Badge>
                                                ) : (
                                                    <Badge variant="warning" className="text-[8px] h-3 px-1">Aguardando</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Histórico de Pagamentos */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <History size={14} /> Histórico de Recebimentos
                            </h3>
                            <div className="space-y-2">
                                {selectedSale.pagamentos_crediario && selectedSale.pagamentos_crediario.length > 0 ? (
                                    selectedSale.pagamentos_crediario.map((pay) => {
                                        const feeValue = calculateFeeValue(pay.valor, pay.metodo, 1);

                                        return (
                                            <div key={pay.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-emerald-500 shadow-sm border border-zinc-100 dark:border-zinc-700 shrink-0">
                                                    <Check size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatCurrency(pay.valor)}</p>
                                                        {feeValue > 0 && (
                                                            <span className="text-[10px] font-medium text-red-500 flex items-center gap-0.5">
                                                                <PieChart size={10} /> -{formatCurrency(feeValue)} taxa
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                        <Calendar size={10} /> {new Date(pay.data).toLocaleDateString('pt-BR')} às {new Date(pay.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] font-black text-zinc-400 uppercase">{pay.metodo}</p>
                                                    <p className="text-[10px] text-zinc-500 font-medium">por {resolveUserName(pay.responsavel_nome)}</p>
                                                </div>
                                            </div>
                                        );
                                    }).reverse()
                                ) : (
                                    <div className="py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                        <p className="text-xs text-zinc-400 italic">Nenhum pagamento registrado anteriormente.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: FORMULÁRIO OU AVISO DE QUITAÇÃO */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl sticky top-4">
                            
                            {saleStats.isPaid ? (
                                <div className="py-10 flex flex-col items-center text-center animate-fade-in">
                                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <h3 className="text-xl font-black text-zinc-800 dark:text-white uppercase tracking-tight">Venda Quitada</h3>
                                    <p className="text-sm text-zinc-500 mt-2 px-4">Esta venda foi totalmente paga e não possui saldo devedor.</p>
                                    <Button variant="outline" className="mt-8 w-full" onClick={() => setStep('select-sale')}>
                                        Selecionar outra venda
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-sm font-black text-zinc-800 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <DollarSign size={18} className="text-emerald-600" /> Registrar Recebimento
                                    </h3>

                                    <div className="space-y-6">
                                        {/* Input de Valor */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Quanto o cliente está pagando hoje?</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-zinc-400">R$</span>
                                                <input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    value={amountToPayStr}
                                                    onChange={handleCurrencyChange}
                                                    className="w-full pl-12 pr-4 py-4 text-2xl font-black bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 rounded-2xl focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-0 outline-none transition-all text-zinc-900 dark:text-white"
                                                    placeholder="0,00"
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => setAmountToPayStr(saleStats.remaining.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2}))}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-1 rounded hover:opacity-80 transition-opacity"
                                                >
                                                    VALOR TOTAL
                                                </button>
                                            </div>
                                        </div>

                                        {/* Métodos de Pagamento */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Forma de Recebimento</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {METHODS.map(m => (
                                                    <button 
                                                        key={m} 
                                                        onClick={() => { setMethod(m); setInstallments(1); }} 
                                                        className={`p-3 border rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                                                            method === m 
                                                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-md' 
                                                            : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                                        }`}
                                                    >
                                                        {m === 'Pix' && <span className="text-base">💠</span>}
                                                        {m.includes('Cartão') && <CreditCard size={16} />}
                                                        {m === 'Dinheiro' && <DollarSign size={16} />}
                                                        <span className="truncate">{m}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Seletor de Parcelas */}
                                        {method === 'Cartão de Crédito' && (
                                            <div className="space-y-2 animate-fade-in">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Parcelamento</label>
                                                <div className="relative">
                                                    <select 
                                                        value={installments} 
                                                        onChange={(e) => setInstallments(Number(e.target.value))} 
                                                        className="w-full p-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
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

                                        {/* Resumo Final Previsto */}
                                        {parseCurrency(amountToPayStr) > 0 && (
                                            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20 space-y-2">
                                                <div className="flex justify-between items-center text-xs text-zinc-500">
                                                    <span>Novo Saldo Devedor:</span>
                                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                                        {formatCurrency(Math.max(0, saleStats.remaining - parseCurrency(amountToPayStr)))}
                                                    </span>
                                                </div>
                                                {calculateFeeValue(parseCurrency(amountToPayStr), method, installments) > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] text-red-500 font-bold border-t border-emerald-100 dark:border-emerald-800 pt-2">
                                                        <span className="flex items-center gap-1"><PieChart size={12} /> Taxa da Operadora ({method === 'Cartão de Crédito' && installments > 1 ? 'Parcelado' : 'À Vista'}):</span>
                                                        <span>-{formatCurrency(calculateFeeValue(parseCurrency(amountToPayStr), method, installments))}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-[10px] text-emerald-600 font-bold border-t border-emerald-100 dark:border-emerald-800 pt-2">
                                                    <span className="flex items-center gap-1"><Banknote size={12} /> Líquido desta transação:</span>
                                                    <span>{formatCurrency(parseCurrency(amountToPayStr) - calculateFeeValue(parseCurrency(amountToPayStr), method, installments))}</span>
                                                </div>
                                            </div>
                                        )}

                                        <Button 
                                            variant="success" 
                                            className="w-full h-16 text-lg font-black gap-3 shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition-transform rounded-2xl" 
                                            disabled={!method || loading || !amountToPayStr || parseCurrency(amountToPayStr) <= 0} 
                                            onClick={handleSave}
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <><Check size={24} /> Confirmar Recebimento</>}
                                        </Button>
                                        
                                        <p className="text-[10px] text-zinc-400 text-center px-4 leading-relaxed">
                                            Ao confirmar, o saldo será abatido da dívida do cliente e registrado no histórico desta venda.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
