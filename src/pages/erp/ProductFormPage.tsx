
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package, Check, Loader2, Tag, Layers, Plus, Minus, ArrowLeft, Save, AlertCircle, Barcode, Hash, Trash2, Image as ImageIcon, Upload, Star, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { backendService } from '@/services/backendService';
import { ProductSize, Product, Supplier, ProductImage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { COLOR_CATALOG, getColorValue, normalizeColorName } from '@/utils/colorUtils';

// Categorias segregadas
const CLOTHING_CATEGORIES = ['Vestidos', 'Blusas', 'Camisas', 'Calças', 'Saias', 'Casacos', 'Jaquetas', 'Bermudas', 'Conjuntos'];
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
  const [filterColor, setFilterColor] = useState('Todos');
  const [filterSize, setFilterSize] = useState('Todos');

  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTargetColor, setUploadTargetColor] = useState('');
  const [focusedVariantIndex, setFocusedVariantIndex] = useState<number | null>(null);

  // Combinações (Complete o Look)
  const [selectedSourceColor, setSelectedSourceColor] = useState<string>('');
  const [colorCombinations, setColorCombinations] = useState<any[]>([]);
  const [combinationSearch, setCombinationSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'variants' | 'images' | 'combinations'>('variants');

  // Cores disponíveis do produto atual
  const availableColors = useMemo(() => {
    return Array.from(new Set(variants.map(v => v.cor).filter(Boolean)));
  }, [variants]);

  // Se houver apenas uma cor, seleciona automaticamente
  useEffect(() => {
    if (availableColors.length === 1 && !selectedSourceColor) {
      setSelectedSourceColor(availableColors[0]);
    }
  }, [availableColors, selectedSourceColor]);

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
    // Lógica específica para Vicky Bijou
    if (formData.marca === 'Vicky Bijou') {
      return {
        availableCategories: ACCESSORY_CATEGORIES,
        availableMaterials: MATERIALS_ACCESSORIES,
        isMaterialLocked: true
      };
    }

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
  }, [selectedSupplier, formData.categoria, formData.marca]);

  const maxSubId = useMemo(() => {
    if (!productToEdit || !productToEdit.variants) return 0;
    const ids = productToEdit.variants.map(v => v.ui_id % 1000);
    return ids.length > 0 ? Math.max(...ids) : 0;
  }, [productToEdit]);
  const availableSizesForMaterial = (tipoMaterial: string) => {
    if (tipoMaterial === 'Bijuteria') return ['UN'];
    if (tipoMaterial === 'Malha') return SIZES_LETTERS;
    if (tipoMaterial === 'Tecido Plano') return SIZES_NUMBERS;
    return [...SIZES_LETTERS, ...SIZES_NUMBERS];
  };

  useEffect(() => {
    if (id && productToEdit && id !== productToEdit.ui_id.toString()) {
      navigate(`/erp/products/update/${productToEdit.ui_id}`, { replace: true });
    }
  }, [id, productToEdit, navigate]);

  // Lógica específica para a marca Vicky Bijou e limpeza ao trocar de marca
  useEffect(() => {
    if (formData.marca === 'Vicky Bijou') {
      setFormData(prev => {
        const needsUpdate = prev.tipo_material !== 'Bijuteria' || (prev.categoria && !ACCESSORY_CATEGORIES.includes(prev.categoria));
        if (needsUpdate) {
          return {
            ...prev,
            tipo_material: 'Bijuteria',
            categoria: ACCESSORY_CATEGORIES.includes(prev.categoria) ? prev.categoria : ''
          };
        }
        return prev;
      });
      
      // Forçar tamanho UN para Vicky Bijou
      setVariants(prev => {
        const needsUpdate = prev.some(v => v.tamanho !== 'UN');
        if (needsUpdate) {
          return prev.map(v => ({ ...v, tamanho: 'UN' }));
        }
        return prev;
      });
    } else {
      // Caso troque de Vicky Bijou para outra marca:
      // Se o material atual (Bijuteria) não for mais permitido para a nova marca/categoria, resetamos
      if (formData.tipo_material === 'Bijuteria' && !availableMaterials.includes('Bijuteria')) {
        setFormData(prev => ({ ...prev, tipo_material: '' }));
        // E limpamos os tamanhos 'UN' nas variantes para permitir a nova escolha
        setVariants(prev => prev.map(v => v.tamanho === 'UN' ? { ...v, tamanho: '' } : v));
      }
    }
  }, [formData.marca, availableMaterials]);

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
        // Ordenar variantes pelo ID da Variação (ui_id) de forma decrescente
        const sortedDbVariants = [...productToEdit.variants].sort((a, b) => b.ui_id - a.ui_id);
        
        setVariants(sortedDbVariants.map(v => ({
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

      if (productToEdit.images) {
        setImages(productToEdit.images);
      } else {
        setImages([]);
      }

      setFetching(false);
    } else if (!id) {
      setFetching(false);
    }
  }, [id, productToEdit]);

  // Buscar combinações da cor selecionada
  useEffect(() => {
    if (id && productToEdit && selectedSourceColor) {
      backendService.getColorCombinations(productToEdit.id, selectedSourceColor).then(setColorCombinations);
    } else {
      setColorCombinations([]);
    }
  }, [id, productToEdit, selectedSourceColor]);

  const validateShowOnSite = (silent = false) => {
    const activeVariants = variants.filter(v => v.tamanho && v.preco_venda);
    
    if (activeVariants.length === 0) {
      if (!silent) alert("Para mostrar no site, o produto precisa ter pelo menos 1 variação (Tamanho/Preço) preenchida.");
      return false;
    }

    if (!formData.descricao.trim()) {
      if (!silent) alert("A descrição para o site é obrigatória.");
      return false;
    }

    // Validar fotos por cor
    const uniqueColors = Array.from(new Set(activeVariants.map(v => v.cor).filter(Boolean)));
    const missingPhotosColors = uniqueColors.filter(color => {
      return !images.some(img => img.cor === color);
    });

    if (missingPhotosColors.length > 0) {
      if (!silent) alert(`Faltam fotos para as seguintes cores: ${missingPhotosColors.join(', ')}. Cada cor de variação precisa de pelo menos uma foto associada.`);
      return false;
    }

    return true;
  };

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
    setVariants([{
      cor: '',
      tamanho: '',
      preco_custo: variants[0]?.preco_custo || '',
      preco_venda: variants[0]?.preco_venda || '',
      quantidade_estoque: '0',
      original_estoque: 0,
      sku: '',
      ean: ''
    }, ...variants]);
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

    // Se estiver marcado para mostrar no site, valida novamente os requisitos
    if (formData.show_on_site) {
      if (!validateShowOnSite()) {
        newErrors.show_on_site = true;
        // Se a descrição for o problema, marca o erro visual nela
        if (!formData.descricao.trim()) newErrors.descricao = true;
      }
    }
    
    const variantErrors = variants.some(v => !v.tamanho || !v.preco_custo || !v.preco_venda);
    if (variantErrors) newErrors.variants = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!id && !productToEdit) {
      // Para novo produto, mantemos os arquivos em estado local para upload posterior
      const newFiles = Array.from(files).map((file: File) => ({
        file,
        preview: URL.createObjectURL(file),
        cor: '',
        is_main: false,
        is_default_product_photo: false,
        display_order: images.length
      }));
      setImages([...images, ...newFiles]);
      return;
    }

    // Para produto existente, faz upload imediato
    setUploading(true);
    try {
      const productFolder = `${productToEdit?.ui_id}-${productToEdit?.slug}`;
      for (const file of Array.from(files)) {
        const url = await backendService.uploadProductImage(file as File, productFolder, uploadTargetColor);
        if (url) {
          const newImage: Omit<ProductImage, 'id' | 'created_at'> = {
            product_id: productToEdit!.id,
            url,
            cor: uploadTargetColor || '',
            is_main: false,
            is_default_product_photo: images.length === 0,
            display_order: images.length,
            alt_text: formData.nome
          };
          const saved = await backendService.saveProductImage(newImage);
          if (saved) {
            setImages(prev => [...prev, saved]);
          }
        }
      }
    } catch (error) {
      console.error("Erro no upload:", error);
    } finally {
      setUploading(false);
    }
  };

  const updateImageField = async (imageId: string, field: string, value: any) => {
    // Se for um objeto local (novo produto), atualizamos apenas o estado
    const imgIndex = images.findIndex(img => (img.id === imageId || img.preview === imageId));
    if (imgIndex === -1) return;

    const isLocal = !images[imgIndex].id;

    if (isLocal) {
      const updated = [...images];
      updated[imgIndex][field] = value;
      
      // Se for is_default_product_photo, desmarcar as outras
      if (field === 'is_default_product_photo' && value === true) {
        updated.forEach((img, idx) => {
          if (idx !== imgIndex) img.is_default_product_photo = false;
        });
      }
      // Se for is_main, desmarcar outras da mesma cor
      if (field === 'is_main' && value === true) {
        const currentCor = updated[imgIndex].cor;
        updated.forEach((img, idx) => {
          if (idx !== imgIndex && img.cor === currentCor) img.is_main = false;
        });
      }

      setImages(updated);
    } else {
      // Produto existente, atualiza no banco
      const currentImage = images[imgIndex];

      // Lógica Especial para Mudança de Cor (Mover entre pastas no bucket)
      if (field === 'cor' && currentImage.id && currentImage.url) {
        setUploading(true);
        try {
          const productFolder = `${productToEdit?.ui_id}-${productToEdit?.slug}`;
          const newUrl = await backendService.moveProductImage(
            currentImage.id, 
            currentImage.url, 
            value, 
            productFolder
          );
          
          if (newUrl) {
            setImages(prev => prev.map(img => img.id === imageId ? { ...img, [field]: value, url: newUrl } : img));
          } else {
            alert("Erro ao mover imagem para a nova pasta da cor.");
          }
        } catch (error) {
          console.error(error);
          alert("Ocorreu um erro ao tentar mover a imagem.");
        } finally {
          setUploading(false);
        }
        return; // Retornamos pois moveProductImage já faz o update no banco
      }

      const updatedData: any = { id: imageId, [field]: value };
      
      // Lógica de exclusividade
      if (field === 'is_default_product_photo' && value === true) {
        // Desmarcar todas as outras do produto
        for (const img of images) {
          if (img.id !== imageId && img.is_default_product_photo) {
            await backendService.updateProductImage({ id: img.id, is_default_product_photo: false });
          }
        }
      }

      if (field === 'is_main' && value === true) {
        const currentCor = images[imgIndex].cor;
        for (const img of images) {
          if (img.id !== imageId && img.cor === currentCor && img.is_main) {
            await backendService.updateProductImage({ id: img.id, is_main: false });
          }
        }
      }

      const success = await backendService.updateProductImage(updatedData);
      if (success) {
        setImages(prev => prev.map(img => img.id === imageId ? { ...img, [field]: value } : img));
        // Recarregar para garantir sincronia se houver mudanças de exclusividade
        if (field === 'is_default_product_photo' || field === 'is_main') {
           const latest = await backendService.getProductImages(productToEdit!.id);
           setImages(latest);
        }
      }
    }
  };

  const removeImage = async (imageId: string) => {
    const img = images.find(img => (img.id === imageId || img.preview === imageId));
    if (!img) return;

    if (!img.id) {
      // Local
      setImages(images.filter(i => i.preview !== imageId));
    } else {
      // Banco
      const success = await backendService.deleteProductImage(img.id, img.url);
      if (success) {
        setImages(images.filter(i => i.id !== imageId));
      }
    }
  };

  const productColors = useMemo(() => {
    const colors = variants.map(v => v.cor).filter(Boolean);
    return Array.from(new Set(colors)).sort();
  }, [variants]);

  const uniqueVariantColors = useMemo(() => {
    const colors = variants.map(v => v.cor).filter(Boolean);
    return ['Todos', ...Array.from(new Set(colors)).sort()];
  }, [variants]);

  const uniqueVariantSizes = useMemo(() => {
    const sizes = variants.map(v => v.tamanho).filter(Boolean);
    return ['Todos', ...Array.from(new Set(sizes)).sort()];
  }, [variants]);

  const filteredVariants = useMemo(() => {
    return variants
      .map((v, originalIndex) => ({ ...v, originalIndex }))
      .filter(v => {
        const matchColor = filterColor === 'Todos' || v.cor === filterColor;
        const matchSize = filterSize === 'Todos' || v.tamanho === filterSize;
        return matchColor && matchSize;
      });
  }, [variants, filterColor, filterSize]);

  const filteredImages = useMemo(() => {
    if (!uploadTargetColor) {
      // "Geral" -> Imagens sem cor vinculada
      return images.filter(img => !img.cor);
    }
    // "Cor X" -> Imagens daquela cor
    return images.filter(img => img.cor === uploadTargetColor);
  }, [images, uploadTargetColor]);

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
      slug: formData.slug || (formData.nome || '').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
    };

    const variantsPayload = variants.map(v => ({
      ...v,
      preco_custo: parseCurrency(v.preco_custo),
      preco_venda: parseCurrency(v.preco_venda),
      quantidade_estoque: parseInt(v.quantidade_estoque) || 0,
      sku: v.sku?.trim() || null,
      ean: v.ean?.trim() || null
    }));

    try {
      let productId = id && productToEdit ? productToEdit.id : null;
      let success = false;

      if (id && productToEdit) {
        success = await backendService.updateProduct({ ...parentPayload, id: productToEdit.id } as any, variantsPayload as any, user?.id || '');
      } else {
        const newProduct = await backendService.createProduct(parentPayload as any, variantsPayload as any, user?.id || '');
        if (newProduct) {
          productId = newProduct.id;
          success = true;

          // Se for novo produto, faz o upload das imagens agora
          if (images.length > 0) {
            const productFolder = `${newProduct.ui_id}-${newProduct.slug}`;
            for (const img of images) {
              const fileImg = img.file as File | undefined;
              if (fileImg) {
                 const url = await backendService.uploadProductImage(fileImg, productFolder, img.cor);
                 if (url) {
                   await backendService.saveProductImage({
                     product_id: productId,
                     url,
                     cor: img.cor || null,
                     is_main: img.is_main,
                     is_default_product_photo: img.is_default_product_photo,
                     display_order: img.display_order,
                     alt_text: parentPayload.nome
                   });
                 }
              }
            }
          }
        }
      }

      if (success && productId) {
        // Salvar combinações da cor selecionada (se houver)
        if (selectedSourceColor) {
            const mappedCombos = colorCombinations.map(c => ({
                productId: c.product_id,
                color: c.cor
            }));
            await backendService.saveColorCombinations(productId, selectedSourceColor, mappedCombos);
        }
        
        await refreshData();
        navigate('/erp/products');
      } else if (success) {
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
                      onClick={() => {
                        if (validateShowOnSite()) {
                          setFormData(prev => ({ ...prev, show_on_site: true }));
                        }
                      }}
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

        {/* Área de Detalhes em Abas */}
        <div className="w-full space-y-4">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('variants')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'variants' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <Layers size={14} /> Variações e Estoque
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'images' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <ImageIcon size={14} /> Fotos do Catálogo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('combinations')}
              className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'combinations' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              <Plus size={14} /> Combinações (Complete o Look)
            </button>
          </div>

          {/* Conteúdo da Aba: Variantes */}
          {activeTab === 'variants' && (
            <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="p-6 border-0 shadow-sm bg-white dark:bg-zinc-900 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2 whitespace-nowrap">
                <Layers size={16} className="text-zinc-400" /> Variações do Produto (Cores e Tamanho)
                <div className="text-[10px] font-bold text-zinc-400 uppercase bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  {filteredVariants.length}/{variants.length}
                </div>
              </h3>

              {/* Filtros de Variações Compactos no Header */}
              <div className="flex-1 flex flex-wrap items-center justify-end gap-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Filtrar Cor:</span>
                  <select
                    value={filterColor}
                    onChange={(e) => setFilterColor(e.target.value)}
                    className="text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none font-bold"
                  >
                    {uniqueVariantColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Filtrar Tam:</span>
                  <select
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value)}
                    className="text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none font-bold"
                  >
                    {uniqueVariantSizes.map(s => <option key={s} value={s}>{s === 'Todos' ? s : s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" size="sm" variant="outline" onClick={addVariant} className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 h-9 whitespace-nowrap">
                  <Plus size={16} /> Adicionar Variação
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={loading || uploading} 
                  className="bg-white hover:bg-zinc-100 text-zinc-950 border border-zinc-200 dark:border-zinc-700 h-9 px-4 rounded-xl text-[11px] font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {id ? 'Atualizar Variação' : 'Cadastrar Variação'}
                </Button>
              </div>
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
              {filteredVariants.map((v) => (
                <div key={v.originalIndex} className="relative p-3 lg:p-2 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">

                    {/* ID da Variação */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">ID Var.</label>
                      <div className="h-8 px-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-[15px] text-zinc-900 dark:text-white font-bold overflow-hidden">
                        {id && productToEdit ? (
                          v.ui_id || ((productToEdit.ui_id * 1000) + maxSubId + variants.filter((_, i) => i >= v.originalIndex && !_.ui_id).length)
                        ) : '-'}
                      </div>
                    </div>

                    {/* Tamanho */}
                    <div className="lg:col-span-1">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Tamanho *</label>
                      <select
                        name="tamanho"
                        value={v.tamanho}
                        onChange={(e) => handleVariantChange(v.originalIndex, e)}
                        className="w-full h-8 px-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none appearance-none"
                      >
                        <option value="">-</option>
                        {availableSizesForMaterial(formData.tipo_material).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Cor */}
                    <div className="lg:col-span-2 relative">
                      <label className="lg:hidden text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Cor</label>
                      <div className="relative flex items-center group">
                        <input
                          type="text"
                          name="cor"
                          autoComplete="off"
                          value={v.cor}
                          placeholder="Ex: Vermelho"
                          onFocus={() => setFocusedVariantIndex(v.originalIndex)}
                          onBlur={() => setTimeout(() => setFocusedVariantIndex(null), 200)}
                          onChange={(e) => handleVariantChange(v.originalIndex, e)}
                          className="w-full h-8 pl-3 pr-8 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none"
                        />
                        {v.cor && (
                          <div 
                            className="absolute right-2 w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-600 shadow-sm transition-transform group-hover:scale-125 pointer-events-none"
                            style={{ background: getColorValue(v.cor) }}
                          />
                        )}

                        {/* Custom Dropdown Suggestions */}
                        {focusedVariantIndex === v.originalIndex && (
                          <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto no-scrollbar py-2">
                            {COLOR_CATALOG.filter(c => 
                              normalizeColorName(c).includes(normalizeColorName(v.cor || ''))
                            ).map(color => (
                              <button
                                key={color}
                                type="button"
                                className="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                onClick={() => {
                                  const updated = [...variants];
                                  updated[v.originalIndex].cor = color;
                                  setVariants(updated);
                                  setFocusedVariantIndex(null);
                                }}
                              >
                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{color}</span>
                                <div 
                                  className="w-4 h-4 rounded-full border border-zinc-200 dark:border-zinc-600 shrink-0"
                                  style={{ background: getColorValue(color) }}
                                />
                              </button>
                            ))}
                            {COLOR_CATALOG.filter(c => 
                              normalizeColorName(c).includes(normalizeColorName(v.cor || ''))
                            ).length === 0 && (
                              <div className="px-3 py-2 text-[10px] text-zinc-400 font-bold uppercase text-center">
                                Cor personalizada
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
                        onChange={(e) => handleVariantCurrencyChange(v.originalIndex, e)}
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
                        onChange={(e) => handleVariantCurrencyChange(v.originalIndex, e)}
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
                            onClick={() => handleStockAction(v.originalIndex, -1)}
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
                            handleVariantChange(v.originalIndex, { target: { name: 'quantidade_estoque', value: val } } as any);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const numVal = parseInt(val) || 0;
                            const original = v.original_estoque || 0;
                            const correctedVal = Math.max(original, numVal);
                            handleVariantChange(v.originalIndex, { target: { name: 'quantidade_estoque', value: correctedVal.toString() } } as any);
                          }}
                          className={`w-full h-8 px-1 text-center text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-0 outline-none font-bold ${(parseInt(v.quantidade_estoque) || 0) <= (v.original_estoque || 0) ? 'rounded-l-lg' : ''} rounded-none`}
                        />
                        <button
                          type="button"
                          onClick={() => handleStockAction(v.originalIndex, 1)}
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
                        onChange={(e) => handleVariantChange(v.originalIndex, e)}
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
                        onChange={(e) => handleVariantChange(v.originalIndex, e)}
                        className="w-full h-8 px-5 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-400 outline-none font-mono"
                      />
                    </div>

                    {/* Botão Remover */}
                    <div className="lg:col-span-1 flex items-center justify-center">
                      {variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVariant(v.originalIndex)}
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
          </Card>
        </div>
      )}

      {/* Conteúdo da Aba: Imagens */}
      {activeTab === 'images' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-6 border-0 shadow-sm bg-white dark:bg-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-6">
              <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                <ImageIcon size={16} className="text-zinc-400" /> Galeria de Imagens
              </h3>
              <div className="flex items-center gap-3">
                {productColors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Pasta:</span>
                    <select
                      value={uploadTargetColor}
                      onChange={(e) => setUploadTargetColor(e.target.value)}
                      className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none font-bold"
                    >
                      <option value="">Geral</option>
                      {productColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`flex items-center gap-2 px-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 h-9 rounded-lg text-xs cursor-pointer transition-all whitespace-nowrap ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Adicionar Imagem
                    </label>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || uploading}
                    className="bg-white hover:bg-zinc-100 text-zinc-950 border border-zinc-200 dark:border-zinc-700 h-9 px-4 rounded-xl text-[11px] font-bold shadow-sm transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Atualizar Imagem
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredImages.map((img) => (
                <div key={img.id || img.preview} className="group relative flex flex-col bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden hover:shadow-md transition-all">
                  <div className="aspect-square relative flex items-center justify-center overflow-hidden bg-black">
                    <img 
                      src={img.url || img.preview} 
                      alt={img.alt_text || 'Foto do produto'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Botão Remover */}
                    <button 
                      onClick={() => removeImage(img.id || img.preview)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 size={12} />
                    </button>

                    {/* Badges de Status */}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {img.is_default_product_photo && (
                        <Badge className="bg-amber-500 text-white border-0 text-[8px] h-4">PRINCIPAL</Badge>
                      )}
                      {img.is_main && (
                        <Badge className="bg-emerald-500 text-white border-0 text-[8px] h-4">Destaque Cor</Badge>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Vínculo de Cor */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Vincular Cor</label>
                      <select
                        value={img.cor || ''}
                        onChange={(e) => updateImageField(img.id || img.preview, 'cor', e.target.value)}
                        className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 outline-none font-medium"
                      >
                        <option value="">Sem cor vinculada</option>
                        {productColors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Controles de Destaque */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => updateImageField(img.id || img.preview, 'is_default_product_photo', !img.is_default_product_photo)}
                        className={`flex items-center gap-1.5 text-[9px] font-bold uppercase transition-all ${img.is_default_product_photo ? 'text-amber-600' : 'text-zinc-400 hover:text-amber-500'}`}
                      >
                        <Star size={12} fill={img.is_default_product_photo ? "currentColor" : "none"} />
                        Principal Catálogo
                      </button>

                      <button
                        disabled={!img.cor}
                        onClick={() => updateImageField(img.id || img.preview, 'is_main', !img.is_main)}
                        className={`flex items-center gap-1.5 text-[9px] font-bold uppercase transition-all disabled:opacity-30 ${img.is_main ? 'text-emerald-600' : 'text-zinc-400 hover:text-emerald-500'}`}
                      >
                        <ImageIcon size={12} />
                        Principal da Cor
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredImages.length === 0 && (
                <label 
                  htmlFor="image-upload"
                  className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition-all gap-2 text-zinc-400"
                >
                  <Upload size={24} />
                  <span className="text-[10px] font-bold tracking-wider">ADICIONAR FOTOS {uploadTargetColor ? `PARA ${uploadTargetColor.toUpperCase()}` : 'GERAL'}</span>
                </label>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Conteúdo da Aba: Combinações (Complete o Look) */}
      {activeTab === 'combinations' && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="p-6 border-0 shadow-sm bg-white dark:bg-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                  <Plus size={16} className="text-zinc-400" /> Complete o Look
                </h3>
                <p className="text-[10px] text-zinc-400 uppercase font-bold mt-1">Vincule peças que combinam com este modelo para sugestão de venda</p>
              </div>

              {/* Seletor da Cor Origem */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-zinc-500 uppercase">Configurar para:</label>
                <select
                  value={selectedSourceColor}
                  onChange={(e) => setSelectedSourceColor(e.target.value)}
                  className="px-4 py-2 border rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm font-bold border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-400 outline-none min-w-[200px]"
                >
                  <option value="" disabled>Escolha uma cor</option>
                  {availableColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>
            </div>

            {!id ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400 gap-4">
                <AlertCircle size={48} className="opacity-10" />
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Salve o produto primeiro</p>
                  <p className="text-xs mt-1">Para configurar o look, o produto precisa ter um ID no sistema.</p>
                </div>
              </div>
            ) : !selectedSourceColor ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-zinc-400 gap-4">
                <Layers size={48} className="opacity-10" />
                <div className="text-center">
                  <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Selecione uma Cor</p>
                  <p className="text-xs mt-1">Escolha acima qual cor deste produto você deseja criar combinações.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Busca de Produtos */}
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar peça por nome, cor ou marca..."
                      value={combinationSearch}
                      onChange={(e) => setCombinationSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-zinc-400 outline-none"
                    />
                    <ImageIcon size={18} className="absolute left-3 top-3.5 text-zinc-400" />
                  </div>

                  <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {products
                      .flatMap(p => {
                        const pColors = Array.from(new Set(p.variants?.map(v => v.cor).filter(Boolean)));
                        return pColors.map(color => ({
                          product: p,
                          cor: color,
                          id: `${p.id}-${color}`
                        }));
                      })
                      .filter(item => 
                        (item.product.id !== productToEdit?.id || item.cor !== selectedSourceColor) &&
                        (
                          (item.product.nome || '').toLowerCase().includes((combinationSearch || '').toLowerCase()) || 
                          (item.cor || '').toLowerCase().includes((combinationSearch || '').toLowerCase()) ||
                          (item.product.marca || '').toLowerCase().includes((combinationSearch || '').toLowerCase())
                        ) &&
                        !colorCombinations.some(c => c.product_id === item.product.id && c.cor === item.cor)
                      )
                      .slice(0, 15)
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 group hover:border-zinc-300 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                              {item.product.images && item.product.images.length > 0 && (
                                <img 
                                  src={item.product.images.find((img: any) => img.cor === item.cor && (img.is_main || img.is_default_product_photo))?.url || 
                                       item.product.images.find((img: any) => img.is_default_product_photo)?.url || 
                                       item.product.images[0].url} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                />
                              )}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{item.product.nome}</p>
                                  <Badge className="text-[10px] h-4 px-1.5 bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 border-none font-bold uppercase">{item.cor}</Badge>
                               </div>
                               <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase mt-0.5">
                                 {item.product.marca} • {item.product.categoria}
                               </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={async () => {
                                const newCombos = [...colorCombinations, { product_id: item.product.id, cor: item.cor, product: item.product }];
                                setColorCombinations(newCombos);
                                // Salvamento imediato para melhor UX no ERP
                                await backendService.saveColorCombinations(productToEdit!.id, selectedSourceColor, newCombos.map(nc => ({ productId: nc.product_id, color: nc.cor })));
                            }}
                            className="bg-zinc-100 dark:bg-zinc-700 hover:bg-emerald-500 hover:text-white rounded-lg w-8 h-8 p-0"
                          >
                            <Plus size={16} />
                          </Button>
                        </div>
                      ))}
                    {combinationSearch && products.filter(p => (p.nome || '').toLowerCase().includes((combinationSearch || '').toLowerCase())).length === 0 && (
                      <div className="text-center py-10 opacity-50">
                         <AlertCircle size={32} className="mx-auto mb-2" />
                         <p className="text-xs italic">Nenhuma peça ou cor encontrada.</p>
                      </div>
                    )}
                    {!combinationSearch && <p className="text-center py-10 text-[10px] text-zinc-400 font-bold uppercase tracking-widest bg-zinc-50/50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">Use a busca para encontrar peças e cores complementares</p>}
                  </div>
                </div>

                {/* Lista da Combinação Atual */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                      ITENS DO LOOK ({colorCombinations.length})
                    </h4>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] border-zinc-200 text-zinc-400 font-bold uppercase py-0 h-5">Bidirecional</Badge>
                        {colorCombinations.length > 0 && <p className="text-[10px] text-emerald-500 font-bold">Salvo</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {colorCombinations.map(c => (
                      <div key={`${c.product_id}-${c.cor}`} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                            {c.product?.images && c.product.images.length > 0 && (
                              <img 
                                src={c.product.images.find((img: any) => img.cor === c.cor && (img.is_main || img.is_default_product_photo))?.url || 
                                     c.product.images.find((img: any) => img.is_default_product_photo)?.url || 
                                     c.product.images[0].url} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{c.product?.nome}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 text-[9px] px-2 h-5 border-none font-bold uppercase">{c.cor}</Badge>
                               <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 text-[9px] px-2 h-5 border-none font-bold uppercase">{c.product?.marca}</Badge>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                              const newCombos = colorCombinations.filter(item => !(item.product_id === c.product_id && item.cor === c.cor));
                              setColorCombinations(newCombos);
                              await backendService.saveColorCombinations(productToEdit!.id, selectedSourceColor, newCombos.map(nc => ({ productId: nc.product_id, color: nc.cor })));
                          }}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Remover do look"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {colorCombinations.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] text-zinc-400 gap-3 grayscale opacity-40">
                        <Plus size={40} strokeWidth={1} />
                        <p className="text-xs italic font-medium px-8 text-center">Nenhum item adicionado a este look. Use a busca ao lado para montar a composição perfeita.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  </div>
</div>
);
};
