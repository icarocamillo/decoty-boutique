import { Client, Product, ProductVariant, Sale, SaleItem, StockEntry, Supplier, PaymentDiscounts, PaymentFees, CartItem, UserProfile, CrediarioPayment, ProductImage, OrderReservation } from '@/types';
import { getSupabase } from '@/services/supabaseClient';

export type { PaymentDiscounts, PaymentFees };

// Helper interno para arredondamento monetário preciso
const roundMoney = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

export const normalizeClientData = (data: any): Client => {
  if (!data) return data;
  const hasAddressData = data.logradouro || data.cidade || data.uf || data.estado || data.cep;
  const saldoVale = Number(data.saldo_vale_presente || 0);
  const saldoCrediario = Number(data.saldo_devedor_crediario || 0);

  const baseClient = {
      ...data,
      saldo_vale_presente: saldoVale,
      saldo_devedor_crediario: saldoCrediario
  };
  
  if (hasAddressData) {
    return {
      ...baseClient,
      endereco: {
        cep: data.cep || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || data.uf || ''
      }
    } as Client;
  }
  return baseClient as Client;
};

const prepareClientPayload = (client: any) => {
  const { endereco, id, data_cadastro, ...rest } = client;
  
  const payload: any = {
    nome: rest.nome,
    cpf: rest.cpf || null,
    email: rest.email || null,
    telefone_fixo: rest.telefone_fixo || null,
    celular: rest.celular || null,
    is_whatsapp: !!rest.is_whatsapp,
    receber_ofertas: !!rest.receber_ofertas,
    pode_provador: !!rest.pode_provador,
    saldo_vale_presente: Number(rest.saldo_vale_presente || 0),
    saldo_devedor_crediario: Number(rest.saldo_devedor_crediario || 0)
  };

  if (endereco) {
    Object.assign(payload, {
      cep: endereco.cep || '',
      logradouro: endereco.logradouro || '',
      numero: endereco.numero || '',
      complemento: endereco.complemento || '',
      bairro: endereco.bairro || '',
      cidade: endereco.cidade || '',
      estado: endereco.estado || ''
    });
  }
  return payload;
};

const SALE_WITH_ITEMS_JOIN = `
  *, 
  items:sale_items(
    *,
    variant:product_variants(
      id,
      ui_id,
      cor,
      tamanho,
      product:products(id, nome, marca)
    )
  )
`;

const flattenSaleItems = (sale: any): Sale => {
  if (!sale) return sale;
  return {
    ...sale,
    ui_id: sale.sales_id || sale.ui_id,
    items: (sale.items || []).map((item: any) => ({
      ...item,
      nome_produto: item.nome_produto || item.variant?.product?.nome,
      marca: item.marca || item.variant?.product?.marca,
      cor: item.cor || item.variant?.cor,
      tamanho: item.tamanho || item.variant?.tamanho,
      preco_unitario: item.preco_unitario != null ? item.preco_unitario : item.variant?.product?.preco_venda,
      custo_unitario: item.custo_unitario != null ? item.custo_unitario : item.variant?.product?.preco_custo,
      ui_id: (item as any).ui_id,
      product_ui_id: item.variant?.ui_id
    }))
  };
};

