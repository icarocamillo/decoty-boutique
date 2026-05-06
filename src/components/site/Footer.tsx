
import React from 'react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Col */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <BrandLogo size="md" className="brightness-200" />
              <span className="font-rouge text-2xl tracking-wide">Decoty Boutique</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Curadoria de moda feminina com foco em estilo, elegância e as últimas tendências. Sinta-se única, sinta-se Decoty.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-all">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Links Col */}
          <div>
            <h4 className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-6">Shopping</h4>
            <ul className="space-y-4">
              {['Novidades', 'Coleção Primavera', 'Vestidos', 'Blusas', 'Calças'].map((item) => (
                <li key={item}>
                  <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Col */}
          <div>
            <h4 className="text-xs uppercase font-black tracking-widest text-zinc-500 mb-6">Ajuda</h4>
            <ul className="space-y-4">
              {['Rastrear Pedido', 'Trocas e Devoluções', 'Termos de Serviço', 'Privacidade'].map((item) => (
                <li key={item}>
                  <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">{item}</Link>
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
                (11) 99999-9999
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <Mail size={16} className="text-zinc-600" />
                contato@decoty.com.br
              </li>
              <li className="flex items-center gap-3 text-sm text-zinc-400">
                <MapPin size={16} className="text-zinc-600" />
                São Paulo, SP
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-xs text-center sm:text-left">
            &copy; {new Date().getFullYear()} Decoty Boutique. Todos os direitos reservados.
          </p>
          <div className="flex gap-6">
             {/* Payment Icons Placeholder */}
             <div className="flex items-center gap-2 opacity-30 grayscale">
                <div className="w-8 h-5 bg-white rounded-sm" />
                <div className="w-8 h-5 bg-white rounded-sm" />
                <div className="w-8 h-5 bg-white rounded-sm" />
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
