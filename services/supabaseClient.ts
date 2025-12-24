
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Utilitário para executar funções assíncronas com lógica de repetição (Retry)
 * Útil para mitigar falhas temporárias de rede ou "cold starts" do banco.
 */
// Fix: Corrected type signature of withRetry to remove 'any' which was breaking type inference for callers.
export async function withRetry<T>(
  fn: () => T | Promise<T>, 
  retries = 3, 
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isNetworkError = error.message?.toLowerCase().includes('fetch') || 
                           error.message?.toLowerCase().includes('network') ||
                           error.code === 'PGRST102'; // Timeout code

    if (retries > 0 && isNetworkError) {
      console.warn(`Conexão instável. Tentando novamente em ${delay}ms... (${retries} tentativas restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Heartbeat: Mantém a conexão ativa e renova tokens JWT.
 */
export const startHeartbeat = () => {
    if (!isSupabaseConfigured()) return;
    
    // Executa a cada 5 minutos
    const interval = setInterval(async () => {
        try {
            // Consulta ultra-leve apenas para manter o túnel HTTP aberto
            await supabase.from('store_config').select('key').limit(1);
        } catch (e) {
            console.debug('Heartbeat falhou, tentando reconectar...');
        }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
};
