import { Client, Product, ProductVariant, Sale, SaleItem, StockEntry, Supplier, PaymentDiscounts, PaymentFees, CartItem, UserProfile, CrediarioPayment } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_CLIENTS, MOCK_PRODUCTS, MOCK_INITIAL_SALES, MOCK_STOCK_ENTRIES, MOCK_SUPPLIERS } from '../constants';

export type { PaymentDiscounts, PaymentFees };

const LS_KEYS = {
  CLIENTS: 'decoty_clients',
  PRODUCTS: 'decoty_products',
  SALES: 'decoty_sales',
  STOCK: 'decoty_stock',
  SUPPLIERS: 'decoty_suppliers',
  STORE_CONFIG: 'decoty_store_config',
  USERS: 'decoty_users',
  RECEIPTS: 'decoty_crediario_receipts'
};

const getLocalData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Helper interno para arredondamento monetário preciso
const roundMoney = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

const normalizeClientData = (data: any): Client => {
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
  const { endereco, id, data_cadastro, telefone, ...rest } = client;
  
  const payload: any = {
    nome: rest.nome,
    cpf: rest.cpf || null,
    email: rest.email || '',
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
      nome_produto: item.variant?.product?.nome || item.nome_produto,
      marca: item.variant?.product?.marca || item.marca,
      cor: item.variant?.cor || item.cor,
      tamanho: item.variant?.tamanho || item.tamanho
    }))
  };
};

const attachPaymentsToSales = async (sales: any[]): Promise<Sale[]> => {
    if (!sales || sales.length === 0) return [];
    
    if (isSupabaseConfigured()) {
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
    }
    return sales.map(s => ({ ...s, pagamentos_crediario: [] }));
};

