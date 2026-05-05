
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
    descricao: '',
    slug: ''
  });

  const [variants, setVariants] = useState<any[]>([
    { cor: '', tamanho: '', preco_custo: '', preco_venda: '', quantidade_estoque: '0', sku: '', ean: '' }
  ]);

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

  const availableSizesForMaterial = (tipoMaterial: string) => {
    if (tipoMaterial === 'Bijuteria') return ['00'];
    if (tipoMaterial === 'Malha') return SIZES_LETTERS;
    if (tipoMaterial === 'Tecido Plano') return SIZES_NUMBERS;
    return [...SIZES_LETTERS, ...SIZES_NUMBERS];
  };

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      
      if (productToEdit) {
        setFormData({
          nome: productToEdit.nome,
          marca: productToEdit.marca,
          categoria: productToEdit.categoria,
          tipo_material: productToEdit.tipo_material,
          descricao: productToEdit.descricao || '',
          slug: productToEdit.slug || ''
        });
        
        if (productToEdit.variants && productToEdit.variants.length > 0) {
          setVariants(productToEdit.variants.map(v => ({
            id: v.id,
            cor: v.cor,
            tamanho: v.tamanho,
            preco_custo: v.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            preco_venda: v.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            quantidade_estoque: v.quantidade_estoque.toString(),
            sku: v.sku,
            ean: v.ean
          })));
        } else {
           setVariants([{ cor: '', tamanho: '', preco_custo: '', preco_venda: '', quantidade_estoque: '0', sku: '', ean: '' }]);
        }
      } else {
        setFormData({
          nome: '', marca: '', categoria: '', tipo_material: '', descricao: '', slug: ''
        });
        setVariants([{ cor: '', tamanho: '', preco_custo: '', preco_venda: '', quantidade_estoque: '0', sku: '', ean: '' }]);
      }
    }
  }, [isOpen, productToEdit]);

  const handleParentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated = [...variants];
    updated[index][name] = value;
    setVariants(updated);
  };

  const handleVariantCurrencyChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/\D/g, "");
    const numberValue = Number(cleanValue) / 100;
    const formatted = numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const updated = [...variants];
    updated[index][name] = formatted;
    setVariants(updated);
  };

  const addVariant = () => {
    setVariants([...variants, { cor: '', tamanho: '', preco_custo: variants[0]?.preco_custo || '', preco_venda: variants[0]?.preco_venda || '', quantidade_estoque: '0', sku: '', ean: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length === 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    if (!formData.nome.trim()) newErrors.nome = true;
    if (!formData.marca) newErrors.marca = true;
    if (!formData.categoria) newErrors.categoria = true;
    if (!formData.tipo_material) newErrors.tipo_material = true;
    
    // Validar variantes
    const variantErrors = variants.some(v => !v.tamanho || !v.preco_custo || !v.preco_venda);
    if (variantErrors) newErrors.variants = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const parseCurrency = (val: string) => parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    
    const parentPayload = {
      ...formData,
      slug: formData.slug || formData.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    };

    const variantsPayload = variants.map(v => ({
      ...v,
      preco_custo: parseCurrency(v.preco_custo),
      preco_venda: parseCurrency(v.preco_venda),
      quantidade_estoque: parseInt(v.quantidade_estoque) || 0
    }));

    try {
      const success = productToEdit 
        ? await backendService.updateProduct({ ...parentPayload, id: productToEdit.id } as any, variantsPayload as any, user?.id || '')
        : await backendService.createProduct(parentPayload as any, variantsPayload as any, user?.id || '');
      
      if (success) { onSuccess(); onClose(); }
      else { alert(`Erro ao processar produto.`); }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-6xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-700 dark:text-zinc-300"><Package size={20} /></div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-white">{productToEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white dark:bg-zinc-900 space-y-8">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            {/* DADOS DO PRODUTO PAI */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><Tag size={14} /> Informações Básicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-6 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Produto *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleParentChange} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.nome ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`} />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Marca *</label>
                   <select name="marca" value={formData.marca} onChange={handleParentChange} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.marca ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {brands.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria *</label>
                  <select name="categoria" value={formData.categoria} onChange={handleParentChange} disabled={!formData.marca} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-50 ${errors.categoria ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Material *</label>
                   <select name="tipo_material" value={formData.tipo_material} onChange={handleParentChange} disabled={isMaterialLocked || !formData.marca} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-60 ${errors.tipo_material ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {availableMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-9 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Descrição</label>
                  <input type="text" name="descricao" value={formData.descricao} onChange={handleParentChange} placeholder="Breve resumo do produto" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none" />
                </div>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800" />

            {/* VARIANTES */}
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><Layers size={14} /> Variantes (Tamanhos/Cores)</h3>
                  <Button type="button" size="sm" variant="outline" onClick={addVariant} className="h-8 py-0 flex items-center gap-1 text-[10px]"><Plus size={14} /> Add Variante</Button>
               </div>

               {errors.variants && <p className="text-xs text-red-500 font-medium">Preencha corretamente tamanho e preços de todas as variantes.</p>}

               <div className="space-y-3">
                  {variants.map((v, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-zinc-100 dark:border-zinc-800 relative group animate-fade-in-up">
                        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 flex-1">
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">Tamanho *</label>
                              <select name="tamanho" value={v.tamanho} onChange={(e) => handleVariantChange(index, e)} className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none">
                                 <option value="">Tam.</option>
                                 {availableSizesForMaterial(formData.tipo_material).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">Cor</label>
                              <input type="text" name="cor" value={v.cor} placeholder="Cor" onChange={(e) => handleVariantChange(index, e)} className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">Custo R$ *</label>
                              <input type="text" inputMode="numeric" name="preco_custo" value={v.preco_custo} placeholder="0,00" onChange={(e) => handleVariantCurrencyChange(index, e)} className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">Venda R$ *</label>
                              <input type="text" inputMode="numeric" name="preco_venda" value={v.preco_venda} placeholder="0,00" onChange={(e) => handleVariantCurrencyChange(index, e)} className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none font-bold" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">Estoque</label>
                              <input type="number" name="quantidade_estoque" value={v.quantidade_estoque} placeholder="0" onChange={(e) => handleVariantChange(index, e)} className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1 lg:col-span-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase">SKU / Ref</label>
                              <input type="text" name="sku" value={v.sku} placeholder="Ref. Interna" onChange={(e) => handleVariantChange(index, e)} className="w-full px-2 py-1.5 text-sm border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none" />
                           </div>
                        </div>
                        {variants.length > 1 && (
                          <button type="button" onClick={() => removeVariant(index)} className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-1 rounded-full shadow-sm text-zinc-400 hover:text-red-500 transition-colors z-10"><Minus size={14} /></button>
                        )}
                    </div>
                  ))}
               </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="product-form" disabled={loading} className="px-8 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Salvar Produto</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
