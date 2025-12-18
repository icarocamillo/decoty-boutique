
export type ProductSize = 'P' | 'M' | 'G' | 'GG' | 'G1' | '40' | '42' | '44' | '46' | '48' | '00';

export interface Product {
  id: string;
  id_decoty: string;
  sku: string;
  ean: string;
  nome: string;
  marca: string;
  categoria: string;
  tipo_material: string;
  cor: string;
  tamanho: ProductSize;
  preco_custo: number;
  preco_venda: number;
  quantidade_estoque: number;
}

export interface SaleItem {
  id: string;
  venda_id: string;
  produto_id: string;
  nome_produto: string;
  marca: string;
  tamanho: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number; // Campo agora Obrigatório para garantir histórico de CMV
  desconto?: number;
  subtotal: number;
  status: 'sold' | 'returned'; // NOVO: Status individual do item
}

export interface Sale {
  id: string;
  sales_id?: number;
  data_venda: string;
  valor_total: number;
  items?: SaleItem[]; 
  item_count?: number; 
  cliente_id?: string;
  cliente_nome?: string;
  cliente_cpf?: string;
  produtos_resumo?: string;
  metodo_pagamento?: string;
  parcelas?: number;
  desconto_extra?: number;
  uso_vale_presente?: number; // NOVO: Valor pago com vale presente
  vendedor?: string;
  status: 'completed' | 'cancelled';
  taxas_aplicadas?: {
    porcentagem: number;
    valor: number;
  }; 
  valor_liquido_lojista?: number;
}

export interface CartItem {
  produto_id: string;
  nome: string;
  marca: string;
  cor: string;
  tamanho: ProductSize;
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
  pode_provador?: boolean; // Nova flag para permitir provador
  saldo_vale_presente?: number; // NOVO: Saldo de vale presente
  endereco?: ClientAddress;
  data_cadastro: string;
}

export interface Supplier {
  id: string;
  nome_empresa: string;
  fantasy_name?: string; // Novo campo: Nome Fantasia (usado como Marca)
  nome_contato?: string;
  cnpj_cpf?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
}

export interface StockEntry {
  id: string;
  data_entrada: string;
  produto_id?: string;
  produto_nome: string;
  quantidade: number;
  responsavel: string;
  motivo: string;
  cliente_id?: string; // Vínculo com cliente para Provador
  cliente_nome?: string; // Nome cacheado para facilitar exibição
}

export interface StoreConfig {
  id?: string;
  key: string;
  value: string;
  updated_at?: string;
}

// --- Interfaces Financeiras ---
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

// --- Interface de Usuário do Sistema ---
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'salesperson';
  active: boolean;
}
