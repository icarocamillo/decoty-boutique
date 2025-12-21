
import { Client, Product, Sale, StockEntry, Supplier, PaymentDiscounts, PaymentFees, CartItem, UserProfile, SaleItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { MOCK_CLIENTS, MOCK_PRODUCTS, MOCK_INITIAL_SALES, MOCK_STOCK_ENTRIES, MOCK_SUPPLIERS } from '../constants';

export type { PaymentDiscounts, PaymentFees };

const LS_KEYS = {
  CLIENTS: 'decoty_clients',
  PRODUCTS: 'decoty_products',
  SALES: 'decoty_sales',
  STOCK: 'decoty_stock',
  SUPPLIERS: 'decoty_suppliers',
  STORE_CONFIG: 'decoty_store_config',
  USERS: 'decoty_users'
};

const getLocalData = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocalData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

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

// Helper interno para arredondamento monetário preciso
const roundMoney = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

export const mockService = {
  getClients: async (): Promise<Client[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('clients').select('*').order('nome');
      if (error) { console.error(error); return []; }
      return (data || []).map(normalizeClientData);
    }
    return getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS).map(normalizeClientData);
  },

  createClient: async (client: Omit<Client, 'id' | 'data_cadastro'>): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      const payload = prepareClientPayload(client);
      const { error } = await supabase.from('clients').insert([payload]);
      if (error) {
          console.error("Erro Supabase Cadastro:", error.message);
          return false;
      }
      return true;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    const newClient: Client = { ...client, id: `c-${Date.now()}`, data_cadastro: new Date().toISOString(), saldo_vale_presente: 0, saldo_devedor_crediario: 0 };
    clients.push(newClient);
    setLocalData(LS_KEYS.CLIENTS, clients);
    return true;
  },

  updateClient: async (client: Client): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      const payload = prepareClientPayload(client);
      const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
      if (error) {
          console.error("Erro Supabase Update:", error.message);
          return false;
      }
      return true;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    const index = clients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      clients[index] = client;
      setLocalData(LS_KEYS.CLIENTS, clients);
      return true;
    }
    return false;
  },

  updateClientCrediario: async (clientId: string, amountToSubtract: number): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data: c } = await supabase.from('clients').select('saldo_devedor_crediario').eq('id', clientId).single();
        const currentDebt = Number(c?.saldo_devedor_crediario || 0);
        const { error } = await supabase.from('clients').update({ saldo_devedor_crediario: Math.max(0, roundMoney(currentDebt - amountToSubtract)) }).eq('id', clientId);
        return !error;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    const idx = clients.findIndex(c => c.id === clientId);
    if (idx !== -1) {
        clients[idx].saldo_devedor_crediario = Math.max(0, roundMoney((clients[idx].saldo_devedor_crediario || 0) - amountToSubtract));
        setLocalData(LS_KEYS.CLIENTS, clients);
        return true;
    }
    return false;
  },

  processCrediarioPayment: async (clientId: string, itemIds: string[], totalAmount: number, vendaId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        await supabase.from('sale_items').update({ status_pagamento: 'pago' }).in('id', itemIds);
        await mockService.updateClientCrediario(clientId, totalAmount);
        const { data: pending } = await supabase.from('sale_items').select('id').eq('venda_id', vendaId).eq('status_pagamento', 'pendente').eq('status', 'sold');
        if (!pending || pending.length === 0) {
            await supabase.from('sales').update({ status_pagamento: 'pago' }).eq('id', vendaId);
        }
        return true;
    }
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    const saleIdx = sales.findIndex(s => s.id === vendaId);
    if (saleIdx !== -1) {
        sales[saleIdx].items?.forEach(item => {
            if (itemIds.includes(item.id)) item.status_pagamento = 'pago';
        });
        const hasPending = sales[saleIdx].items?.some(i => i.status_pagamento === 'pendente' && i.status === 'sold');
        if (!hasPending) sales[saleIdx].status_pagamento = 'pago';
        setLocalData(LS_KEYS.SALES, sales);
    }
    await mockService.updateClientCrediario(clientId, totalAmount);
    return true;
  },

  getProducts: async (): Promise<Product[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('products').select('*').order('nome');
      if (error) { console.error(error); return []; }
      return data || [];
    }
    return getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
  },

  createProduct: async (product: Omit<Product, 'id' | 'ui_id'>, userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('products').insert([product]).select().single();
        if (!error && data) {
            await mockService.logStockEntry({
                produto_id: data.id, 
                produto_nome: `${data.nome} - ${data.marca}`,
                quantidade: data.quantidade_estoque,
                responsavel: userId,
                motivo: 'Cadastro de Produto'
            });
            return true;
        }
        return false;
    }
    const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
    const lastUiId = products.length > 0 ? Math.max(...products.map(p => p.ui_id || 0)) : 0;
    const newProduct: Product = { ...product as any, id: `p-${Date.now()}`, ui_id: lastUiId + 1 };
    products.push(newProduct);
    setLocalData(LS_KEYS.PRODUCTS, products);
    await mockService.logStockEntry({
        produto_id: newProduct.id,
        produto_nome: `${newProduct.nome} - ${newProduct.marca}`,
        quantidade: newProduct.quantidade_estoque,
        responsavel: userId,
        motivo: 'Cadastro de Produto'
    });
    return true;
  },

  updateProduct: async (product: Product, userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data: oldProduct } = await supabase.from('products').select('quantidade_estoque').eq('id', product.id).single();
        const oldStock = oldProduct?.quantidade_estoque || 0;
        const diff = product.quantidade_estoque - oldStock;
        const { error } = await supabase.from('products').update(product).eq('id', product.id);
        if (!error && diff !== 0) {
             await mockService.logStockEntry({
                produto_id: product.id,
                produto_nome: `${product.nome} - ${product.marca}`,
                quantidade: diff,
                responsavel: userId,
                motivo: 'Atualização de Produto (Manual)'
            });
        }
        return !error;
    }
    const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      const oldStock = products[index].quantidade_estoque;
      const diff = product.quantidade_estoque - oldStock;
      products[index] = product;
      setLocalData(LS_KEYS.PRODUCTS, products);
      if (diff !== 0) {
          await mockService.logStockEntry({
            produto_id: product.id,
            produto_nome: `${product.nome} - ${product.marca}`,
            quantidade: diff,
            responsavel: userId,
            motivo: 'Atualização de Produto (Manual)'
        });
      }
      return true;
    }
    return false;
  },

  createSale: async (cart: CartItem[], client: {id?: string, name: string, cpf?: string}, method: string, installments: number, extraDiscount: number, feesSnapshot: any, userId: string, giftCardUsed: number): Promise<boolean> => {
    const totalValue = cart.reduce((acc, item) => acc + item.subtotal, 0) - extraDiscount - giftCardUsed;
    const isCrediario = method === 'Crediário';
    const feeValueTotal = feesSnapshot?.valor || 0;

    const saleData = {
        data_venda: new Date().toISOString(),
        valor_total: totalValue,
        valor_liquido_lojista: totalValue - feeValueTotal, 
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
        try {
            // Buscamos o registro criado incluindo o sales_id/ui_id gerado pelo banco
            const { data: sale, error: saleError } = await supabase.from('sales').insert([saleData]).select().single();
            
            if (saleError || !sale) {
                console.error("Erro Supabase ao criar venda:", saleError);
                return false;
            }

            const saleDisplayId = sale.sales_id || sale.ui_id || sale.id;

            if (isCrediario && client.id) {
                const { data: c } = await supabase.from('clients').select('saldo_devedor_crediario').eq('id', client.id).single();
                const currentDebt = Number(c?.saldo_devedor_crediario || 0);
                await supabase.from('clients').update({ saldo_devedor_crediario: roundMoney(currentDebt + totalValue) }).eq('id', client.id);
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
            
            const { error: itemsError } = await supabase.from('sale_items').insert(itemsData);
            if (itemsError) {
                console.error("Erro Supabase ao inserir itens da venda:", itemsError);
            }

            for (const item of cart) {
                const { data: prod } = await supabase.from('products').select('quantidade_estoque').eq('id', item.produto_id).single();
                if (prod) {
                    const newStock = prod.quantidade_estoque - item.quantidade;
                    await supabase.from('products').update({ quantidade_estoque: newStock }).eq('id', item.produto_id);
                    await mockService.logStockEntry({
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
                 const { data: c } = await supabase.from('clients').select('saldo_vale_presente').eq('id', client.id).single();
                 if (c) {
                     const newBalance = roundMoney((c.saldo_vale_presente || 0) - giftCardUsed);
                     await supabase.from('clients').update({ saldo_vale_presente: newBalance }).eq('id', client.id);
                 }
            }
            return true;
        } catch (err) {
            console.error("Erro crítico inesperado ao finalizar venda (Supabase):", err);
            return false;
        }
    }

    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    const saleId = `s-${Date.now()}`;
    const mockedItems: SaleItem[] = cart.flatMap(item => {
        const unitDiscount = (item.desconto || 0) / item.quantidade;
        const unitSubtotal = (item.subtotal || 0) / item.quantidade;
        return Array.from({ length: item.quantidade }).map((_, idx) => ({
            id: `si-${saleId}-${item.produto_id}-${idx}`,
            venda_id: saleId,
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

    const newSale: Sale = { ...saleData, id: saleId, items: mockedItems, ui_id: sales.length + 1 };
    sales.push(newSale);
    setLocalData(LS_KEYS.SALES, sales);

    if (isCrediario && client.id) {
        const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
        const idx = clients.findIndex(c => c.id === client.id);
        if (idx !== -1) {
            clients[idx].saldo_devedor_crediario = roundMoney((clients[idx].saldo_devedor_crediario || 0) + totalValue);
            setLocalData(LS_KEYS.CLIENTS, clients);
        }
    }

    const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
    for (const item of cart) {
        const idx = products.findIndex(p => p.id === item.produto_id);
        if (idx !== -1) {
            products[idx].quantidade_estoque -= item.quantidade;
            await mockService.logStockEntry({
                produto_id: item.produto_id,
                produto_nome: `${item.nome} - ${item.marca}`,
                quantidade: -item.quantidade,
                responsavel: userId,
                motivo: `Saída - Venda #${newSale.ui_id || newSale.id}`,
                cliente_id: client.id,
                cliente_nome: client.name
            });
        }
    }
    setLocalData(LS_KEYS.PRODUCTS, products);

    if (giftCardUsed > 0 && client.id) {
        const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
        const cIdx = clients.findIndex(c => c.id === client.id);
        if (cIdx !== -1) {
            clients[cIdx].saldo_vale_presente = roundMoney((clients[cIdx].saldo_vale_presente || 0) - giftCardUsed);
            setLocalData(LS_KEYS.CLIENTS, clients);
        }
    }
    return true;
  },

  getRecentSales: async (): Promise<Sale[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('sales').select('*, items:sale_items(*)').order('data_venda', { ascending: false }).limit(20);
        return (data || []).map(s => ({ ...s, ui_id: s.sales_id || s.ui_id }));
    }
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    return sales.sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime()).slice(0, 20);
  },

  getSalesByPeriod: async (start: string, end: string): Promise<Sale[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('sales').select('*, items:sale_items(*)').gte('data_venda', `${start}T00:00:00`).lte('data_venda', `${end}T23:59:59`);
        return (data || []).map(s => ({ ...s, ui_id: s.sales_id || s.ui_id }));
    }
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    const sDate = new Date(start);
    const eDate = new Date(end);
    eDate.setHours(23, 59, 59);
    return sales.filter(s => {
        const d = new Date(s.data_venda);
        return d >= sDate && d <= eDate;
    });
  },

  getDashboardChartData: async () => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const sales = await mockService.getSalesByPeriod(startStr, today);
    
    const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        return d;
    });

    return last7Days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayTotal = sales
            .filter(s => s.data_venda.startsWith(dateStr) && s.status !== 'cancelled' && s.metodo_pagamento !== 'Crediário')
            .reduce((acc, s) => {
                const soldItemsSubtotal = s.items?.filter(i => i.status === 'sold').reduce((sum, item) => sum + item.subtotal, 0) || 0;
                if (soldItemsSubtotal === 0) return acc;
                const saleNetValue = Math.max(0, roundMoney(soldItemsSubtotal - (s.desconto_extra || 0) - (s.uso_vale_presente || 0)));
                return acc + saleNetValue;
            }, 0);

        return {
            dia: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            total: dayTotal
        };
    });
  },

  getTopSellingBrand: async (): Promise<string> => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startStr = sevenDaysAgo.toISOString().split('T')[0];
      
      const sales = await mockService.getSalesByPeriod(startStr, today);
      const brandCounts: Record<string, number> = {};
      sales.forEach(s => {
          if (s.status !== 'cancelled' && s.items) {
              s.items.forEach(i => {
                  brandCounts[i.marca] = (brandCounts[i.marca] || 0) + i.quantidade;
              });
          }
      });
      const sorted = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : '-';
  },

  getStockEntries: async (): Promise<StockEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('stock_entries').select('*').order('data_entrada', { ascending: false });
        return data || [];
    }
    return getLocalData<StockEntry[]>(LS_KEYS.STOCK, MOCK_STOCK_ENTRIES);
  },

  logStockEntry: async (entry: Omit<StockEntry, 'id' | 'data_entrada'>) => {
    const newEntry = { 
        produto_id: entry.produto_id,
        produto_nome: entry.produto_nome,
        quantidade: entry.quantidade,
        responsavel: entry.responsavel, 
        motivo: entry.motivo,
        cliente_id: entry.cliente_id || null,
        cliente_nome: entry.cliente_nome || null,
        data_entrada: new Date().toISOString() 
    };

    if (isSupabaseConfigured()) {
        // Validação preventiva no código: Se o 'responsavel' não for um UUID (contém espaços ou letras fora de A-F), loga erro local antes de tentar o banco
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newEntry.responsavel);
        if (!isUuid) {
            console.error("Erro crítico: Tentativa de registrar log de estoque com responsável inválido (não é UUID):", newEntry.responsavel);
            return;
        }

        const { error } = await supabase.from('stock_entries').insert([newEntry]);
        if (error) console.error("Falha ao registrar log de estoque no Supabase (Verifique FK profiles):", error);
        return;
    }
    const entries = getLocalData<StockEntry[]>(LS_KEYS.STOCK, MOCK_STOCK_ENTRIES);
    entries.push({ ...newEntry, id: `se-${Date.now()}` } as StockEntry);
    setLocalData(LS_KEYS.STOCK, entries);
  },

  updateProductStock: async (productId: string, newQuantity: number, reason: string, clientInfo: {id: string, name: string} | undefined, userId: string) => {
      const products = await mockService.getProducts();
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const diff = newQuantity - product.quantidade_estoque;
      
      if (isSupabaseConfigured()) {
          await supabase.from('products').update({ quantidade_estoque: newQuantity }).eq('id', productId);
          await mockService.logStockEntry({
              produto_id: productId,
              produto_nome: `${product.nome} - ${product.marca}`,
              quantidade: diff,
              responsavel: userId, 
              motivo: reason,
              cliente_id: clientInfo?.id,
              cliente_nome: clientInfo?.name
          });
          return;
      }
      const allProducts = await mockService.getProducts();
      const idx = allProducts.findIndex(p => p.id === productId);
      if (idx !== -1) {
          allProducts[idx].quantidade_estoque = newQuantity;
          setLocalData(LS_KEYS.PRODUCTS, allProducts);
          await mockService.logStockEntry({
              produto_id: productId,
              produto_nome: `${product.nome} - ${product.marca}`,
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
        const { data } = await supabase.from('suppliers').select('*').order('nome_empresa');
        return data || [];
    }
    return getLocalData<Supplier[]>(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
  },

  createSupplier: async (supplier: Omit<Supplier, 'id'>): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { error } = await supabase.from('suppliers').insert([supplier]);
        return !error;
    }
    const suppliers = getLocalData<Supplier[]>(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
    suppliers.push({ ...supplier, id: `sup-${Date.now()}` });
    setLocalData(LS_KEYS.SUPPLIERS, suppliers);
    return true;
  },

  updateSupplier: async (supplier: Supplier): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { error } = await supabase.from('suppliers').update(supplier).eq('id', supplier.id);
        return !error;
    }
    const suppliers = getLocalData<Supplier[]>(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
    const index = suppliers.findIndex(s => s.id === supplier.id);
    if (index !== -1) {
        suppliers[index] = supplier;
        setLocalData(LS_KEYS.SUPPLIERS, suppliers);
        return true;
    }
    return false;
  },

  getPaymentDiscounts: async (): Promise<PaymentDiscounts> => {
      const defaults = { credit_spot: 0, depth: 0, pix: 0 };
      if (isSupabaseConfigured()) {
          const { data } = await supabase.from('store_config').select('value').eq('key', 'payment_discounts').maybeSingle();
          return data ? JSON.parse(data.value) : defaults;
      }
      const config = getLocalData<any>(LS_KEYS.STORE_CONFIG, {});
      return config.payment_discounts || defaults;
  },

  updatePaymentDiscounts: async (discounts: PaymentDiscounts): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('store_config').upsert({ key: 'payment_discounts', value: JSON.stringify(discounts) }, { onConflict: 'key' });
          return !error;
      }
      const config = getLocalData<any>(LS_KEYS.STORE_CONFIG, {});
      config.payment_discounts = discounts;
      setLocalData(LS_KEYS.STORE_CONFIG, config);
      return true;
  },

  getPaymentFees: async (): Promise<PaymentFees> => {
      const defaults = { credit_spot: 0, credit_installment: 0, debit: 0 };
      if (isSupabaseConfigured()) {
          const { data } = await supabase.from('store_config').select('value').eq('key', 'payment_fees').maybeSingle();
          return data ? JSON.parse(data.value) : defaults;
      }
      const config = getLocalData<any>(LS_KEYS.STORE_CONFIG, {});
      return config.payment_fees || defaults;
  },

  updatePaymentFees: async (fees: PaymentFees): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('store_config').upsert({ key: 'payment_fees', value: JSON.stringify(fees) }, { onConflict: 'key' });
          return !error;
      }
      const config = getLocalData<any>(LS_KEYS.STORE_CONFIG, {});
      config.payment_fees = fees;
      setLocalData(LS_KEYS.STORE_CONFIG, config);
      return true;
  },

  getStoreAccessHash: async (): Promise<string> => {
      if (isSupabaseConfigured()) {
          const { data, error } = await supabase
              .from('store_config')
              .select('value')
              .eq('key', 'store_access_hash')
              .maybeSingle();
          if (error) return '';
          return data ? String(data.value || '').trim() : ''; 
      }
      const config = getLocalData<any>(LS_KEYS.STORE_CONFIG, {});
      return config.store_access_hash || '';
  },

  updateStoreAccessHash: async (hash: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('store_config').upsert({ key: 'store_access_hash', value: hash }, { onConflict: 'key' });
          return !error;
      }
      const config = getLocalData<any>(LS_KEYS.STORE_CONFIG, {});
      config.store_access_hash = hash;
      setLocalData(LS_KEYS.STORE_CONFIG, config);
      return true;
  },

  getUsers: async (): Promise<UserProfile[]> => {
      if (isSupabaseConfigured()) {
          const { data, error } = await supabase.from('profiles').select('*');
          if (error) return [];
          return data.map((p: any) => ({ id: p.id, name: p.name || 'User', email: p.email || '', role: p.role || 'salesperson', active: p.active }));
      }
      return getLocalData<any[]>(LS_KEYS.USERS, []);
  },

  updateUserStatus: async (userId: string, active: boolean): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('profiles').update({ active }).eq('id', userId);
          return !error;
      }
      const users = getLocalData<any[]>(LS_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) { users[idx].active = active; setLocalData(LS_KEYS.USERS, users); return true; }
      return false;
  },

  updateUserRole: async (userId: string, role: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
          return !error;
      }
      const users = getLocalData<any[]>(LS_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) { users[idx].role = role; setLocalData(LS_KEYS.USERS, users); return true; }
      return false;
  },

  cancelSale: async (saleId: string, userId: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { data: sale } = await supabase.from('sales').select('cliente_id, cliente_nome, sales_id, ui_id, metodo_pagamento, valor_total').eq('id', saleId).single();
          const { error } = await supabase.from('sales').update({ status: 'cancelled' }).eq('id', saleId);
          if (error) return false;

          const saleDisplayId = sale?.sales_id || sale?.ui_id || saleId;

          if (sale?.metodo_pagamento === 'Crediário' && sale.cliente_id) {
              const { data: c } = await supabase.from('clients').select('saldo_devedor_crediario').eq('id', sale.cliente_id).single();
              await supabase.from('clients').update({ saldo_devedor_crediario: Math.max(0, roundMoney(Number(c?.saldo_devedor_crediario || 0) - sale.valor_total)) }).eq('id', sale.cliente_id);
          }

          await supabase.from('sale_items').update({ status: 'returned' }).eq('venda_id', saleId);
          const { data: items } = await supabase.from('sale_items').select('*').eq('venda_id', saleId);
          if (items) {
              for (const item of items) {
                  const { data: prod } = await supabase.from('products').select('quantidade_estoque').eq('id', item.produto_id).single();
                  if (prod) {
                      await supabase.from('products').update({ quantidade_estoque: prod.quantidade_estoque + item.quantidade }).eq('id', item.produto_id);
                      await mockService.logStockEntry({
                          produto_id: item.produto_id,
                          produto_nome: `${item.nome_produto} - ${item.marca}`,
                          quantidade: item.quantidade,
                          responsavel: userId, 
                          motivo: `Cancelamento de Venda #${saleDisplayId}`,
                          cliente_id: sale?.cliente_id,
                          cliente_nome: sale?.cliente_nome
                      });
                  }
              }
          }
          return true;
      }

      const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
      const saleIdx = sales.findIndex(s => s.id === saleId);
      if (saleIdx !== -1) {
          if (sales[saleIdx].status === 'cancelled') return false;
          const sale = sales[saleIdx];
          sale.status = 'cancelled';
          if (sale.metodo_pagamento === 'Crediário' && sale.cliente_id) {
              const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
              const cIdx = clients.findIndex(c => c.id === sale.cliente_id);
              if (cIdx !== -1) {
                  clients[cIdx].saldo_devedor_crediario = Math.max(0, roundMoney((clients[cIdx].saldo_devedor_crediario || 0) - sale.valor_total));
                  setLocalData(LS_KEYS.CLIENTS, clients);
              }
          }
          sale.items?.forEach(i => i.status = 'returned');
          setLocalData(LS_KEYS.SALES, sales);
          const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
          sale.items?.forEach(item => {
              const pIdx = products.findIndex(p => p.id === item.produto_id);
              if (pIdx !== -1) {
                  products[pIdx].quantidade_estoque += item.quantidade;
                  mockService.logStockEntry({
                        produto_id: item.produto_id,
                        produto_nome: `${item.nome_produto} - ${item.marca}`,
                        quantidade: item.quantidade,
                        responsavel: userId,
                        motivo: `Cancelamento de Venda #${sale.ui_id || sale.id}`,
                        cliente_id: sale.cliente_id,
                        cliente_nome: sale.cliente_nome
                  });
              }
          });
          setLocalData(LS_KEYS.PRODUCTS, products);
          return true;
      }
      return false;
  },

  returnSaleItems: async (saleId: string, items: SaleItem[], clientId: string | undefined, userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
        const { data: saleData } = await supabase.from('sales').select('sales_id, ui_id, cliente_nome, metodo_pagamento, desconto_extra, item_count').eq('id', saleId).single();
        const saleDisplayId = saleData?.sales_id || saleData?.ui_id || saleId;
        const clientName = saleData?.cliente_nome;
        
        let giftCardSum = 0;
        let debtReductionSum = 0;

        for (const item of items) {
           const { data: prod } = await supabase.from('products').select('quantidade_estoque').eq('id', item.produto_id).single();
           if (prod) {
               await supabase.from('products').update({ quantidade_estoque: prod.quantidade_estoque + item.quantidade }).eq('id', item.produto_id);
               await supabase.from('sale_items').update({ status: 'returned' }).eq('id', item.id);
               await mockService.logStockEntry({
                   produto_id: item.produto_id,
                   produto_nome: `${item.nome_produto} - ${item.marca}`,
                   quantidade: item.quantidade,
                   responsavel: userId, 
                   motivo: `Devolução de Venda #${saleDisplayId}`,
                   cliente_id: clientId,
                   cliente_nome: clientName
               });

               // LÓGICA DE UNIDADE: Priorizamos o valor calculado pelo FRONT que o usuário viu na tela
               const unitNetRefund = item.valor_estorno_unitario !== undefined 
                    ? Number(item.valor_estorno_unitario) 
                    : roundMoney(Math.max(0, (Number(item.subtotal || 0) / Number(item.quantidade || 1))));

               if (item.status_pagamento === 'pago') {
                   giftCardSum = roundMoney(giftCardSum + unitNetRefund);
               } else {
                   debtReductionSum = roundMoney(debtReductionSum + unitNetRefund);
               }
           }
        }

        if (clientId) {
            if (debtReductionSum > 0) {
                const { data: c } = await supabase.from('clients').select('saldo_devedor_crediario').eq('id', clientId).single();
                const currentDebt = Number(c?.saldo_devedor_crediario || 0);
                await supabase.from('clients').update({ 
                    saldo_devedor_crediario: Math.max(0, roundMoney(currentDebt - debtReductionSum)) 
                }).eq('id', clientId);
            }
            if (giftCardSum > 0) {
                const { data: c } = await supabase.from('clients').select('saldo_vale_presente').eq('id', clientId).single();
                const currentBalance = Number(c?.saldo_vale_presente || 0);
                await supabase.from('clients').update({ 
                    saldo_vale_presente: roundMoney(currentBalance + giftCardSum) 
                }).eq('id', clientId);
            }
        }

        const { data: activeItems = [] } = await supabase.from('sale_items').select('id').eq('venda_id', saleId).eq('status', 'sold');
        if (!activeItems || activeItems.length === 0) {
            await supabase.from('sales').update({ status: 'cancelled' }).eq('id', saleId);
        }
        return true;
    }

    // LÓGICA MOCK (LocalStorage)
    const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
    const saleIdx = sales.findIndex(s => s.id === saleId);
    if (saleIdx === -1) return false;
    const sale = sales[saleIdx];
    const saleDisplayId = sale.ui_id || sale.id;

    const allProducts = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
    let giftCardSum = 0;
    let debtReductionSum = 0;

    for (const itemToReturn of items) {
        if (sale.items) {
            const siIdx = sale.items.findIndex(si => si.id === itemToReturn.id);
            if (siIdx !== -1) sale.items[siIdx].status = 'returned';
        }

        const pIdx = allProducts.findIndex(p => p.id === itemToReturn.produto_id);
        if (pIdx !== -1) {
            allProducts[pIdx].quantidade_estoque += itemToReturn.quantidade;
            await mockService.logStockEntry({
                produto_id: itemToReturn.produto_id,
                produto_nome: `${itemToReturn.nome_produto} - ${itemToReturn.marca}`,
                quantidade: itemToReturn.quantidade,
                responsavel: userId,
                motivo: `Devolução de Venda #${saleDisplayId}`,
                cliente_id: clientId,
                cliente_nome: sale.cliente_nome
            });

            // LÓGICA DE UNIDADE MOCK: Priorizamos o valor calculado pelo FRONT
            const unitNetRefund = itemToReturn.valor_estorno_unitario !== undefined 
                ? Number(itemToReturn.valor_estorno_unitario)
                : roundMoney(Math.max(0, (Number(itemToReturn.subtotal) / Number(itemToReturn.quantidade || 1))));

            if (itemToReturn.status_pagamento === 'pago') {
                giftCardSum = roundMoney(giftCardSum + unitNetRefund);
            } else {
                debtReductionSum = roundMoney(debtReductionSum + unitNetRefund);
            }
        }
    }

    setLocalData(LS_KEYS.PRODUCTS, allProducts);
    
    if (clientId) {
        const allClients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
        const cIdx = allClients.findIndex(c => c.id === clientId);
        if (cIdx !== -1) {
            if (debtReductionSum > 0) {
                allClients[cIdx].saldo_devedor_crediario = Math.max(0, roundMoney((Number(allClients[cIdx].saldo_devedor_crediario) || 0) - debtReductionSum));
            }
            if (giftCardSum > 0) {
                allClients[cIdx].saldo_vale_presente = roundMoney((Number(allClients[cIdx].saldo_vale_presente) || 0) + giftCardSum);
            }
            setLocalData(LS_KEYS.CLIENTS, allClients);
        }
    }

    const hasActiveItems = sale.items?.some(i => i.status === 'sold');
    if (!hasActiveItems) sale.status = 'cancelled';

    setLocalData(LS_KEYS.SALES, sales);
    return true;
  },

  linkClientToSale: async (saleId: string, client: Client): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('sales').update({ cliente_id: client.id, cliente_nome: client.nome, cliente_cpf: client.cpf }).eq('id', saleId);
          return !error;
      }
      const sales = getLocalData<Sale[]>(LS_KEYS.SALES, MOCK_INITIAL_SALES);
      const idx = sales.findIndex(s => s.id === saleId);
      if (idx !== -1) {
          sales[idx].cliente_id = client.id;
          sales[idx].cliente_nome = client.nome;
          sales[idx].cliente_cpf = client.cpf;
          setLocalData(LS_KEYS.SALES, sales);
          return true;
      }
      return false;
  },

  getClientSales: async (clientId: string): Promise<Sale[]> => {
      if (isSupabaseConfigured()) {
          const { data } = await supabase.from('sales').select('*, items:sale_items(*)').eq('cliente_id', clientId).order('data_venda', { ascending: false });
          return (data || []).map(s => ({ ...s, ui_id: s.sales_id || s.ui_id }));
      }
      const sales = getLocalData<Sale[]>(LS_KEYS.SALES, []);
      return sales.filter(s => s.cliente_id === clientId);
  },

  getClientStockHistory: async (clientId: string): Promise<StockEntry[]> => {
      if (isSupabaseConfigured()) {
          const { data } = await supabase.from('stock_entries').select('*').eq('cliente_id', clientId).order('data_entrada', { ascending: false });
          return data || [];
      }
      const entries = getLocalData<StockEntry[]>(LS_KEYS.STOCK, MOCK_STOCK_ENTRIES);
      return entries.filter(e => e.cliente_id === clientId);
  },

  returnProvadorItem: async (entry: StockEntry, userId: string): Promise<boolean> => {
      if (isSupabaseConfigured()) {
          const { data: prod } = await supabase.from('products').select('quantidade_estoque').eq('id', entry.produto_id).single();
          if (!prod) return false;
          await supabase.from('products').update({ quantidade_estoque: prod.quantidade_estoque + Math.abs(entry.quantidade) }).eq('id', entry.produto_id);
          await mockService.logStockEntry({
              produto_id: entry.produto_id,
              produto_nome: entry.produto_nome,
              quantidade: Math.abs(entry.quantidade),
              responsavel: userId, 
              motivo: 'Retorno Provador',
              cliente_id: entry.cliente_id,
              cliente_nome: entry.cliente_nome
          });
          return true;
      }
      const products = getLocalData<Product[]>(LS_KEYS.PRODUCTS, MOCK_PRODUCTS);
      const pIdx = products.findIndex(p => p.id === entry.produto_id);
      if (pIdx !== -1) {
          products[pIdx].quantidade_estoque += Math.abs(entry.quantidade);
          setLocalData(LS_KEYS.PRODUCTS, products);
          await mockService.logStockEntry({
              produto_id: entry.produto_id,
              produto_nome: entry.produto_nome,
              quantidade: Math.abs(entry.quantidade),
              responsavel: userId, 
              motivo: 'Retorno Provador',
              cliente_id: entry.cliente_id,
              cliente_nome: entry.cliente_nome
          });
          return true;
      }
      return false;
  },

  addClientBalance: async (clientId: string, amount: number): Promise<boolean> => {
    if (isSupabaseConfigured()) {
       const { data: clientData, error: fetchError } = await supabase.from('clients').select('saldo_vale_presente').eq('id', clientId).single();
       if (fetchError) return false;
       const { error: updateError } = await supabase.from('clients').update({ saldo_vale_presente: roundMoney(Number(clientData.saldo_vale_presente || 0) + amount) }).eq('id', clientId);
       return !updateError;
    }
    const clients = getLocalData<Client[]>(LS_KEYS.CLIENTS, MOCK_CLIENTS);
    const index = clients.findIndex(c => c.id === clientId);
    if (index !== -1) {
       clients[index].saldo_vale_presente = roundMoney((clients[index].saldo_vale_presente || 0) + amount);
       setLocalData(LS_KEYS.CLIENTS, clients);
       return true;
    }
    return false;
  }
};
