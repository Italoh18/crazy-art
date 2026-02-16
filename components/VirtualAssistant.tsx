
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, ChevronRight, MessageSquare, AlertTriangle, Lightbulb, ThumbsUp, Heart, ShoppingBag, CreditCard, Headset, Star, Check } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  options?: { label: string, value: string, icon?: any }[];
  isRating?: boolean; // Flag para renderizar estrelas
}

export const VirtualAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<'init' | 'menu' | 'input_feedback' | 'rating'>('init');
  const [feedbackType, setFeedbackType] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Mensagem Inicial
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage("Olá, muito bom ver você por aqui! Sou assistente virtual da Crazy Art e estou aqui para o que precisar!");
      setTimeout(() => {
          addBotMessage("Me fala como posso te chamar?");
      }, 800);
    }
  }, [isOpen]);

  const addBotMessage = (text: string, options?: any[], isRating = false) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), text, sender: 'bot', options, isRating }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), text, sender: 'user' }]);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    addUserMessage(text);

    // Lógica do Chat
    if (step === 'init') {
        setUserName(text);
        setStep('menu');
        setTimeout(() => {
            addBotMessage(`${text}, como posso ajudar você hoje?`, getMenuOptions());
        }, 600);
    } else if (step === 'input_feedback') {
        // Enviar Feedback
        try {
            await fetch('/api/feedbacks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: feedbackType,
                    content: text,
                    userName: userName
                })
            });
            setTimeout(() => {
                addBotMessage("Sua mensagem foi registrada com sucesso! Nossa equipe irá analisar.");
                askIfNeedMoreHelp();
            }, 500);
            setStep('menu'); // Prepara state mas espera interação
        } catch (e) {
            addBotMessage("Ops, houve um erro ao enviar. Tente novamente.");
        }
    }
  };

  const handleRating = async (rating: number) => {
      // Salvar avaliação
      try {
          await fetch('/api/ratings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rating, userName })
          });
      } catch (e) { console.error(e); }

      addUserMessage(`${rating} estrelas`);
      setTimeout(() => {
          addBotMessage("Obrigado pela sua avaliação! A Crazy Art agradece.");
          setTimeout(() => {
              setIsOpen(false);
              // Reset opcional se quiser limpar o chat ao reabrir
              // setMessages([]); 
              // setStep('init');
          }, 2000);
      }, 500);
  };

  const handleOptionClick = (value: string) => {
      // Se for opção do menu principal
      if (value === 'menu_options') {
          setStep('menu');
          addBotMessage("Aqui estão as opções:", getMenuOptions());
          return;
      }
      
      // Fluxo de encerramento
      if (value === 'yes_help') {
          setStep('menu');
          addBotMessage("O que mais você precisa?", getMenuOptions());
          return;
      }
      if (value === 'no_help') {
          setStep('rating');
          addBotMessage("Que bom ter ajudado! Por favor, avalie meu atendimento:", undefined, true);
          return;
      }

      // Respostas diretas
      if (value === 'credito') {
          addUserMessage("Sistema de crédito");
          setTimeout(() => {
              addBotMessage("O Sistema de Crédito da Crazy Art funciona como uma conta corrente. Se você tiver saldo (por devoluções ou pagamentos adiantados), ele abate automaticamente no próximo pedido.");
              addBotMessage("Importante: Se houver atrasos nos pagamentos, seu limite de crédito poderá ser reduzido temporariamente.");
              askIfNeedMoreHelp();
          }, 500);
      }
      else if (value === 'pedido') {
          addUserMessage("Fazer pedido");
          setTimeout(() => {
              addBotMessage("Para fazer um pedido é muito simples: Vá até a aba 'Loja' no menu, escolha seus produtos ou serviços e adicione ao carrinho.");
              addBotMessage("Depois, basta revisar seu pedido e escolher a forma de pagamento ou faturar na sua conta (se tiver limite).");
              askIfNeedMoreHelp();
          }, 500);
      }
      else if (value === 'humano') {
          addUserMessage("Atendimento Humano");
          setTimeout(() => {
              addBotMessage("Estou te redirecionando para o WhatsApp da nossa equipe...");
              const msg = encodeURIComponent(`Olá, sou ${userName} e preciso de atendimento humano.`);
              window.open(`https://wa.me/5516994142665?text=${msg}`, '_blank');
              askIfNeedMoreHelp();
          }, 500);
      }
      // Feedbacks
      else if (['erro', 'sugestao', 'reclamacao', 'agradecimento'].includes(value)) {
          let label = "";
          if (value === 'erro') label = "Erro no site";
          if (value === 'sugestao') label = "Sugestão";
          if (value === 'reclamacao') label = "Reclamação";
          if (value === 'agradecimento') label = "Agradecimento";
          
          addUserMessage(label);
          setFeedbackType(value);
          setStep('input_feedback');
          setTimeout(() => {
              addBotMessage(`Por favor, digite abaixo os detalhes do seu ${label.toLowerCase()}:`);
          }, 500);
      }
  };

  const askIfNeedMoreHelp = () => {
      setTimeout(() => {
          addBotMessage("Ajudo em algo mais?", [
              { label: "Sim", value: "yes_help", icon: Check },
              { label: "Não", value: "no_help", icon: X }
          ]);
      }, 1500);
  };

  const getMenuOptions = () => [
      { label: "Sistema de Crédito", value: "credito", icon: CreditCard },
      { label: "Fazer Pedido", value: "pedido", icon: ShoppingBag },
      { label: "Erro no Site", value: "erro", icon: AlertTriangle },
      { label: "Sugestões", value: "sugestao", icon: Lightbulb },
      { label: "Reclamações", value: "reclamacao", icon: ThumbsUp },
      { label: "Agradecimentos", value: "agradecimento", icon: Heart },
      { label: "Atendimento Humano", value: "humano", icon: Headset },
  ];

  return (
    <>
      {/* Floating Button - Posicionado RIGOROSAMENTE no canto INFERIOR DIREITO */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 left-auto z-[9999] w-14 h-14 flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group ${isOpen ? 'bg-zinc-800 rotate-90' : 'bg-crazy-gradient animate-pulse-slow'}`}
        style={{ position: 'fixed', bottom: '24px', right: '24px' }} // Inline style force
      >
        {isOpen ? <X className="text-white" size={24} /> : <MessageCircle className="text-white" size={28} />}
        {!isOpen && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-bounce"></span>
        )}
      </button>

      {/* Chat Window - Posicionada acima do botão */}
      {isOpen && (
        <div 
            className="fixed bottom-24 right-6 w-[90vw] md:w-96 h-[500px] bg-[#121215] border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[9999] animate-scale-in origin-bottom-right"
            style={{ position: 'fixed', bottom: '96px', right: '24px' }}
        >
            {/* Header */}
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-crazy-gradient flex items-center justify-center shadow-lg">
                    <MessageSquare size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-sm">Assistente Crazy Art</h3>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-zinc-400">Online agora</span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div 
                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${
                                msg.sender === 'user' 
                                ? 'bg-zinc-800 text-white rounded-br-none' 
                                : 'bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/5 text-white rounded-bl-none'
                            }`}
                        >
                            {msg.text}
                        </div>
                        
                        {/* Rating Stars */}
                        {msg.isRating && (
                            <div className="mt-3 flex justify-center gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 w-full">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star}
                                        onClick={() => handleRating(star)}
                                        className="text-zinc-600 hover:text-yellow-400 transition-colors p-1 hover:scale-125 transform duration-200"
                                    >
                                        <Star size={24} fill="currentColor" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Options Buttons */}
                        {msg.options && (
                            <div className="mt-3 flex flex-wrap gap-2 w-full">
                                {msg.options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionClick(opt.value)}
                                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex-grow justify-center sm:flex-grow-0"
                                    >
                                        {opt.icon && <opt.icon size={14} className="text-primary" />}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {step !== 'rating' && (
                <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex gap-2">
                    <input
                        type="text"
                        placeholder={step === 'menu' ? "Selecione uma opção acima..." : "Digite sua mensagem..."}
                        className="flex-1 bg-black/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-primary outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={step === 'menu'}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!inputValue.trim() || step === 'menu'}
                        className="bg-primary hover:bg-amber-600 text-white p-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            )}
        </div>
      )}
    </>
  );
};
