
import React, { useState, useEffect } from 'react';
import { X, Gift, Plus, Minus, ArrowRight, Loader2, Save, Wallet } from 'lucide-react';
import { Button } from './ui/Button';
import { backendService } from '../services/backendService';

interface GiftCardAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
  currentBalance: number;
}

export const GiftCardAdjustmentModal: React.FC<GiftCardAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientName,
  currentBalance
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [loading, setLoading] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setOperation('add');
      setLoading(false);
    }
  }, [isOpen]);

  // Helpers
  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    
    const formatted = numberValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setAmountStr(formatted);
  };

  // Calculations
  const inputAmount = parseCurrency(amountStr);
  const finalBalance = operation === 'add' 
    ? currentBalance + inputAmount 
    : currentBalance - inputAmount;

  const isNegativeResult = finalBalance < 0;
  const isValidAmount = inputAmount > 0;

  const handleSave = async () => {
    if (!isValidAmount || isNegativeResult) return;

    setLoading(true);
    try {
      // Se for remover, mandamos o valor negativo para o serviço
      const amountToSend = operation === 'add' ? inputAmount : -inputAmount;
      
      const success = await backendService.addClientBalance(clientId, amountToSend);
      
      if (success) {
        onSuccess();
        onClose();
      } else {
        alert("Erro ao atualizar o saldo. Tente novamente.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao processar transação.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800 flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
              <Gift size={20} />
            </div>
            <div>
               <h2 className="text-lg font-bold text-zinc-800 dark:text-white">Gerenciar Saldo</h2>
               <p className="text-xs text-zinc-500 dark:text-zinc-400">Vale Presente de {clientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            
            {/* Saldo Atual Display */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Saldo Atual Disponível</span>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white font-mono">
                    {formatCurrency(currentBalance)}
                </div>
            </div>

            {/* Operation Toggle */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <button
                    type="button"
                    onClick={() => setOperation('add')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all border ${
                        operation === 'add' 
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 shadow-sm' 
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                    }`}
                >
                    <Plus size={16} /> Adicionar
                </button>
                <button
                    type="button"
                    onClick={() => setOperation('remove')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all border ${
                        operation === 'remove' 
                        ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 shadow-sm' 
                        : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                    }`}
                >
                    <Minus size={16} /> Remover
                </button>
            </div>

            {/* Input Amount */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {operation === 'add' ? 'Valor a adicionar' : 'Valor a remover'}
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">R$</span>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        className="w-full pl-12 pr-4 py-3 text-lg font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        placeholder="0,00"
                        value={amountStr}
                        onChange={handleCurrencyChange}
                        autoFocus
                    />
                </div>
            </div>

            {/* Preview Final Balance */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
                isNegativeResult 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50' 
                : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800'
            }`}>
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Wallet size={16} />
                    <span>Saldo Final Previsto:</span>
                </div>
                <div className={`font-mono font-bold text-lg ${isNegativeResult ? 'text-red-600' : 'text-zinc-900 dark:text-white'}`}>
                    {formatCurrency(finalBalance)}
                </div>
            </div>

            {isNegativeResult && (
                <p className="text-xs text-red-500 text-center font-medium animate-pulse">
                    Atenção: O saldo não pode ficar negativo.
                </p>
            )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancelar
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={loading || !isValidAmount || isNegativeResult}
                className="w-32 bg-amber-600 hover:bg-amber-700 text-white"
            >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <div className="flex items-center gap-2">
                        <Save size={18} /> Salvar
                    </div>
                )}
            </Button>
        </div>

      </div>
    </div>
  );
};
