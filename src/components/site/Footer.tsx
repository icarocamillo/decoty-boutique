
import React from 'react';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 text-white pt-20 pb-10">
      <div className="w-full px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
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
                { label: 'Vestidos', path: '/catalogo?categoria=Vestidos' },
                { label: 'Blusas', path: '/catalogo?categoria=Blusas' },
                { label: 'Calças', path: '/catalogo?categoria=Calças' },
                { label: 'Conjuntos', path: '/catalogo?categoria=Conjuntos' }
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
                <MapPin size={16} className="text-zinc-600" />
                Leme, São Paulo - SP
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-10 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5">
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
