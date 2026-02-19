
import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Package, Clock, CheckCircle, Truck, ShoppingBag, Layers, AlertCircle, CreditCard, DollarSign, ListChecks, Coins, Check, Loader2 } from 'lucide-react';
import { Order, ProductionStatus } from '../types';
import { api } from '../src/services/api';

// Componente da Barra de Progresso
const ProductionStepper = ({ status }: { status: ProductionStatus }) => {
    const steps = [
        { id: 'placed', label: 'Realizado' },
        { id: 'production', label: 'Em Produção' },
        { id: 'shipping', label: 'Enviando' },
        { id: 'delivered', label: 'Entregue' }
    ];

    const currentIndex = steps.findIndex(s => s.id === status);
    // Se status inválido ou não encontrado, assume 0
    const activeIndex = currentIndex === -1 ? 0 : currentIndex;

    return (
        <div className="w-full">
            <div className="relative flex items-center justify-between w-full mb-2">
                {/* Linha de Fundo */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-800 -translate-y-1/2 rounded-full z-0"></div>
                
                {/* Linha de Progresso Ativa */}
                <div 
                    className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full z-0 transition-all duration-500"
                    style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {/* Bolinhas */}
                {steps.map((step, index) => {
                    const isActive = index <= activeIndex;
                    const isCurrent = index === activeIndex;
                    
                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                            <div 
                                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-primary border-primary scale-110' 
                                    : 'bg-zinc-900 border-zinc-600'
                                } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                            >
                                {isActive && <div className="w-full h-full rounded-full bg-white scale-[0.4]" />}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Labels */}
            <div className="flex justify-between text-[9px] uppercase font-bold tracking-wider text-zinc-500 w-full">
                {steps.map((step, index) => (
                    <span 
                        key={step.id} 
                        className={`text-center transition-colors ${index <= activeIndex ? 'text-white' : ''}`}
                        style={{ width: '25%' }} // Distribuição
                    >
                        {step.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default function ClientOrders() {
  const { currentCustomer } = useAuth();
  const { orders } = useData();
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isValueModalOpen, setIsValueModalOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{ids: string[], total: number, title: string} | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'total' | 'partial'>('total');

  const activeOrders = useMemo(() => {
    if (!currentCustomer) return [];
    return orders.filter(o => 
        o.client_id === currentCustomer.id && 
        o.status !== 'cancelled' && 
        // Considera ativo se não foi entregue AINDA, ou se foi entregue mas não pago (caso raro mas possível)
        (o.production_status !== 'delivered' || o.status === 'open')
    ).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [orders, currentCustomer]);

  // Cálculos financeiros
  const totalOpen = activeOrders.filter(o => o.status === 'open').reduce((acc, o) => acc + Number(o.total || 0), 0);
  const creditLimit = Number(currentCustomer?.creditLimit || 0);
  const availableCredit = creditLimit - totalOpen; // Aproximação simples
  const usedPercentage = creditLimit > 0 ? Math.min(100, (totalOpen / creditLimit) * 100) : 0;

  const initiatePaymentFlow = (orderIds: string[]) => {
      const targetOrders = activeOrders.filter(o => orderIds.includes(o.id));
      const amountToPay = targetOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
      const title = orderIds.length === 1 
          ? `Pedido #${targetOrders[0]?.formattedOrderNumber} - Crazy Art`
          : `Faturas (${orderIds.length}) - Crazy Art`;

      const isSingleOrder = orderIds.length === 1;
      const isEligibleForPartial = isSingleOrder && amountToPay > 50;

      if (isEligibleForPartial) {
          setPendingPaymentData({ ids: orderIds, total: amountToPay, title });
          setCustomAmount((amountToPay / 2).toFixed(2));
          setPaymentType('total');
          setIsValueModalOpen(true);
      } else {
          executePayment(orderIds, amountToPay, title);
      }
  };

  const executePayment = async (orderIds: string[], amount: number, title: string) => {
    if (orderIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
        const res = await api.createPayment({
            orderId: orderIds.join(','),
            title: amount < (pendingPaymentData?.total || 0) ? `[PARCIAL] ${title}` : title,
            amount: amount,
            payerEmail: currentCustomer?.email,
            payerName: currentCustomer?.name
        });

        if (res && res.init_point) {
            window.open(res.init_point, '_blank');
            setIsValueModalOpen(false);
        } else {
            alert('Erro ao gerar link de pagamento.');
        }
    } catch (e: any) {
        alert('Erro: ' + e.message);
    } finally {
        setIsBatchProcessing(false);
    }
  };

  const handleConfirmValueModal = () => {
      if (!pendingPaymentData) return;
      const finalAmount = paymentType === 'total' 
          ? pendingPaymentData.total 
          : parseFloat(customAmount.replace(',', '.'));

      if (isNaN(finalAmount) || finalAmount <= 0) {
          alert('Por favor, insira um valor válido.');
          return;
      }

      executePayment(pendingPaymentData.ids, finalAmount, pendingPaymentData.title);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30">
                <Package size={32} />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Meus Pedidos</h1>
                <p className="text-zinc-400 text-sm">Acompanhe o status de produção e entrega.</p>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-end gap-3">
              {/* Informativo de Crédito */}
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl w-full md:w-64 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wide">Crédito Disponível</span>
                      <CreditCard size={16} className="text-emerald-500" />
                  </div>
                  <span className="text-2xl font-mono font-bold text-white">R$ {Math.max(0, availableCredit).toFixed(2)}</span>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, 100 - usedPercentage)}%` }}></div>
                  </div>
              </div>

              {totalOpen > 0 && (
                  <button 
                      onClick={() => initiatePaymentFlow(activeOrders.filter(o => o.status === 'open').map(o => o.id))}
                      disabled={isBatchProcessing}
                      className="w-full md:w-64 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 active:scale-95"
                  >
                      {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
                      Pagar Tudo (R$ {totalOpen.toFixed(2)})
                  </button>
              )}
          </div>
      </div>

      {activeOrders.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
              <ShoppingBag size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-medium">Você não tem pedidos ativos no momento.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-6">
              {activeOrders.map(order => (
                  <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-lg flex flex-col md:flex-row min-h-[220px]">
                      
                      {/* Coluna Esquerda: Informações Técnicas */}
                      <div className="md:w-1/3 bg-zinc-950 p-6 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-800 relative">
                          <div className="space-y-4 relative z-10">
                              <div>
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Nº do Pedido</span>
                                  <span className="text-2xl font-mono text-white font-bold">#{order.formattedOrderNumber}</span>
                              </div>
                              
                              <div>
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Data</span>
                                  <span className="text-sm text-zinc-300 flex items-center gap-2">
                                      <Clock size={14} />
                                      {new Date(order.order_date).toLocaleDateString()}
                                  </span>
                              </div>

                              <div className="flex justify-between items-end pt-2 border-t border-zinc-800">
                                  <div>
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total</span>
                                      <span className="text-lg text-emerald-400 font-bold">R$ {Number(order.total).toFixed(2)}</span>
                                  </div>
                                  <div className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase border ${order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                      {order.status === 'paid' ? 'Pago' : 'Aguardando Pagamento'}
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Coluna Direita: Status e Descrição */}
                      <div className="md:w-2/3 p-6 flex flex-col justify-between relative overflow-hidden">
                          <div className="mb-6 relative z-10">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Detalhes</span>
                              <h3 className="text-xl font-bold text-white leading-tight">
                                  {order.description || "Pedido sem descrição"}
                              </h3>
                              {order.size_list && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded w-fit border border-blue-500/20">
                                      <Layers size={14} />
                                      <span>Contém lista de produção personalizada</span>
                                  </div>
                              )}
                          </div>

                          <div className="mt-auto relative z-10">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">Status de Produção</span>
                              <ProductionStepper status={order.production_status || 'placed'} />
                          </div>

                          {/* Botão Pagar Individual se Aberto */}
                          {order.status === 'open' && (
                              <button 
                                  onClick={() => initiatePaymentFlow([order.id])}
                                  className="absolute top-4 right-4 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg hover:scale-110 transition z-20"
                                  title="Pagar este pedido"
                              >
                                  <DollarSign size={18} />
                              </button>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* Modal Pagamento Parcial */}
      {isValueModalOpen && pendingPaymentData && (
             <div className="fixed inset-0 z-[120] flex justify-center items-start pt-12 md:pt-24 bg-black/90 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                <div className="bg-[#121215] border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-zinc-800 bg-[#0c0c0e] text-center">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <Coins size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Escolha o Valor</h2>
                        <p className="text-zinc-500 text-xs mt-1">O total do pedido é R$ {pendingPaymentData.total.toFixed(2)}</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPaymentType('total')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentType === 'total' ? 'border-primary bg-primary/10 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest mb-1">Total</span>
                                <span className="text-sm font-mono">100%</span>
                            </button>
                            <button 
                                onClick={() => setPaymentType('partial')}
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentType === 'partial' ? 'border-primary bg-primary/10 text-white' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-widest mb-1">Entrada</span>
                                <span className="text-sm font-mono">Parte</span>
                            </button>
                        </div>

                        {paymentType === 'partial' && (
                            <div className="animate-fade-in space-y-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Quanto deseja pagar agora?</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">R$</span>
                                    <input 
                                        type="text"
                                        className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white font-mono focus:border-primary outline-none text-lg"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[9px] text-zinc-600 italic">O saldo restante poderá ser pago posteriormente.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-zinc-950 flex gap-3">
                        <button onClick={() => setIsValueModalOpen(false)} className="flex-1 py-3 text-zinc-500 font-bold text-sm">Cancelar</button>
                        <button 
                            onClick={handleConfirmValueModal}
                            disabled={isBatchProcessing}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isBatchProcessing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                            CONTINUAR
                        </button>
                    </div>
                </div>
             </div>
      )}
    </div>
  );
}
