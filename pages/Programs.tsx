
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Layers, Scissors, Grid, Type } from 'lucide-react';

export default function Programs() {
  const tools = [
    {
      id: 'font-finder',
      name: 'Font Finder & Creator',
      description: 'Identifique fontes em imagens, encontre alternativas e desenhe sua própria fonte.',
      icon: Type,
      path: '/font-finder', // Rota interna
      external: false,
      comingSoon: false
    },
    {
      id: 'pixel-art',
      name: 'Pixel Art Studio',
      description: 'Crie artes e animações em pixel art quadro a quadro com exportação GIF.',
      icon: Grid,
      path: '/pixel-art',
      external: false,
      comingSoon: false
    },
    {
      id: 'remove-bg',
      name: 'Cortar Fundo',
      description: 'Remova o fundo de imagens para criar estampas limpas.',
      icon: Scissors,
      path: '/remove-bg',
      external: false,
      comingSoon: false
    },
    {
      id: 'layout-builder',
      name: 'Monte seu Layout',
      description: 'Visualize camisas e shorts em 3D e exporte o modelo.',
      icon: Layers,
      path: '/layout-builder',
      external: false,
      comingSoon: true
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-text p-6">
      <div className="max-w-7xl mx-auto mb-8 flex items-center space-x-4">
        <Link to="/" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Programas & Ferramentas</h1>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const CardContent = () => (
            <>
              <div className="w-full flex justify-between items-start">
                  <div className={`p-3 rounded-lg transition duration-300 ${tool.comingSoon ? 'bg-zinc-800 text-zinc-600' : 'bg-primary/10 text-primary group-hover:scale-110'}`}>
                    <tool.icon size={32} />
                  </div>
                  {tool.comingSoon ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 text-zinc-500 px-2 py-1 rounded border border-zinc-700">Em Breve</span>
                  ) : tool.external ? (
                    <ExternalLink size={20} className="text-zinc-600 group-hover:text-white transition" />
                  ) : null}
              </div>
              <div>
                <h3 className={`text-xl font-bold mb-2 ${tool.comingSoon ? 'text-zinc-500' : 'text-white'}`}>{tool.name}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{tool.description}</p>
              </div>
            </>
          );

          const className = `bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col items-start gap-4 transition group ${
            tool.comingSoon 
              ? 'opacity-60 cursor-not-allowed grayscale' 
              : 'hover:border-primary/50 hover:bg-zinc-800 hover:shadow-lg hover:shadow-primary/5 cursor-pointer'
          }`;

          if (tool.comingSoon) {
            return (
              <div key={tool.id} className={className}>
                <CardContent />
              </div>
            );
          }

          if (tool.external) {
            return (
              <a 
                key={tool.id}
                href={tool.path}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                <CardContent />
              </a>
            );
          }

          return (
            <Link 
              key={tool.id}
              to={tool.path}
              className={className}
            >
              <CardContent />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