export const backendService = {
  getClients: async (): Promise<Client[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabase().from('clients').select('*').order('nome');
      if (error) { console.error(error); return []; }
      return (data || []).map(normalizeClientData);
    }
    return getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS).map(normalizeClientData);
  },

  createClient: async (client: Omit<Client, 'id' | 'data_cadastro'>): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      const payload = prepareClientPayload(client);
      const { error } = await getSupabase().from('clients').insert([payload]);
      return !error;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    const newClient = { ...client, id: 'c' + Date.now(), data_cadastro: new Date().toISOString() };
    setLocalData(LS_KEYS.CLIENTS, [...clients, newClient]);
    return true;
  },

  updateClient: async (client: Client): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      const payload = prepareClientPayload(client);
      const { error } = await getSupabase().from('clients').update(payload).eq('id', client.id);
      return !error;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    setLocalData(LS_KEYS.CLIENTS, clients.map(c => c.id === client.id ? client : c));
    return true;
  },

  updateClientCrediario: async (clientId: string, amountToSubtract: number): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data: c } = await getSupabase().from('clients').select('saldo_devedor_crediario').eq('id', clientId).single();
        const currentDebt = Number(c?.saldo_devedor_crediario || 0);
        const { error } = await getSupabase().from('clients').update({ saldo_devedor_crediario: Math.max(0, roundMoney(currentDebt - amountToSubtract)) }).eq('id', clientId);
        return !error;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    setLocalData(LS_KEYS.CLIENTS, clients.map(c => c.id === clientId ? { ...c, saldo_devedor_crediario: Math.max(0, roundMoney((c.saldo_devedor_crediario || 0) - amountToSubtract)) } : c));
    return true;
  },

  processCrediarioPayment: async (clientId: string, amount: number, vendaId: string, metodo: string, responsavelId: string, parcelas: number = 1, productId?: string, variantId?: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
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
    }
    return false;
  },

  getProducts: async (): Promise<Product[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabase()
        .from('products')
        .select(`
          *,
          variants:product_variants(*)
        `)
        .order('nome');
      if (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
      }
      return data || [];
    }
    return getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
  },

  createProduct: async (product: Omit<Product, 'id' | 'ui_id' | 'created_at'>, initialVariants: Omit<ProductVariant, 'id' | 'product_variant_id' | 'created_at'>[], userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data: parent, error: parentError } = await getSupabase()
            .from('products')
            .insert([product])
            .select()
            .single();
            
        if (parentError || !parent) {
            console.error("Erro ao criar produto pai:", parentError);
            return false;
        }

        const variantsToInsert = initialVariants.map((v, index) => {
            const { original_estoque, ...cleanVariant } = v as any;
            return {
                ...cleanVariant,
                product_variant_id: parent.id,
                ui_id: (parent.ui_id * 1000) + (index + 1)
            };
        });

        const { data: variants, error: variantError } = await getSupabase()
            .from('product_variants')
            .insert(variantsToInsert)
            .select();

        if (variantError) {
            console.error("Erro ao criar variantes:", variantError);
            return false;
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
        return true;
    }
    return false;
  },

  updateProduct: async (product: Partial<Product> & { id: string }, variants: (Partial<ProductVariant> & { id?: string })[], userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
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

        // 3. Processar Variantes (Upsert)
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
                    .insert([{ ...cleanVariant, product_variant_id: id, ui_id: newUiId }])
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
    }
    return false;
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
        cliente_cpf: client.cpf || null,
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

    if (isSupabaseConfigured()) {
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
    }
    return false;
  },

  getRecentSales: async (): Promise<Sale[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await getSupabase()
            .from('sales')
            .select(SALE_WITH_ITEMS_JOIN)
            .order('data_venda', { ascending: false })
            .limit(20);
        
        return attachPaymentsToSales((data || []).map(flattenSaleItems));
    }
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    return attachPaymentsToSales(sales.sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()).slice(0, 20));
  },

  getSalesByPeriod: async (start: string, end: string): Promise<Sale[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await getSupabase()
            .from('sales')
            .select(SALE_WITH_ITEMS_JOIN)
            .gte('data_venda', `${start}T00:00:00`)
            .lte('data_venda', `${end}T23:59:59`);
        
        return attachPaymentsToSales((data || []).map(flattenSaleItems));
    }
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    const sDate = new Date(`${start}T00:00:00`);
    const eDate = new Date(`${end}T23:59:59`);
    const filtered = sales.filter(s => {
        const d = new Date(s.data_venda);
        return d >= sDate && d <= eDate;
    });
    return attachPaymentsToSales(filtered);
  },

  getSaleById: async (idOrUiId: string): Promise<Sale | null> => {
    if (isSupabaseConfigured()) {
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
    }
    return null;
  },

  getReceiptsByPeriod: async (start: string, end: string): Promise<any[]> => {
    if (isSupabaseConfigured()) {
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
    }
    return []; 
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
        if (isSupabaseConfigured()) {
          const { data } = await getSupabase().from('store_config').select('value').eq('key', key).maybeSingle();
          return data ? JSON.parse(data.value) : defaultValue;
      }
      const configs = getLocalData<any[]>(LS_KEYS.STORE_CONFIG, []);
      const found = configs.find(c => c.key === key);
      return found ? JSON.parse(found.value) : defaultValue;
  },

  setStoreConfig: async (key: string, value: any): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await getSupabase().from('store_config').upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
          return !error;
      }
      const configs = getLocalData<any[]>(LS_KEYS.STORE_CONFIG, []);
      const index = configs.findIndex(c => c.key === key);
      const strVal = JSON.stringify(value);
      if (index !== -1) {
          configs[index].value = strVal;
      } else {
          configs.push({ key, value: strVal });
      }
      setLocalData(LS_KEYS.STORE_CONFIG, configs);
      return true;
  },

  getStockEntries: async (): Promise<StockEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('stock_entries').select('*').order('data_entrada', { ascending: false });
        return data || [];
    }
    return getLocalData<StockEntry[]>(LS_KEYS.STOCK, MOCK_STOCK_ENTRIES);
  },

  logStockEntry: async (entry: Omit<StockEntry, 'id' | 'data_entrada'>) => {
    if (isSupabaseConfigured()) {
        const { error } = await getSupabase().from('stock_entries').insert([entry]);
        if (error) console.error("Erro ao salvar log de estoque no Supabase:", error);
    }
    const newEntry = { 
        ...entry, 
        id: 'stk' + Date.now() + Math.random(), 
        data_entrada: new Date().toISOString() 
    } as StockEntry;
    const entries = getLocalData<StockEntry[]>(LS_KEYS.STOCK, MOCK_STOCK_ENTRIES);
    setLocalData(LS_KEYS.STOCK, [newEntry, ...entries]);
  },

  updateProductStock: async (variantId: string, newQuantity: number, reason: string, clientInfo: {id: string, name: string} | undefined, userId: string) => {
      if (isSupabaseConfigured()) {
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
      }
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('suppliers').select('*').order('nome_empresa');
        return data || [];
    }
    return getLocalData<Supplier[]>(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
  },

  createSupplier: async (supplier: Omit<Supplier, 'id'>): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { error } = await getSupabase().from('suppliers').insert([supplier]);
        return !error;
    }
    const suppliers = getLocalData<Supplier[]>(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
    setLocalData(LS_KEYS.SUPPLIERS, [...suppliers, { ...supplier, id: 'sup' + Date.now() }]);
    return true;
  },

  updateSupplier: async (supplier: Supplier): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { error } = await getSupabase().from('suppliers').update(supplier).eq('id', supplier.id);
        return !error;
    }
    const suppliers = getLocalData<Supplier[]>(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
    setLocalData(LS_KEYS.SUPPLIERS, suppliers.map(s => s.id === supplier.id ? supplier : s));
    return true;
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
      if (isSupabaseConfigured()) {
          const { data } = await getSupabase().from('store_config').select('value').eq('key', 'store_access_hash').maybeSingle();
          return data ? String(data.value || '').trim() : ''; 
      }
      // Mock Environment
      const configs = getLocalData<any[]>(LS_KEYS.STORE_CONFIG, []);
      const found = configs.find(c => c.key === 'store_access_hash');
      if (found) return found.value;
      // Default keyword: "123" (SHA-256)
      return 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
  },

  updateStoreAccessHash: async (hash: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error = null } = await getSupabase().from('store_config').upsert({ key: 'store_access_hash', value: hash }, { onConflict: 'key' });
          return !error;
      }
      // Mock Environment
      const configs = getLocalData<any[]>(LS_KEYS.STORE_CONFIG, []);
      const index = configs.findIndex(c => c.key === 'store_access_hash');
      if (index !== -1) {
          configs[index].value = hash;
      } else {
          configs.push({ key: 'store_access_hash', value: hash });
      }
      setLocalData(LS_KEYS.STORE_CONFIG, configs);
      return true;
  },

  getUsers: async (): Promise<UserProfile[]> => {
        if (isSupabaseConfigured()) {
          const { data } = await getSupabase().from('profiles').select('*');
          return (data || []).map((p: any) => ({ id: p.id, name: p.name || 'User', email: p.email || '', role: p.role || 'salesperson', active: p.active }));
      }
      return getLocalData<UserProfile[]>(LS_KEYS.USERS, []);
  },

  updateUserStatus: async (userId: string, active: boolean): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await getSupabase().from('profiles').update({ active }).eq('id', userId);
          return !error;
      }
      const users = getLocalData<any[]>(LS_KEYS.USERS, []);
      setLocalData(LS_KEYS.USERS, users.map(u => u.id === userId ? { ...u, active } : u));
      return true;
  },

  updateUserRole: async (userId: string, role: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await getSupabase().from('profiles').update({ role }).eq('id', userId);
          return !error;
      }
      const users = getLocalData<any[]>(LS_KEYS.USERS, []);
      setLocalData(LS_KEYS.USERS, users.map(u => u.id === userId ? { ...u, role } : u));
      return true;
  },

  cancelSale: async (saleId: string, userId: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
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
      }
      return false;
  },

  returnSaleItems: async (saleId: string, items: SaleItem[], clientId: string | undefined, userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
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

               const unitRefund = item.valor_estorno_unitario || (item.subtotal / item.quantidade);
               if (item.status_pagamento === 'pago') giftCardSum += unitRefund;
               else debtReductionSum += unitRefund;
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
    }
    return false;
  },

  linkClientToSale: async (saleId: string, client: Client): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await getSupabase().from('sales').update({ cliente_id: client.id, cliente_nome: client.nome, cliente_cpf: client.cpf }).eq('id', saleId);
          return !error;
      }
      return false;
  },

  getClientSales: async (clientId: string): Promise<Sale[]> => {
      if (isSupabaseConfigured()) {
          const { data } = await getSupabase()
              .from('sales')
              .select(SALE_WITH_ITEMS_JOIN)
              .eq('cliente_id', clientId)
              .order('data_venda', { ascending: false });
          
          return attachPaymentsToSales((data || []).map(flattenSaleItems));
      }
      return [];
  },

  getClientStockHistory: async (clientId: string): Promise<StockEntry[]> => {
      if (isSupabaseConfigured()) {
          const { data } = await getSupabase().from('stock_entries').select('*').eq('cliente_id', clientId).order('data_entrada', { ascending: false });
          return data || [];
      }
      const allEntries = getLocalData<StockEntry[]>(LS_KEYS.STOCK, MOCK_STOCK_ENTRIES);
      return allEntries.filter(e => e.cliente_id === clientId);
  },

  returnProvadorItem: async (entry: StockEntry, userId: string): Promise<boolean> => {
      if (!entry.produto_id && !entry.produto_nome) return false;

      let targetProductId = entry.produto_id;

      if (isSupabaseConfigured()) {
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
      } else {
          // Mock logic (não alterado)
          const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
          const updated = products.map(p => p.id === targetProductId ? { ...p } : p);
          setLocalData(LS_KEYS.PRODUCTS, updated);
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
    if (isSupabaseConfigured()) {
       const { data: clientData } = await getSupabase().from('clients').select('saldo_vale_presente').eq('id', clientId).single();
       const { error } = await getSupabase().from('clients').update({ saldo_vale_presente: roundMoney(Number(clientData?.saldo_vale_presente || 0) + amount) }).eq('id', clientId);
       return !error;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    setLocalData(LS_KEYS.CLIENTS, clients.map(c => c.id === clientId ? { ...c, saldo_vale_presente: roundMoney((c.saldo_vale_presente || 0) + amount) } : c));
    return true;
  },

  // --- MÉTODOS DE PERFIL ---
  updateProfile: async (userId: string, updates: { name?: string, email?: string }): Promise<{ success: boolean, error?: string }> => {
    if (isSupabaseConfigured()) {
       // 1. Atualizar e-mail na Auth (se alterado)
       if (updates.email) {
          const { error: authError } = await getSupabase().auth.updateUser({ email: updates.email });
          if (authError) return { success: false, error: authError.message };
       }

       // 2. Atualizar nome no Profiles
       const { error: profileError } = await getSupabase().from('profiles').update({ name: updates.name }).eq('id', userId);
       if (profileError) return { success: false, error: profileError.message };

       return { success: true };
    }
    // Mock
    const users = getLocalData<any[]>(LS_KEYS.USERS, []);
    setLocalData(LS_KEYS.USERS, users.map(u => u.id === userId ? { ...u, ...updates } : u));
    return { success: true };
  },

  updatePassword: async (email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean, error?: string }> => {
    if (isSupabaseConfigured()) {
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
    }
    return { success: true };
  }
};