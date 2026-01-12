
import React, { useState, useMemo } from 'react';
import { Supplier } from '../types';
import { Truck, Phone, Mail, MapPin, Search, Pencil, Building, Tag, User, ChevronRight, ShoppingBag } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SupplierFormModal } from './SupplierFormModal';

interface SupplierListProps {
  suppliers: Supplier[];
  onUpdate: () => void;
}

export const SupplierList: React.FC<SupplierListProps> = ({ suppliers, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const searchLower = searchTerm.toLowerCase();
      return (
        supplier.nome_empresa.toLowerCase().includes(searchLower) ||
        (supplier.fantasy_name && supplier.fantasy_name.toLowerCase().includes(searchLower)) ||
        (supplier.nome_contato && supplier.nome_contato.toLowerCase().includes(searchLower)) ||
        (supplier.cnpj_cpf && supplier.cnpj_cpf.includes(searchLower))
      );
    });
  }, [suppliers, searchTerm]);

  const handleEdit = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSupplierToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Fornecedores</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Gerencie seus parceiros comerciais e marcas</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2 w-full sm:w-auto">
          <Truck size={18} /> Novo Fornecedor
        </Button>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
           <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Empresa, Marca, Contato ou CNPJ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all"
              />
            </div>
        </div>

        {/* MOBILE VIEW: Card List */}
        <div className="flex flex-col gap-3 sm:hidden p-4 bg-zinc-50 dark:bg-zinc-950/50">
          {filteredSuppliers.map((supplier) => (
            <div 
              key={supplier.id}
              className="text-left p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm active:scale-[0.98] transition-all flex flex-col gap-3 relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                   <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                      <Building size={20} />
                   </div>
                   <div className="min-w-0">
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base truncate leading-tight">
                        {supplier.nome_empresa}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {supplier.cnpj_cpf && <span className="text-[10px] text-zinc-400 font-mono">{supplier.cnpj_cpf}</span>}
                        {supplier.tipo_fornecedor && (
                            <Badge variant="secondary" className="text-[8px] h-3 px-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-0">{supplier.tipo_fornecedor}</Badge>
                        )}
                      </div>
                   </div>
                </div>
                {supplier.fantasy_name && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0 bg-zinc-50 dark:bg-zinc-800 flex items-center gap-1">
                    <Tag size={10} /> {supplier.fantasy_name}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 border-y border-zinc-50 dark:border-zinc-800/50 py-2">
                 {supplier.nome_contato && (
                   <div className="flex items-center gap-2">
                      <User size={12} className="text-zinc-400" />
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{supplier.nome_contato}</span>
                   </div>
                 )}
                 <div className="flex items-center gap-2">
                    <Phone size={12} className="text-zinc-400" />
                    <span>{supplier.telefone || 'Sem telefone'}</span>
                 </div>
                 {supplier.email && (
                   <div className="flex items-center gap-2">
                      <Mail size={12} className="text-zinc-400" />
                      <span className="truncate">{supplier.email}</span>
                   </div>
                 )}
              </div>

              <div className="flex justify-between items-end mt-1">
                 <div className="flex flex-col gap-1 min-w-0 flex-1 pr-4">
                    <div className="flex items-start gap-1.5">
                       <MapPin size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                       <span className="text-[10px] text-zinc-400 line-clamp-1">{supplier.endereco || 'Endereço não informado'}</span>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 shrink-0">
                   <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 w-10 p-0 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      onClick={() => handleEdit(supplier)}
                      title="Editar Fornecedor"
                    >
                      <Pencil size={18} />
                    </Button>
                    <ChevronRight size={20} className="text-zinc-300 ml-1" />
                 </div>
              </div>
            </div>
          ))}
          {filteredSuppliers.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
               Nenhum fornecedor encontrado.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Standard Table */}
        <div className="hidden sm:block overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Empresa</th>
                  <th className="px-6 py-4 font-medium">Marca (Fantasia)</th>
                  <th className="px-6 py-4 font-medium">Tipo de Fornecedor</th>
                  <th className="px-6 py-4 font-medium">Contato Principal</th>
                  <th className="px-6 py-4 font-medium">Informações de Contato</th>
                  <th className="px-6 py-4 font-medium text-center">Editar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredSuppliers.map((supplier) => {
                  return (
                    <tr 
                      key={supplier.id} 
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                            <Building size={20} />
                          </div>
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-white block">{supplier.nome_empresa}</span>
                            {supplier.cnpj_cpf && (
                              <span className="text-xs text-zinc-500 font-mono">{supplier.cnpj_cpf}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {supplier.fantasy_name ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                               <Tag size={10} /> {supplier.fantasy_name}
                            </Badge>
                         ) : (
                            <span className="text-zinc-400">-</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                        {supplier.tipo_fornecedor ? (
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                <ShoppingBag size={14} className="text-zinc-400" />
                                <span className="text-sm font-medium">{supplier.tipo_fornecedor}</span>
                            </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                         {supplier.nome_contato ? (
                            <span className="font-medium">{supplier.nome_contato}</span>
                         ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                        <div className="flex flex-col gap-1">
                          {supplier.email && (
                              <div className="flex items-center gap-2 text-xs">
                                <Mail size={12} className="text-zinc-400" /> {supplier.email}
                              </div>
                          )}
                          {supplier.telefone && (
                            <div className="flex items-center gap-2 text-xs">
                              <Phone size={12} className="text-zinc-400" /> {supplier.telefone}
                            </div>
                          )}
                          {supplier.endereco && (
                            <div className="flex items-center gap-2 text-xs truncate max-w-[200px]" title={supplier.endereco}>
                              <MapPin size={12} className="text-zinc-400" /> {supplier.endereco}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-10 w-10 p-0 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                            onClick={() => handleEdit(supplier)}
                            title="Editar Fornecedor"
                          >
                            <Pencil size={18} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                      Nenhum fornecedor encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </Card>

      <SupplierFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={onUpdate}
        supplierToEdit={supplierToEdit}
      />
    </div>
  );
};
