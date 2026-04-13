import { createClient } from '@supabase/supabase-js';

interface SupabaseEnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

const ENABLE_DB_CONNECTION = true;

const getEnvVar = (key: keyof SupabaseEnvVars): string => {
  const value = import.meta.env[key];
  if (!value || value === '' || value.includes('seu-projeto')) {
    throw new Error(
      `Variável de ambiente "${key}" não configurada!\n\nPor favor, crie um arquivo .env na raiz do projeto com:\n${key}=seu-valor-aqui\n\nVeja o arquivo .env.example para referência.`
    );
  }
  return value;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL.includes('supabase.co')) {
  throw new Error('URL do Supabase inválida! Verifique o valor de VITE_SUPABASE_URL no arquivo .env');
}

export const isSupabaseConfigured = (): boolean => {
  try {
    if (!ENABLE_DB_CONNECTION) return false;
    return (
      SUPABASE_URL.length > 0 &&
      SUPABASE_URL.includes('supabase.co') &&
      SUPABASE_ANON_KEY.length > 0
    );
  } catch {
    return false;
  }
};

// Cliente único e simples — sem fetch customizado, sem AbortController.
// O keep-alive no App.tsx (ping a cada 2 min) mantém a conexão ativa.
// O visibilitychange no App.tsx faz re-fetch ao voltar para a aba.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: { 'x-client-info': 'decoty-boutique@1.0.0' }
  }
});

export const getSupabase = () => supabase;

export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  hasValidConfig: isSupabaseConfigured()
} as const;

if (import.meta.env.DEV) {
  console.log('🔧 Ambiente:', import.meta.env.MODE);
  console.log('🔗 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
}