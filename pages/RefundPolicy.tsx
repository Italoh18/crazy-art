import React, { useEffect } from "react";
import { ShieldAlert, ArrowLeft, RefreshCw, FileText, Ban } from "lucide-react";
import { Link } from "react-router-dom";

export default function RefundPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-300">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Breadcrumb / Back button */}
        <div className="flex items-center space-x-2">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition duration-200"
          >
            <ArrowLeft size={14} /> Voltar para a Loja
          </Link>
        </div>

        {/* Hero Section / Header */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/10 shrink-0">
              <ShieldAlert size={28} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider font-mono">
                Atendimento &amp; Garantia
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Política de Reembolso e Devolução
              </h1>
            </div>
          </div>
          
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Entenda como funcionam as regras de reembolso na nossa quitanda de artes. Por fornecermos produtos de consumo e entrega digital imediata, possuímos diretrizes específicas de acordo com o Código de Defesa do Consumidor.
          </p>
        </div>

        {/* Policy Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Sem Devolução devido à Natureza */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-3">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/10 text-red-400 rounded-lg flex items-center justify-center">
              <Ban size={20} />
            </div>
            <h3 className="font-bold text-white text-base">Sem Devoluções</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Artes digitais, matrizes de bordado e moldes digitais são produtos consumíveis de entrega imediata e download instantâneo. Uma vez baixados, não podem ser &quot;devolvidos&quot;.
            </p>
          </div>

          {/* Card 2: Código de Defesa do Consumidor */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/10 text-primary rounded-lg flex items-center justify-center">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-white text-base">Legislação Aplicável</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              De acordo com a regulamentação para produtos digitais intangíveis de baixo custo comercial, o direito de arrependimento deixa de ser aplicável após o download efetivo do arquivo.
            </p>
          </div>

          {/* Card 3: Garantia e Suporte */}
          <div className="glass-panel p-6 rounded-xl border border-white/5 space-y-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <h3 className="font-bold text-white text-base">Suporte &amp; Correção</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Se qualquer item apresentar falha técnica ou erro na extensão/formato do arquivo, daremos suporte total para corrigir o problema ou fornecer um novo link de download.
            </p>
          </div>

        </div>

        {/* Detailed Explanation Text */}
        <div className="glass-panel p-8 rounded-2xl border border-white/5 space-y-6 leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">1. Por que não aceitamos devoluções?</h2>
            <p className="text-sm text-zinc-400">
              Nossa loja vende pacotes e arquivos de formato digital (como matrizes de bordado, PDF de gabaritos, arquivos CDR para CorelDraw e arquivos de imagem para estamparia). Diferente de mercadorias físicas, o produto digital é consumido de forma imediata ao ser baixado no computador ou celular. Pela impossibilidade de &quot;devolver&quot; a cópia digital do arquivo ou garantir sua não utilização, a compra de novos itens é considerada final e não reembolsável após o download.
            </p>
          </section>

          <section className="space-y-2 border-t border-white/5 pt-6">
            <h2 className="text-lg font-bold text-white">2. Exceções e Problemas Técnicos</h2>
            <p className="text-sm text-zinc-400">
              A satisfação dos nossos clientes é nossa maior prioridade. Analisamos casos de reembolso individualmente apenas sob as seguintes situações excepcionais:
            </p>
            <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1">
              <li>
                <strong>Arquivo com defeito técnico comprovado:</strong> se a matriz ou molde apresentar erros em softwares gráficos padrão do mercado e nosso suporte técnico não conseguir resolver o problema dentro de um prazo razoável.
              </li>
              <li>
                <strong>Pagamento duplicado:</strong> se o sistema cobrar acidentalmente duas ou mais vezes pelo mesmo item em um curto intervalo de tempo.
              </li>
              <li>
                <strong>Compra errada antes do download:</strong> se o cliente comprou por engano e <span className="text-white underline">absolutamente nenhum download</span> foi realizado na sua área de cliente.
              </li>
            </ul>
          </section>

          <section className="space-y-2 border-t border-white/5 pt-6">
            <h2 className="text-lg font-bold text-white">3. Como Solicitar Ajuda ou Suporte</h2>
            <p className="text-sm text-zinc-400">
              Se você comprou um produto que apresenta qualquer problema, não se preocupe! Não hesite em entrar em contato direto com a nossa equipe de atendimento. Forneceremos uma solução rápida, seja reformatando o arquivo, trocando de extensão ou auxiliando na abertura técnica dos moldes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a
                href="https://wa.me/5516994142665"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition duration-200 text-sm"
              >
                Atendimento via WhatsApp
              </a>
              <a
                href="mailto:crazyartoficial@outlook.com"
                className="inline-flex justify-center items-center px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 font-bold rounded-xl transition duration-200 text-sm"
              >
                Enviar E-mail para Suporte
              </a>
            </div>
          </section>

          <section className="space-y-1 border-t border-white/5 pt-6 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
            <p>Crazy Art Ltda.</p>
            <p>Atualizado em: Junho de 2026</p>
          </section>

        </div>

      </div>
    </div>
  );
}
