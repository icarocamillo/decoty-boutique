
import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Check, Loader2, Tag, Layers, Droplet, Barcode, Hash, Info, DollarSign, ArrowRight, Plus, Minus, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { mockService } from '../services/mockService';
import { ProductSize, Product } from '../types';
import { SIZES_LIST } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { formatProductId } from '../utils';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
}

// Categorias segregadas - "Camisetas" renomeada para "Blusas"
const CLOTHING_CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas'];
const JEWELRY_CATEGORIES = ['Pulseira', 'Brinco', 'Colar'];

const MATERIALS_CLOTHING = ['Malha', 'Tecido Plano'];
const MATERIALS_JEWELRY = ['Bijuteria'];

// Listas de tamanhos segregadas
const SIZES_LETTERS: ProductSize[] = ['P', 'M', 'G', 'GG', 'G1'];
const SIZES_NUMBERS: ProductSize[] = ['40', '42', '44', '46', '48'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSuccess, productToEdit }) => {
  const { user } = useAuth(); // Usamos o ID do UUID
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  
  // Validation Errors State
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    categoria: '',
    tipo_material: '',
    cor: '',
    tamanho: '' as ProductSize | '',
    preco_custo: '',
    preco_venda: '',
    quantidade_estoque: '',
    sku: '',
    ean: ''
  });

  // New State for Stock Adjustment (Only used in Edit Mode)
  const [stockAdjustment, setStockAdjustment] = useState('');

  // Carrega marcas dos fornecedores quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const fetchBrands = async () => {
        try {
          const suppliers = await mockService.getSuppliers();
          const supplierBrands = suppliers
            .map(s => s.fantasy_name)
            .filter((name): name is string => !!name && name.trim() !== '');
          const uniqueBrands = Array.from(new Set(supplierBrands)).sort();
          setBrands(uniqueBrands);
        } catch (error) {
          console.error("Erro ao carregar marcas dos fornecedores", error);
        }
      };
      fetchBrands();
    }
  }, [isOpen]);

  const { availableCategories, availableMaterials, isMaterialLocked } = useMemo(() => {
    if (formData.marca === 'Vicky Bijou') {
      return {
        availableCategories: JEWELRY_CATEGORIES,
        availableMaterials: MATERIALS_JEWELRY,
        isMaterialLocked: true
      };
    }
    return {
      availableCategories: CLOTHING_CATEGORIES,
      availableMaterials: MATERIALS_CLOTHING,
      isMaterialLocked: false
    };
  }, [formData.marca]);

  const availableSizes = useMemo(() => {
    if (formData.marca === 'Vicky Bijou') return ['00'];
    if (formData.tipo_material === 'Malha') return SIZES_LETTERS;
    if (formData.tipo_material === 'Tecido Plano') return SIZES_NUMBERS;
    return [...SIZES_LETTERS, ...SIZES_NUMBERS];
  }, [formData.marca, formData.tipo_material]);

  // Reset or Populate form on Open
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setStockAdjustment('');
      
      if (productToEdit) {
        setFormData({
          nome: productToEdit.nome,
          marca: productToEdit.marca,
          categoria: productToEdit.categoria === 'Camisetas' ? 'Blusas' : productToEdit.categoria,
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
          nome: '', marca: '', categoria: '', tipo_material: '', cor: '', tamanho: '', preco_custo: '', preco_venda: '', quantidade_estoque: '', sku: '', ean: ''
        });
      }
    }
  }, [isOpen, productToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));

    if (name === 'marca') {
      if (value === 'Vicky Bijou') {
        setFormData(prev => ({ ...prev, marca: value, tipo_material: 'Bijuteria', categoria: '', tamanho: '00' }));
        setErrors(prev => ({ ...prev, tamanho: false, tipo_material: false }));
      } else {
        setFormData(prev => ({
          ...prev, marca: value,
          tipo_material: prev.tipo_material === 'Bijuteria' ? '' : prev.tipo_material,
          categoria: JEWELRY_CATEGORIES.includes(prev.categoria) ? '' : prev.categoria,
          tamanho: prev.tamanho === '00' ? '' : prev.tamanho
        }));
      }
    } else if (name === 'tipo_material') {
      setFormData(prev => ({ ...prev, [name]: value, tamanho: '' }));
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: false }));
  };

  const calculateFinalStock = () => {
    const current = parseInt(formData.quantidade_estoque) || 0;
    const adjustment = parseInt(stockAdjustment) || 0;
    return current + adjustment;
  };

  const isReducingStock = parseInt(stockAdjustment) < 0;

  const parseCurrency = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
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

    if (productToEdit && parseInt(stockAdjustment) < 0) return false;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const finalStock = productToEdit ? calculateFinalStock() : (parseInt(formData.quantidade_estoque) || 0);

    const payload = {
      nome: formData.nome,
      marca: formData.marca,
      categoria: formData.categoria,
      tipo_material: formData.tipo_material,
      cor: formData.cor,
      tamanho: formData.tamanho as ProductSize,
      preco_custo: parseCurrency(formData.preco_custo),
      preco_venda: parseCurrency(formData.preco_venda),
      quantidade_estoque: finalStock,
      sku: formData.sku,
      ean: formData.ean
    };

    // MUDANÇA CRÍTICA: Enviamos o ID (UUID)
    const userId = user?.id || '';

    try {
      let success = false;
      if (productToEdit) {
         success = await mockService.updateProduct({ ...payload, id: productToEdit.id, ui_id: productToEdit.ui_id } as any, userId);
      } else {
        success = await mockService.createProduct(payload as any, userId);
      }
      if (success) { onSuccess(); onClose(); }
      else { alert(`Erro ao processar produto.`); }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const visualId = productToEdit ? formatProductId(productToEdit) : 'NOVO';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-5xl overflow-hidden animate-fade-in-up border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-700 dark:text-zinc-200"><Package size={20} /></div>
            <div>
               <h2 className="text-lg font-bold text-zinc-800 dark:text-white">{productToEdit ? 'Editar Produto' : 'Novo Produto'}</h2>
               <p className="text-xs text-zinc-500 dark:text-zinc-400">{productToEdit ? 'Atualize as informações do item' : 'Preencha as informações do item'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 min-h-0 bg-white dark:bg-zinc-900">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2"><Tag size={14} /> Dados do Produto</h3>
                <span className="text-xs font-bold font-mono text-zinc-700 bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded">ID: {visualId}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Produto <span className="text-red-500">*</span></label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Ex: Calça Jeans Slim" className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.nome ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`} />
                </div>
                <div className="md:col-span-4 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Marca <span className="text-red-500">*</span></label>
                   <select name="marca" value={formData.marca} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.marca ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>Selecione...</option>
                    {brands.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria <span className="text-red-500">*</span></label>
                  <select name="categoria" value={formData.categoria} onChange={handleChange} disabled={!formData.marca} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-50 ${errors.categoria ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>{!formData.marca ? 'Selecione a marca...' : 'Selecione...'}</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Material <span className="text-red-500">*</span></label>
                   <select name="tipo_material" value={formData.tipo_material} onChange={handleChange} disabled={isMaterialLocked || !formData.marca} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-50 ${errors.tipo_material ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    <option value="" disabled>{!formData.marca ? 'Selecione a marca...' : 'Selecione...'}</option>
                    {availableMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tamanho <span className="text-red-500">*</span></label>
                   <select name="tamanho" value={formData.tamanho} onChange={handleChange} disabled={formData.marca === 'Vicky Bijou'} className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:cursor-not-allowed ${errors.tamanho ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`}>
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
                      <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="Ex: PROD-001" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><Barcode size={14} className="text-zinc-400" /> EAN (Código de Barras)</label>
                      <input type="number" name="ean" value={formData.ean} onChange={handleChange} placeholder="Ex: 7891234567890" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none" />
                    </div>
                  </div>
                </div>
                <div className="md:col-span-7 space-y-4 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                   <h3 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 mb-2"><Layers size={14} /> Financeiro & Estoque</h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6 space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><DollarSign size={14} className="text-zinc-400" /> Custo (R$) <span className="text-red-500">*</span></label>
                        <input type="text" inputMode="numeric" name="preco_custo" value={formData.preco_custo} onChange={handleCurrencyChange} placeholder="0,00" className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.preco_custo ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`} />
                      </div>
                      <div className="md:col-span-6 space-y-2">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1"><DollarSign size={14} className="text-zinc-400" /> Venda (R$) <span className="text-red-500">*</span></label>
                        <input type="text" inputMode="numeric" name="preco_venda" value={formData.preco_venda} onChange={handleCurrencyChange} placeholder="0,00" className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none ${errors.preco_venda ? 'border-red-500 ring-1' : 'border-zinc-300 dark:border-zinc-700'}`} />
                      </div>
                      {productToEdit ? (
                        <>
                          <div className="md:col-span-4 space-y-2">
                            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Atual</label>
                            <input type="text" disabled value={formData.quantidade_estoque} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 font-mono text-center" />
                          </div>
                          <div className="md:col-span-8 space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 text-green-600 dark:text-green-400">Adicionar Estoque (+)</label>
                            <div className="relative">
                              <button type="button" onClick={() => setStockAdjustment(p => (parseInt(p)||0-1).toString())} className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 rounded"><Minus size={14} /></button>
                              <input type="number" min="0" value={stockAdjustment} onChange={(e) => setStockAdjustment(e.target.value)} placeholder="0" className={`w-full px-10 py-2 border rounded-lg bg-green-50 dark:bg-green-900/20 text-zinc-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none text-center font-bold ${isReducingStock ? 'border-red-500 ring-1 bg-red-50' : 'border-green-200'}`} />
                              <button type="button" onClick={() => setStockAdjustment(p => (parseInt(p)||0+1).toString())} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-green-200 dark:bg-green-800 text-green-800 rounded"><Plus size={14} /></button>
                              {isReducingStock && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-max max-w-[280px] mb-2 z-50 animate-fade-in">
                                  <div className="bg-red-600 text-white text-xs p-3 rounded-lg shadow-xl border border-red-700 flex items-start gap-2 relative">
                                      <AlertCircle size={16} className="shrink-0" />
                                      <span>Para reduzir estoque, use a função <strong>Baixa de Estoque</strong> na tela de Estoque.</span>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-600"></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="md:col-span-12 space-y-2">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Estoque Inicial</label>
                          <input type="number" name="quantidade_estoque" min="0" value={formData.quantidade_estoque} onChange={handleChange} placeholder="0" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none" />
                        </div>
                      )}
                  </div>
                </div>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="product-form" disabled={loading || isReducingStock} className="w-32 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> {productToEdit ? 'Atualizar' : 'Salvar'}</>}
          </Button>
        </div>
      </div>
    </div>
  );
};
