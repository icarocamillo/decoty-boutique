/**
 * Utilitários para mapeamento e visualização de cores no sistema.
 */

export const COLOR_MAP: Record<string, string> = {
  // Básicos & Escuros
  'preto': '#000000',
  'preto-fosco': '#1A1A1A',
  'grafite': '#383838',
  'cinza-escuro': '#4A4A4A',
  'cinza-chumbo': '#2F4F4F',
  'cinza': '#95A5A6',
  'cinza-claro': '#D1D5DB',
  'cinza-asfalto': '#4E5452',
  'prata': '#C0C0C0',
  'branco': '#FFFFFF',
  'off-white': '#FAF9F6',
  'gelo': '#F2F2F2',
  'marfim': '#FFFFF0',
  
  // Neutros, Beges & Marrons
  'bege': '#F5F5DC',
  'bege-claro': '#FDF5E6',
  'bege-escuro': '#D2B48C',
  'nude': '#E3BC9A',
  'nude-claro': '#F5E1D1',
  'nude-escuro': '#BC967F',
  'areia': '#C2B280',
  'palha': '#E4D96F',
  'creme': '#FFFDD0',
  'caqui': '#C3B091',
  'fendi': '#A79E8C',
  'taupe': '#483C32',
  'marrom': '#8B4513',
  'marrom-cafe': '#3B2712',
  'chocolate': '#7B3F00',
  'terracota': '#E2725B',
  'caramelo': '#AF6F09',
  'telha': '#B05E3C',
  'canela': '#7B3F00',
  'bronze': '#CD7F32',
  
  // Azuis
  'azul': '#2152CE',
  'azul-marinho': '#000080',
  'azul-noite': '#000033',
  'azul-petroleo': '#004D40',
  'azul-royal': '#4169E1',
  'azul-celeste': '#87CEEB',
  'azul-bebe': '#ADD8E6',
  'azul-serenity': '#B3CEE5',
  'azul-turquesa': '#40E0D0',
  'azul-cobalto': '#0047AB',
  'azul-denim': '#1560BD',
  'azul-indigo': '#4B0082',
  
  // Verdes
  'verde': '#26A65B',
  'verde-escuro': '#006400',
  'verde-bandeira': '#006B3C',
  'verde-militar': '#4B5320',
  'verde-oliva': '#808000',
  'verde-musgo': '#4A5D23',
  'verde-esmeralda': '#50C878',
  'verde-agua': '#20B2AA',
  'verde-menta': '#98FF98',
  'verde-limao': '#32CD32',
  'verde-pistache': '#93C572',
  'verde-piscina': '#00CED1',
  
  // Vinhis, Vermelhos & Alaranjados
  'vinho': '#722F37',
  'bordeaux': '#4C1C24',
  'bordô': '#800000',
  'marsala': '#955251',
  'sangria': '#92000A',
  'vermelho': '#EE423E',
  'vermelho-escuro': '#8B0000',
  'cereja': '#DE3163',
  'coral': '#FF7F50',
  'salmao': '#FA8072',
  'laranja': '#E67E22',
  'abobora': '#FF7518',
  'ferrugem': '#B7410E',
  'ameixa': '#8E4585',
  
  // Rosas & Roxos
  'rosa': '#FFC0CB',
  'rosa-claro': '#FFB6C1',
  'rosa-choque': '#FC0FC0',
  'pink': '#FF69B4',
  'magenta': '#FF00FF',
  'fucsia': '#FF00FF',
  'rose': '#FF007F',
  'rose-gold': '#B76E79',
  'roxo': '#8E44AD',
  'roxo-escuro': '#4B0082',
  'violeta': '#EE82EE',
  'lilas': '#C8A2C8',
  'lavanda': '#E6E6FA',
  'berinjela': '#483248',
  
  // Amarelos & Metálicos
  'amarelo': '#F9D423',
  'amarelo-ouro': '#FFD700',
  'mostarda': '#E1AD01',
  'ouro': '#FFD700',
  'dourado': '#D4AF37',
  'obre': '#CC7722',
  'cobre': '#B87333',
};

/**
 * Catálogo de cores sugeridas para o ERP (Interface em Português).
 */
export const COLOR_CATALOG = [
  // Básicos & Escuros
  'Preto', 'Preto Fosco', 'Grafite', 'Cinza Escuro', 'Cinza Chumbo', 'Cinza', 'Cinza Claro', 'Cinza Asfalto', 'Prata', 'Branco', 'Off White', 'Gelo', 'Marfim',
  
  // Neutros, Beges & Marrons
  'Bege', 'Bege Claro', 'Bege Escuro', 'Nude', 'Nude Claro', 'Nude Escuro', 'Areia', 'Palha', 'Creme', 'Caqui', 'Fendi', 'Taupe', 'Marrom', 'Marrom Café', 'Chocolate', 'Terracota', 'Caramelo', 'Telha', 'Canela', 'Bronze',
  
  // Azuis
  'Azul', 'Azul Marinho', 'Azul Noite', 'Azul Petróleo', 'Azul Royal', 'Azul Celeste', 'Azul Bebê', 'Azul Serenity', 'Azul Turquesa', 'Azul Cobalto', 'Azul Denim', 'Azul Índigo',
  
  // Verdes
  'Verde', 'Verde Escuro', 'Verde Bandeira', 'Verde Militar', 'Verde Oliva', 'Verde Musgo', 'Verde Esmeralda', 'Verde Água', 'Verde Menta', 'Verde Limão', 'Verde Pistache', 'Verde Piscina',
  
  // Vinhis, Vermelhos & Alaranjados
  'Vinho', 'Bordeaux', 'Bordô', 'Marsala', 'Sangria', 'Vermelho', 'Vermelho Escuro', 'Cereja', 'Coral', 'Salmão', 'Laranja', 'Abóbora', 'Ferrugem', 'Ameixa',
  
  // Rosas & Roxos
  'Rosa', 'Rosa Claro', 'Rosa Choque', 'Pink', 'Magenta', 'Fúcsia', 'Rose', 'Rose Gold', 'Roxo', 'Roxo Escuro', 'Violeta', 'Lilás', 'Lavanda', 'Berinjela',
  
  // Amarelos & Metálicos
  'Amarelo', 'Amarelo Ouro', 'Mostarda', 'Ouro', 'Dourado', 'Cobre', 'Multicor'
].sort();

/**
 * Normaliza o nome da cor para busca no mapeamento.
 * Remove acentos, espaços e converte para minúsculo.
 */
export const normalizeColorName = (name: string) => {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, '-');
};

/**
 * Retorna o valor CSS (hex ou gradient) para uma cor.
 */
export const getColorValue = (colorName: string) => {
  if (colorName === 'Multicor' || colorName.toLowerCase() === 'multicollor') {
    return 'linear-gradient(45deg, #ff0000, #ffff00, #0000ff, #ff00ff)';
  }
  
  const normalized = normalizeColorName(colorName);
  
  // 1. Tenta no mapa expandido
  if (COLOR_MAP[normalized]) return COLOR_MAP[normalized];
  
  // 2. Se for uma cor padrão do CSS (sem espaços)
  if (!colorName.includes(' ')) return colorName.toLowerCase();
  
  // 3. Fallback: Gradiente sutil para cores não mapeadas
  return 'linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 100%)';
};
