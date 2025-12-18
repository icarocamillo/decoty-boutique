import React, { useState, useMemo, useEffect } from 'react';
import { StockEntry, Product } from '../types';
import { ArrowDownCircle, ArrowUpCircle, Package, Archive, Search, Filter, User, Shirt, Undo2 } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { Pagination } from './ui/Pagination';
import { SIZES_LIST } from '../constants';
import { formatDateStandard } from '../utils';
import { mockService } from '../services/mockService';
import { useNavigate } from 'react-router-dom';

interface StockListProps {
  entries: StockEntry[];
  products: Product[];
  onUpdate: () => void;
}

const CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas', 'Pulseira', 'Brinco', 'Colar'];

export const StockList: React.FC<StockListProps> = ({ entries, products, onUpdate }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  
  // States for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [filterType, setFilterType] = useState(''); // '' | 'entrada' | 'saida'

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Carrega marcas dos fornecedores
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const suppliers = await mockService.getSuppliers();
        const supplierBrands = suppliers
          .map(s => s.fantasy_name)
          .filter((name): name is string => !!name && name.trim() !== '');
        
        const uniqueBrands = Array.from(new Set(supplierBrands)).sort();
        setBrands(uniqueBrands);
      } catch (error) {
        console.error("Erro ao carregar marcas", error);
      }
    };
    fetchBrands();
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory, selectedSize, filterType, itemsPerPage]);

  const getProductInfo = (entry: StockEntry) => {
    if (entry.produto_id) {
        return products.find(p => p.id === entry.produto_id);
    }
    return products.find(p => `${p.nome} - ${p.marca}` === entry.produto_nome);
  };

  const filteredEntries = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim();

    const hasExactIdMatch = products.some(p => p.id_decoty.toLowerCase() === searchLower);

    return entries
      .filter(entry => {
        const product = getProductInfo(entry);
        
        const brand = product ? product.marca : '';
        const category = product ? product.categoria : '';
        const size = product ? product.tamanho : '';
        const name = product ? product.nome : entry.produto_nome;
        const decotyId = product ? product.id_decoty : '';
        
        // Dados adicionais para busca (Cliente e Motivo)
        const clientName = entry.cliente_nome || '';
        const reason = entry.motivo || '';

        let matchesSearch = false;

        if (hasExactIdMatch) {
           matchesSearch = decotyId.toLowerCase() === searchLower;
        } else {
           matchesSearch = 
            name.toLowerCase().includes(searchLower) || 
            decotyId.toLowerCase().includes(searchLower) ||
            clientName.toLowerCase().includes(searchLower) || // Busca por nome do cliente
            reason.toLowerCase().includes(searchLower);       // Busca pelo motivo
        }
        
        const matchesBrand = selectedBrand ? brand === selectedBrand : true;
        const matchesCategory = selectedCategory ? category === selectedCategory : true;
        const matchesSize = selectedSize ? size === selectedSize : true;
        
        // Filtro de Tipo (Entrada/Saída)
        const matchesType = filterType 
            ? (filterType === 'entrada' ? entry.quantidade > 0 : entry.quantidade < 0)
            : true;

        return matchesSearch && matchesBrand && matchesCategory && matchesSize && matchesType;
      })
      .sort((a, b) => new Date(b.data_entrada).getTime() - new Date(a.data_entrada).getTime());
  }, [entries, products, searchTerm, selectedBrand, selectedCategory, selectedSize, filterType]);

  // Pagination Logic
  const totalItems = filteredEntries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  const handleRowClick = (entry: StockEntry) => {
    // Se for clique na linha, abre modal de ajuste para o produto daquela linha (atalho)
    const product = getProductInfo(entry);
    if (product) {
        setProductToAdjust(product);
        setIsModalOpen(true);
    }
  };

  const handleOpenGeneralModal = () => {
    setProductToAdjust(null);
    setIsModalOpen(true);
  };

  // Helper para formatar a coluna Responsável / Motivo
  const formatResponsibleAndReason = (entry: StockEntry) => {
    const user = entry.responsavel.split('@')[0]; 
    const fullUser = entry.responsavel; 
    const displayUser = fullUser.includes('@') ? user : fullUser;

    const rawMotivo = entry.motivo || '';

    // Cenário 1: Cadastro
    if (rawMotivo.includes('Cadastro de Produto')) {
      return {
        top: `${displayUser} - Cadastro`,
        bottom: '(Entrada - Cadastro de Produto)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Cenário 2: Alteração
    if (rawMotivo.includes('Atualização de Produto')) {
      return {
        top: `${displayUser} - Alteração`,
        bottom: '(Entrada - Atualização de Produto)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Cenário 3: Cancelamento Venda (FORMATO ATUALIZADO: [User] - #[ID])
    if (rawMotivo.includes('Cancelamento de Venda')) {
      const idMatch = rawMotivo.match(/#(\w+)/);
      const id = idMatch ? idMatch[1] : '?';
      return {
        top: `${displayUser} - #${id}`,
        bottom: '(Entrada - Cancelamento de Venda)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Cenário Venda (Saída) (FORMATO ATUALIZADO: [User] - #[ID])
    if (rawMotivo.includes('Saída - Venda')) {
      const idMatch = rawMotivo.match(/#(\w+)/);
      const id = idMatch ? idMatch[1] : '?';
      return {
        top: `${displayUser} - #${id}`,
        bottom: '(Saída - Venda)',
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Cenário Devolução de Venda (Estorno Parcial)
    if (rawMotivo.includes('Devolução de Venda')) {
      const idMatch = rawMotivo.match(/#(\w+)/);
      const id = idMatch ? idMatch[1] : '?';
      return {
        top: `${displayUser} - #${id}`,
        bottom: '(Entrada - Devolução de Venda)',
        isProvador: false,
        isReturn: true,
        isReturned: false
      };
    }

    // Cenário 4: Retorno Provador (ENTRADA DE DEVOLUÇÃO - ESTILO ROXO)
    if (rawMotivo.includes('Retorno Provador')) {
       return {
          top: `${displayUser} - Devolução Provador`,
          bottom: entry.cliente_nome ? `Cliente: ${entry.cliente_nome}` : `Cliente não informado`,
          isProvador: true, // Força estilo Roxo
          isReturn: false,  // Desativa estilo Verde para manter a consistência visual roxa
          isReturned: false
       };
    }

    // Cenário: Baixa Manual / Saída Provador
    if (rawMotivo.includes('Saída Manual') || rawMotivo.includes('Provador')) {
      const isReturned = rawMotivo.includes('(Devolvido)');
      let specific = rawMotivo.replace('Saída Manual - ', '').replace(' (Devolvido)', '');
      
      // Se for provador
      if (entry.cliente_nome || specific.includes('Provador')) {
         return {
            top: `${displayUser} - ${specific.replace('Saída Manual - ', '')}`, 
            bottom: entry.cliente_nome ? `Cliente: ${entry.cliente_nome}` : `Responsável: ${displayUser}`,
            isProvador: true,
            isReturn: false,
            isReturned: isReturned
         };
      }

      return {
        top: `${displayUser} - Baixa`,
        bottom: `(${specific})`,
        isProvador: false,
        isReturn: false,
        isReturned: false
      };
    }

    // Fallback
    return {
      top: displayUser,
      bottom: `(${rawMotivo})`,
      isProvador: false,
      isReturn: false,
      isReturned: false
    };
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Movimentação de Estoque</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Histórico de entradas e saídas</p>
        </div>
        <Button onClick={handleOpenGeneralModal} className="flex items-center gap-2">
            <Archive size={18} /> Baixa de estoque
        </Button>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar de Filtros */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
           <div className="flex flex-col md:flex-row gap-3 w-full flex-wrap">
             {/* Search */}
             <div className="relative w-full md:w-60">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Produto, Cliente ou Motivo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 {/* Tipo de Lançamento */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={filterType}
                     onChange={(e) => setFilterType(e.target.value)}
                   >
                     <option value="">Todos Tipos</option>
                     <option value="entrada">Entrada (+)</option>
                     <option value="saida">Saída (-)</option>
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Marca */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedBrand}
                     onChange={(e) => setSelectedBrand(e.target.value)}
                   >
                     <option value="">Marca</option>
                     {brands.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Categoria */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedCategory}
                     onChange={(e) => setSelectedCategory(e.target.value)}
                   >
                     <option value="">Categoria</option>
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>

                 {/* Tamanho */}
                 <div className="relative w-full sm:w-32">
                   <select 
                     className="w-full appearance-none pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none"
                     value={selectedSize}
                     onChange={(e) => setSelectedSize(e.target.value)}
                   >
                     <option value="">Tamanho</option>
                     {SIZES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                 </div>
              </div>
           </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Data / Hora</th>
                <th className="px-6 py-4 font-medium">ID Decoty</th>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium text-center">Tam.</th>
                <th className="px-6 py-4 font-medium text-center">Cor</th>
                <th className="px-6 py-4 font-medium text-center">Quantidade Movimentada</th>
                <th className="px-6 py-4 font-medium text-center">Quantidade Atual</th>
                <th className="px-6 py-4 font-medium">Motivo / Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {currentEntries.map((entry) => {
                const isPositive = entry.quantidade > 0;
                const { weekDay, dateTime } = formatDateStandard(entry.data_entrada);
                const product = getProductInfo(entry);
                const { top, bottom, isProvador, isReturn, isReturned } = formatResponsibleAndReason(entry);
                
                return (
                  <tr 
                    key={entry.id} 
                    onClick={() => handleRowClick(entry)}
                    className={`
                      hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer 
                      ${isProvador && !isReturn && !isReturned ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''}
                      ${isReturn ? 'bg-green-50/30 dark:bg-green-900/10' : ''}
                    `}
                    title="Clique para lançar baixa deste produto"
                  >
                    
                    {/* 1. Data / Hora */}
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                       <div className="flex flex-col text-xs">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{weekDay}</span>
                          <span className="text-zinc-500 dark:text-zinc-500">{dateTime}</span>
                        </div>
                    </td>

                    {/* 2. ID Decoty */}
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-500 font-mono text-xs whitespace-nowrap">
                        {product?.id_decoty || '-'}
                    </td>

                    {/* 3. Produto (Com Marca embaixo) */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900 dark:text-white text-sm truncate max-w-[200px]">{product?.nome || entry.produto_nome}</span>
                        <div className="flex gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            <span>{product?.marca || '-'}</span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Tamanho */}
                    <td className="px-6 py-4 text-center">
                       {product ? <Badge variant="outline">{product.tamanho}</Badge> : '-'}
                    </td>

                    {/* 5. Cor */}
                    <td className="px-6 py-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                       {product?.cor || '-'}
                    </td>

                    {/* 6. Qtd Lançada */}
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        isPositive 
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
                          : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                      }`}>
                        {isPositive ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                        {isPositive ? '+' : ''}{entry.quantidade}
                      </div>
                    </td>

                    {/* 7. Saldo Atual */}
                    <td className="px-6 py-4 text-center text-zinc-700 dark:text-zinc-300 font-mono">
                       <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                         <Package size={12} className="text-zinc-400" />
                         {product ? product.quantidade_estoque : '-'}
                       </div>
                    </td>

                    {/* 8. Responsável / Motivo */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-1.5">
                            {/* Usa ícone de provador se for provador, mesmo que seja retorno (entrada), se o estilo for roxo */}
                            {isProvador && !isReturn && <Shirt size={14} className="text-purple-600 dark:text-purple-400" />}
                            {isReturn && <Undo2 size={14} className="text-green-600 dark:text-green-400" />}
                            
                            <span className={`text-sm font-medium whitespace-nowrap ${
                                isReturn ? 'text-green-700 dark:text-green-300' :
                                isProvador ? 'text-purple-700 dark:text-purple-300' : 
                                'text-zinc-900 dark:text-white'
                            }`}>
                                {top}
                            </span>
                         </div>
                         <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                            {isProvador && bottom.includes('Cliente') && <User size={10} />}
                            
                            {/* Link direto para histórico do cliente se for provador e tiver ID */}
                            {isProvador && entry.cliente_id && bottom.includes('Cliente') ? (
                                <span 
                                    onClick={(e) => {
                                        e.stopPropagation(); // Impede clique na linha (que abre modal de ajuste)
                                        navigate(`/clients/${entry.cliente_id}/history`);
                                    }}
                                    className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                                    title="Ver histórico do cliente"
                                >
                                    {bottom}
                                </span>
                            ) : (
                                bottom
                            )}
                         </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentEntries.length === 0 && (
                 <tr>
                   <td colSpan={8} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                     Nenhum registro encontrado com os filtros atuais.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalItems > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </Card>

      <StockAdjustmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { onUpdate(); }} 
        products={products}
        initialProduct={productToAdjust} 
      />
    </div>
  );
};