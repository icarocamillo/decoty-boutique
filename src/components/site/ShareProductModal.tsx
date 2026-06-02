import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, MessageCircle, Facebook, Instagram, Share2 } from 'lucide-react';
import { Product } from '@/types';

interface ShareProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  preferredColor?: string;
}

export const ShareProductModal: React.FC<ShareProductModalProps> = ({
  isOpen,
  onClose,
  product,
  preferredColor,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const productUrl = `${window.location.origin}/produto/${product.slug}-${product.ui_id}${
    preferredColor ? `?cor=${encodeURIComponent(preferredColor)}` : ''
  }`;

  const handleShareOption = async (optionId: string, index: number) => {
    switch (optionId) {
      case 'copy':
        try {
          await navigator.clipboard.writeText(productUrl);
          setCopiedIndex(index);
          setTimeout(() => {
            setCopiedIndex(null);
            onClose();
          }, 1200);
        } catch (err) {
          console.error('Falha ao copiar link: ', err);
          onClose();
        }
        break;

      case 'whatsapp':
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `Olha que lindo essa peça da Decoty Boutique: ${product.nome} ✨\n\nConfira os detalhes no link:\n${productUrl}`
        )}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        onClose();
        break;

      case 'facebook':
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
        window.open(facebookUrl, '_blank', 'noopener,noreferrer');
        onClose();
        break;

      case 'instagram':
        try {
          await navigator.clipboard.writeText(productUrl);
          setCopiedIndex(index);
        } catch (err) {
          console.error('Falha ao copiar link: ', err);
        }
        // Redirect to Instagram so they can share/paste, then close modal
        setTimeout(() => {
          window.open('https://instagram.com', '_blank', 'noopener,noreferrer');
        }, 800);
        setTimeout(() => {
          setCopiedIndex(null);
          onClose();
        }, 1500);
        break;

      default:
        break;
    }
  };

  const shareOptions = [
    {
      id: 'copy',
      label: 'Copiar link',
      successLabel: 'Link Copiado!',
      icon: Copy,
      successIcon: Check,
      color: 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      successLabel: 'Link Copiado! Abrindo Instagram...',
      icon: Instagram,
      successIcon: Check,
      color: 'text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/20',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="share-modal-container" className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
          />

          {/* Modal Card content */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border-t sm:border border-zinc-100 dark:border-zinc-800 flex flex-col gap-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-950 dark:text-white shadow-sm">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-black text-zinc-900 dark:text-white leading-none">Compartilhar</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1.5 line-clamp-1">
                    {product.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Share options listing */}
            <div className="flex flex-col gap-2">
              {shareOptions.map((option, idx) => {
                const isCopiedState = copiedIndex === idx;
                const Icon = isCopiedState && option.successIcon ? option.successIcon : option.icon;
                const labelText = isCopiedState && option.successLabel ? option.successLabel : option.label;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleShareOption(option.id, idx)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-sans font-bold text-sm text-left active:scale-[0.98] ${
                      isCopiedState 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' 
                        : option.color
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex items-center justify-center ${
                      isCopiedState 
                        ? 'bg-emerald-500/10' 
                        : 'bg-zinc-100/60 dark:bg-zinc-800/60'
                    }`}>
                      <Icon size={18} className={isCopiedState ? 'text-emerald-500' : ''} />
                    </div>
                    <span className="flex-1">{labelText}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Visual layout balance note */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">
              Decoty Boutique
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
