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
  return true;
};

// Limite de tempo das chamadas de autenticação (/auth/v1/: login, renovação de token, logout).
// A renovação de token roda segurando a trava de sessão compartilhada entre as abas. Sem limite,
// uma requisição pendurada (rede instável, volta de suspensão) deixaria todas as abas sem
// resposta até ela terminar. Com o limite, a tentativa falha, a trava é liberada e a renovação
// é tentada de novo. As demais chamadas (dados e Storage) não são afetadas.
const AUTH_REQUEST_TIMEOUT_MS = 15000;

const fetchWithAuthTimeout: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes('/auth/v1/') || init?.signal) return fetch(input, init);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

// Cliente único, compartilhado pelo ERP e pelo site.
// As requisições são HTTP sem conexão persistente: não há o que manter vivo com ping.
// A sessão é renovada pelo próprio supabase-js (autoRefreshToken) e coordenada entre as abas
// por uma trava do navegador (navigator.locks). Por isso o callback de onAuthStateChange
// não pode chamar o Supabase: ver o aviso em src/contexts/AuthContext.tsx.
// A recarga de dados ao voltar para a aba fica no DataContext.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: { 'x-client-info': 'decoty-boutique@1.0.0' },
    fetch: fetchWithAuthTimeout
  }
});

export const getSupabase = () => supabase;

export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  hasValidConfig: isSupabaseConfigured()
} as const;

