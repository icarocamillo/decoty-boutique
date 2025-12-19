
import React, { useState, useEffect } from 'react';
import { X, BookOpen, Check, Loader2, DollarSign, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { mockService } from '../services/mockService';
import { Client } from '../types';

interface CrediarioPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: Client;
}

const METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro'];

export const CrediarioPaymentModal: React.FC<CrediarioPaymentModalProps> = ({ isOpen, onClose, onSuccess, client }) => {
  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setMethod('');
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2 text-red-600"><BookOpen size={20} /><h2 className="font-bold">Receber Crediário</h2></div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center border border-red-100 dark:border-red-900/30">
                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Saldo Devedor Atual</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(maxDebt)}</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-bold mb-1 block">Valor do Pagamento</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">R$</span>
                        <input type="text" inputMode="numeric" value={amountStr} onChange={handleCurrencyChange} className="w-full pl-9 pr-4 py-3 border rounded-lg bg-zinc-50 font-bold text-xl" placeholder="0,00" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {METHODS.map(m => (
                        <button key={m} onClick={() => setMethod(m)} className={`p-3 border rounded-lg text-sm transition-all ${method === m ? 'border-zinc-900 bg-zinc-900 text-white' : 'hover:bg-zinc-50'}`}>{m}</button>
                    ))}
                </div>
            </div>

            <Button variant="primary" className="w-full h-14 text-lg gap-2" disabled={amount <= 0 || amount > maxDebt + 0.01 || !method || loading} onClick={handleSave}>
                {loading ? <Loader2 className="animate-spin" /> : <><Check /> Confirmar Recebimento</>}
            </Button>
        </div>
      </div>
    </div>
  );
};
