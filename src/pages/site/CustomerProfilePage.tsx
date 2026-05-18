import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { User, Package, Heart, UserCircle, LogOut, ChevronRight, Lock, Save, MessageCircle, Gift, Loader2, X, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { backendService } from '@/services/backendService';
import { OrderReservation } from '@/types';

 export const CustomerProfilePage: React.FC = () => {
  const { user, userName, userEmail, signOut } = useAuth();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState<OrderReservation[]>([]);
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderReservation | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [reservationsData, clientData] = await Promise.all([
          backendService.getOrderReservationsByUserId(user.id),
          backendService.getClientByUserId(user.id)
        ]);
        
        setReservations(reservationsData);
        if (clientData) {
          setGiftCardBalance(clientData.saldo_vale_presente || 0);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do perfil:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  return (
    <div className="py-12 bg-zinc-50 min-h-[calc(100vh-80px)]">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1600px]">
        
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Sidebar */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="p-8 text-center border-none shadow-xl bg-white rounded-3xl sticky top-24">
                <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-400">
                  <User size={40} />
                </div>
                <h2 className="text-2xl font-serif text-zinc-950">{userName || 'Cliente Decoty'}</h2>
                <p className="text-sm text-zinc-500 mb-8">{userEmail || 'e-mail não cadastrado'}</p>
                <div className="h-px bg-zinc-50 mb-8" />
                <div className="space-y-2">
                   {[
                     { label: 'Meus Pedidos', icon: Package, id: 'orders', path: '/minha-conta', active: true },
                     { label: 'Meus Favoritos', icon: Heart, type: 'link', path: '/minha-conta/favoritos' },
                     { label: 'Meus dados', icon: UserCircle, type: 'link', path: '/minha-conta/meus_dados' }
                   ].map(item => (
                     <button 
                      key={item.label}
                      onClick={() => navigate(item.path)}
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
                      navigate('/');
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
            <div className="lg:col-span-9 space-y-6">
                 
                   <div className="flex items-center justify-between mb-2">
                      <h3 className="text-3xl font-serif text-zinc-950">Histórico de Pedidos (WhatsApp)</h3>
                   </div>

                   {loading ? (
                     <div className="flex justify-center py-12">
                       <Loader2 size={32} className="animate-spin text-zinc-900" />
                     </div>
                   ) : reservations.length === 0 ? (
                     <Card className="p-12 border-none shadow-sm flex flex-col items-center justify-center rounded-3xl bg-white">
                        <div className="flex flex-col items-center text-center max-w-xs">
                          <Package size={48} className="text-zinc-200 mb-4" />
                          <p className="text-zinc-500 font-medium leading-relaxed italic">Você ainda não realizou nenhuma solicitação de reserva pelo WhatsApp.</p>
                          <Button variant="link" className="mt-4 text-zinc-900 font-bold" onClick={() => navigate('/')}>
                            Ir para as compras
                          </Button>
                        </div>
                     </Card>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {reservations.map(order => (
                          <Card 
                            key={order.id} 
                            className="p-5 border-none shadow-sm hover:shadow-md transition-all cursor-pointer group rounded-2xl bg-white flex items-center justify-between"
                            onClick={() => setSelectedOrder(order)}
                          >
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                                  <Package size={16} />
                                </div>
                                <div>
                                   <p className="text-xs font-black text-zinc-900">Reserva #{order.ui_id || order.id.split('-')[0].toUpperCase()}</p>
                                   <p className="text-[10px] text-zinc-400 font-bold">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-black text-zinc-900">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                </p>
                             </div>
                          </Card>
                        ))}
                     </div>
                   )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <Card className="p-7 bg-zinc-950 text-white border border-amber-500/20 shadow-2xl shadow-amber-900/10 overflow-hidden relative rounded-3xl group">
                     <div className="relative z-10">
                        <h4 className="text-xl font-serif mb-1 text-amber-100">Vale Presente</h4>
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-4">Mimos especiais Decoty</p>
                        
                        <div className="mb-6">
                           <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest mb-1 italic">
                             Seu valor em vale presente na loja, utilize como desconto em seu pedido
                           </p>
                           <p className="text-3xl font-serif font-black text-amber-500">
                             {giftCardBalance !== null ? (
                               new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(giftCardBalance)
                             ) : (
                               <Loader2 size={24} className="animate-spin text-amber-500" />
                             )}
                           </p>
                        </div>

                      </div>
                     <div className="absolute -right-6 -bottom-6 opacity-20 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
                        <Gift size={140} className="text-amber-500" />
                     </div>
                     <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  </Card>
                  <Card className="p-7 bg-white border border-zinc-100 shadow-sm rounded-3xl">
                     <h4 className="text-lg font-serif mb-2 text-zinc-950">Precisa de Ajuda?</h4>
                     <p className="text-zinc-500 text-[11px] mb-6 leading-relaxed font-medium">
                        Estamos prontas para te atender e tirar as suas dúvidas.
                     </p>
                     <a 
                      href="https://api.whatsapp.com/send?phone=5519997526144" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-100"
                     >
                        <MessageCircle size={18} />
                        Falar no WhatsApp
                     </a>
                  </Card>
               </div>
            </div>

          </div>
        
      </div>

      {/* Reservation Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-serif font-black text-zinc-900">Detalhes da Reserva</h3>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Pedido #{selectedOrder.ui_id || selectedOrder.id.split('-')[0].toUpperCase()}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Itens Solicitados</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-900 font-black text-xs border border-zinc-100">
                              {item.quantidade}x
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{item.nome}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.preco_unitario)} cada</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-zinc-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Pagamento Escolhido</h4>
                      <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-2xl">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-900 border border-zinc-100">
                          {selectedOrder.payment_method === 'pix' && <Smartphone size={18} />}
                          {selectedOrder.payment_method === 'credito' && <CreditCard size={18} />}
                          {selectedOrder.payment_method === 'debito' && <Banknote size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900 capitalize">{selectedOrder.payment_method}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Método de preferência</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Data da Solicitação</h4>
                      <div className="bg-zinc-50 p-4 rounded-2xl">
                        <p className="text-sm font-bold text-zinc-900">
                          {new Date(selectedOrder.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-50 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">Subtotal</span>
                      <span className="text-zinc-900 font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.items.reduce((acc, item) => acc + item.subtotal, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">Desconto por tipo de pagamento</span>
                      <span className="text-emerald-600 font-bold">
                        {(() => {
                          const subtotal = selectedOrder.items.reduce((acc, item) => acc + item.subtotal, 0);
                          const discountValue = subtotal - selectedOrder.total;
                          const discountPercentage = subtotal > 0 ? Math.round((discountValue / subtotal) * 100) : 0;
                          return discountPercentage > 0 ? `(${discountPercentage}%) ` : '';
                        })()}
                        -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.items.reduce((acc, item) => acc + item.subtotal, 0) - selectedOrder.total)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">Método de Pagamento</span>
                      <span className="text-zinc-900 font-black uppercase tracking-widest text-[10px]">
                        {selectedOrder.payment_method}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-zinc-50 flex items-center justify-between mt-auto">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Final</p>
                  <p className="text-3xl font-serif font-black text-zinc-950">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.total)}
                  </p>
                </div>
                <a 
                  href="https://api.whatsapp.com/send?phone=5519997526144" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-100"
                >
                  <MessageCircle size={18} />
                  Retomar no Whats
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
