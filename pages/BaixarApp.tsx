import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Smartphone, 
  RefreshCw, 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Apple, 
  Chrome, 
  Compass, 
  Star 
} from 'lucide-react';

export default function BaixarApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');

  useEffect(() => {
    // Standalone mode check
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Platform detection
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const android = /android/i.test(userAgent);
    setIsIOS(ios);
    setIsAndroid(android);

    // Handle install prompt event
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert('No Safari do seu iPhone, toque no botão de Compartilhar (o ícone de quadrado com uma seta apontando para cima) e depois selecione "Adicionar à Tela de Início".');
    } else {
      alert('Para instalar, clique no ícone de instalação de aplicativo no menu de três pontos do seu navegador ou na barra de endereços.');
    }
  };

  const changelog = [
    {
      version: 'v1.2.0',
      date: 'Junho de 2026',
      title: 'Vetorização e Moldes Pro',
      items: [
        'Adicionado gerenciador e montagem inteligente de moldes industriais.',
        'Nova ferramenta de Vetorização Inteligente e ampliação em lote.',
        'Extrato financeiro aprimorado com fluxo de caixa e detalhamento de transações.',
        'Melhoria drástica na velocidade de carregamento offline com novo Cache Service Worker.',
      ]
    },
    {
      version: 'v1.1.0',
      date: 'Maio de 2026',
      title: 'Painel de Clientes e Pagamentos',
      items: [
        'Integração direta com o Mercado Pago para pagamentos via PIX imediatos.',
        'Área do cliente renovada para rastreamento em tempo real de pedidos de estamparia.',
        'Central de notificações em tempo real para avisar sobre alteração de status de pedidos.',
      ]
    },
    {
      version: 'v1.0.0',
      date: 'Abril de 2026',
      title: 'Lançamento Crazy Art',
      items: [
        'Lançamento oficial da plataforma de comunicação visual Crazy Art.',
        'Catálogo de artes vetoriais e cupons de fidelidade ativos.',
        'Sistema básico de pedidos e cadastro de clientes com banco de dados integrado.',
      ]
    }
  ];

  const timesFont = { fontFamily: '"Times New Roman", Times, serif' };

  return (
    <div className="min-h-screen text-zinc-300 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="text-center mb-12">
        <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-4 shadow-lg shadow-primary/5 border border-primary/20">
          <Smartphone size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-wider uppercase mb-3" style={timesFont}>
          Crazy Art App
        </h1>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          Tenha a melhor experiência em comunicação visual diretamente no seu celular ou computador. Rápido, seguro e sempre atualizado.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-10">
        <div className="bg-zinc-900/60 backdrop-blur-md p-1 border border-zinc-800 rounded-xl flex gap-1">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeTab === 'pwa'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Zap size={14} />
            PWA (Recomendado)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
              activeTab === 'apk'
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Download size={14} />
            APK Nativo (Android)
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Conteúdo da Tab */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'pwa' ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/50">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap size={18} className="text-primary" /> Instalação Inteligente
                </h2>
                <span className="text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-full uppercase">
                  Sem Downloads Pesados
                </span>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                A nossa plataforma foi construída utilizando a tecnologia de <strong>Progressive Web App (PWA)</strong>. Isso significa que você pode instalá-la como um aplicativo nativo no celular ou computador, mas sem consumir espaço de armazenamento precioso!
              </p>

              {/* Vantagens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  { title: 'Atualizações Automáticas', desc: 'Sempre que o site for atualizado, seu app se atualiza sozinho sem precisar reinstalar.' },
                  { title: 'Leve e Rápido', desc: 'Ocupa menos de 1MB de espaço e carrega os botões e ferramentas instantaneamente.' },
                  { title: 'Offline Ready', desc: 'Guarda em cache seus principais dados para navegação contínua mesmo sem internet estável.' },
                  { title: 'Segurança Máxima', desc: 'Roda no ambiente isolado e seguro do seu navegador com criptografia HTTPS total.' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-black/20 border border-zinc-800/40 p-4 rounded-xl flex gap-3">
                    <CheckCircle2 className="text-primary shrink-0 mt-0.5" size={16} />
                    <div>
                      <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">{item.title}</h4>
                      <p className="text-zinc-500 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão de Instalação Dinâmica */}
              {isStandalone ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4 text-emerald-400 mb-6">
                  <CheckCircle2 size={24} className="shrink-0" />
                  <div>
                    <h4 className="text-white font-bold text-sm">Você já está usando o aplicativo!</h4>
                    <p className="text-zinc-500 text-xs mt-0.5">Essa é a versão oficial de alta performance instalada.</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePwaInstall}
                  className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-4 px-6 rounded-xl transition flex items-center justify-center gap-3 shadow-lg shadow-primary/20 uppercase tracking-wider text-xs active:scale-[0.98]"
                >
                  <Smartphone size={16} />
                  {isIOS ? 'Como Instalar no iPhone' : 'Instalar Aplicativo'}
                </button>
              )}

              {/* Instruções por Dispositivo */}
              <div className="mt-8 pt-6 border-t border-zinc-800/50 space-y-4">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <Info size={14} className="text-zinc-400" /> Como Instalar Manualmente:
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex gap-3 items-start bg-black/20 p-3 rounded-lg border border-zinc-800/30">
                    <Chrome size={18} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold block uppercase tracking-wider mb-0.5">Android (Google Chrome)</span>
                      <p className="text-zinc-500 leading-relaxed">Abra o site no Chrome, clique nos <strong className="text-zinc-400">três pontinhos</strong> no canto superior direito e selecione <strong className="text-zinc-300">"Adicionar à Tela de Início"</strong> ou <strong className="text-zinc-300">"Instalar Aplicativo"</strong>.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-black/20 p-3 rounded-lg border border-zinc-800/30">
                    <Apple size={18} className="text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold block uppercase tracking-wider mb-0.5">iOS / iPhone (Safari)</span>
                      <p className="text-zinc-500 leading-relaxed">Abra o site no navegador Safari, clique no ícone de <strong className="text-zinc-400">Compartilhar</strong> (quadrado com seta para cima) e role para baixo até selecionar <strong className="text-zinc-300">"Adicionar à Tela de Início"</strong>.</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start bg-black/20 p-3 rounded-lg border border-zinc-800/30">
                    <Compass size={18} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold block uppercase tracking-wider mb-0.5">Computador / Desktop</span>
                      <p className="text-zinc-500 leading-relaxed">No computador, basta clicar no ícone de <strong className="text-zinc-400">monitor com uma seta para baixo</strong> que aparece na barra de endereços (lado direito, ao lado da estrela de favoritos).</p>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800/50">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Download size={18} className="text-primary" /> Arquivo APK Nativo
                </h2>
                <span className="text-[10px] font-bold tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full uppercase">
                  Para Celulares Android
                </span>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Se você faz questão de um instalador clássico em formato <strong>.APK</strong> para o seu dispositivo Android ou quer distribuí-lo de forma independente, oferecemos o download do pacote APK nativo.
              </p>

              {/* Botão de Download do APK */}
              <div className="bg-black/30 border border-zinc-800 p-6 rounded-2xl text-center mb-8">
                <p className="text-zinc-400 text-xs mb-4">Clique no botão abaixo para baixar a versão estável oficial do Crazy Art.</p>
                <a
                  href="/crazy-art.apk"
                  download="crazy-art.apk"
                  className="inline-flex bg-primary hover:bg-opacity-90 text-white font-bold py-4 px-8 rounded-xl transition items-center justify-center gap-3 shadow-lg shadow-primary/20 uppercase tracking-wider text-xs active:scale-[0.98] w-full sm:w-auto"
                >
                  <Download size={16} />
                  Baixar CrazyArt.apk
                </a>
                <p className="text-[10px] text-zinc-500 mt-3 flex items-center justify-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-500" /> Verificado contra ameaças (Livre de Malware)
                </p>
              </div>

              {/* Seção Administrador / Como Gerar */}
              <div className="bg-zinc-950/60 border border-zinc-800 p-5 rounded-2xl">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Terminal size={14} className="text-zinc-400" /> Nota para o Desenvolvedor / Administrador
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed mb-4">
                  O nosso site já é totalmente responsivo e roda em formato de Webview nativa. Para atualizar o arquivo APK disponibilizado nesta página:
                </p>
                
                <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-400 space-y-3 overflow-x-auto">
                  <div>
                    <span className="text-zinc-600 block"># 1. Instale o Capacitor para Android</span>
                    <span className="text-primary">npm i @capacitor/core @capacitor/cli @capacitor/android</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 block"># 2. Inicialize o projeto e adicione a plataforma</span>
                    <span className="text-primary">npx cap init "Crazy Art" "com.crazyart.app" --web-dir=dist</span>
                    <span className="text-primary block">npx cap add android</span>
                  </div>
                  <div>
                    <span className="text-zinc-600 block"># 3. Compile as artes e abra no Android Studio para gerar o APK assinado</span>
                    <span className="text-primary">npm run build && npx cap sync && npx cap open android</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 items-start bg-zinc-900/40 p-3 rounded-lg text-zinc-500 text-[11px] leading-relaxed border border-zinc-800/50">
                  <Info size={14} className="text-primary shrink-0 mt-0.5" />
                  <span>Você também pode usar um conversor online gratuito como o <strong className="text-zinc-400">PWA2APK</strong> ou o <strong className="text-zinc-400">Bubblewrap da Google</strong>. Cole o link do site e ele gerará um arquivo `.apk` instantâneo. Em seguida, salve o arquivo gerado dentro da pasta <strong className="text-zinc-400">/public</strong> com o nome <strong className="text-zinc-400">crazy-art.apk</strong>.</span>
                </div>
              </div>

            </motion.div>
          )}
        </div>

        {/* Lado Direito: Histórico de Versões e Atualizações */}
        <div className="space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 relative overflow-hidden">
            <h2 className="text-md font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <RefreshCw size={16} className="text-primary animate-spin-slow" /> Central de Atualizações
            </h2>

            <div className="space-y-6 relative border-l border-zinc-800 pl-4 ml-2">
              {changelog.map((version, idx) => (
                <div key={idx} className="relative">
                  {/* Marcador de linha do tempo */}
                  <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-zinc-950 ${
                    idx === 0 ? 'bg-primary shadow-[0_0_8px_#f59e0b]' : 'bg-zinc-800'
                  }`}></div>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white font-black font-mono text-sm">{version.version}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{version.date}</span>
                  </div>
                  
                  <h4 className="text-zinc-300 font-bold text-xs uppercase tracking-wider mb-2">
                    {version.title}
                  </h4>

                  <ul className="space-y-1.5">
                    {version.items.map((item, iIdx) => (
                      <li key={iIdx} className="text-zinc-500 text-xs leading-relaxed flex items-start gap-1.5">
                        <span className="text-primary shrink-0 font-bold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-4 border-t border-zinc-800/50 text-center">
              <div className="inline-flex items-center gap-1.5 bg-zinc-950/40 px-3 py-1.5 rounded-full border border-zinc-800">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Suporte Contínuo Crazy Art
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
