import { Supplier } from '@/types';

/**
 * Returns the brand name that should be shown on the site.
 * If the supplier associated with the brand has show_on_site === false,
 * it returns 'Decoty' (the store's own brand/default).
 */
export function getDisplayBrand(marca: string | undefined, suppliers: Supplier[] | undefined): string {
  if (!marca) return 'Decoty';
  if (!suppliers) return marca;

  const cleanMarca = marca.trim().toLowerCase();

  // Find supplier by ID, fantasy_name or nome_empresa (case-insensitive and trimmed)
  const supplier = suppliers.find(
    s => s.id?.toLowerCase() === cleanMarca || 
         s.fantasy_name?.trim().toLowerCase() === cleanMarca || 
         s.nome_empresa?.trim().toLowerCase() === cleanMarca
  );

  if (supplier && supplier.show_on_site === false) {
    return 'Decoty';
  }

  if (supplier) {
    return supplier.fantasy_name || supplier.nome_empresa || marca;
  }

  return marca;
}
