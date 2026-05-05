
export type ProductSize = 'P' | 'M' | 'G' | 'GG' | 'G1' | '40' | '42' | '44' | '46' | '48' | '00' | string;

export interface Product {
  id: string; // UUID (Supabase)
  ui_id: number; // ID Humano (ex: 105)
  nome: string;
  marca: string;
  categoria: string;
  tipo_material: string;
  descricao: string;
  slug: string;
  created_at: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string; // UUID (Supabase)
  product_variant_id: string; // Foreign Key pointing to Product.id
  ui_id: number; // ID Variante (ex: 105.1)
  sku: string;
  ean: string;
  cor: string;
  tamanho: string;
  preco_custo: number;
  preco_venda: number;
  quantidade_estoque: number;
  created_at: string;
  product?: Product;
}

export interface SaleItem {
  id: string;
  venda_id: string;
  produto_id: string; // Points to product_variants.id
  nome_produto: string; // Parent name
  marca: string;
  tamanho: string;
  cor?: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number; 
  desconto?: number;
  subtotal: number;
  status: 'sold' | 'returned'; 
  status_pagamento?: 'pago' | 'pendente';
  valor_estorno_unitario?: number; 
}

export interface CrediarioPayment {
  id: string;
  data: string;
  valor: number;
  valor_taxa: number; // Snapshot da taxa bancária no momento do pagamento
  metodo: string;
  responsavel_nome: string;
}

export interface Sale {
  id: string;
  ui_id?: number; 
  data_venda: string;
  valor_total: number;
  valor_taxa?: number; // Nova coluna: Snapshot da taxa para vendas não-crediário
  items?: SaleItem[]; 
  item_count?: number; 
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cpf?: string;
  produtos_resumo?: string;
  metodo_pagamento?: string;
  status_pagamento?: 'pago' | 'pendente';
  parcelas?: number;
  desconto_extra?: number;
  uso_vale_presente?: number; 
  responsavel?: string; 
  status: 'completed' | 'cancelled';
  taxas_aplicadas?: {
    porcentagem: number;
    valor: number;
  }; 
  valor_liquido_lojista?: number;
  pagamentos_crediario?: CrediarioPayment[]; 
}

export interface CartItem {
  produto_id: string; // Points to product_variants.id
  parent_id: string; // Points to products.id
  nome: string;
  marca: string;
  cor: string;
  tamanho: string;
  preco_unitario: number;
  preco_custo?: number;
  quantidade: number;
  subtotal: number;
  estoque_maximo: number;
  desconto?: number;
  percentual_desconto?: number;
}

export interface ChartDataPoint {
  dia: string;
  total: number;
}

export interface ClientAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface Client {
  id: string;
  nome: string;
  cpf?: string;
  email: string;
  telefone?: string;
  telefone_fixo?: string;
  celular?: string;
  is_whatsapp?: boolean;
  receber_ofertas?: boolean;
  pode_provador?: boolean; 
  saldo_vale_presente?: number; 
  saldo_devedor_crediario?: number; 
  itens_pendentes_provador?: number; 
  endereco?: ClientAddress;
  data_cadastro: string;
}

export interface Supplier {
  id: string;
  nome_empresa: string;
  fantasy_name?: string; 
  nome_contato?: string;
  cnpj_cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
  tipo_fornecedor?: 'Roupas' | 'Acessórios' | 'Roupas e Acessórios';
}

export interface StockEntry {
  id: string;
  data_entrada: string;
  produto_id?: string;
  produto_nome: string;
  quantidade: number;
  responsavel: string;
  motivo: string;
  cliente_id?: string; 
  cliente_nome?: string; 
}

export interface StoreConfig {
  id?: string;
  key: string;
  value: string;
  updated_at?: string;
}

export interface PaymentDiscounts {
  credit_spot: number;
  debit: number;
  pix: number;
}

export interface PaymentFees {
  credit_spot: number;
  credit_installment: number;
  debit: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'salesperson';
  active: boolean;
}
