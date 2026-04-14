
import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Check, Loader2, Tag, Layers, Droplet, Barcode, Hash, DollarSign, Plus, Minus, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { backendService } from '../services/backendService';
import { ProductSize, Product, Supplier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatProductId } from '../utils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
}

// Categorias segregadas
const CLOTHING_CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas'];
const ACCESSORY_CATEGORIES = ['Pulseira', 'Brinco', 'Colar'];

const MATERIALS_CLOTHING = ['Malha', 'Tecido Plano'];
const MATERIALS_ACCESSORIES = ['Bijuteria'];

// Listas de tamanhos segregadas
const SIZES_LETTERS: ProductSize[] = ['P', 'M', 'G', 'GG', 'G1'];
const SIZES_NUMBERS: ProductSize[] = ['40', '42', '44', '46', '48'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSuccess, productToEdit }) => {
  const { user } = useAuth();
  const { suppliers } = useData();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    categoria: '',
    tipo_material: '',
    cor: '',
    tamanho: '' as ProductSize | '',
    preco_custo: '',
    preco_venda: '',
    quantidade_estoque: '0',
    sku: '',
    ean: ''
  });

  const [stockAdjustment, setStockAdjustment] = useState('0');

  const brands = useMemo(() => {
      const names = suppliers
        .map(s => s.fantasy_name)
        .filter((name): name is string => !!name && name.trim() !== '');
      return Array.from(new Set(names)).sort();
  }, [suppliers]);

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.fantasy_name === formData.marca);
  }, [formData.marca, suppliers]);

  const { availableCategories, availableMaterials, isMaterialLocked } = useMemo(() => {
    const type = selectedSupplier?.tipo_fornecedor;
    const isAccessoryCategory = ACCESSORY_CATEGORIES.includes(formData.categoria);

    let cats: string[] = [];
    if (type === 'Acessórios') cats = ACCESSORY_CATEGORIES;
    else if (type === 'Roupas') cats = CLOTHING_CATEGORIES;
    else if (type === 'Roupas e Acessórios') cats = [...CLOTHING_CATEGORIES, ...ACCESSORY_CATEGORIES];

    // Se for um fornecedor de acessórios OU a categoria selecionada for acessório
    if (type === 'Acessórios' || isAccessoryCategory) {
      return {
        availableCategories: cats,
        availableMaterials: MATERIALS_ACCESSORIES,
        isMaterialLocked: true
      };
    }
    
    if (type === 'Roupas') {
      return {
        availableCategories: cats,
        availableMaterials: MATERIALS_CLOTHING,
        isMaterialLocked: false
      };
    }

    if (type === 'Roupas e Acessórios') {
      return {
        availableCategories: cats,
        availableMaterials: [...MATERIALS_CLOTHING, ...MATERIALS_ACCESSORIES],
        isMaterialLocked: false
      };
    }

    return { availableCategories: cats, availableMaterials: [], isMaterialLocked: false };
  }, [selectedSupplier, formData.categoria]);

  const availableSizes = useMemo(() => {
    if (formData.tipo_material === 'Bijuteria') return ['00'];
    if (formData.tipo_material === 'Malha') return SIZES_LETTERS;
    if (formData.tipo_material === 'Tecido Plano') return SIZES_NUMBERS;
    return [...SIZES_LETTERS, ...SIZES_NUMBERS];
  }, [formData.tipo_material]);

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setStockAdjustment('0');
      
      if (productToEdit) {
        setFormData({
          nome: productToEdit.nome,
          marca: productToEdit.marca,
          categoria: productToEdit.categoria,
          tipo_material: productToEdit.tipo_material,
          cor: productToEdit.cor,
          tamanho: productToEdit.tamanho,
          preco_custo: productToEdit.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          preco_venda: productToEdit.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          quantidade_estoque: productToEdit.quantidade_estoque.toString(),
          sku: productToEdit.sku,
          ean: productToEdit.ean
        });
      } else {
        setFormData({
          nome: '', marca: '', categoria: '', tipo_material: '', cor: '', tamanho: '', preco_custo: '', preco_venda: '', quantidade_estoque: '0', sku: '', ean: ''
        });
      }
    }
  }, [isOpen, productToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));

    if (name === 'marca') {
      const supplier = suppliers.find(s => s.fantasy_name === value);
      if (supplier?.tipo_fornecedor === 'Acessórios') {
        setFormData(prev => ({ ...prev, marca: value, tipo_material: 'Bijuteria', categoria: '', tamanho: '00' }));
      } else {
        setFormData(prev => ({ ...prev, marca: value, tipo_material: '', categoria: '', tamanho: '' }));
      }
    } else if (name === 'categoria') {
      const isAccessory = ACCESSORY_CATEGORIES.includes(value);
      if (isAccessory) {
        setFormData(prev => ({ ...prev, categoria: value, tipo_material: 'Bijuteria', tamanho: '00' }));
      } else {
        const wasAccessory = ACCESSORY_CATEGORIES.includes(formData.categoria);
        setFormData(prev => ({ 
          ...prev, 
          categoria: value,
          tipo_material: wasAccessory ? '' : prev.tipo_material,
          tamanho: wasAccessory ? '' : prev.tamanho
        }));
      }
    } else if (name === 'tipo_material') {
      setFormData(prev => ({ ...prev, [name]: value, tamanho: value === 'Bijuteria' ? '00' : '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData(prev => ({ ...prev, [name]: formatted }));
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!formData.nome.trim()) newErrors.nome = true;
    if (!formData.marca) newErrors.marca = true;
    if (!formData.categoria) newErrors.categoria = true;
    if (!formData.tipo_material) newErrors.tipo_material = true;
    if (!formData.tamanho) newErrors.tamanho = true;
    if (!formData.preco_custo) newErrors.preco_custo = true;
    if (!formData.preco_venda) newErrors.preco_venda = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const parseCurrency = (val: string) => parseFloat(val.replace(/\./g, '').replace(',', '.'));
    
    // Garantir inteiros positivos
    const rawStockQty = parseInt(formData.quantidade_estoque) || 0;
    const rawAdjustment = parseInt(stockAdjustment) || 0;
    const finalStock = productToEdit 
        ? Math.max(0, rawStockQty + rawAdjustment) // Considera ajuste positivo/negativo mas o total de estoque não pode ser < 0
        : Math.max(0, rawStockQty);

    const payload = {
      ...formData,
      tamanho: formData.tamanho as ProductSize,
      preco_custo: parseCurrency(formData.preco_custo),
      preco_venda: parseCurrency(formData.preco_venda),
      quantidade_estoque: finalStock,
    };

    try {
      const success = productToEdit 
        ? await backendService.updateProduct({ ...payload, id: productToEdit.id, ui_id: productToEdit.ui_id } as any, user?.id || '')
        : await backendService.createProduct(payload as any, user?.id || '');
      
      if (success) { onSuccess(); onClose(); }
      else { alert(`Erro ao processar produto.`); }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentAdjustmentValue = parseInt(productToEdit ? stockAdjustment : formData.quantidade_estoque) || 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-5xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-700 dark:text-zinc-300"><Package size={20} /></div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white">{productToEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-zinc-900">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><Tag size={14} /> Dados Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Produto *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.nome ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`} />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Marca *</label>
                   <select name="marca" value={formData.marca} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.marca ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {brands.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria *</label>
                  <select name="categoria" value={formData.categoria} onChange={handleChange} disabled={!formData.marca} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-50 ${errors.categoria ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Material *</label>
                   <select name="tipo_material" value={formData.tipo_material} onChange={handleChange} disabled={isMaterialLocked || !formData.marca} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-60 disabled:bg-zinc-50 dark:disabled:bg-zinc-800/50 ${errors.tipo_material ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {availableMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tamanho *</label>
                   <select name="tamanho" value={formData.tamanho} onChange={handleChange} disabled={formData.tipo_material === 'Bijuteria'} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-60 ${errors.tamanho ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione</option>
                    {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                   <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Droplet size={14} className="text-zinc-400" /> Cor</label>
                   <input type="text" name="cor" value={formData.cor} onChange={handleChange} placeholder="Ex: Azul" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none" />
                </div>
              </div>
            </div>
            <hr className="border-zinc-100 dark:border-zinc-800" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-5 space-y-4">
                   <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 mb-2"><Barcode size={14} /> Códigos</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Hash size={14} className="text-zinc-400" /> SKU</label>
                      <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="Referência interna" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Barcode size={14} className="text-zinc-400" /> EAN / Código de Barras</label>
                      <input type="text" name="ean" value={formData.ean} onChange={handleChange} placeholder="GTIN/EAN-13" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-500" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-7 space-y-4 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                   <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 mb-2"><Layers size={14} /> Preços & Estoque</h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6 space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><DollarSign size={14} className="text-zinc-400" /> Custo (R$) *</label>
                        <input type="text" inputMode="numeric" name="preco_custo" value={formData.preco_custo} onChange={handleCurrencyChange} placeholder="0,00" className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none ${errors.preco_custo ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`} />
                      </div>
                      <div className="md:col-span-6 space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><DollarSign size={14} className="text-zinc-400" /> Venda (R$) *</label>
                        <input type="text" inputMode="numeric" name="preco_venda" value={formData.preco_venda} onChange={handleCurrencyChange} placeholder="0,00" className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none ${errors.preco_venda ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`} />
                      </div>
                      <div className="md:col-span-12 space-y-2">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{productToEdit ? 'Adicionar ao Estoque' : 'Estoque Inicial'}</label>
                          <div className="relative flex items-center group">
                            {currentAdjustmentValue > 0 && (
                              <button 
                                type="button" 
                                onClick={() => {
                                  if (productToEdit) {
                                      setStockAdjustment(s => (Math.max(0, parseInt(s || '0')) - 1).toString());
                                  } else {
                                      setFormData(p => ({ ...p, quantidade_estoque: (Math.max(0, parseInt(p.quantidade_estoque || '0')) - 1).toString() }));
                                  }
                                }} 
                                className="absolute left-1.5 h-8 w-8 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors z-10"
                              >
                                <Minus size={14} />
                              </button>
                            )}

                            <input 
                              type="number" 
                              step="1"
                              min="0"
                              value={productToEdit ? stockAdjustment : formData.quantidade_estoque} 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                productToEdit ? setStockAdjustment(val) : setFormData(prev => ({ ...prev, quantidade_estoque: val }));
                              }} 
                              className="w-full h-10 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            
                            <button 
                              type="button" 
                              onClick={() => {
                                if (productToEdit) {
                                    setStockAdjustment(s => (Math.max(0, parseInt(s || '0')) + 1).toString());
                                } else {
                                    setFormData(p => ({ ...p, quantidade_estoque: (Math.max(0, parseInt(p.quantidade_estoque || '0')) + 1).toString() }));
                                }
                              }} 
                              className="absolute right-1.5 h-8 w-8 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors z-10"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                      </div>
                  </div>
                </div>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="product-form" disabled={loading} className="w-32 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Salvar</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
