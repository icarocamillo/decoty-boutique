
import React, { useState, useMemo } from 'react';
import { Supplier } from '../types';
import { Truck, Phone, Mail, MapPin, Search, Pencil, Building, Tag } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Fornecedores</h2>
           <p className="text-zinc-500 dark:text-zinc-400">Gerencie seus parceiros comerciais e marcas</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
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

        <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Empresa</th>
                  <th className="px-6 py-4 font-medium">Marca (Fantasia)</th>
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
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
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
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
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
