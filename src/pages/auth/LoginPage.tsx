
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, Loader2, AlertCircle, Database, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { isSupabaseConfigured } from '@/services/supabaseClient';
import { BrandLogo } from '@/components/shared/BrandLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showProdBadge, setShowProdBadge] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      const timer = setTimeout(() => {
        setShowProdBadge(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await signIn(email, password);

    if (loginError) {
      setError(loginError.message || 'Erro ao realizar login.');
      setLoading(false);
    } else {
      navigate('/erp/home');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-fade-in-up">
        
        {/* Header Visual */}
        <div className="bg-zinc-900 p-8 text-center">
           <div className="mx-auto flex items-center justify-center mb-4">
              <BrandLogo size="lg" className="bg-white" />
           </div>
           <h1 className="text-5xl font-rouge text-white tracking-wide">Decoty Boutique</h1>
           <p className="text-zinc-400 text-sm mt-1">Moda sofisticada e elegante</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-zinc-800 dark:text-white mb-6 text-center">Acessar Sistema</h2>
          
          {!isSupabaseConfigured() ? (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg text-xs text-yellow-800 dark:text-yellow-400 text-center flex items-center justify-center gap-2">
              <Database size={14} />
              <span><strong>Ambiente de Teste</strong></span>
            </div>
          ) : (
             showProdBadge && (
               <div className="mb-6 p-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg text-xs text-green-700 dark:text-green-400 text-center flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 size={14} />
                <span className="font-medium">Ambiente de Produção</span>
              </div>
             )
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2 text-red-600 dark:text-red-400 text-sm ring-1 ring-red-500">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="leading-snug font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha</label>
                 <button 
                   type="button"
                   onClick={() => navigate('/forgot-password')}
                   className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                 >
                   Esqueceu a senha?
                 </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold mt-2" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-semibold text-zinc-900 dark:text-white hover:underline">
              Cadastrar-se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
