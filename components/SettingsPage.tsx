
import React, { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Lock, RefreshCw, Check, Settings, ShieldAlert, Database, CreditCard, Percent, DollarSign, Wallet, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { backendService, PaymentDiscounts, PaymentFees } from '../services/backendService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { generateHash } from '../utils';

export const SettingsPage: React.FC = () => {
  const [currentHash, setCurrentHash] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [loadingHash, setLoadingHash] = useState(true);
  const [savingHash, setSavingHash] = useState(false);

  const [discounts, setDiscounts] = useState({
    credit_spot: '',
    debit: '',
    pix: ''
  });
  const [fees, setFees] = useState({
    credit_spot: '',
    credit_installment: '',
    debit: ''
  });
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configUpdated, setConfigUpdated] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
     try {
       const [hash, discData, feeData] = await Promise.all([
         backendService.getStoreAccessHash(),
         backendService.getPaymentDiscounts(),
         backendService.getPaymentFees()
       ]);
       
       setCurrentHash(hash);
       
       setDiscounts({
         credit_spot: String(discData.credit_spot),
         debit: String(discData.debit),
         pix: String(discData.pix)
       });
       
       setFees({
         credit_spot: String(feeData.credit_spot),
         credit_installment: String(feeData.credit_installment),
         debit: String(feeData.debit)
       });
     } catch (error) {
       console.error("Erro ao carregar configurações:", error);
     } finally {
       setLoadingHash(false);
       setLoadingConfig(false);
     }
  };

  const handleGenerateAndSaveHash = async () => {
     const cleanPassword = newPassword.trim();
     if (!cleanPassword) {
       alert("Digite uma nova palavra-chave para a loja.");
       return;
     }

     setSavingHash(true);
     try {
       // Gera a hash SHA-256 e normaliza para minúsculas
       const hash = await generateHash(cleanPassword);

       // Salva no banco (backendService agora usa key='store_access_hash')
       const success = await backendService.updateStoreAccessHash(hash);
       
       if (success) {
          setCurrentHash(hash);
          setIsUpdated(true);
          setNewPassword('');
          setTimeout(() => setIsUpdated(false), 3000);
       } else {
          alert("Erro ao salvar a nova palavra-chave. Verifique políticas RLS ou conexão.");
       }
     } catch (error) {
        console.error(error);
        alert("Erro técnico ao processar segurança.");
     } finally {
        setSavingHash(false);
     }
  };

  const parsePercentage = (value: string) => {
      if (!value) return 0;
      const cleanValue = value.replace(',', '.');
      const num = parseFloat(cleanValue);
      return isNaN(num) ? 0 : num;
  };

  const handleSaveConfig = async () => {
    const hasEmptyDiscount = Object.values(discounts).some(val => val === '');
    const hasEmptyFee = Object.values(fees).some(val => val === '');

    if (hasEmptyDiscount || hasEmptyFee) {
      alert("Por favor, preencha todas as porcentagens. Use 0 se não houver taxa ou desconto.");
      return;
    }

    const allPercents = [
        ...Object.values(discounts),
        ...Object.values(fees)
    ].map(v => parsePercentage(v as string));

    if (allPercents.some(p => p < 0 || p > 100)) {
        alert("Os valores percentuais devem estar entre 0% e 100%.");
        return;
    }

    setSavingConfig(true);

    const numericDiscounts: PaymentDiscounts = {
      credit_spot: parsePercentage(discounts.credit_spot),
      debit: parsePercentage(discounts.debit),
      pix: parsePercentage(discounts.pix)
    };

    const numericFees: PaymentFees = {
      credit_spot: parsePercentage(fees.credit_spot),
      credit_installment: parsePercentage(fees.credit_installment),
      debit: parsePercentage(fees.debit)
    };

    try {
      const [s1, s2] = await Promise.all([
        backendService.updatePaymentDiscounts(numericDiscounts),
        backendService.updatePaymentFees(numericFees)
      ]);

      if (s1 && s2) {
        setConfigUpdated(true);
        setTimeout(() => setConfigUpdated(false), 3000);
      } else {
        alert("Erro ao salvar configurações financeiras.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro de comunicação ao salvar configurações.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDiscountChange = (key: keyof typeof discounts, value: string) => {
    setDiscounts(prev => ({ ...prev, [key]: value }));
  };

  const handleFeeChange = (key: keyof typeof fees, value: string) => {
    setFees(prev => ({ ...prev, [key]: value }));
  };

  const inputNumberClass = "w-full pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white flex items-center gap-2">
            <Settings className="text-zinc-600" /> Configurações do Sistema
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">Gerencie parâmetros globais da aplicação.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-1 space-y-6">
            <Card title="Segurança & Acesso" description="Chave de autorização para equipe.">
                <div className="p-6 space-y-6">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-800 dark:text-white mb-2 flex items-center gap-2">
                        <Lock size={16} className="text-zinc-500" /> Hash SHA-256 Gravada
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                        Código criptografado que autoriza novos registros.
                    </p>
                    <div className="font-mono text-[10px] break-all bg-white dark:bg-zinc-900 p-3 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 select-all min-h-[40px]">
                        {loadingHash ? 'Carregando...' : (currentHash || 'Nenhuma hash encontrada')}
                    </div>
                    </div>

                    <div className="space-y-4">
                        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                            <h4 className="text-sm font-semibold text-zinc-800 dark:text-white mb-4">Nova Palavra-chave</h4>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Palavra Secreta</label>
                                <div className="relative">
                                  <input 
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Ex: LojaDecoty2024"
                                    className="w-full pl-4 pr-10 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
                                    tabIndex={-1}
                                  >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                  </button>
                                </div>
                                <Button onClick={handleGenerateAndSaveHash} className="w-full mt-2 flex items-center justify-center gap-2" disabled={savingHash}>
                                    {savingHash ? <Loader2 className="animate-spin" size={18} /> : (isUpdated ? <Check size={18} /> : <RefreshCw size={18} />)}
                                    {savingHash ? 'Salvando...' : (isUpdated ? 'Atualizado!' : 'Gerar e Salvar Hash')}
                                </Button>
                                <p className="text-[10px] text-zinc-400 italic">Ao salvar, a palavra será transformada em SHA-256 e gravada no banco.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Infraestrutura">
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-4 p-6 pt-2">
                    <div className="flex items-start gap-3">
                        <Database className="shrink-0 mt-1 text-zinc-400" size={18} />
                        <div>
                            <p className="font-semibold text-zinc-900 dark:text-white">Conexão</p>
                            <p>{isSupabaseConfigured() ? 'Supabase Cloud (Produção)' : 'LocalStorage (Offline)'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="shrink-0 mt-1 text-zinc-400" size={18} />
                        <div>
                            <p className="font-semibold text-zinc-900 dark:text-white">Identificador</p>
                            <p>store_access_hash</p>
                        </div>
                    </div>
                </div>
             </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card title="Configurações Financeiras" description="Porcentagens para cálculos automáticos de taxas e descontos.">
                <div className="p-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-700">
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-1.5 rounded-lg">
                              <DollarSign size={16} />
                            </span>
                            <h4 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Descontos Automáticos</h4>
                         </div>
                         
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">PIX (%)</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className={`${inputNumberClass} focus:ring-2 focus:ring-green-500`}
                                    value={discounts.pix}
                                    onChange={(e) => handleDiscountChange('pix', e.target.value)}
                                  />
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Débito (%)</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className={`${inputNumberClass} focus:ring-2 focus:ring-green-500`}
                                    value={discounts.debit}
                                    onChange={(e) => handleDiscountChange('debit', e.target.value)}
                                  />
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Crédito à Vista (%)</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className={`${inputNumberClass} focus:ring-2 focus:ring-green-500`}
                                    value={discounts.credit_spot}
                                    onChange={(e) => handleDiscountChange('credit_spot', e.target.value)}
                                  />
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-700">
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-1.5 rounded-lg">
                              <Wallet size={16} />
                            </span>
                            <h4 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">Taxas de Operação</h4>
                         </div>

                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Cartão Débito (%)</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className={`${inputNumberClass} focus:ring-2 focus:ring-red-500`}
                                    value={fees.debit}
                                    onChange={(e) => handleFeeChange('debit', e.target.value)}
                                  />
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Crédito à Vista (%)</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className={`${inputNumberClass} focus:ring-2 focus:ring-red-500`}
                                    value={fees.credit_spot}
                                    onChange={(e) => handleFeeChange('credit_spot', e.target.value)}
                                  />
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Crédito Parcelado (%)</label>
                               <div className="relative">
                                  <input 
                                    type="number" 
                                    className={`${inputNumberClass} focus:ring-2 focus:ring-red-500`}
                                    value={fees.credit_installment}
                                    onChange={(e) => handleFeeChange('credit_installment', e.target.value)}
                                  />
                                  <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                      <Button onClick={handleSaveConfig} className="flex items-center gap-2" disabled={loadingConfig || savingConfig}>
                          {savingConfig ? <Loader2 className="animate-spin" size={18} /> : (configUpdated ? <Check size={18} /> : <RefreshCw size={18} />)}
                          {savingConfig ? 'Salvando...' : (configUpdated ? 'Configuração Salva!' : 'Salvar Configurações')}
                      </Button>
                   </div>
                </div>
            </Card>
          </div>
      </div>
    </div>
  );
};