const attachPaymentsToSales = async (sales: any[]): Promise<Sale[]> => {
    if (!sales || sales.length === 0) return [];
    
    const saleIds = sales.map(s => s.id);
    const { data: payments, error } = await getSupabase()
        .from('crediario_recebimentos')
        .select('id, venda_id, sale_item_id, valor_pago, valor_faltante, valor_taxa, metodo_pagamento, responsavel, data_recebimento, parcelas, product_id, product_variant_id')
        .in('venda_id', saleIds);

    if (error) {
        console.error("Erro ao buscar recebimentos para o histórico:", error);
        return sales.map(s => ({ ...s, ui_id: s.sales_id || s.ui_id, pagamentos_crediario: [] }));
    }

    return sales.map(s => {
        const salePayments = (payments || [])
            .filter(p => p.venda_id === s.id)
            .map(p => ({
                id: p.id,
                venda_id: p.venda_id,
                sale_item_id: p.sale_item_id,
                product_id: p.product_id,
                product_variant_id: p.product_variant_id,
                valor: Number(p.valor_pago || 0),
                valor_faltante: Number(p.valor_faltante || 0),
                valor_taxa: Number(p.valor_taxa || 0),
                metodo: p.metodo_pagamento,
                data: p.data_recebimento,
                responsavel_nome: p.responsavel,
                parcelas: p.parcelas || 1
            }));
        
        return { 
            ...s, 
            ui_id: s.sales_id || s.ui_id, 
            pagamentos_crediario: salePayments 
        };
    });
};export const backendService = {
  getClients: async (): Promise<Client[]> => {
    const { data, error } = await getSupabase().from('clients').select('*').order('nome');
    if (error) { console.error(error); return []; }
    return (data || []).map(normalizeClientData);
  },

  createClient: async (client: Omit<Client, 'id' | 'data_cadastro'>, userId?: string): Promise<boolean> => {
    const payload = { 
      ...prepareClientPayload(client), 
      origin: 'store_only',
      user_id: userId || null 
    };
    const { data: inserted, error } = await getSupabase().from('clients').insert([payload]).select('id').single();
    if (error) {
      console.error("Erro ao criar cliente:", error);
      throw new Error(error.message || "Erro ao cadastrar cliente no banco de dados");
    }

    // Sincroniza newsletter_subscriptions se houver e-mail
    if (client.email && inserted) {
      try {
        const emailParsed = client.email.trim().toLowerCase();
        await getSupabase()
          .from('newsletter_subscriptions')
          .upsert({ email: emailParsed, client_id: inserted.id, active: !!client.receber_ofertas }, { onConflict: 'email' });
      } catch (syncErr) {
        console.error("Erro ao sincronizar newsletter na criação do cliente:", syncErr);
      }
    }
    return true;
  },

  updateClient: async (client: Client): Promise<boolean> => {
    const payload = prepareClientPayload(client);
    
    // Se for atualização via ERP, verificamos se o cliente veio do site para tornar 'both'
    const { data: current } = await getSupabase().from('clients').select('origin').eq('id', client.id).maybeSingle();
    if (current?.origin === 'site_only') {
      (payload as any).origin = 'both';
    } else if (!current?.origin) {
      (payload as any).origin = 'store_only';
    }

    const { error } = await getSupabase().from('clients').update(payload).eq('id', client.id);
    if (error) {
      console.error("Erro ao atualizar cliente:", error);
      throw new Error(error.message || "Erro ao atualizar cliente no banco de dados");
    }

    // Sincroniza newsletter_subscriptions
    if (client.email) {
      try {
        const emailParsed = client.email.trim().toLowerCase();
        await getSupabase()
          .from('newsletter_subscriptions')
          .upsert({ 
            email: emailParsed, 
            client_id: client.id, 
            active: !!client.receber_ofertas 
          }, { onConflict: 'email' });
      } catch (syncErr) {
        console.error("Erro ao sincronizar newsletter na atualização de cliente:", syncErr);
      }
    }
    return true;
  },

  updateClientOriginByEmail: async (email: string, userId: string, origin: 'store_only' | 'site_only' | 'both'): Promise<boolean> => {
    const { error } = await getSupabase()
        .from('clients')
        .update({ origin, user_id: userId })
        .eq('email', email);
    return !error;
  },

  linkClients: async (storeClientId: string, siteClientId: string): Promise<boolean> => {
    const supabase = getSupabase();
    
    // 1. Buscar ambos os clientes para unificação de dados
    const { data: storeClient } = await supabase.from('clients').select('*').eq('id', storeClientId).single();
    const { data: siteClient } = await supabase.from('clients').select('*').eq('id', siteClientId).single();
    
    if (!storeClient || !siteClient) return false;

    // 2. Preparar dados unificados
    // Unifica saldos e pendências, prioriza dados do ERP (storeClient) conforme solicitado
    const mergedData = {
      nome: storeClient.nome || siteClient.nome,
      cpf: storeClient.cpf || siteClient.cpf || null,
      celular: storeClient.celular || siteClient.celular || null,
      telefone_fixo: storeClient.telefone_fixo || siteClient.telefone_fixo || null,
      email: siteClient.email || storeClient.email || null,
      is_whatsapp: storeClient.is_whatsapp != null ? storeClient.is_whatsapp : (siteClient.is_whatsapp || false),
      receber_ofertas: storeClient.receber_ofertas != null ? storeClient.receber_ofertas : (siteClient.receber_ofertas || false),
      pode_provador: storeClient.pode_provador != null ? storeClient.pode_provador : (siteClient.pode_provador || false),
      
      // Endereço - Prioridade para Loja (ERP)
      cep: storeClient.cep || siteClient.cep || '',
      logradouro: storeClient.logradouro || siteClient.logradouro || '',
      numero: storeClient.numero || siteClient.numero || '',
      complemento: storeClient.complemento || siteClient.complemento || '',
      bairro: storeClient.bairro || siteClient.bairro || '',
      cidade: storeClient.cidade || siteClient.cidade || '',
      estado: (storeClient.estado || storeClient.uf) || (siteClient.estado || siteClient.uf) || '',

      // Saldos e Pendências - Somados para não haver perda de dados conforme alerta na UI
      itens_pendentes_provador: (Number(storeClient.itens_pendentes_provador) || 0) + (Number(siteClient.itens_pendentes_provador) || 0),
      saldo_vale_presente: roundMoney((Number(storeClient.saldo_vale_presente) || 0) + (Number(siteClient.saldo_vale_presente) || 0)),
      saldo_devedor_crediario: roundMoney((Number(storeClient.saldo_devedor_crediario) || 0) + (Number(siteClient.saldo_devedor_crediario) || 0)),
      
      user_id: siteClient.user_id, // Conservamos o ID de autenticação do site
      origin: 'both' as const
    };

    // 2.1 Para evitar erro de "duplicate key value violates unique constraint" no CPF,
    // limpamos o CPF do registro store_only antes de atualizar o site_only.
    if (storeClient.cpf) {
      await supabase.from('clients').update({ cpf: null }).eq('id', storeClientId);
    }

    // 3. Atualizar o registro do site com os dados mesclados
    const { error: updateError } = await supabase.from('clients').update(mergedData).eq('id', siteClientId);
    if (updateError) {
      console.error("Erro ao atualizar cliente unificado:", updateError);
      return false;
    }

    // 4. Mover referências de outras tabelas do storeClient para o siteClient
    // Isso garante que o histórico não seja perdido após a deleção
    await supabase.from('sales').update({ cliente_id: siteClientId }).eq('cliente_id', storeClientId);
    await supabase.from('stock_entries').update({ cliente_id: siteClientId }).eq('cliente_id', storeClientId);
    
    // Tentar atualizar tabelas secundárias que podem ter cliente_id ou client_id
    const tablesToUpdate = ['order_reservations', 'crediario_recebimentos', 'client_history'];
    for (const table of tablesToUpdate) {
      try {
        // Tenta ambos os nomes de coluna comuns
        await supabase.from(table).update({ cliente_id: siteClientId }).eq('cliente_id', storeClientId);
        await supabase.from(table).update({ client_id: siteClientId }).eq('client_id', storeClientId);
      } catch (e) {
        // Ignora se a tabela ou coluna não existir
      }
    }

    // 5. Deletar o registro "store_only" agora que os dados foram migrados
    const { error: deleteError } = await supabase.from('clients').delete().eq('id', storeClientId);
    
    if (deleteError) {
      console.error("Aviso: Falha na deleção física (provavelmente RLS). Executando limpeza lógica...", deleteError);
      // Se a deleção física falhou, limpamos TUDO e mudamos a origem para 'deleted_merged'
      // Isso garante que ele não apareça em nenhum filtro (store, site ou both) e não gere conflitos de CPF/Email
      await supabase.from('clients').update({ 
        nome: `[UNIFICADO] ${storeClient.nome}`,
        cpf: null,
        email: null,
        telefone_fixo: null,
        celular: null,
        origin: 'deleted_merged' as any, // Categoria interna para registros processados
        user_id: null 
      }).eq('id', storeClientId);
    }

    return true;
  },

  updateClientCrediario: async (clientId: string, amountToSubtract: number): Promise<boolean> => {
    const { data: c } = await getSupabase().from('clients').select('saldo_devedor_crediario').eq('id', clientId).single();
    const currentDebt = Number(c?.saldo_devedor_crediario || 0);
    const { error } = await getSupabase().from('clients').update({ saldo_devedor_crediario: Math.max(0, roundMoney(currentDebt - amountToSubtract)) }).eq('id', clientId);
    return !error;
  },

  processCrediarioPayment: async (clientId: string, amount: number, vendaId: string, metodo: string, responsavelId: string, parcelas: number = 1, productId?: string, variantId?: string): Promise<boolean> => {
    const currentFees = await backendService.getPaymentFees();
    let feePercent = 0;
    if (metodo === 'Cartão de Débito') feePercent = currentFees.debit;
    else if (metodo === 'Cartão de Crédito') feePercent = parcelas > 1 ? currentFees.credit_installment : currentFees.credit_spot;
    
    // 1. Buscar a venda e itens de forma simples para evitar erros de join complexos
    const { data: sale, error: saleError } = await getSupabase()
        .from('sales')
        .select('*, items:sale_items(*)')
        .eq('id', vendaId)
        .single();
    if (saleError || !sale) {
        console.error("Erro ao buscar venda:", saleError);
        return false;
    }

    const { data: allReceipts } = await getSupabase().from('crediario_recebimentos').select('*').eq('venda_id', vendaId);
    const receipts = allReceipts || [];
    const items = (sale.items || []).filter((i: any) => i.status === 'sold');

    // Buscar mapping de variant -> product_id para preencher a coluna product_id
    const variantIds = items.map((i: any) => i.produto_id).filter(Boolean);
    const productMapping: Record<string, string> = {};
    if (variantIds.length > 0) {
        const { data: variants } = await getSupabase().from('product_variants').select('id, product_id').in('id', variantIds);
        variants?.forEach(v => { productMapping[v.id] = v.product_id; });
    }

    const inserts: any[] = [];
    let remainingToPay = amount;

    if (variantId) {
        // Pagamento vinculado a um item específico (Manual ou Item Individual)
        const valorTaxaCalculada = roundMoney(amount * (feePercent / 100));
        
        // Localizar item da venda que corresponde a essa variante
        const matchingItem = items.find((i: any) => i.produto_id === variantId);
        const itemSubtotal = matchingItem ? Number(matchingItem.subtotal) : 0;
        
        // Total já pago PARA ESTE ITEM específico
        // Nota: Se houver múltiplos itens da mesma variante, a lógica de diluição é preferível, 
        // mas aqui respeitamos o vínculo direto se fornecido.
        const totalPaidForItem = receipts
            .filter(r => r.sale_item_id === matchingItem?.id || (!r.sale_item_id && r.product_variant_id === variantId))
            .reduce((sum, r) => sum + Number(r.valor_pago || 0), 0);
        
        const currentDebt = roundMoney(Math.max(0, itemSubtotal - totalPaidForItem));

        inserts.push({
            venda_id: vendaId,
            sale_item_id: matchingItem?.id || null,
            valor_pago: amount,
            valor_faltante: roundMoney(Math.max(0, currentDebt - amount)),
            valor_taxa: valorTaxaCalculada, 
            metodo_pagamento: metodo, 
            responsavel: responsavelId, 
            data_recebimento: new Date().toISOString(),
            parcelas: parcelas,
            product_id: productMapping[variantId] || productId || null,
            product_variant_id: variantId || null
        });
    } else {
        // Pagamento GENÉRICO (Lógica de Diluição entre itens)
        const itemReceivedAmounts: Record<string, number> = {};
        
        // Atribuir o que já foi pago aos itens considerando sale_item_id e fallback variant_id
        const specificReceipts = [...receipts];
        for (const item of items) {
            let paid = 0;
            // Primeiro por ID direto
            const byId = specificReceipts.filter(r => r.sale_item_id === item.id);
            paid += byId.reduce((s, r) => s + Number(r.valor_pago || 0), 0);
            
            // Remover usados
            byId.forEach(r => {
                const idx = specificReceipts.indexOf(r);
                if (idx > -1) specificReceipts.splice(idx, 1);
            });

            itemReceivedAmounts[item.id] = paid;
        }

        // Fallback: Distribuir recebimentos que tem variant_id mas não sale_item_id
        for (const item of items) {
            const currentPaid = itemReceivedAmounts[item.id];
            const debt = roundMoney(item.subtotal - currentPaid);
            if (debt > 0) {
                const byVariant = specificReceipts.filter(r => !r.sale_item_id && r.product_variant_id === item.produto_id);
                const available = byVariant.reduce((s, r) => s + Number(r.valor_pago || 0), 0);
                const apply = Math.min(debt, available);
                itemReceivedAmounts[item.id] += apply;
                
                // Nota: Aqui a lógica de remoção dos receipts usados seria mais complexa se um receipt parasse no meio
            }
        }
        
        // Distribuir genéricos puros (sem variant e sem item_id)
        let poolGenericoAnterior = receipts.filter(r => !r.product_variant_id && !r.sale_item_id).reduce((sum, r) => sum + Number(r.valor_pago || 0), 0);
        for (const item of items) {
            const currentPaid = itemReceivedAmounts[item.id] || 0;
            const debt = roundMoney(item.subtotal - currentPaid);
            if (debt > 0 && poolGenericoAnterior > 0) {
                const apply = Math.min(debt, poolGenericoAnterior);
                itemReceivedAmounts[item.id] += apply;
                poolGenericoAnterior = roundMoney(poolGenericoAnterior - apply);
            }
        }

        // AGORA SIM: Distribuímos o NOVO pagamento (amount) nos itens que ainda tem saldo
        for (const item of items) {
            if (remainingToPay > 0) {
                const alreadyPaid = itemReceivedAmounts[item.id] || 0;
                const itemDebtNow = roundMoney(item.subtotal - alreadyPaid);
                
                if (itemDebtNow > 0) {
                    const payingForItem = Math.min(remainingToPay, itemDebtNow);
                    const valorTaxa = roundMoney(payingForItem * (feePercent / 100));
                    
                    inserts.push({
                        venda_id: vendaId,
                        sale_item_id: item.id,
                        valor_pago: payingForItem,
                        valor_faltante: roundMoney(itemDebtNow - payingForItem),
                        valor_taxa: valorTaxa,
                        metodo_pagamento: metodo,
                        responsavel: responsavelId,
                        data_recebimento: new Date().toISOString(),
                        parcelas: parcelas,
                        product_id: productMapping[item.produto_id] || null,
                        product_variant_id: item.produto_id
                    });
                    
                    remainingToPay = roundMoney(remainingToPay - payingForItem);
                    itemReceivedAmounts[item.id] += payingForItem;
                }
            }
        }

        // Se sobrar algum valor (ex: pagou a venda toda e sobrou troco/saldo), insere como genérico
        if (remainingToPay > 0) {
            const valorTaxa = roundMoney(remainingToPay * (feePercent / 100));
            const totalDebtBefore = roundMoney(sale.valor_total - receipts.reduce((s,r) => s + Number(r.valor_pago), 0));
            inserts.push({
                venda_id: vendaId,
                sale_item_id: null,
                valor_pago: remainingToPay,
                valor_faltante: roundMoney(Math.max(0, totalDebtBefore - remainingToPay)),
                valor_taxa: valorTaxa,
                metodo_pagamento: metodo,
                responsavel: responsavelId,
                data_recebimento: new Date().toISOString(),
                parcelas: parcelas,
                product_id: null,
                product_variant_id: null
            });
        }
    }

    // 3. Executar Inserts no Banco
    const { error: receiptError } = await getSupabase().from('crediario_recebimentos').insert(inserts);

    if (receiptError) {
        console.error("Erro ao registrar recebimentos:", receiptError);
        return false;
    }

    // 4. Recalcular Status de Pagamento de todos os itens e da venda (Sincronização Final)
    const { data: updatedReceipts } = await getSupabase().from('crediario_recebimentos').select('*').eq('venda_id', vendaId);
    const allLatestReceipts = updatedReceipts || [];
    
    const finalItemPaid: Record<string, number> = {};
    const availableLatestSpecific = allLatestReceipts.reduce((acc: any, r) => {
        if (r.product_variant_id) acc[r.product_variant_id] = (acc[r.product_variant_id] || 0) + Number(r.valor_pago || 0);
        return acc;
    }, {});

    for (const item of items) {
        if (item.status === 'sold') {
            const consumed = Math.min(item.subtotal, availableLatestSpecific[item.produto_id] || 0);
            finalItemPaid[item.id] = consumed;
            availableLatestSpecific[item.produto_id] -= consumed;
        }
    }

    let poolLatestGeneric = allLatestReceipts.filter(r => !r.product_variant_id).reduce((sum, r) => sum + Number(r.valor_pago || 0), 0);
    for (const item of items) {
        if (item.status === 'sold') {
            const needed = roundMoney(item.subtotal - (finalItemPaid[item.id] || 0));
            if (needed > 0 && poolLatestGeneric > 0) {
                const apply = Math.min(needed, poolLatestGeneric);
                finalItemPaid[item.id] += apply;
                poolLatestGeneric = roundMoney(poolLatestGeneric - apply);
            }
            const isPaid = finalItemPaid[item.id] >= roundMoney(item.subtotal);
            await getSupabase().from('sale_items').update({ status_pagamento: isPaid ? 'pago' : 'pendente' }).eq('id', item.id);
        }
    }

    const totalPaidAccumulated = allLatestReceipts.reduce((sum, r) => sum + Number(r.valor_pago || 0), 0);
    const isFullyPaid = totalPaidAccumulated >= roundMoney(sale.valor_total);
    await getSupabase().from('sales').update({ status_pagamento: isFullyPaid ? 'pago' : 'pendente' }).eq('id', vendaId);
    
    await backendService.updateClientCrediario(clientId, amount);
    return true;
  },

  getProducts: async (): Promise<Product[]> => {
    const { data, error } = await getSupabase()
      .from('products')
      .select(`
        *,
        variants:product_variants(*),
        images:product_images(*)
      `)
      .order('nome');
    if (error) {
      console.error("Erro ao buscar produtos:", error);
      return [];
    }
    return data || [];
  },

  getProductImages: async (productId: string): Promise<ProductImage[]> => {
    const { data, error } = await getSupabase()
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order');
    if (error) {
      console.error("Erro ao buscar imagens do produto:", error);
      return [];
    }
    return data || [];
  },

  uploadProductImage: async (file: File, productFolder: string, cor?: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    // Normalizar nome da cor para pasta (Remover espaços, acentos e colocar em minúsculo)
    const corPath = cor ? cor.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') : 'geral';
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${productFolder}/${corPath}/${fileName}`;

    const { error } = await getSupabase()
      .storage
      .from('product-images')
      .upload(filePath, file);

    if (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      return null;
    }

    const { data: { publicUrl } } = getSupabase()
      .storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  saveProductImage: async (image: Omit<ProductImage, 'id' | 'created_at'>): Promise<ProductImage | null> => {
    const { data, error } = await getSupabase()
      .from('product_images')
      .insert([image])
      .select()
      .single();
    
    if (error) {
      console.error("Erro ao salvar referência da imagem:", error);
      return null;
    }
    return data;
  },

  updateProductImage: async (image: Partial<ProductImage> & { id: string }): Promise<boolean> => {
    const { error } = await getSupabase()
      .from('product_images')
      .update(image)
      .eq('id', image.id);
    return !error;
  },

  deleteProductImage: async (imageId: string, imageUrl: string): Promise<boolean> => {
    // Deletar do banco
    const { error: dbError } = await getSupabase()
      .from('product_images')
      .delete()
      .eq('id', imageId);
    
    if (dbError) {
      console.error("Erro ao deletar imagem do banco:", dbError);
      return false;
    }

    // Tentar deletar do storage (opcional, se der erro no storage não impede de deletar no banco)
    try {
      // Extrair o path relativo ao bucket da URL pública
      const urlParts = imageUrl.split('/product-images/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await getSupabase().storage.from('product-images').remove([filePath]);
      }
    } catch (e) {
      console.error("Erro ao deletar arquivo físico:", e);
    }

    return true;
  },

  moveProductImage: async (imageId: string, currentUrl: string, newColor: string, productFolder: string): Promise<string | null> => {
    const supabase = getSupabase();
    
    // 1. Extrair o path atual e o nome do arquivo
    const urlParts = currentUrl.split('/product-images/');
    if (urlParts.length <= 1) return null;
    
    const currentPath = urlParts[1];
    const fileName = currentPath.split('/').pop();
    if (!fileName) return null;

    // 2. Definir o novo path (geral se newColor for vazio, senão pasta da cor)
    const normalizePath = (str: string) => str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const newFolder = newColor ? normalizePath(newColor) : 'geral';
    const newPath = `products/${productFolder}/${newFolder}/${fileName}`;

    // Se o path for igual, não faz nada
    if (currentPath === newPath) return currentUrl;

    // 3. Mover no Storage
    const { error: moveError } = await supabase.storage
        .from('product-images')
        .move(currentPath, newPath);

    if (moveError) {
        console.error("Erro ao mover imagem no storage:", moveError);
        return null;
    }

    // 4. Gerar a nova URL pública
    const { data: publicData } = supabase.storage
        .from('product-images')
        .getPublicUrl(newPath);
        
    const newUrl = publicData.publicUrl;

    // 5. Atualizar no banco de dados
    const { error: dbError } = await supabase
        .from('product_images')
        .update({ 
            url: newUrl,
            cor: newColor || null
        })
        .eq('id', imageId);

    if (dbError) {
        console.error("Erro ao atualizar URL no banco:", dbError);
        return null;
    }

    return newUrl;
  },

  createProduct: async (product: Omit<Product, 'id' | 'ui_id' | 'created_at'>, initialVariants: Omit<ProductVariant, 'id' | 'product_id' | 'created_at'>[], userId: string): Promise<Product | null> => {
    const { data: parent, error: parentError } = await getSupabase()
        .from('products')
        .insert([product])
        .select()
        .single();
        
    if (parentError || !parent) {
        console.error("Erro ao criar produto pai:", parentError);
        return null;
    }

    const variantsToInsert = initialVariants.map((v, index) => {
        const { original_estoque, ...cleanVariant } = v as any;
        return {
            ...cleanVariant,
            product_id: parent.id,
            ui_id: (parent.ui_id * 1000) + (index + 1)
        };
    });

    const { data: variants, error: variantError } = await getSupabase()
        .from('product_variants')
        .insert(variantsToInsert)
        .select();

    if (variantError) {
        console.error("Erro ao criar variantes:", variantError);
        return null;
    }

    // Log inicial de estoque para cada variante
    if (variants) {
        for (const v of variants) {
            if (v.quantidade_estoque !== 0) {
                await backendService.logStockEntry({
                    produto_id: v.id, 
                    produto_nome: `${parent.nome} (${v.tamanho}/${v.cor})`,
                    quantidade: v.quantidade_estoque,
                    responsavel: userId,
                    motivo: 'Cadastro de Produto'
                });
            }
        }
    }
    return parent;
  },

  updateProduct: async (product: Partial<Product> & { id: string }, variants: (Partial<ProductVariant> & { id?: string })[], userId: string): Promise<boolean> => {
    // 1. Buscar dados atuais do pai (para ui_id) e variantes atuais (para contagem)
    const { data: currentParent, error: fetchError } = await getSupabase()
        .from('products')
        .select('*, variants:product_variants(id, ui_id)')
        .eq('id', product.id)
        .single();

    if (fetchError || !currentParent) {
        console.error("Erro ao buscar produto para atualização:", fetchError);
        return false;
    }

    // 2. Atualizar dados do pai
    const { id, variants: _v, created_at: _ca, ...parentData } = product as any;
    const { error: parentError } = await getSupabase()
        .from('products')
        .update(parentData)
        .eq('id', id);

    if (parentError) {
        console.error("Erro ao atualizar produto pai:", parentError);
        return false;
    }

    // 4. Remover Variantes que não estão na nova lista
    const newVariantIds = variants.map(v => v.id).filter(Boolean);
    const variantsToDelete = (currentParent.variants || [])
        .map((v: any) => v.id)
        .filter((vid: string) => !newVariantIds.includes(vid));

    if (variantsToDelete.length > 0) {
        // Deletar associações em variant_combinations primeiro para evitar erros de restrição de FK
        await getSupabase()
            .from('variant_combinations')
            .delete()
            .or(`variant_id.in.(${variantsToDelete.join(',')}),related_variant_id.in.(${variantsToDelete.join(',')})`);

        const { error: delError } = await getSupabase()
            .from('product_variants')
            .delete()
            .in('id', variantsToDelete);
        
        if (delError) {
            console.error("Erro ao deletar variantes removidas:", delError);
            // Se houver erro (provavelmente por ter vendas vinculadas), lançamos um erro descritivo
            if (delError.code === '23503') {
                throw new Error("Não é possível excluir uma variante que já possui histórico de vendas ou movimentação.");
            }
            return false;
        }

        // --- LÓGICA DE LIMPEZA DE IMAGENS POR COR ---
        // Se variantes foram deletadas, precisamos verificar se alguma cor deixou de existir
        const remainingColors = new Set(variants.map(v => v.cor).filter(Boolean));
        
        // Buscar todas as imagens do produto
        const { data: currentImages } = await getSupabase()
            .from('product_images')
            .select('*')
            .eq('product_id', product.id);

        if (currentImages && currentImages.length > 0) {
            for (const img of currentImages) {
                // Se a imagem tem cor e essa cor não está mais no set de cores remanescentes
                if (img.cor && !remainingColors.has(img.cor)) {
                    console.log(`Limpando imagem da cor ${img.cor} pois a cor não existe mais nas variações.`);
                    await backendService.deleteProductImage(img.id, img.url);
                }
            }
        }
    }

    // 5. Processar Variantes remanescentes (Upsert)
    let newlyCreatedCount = 0;
    const existingVariantUiIds = (currentParent.variants || []).map((v: any) => v.ui_id);
    const maxSubId = existingVariantUiIds.length > 0 
        ? Math.max(...existingVariantUiIds.map((uid: number) => {
            const uidStr = uid.toString();
            if (uidStr.includes('.')) {
                const parts = uidStr.split('.');
                return parseInt(parts[1]) || 0;
            }
            return uid % 1000;
        }))
        : 0;

    for (const v of variants) {
        if (v.id) {
            // Update
            const { id: vid, created_at: _vca, original_estoque, ...variantData } = v as any;
            const { data: oldVariant } = await getSupabase()
                .from('product_variants')
                .select('quantidade_estoque')
                .eq('id', vid)
                .single();
            
            const oldStock = oldVariant?.quantidade_estoque || 0;
            const { error: varError } = await getSupabase()
                .from('product_variants')
                .update(variantData)
                .eq('id', vid);

            if (varError) {
                console.error("Erro ao atualizar variante:", varError);
                return false;
            }

            if (v.quantidade_estoque !== undefined) {
                const diff = v.quantidade_estoque - oldStock;
                if (diff !== 0) {
                    await backendService.logStockEntry({
                        produto_id: v.id,
                        produto_nome: `${product.nome} (${v.tamanho}/${v.cor})`,
                        quantidade: diff,
                        responsavel: userId,
                        motivo: 'Atualização de Produto (Manual)'
                    });
                }
            }
        } else {
            // Create New Variant for existing product
            newlyCreatedCount++;
            const newUiId = (currentParent.ui_id * 1000) + (maxSubId + newlyCreatedCount);
            const { original_estoque, ...cleanVariant } = v as any;
            
            const { data: newVar, error: varError } = await getSupabase()
                .from('product_variants')
                .insert([{ ...cleanVariant, product_id: id, ui_id: newUiId }])
                .select()
                .single();
            
            if (varError) {
                console.error("Erro ao inserir nova variante:", varError);
                return false;
            }

            if (newVar && newVar.quantidade_estoque !== 0) {
                await backendService.logStockEntry({
                    produto_id: newVar.id,
                    produto_nome: `${product.nome} (${v.tamanho}/${v.cor})`,
                    quantidade: newVar.quantidade_estoque,
                    responsavel: userId,
                    motivo: 'Cadastro de Produto (Nova Variante)'
                });
            }
        }
    }
    return true;
  },

  createSale: async (cart: CartItem[], client: {id?: string, name: string, cpf?: string}, method: string, installments: number, extraDiscount: number, feesSnapshot: any, userId: string, giftCardUsed: number): Promise<boolean> => {
    const totalValue = cart.reduce((acc, item) => acc + item.subtotal, 0) - extraDiscount - giftCardUsed;
    const isCrediario = method === 'Crediário';
    
    // Para vendas diretas, gravamos a taxa FIXA agora
    const fixedFeeValue = isCrediario ? 0 : (feesSnapshot?.valor || 0);

    const saleData = {
        data_venda: new Date().toISOString(),
        valor_total: totalValue,
        valor_taxa: fixedFeeValue, // Gravando snapshot da taxa na tabela sales
        valor_liquido_lojista: totalValue - fixedFeeValue, 
        cliente_id: client.id || null,
        cliente_nome: client.name,
        cliente_cpf: client.cpf || "CPF não cadastrado",
        produtos_resumo: cart.map(i => `${i.quantidade}x ${i.nome}`).join(', '),
        metodo_pagamento: method,
        status_pagamento: (isCrediario ? 'pendente' : 'pago') as 'pendente' | 'pago',
        parcelas: installments,
        desconto_extra: extraDiscount,
        uso_vale_presente: giftCardUsed,
        responsavel: userId, 
        status: 'completed' as const,
        item_count: cart.reduce((acc, item) => acc + item.quantidade, 0),
        taxas_aplicadas: feesSnapshot
    };

    const supabase = getSupabase();
    
    // 1. Buscar detalhes de variantes e produtos para todos os itens do carrinho
    const variantIds = Array.from(new Set(cart.map(item => item.produto_id)));
    const { data: variantDetails, error: detailsError } = await supabase
        .from('product_variants')
        .select(`
            id,
            product:products(nome, marca)
        `)
        .in('id', variantIds);
        
    if (detailsError || !variantDetails) {
        console.error("Erro ao buscar detalhes das variantes para venda:", detailsError);
        return false;
    }
    
    const detailsMap = new Map(variantDetails.map((v: any) => [v.id, v]));

    const { data: sale, error: saleError } = await supabase.from('sales').insert([saleData]).select().single();
    if (saleError || !sale) return false;

    const saleDisplayId = sale.sales_id || sale.ui_id || sale.id;

    if (isCrediario && client.id) {
        const { data: c } = await supabase.from('clients').select('saldo_devedor_crediario').eq('id', client.id).single();
        await supabase.from('clients').update({ saldo_devedor_crediario: roundMoney(Number(c?.saldo_devedor_crediario || 0) + totalValue) }).eq('id', client.id);
    }

    const itemsData = cart.flatMap(item => {
        const details = detailsMap.get(item.produto_id) as any;
        const unitDiscount = (item.desconto || 0) / item.quantidade;
        const unitSubtotal = (item.subtotal || 0) / item.quantidade;
        
        return Array.from({ length: item.quantidade }).map(() => ({
            venda_id: sale.id,
            produto_id: item.produto_id, // Variant ID
            nome_produto: details?.product?.nome || item.nome,
            marca: details?.product?.marca || '',
            quantidade: 1,
            preco_unitario: item.preco_unitario,
            custo_unitario: item.preco_custo || 0,
            cor: item.cor || '',
            tamanho: item.tamanho || '',
            desconto: unitDiscount,
            subtotal: unitSubtotal,
            status: 'sold' as const,
            status_pagamento: (isCrediario ? 'pendente' : 'pago') as 'pendente' | 'pago'
        }));
    });
    
    const { error: itemsError } = await supabase.from('sale_items').insert(itemsData);
    if (itemsError) {
        console.error("Erro ao inserir itens da venda:", itemsError);
        return false;
    }

    for (const item of cart) {
        const { data: varData } = await getSupabase()
            .from('product_variants')
            .select('quantidade_estoque')
            .eq('id', item.produto_id)
            .single();
        
        if (varData) {
            await getSupabase()
                .from('product_variants')
                .update({ quantidade_estoque: varData.quantidade_estoque - item.quantidade })
                .eq('id', item.produto_id);
            
            await backendService.logStockEntry({
                produto_id: item.produto_id,
                produto_nome: `${item.nome} (${item.tamanho}/${item.cor})`,
                quantidade: -item.quantidade,
                responsavel: userId,
                motivo: `Saída - Venda #${saleDisplayId}`,
                cliente_id: client.id,
                cliente_nome: client.name
            });
        }
    }

    if (giftCardUsed > 0 && client.id) {
         const { data: c } = await getSupabase().from('clients').select('saldo_vale_presente').eq('id', client.id).single();
         if (c) await getSupabase().from('clients').update({ saldo_vale_presente: roundMoney((c.saldo_vale_presente || 0) - giftCardUsed) }).eq('id', client.id);
    }
    return true;
  },

  getRecentSales: async (): Promise<Sale[]> => {
    const { data } = await getSupabase()
        .from('sales')
        .select(SALE_WITH_ITEMS_JOIN)
        .order('data_venda', { ascending: false })
        .limit(20);
    
    return attachPaymentsToSales((data || []).map(flattenSaleItems));
  },

  getSalesByPeriod: async (start: string, end: string): Promise<Sale[]> => {
    const { data } = await getSupabase()
        .from('sales')
        .select(SALE_WITH_ITEMS_JOIN)
        .gte('data_venda', `${start}T00:00:00`)
        .lte('data_venda', `${end}T23:59:59`);
    
    return attachPaymentsToSales((data || []).map(flattenSaleItems));
  },

  getSaleById: async (idOrUiId: string): Promise<Sale | null> => {
    const supabase = getSupabase();
    const isNumeric = /^\d+$/.test(idOrUiId);
    let result;

    if (isNumeric) {
        const numId = parseInt(idOrUiId);
        const { data: dataBySalesId } = await supabase.from('sales').select(SALE_WITH_ITEMS_JOIN).eq('sales_id', numId).maybeSingle();
        if (dataBySalesId) result = dataBySalesId;
        else {
            const { data: dataByUiId } = await supabase.from('sales').select(SALE_WITH_ITEMS_JOIN).eq('ui_id', numId).maybeSingle();
            result = dataByUiId;
        }
    }

    if (!result) {
        const { data: dataById } = await supabase.from('sales').select(SALE_WITH_ITEMS_JOIN).eq('id', idOrUiId).maybeSingle();
        result = dataById;
    }
    
    if (!result) return null;
    const attached = await attachPaymentsToSales([flattenSaleItems(result)]);
    return attached[0];
  },

  getReceiptsByPeriod: async (start: string, end: string): Promise<any[]> => {
    const { data, error } = await getSupabase()
        .from('crediario_recebimentos')
        .select('*')
        .gte('data_recebimento', `${start}T00:00:00`)
        .lte('data_recebimento', `${end}T23:59:59`);
    if (error) {
        console.error("Erro ao buscar recebimentos por período:", error);
        return [];
    }
    return data || [];
  },

  getDashboardChartData: async () => {
    const dates: Date[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        dates.push(d);
    }
    const startStr = dates[0].toISOString().split('T')[0];
    const endStr = dates[6].toISOString().split('T')[0];
    const sales = await backendService.getSalesByPeriod(startStr, endStr);
    
    return dates.map(date => {
        const dayTotal = sales
            .filter(s => {
                const sDate = new Date(s.data_venda);
                return sDate.getDate() === date.getDate() && sDate.getMonth() === date.getMonth();
            })
            .reduce((acc, s) => {
                if (s.status === 'cancelled') return acc;
                // Soma apenas o que não foi devolvido para ser condizente com a realidade financeira do gráfico
                const soldItemsSubtotal = s.items?.filter(i => i.status === 'sold').reduce((sum, i) => sum + i.subtotal, 0) || 0;
                if (soldItemsSubtotal === 0) return acc;
                
                const effectiveSaleTotal = Math.max(0, soldItemsSubtotal - (s.desconto_extra || 0) - (s.uso_vale_presente || 0));
                return acc + effectiveSaleTotal;
            }, 0);
            
        return { dia: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), total: dayTotal };
    });
  },

  getTopSellingBrand: async (): Promise<string> => {
      const sales = await backendService.getRecentSales();
      const brandCounts: Record<string, number> = {};
      sales.forEach(s => {
          if (s.status !== 'cancelled' && s.items) {
              s.items.forEach(i => { brandCounts[i.marca] = (brandCounts[i.marca] || 0) + i.quantidade; });
          }
      });
      const sorted = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : '-';
  },

  getStoreConfig: async <T>(key: string, defaultValue: T): Promise<T> => {
    const { data } = await getSupabase().from('store_config').select('value').eq('key', key).maybeSingle();
    return data ? JSON.parse(data.value) : defaultValue;
  },

  setStoreConfig: async (key: string, value: any): Promise<boolean> => {
    const { error } = await getSupabase().from('store_config').upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
    return !error;
  },

  getStockEntries: async (): Promise<StockEntry[]> => {
    const { data } = await getSupabase().from('stock_entries').select('*').order('data_entrada', { ascending: false });
    return data || [];
  },

  logStockEntry: async (entry: Omit<StockEntry, 'id' | 'data_entrada'>) => {
    const { error } = await getSupabase().from('stock_entries').insert([entry]);
    if (error) console.error("Erro ao salvar log de estoque no Supabase:", error);
  },

  updateProductStock: async (variantId: string, newQuantity: number, reason: string, clientInfo: {id: string, name: string} | undefined, userId: string) => {
      const { data: variant } = await getSupabase()
        .from('product_variants')
        .select('*, product:products(nome, marca)')
        .eq('id', variantId)
        .single();
        
      if (!variant) return;
      
      const diff = newQuantity - variant.quantidade_estoque;
      await getSupabase().from('product_variants').update({ quantidade_estoque: newQuantity }).eq('id', variantId);

      await backendService.logStockEntry({
          produto_id: variantId,
          produto_nome: `${variant.product?.nome} (${variant.tamanho}/${variant.cor})`,
          quantidade: diff,
          responsavel: userId, 
          motivo: reason,
          cliente_id: clientInfo?.id,
          cliente_nome: clientInfo?.name
      });
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    const { data } = await getSupabase().from('suppliers').select('*').order('nome_empresa');
    return data || [];
  },

  createSupplier: async (supplier: Omit<Supplier, 'id'>): Promise<boolean> => {
    const { error } = await getSupabase().from('suppliers').insert([supplier]);
    return !error;
  },

  updateSupplier: async (supplier: Supplier): Promise<boolean> => {
    const { error } = await getSupabase().from('suppliers').update(supplier).eq('id', supplier.id);
    return !error;
  },

  getPaymentDiscounts: async (): Promise<PaymentDiscounts> => {
      const defaults = { credit_spot: 0, debit: 0, pix: 0 };
      return await backendService.getStoreConfig('payment_discounts', defaults);
  },

  updatePaymentDiscounts: async (discounts: PaymentDiscounts): Promise<boolean> => {
      return await backendService.setStoreConfig('payment_discounts', discounts);
  },

  getPaymentFees: async (): Promise<PaymentFees> => {
      const defaults = { credit_spot: 0, credit_installment: 0, debit: 0 };
      return await backendService.getStoreConfig('payment_fees', defaults);
  },

  updatePaymentFees: async (fees: PaymentFees): Promise<boolean> => {
      return await backendService.setStoreConfig('payment_fees', fees);
  },

  getStoreAccessHash: async (): Promise<string> => {
      const { data } = await getSupabase().from('store_config').select('value').eq('key', 'store_access_hash').maybeSingle();
      return data ? String(data.value || '').trim() : ''; 
  },

  updateStoreAccessHash: async (hash: string): Promise<boolean> => {
      const { error = null } = await getSupabase().from('store_config').upsert({ key: 'store_access_hash', value: hash }, { onConflict: 'key' });
      return !error;
  },

  getUsers: async (): Promise<UserProfile[]> => {
      const { data } = await getSupabase().from('profiles').select('*');
      return (data || []).map((p: any) => ({ id: p.id, name: p.name || 'User', email: p.email || '', role: p.role || 'salesperson', active: p.active }));
  },

  updateUserStatus: async (userId: string, active: boolean): Promise<boolean> => {
      const { error } = await getSupabase().from('profiles').update({ active }).eq('id', userId);
      return !error;
  },

  updateUserRole: async (userId: string, role: string): Promise<boolean> => {
      const { error } = await getSupabase().from('profiles').update({ role }).eq('id', userId);
      return !error;
  },

  cancelSale: async (saleId: string, userId: string): Promise<boolean> => {
      const { data: sale } = await getSupabase().from('sales').select('*').eq('id', saleId).single();
      const { error } = await getSupabase().from('sales').update({ status: 'cancelled' }).eq('id', saleId);
      if (error) return false;

      const saleDisplayId = sale?.sales_id || sale?.ui_id || saleId;

      if (sale?.metodo_pagamento === 'Crediário' && sale.cliente_id) {
          const { data: c } = await getSupabase().from('clients').select('saldo_devedor_crediario').eq('id', sale.cliente_id).single();
          await getSupabase().from('clients').update({ saldo_devedor_crediario: Math.max(0, roundMoney(Number(c?.saldo_devedor_crediario || 0) - sale.valor_total)) }).eq('id', sale.cliente_id);
      }

      await getSupabase().from('sale_items').update({ status: 'returned' }).eq('venda_id', saleId);
      const { data: items } = await getSupabase().from('sale_items').select('*').eq('venda_id', saleId);
      if (items) {
          for (const item of items) {
              const { data: variant } = await getSupabase()
                .from('product_variants')
                .select('quantidade_estoque')
                .eq('id', item.produto_id)
                .single();
                
              if (variant) {
                  await getSupabase()
                    .from('product_variants')
                    .update({ quantidade_estoque: variant.quantidade_estoque + item.quantidade })
                    .eq('id', item.produto_id);
                    
                  await backendService.logStockEntry({
                      produto_id: item.produto_id,
                      produto_nome: `${item.nome_produto} (${item.tamanho}/${item.cor})`,
                      quantidade: item.quantidade,
                      responsavel: userId, 
                      motivo: `Cancelamento de Venda #${saleDisplayId}`
                  });
              }
          }
      }
      return true;
  },

  returnSaleItems: async (saleId: string, items: SaleItem[], clientId: string | undefined, userId: string): Promise<boolean> => {
    const { data: saleData } = await getSupabase().from('sales').select('sales_id, ui_id, cliente_nome').eq('id', saleId).single();
    const saleDisplayId = saleData?.sales_id || saleData?.ui_id || saleId;
    
    let giftCardSum = 0;
    let debtReductionSum = 0;

    for (const item of items) {
       const { data: variant } = await getSupabase()
            .from('product_variants')
            .select('quantidade_estoque')
            .eq('id', item.produto_id)
            .single();
            
       if (variant) {
           await getSupabase()
            .from('product_variants')
            .update({ quantidade_estoque: variant.quantidade_estoque + item.quantidade })
            .eq('id', item.produto_id);
            
           await getSupabase().from('sale_items').update({ status_pagamento: 'pendente', status: 'returned' }).eq('id', item.id);
           await backendService.logStockEntry({
               produto_id: item.produto_id,
               produto_nome: `${item.nome_produto} (${item.tamanho}/${item.cor})`,
               quantidade: item.quantidade,
               responsavel: userId, 
               motivo: `Devolução de Venda #${saleDisplayId}`,
               cliente_id: clientId,
               cliente_nome: saleData?.cliente_nome
           });

           // Lógica de Reembolso Robusta para Crediário e Parciais
           const toClear = item.valor_liquido_estorno || item.valor_estorno_unitario || (item.subtotal / item.quantidade);
           const paid = item.valor_pago_unitario || 0;
           
           if (paid >= toClear && toClear > 0) {
               // Totalmente pago
               giftCardSum += toClear;
           } else if (paid > 0) {
               // Parcialmente pago
               giftCardSum += paid;
               debtReductionSum += roundMoney(Math.max(0, toClear - paid));
           } else {
               // Nada pago
               debtReductionSum += toClear;
           }
       }
    }

    if (clientId) {
        if (debtReductionSum > 0) {
            const { data: c } = await getSupabase().from('clients').select('saldo_devedor_crediario').eq('id', clientId).single();
            await getSupabase().from('clients').update({ saldo_devedor_crediario: Math.max(0, roundMoney(Number(c?.saldo_devedor_crediario || 0) - debtReductionSum)) }).eq('id', clientId);
        }
        if (giftCardSum > 0) {
            const { data: c } = await getSupabase().from('clients').select('saldo_vale_presente').eq('id', clientId).single();
            await getSupabase().from('clients').update({ saldo_vale_presente: roundMoney(Number(c?.saldo_vale_presente || 0) + giftCardSum) }).eq('id', clientId);
        }
    }
    return true;
  },

  linkClientToSale: async (saleId: string, client: Client): Promise<boolean> => {
      const { error } = await getSupabase().from('sales').update({ cliente_id: client.id, cliente_nome: client.nome, cliente_cpf: client.cpf }).eq('id', saleId);
      return !error;
  },

  getClientSales: async (clientId: string): Promise<Sale[]> => {
      const { data } = await getSupabase()
          .from('sales')
          .select(SALE_WITH_ITEMS_JOIN)
          .eq('cliente_id', clientId)
          .order('data_venda', { ascending: false });
      
      return attachPaymentsToSales((data || []).map(flattenSaleItems));
  },

  getClientStockHistory: async (clientId: string): Promise<StockEntry[]> => {
      const { data } = await getSupabase().from('stock_entries').select('*').eq('cliente_id', clientId).order('data_entrada', { ascending: false });
      return data || [];
  },

  returnProvadorItem: async (entry: StockEntry, userId: string): Promise<boolean> => {
      if (!entry.produto_id && !entry.produto_nome) return false;

      let targetProductId = entry.produto_id;

      if (!targetProductId) {
         // Busca apenas na tabela de variantes pelo SKU/Nome se necessário (embora o ideal seja ter o ID)
         const { data: foundVar } = await getSupabase()
            .from('product_variants')
            .select('id')
            .eq('sku', entry.produto_nome.split(' - ')[0])
            .maybeSingle();
         targetProductId = foundVar?.id;
      }

      if (!targetProductId) return false;

      const { data: variant } = await getSupabase()
        .from('product_variants')
        .select('quantidade_estoque')
        .eq('id', targetProductId)
        .single();

      if (variant) {
        await getSupabase()
          .from('product_variants')
          .update({ quantidade_estoque: variant.quantidade_estoque + Math.abs(entry.quantidade) })
          .eq('id', targetProductId);
      } else {
        return false;
      }

      await backendService.logStockEntry({
          produto_id: targetProductId,
          produto_nome: entry.produto_nome,
          quantidade: Math.abs(entry.quantidade), 
          responsavel: userId, 
          motivo: 'Retorno Provador',
          cliente_id: entry.cliente_id,
          cliente_nome: entry.cliente_nome
      });
      return true;
  },

  addClientBalance: async (clientId: string, amount: number): Promise<boolean> => {
     const { data: clientData } = await getSupabase().from('clients').select('saldo_vale_presente').eq('id', clientId).single();
     const { error } = await getSupabase().from('clients').update({ saldo_vale_presente: roundMoney(Number(clientData?.saldo_vale_presente || 0) + amount) }).eq('id', clientId);
     return !error;
  },

  deleteProduct: async (productId: string): Promise<boolean> => {
    const supabase = getSupabase();
    
    // 1. Buscar todas as variantes do produto para poder remover suas combinações
    const { data: variants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId);

    if (variants && variants.length > 0) {
        const variantIds = variants.map(v => v.id);
        // Deletar associações em variant_combinations primeiro
        await supabase
            .from('variant_combinations')
            .delete()
            .or(`variant_id.in.(${variantIds.join(',')}),related_variant_id.in.(${variantIds.join(',')})`);
    }

    // 2. Buscar todas as imagens do produto para removê-las fisicamente do storage
    const { data: images } = await supabase
        .from('product_images')
        .select('id, url')
        .eq('product_id', productId);

    if (images && images.length > 0) {
        for (const img of images) {
            await backendService.deleteProductImage(img.id, img.url);
        }
    }

    // 3. Remover variantes do produto
    const { error: variantError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId);
        
    if (variantError) {
        if (variantError.code === '23503') {
            throw new Error("Não é possível excluir um produto que possui variações com histórico de vendas ou movimentação.");
        }
        console.error("Erro ao deletar variantes:", variantError);
        return false;
    }

    // 4. Remover referências de imagens remanescentes no banco (se houver)
    const { error: imageError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

    if (imageError) {
        console.error("Erro ao deletar referências de imagens:", imageError);
    }

    // 5. Remover o produto pai
    const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (productError) {
        console.error("Erro ao deletar produto:", productError);
        return false;
    }

    return true;
  },

  // --- MÉTODOS DE PERFIL ---
  updateProfile: async (userId: string, updates: { name?: string, email?: string }): Promise<{ success: boolean, error?: string }> => {
     // 1. Atualizar e-mail na Auth (se alterado)
     if (updates.email) {
        const { error: authError } = await getSupabase().auth.updateUser({ email: updates.email });
        if (authError) return { success: false, error: authError.message };
     }

     // 2. Atualizar nome no Profiles
     const { error: profileError } = await getSupabase().from('profiles').update({ name: updates.name }).eq('id', userId);
     if (profileError) return { success: false, error: profileError.message };

     return { success: true };
  },

  updatePassword: async (email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {
     // 1. Validar a senha atual tentando um login silencioso
     const { error: authError } = await getSupabase().auth.signInWithPassword({
       email: email,
       password: currentPassword
     });

     if (authError) {
        return { success: false, error: "A senha atual informada está incorreta." };
     }

     // 2. Se validou, prossegue com a atualização para a nova senha
     const { error: updateError } = await getSupabase().auth.updateUser({ password: newPassword });
     if (updateError) return { success: false, error: updateError.message };

     return { success: true };
  },

  // --- MÉTODOS DE COMBINAÇÕES DE PRODUTOS (LOOK COMPLETO) ---
  getColorCombinations: async (productId: string, color: string): Promise<any[]> => {
    const supabase = getSupabase();
    
    // 1. Encontrar todas as variantes do produto ATUAL com esta cor
    const { data: sourceVariants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)
      .eq('cor', color);
    
    if (!sourceVariants || sourceVariants.length === 0) return [];
    const sourceIds = sourceVariants.map(v => v.id);

    // 2. Buscar vínculos onde o produto atual é ORIGEM
    const { data: asSource } = await supabase
      .from('variant_combinations')
      .select(`
        related_variant_id,
        variant:product_variants!variant_combinations_related_variant_id_fkey(
          *,
          product:products(*, images:product_images(*), variants:product_variants(*))
        )
      `)
      .in('variant_id', sourceIds);

    // 3. Buscar vínculos onde o produto atual é DESTINO (Bidirecional)
    const { data: asTarget } = await supabase
      .from('variant_combinations')
      .select(`
        variant_id,
        variant:product_variants!variant_combinations_variant_id_fkey(
          *,
          product:products(*, images:product_images(*), variants:product_variants(*))
        )
      `)
      .in('related_variant_id', sourceIds);

    const allRelations = [...(asSource || []), ...(asTarget || [])];
    
    // 4. Mapear para um formato unificado de (Produto + Cor)
    const results = allRelations
      .map(item => item.variant)
      .filter(Boolean)
      .map((v: any) => ({
        product_id: v.product_id,
        cor: v.cor,
        product: v.product
      }));

    // Remover duplicatas de Produto-Cor
    const uniqueResults = Array.from(new Map(results.map((r: any) => [`${r.product_id}-${r.cor}`, r])).values());
    
    return uniqueResults;
  },

  saveColorCombinations: async (productId: string, color: string, relatedVariants: { productId: string, color: string }[]): Promise<boolean> => {
    const supabase = getSupabase();
    
    // 1. Buscar todas as variantes do produto atual com esta cor
    const { data: sourceVariants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)
      .eq('cor', color);
    
    if (!sourceVariants || sourceVariants.length === 0) return false;
    const sourceIds = sourceVariants.map(v => v.id);

    // 2. Remover vínculos existentes em AMBAS as direções (Bidirecional)
    // Remove onde este produto é origem OU onde é destino para esta cor específica
    await supabase
      .from('variant_combinations')
      .delete()
      .or(`variant_id.in.(${sourceIds.join(',')}),related_variant_id.in.(${sourceIds.join(',')})`);

    if (relatedVariants.length === 0) return true;

    // 3. Para cada combinação desejada, inserir vínculos em ambas as direções
    const inserts: any[] = [];
    
    for (const rel of relatedVariants) {
      // Buscar todas as variantes da cor alvo
      const { data: targetVariants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', rel.productId)
        .eq('cor', rel.color);
      
      if (targetVariants && targetVariants.length > 0) {
        const targetIds = targetVariants.map(v => v.id);
        const firstTargetId = targetIds[0];
        const firstSourceId = sourceIds[0];

        // A -> B: Vincular todas as variantes da cor de origem à primeira da cor de destino
        sourceIds.forEach(sid => {
          inserts.push({
            variant_id: sid,
            related_variant_id: firstTargetId
          });
        });

        // B -> A: Vincular todas as variantes da cor de destino à primeira da cor de origem
        // Isso garante que se entrarmos no produto B, o produto A aparecerá como combinação
        targetIds.forEach(tid => {
          // Evitar duplicata se por acaso for o mesmo produto (embora improvável no fluxo de cores)
          if (tid !== firstSourceId) {
            inserts.push({
              variant_id: tid,
              related_variant_id: firstSourceId
            });
          }
        });
      }
    }

    if (inserts.length === 0) return true;

    // Remover duplicatas de ID-ID que podem ter ocorrido na montagem do array
    const uniqueInserts = Array.from(new Map(inserts.map(i => [`${i.variant_id}-${i.related_variant_id}`, i])).values());

    const { error } = await supabase.from('variant_combinations').insert(uniqueInserts);
    return !error;
  },

  // Mantido para compatibilidade se necessário, mas incentivamos o uso por cor
  getProductCombinations: async (productId: string): Promise<Product[]> => {
    return []; // Implementação simplificada ou removida pois migramos para cor
  },

  checkClientByEmail: async (email: string): Promise<{ exists: boolean, needsLink: boolean, name?: string, client?: any, isStaff?: boolean }> => {
    const { data: client } = await getSupabase()
      .from('clients')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
       
    if (!client) return { exists: false, needsLink: false, isStaff: !!profile };
    
    return { 
      exists: true, 
      needsLink: client.user_id === null,
      name: client.nome,
      client: client,
      isStaff: !!profile
    };
  },

  linkClientWithCpf: async (email: string, cpf: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    const cleanCpf = cpf.replace(/\D/g, '');
    
    const { data: client } = await getSupabase()
      .from('clients')
      .select('id, cpf')
      .eq('email', email)
      .maybeSingle();
      
    if (!client) return { success: false, error: 'Cliente não encontrado.' };
    
    const storedCpf = (client.cpf || '').replace(/\D/g, '');
    
    if (storedCpf !== cleanCpf) {
      return { success: false, error: 'CPF incorreto para vincular sua conta.' };
    }
    
    const { error } = await getSupabase()
      .from('clients')
      .update({ 
        user_id: userId,
        origin: 'both'
      })
      .eq('id', client.id);
      
    return { success: !error, error: error?.message };
  },

  getClientByUserId: async (userId: string): Promise<Client | null> => {
    const { data, error } = await getSupabase()
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error || !data) return null;
    return normalizeClientData(data);
  },

  updateClientProfile: async (userId: string, profileData: Partial<Client>): Promise<boolean> => {
    // Removendo campos que não devem ser alterados pelo cliente no site
    const { id, user_id, cpf, email, ...allowedData } = profileData as any;
    
    const { error } = await getSupabase()
      .from('clients')
      .update(allowedData)
      .eq('user_id', userId);
      
    if (error) {
      console.error("Erro ao atualizar perfil do cliente:", error);
      return false;
    }

    // Se receber_ofertas mudou, sincroniza com a tabela newsletter_subscriptions
    if (typeof profileData.receber_ofertas === 'boolean') {
      try {
        const { data: clientData } = await getSupabase()
          .from('clients')
          .select('id, email')
          .eq('user_id', userId)
          .maybeSingle();

        if (clientData && clientData.email) {
          const clientEmail = clientData.email.trim().toLowerCase();
          await getSupabase()
            .from('newsletter_subscriptions')
            .upsert({ 
              email: clientEmail, 
              client_id: clientData.id, 
              active: profileData.receber_ofertas 
            }, { onConflict: 'email' });
        }
      } catch (syncErr) {
        console.error("Erro ao sincronizar newsletter na atualização de perfil:", syncErr);
      }
    }

    return true;
  },

  getOrderReservationsByUserId: async (userId: string): Promise<OrderReservation[]> => {
    const { data, error } = await getSupabase()
      .from('order_reservations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erro ao buscar solicitações de reserva:", error);
      return [];
    }
    return data || [];
  },

  createOrderReservation: async (reservation: Omit<OrderReservation, "id" | "created_at" | "ui_id">): Promise<boolean> => {
    const { error } = await getSupabase()
      .from('order_reservations')
      .insert([reservation]);
      
    if (error) console.error("Erro ao registrar solicitação de reserva:", error);
    return !error;
  },

  getOrCreateClientForUser: async (userId: string, name: string, email: string): Promise<string | null> => {
    // 1. Tentar encontrar cliente vinculado ao user_id
    const { data: client } = await getSupabase()
      .from('clients')
      .select('id, origin')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (client) return client.id;
    
    // 2. Se não existir, tenta encontrar por email (caso o vendedor tenha cadastrado o cliente antes)
    const { data: clientByEmail } = await getSupabase()
      .from('clients')
      .select('id, user_id, origin')
      .eq('email', email)
      .maybeSingle();
      
    if (clientByEmail) {
      // Se encontrou por email mas não tinha user_id, vincula agora.
      // Como o cliente já existia (provavelmente cadastrado na loja) e agora está no site, origin vira 'both'.
      const updateData: any = { user_id: userId };
      
      if (!clientByEmail.origin || clientByEmail.origin === 'store_only') {
        updateData.origin = 'both';
      }

      await getSupabase().from('clients').update(updateData).eq('id', clientByEmail.id);

      // Se já existia uma subscrição com esse e-mail, vincula o id do cliente nela
      try {
        const emailParsed = email.trim().toLowerCase();
        const { data: sub } = await getSupabase()
          .from('newsletter_subscriptions')
          .select('email')
          .eq('email', emailParsed)
          .maybeSingle();
        if (sub) {
          await getSupabase()
            .from('newsletter_subscriptions')
            .update({ client_id: clientByEmail.id })
            .eq('email', emailParsed);
        }
      } catch (syncErr) {
        console.error("Erro ao sincronizar newsletter no vínculo de cliente por e-mail:", syncErr);
      }

      return clientByEmail.id;
    }
    
    // 3. Se ainda não existir nada, cria um novo registro de cliente vindo diretamente do SITE
    // Verifica se é funcionário para definir origin como 'both'
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    const { data: newClient, error } = await getSupabase()
      .from('clients')
      .insert([{
        id: userId, // CRÍTICO: Usar o mesmo ID do Auth
        nome: name,
        email: email,
        user_id: userId,
        receber_ofertas: true,
        pode_provador: false,
        origin: profile ? 'both' : 'site_only'
      }])
      .select()
      .maybeSingle();
      
    if (error) {
      console.error("Erro ao criar registro de cliente para o usuário:", error);
      return null;
    }

    // Sincroniza com a newsletter pois receber_ofertas é true por padrão
    if (newClient) {
      try {
        const emailParsed = email.trim().toLowerCase();
        await getSupabase()
          .from('newsletter_subscriptions')
          .upsert({ email: emailParsed, client_id: newClient.id, active: true }, { onConflict: 'email' });
      } catch (syncErr) {
        console.error("Erro ao sincronizar newsletter na criação automática de cliente via site:", syncErr);
      }
    }
    
    return newClient?.id || null;
  },

  getFavorites: async (userId: string): Promise<string[]> => {
    // Primeiro pegamos o client_id
    const { data: client } = await getSupabase()
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (!client) return [];
    
    const { data, error } = await getSupabase()
      .from('client_favorites')
      .select('product_id, cor')
      .eq('client_id', client.id);
      
    if (error) {
      console.error("Erro ao buscar favoritos:", error);
      return [];
    }
    
    return (data || []).map(f => f.cor ? `${f.product_id}:${f.cor}` : f.product_id);
  },

  toggleFavorite: async (userId: string, productId: string, name: string = '', email: string = '', color?: string): Promise<boolean> => {
    const clientId = await backendService.getOrCreateClientForUser(userId, name, email);
    if (!clientId) return false;
    
    // Verifica se já é favorito
    let query = getSupabase()
      .from('client_favorites')
      .select('id')
      .eq('client_id', clientId)
      .eq('product_id', productId);
    
    if (color) {
      query = query.eq('cor', color);
    } else {
      query = query.is('cor', null);
    }

    const { data: existing } = await query.maybeSingle();
      
    if (existing) {
      // Remover
      const { error } = await getSupabase()
        .from('client_favorites')
        .delete()
        .eq('id', existing.id);
      return !error;
    } else {
      // Adicionar
      const payload: any = { client_id: clientId, product_id: productId };
      if (color) payload.cor = color;
      
      const { error } = await getSupabase()
        .from('client_favorites')
        .insert([payload]);
      return !error;
    }
  },

  // --- MÉTODOS DE COMBINAÇÕES DE VARIANTES (COMPLETE O LOOK) ---
  getVariantCombinations: async (variantId: string): Promise<ProductVariant[]> => {
    const supabase = getSupabase();
    
    // Busca onde a variante atual é a ORIGEM (A -> B)
    const { data: dataAsSource, error: errorAsSource } = await supabase
      .from('variant_combinations')
      .select(`
        variant:product_variants!variant_combinations_related_variant_id_fkey(
          *,
          product:products(
            *,
            images:product_images(*)
          )
        )
      `)
      .eq('variant_id', variantId);

    // Busca onde a variante atual é o DESTINO (B -> A)
    const { data: dataAsTarget, error: errorAsTarget } = await supabase
      .from('variant_combinations')
      .select(`
        variant:product_variants!variant_combinations_variant_id_fkey(
          *,
          product:products(
            *,
            images:product_images(*)
          )
        )
      `)
      .eq('related_variant_id', variantId);

    if (errorAsSource || errorAsTarget) {
      console.error("Erro ao buscar combinações de variantes:", errorAsSource || errorAsTarget);
      return [];
    }

    // Combina os resultados
    const results: ProductVariant[] = [
      ...(dataAsSource || []).map((item: any) => item.variant),
      ...(dataAsTarget || []).map((item: any) => item.variant)
    ];

    // Remove nulos e duplicatas
    const uniqueResults = results.filter((v, index, self) => 
      v && self.findIndex(t => t?.id === v.id) === index
    ) as ProductVariant[];

    return uniqueResults;
  },

  saveVariantCombinations: async (variantId: string, relatedVariantIds: string[]): Promise<boolean> => {
    const supabase = getSupabase();
    
    // 1. Remover combinações antigas em ambas as direções
    const { error: deleteError } = await supabase
      .from('variant_combinations')
      .delete()
      .or(`variant_id.eq.${variantId},related_variant_id.eq.${variantId}`);

    if (deleteError) {
      console.error("Erro ao limpar combinações antigas de variante:", deleteError);
      return false;
    }

    if (relatedVariantIds.length === 0) return true;

    // 2. Inserir novas em ambas as direções
    const inserts: any[] = [];
    
    relatedVariantIds.forEach(rid => {
      // A -> B
      inserts.push({
        variant_id: variantId,
        related_variant_id: rid
      });
      // B -> A
      inserts.push({
        variant_id: rid,
        related_variant_id: variantId
      });
    });

    // Remover duplicatas
    const uniqueInserts = Array.from(new Map(inserts.map(i => [`${i.variant_id}-${i.related_variant_id}`, i])).values());

    const { error: insertError } = await supabase
      .from('variant_combinations')
      .insert(uniqueInserts);

    if (insertError) {
      console.error("Erro ao salvar novas combinações de variante:", insertError);
      return false;
    }

    return true;
  },

  subscribeNewsletter: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const parsedEmail = email.trim().toLowerCase();
      if (!parsedEmail) {
        return { success: false, message: "Por favor, digite um e-mail válido." };
      }

      let clientId: string | null = null;
      let clientReceberOfertas: boolean | null = null;
      let rpcSuccess = false;
      const rpcAttempts: Array<{ name: string; arg: string; error: any; hasData: boolean; dataVal: any }> = [];

      // Nomes possíveis da função RPC do Supabase
      const rpcNames = [
        'get_client_id_by_email',
        'get_client_by_email',
        'obter_cliente_por_email',
        'buscar_cliente_por_email',
        'obter_client_id_por_email',
        'get_client_id',
        'get_client',
        'obter_cliente',
        'buscar_cliente'
      ];

      // Nomes possíveis de argumentos que a função pode aceitar
      const rpcArgs = [
        'email_param',
        'p_email',
        'email',
        'client_email',
        'email_val',
        'p_email_param'
      ];

      for (const name of rpcNames) {
        if (rpcSuccess) break;
        for (const argName of rpcArgs) {
          if (rpcSuccess) break;
          try {
            const { data, error } = await getSupabase().rpc(name, { [argName]: parsedEmail });
            rpcAttempts.push({
              name,
              arg: argName,
              error,
              hasData: data !== undefined && data !== null,
              dataVal: data
            });

            if (!error && data !== undefined && data !== null) {
              // Se retornar UUID diretamente (string de 36 caracteres)
              if (typeof data === 'string' && data.length === 36) {
                clientId = data;
                rpcSuccess = true;
              } else if (Array.isArray(data)) {
                // Se retornar um array
                const row = data[0];
                if (row) {
                  if (typeof row === 'string') {
                    clientId = row;
                    rpcSuccess = true;
                  } else if (typeof row === 'object') {
                    clientId = row.id || row.client_id || row.uuid || null;
                    clientReceberOfertas = typeof row.receber_ofertas === 'boolean' ? row.receber_ofertas : null;
                    if (clientId) rpcSuccess = true;
                  }
                }
              } else if (typeof data === 'object') {
                // Se retornar um único objeto
                clientId = data.id || data.client_id || data.uuid || null;
                clientReceberOfertas = typeof data.receber_ofertas === 'boolean' ? data.receber_ofertas : null;
                if (clientId) rpcSuccess = true;
              }
            }
          } catch (err: any) {
            rpcAttempts.push({
              name,
              arg: argName,
              error: err?.message || err,
              hasData: false,
              dataVal: null
            });
          }
        }
      }

      let fallbackError: any = null;
      let fallbackHadClient = false;

      // Fallback: Busca direta por consulta da tabela (requer permissão de leitura pela RLS)
      if (!rpcSuccess) {
        try {
          const { data: client, error: clientErr } = await getSupabase()
            .from('clients')
            .select('id, receber_ofertas')
            .ilike('email', parsedEmail)
            .maybeSingle();

          fallbackError = clientErr;
          if (!clientErr && client) {
            clientId = client.id;
            clientReceberOfertas = client.receber_ofertas;
            fallbackHadClient = true;
          }
        } catch (err: any) {
          fallbackError = err?.message || err;
          console.error("Erro no fallback do subscribeNewsletter:", err);
        }
      }

      // 2. Cadastra na tabela newsletter_subscriptions com a FK client_id caso o e-mail pertença a um cliente
      const { error: subErr } = await getSupabase()
        .from('newsletter_subscriptions')
        .upsert({ email: parsedEmail, client_id: clientId, active: true }, { onConflict: 'email' });

      if (subErr) {
        console.error("Erro ao inserir na newsletter_subscriptions:", subErr);
        return { success: false, message: `Erro ao cadastrar e-mail na newsletter: ${subErr.message}` };
      }

      // 3. Sincroniza com a tabela clients se o e-mail existir lá e receber_ofertas estiver como falso ou nulo
      if (clientId) {
        try {
          if (clientReceberOfertas === false || clientReceberOfertas === null) {
            await getSupabase()
              .from('clients')
              .update({ receber_ofertas: true })
              .eq('id', clientId);
          }
        } catch (err) {
          // Ignora erros de RLS caso o usuário final não tenha permissão de alterar a tabela clients
        }
      }

      if (clientId) {
        return { 
          success: true, 
          message: "E-mail cadastrado com sucesso!" 
        };
      } else {
        // Formata os resultados de RPC para mostrar o que de fato aconteceu
        const successfulRPCsWithNull = rpcAttempts.filter(a => !a.error && a.hasData);
        const rpcErrors = rpcAttempts.filter(a => a.error).map(a => `${a.name}(${a.arg}): ${a.error?.message || a.error?.code || JSON.stringify(a.error)}`);
        
        let diagMsg = `Nenhum cliente correspondente encontrado no banco (salvo como sem vínculo).`;
        if (successfulRPCsWithNull.length > 0) {
          diagMsg += ` O RPC ${successfulRPCsWithNull[0].name} foi chamado com sucesso mas retornou vazio/nulo. Verifique se o e-mail existe exatamente igual no banco.`;
        } else if (rpcErrors.length > 0) {
          // Pega os primeiros 2 erros únicos relevantes
          const uniqueErrors = Array.from(new Set(rpcErrors)).slice(0, 2);
          diagMsg += ` Erros RPC: ${uniqueErrors.join(' | ')}.`;
        }
        if (fallbackError) {
          diagMsg += ` Fallback RLS: ${fallbackError.message || JSON.stringify(fallbackError)}.`;
        }

        return { 
          success: true, 
          message: `E-mail cadastrado com sucesso! Aviso: ${diagMsg}` 
        };
      }
    } catch (err: any) {
      console.error("Erro interno ao assinar newsletter:", err);
      return { success: false, message: "Erro no servidor ao processar a assinatura." };
    }
  }
};