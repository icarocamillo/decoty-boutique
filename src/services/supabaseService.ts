import { getSupabase } from '@/services/supabaseClient';
import { Client } from '@/types';

export const supabaseService = {
  updateUserRole: async (userId: string, role: string): Promise<boolean> => {
    const { error } = await getSupabase().from('profiles').update({ role: role }).eq('id', userId);
    if (error) console.error("Erro ao atualizar role (verifique Políticas RLS):", error);
    return !error;
  },

  // --- VÍNCULO TARDIO DE CLIENTE ---
  linkClientToSale: async (saleId: string, client: Client): Promise<boolean> => {
    // 1. Atualiza a Venda
    const { error: saleError } = await getSupabase()
      .from('sales')
      .update({ 
        cliente_id: client.id,
        cliente_nome: client.nome,
        cliente_cpf: client.cpf
      })
      .eq('id', saleId);

    if (saleError) {
      console.error("Erro ao vincular cliente na venda:", saleError);
      return false;
    }

    // 2. Busca o ID Visual da venda (sales_id) para encontrar logs de estoque
    const { data: saleData } = await getSupabase().from('sales').select('sales_id').eq('id', saleId).single();
    const displayId = saleData?.sales_id;

    // 3. Atualiza logs de estoque relacionados a esta venda (opcional, mas bom para consistência)
    if (displayId) {
        // Tenta atualizar entradas que tenham o motivo contendo o ID da venda
        // Nota: Isso é uma "tentativa" de manter consistência, não crítico se falhar
        await getSupabase()
          .from('stock_entries')
          .update({ 
             cliente_id: client.id, 
             cliente_nome: client.nome 
          })
          .ilike('motivo', `%Venda #${displayId}%`);
    }

    return true;
  }
};