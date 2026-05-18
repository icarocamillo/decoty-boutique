import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: string;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ isOpen, onClose, category }) => {
  const isBottom = category?.toLowerCase().includes('calça') || category?.toLowerCase().includes('short') || category?.toLowerCase().includes('saia');
  const isFull = category?.toLowerCase().includes('vestido') || category?.toLowerCase().includes('conjunto') || category?.toLowerCase().includes('macacão');

  const renderTable = () => {
    if (isBottom) {
      return (
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-zinc-50">
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100 w-[28%]">Tam.</th>
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Cintura</th>
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Quadril</th>
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Comp.</th>
            </tr>
          </thead>
          <tbody className="text-[11px] sm:text-xs text-zinc-600">
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">P (36/38)</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">66-70</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">94-98</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">100-102</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">M (40)</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">74-78</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">102-106</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">102-104</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">G (42)</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">82-86</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">110-114</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">104-106</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">GG (44)</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">90-94</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">118-122</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">106-108</td>
            </tr>
          </tbody>
        </table>
      );
    }

    if (isFull) {
      return (
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-zinc-50">
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Tam.</th>
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Busto</th>
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Cintura</th>
              <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Quadril</th>
            </tr>
          </thead>
          <tbody className="text-[11px] sm:text-xs text-zinc-600">
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">P</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">84-88</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">66-70</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">94-98</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">M</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">92-96</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">74-78</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">102-106</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">G</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">100-104</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">82-86</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">110-114</td>
            </tr>
            <tr>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">GG</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">108-112</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">90-94</td>
              <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">118-122</td>
            </tr>
          </tbody>
        </table>
      );
    }

    // Default table for Blusas/Others
    return (
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="bg-zinc-50">
            <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Tam.</th>
            <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Busto</th>
            <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Cintura</th>
            <th className="py-2.5 px-2 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Comp.</th>
          </tr>
        </thead>
        <tbody className="text-[11px] sm:text-xs text-zinc-600">
          <tr>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">P</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">84-88</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">66-70</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">58-60</td>
          </tr>
          <tr>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">M</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">92-96</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">74-78</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">60-62</td>
          </tr>
          <tr>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">G</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">100-104</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">82-86</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">62-64</td>
          </tr>
          <tr>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50 font-bold">GG</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">108-112</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">90-94</td>
            <td className="py-2.5 px-2 sm:px-4 border-b border-zinc-50">64-66</td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-8 border-b border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 shadow-sm">
                  <Ruler size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-black text-zinc-900 leading-none">Guia de Tamanhos</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
                    {category || 'Medidas Gerais'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="w-12 h-12 bg-zinc-50 hover:bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 sm:space-y-10 custom-scrollbar">
              <section className="space-y-4 sm:space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Como medir seu corpo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
                  <div className="aspect-[3/4] bg-zinc-50 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-inner border border-zinc-100">
                    <img 
                      src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=400&auto=format&fit=crop" 
                      alt="Medindo corpo" 
                      className="w-full h-full object-cover grayscale opacity-40 mix-blend-multiply"
                    />
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black">1</span>
                        <h4 className="text-xs sm:text-sm font-black text-zinc-900 uppercase tracking-tight">Busto</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed font-medium">Passe a fita métrica sobre a parte mais larga do seu busto e pelas costas.</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black">2</span>
                        <h4 className="text-xs sm:text-sm font-black text-zinc-900 uppercase tracking-tight">Cintura</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed font-medium">Passe a fita métrica ao redor da parte mais estreita da cintura.</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black">3</span>
                        <h4 className="text-xs sm:text-sm font-black text-zinc-900 uppercase tracking-tight">Quadril</h4>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed font-medium">Mantenha os pés juntos e passe a fita métrica ao redor da parte mais larga do quadril.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 sm:space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tabela de Medidas (cm)</h3>
                <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-100 overflow-hidden shadow-sm bg-zinc-50/50">
                  <div className="overflow-x-hidden">
                    {renderTable()}
                  </div>
                </div>
                <div className="p-4 sm:p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-tight leading-relaxed italic">
                    * As medidas podem variar em até 2cm para mais ou para menos. Em caso de dúvidas, escolha o tamanho maior ou entre em contato pelo nosso WhatsApp.
                  </p>
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
