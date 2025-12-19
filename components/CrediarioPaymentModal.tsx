
import React, { useState, useEffect, useMemo } from 'react';
import { X, BookOpen, Check, Loader2, DollarSign, CreditCard, Wallet, AlertCircle, Calendar, Receipt } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { mockService } from '../services/mockService';
import { Client, Sale } from '../types';

interface CrediarioPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: Client;
  sales: Sale[];
}

const METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'];

export const CrediarioPaymentModal: React.FC<CrediarioPaymentModalProps> = ({ isOpen, onClose, onSuccess, client, sales }) => {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setMethod('');
    }
  }, [isOpen]);

  // Filtra as vendas que foram feitas no crediário para este cliente
  const crediarioSales = useMemo(() => {
    return sales.filter(s => s.metodo_pagamento === 'Crediário' && s.status !== 'cancelled')
      .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  }, [sales]);

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const amount = parseCurrency(amountStr);
  const maxDebt = client.saldo_devedor_crediario || 0;

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const numberValue = Number(value) / 100;
    setAmountStr(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = async () => {
    if (amount <= 0 || amount > maxDebt + 0.01 || !method) return;
    
    setLoading(true);
    const success = await mockService.updateClientCrediario(client.id, amount);
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
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2 text-red-600">
            <BookOpen size={20} />
            <h2 className="font-bold">Gerenciar Crediário</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* Seção 1: Listagem de Vendas em Aberto */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Receipt size={14} /> Vendas Originárias (Pendentes)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {crediarioSales.map(sale => (
                        <div key={sale.id} className="p-3 border border-zinc-100 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center group">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-zinc-800 dark:text-white">
                                    {sale.sales_id ? `#${sale.sales_id}` : sale.id.slice(0, 8)}
                                </p>
                                <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                    <Calendar size={10} /> {new Date(sale.data_venda).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(sale.valor_total)}</p>
                                <Badge variant="outline" className="text-[9px] px-1 h-4 border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400">Pendente</Badge>
                            </div>
                        </div>
                    ))}
                    {crediarioSales.length === 0 && (
                        <p className="text-center py-4 text-xs text-zinc-400 italic">Nenhuma venda de crediário encontrada.</p>
                    )}
                </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* Dívida Total Display */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-100 dark:border-red-900/30">
                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Dívida Total Acumulada</p>
                <p className="text-3xl font-black text-red-700 dark:text-red-300">{formatCurrency(maxDebt)}</p>
            </div>

            {/* Form de Pagamento */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Valor do Recebimento</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">R$</span>
                        <input 
                            type="text" 
                            inputMode="numeric" 
                            value={amountStr} 
                            onChange={handleCurrencyChange} 
                            className="w-full pl-9 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 font-bold text-xl text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm" 
                            placeholder="0,00" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-zinc-500 uppercase">Método de Quitação</label>
                   <div className="grid grid-cols-2 gap-2">
                       {METHODS.map(m => (
                           <button 
                                key={m} 
                                onClick={() => setMethod(m)} 
                                className={`p-3 border rounded-lg text-sm font-medium transition-all ${
                                    method === m 
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 shadow-md scale-[1.02]' 
                                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                           >
                               {m}
                           </button>
                       ))}
                   </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
            <Button 
                variant="primary" 
                className="w-full h-14 text-lg gap-2 shadow-lg active:scale-95 transition-transform" 
                disabled={amount <= 0 || amount > maxDebt + 0.01 || !method || loading} 
                onClick={handleSave}
            >
                {loading ? <Loader2 className="animate-spin" /> : <><Check /> Confirmar Recebimento</>}
            </Button>
            <p className="text-[10px] text-zinc-400 text-center mt-3 italic">
                O valor recebido será subtraído do saldo devedor do cliente no sistema.
            </p>
        </div>
      </div>
    </div>
  );
};
