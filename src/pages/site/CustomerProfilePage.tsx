import React from 'react';
import { motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { User, Package, MapPin, Heart, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const CustomerProfilePage: React.FC = () => {
  const { userName, userEmail, signOut } = useAuth();
  const navigate = useNavigate();

  const orders = [
    { id: '12345', date: '12/04/2024', status: 'Entregue', total: 319.80 },
    { id: '12344', date: '05/04/2024', status: 'Em trânsito', total: 159.90 },
  ];

  return (
    <div className="py-12 bg-zinc-50 min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-8 text-center border-none shadow-xl bg-white rounded-3xl">
                <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-400">
                  <User size={40} />
                </div>
                <h2 className="text-2xl font-serif text-zinc-950">{userName || 'Cliente Decoty'}</h2>
                <p className="text-sm text-zinc-500 mb-8">{userEmail}</p>
                <div className="h-px bg-zinc-50 mb-8" />
                <div className="space-y-2">
                   {[
                     { label: 'Meus Pedidos', icon: Package, active: true },
                     { label: 'Endereços', icon: MapPin },
                     { label: 'Favoritos', icon: Heart },
                     { label: 'Configurações', icon: Settings }
                   ].map(item => (
                     <button 
                      key={item.label}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                        item.active ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                     >
                       <div className="flex items-center gap-3">
                         <item.icon size={18} />
                         <span className="text-sm font-bold">{item.label}</span>
                       </div>
                       <ChevronRight size={16} />
                     </button>
                   ))}
                   <button 
                    onClick={() => {
                      signOut();
                      navigate('/entrar');
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all mt-4"
                   >
                     <LogOut size={18} />
                     <span className="text-sm font-bold">Sair da Conta</span>
                   </button>
                </div>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-serif text-zinc-950">Histórico de Pedidos</h3>
               </div>

               {orders.length === 0 ? (
                 <Card className="p-12 text-center border-none shadow-sm flex flex-col items-center justify-center">
                    <Package size={48} className="text-zinc-200 mb-4" />
                    <p className="text-zinc-500 font-medium">Você ainda não realizou nenhum pedido.</p>
                    <Button variant="link" className="mt-2 text-zinc-900 font-bold" onClick={() => navigate('/')}>
                      Ir para as compras
                    </Button>
                 </Card>
               ) : (
                 <div className="space-y-4">
                    {orders.map(order => (
                      <Card key={order.id} className="p-6 border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                <Package size={20} />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-zinc-900">Pedido #{order.id}</p>
                                 <p className="text-xs text-zinc-500">{order.date}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-right">
                                 <p className="text-sm font-black text-zinc-900">
                                   {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                 </p>
                                 <Badge className={
                                   order.status === 'Entregue' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                 }>
                                   {order.status}
                                 </Badge>
                              </div>
                              <ChevronRight size={20} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                           </div>
                        </div>
                      </Card>
                    ))}
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <Card className="p-6 bg-zinc-900 text-white border-none shadow-xl overflow-hidden relative">
                     <div className="relative z-10">
                        <h4 className="text-lg font-serif mb-2">Clube Decoty Privé</h4>
                        <p className="text-white/60 text-xs mb-4">Você tem 350 pontos acumulados.</p>
                        <Button size="sm" className="bg-white text-black hover:bg-zinc-100">Resgatar Cupom</Button>
                     </div>
                     <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Heart size={120} fill="white" />
                     </div>
                  </Card>
                  <Card className="p-6 bg-white border-none shadow-sm border border-zinc-100">
                     <h4 className="text-lg font-serif mb-2 text-zinc-950">Precisa de Ajuda?</h4>
                     <p className="text-zinc-500 text-xs mb-4">Nossa equipe de suporte está pronta para te atender.</p>
                     <Button variant="outline" size="sm" className="border-zinc-200">Falar no WhatsApp</Button>
                  </Card>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
