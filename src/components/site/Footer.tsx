
import React from 'react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { Instagram, Facebook, Phone, Mail, MapPin, Lock, ShieldCheck, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 text-white pt-20 pb-10">
      <div className="w-full px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-8">
          {/* Brand Col */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <BrandLogo size="md" className="brightness-200" />
              <span className="font-rouge text-2xl tracking-wide">Decoty Boutique</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-md">
              Sua boutique de moda feminina com foco em estilo, elegância e as últimas novidades. Sinta-se única, sinta-se Decoty.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/decotydezilda/" className="w-10 h-10 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all">
                <Instagram size={18} />
              </a>
              <a href="https://www.facebook.com/decoty.boutique/" className="w-10 h-10 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Links Col */}
          <div>
            <h4 className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-6">Compras</h4>
            <ul className="space-y-4">
              {[
                { label: 'Novidades', path: '/catalogo' },
                { label: 'Coleção da temporada', path: '/catalogo' },
                { label: 'Vestidos', path: '/catalogo?category=Vestidos' },
                { label: 'Blusas', path: '/catalogo?category=Blusas' },
                { label: 'Calças', path: '/catalogo?category=Calças' },
                { label: 'Conjuntos', path: '/catalogo?category=Conjuntos' }
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.path} className="text-sm text-zinc-400 hover:text-white transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Col */}
          <div>
            <h4 className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-6">Ajuda</h4>
            <ul className="space-y-4">
              {[
                { label: 'Acompanhar Pedidos', path: '/minha-conta' },
                { label: 'Trocas e Devoluções', path: '/' },
                { label: 'Termos de Serviço', path: '/' }
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.path} className="text-sm text-zinc-400 hover:text-white transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h4 className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-6">Contato</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <Phone size={16} className="text-zinc-600" />
                (19) 3571-2644
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <Phone size={16} className="text-zinc-600" />
                <a href="https://api.whatsapp.com/send?phone=5519997526144" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  (19) 9 9752-6144 (WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <Mail size={16} className="text-zinc-600" />
                <a href="mailto:decoty@hotmail.com.br" className="hover:text-white transition-colors">
                  decoty@hotmail.com.br
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <MapPin size={16} className="text-zinc-600 flex-shrink-0" />
                <div>
                  <p>Rua Padre Julião, 406 - Centro</p>
                  <p>Leme, São Paulo - SP</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col lg:flex-row justify-between items-center gap-8 border-t border-white/5">
          {/* Copyright & CNPJ */}
          <div className="text-zinc-600 text-xs text-center lg:text-left space-y-1 lg:space-y-0">
            <span>&copy; {new Date().getFullYear()} Decoty Boutique. Todos os direitos reservados.</span>
            <span className="hidden lg:inline mx-2 text-zinc-800">•</span>
            <span className="block lg:inline">CNPJ: 96.324.223/0001-83</span>
          </div>

          {/* Meios de Pagamento & Segurança */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-8 gap-y-4">
            {/* Meios de Pagamento */}
            <div className="flex flex-col gap-2 items-center">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-black text-center">Formas de Pagamento</span>
              <div className="flex items-center justify-center gap-2">
                {/* Pix Brand Badge */}
                <div className="h-6 px-2 bg-zinc-900 border border-white/5 rounded flex items-center gap-1.5 text-teal-400 font-mono text-[10px] font-bold" title="Pix">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2L2 12l10 10 10-10L12 2zm-1.12 11.12l-1.93-1.93 1.93-1.93 1.93 1.93-1.93 1.93zm0-5.71L9.12 9.17l1.76 1.76 1.76-1.76-1.76-1.76zm4.49 5.71l-1.93-1.93 1.93-1.93 1.93 1.93-1.93 1.93zm-1.89-5.71l-1.76 1.76 1.76 1.76 1.76-1.76-1.76-1.76z" />
                  </svg>
                  PIX
                </div>

                {/* Visa Badge */}
                <div className="h-6 px-2.5 bg-zinc-900 border border-white/5 rounded flex items-center text-sky-400 font-sans italic text-[11px] font-black tracking-wider" title="Visa">
                  VISA
                </div>

                {/* Mastercard Badge */}
                <div className="h-6 px-2.5 bg-zinc-900 border border-white/5 rounded flex items-center gap-1" title="Mastercard">
                  <span className="flex -space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-90" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 opacity-90" />
                  </span>
                  <span className="text-zinc-500 text-[9px] lowercase font-bold">master</span>
                </div>
              </div>
            </div>

            {/* Selos de Segurança */}
            <div className="flex flex-col gap-2 items-center">
              <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-black text-center">Segurança</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="h-6 px-2.5 bg-zinc-900 border border-emerald-500/10 rounded flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold">
                  <Lock size={10} className="text-emerald-500/80" />
                  <span>SSL Blindado</span>
                </div>
                <div className="h-6 px-2.5 bg-zinc-900 border border-amber-500/10 rounded flex items-center gap-1.5 text-amber-500 text-[10px] font-bold">
                  <ShieldCheck size={11} className="text-amber-500/80" />
                  <span>Compra Segura</span>
                </div>
                <div className="h-6 px-2.5 bg-zinc-900 border border-sky-500/10 rounded flex items-center gap-1.5 text-sky-500 text-[10px] font-bold" title="Google Safe Browsing">
                  <svg className="w-2.5 h-2.5 fill-current text-sky-500/80" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                  <span>Google Verificado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
