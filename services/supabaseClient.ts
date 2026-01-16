import { createClient } from '@supabase/supabase-js';

// Tipagem segura das variáveis de ambiente
interface SupabaseEnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

// CONTROLE DE CONEXÃO
// Mude para 'false' se quiser desativar o Supabase temporariamente e usar dados fictícios.
// Mude para 'true' para conectar ao banco de dados real.
const ENABLE_DB_CONNECTION = true; 

// VALIDAÇÃO: Garantir que as variáveis existem
const getEnvVar = (key: keyof SupabaseEnvVars): string => {
  const value = import.meta.env[key];
  
  if (!value || value === '' || value.includes('seu-projeto')) {
    throw new Error(
      `Variável de ambiente "${key}" não configurada!\n\n` +
      `Por favor, crie um arquivo .env na raiz do projeto com:\n` +
      `${key}=seu-valor-aqui\n\n` +
      `Veja o arquivo .env.example para referência.`
    );
  }
  
  return value;
};

// OBTER CREDENCIAIS COM VALIDAÇÃO
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

// VALIDAÇÃO ADICIONAL: Formato da URL
if (!SUPABASE_URL.includes('supabase.co')) {
  throw new Error(
    'URL do Supabase inválida! Verifique o valor de VITE_SUPABASE_URL no arquivo .env'
  );
}

// FUNÇÃO DE VERIFICAÇÃO (para uso interno no app)
export const isSupabaseConfigured = (): boolean => {
  try {
      if (!ENABLE_DB_CONNECTION)
        return false;
    return (
      SUPABASE_URL.length > 0 && 
      SUPABASE_URL.includes('supabase.co') && 
      SUPABASE_ANON_KEY.length > 0
    );
  } catch {
    return false;
  }
};

// CRIAR CLIENTE SUPABASE COM CONFIGURAÇÕES OTIMIZADAS
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,      // Renovar token automaticamente
    persistSession: true,         // Salvar sessão no localStorage
    detectSessionInUrl: true,     // Detectar token na URL (OAuth)
    flowType: 'pkce'              // Usar PKCE para segurança
  },
  realtime: {
    params: {
      eventsPerSecond: 1          // Mínimo possível (não usamos realtime)
    }
  },
  global: {
    headers: {
      'x-client-info': 'decoty-boutique@1.0.0'
    }
  }
});

// DESABILITAR REALTIME (performance)
if (isSupabaseConfigured()) {
  supabase.realtime.disconnect();
  console.log('Supabase Client inicializado (Realtime desabilitado)');
}

// EXPORTAR CONSTANTES (somente leitura)
export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  hasValidConfig: isSupabaseConfigured()
} as const;

// LOG DE DEBUG (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔧 Ambiente:', import.meta.env.MODE);
  console.log('🔗 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
}