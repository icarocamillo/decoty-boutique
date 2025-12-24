
import { createClient } from '@supabase/supabase-js';

// Suas credenciais do Supabase
const SUPABASE_URL = 'https://izixlmmljvhdyoecgjur.supabase.co' as string; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aXhsbW1sanZoZHlvZWNnanVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTQ2MTYsImV4cCI6MjA4MDk3MDYxNn0.sOWrm663rcimuU_jD_OctJ7qfgsKbV4PZSAoqlWB1Rc' as string;

const ENABLE_DB_CONNECTION = true; 

export const isSupabaseConfigured = () => {
  if (!ENABLE_DB_CONNECTION) return false;
  return SUPABASE_URL.length > 0 && 
         SUPABASE_URL.includes('supabase.co') && 
         !SUPABASE_URL.includes('SUA_URL_DO_SUPABASE');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Força a renovação do token se necessário.
 */
export const refreshSessionIfExpiring = async () => {
  if (!isSupabaseConfigured()) return;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error("Erro ao renovar sessão:", error);
    return session;
  } catch (e) {
    return null;
  }
};

/**
 * Utilitário aprimorado para executar funções assíncronas com lógica de repetição.
 * Agora capaz de recuperar sessões expiradas silenciosamente.
 */
export async function withRetry<T>(
  fn: () => T | Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error.message?.toLowerCase() || '';
    const isAuthError = errorMsg.includes('jwt') || errorMsg.includes('expired') || errorMsg.includes('unauthorized') || error.code === '401';
    const isNetworkError = errorMsg.includes('fetch') || errorMsg.includes('network') || error.code === 'PGRST102';

    if (retries > 0) {
      if (isAuthError) {
        console.debug('Sessão expirada detectada no meio da operação. Tentando renovação silenciosa...');
        await refreshSessionIfExpiring();
        return withRetry(fn, retries - 1, delay); // Tenta de novo imediatamente com novo token
      }

      if (isNetworkError) {
        console.warn(`Falha de conexão. Tentando novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2);
      }
    }
    throw error;
  }
}

/**
 * Heartbeat: Mantém a conexão ativa e renova tokens JWT.
 * Reduzido para 2 minutos para maior confiabilidade.
 */
export const startHeartbeat = () => {
    if (!isSupabaseConfigured()) return;
    
    const interval = setInterval(async () => {
        try {
            // Verifica a sessão ativamente (isso dispara o refresh do token no SDK)
            await supabase.auth.getSession();
            // Ping leve no banco
            await supabase.from('store_config').select('key').limit(1);
        } catch (e) {
            console.debug('Heartbeat: Instabilidade detectada.');
        }
    }, 2 * 60 * 1000); 

    return () => clearInterval(interval);
};
