
import { createClient } from '@supabase/supabase-js';

// Suas credenciais do Supabase
const SUPABASE_URL = 'https://izixlmmljvhdyoecgjur.supabase.co' as string; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aXhsbW1sanZoZHlvZWNnanVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTQ2MTYsImV4cCI6MjA4MDk3MDYxNn0.sOWrm663rcimuU_jD_OctJ7qfgsKbV4PZSAoqlWB1Rc' as string;

// --- CONTROLE DE CONEXÃO ---
// Mude para 'false' se quiser desativar o Supabase temporariamente e usar dados fictícios.
// Mude para 'true' para conectar ao banco de dados real.
const ENABLE_DB_CONNECTION = true; 

export const isSupabaseConfigured = () => {
  // Se a constante de controle estiver desligada, retornamos false para forçar o modo Mock
  if (!ENABLE_DB_CONNECTION) return false;

  // Verifica se a URL é válida e não é um placeholder genérico
  return SUPABASE_URL.length > 0 && 
         SUPABASE_URL.includes('supabase.co') && 
         !SUPABASE_URL.includes('SUA_URL_DO_SUPABASE');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);