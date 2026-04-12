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

// ─── Fetch com retry automático ───────────────────────────────────────────────
// Quando a conexão HTTP cai por inatividade, a primeira query trava sem resposta.
// Resolvemos isso com um fetch customizado que detecta o travamento (AbortController)
// e tenta novamente automaticamente — sem recriar o cliente e sem perder a sessão.

const QUERY_TIMEOUT_MS = 8000;  // 8s sem resposta = conexão travada
const MAX_RETRIES = 2;

const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  attempt = 0
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err: any) {
    clearTimeout(timer);
    const isAborted = err?.name === 'AbortError';
    const isNetworkError = err?.name === 'TypeError';

    if ((isAborted || isNetworkError) && attempt < MAX_RETRIES) {
      const delay = (attempt + 1) * 500; // 500ms, 1000ms
      console.log(`[Decoty] Query travada (tentativa ${attempt + 1}/${MAX_RETRIES}) — retentando em ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(input, init, attempt + 1);
    }

    throw err;
  }
};

// ─── Cliente único com fetch customizado ──────────────────────────────────────
// Um único cliente para toda a aplicação — sem recriar, sem perder sessão.
// O retry automático resolve o problema de conexão travada por inatividade.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    fetch: fetchWithRetry,
    headers: { 'x-client-info': 'decoty-boutique@1.0.0' }
  }
});

// getSupabase() mantido para compatibilidade com backendService e AuthContext
// Retorna sempre o mesmo cliente — não há mais necessidade de recriar
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