
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package, Check, Loader2, Tag, Layers, Plus, Minus, ArrowLeft, Save, AlertCircle, Barcode, Hash, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { backendService } from '@/services/backendService';
import { ProductSize, Product, Supplier } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

// Categorias segregadas
const CLOTHING_CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas'];
const ACCESSORY_CATEGORIES = ['Pulseira', 'Brinco', 'Colar'];

const MATERIALS_CLOTHING = ['Malha', 'Tecido Plano'];
const MATERIALS_ACCESSORIES = ['Bijuteria'];

// Listas de tamanhos segregadas
const SIZES_LETTERS: ProductSize[] = ['P', 'M', 'G', 'GG', 'G1'];
const SIZES_NUMBERS: ProductSize[] = ['40', '42', '44', '46', '48'];

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, suppliers, refreshData } = useData();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    nome: '',
    marca: '',
    categoria: '',
    tipo_material: '',
    descricao: '',
    slug: '',
    show_on_site: false
  });

  const [variants, setVariants] = useState<any[]>([
    { cor: '', tamanho: '', preco_custo: '', preco_venda: '', quantidade_estoque: '0', sku: '', ean: '', original_estoque: 0 }
  ]);

  const productToEdit = useMemo(() => {
    if (!id) return null;
    const numericId = parseInt(id);
    if (!isNaN(numericId)) {
      const found = products.find(p => p.ui_id === numericId);
      if (found) return found;
    }
    return products.find(p => p.id === id);
  }, [id, products]);

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

  const maxSubId = useMemo(() => {
    if (!productToEdit || !productToEdit.variants) return 0;
    const ids = productToEdit.variants.map(v => v.ui_id % 1000);
    return ids.length > 0 ? Math.max(...ids) : 0;
  }, [productToEdit]);
  const availableSizesForMaterial = (tipoMaterial: string) => {
    if (tipoMaterial === 'Bijuteria') return ['00'];
    if (tipoMaterial === 'Malha') return SIZES_LETTERS;
    if (tipoMaterial === 'Tecido Plano') return SIZES_NUMBERS;
    return [...SIZES_LETTERS, ...SIZES_NUMBERS];
  };

  useEffect(() => {
    if (id && productToEdit && id !== productToEdit.ui_id.toString()) {
      navigate(`/erp/products/update/${productToEdit.ui_id}`, { replace: true });
    }
  }, [id, productToEdit, navigate]);

  useEffect(() => {
    if (id && productToEdit) {
      setFormData({
        nome: productToEdit.nome,
        marca: productToEdit.marca,
        categoria: productToEdit.categoria,
        tipo_material: productToEdit.tipo_material,
        descricao: productToEdit.descricao || '',
        slug: productToEdit.slug || '',
        show_on_site: (productToEdit as any).show_on_site || false
      });

      if (productToEdit.variants && productToEdit.variants.length > 0) {
        setVariants(productToEdit.variants.map(v => ({
          id: v.id,
          ui_id: v.ui_id,
          cor: v.cor,
          tamanho: v.tamanho,
          preco_custo: v.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          preco_venda: v.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          quantidade_estoque: v.quantidade_estoque.toString(),
          original_estoque: v.quantidade_estoque, // Guardar original para trava
          sku: v.sku || '',
          ean: v.ean || ''
        })));
      }
      setFetching(false);
    } else if (!id) {
      setFetching(false);
    }
  }, [id, productToEdit]);

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

  const handleStockAction = (index: number, action: number) => {
    const updated = [...variants];
    const current = parseInt(updated[index].quantidade_estoque) || 0;
    const original = updated[index].original_estoque || 0;

    const newValue = Math.max(original, current + action);
    updated[index].quantidade_estoque = newValue.toString();
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
    setVariants([...variants, {
      cor: '',
      tamanho: '',
      preco_custo: variants[0]?.preco_custo || '',
      preco_venda: variants[0]?.preco_venda || '',
      quantidade_estoque: '0',
      original_estoque: 0,
      sku: '',
      ean: ''
    }]);
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

    // Validar descrição se for mostrar no site
    if (formData.show_on_site && !formData.descricao.trim()) {
      newErrors.descricao = true;
    }
    const variantErrors = variants.some(v => !v.tamanho || !v.preco_custo || !v.preco_venda);
    if (variantErrors) newErrors.variants = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    const parseCurrency = (val: string) => {
      if (typeof val === 'number') return val;
      return parseFloat(String(val).replace(/\./g, '').replace(',', '.'));
    };

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
      const success = id && productToEdit
        ? await backendService.updateProduct({ ...parentPayload, id: productToEdit.id } as any, variantsPayload as any, user?.id || '')
        : await backendService.createProduct(parentPayload as any, variantsPayload as any, user?.id || '');

      if (success) {
        await refreshData();
        navigate('/erp/products');
      } else {
        alert(`Erro ao processar produto.`);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400">
        <Loader2 className="animate-spin mr-2" /> Carregando produto...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/erp/products')} className="p-2">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              {id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              {id ? `Editando: ${formData.nome}` : 'Preencha os dados abaixo para adicionar um produto ao catálogo'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/erp/products')} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="px-6 flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {id ? 'Atualizar' : 'Salvar'} Produto</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Superior: Informações Básicas (Full Width) */}
        <div className="w-full">
          <Card className="p-6 border-0 shadow-sm bg-white dark:bg-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-6">
              <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                <Tag size={16} className="text-zinc-400" /> Dados Gerais do Produto
                {id && productToEdit && (
                  <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5 ml-2 normal-case bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-none">
                    ID: DECOTY-{productToEdit.ui_id}
                  </Badge>
                )}
              </h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                <div className="space-y-2 lg:col-span-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Nome do Produto *</label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleParentChange}
                    placeholder="Ex: Vestido Floral Midi"
                    className={`w-full px-4 py-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all ${errors.nome ? 'border-red-500 bg-red-50/10' : 'border-zinc-200 dark:border-zinc-700'}`}
                  />
                  {errors.nome && <p className="text-[10px] text-red-500 font-bold ml-1">Campo obrigatório</p>}
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Marca / Fornecedor *</label>
                  <select
                    name="marca"
                    value={formData.marca}
                    onChange={handleParentChange}
                    className={`w-full px-4 py-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all appearance-none ${errors.marca ? 'border-red-500 bg-red-50/10' : 'border-zinc-200 dark:border-zinc-700'}`}
                  >
                    <option value="" disabled>Selecione a marca</option>
                    {brands.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.marca && <p className="text-[10px] text-red-500 font-bold ml-1">Campo obrigatório</p>}
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Categoria *</label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleParentChange}
                    disabled={!formData.marca}
                    className={`w-full px-4 py-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-50 transition-all appearance-none ${errors.categoria ? 'border-red-500 bg-red-50/10' : 'border-zinc-200 dark:border-zinc-700'}`}
                  >
                    <option value="" disabled>Selecione a categoria</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Material *</label>
                  <select
                    name="tipo_material"
                    value={formData.tipo_material}
                    onChange={handleParentChange}
                    disabled={isMaterialLocked || !formData.marca}
                    className={`w-full px-4 py-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none disabled:opacity-60 transition-all appearance-none ${errors.tipo_material ? 'border-red-500 bg-red-50/10' : 'border-zinc-200 dark:border-zinc-700'}`}
                  >
                    <option value="" disabled>Selecione o material</option>
                    {availableMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase text-center block">Mostrar no site</label>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, show_on_site: true }))}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${formData.show_on_site ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                    >
                      SIM
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, show_on_site: false }))}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!formData.show_on_site ? 'bg-red-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                    >
                      NÃO
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Descrição Site</label>
                  {formData.show_on_site && <span className="text-[10px] text-red-500 font-bold">* Obrigatório para exibir no site</span>}
                </div>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleParentChange}
                  rows={5}
                  placeholder="Detalhes adicionais, tecido, modelagem..."
                  className={`w-full px-4 py-2.5 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-500 outline-none transition-all resize-y min-h-[120px] ${errors.descricao ? 'border-red-500 bg-red-50/10' : 'border-zinc-200 dark:border-zinc-700'}`}
                />
                {errors.descricao && <p className="text-[10px] text-red-500 font-bold ml-1">Descrição é necessária para mostrar no site</p>}
              </div>
            </div>
          </Card>
        </div>

        {/* Inferior: Variantes (Full Width) */}
        <div className="w-full space-y-6">
          <Card className="p-6 border-0 shadow-sm bg-white dark:bg-zinc-900 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                <Layers size={16} className="text-zinc-400" /> Variações do Produto (Cores e Tamanho)
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addVariant} className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 h-9">
                <Plus size={16} /> Adicionar Variação
              </Button>
            </div>

            {errors.variants && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold">
                <AlertCircle size={16} /> Preencha tamanho e preços de todas as variantes.
              </div>
            )}

            {/* Header de Variantes - Estilo Slim Desktop */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 mb-2">
              <div className="col-span-1 text-center"><label className="text-[10px] font-bold text-zinc-400 uppercase">ID Var.</label></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-zinc-400 uppercase">Tam *</label></div>
              <div className="col-span-2"><label className="text-[10px] font-bold text-zinc-400 uppercase">Cor</label></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-zinc-400 uppercase">Custo</label></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-zinc-400 uppercase">Venda</label></div>
              <div className="col-span-2 text-center"><label className="text-[10px] font-bold text-zinc-400 uppercase">Estoque</label></div>
              <div className="col-span-2"><label className="text-[10px] font-bold text-zinc-400 uppercase">SKU</label></div>
              <div className="col-span-1"><label className="text-[10px] font-bold text-zinc-400 uppercase">EAN</label></div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2 flex-1">
              {variants.map((v, index) => (
                <div key={index} className="relative p-3 lg:p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">

                    {/* ID da Variação */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">ID Var.</label>
                      <div className="h-8 px-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-[15px] text-zinc-900 dark:text-white font-bold overflow-hidden">
                        {id && productToEdit ? (
                          v.ui_id || ((productToEdit.ui_id * 1000) + maxSubId + variants.filter((_, i) => i <= index && !_.ui_id).length)
                        ) : '-'}
                      </div>
                    </div>

                    {/* Tamanho */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Tamanho *</label>
                      <select
                        name="tamanho"
                        value={v.tamanho}
                        onChange={(e) => handleVariantChange(index, e)}
                        className="w-full h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none appearance-none"
                      >
                        <option value="">-</option>
                        {availableSizesForMaterial(formData.tipo_material).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Cor */}
                    <div className="lg:col-span-2">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Cor</label>
                      <input
                        type="text"
                        name="cor"
                        value={v.cor}
                        placeholder="Ex: Vermelho"
                        onChange={(e) => handleVariantChange(index, e)}
                        className="w-full h-8 px-3 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none"
                      />
                    </div>

                    {/* Preço Custo */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Custo (R$)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="preco_custo"
                        value={v.preco_custo}
                        placeholder="0,00"
                        onChange={(e) => handleVariantCurrencyChange(index, e)}
                        className="w-full h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none text-right"
                      />
                    </div>

                    {/* Preço Venda */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Venda (R$)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="preco_venda"
                        value={v.preco_venda}
                        placeholder="0,00"
                        onChange={(e) => handleVariantCurrencyChange(index, e)}
                        className="w-full h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-zinc-400 outline-none font-bold text-right"
                      />
                    </div>

                    {/* Estoque */}
                    <div className="lg:col-span-2">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Estoque</label>
                      <div className="flex items-center">
                        {(parseInt(v.quantidade_estoque) || 0) > (v.original_estoque || 0) && (
                          <button
                            type="button"
                            onClick={() => handleStockAction(index, -1)}
                            className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-red-100 hover:bg-red-200 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-l-lg border border-red-200 dark:border-red-900/50 transition-all border-r-0"
                          >
                            <Minus size={14} strokeWidth={3} />
                          </button>
                        )}
                        <input
                          type="text"
                          name="quantidade_estoque"
                          value={v.quantidade_estoque}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            handleVariantChange(index, { target: { name: 'quantidade_estoque', value: val } } as any);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const numVal = parseInt(val) || 0;
                            const original = v.original_estoque || 0;
                            const correctedVal = Math.max(original, numVal);
                            handleVariantChange(index, { target: { name: 'quantidade_estoque', value: correctedVal.toString() } } as any);
                          }}
                          className={`w-full h-8 px-1 text-center text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-0 outline-none font-bold ${(parseInt(v.quantidade_estoque) || 0) <= (v.original_estoque || 0) ? 'rounded-l-lg' : ''} rounded-none`}
                        />
                        <button
                          type="button"
                          onClick={() => handleStockAction(index, 1)}
                          className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-r-lg border border-emerald-200 dark:border-emerald-900/50 transition-all border-l-0"
                        >
                          <Plus size={14} strokeWidth={3} />
                        </button>
                      </div>
                    </div>

                    {/* SKU */}
                    <div className="lg:col-span-2">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">SKU</label>
                      <input
                        type="text"
                        name="sku"
                        value={v.sku}
                        placeholder="Referência"
                        onChange={(e) => handleVariantChange(index, e)}
                        className="w-full h-8 px-3 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none font-mono"
                      />
                    </div>

                    {/* EAN */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">EAN</label>
                      <input
                        type="text"
                        name="ean"
                        value={v.ean}
                        placeholder="EAN"
                        onChange={(e) => handleVariantChange(index, e)}
                        className="w-full h-8 px-5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none font-mono"
                      />
                    </div>

                    {/* Botão Remover */}
                    <div className="lg:col-span-1 flex items-center justify-center">
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all flex items-center justify-center"
                          title="Remover variação"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <Button onClick={handleSubmit} disabled={loading} className="px-10 h-11 text-sm font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform flex items-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={22} /> {id ? 'Cadastrar Variação' : 'Cadastrar Produto'}</>}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
