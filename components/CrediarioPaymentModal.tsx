
import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Check, Loader2, DollarSign, CreditCard, Wallet, Calendar, Receipt, ArrowLeft, ChevronRight, Package, Info, Percent } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { mockService, PaymentFees } from '../services/mockService';
import { Client, Sale, SaleItem } from '../types';

interface CrediarioPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: Client;
  sales: Sale[];
}

type Step = 'select-sale' | 'select-items' | 'select-method';

export const CrediarioPaymentModal: React.FC<CrediarioPaymentModalProps> = ({ isOpen, onClose, onSuccess, client, sales }) => {
  const [step, setStep] = useState<Step>('select-sale');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState('');
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feesConfig, setFeesConfig] = useState<PaymentFees | null>(null);

  const METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'];

  useEffect(() => {
    if (isOpen) {
      setStep('select-sale');
      setSelectedSale(null);
      setSelectedItemIds(new Set());
      setMethod('');
      setInstallments(1);
      mockService.getPaymentFees().then(setFeesConfig);
    }
  }, [isOpen]);

  // Reset installments when method changes
  useEffect(() => {
    setInstallments(1);
  }, [method]);

  // Filtra as vendas que foram feitas no crediário para este cliente
  const crediarioSales = useMemo(() => {
    return sales.filter(s => s.metodo_pagamento === 'Crediário' && s.status === 'completed')
      .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  }, [sales]);

  // Itens da venda selecionada (apenas os que não foram devolvidos)
  const availableItems = useMemo(() => {
    if (!selectedSale?.items) return [];
    return selectedSale.items.filter(item => item.status === 'sold');
  }, [selectedSale]);

  const toggleItem = (itemId: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setSelectedItemIds(next);
  };

  const totalToPay = useMemo(() => {
    return availableItems
      .filter(item => selectedItemIds.has(item.id))
      .reduce((acc, curr) => acc + curr.subtotal, 0);
  }, [availableItems, selectedItemIds]);

  const machineFee = useMemo(() => {
    if (!feesConfig || !totalToPay) return 0;
    if (method === 'Cartão de Débito') return totalToPay * (feesConfig.debit / 100);
    if (method === 'Cartão de Crédito') {
      const feePercent = installments > 1 ? feesConfig.credit_installment : feesConfig.credit_spot;
      return totalToPay * (feePercent / 100);
    }
    return 0;
  }, [method, totalToPay, feesConfig, installments]);

  const handleSave = async () => {
    if (totalToPay <= 0 || !method) return;
    
    setLoading(true);
    // No mock, abatemos o valor total dos itens selecionados do saldo devedor do cliente
    const success = await mockService.updateClientCrediario(client.id, totalToPay);
    
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'select-sale' && (
                <button 
                    onClick={() => setStep(step === 'select-method' ? 'select-items' : 'select-sale')}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
            )}
            <div className="flex items-center gap-2 text-red-600">
                <BookOpen size={20} />
                <h2 className="font-bold">Quitar Crediário</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            
            {/* ETAPA 1: SELECIONAR VENDA */}
            {step === 'select-sale' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2">
                            <Receipt size={14} /> 1. Selecione a Venda
                        </h3>
                        <Badge variant="outline" className="text-red-600 border-red-200">
                            Débito Total: {formatCurrency(client.saldo_devedor_crediario || 0)}
                        </Badge>
                    </div>
                    
                    <div className="space-y-2">
                        {crediarioSales.map(sale => (
                            <button 
                                key={sale.id}
                                onClick={() => { setSelectedSale(sale); setStep('select-items'); }}
                                className="w-full p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all flex justify-between items-center group text-left"
                            >
                                <div>
                                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                        Venda #{sale.sales_id || sale.id.slice(0,8)}
                                    </p>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Calendar size={12} /> {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(sale.valor_total)}</span>
                                    <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                                </div>
                            </button>
                        ))}
                        {crediarioSales.length === 0 && (
                            <div className="py-12 text-center text-zinc-400 italic space-y-2">
                                <Info size={32} className="mx-auto opacity-20" />
                                <p>Nenhuma venda de crediário ativa encontrada.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ETAPA 2: SELECIONAR ITENS */}
            {step === 'select-items' && selectedSale && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2 mb-4">
                        <Package size={14} /> 2. Selecione os Itens para Quitar
                    </h3>

                    <div className="space-y-2">
                        {availableItems.map(item => (
                            <label 
                                key={item.id}
                                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                                    selectedItemIds.has(item.id)
                                    ? 'border-green-500 bg-green-50/30 dark:bg-green-900/10 ring-1 ring-green-500'
                                    : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="checkbox"
                                        checked={selectedItemIds.has(item.id)}
                                        onChange={() => toggleItem(item.id)}
                                        className="w-4 h-4 rounded border-zinc-300 text-green-600 focus:ring-green-500 bg-transparent"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{item.nome_produto}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase font-medium">{item.marca} • Tam: {item.tamanho}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(item.subtotal)}</span>
                            </label>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-500">Valor Selecionado:</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">{formatCurrency(totalToPay)}</span>
                    </div>

                    <Button 
                        variant="primary" 
                        className="w-full h-12 mt-4"
                        disabled={selectedItemIds.size === 0}
                        onClick={() => setStep('select-method')}
                    >
                        Prosseguir para Pagamento <ChevronRight size={18} className="ml-1" />
                    </Button>
                </div>
            )}

            {/* ETAPA 3: MÉTODO DE PAGAMENTO */}
            {step === 'select-method' && (
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Wallet size={14} /> 3. Forma de Recebimento
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        {METHODS.map(m => (
                            <button 
                                key={m} 
                                onClick={() => setMethod(m)} 
                                className={`p-4 border rounded-xl text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                    method === m 
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.02]' 
                                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                            >
                                {m === 'Pix' && <span>💠</span>}
                                {m.includes('Cartão') && <CreditCard size={24} />}
                                {m === 'Dinheiro' && <DollarSign size={24} />}
                                <span>{m}</span>
                            </button>
                        ))}
                    </div>

                    {/* Parcelamento para Crédito */}
                    {method === 'Cartão de Crédito' && (
                        <div className="space-y-2 animate-fade-in">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Parcelamento</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 3, 4, 5].map(i => {
                                    const valParcela = totalToPay / i;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setInstallments(i)}
                                            className={`p-2 border rounded-lg text-[10px] flex flex-col items-center transition-all ${
                                                installments === i
                                                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-sm'
                                                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                            }`}
                                        >
                                            <span className="font-bold">{i}x</span>
                                            <span className="opacity-80">{formatCurrency(valParcela)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Resumo Financeiro com Taxas */}
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Subtotal (Itens):</span>
                            <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(totalToPay)}</span>
                        </div>
                        
                        {(method === 'Cartão de Débito' || method === 'Cartão de Crédito') && (
                            <div className="flex justify-between text-xs text-red-500 font-medium animate-fade-in">
                                <span className="flex items-center gap-1">
                                    <Percent size={12} /> Taxa Maquininha {installments > 1 ? `(${installments}x)` : '(À Vista)'}:
                                </span>
                                <span>- {formatCurrency(machineFee)}</span>
                            </div>
                        )}

                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2"></div>
                        
                        <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-zinc-500 uppercase">Total a Receber</span>
                            <div className="text-right">
                                <span className="text-3xl font-black text-zinc-900 dark:text-white block">
                                    {formatCurrency(totalToPay)}
                                </span>
                                {installments > 1 && method === 'Cartão de Crédito' && (
                                    <span className="text-[10px] text-zinc-400 font-medium italic">
                                        {installments}x de {formatCurrency(totalToPay / installments)}
                                    </span>
                                )}
                            </div>
                        </div>
                        {machineFee > 0 && (
                             <p className="text-[10px] text-zinc-400 italic text-right">
                                Líquido estimado: {formatCurrency(totalToPay - machineFee)}
                             </p>
                        )}
                    </div>

                    <Button 
                        variant="success" 
                        className="w-full h-14 text-lg gap-2 shadow-lg active:scale-95 transition-transform" 
                        disabled={!method || loading} 
                        onClick={handleSave}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Check /> Confirmar Quitação</>}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
