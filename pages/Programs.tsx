
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Layers, Scissors, Grid, Type, Sparkles, Zap, Box, FileText, Printer, Cloud } from 'lucide-react';

export default function Programs() {
  const tools = [
    {
      id: 'font-finder',
      name: 'Font Finder',
      sub: '& Creator',
      description: 'Identifique e crie tipografias.',
      icon: Type,
      path: '/font-finder',
      external: false,
      comingSoon: false,
      gridClass: 'md:col-span-2 md:row-span-2',
      gradient: 'from-fuchsia-900/40 via-purple-900/20 to-black',
      flareColor: 'bg-fuchsia-500',
      iconColor: 'text-fuchsia-300',
      bgImage: 'radial-gradient(circle at 10% 20%, rgba(192, 38, 211, 0.15) 0%, transparent 50%)'
    },
    {
      id: 'print-check',
      name: 'Print',
      sub: 'Check',
      description: 'Validador de arquivos para impressão (DPI, Cores).',
      icon: Printer,
      path: '/print-check',
      external: false,
      comingSoon: false,
      gridClass: 'md:col-span-1 md:row-span-2',
      gradient: 'from-cyan-900/40 via-sky-900/20 to-black',
      flareColor: 'bg-cyan-500',
      iconColor: 'text-cyan-300',
      bgImage: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15) 0%, transparent 60%)'
    },
    {
      id: 'pdf-to-word',
      name: 'PDF',
      sub: 'to Word',
      description: 'Extraia texto de PDFs para DOCX.',
      icon: FileText,
      path: '/pdf-to-word',
      external: false,
      comingSoon: false,
      gridClass: 'md:col-span-1 md:row-span-1',
      gradient: 'from-blue-900/40 via-indigo-900/20 to-black',
      flareColor: 'bg-blue-500',
      iconColor: 'text-blue-300',
      bgImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)'
    },
    {
      id: 'pixel-art',
      name: 'Pixel Art',
      sub: 'Studio',
      description: 'Animação frame-a-frame.',
      icon: Grid,
      path: '/pixel-art',
      external: false,
      comingSoon: false,
      gridClass: 'md:col-span-1 md:row-span-1',
      gradient: 'from-emerald-900/40 via-teal-900/20 to-black',
      flareColor: 'bg-teal-500',
      iconColor: 'text-teal-300',
      bgImage: 'radial-gradient(circle at 90% 90%, rgba(20, 184, 166, 0.15) 0%, transparent 60%)'
    },
    {
      id: 'remove-bg',
      name: 'Remove BG',
      sub: 'Magic Cut',
      description: 'Recorte automático e manual.',
      icon: Scissors,
      path: '/remove-bg',
      external: false,
      comingSoon: false,
      gridClass: 'md:col-span-1 md:row-span-1',
      gradient: 'from-violet-900/40 via-purple-900/20 to-black',
      flareColor: 'bg-violet-500',
      iconColor: 'text-violet-300',
      bgImage: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.2) 0%, transparent 70%)'
    },
    {
      id: 'layout-builder',
      name: 'Mockup 3D',
      sub: 'Builder',
      description: 'Visualize camisas e shorts.',
      icon: Box,
      path: '/layout-builder',
      external: false,
      comingSoon: true,
      gridClass: 'md:col-span-1 md:row-span-1',
      gradient: 'from-orange-900/40 via-amber-900/20 to-black',
      flareColor: 'bg-orange-500',
      iconColor: 'text-orange-300',
      bgImage: 'radial-gradient(circle at 0% 100%, rgba(249, 115, 22, 0.2) 0%, transparent 60%)'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] animate-float"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-12 animate-fade-in-up">
            <Link to="/" className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95 backdrop-blur-md">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight font-heading uppercase flex items-center gap-3">
                    <Sparkles className="text-primary animate-pulse" />
                    Ferramentas
                </h1>
                <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">CRAZY ART STUDIO • SUITE CRIATIVA</p>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 auto-rows-[200px] gap-4">
            {tools.map((tool, idx) => {
                const CardContent = () => (
                    <div className="relative h-full w-full p-6 flex flex-col justify-between z-10">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500 ${tool.iconColor}`}>
                                <tool.icon size={32} strokeWidth={1.5} />
                            </div>
                            {tool.comingSoon ? (
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-black/40 text-zinc-500 px-2 py-1 rounded border border-white/5 backdrop-blur-md">Em Breve</span>
                            ) : tool.external ? (
                                <ExternalLink size={20} className="text-white/30 group-hover:text-white transition" />
                            ) : (
                                <div className={`w-2 h-2 rounded-full ${tool.flareColor} animate-pulse shadow-[0_0_10px_currentColor]`}></div>
                            )}
                        </div>

                        <div className="space-y-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-2xl font-black text-white leading-none uppercase tracking-wide">
                                {tool.name}
                                {tool.sub && <span className={`block text-lg font-medium opacity-80 ${tool.iconColor}`}>{tool.sub}</span>}
                            </h3>
                            <p className="text-xs text-zinc-400 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                {tool.description}
                            </p>
                        </div>
                    </div>
                );

                const WrapperClass = `
                    relative group overflow-hidden rounded-3xl border border-white/10 
                    bg-gradient-to-br ${tool.gradient} backdrop-blur-2xl
                    transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-white/20
                    ${tool.gridClass} ${tool.comingSoon ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer'}
                    animate-scale-in
                `;

                const BackgroundEffects = () => (
                    <>
                        <div className="absolute inset-0 bg-grid-pattern opacity-10 mix-blend-overlay pointer-events-none"></div>
                        <div 
                            className="absolute inset-0 transition-opacity duration-700 opacity-60 group-hover:opacity-100"
                            style={{ background: tool.bgImage }}
                        ></div>
                        <div className={`absolute -right-20 -bottom-20 w-64 h-64 ${tool.flareColor} blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-full pointer-events-none`}></div>
                    </>
                );

                if (tool.comingSoon) {
                    return (
                        <div key={tool.id} className={WrapperClass} style={{ animationDelay: `${idx * 100}ms` }}>
                            <BackgroundEffects />
                            <CardContent />
                        </div>
                    );
                }

                if (tool.external) {
                    return (
                        <a key={tool.id} href={tool.path} target="_blank" rel="noopener noreferrer" className={WrapperClass} style={{ animationDelay: `${idx * 100}ms` }}>
                            <BackgroundEffects />
                            <CardContent />
                        </a>
                    );
                }

                return (
                    <Link key={tool.id} to={tool.path} className={WrapperClass} style={{ animationDelay: `${idx * 100}ms` }}>
                        <BackgroundEffects />
                        <CardContent />
                    </Link>
                );
            })}
            
            <div className="md:col-span-1 md:row-span-1 relative rounded-3xl border border-dashed border-white/10 flex items-center justify-center p-6 group hover:border-white/20 transition-colors cursor-default">
                <div className="text-center opacity-30 group-hover:opacity-50 transition-opacity">
                    <Zap size={32} className="mx-auto mb-2" />
                    <p className="text-xs uppercase font-bold tracking-widest">Mais em breve</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
