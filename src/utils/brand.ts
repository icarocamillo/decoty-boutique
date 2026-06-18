import { Supplier } from '@/types';

/**
 * Returns the brand name that should be shown on the site.
 * If the supplier associated with the brand has show_on_site === false,
 * it returns 'Decoty' (the store's own brand/default).
 */
export function getDisplayBrand(marca: string | undefined, suppliers: Supplier[] | undefined): string {
  if (!marca) return 'Decoty';
  if (!suppliers) return marca;

  // Find supplier by fantasy_name or nome_empresa
  const supplier = suppliers.find(
    s => s.fantasy_name === marca || s.nome_empresa === marca
  );

  if (supplier && supplier.show_on_site === false) {
    return 'Decoty';
  }

  return marca;
}
