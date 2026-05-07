import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-white z-[110] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <Ruler size={20} className="text-zinc-900" />
                <h2 className="text-xl font-serif text-zinc-900">Guia de Tamanhos</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-900">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Como medir seu corpo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="aspect-[3/4] bg-zinc-50 rounded-2xl overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=400&auto=format&fit=crop" 
                      alt="Medindo corpo" 
                      className="w-full h-full object-cover grayscale opacity-50"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-1">1. Busto</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Passe a fita métrica sobre a parte mais larga do seu busto e pelas costas.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-1">2. Cintura</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Passe a fita métrica ao redor da parte mais estreita da cintura.</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-1">3. Quadril</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">Mantenha os pés juntos e passe a fita métrica ao redor da parte mais larga do quadril.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Tabela de Medidas (cm)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50">
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Tam.</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Busto</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Cintura</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-100">Quadril</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-zinc-600">
                      <tr>
                        <td className="py-3 px-4 border-b border-zinc-50 font-bold">P</td>
                        <td className="py-3 px-4 border-b border-zinc-50">84-88</td>
                        <td className="py-3 px-4 border-b border-zinc-50">66-70</td>
                        <td className="py-3 px-4 border-b border-zinc-50">94-98</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-zinc-50 font-bold">M</td>
                        <td className="py-3 px-4 border-b border-zinc-50">92-96</td>
                        <td className="py-3 px-4 border-b border-zinc-50">74-78</td>
                        <td className="py-3 px-4 border-b border-zinc-50">102-106</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-zinc-50 font-bold">G</td>
                        <td className="py-3 px-4 border-b border-zinc-50">100-104</td>
                        <td className="py-3 px-4 border-b border-zinc-50">82-86</td>
                        <td className="py-3 px-4 border-b border-zinc-50">110-114</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 border-b border-zinc-50 font-bold">GG</td>
                        <td className="py-3 px-4 border-b border-zinc-50">108-112</td>
                        <td className="py-3 px-4 border-b border-zinc-50">90-94</td>
                        <td className="py-3 px-4 border-b border-zinc-50">118-122</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
