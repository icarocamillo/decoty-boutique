
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Mail, Lock, Loader2, AlertCircle, UserCheck, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { mockService } from '../services/mockService';
import { generateHash } from '../utils';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    storeCode: '',
    role: 'salesperson' as 'manager' | 'salesperson'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showStoreCode, setShowStoreCode] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        setLoading(false);
        return;
    }

    try {
      const storedHash = await mockService.getStoreAccessHash();
      // Uso da função segura (Async)
      const inputHash = await generateHash(formData.storeCode);
      
      if (inputHash !== storedHash) {
        setError("Código de acesso da loja inválido. Solicite ao administrador.");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao validar credenciais.");
      setLoading(false);
      return;
    }

    const { error } = await signUp(formData.email, formData.password, formData.name, formData.role);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      alert("Cadastro realizado com sucesso! Faça login para continuar.");
      navigate('/login');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-fade-in-up">
        
        <div className="p-8 pb-0 text-center">
           <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Criar Conta</h1>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Junte-se ao time da Decoty Boutique</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
             
             <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Completo</label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                  placeholder="Ex: Ana Silva"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha Pessoal</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                  placeholder="Crie sua senha de acesso"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
               <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">Perfil de Acesso</label>
               <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${formData.role === 'salesperson' ? 'border-zinc-900 bg-zinc-50 dark:bg-zinc-800 dark:border-white ring-1 ring-zinc-900 dark:ring-white' : 'border-zinc-200 dark:border-zinc-700'}`}>
                      <input type="radio" name="role" value="salesperson" checked={formData.role === 'salesperson'} onChange={handleChange} className="hidden" />
                      <User size={20} className={formData.role === 'salesperson' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'} />
                      <span className={`text-sm font-medium ${formData.role === 'salesperson' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Vendedor</span>
                  </label>
                  
                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${formData.role === 'manager' ? 'border-zinc-900 bg-zinc-50 dark:bg-zinc-800 dark:border-white ring-1 ring-zinc-900 dark:ring-white' : 'border-zinc-200 dark:border-zinc-700'}`}>
                      <input type="radio" name="role" value="manager" checked={formData.role === 'manager'} onChange={handleChange} className="hidden" />
                      <ShieldCheck size={20} className={formData.role === 'manager' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'} />
                      <span className={`text-sm font-medium ${formData.role === 'manager' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>Gerente</span>
                  </label>
               </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-4">
                <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1">
                  <ShieldCheck size={14} /> Segurança
                </label>
                <div className="relative">
                  <input 
                    type={showStoreCode ? 'text' : 'password'}
                    name="storeCode"
                    required
                    value={formData.storeCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all text-sm"
                    placeholder="Código de Acesso da Loja"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStoreCode(!showStoreCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showStoreCode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Necessário para autorizar novos cadastros.</p>
             </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold mt-4" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Já tem uma conta?{' '}
            <span onClick={() => navigate('/login')} className="font-semibold text-zinc-900 dark:text-white hover:underline cursor-pointer">
              Fazer Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
