
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Loader2, AlertCircle, UserCheck, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { backendService } from '@/services/backendService';
import { generateHash } from '@/utils';

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

    // Validação básica de senha local
    if (formData.password.length < 6) {
        setError("A senha pessoal deve ter no mínimo 6 caracteres.");
        setLoading(false);
        return;
    }

    // Validação da palavra-chave de segurança
    const keyword = formData.storeCode.trim();
    if (!keyword) {
        setError("Digite a palavra-chave da loja para autorizar o cadastro.");
        setLoading(false);
        return;
    }

    try {
      // 1. Busca a hash autorizada do banco (chave='store_access_hash' na coluna 'value')
      const storedHash = await backendService.getStoreAccessHash();
      
      if (!storedHash) {
          console.error("Segurança: Falha ao recuperar 'store_access_hash' do banco de dados.");
          setError("O sistema de segurança não pôde ser verificado. No Supabase, execute o seguinte comando no SQL Editor: \n\nCREATE POLICY \"Allow public access\" ON store_config FOR SELECT USING (true);");
          setLoading(false);
          return;
      }

      // 2. Transforma o que o usuário digitou em SHA-256
      const inputHash = await generateHash(keyword);
      
      // 3. Normalização ABSOLUTA: remove espaços, aspas e caracteres não-hexadecimais
      const normalizedInput = inputHash.replace(/[^a-f0-9]/gi, '').toLowerCase();
      const normalizedStored = storedHash.replace(/[^a-f0-9]/gi, '').toLowerCase();
      
      console.debug("Comparando Hashes:", { input: normalizedInput.substring(0, 8), stored: normalizedStored.substring(0, 8) });

      if (normalizedInput !== normalizedStored) {
        console.warn("Segurança: Tentativa de cadastro negada - Palavra-chave incorreta.");
        setError("Palavra-chave da loja inválida. Solicite a chave correta ao gerente responsável.");
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Erro crítico na validação de segurança:", err);
      setError("Erro de conexão com o banco de dados. Verifique sua rede.");
      setLoading(false);
      return;
    }

    // Se a palavra-chave estiver correta, prossegue com a criação da conta via Supabase Auth
    const { error: signUpError } = await signUp(formData.email, formData.password, formData.name, formData.role);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      alert("Cadastro realizado com sucesso! Faça login para acessar o sistema.");
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
              <span className="leading-tight whitespace-pre-wrap">{error}</span>
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
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail Corporativo</label>
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
               <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha Pessoal de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                  placeholder="••••••••"
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
                  <ShieldCheck size={14} /> Palavra-chave da Loja
                </label>
                <div className="relative">
                  <input 
                    type={showStoreCode ? 'text' : 'password'}
                    name="storeCode"
                    required
                    value={formData.storeCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all text-sm"
                    placeholder="Código de autorização"
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
                <p className="text-[10px] text-zinc-400 mt-1">Obrigatório para validar sua entrada na equipe.</p>
             </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold mt-4" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Finalizar Cadastro'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Já possui uma conta?{' '}
            <span onClick={() => navigate('/login')} className="font-semibold text-zinc-900 dark:text-white hover:underline cursor-pointer">
              Fazer Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
