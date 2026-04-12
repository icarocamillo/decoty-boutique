import { Client, Product, Sale, SaleItem, StockEntry, Supplier, PaymentDiscounts, PaymentFees, CartItem, UserProfile, CrediarioPayment } from '../types';
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

const attachPaymentsToSales = async (sales: any[]): Promise<Sale[]> => {
    if (!sales || sales.length === 0) return [];
    
    if (isSupabaseConfigured()) {
        const saleIds = sales.map(s => s.id);
        const { data: payments, error } = await getSupabase()
            .from('crediario_recebimentos')
            .select('id, venda_id, valor_pago, valor_taxa, metodo_pagamento, responsavel, data_recebimento, parcelas')
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
                    valor: Number(p.valor_pago || 0),
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

  processCrediarioPayment: async (clientId: string, amount: number, vendaId: string, metodo: string, responsavelId: string, parcelas: number = 1): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const currentFees = await backendService.getPaymentFees();
        let feePercent = 0;
        if (metodo === 'Cartão de Débito') feePercent = currentFees.debit;
        else if (metodo === 'Cartão de Crédito') feePercent = parcelas > 1 ? currentFees.credit_installment : currentFees.credit_spot;
        
        const valorTaxaCalculada = roundMoney(amount * (feePercent / 100));

        const { error: receiptError } = await getSupabase().from('crediario_recebimentos').insert([{
            venda_id: vendaId,
            valor_pago: amount,
            valor_taxa: valorTaxaCalculada, 
            metodo_pagamento: metodo, 
            responsavel: responsavelId, 
            data_recebimento: new Date().toISOString(),
            parcelas: parcelas
        }]);

        if (receiptError) return false;

        const { data: allReceipts } = await getSupabase().from('crediario_recebimentos').select('valor_pago').eq('venda_id', vendaId);
        const totalPaidAccumulated = (allReceipts || []).reduce((sum, r) => sum + Number(r.valor_pago || 0), 0);

        const { data: sale } = await getSupabase().from('sales').select('*, items:sale_items(*)').eq('id', vendaId).single();
        if (!sale) return false;

        let remainingToDistribute = totalPaidAccumulated;
        const items = sale.items || [];
        for (const item of items) {
            if (item.status === 'sold') {
                const isItemPaid = remainingToDistribute >= roundMoney(item.subtotal);
                await getSupabase().from('sale_items').update({ status_pagamento: isItemPaid ? 'pago' : 'pendente' }).eq('id', item.id);
                if (isItemPaid) remainingToDistribute = roundMoney(remainingToDistribute - item.subtotal);
            }
        }

        const isFullyPaid = totalPaidAccumulated >= roundMoney(sale.valor_total);
        await getSupabase().from('sales').update({ status_pagamento: isFullyPaid ? 'pago' : 'pendente' }).eq('id', vendaId);
        await backendService.updateClientCrediario(clientId, amount);
        return true;
    }
    return false;
  },

  getProducts: async (): Promise<Product[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await getSupabase().from('products').select('*').order('nome');
      if (error) return [];
      return data || [];
    }
    return getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
  },

  createProduct: async (product: Omit<Product, 'id' | 'ui_id'>, userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await getSupabase().from('products').insert([product]).select().single();
        if (!error && data) {
            await backendService.logStockEntry({
                produto_id: data.id, 
                produto_nome: `${data.nome} - ${data.marca}`,
                quantidade: data.quantidade_estoque,
                responsavel: userId,
                motivo: 'Cadastro de Produto'
            });
            return true;
        }
    }
    return false;
  },

  updateProduct: async (product: Product, userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data: oldProduct } = await getSupabase().from('products').select('quantidade_estoque').eq('id', product.id).single();
        const oldStock = oldProduct?.quantidade_estoque || 0;
        const diff = product.quantidade_estoque - oldStock;
        const { error } = await getSupabase().from('products').update(product).eq('id', product.id);
        if (!error && diff !== 0) {
             await backendService.logStockEntry({
                produto_id: product.id,
                produto_nome: `${product.nome} - ${product.marca}`,
                quantidade: diff,
                responsavel: userId,
                motivo: 'Atualização de Produto (Manual)'
            });
        }
        return !error;
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
        const { data: sale, error: saleError } = await getSupabase().from('sales').insert([saleData]).select().single();
        if (saleError || !sale) return false;

        const saleDisplayId = sale.sales_id || sale.ui_id || sale.id;

        if (isCrediario && client.id) {
            const { data: c } = await getSupabase().from('clients').select('saldo_devedor_crediario').eq('id', client.id).single();
            await getSupabase().from('clients').update({ saldo_devedor_crediario: roundMoney(Number(c?.saldo_devedor_crediario || 0) + totalValue) }).eq('id', client.id);
        }

        const itemsData = cart.flatMap(item => {
            const unitDiscount = (item.desconto || 0) / item.quantidade;
            const unitSubtotal = (item.subtotal || 0) / item.quantidade;
            return Array.from({ length: item.quantidade }).map(() => ({
                venda_id: sale.id,
                produto_id: item.produto_id,
                nome_produto: item.nome,
                marca: item.marca,
                tamanho: item.tamanho,
                quantidade: 1,
                preco_unitario: item.preco_unitario,
                custo_unitario: item.preco_custo || 0,
                desconto: unitDiscount,
                subtotal: unitSubtotal,
                status: 'sold' as const,
                status_pagamento: (isCrediario ? 'pendente' : 'pago') as 'pendente' | 'pago'
            }));
        });
        
        await getSupabase().from('sale_items').insert(itemsData);

        for (const item of cart) {
            const { data: prod } = await getSupabase().from('products').select('quantidade_estoque').eq('id', item.produto_id).single();
            if (prod) {
                await getSupabase().from('products').update({ quantidade_estoque: prod.quantidade_estoque - item.quantidade }).eq('id', item.produto_id);
                await backendService.logStockEntry({
                    produto_id: item.produto_id,
                    produto_nome: `${item.nome} - ${item.marca}`,
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
        const { data } = await getSupabase().from('sales').select('*, items:sale_items(*)').order('data_venda', { ascending: false }).limit(20);
        return attachPaymentsToSales(data || []);
    }
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    return attachPaymentsToSales(sales.sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()).slice(0, 20));
  },

  getSalesByPeriod: async (start: string, end: string): Promise<Sale[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await getSupabase().from('sales').select('*, items:sale_items(*)').gte('data_venda', `${start}T00:00:00`).lte('data_venda', `${end}T23:59:59`);
        return attachPaymentsToSales(data || []);
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

  updateProductStock: async (productId: string, newQuantity: number, reason: string, clientInfo: {id: string, name: string} | undefined, userId: string) => {
      const products = await backendService.getProducts();
      const product = products.find(p => p.id === productId);
      if (!product) return;
      const diff = newQuantity - product.quantidade_estoque;
      
      if (isSupabaseConfigured()) {
          await getSupabase().from('products').update({ quantidade_estoque: newQuantity }).eq('id', productId);
      } else {
          const updated = products.map(p => p.id === productId ? { ...p, quantidade_estoque: newQuantity } : p);
          setLocalData(LS_KEYS.PRODUCTS, updated);
      }

      await backendService.logStockEntry({
          produto_id: productId,
          produto_nome: `${product.nome} - ${product.marca}`,
          quantidade: diff,
          responsavel: userId, 
          motivo: reason,
          cliente_id: clientInfo?.id,
          cliente_nome: clientInfo?.name
      });
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
                  const { data: prod } = await getSupabase().from('products').select('quantidade_estoque').eq('id', item.produto_id).single();
                  if (prod) {
                      await getSupabase().from('products').update({ quantidade_estoque: prod.quantidade_estoque + item.quantidade }).eq('id', item.produto_id);
                      await backendService.logStockEntry({
                          produto_id: item.produto_id,
                          produto_nome: `${item.nome_produto} - ${item.marca}`,
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
           const { data: prod } = await getSupabase().from('products').select('quantidade_estoque').eq('id', item.produto_id).single();
           if (prod) {
               await getSupabase().from('products').update({ quantidade_estoque: prod.quantidade_estoque + item.quantidade }).eq('id', item.produto_id);
               await getSupabase().from('sale_items').update({ status_pagamento: 'pendente', status: 'returned' }).eq('id', item.id);
               await backendService.logStockEntry({
                   produto_id: item.produto_id,
                   produto_nome: `${item.nome_produto} - ${item.marca}`,
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
          const { data } = await getSupabase().from('sales').select('*, items:sale_items(*)').eq('cliente_id', clientId).order('data_venda', { ascending: false });
          return attachPaymentsToSales(data || []);
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
             const { data: foundProd } = await getSupabase().from('products').select('id').eq('nome', entry.produto_nome.split(' - ')[0]).maybeSingle();
             targetProductId = foundProd?.id;
          }

          if (!targetProductId) return false;

          const { data: prod } = await getSupabase().from('products').select('quantidade_estoque').eq('id', targetProductId).single();
          if (!prod) return false;

          await getSupabase().from('products').update({ quantidade_estoque: prod.quantidade_estoque + Math.abs(entry.quantidade) }).eq('id', targetProductId);
      } else {
          const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
          const updated = products.map(p => p.id === targetProductId ? { ...p, quantidade_estoque: p.quantidade_estoque + Math.abs(entry.quantidade) } : p);
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