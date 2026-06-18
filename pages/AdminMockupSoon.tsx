import React from 'react';
import { Sparkles, Layers, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminMockupSoon() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center select-none relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#a855f7]/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 glass-panel border border-white/5 bg-zinc-950/40 p-12 rounded-3xl max-w-lg w-full flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(168,85,247,0.05)]">
        <div className="w-16 h-16 rounded-2xl bg-[#a855f7]/10 flex items-center justify-center border border-[#a855f7]/20 text-[#a855f7] animate-bounce-slow">
          <Layers size={32} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-zinc-400 font-mono text-xs uppercase tracking-widest">
            <Sparkles size={12} className="text-[#a855f7]" />
            <span>Painel Administrativo</span>
            <Sparkles size={12} className="text-[#a855f7]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Mockup 2D do Admin</h1>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
          A aba de controle de Mockups 2D para administradores está sendo desenvolvida. Em breve, você poderá gerenciar modelos de camisas, shorts e outros produtos diretamente deste painel!
        </p>

        <div className="w-full h-[1px] bg-white/5 my-2"></div>

        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all font-medium text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
}
