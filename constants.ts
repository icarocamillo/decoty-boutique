
import { Product, Sale, Client, StockEntry, ProductSize, SaleItem, Supplier } from './types';

export const SIZES_LIST: ProductSize[] = ['P', 'M', 'G', 'GG', 'G1', '40', '42', '44', '46', '48', '00'];

// --- AMBIENTE LIMPO ---
// Arrays vazios para iniciar o sistema sem dados fictícios.

export const MOCK_CLIENTS: Client[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_INITIAL_SALES: Sale[] = [];
export const MOCK_STOCK_ENTRIES: StockEntry[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
