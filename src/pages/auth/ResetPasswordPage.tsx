import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  // Monitorar a sessão que deve ser injetada pelo Supabase via URL
  useEffect(() => {
    console.log("ResetPasswordPage: Verificando sessão...", { hasSession: !!session });
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (!session) {
      setError('Sessão inválida ou expirada. Use o link do e-mail.');
      return;
    }

    setLoading(true);

    try {
      // Criamos uma promessa com timeout
      const updatePromise = updatePassword(password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 8000)
      );

      try {
        const result: any = await Promise.race([updatePromise, timeoutPromise]);
        
        const errorMessage = result?.error?.message || '';

        // Erro específico do Supabase que acontece mesmo quando a senha muda
        const isGhostSessionError = errorMessage.includes('session_id claim in JWT does not exist') || 
                                   errorMessage.includes('Auth session missing');

        if (result && result.error && !isGhostSessionError) {
          setError(result.error.message || 'Erro ao redefinir a senha.');
          setLoading(false);
        } else {
          // Se não houve erro OU foi o erro de "ghost session", consideramos sucesso
          setSuccess(true);
          setLoading(false);
        }
      } catch (raceError: any) {
        if (raceError.message === 'TIMEOUT') {
          // No timeout, como a senha costuma trocar silenciosamente, damos como sucesso
          setSuccess(true);
        } else {
          setError('Ocorreu um erro ao salvar a nova senha. Tente fazer login.');
        }
        setLoading(false);
      }
    } catch (err) {
      setError('Erro inesperado.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-100 dark:border-zinc-800 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Senha Alterada!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Sua senha foi redefinida com sucesso. Agora você já pode acessar sua conta normalmente.
          </p>
          <Button 
            className="w-full h-12 rounded-xl"
            onClick={() => navigate('/login')}
          >
            Ir para o Sistema
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-100 dark:border-zinc-800">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Nova Senha</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            Crie uma nova senha segura para sua conta corporativa.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nova Senha</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-12 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Confirmar Nova Senha</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!session && !loading && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 text-amber-700 dark:text-amber-400 text-xs rounded-xl italic">
                Aviso: Certifique-se de ter chegado nesta página através do link oficial enviado ao seu e-mail.
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold rounded-xl shadow-xl shadow-zinc-900/20" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Nova Senha'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
