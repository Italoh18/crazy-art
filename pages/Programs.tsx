
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Type, Bot, ExternalLink, Layers, Scissors, Grid, Palette } from 'lucide-react';

export default function Programs() {
  const tools = [
    {
      id: 'layout-builder',
      name: 'Monte seu Layout',
      description: 'Visualize camisas e shorts em 3D e exporte o modelo.',
      icon: Layers,
      path: '/layout-builder',
      external: false
    },
    {
      id: 'remove-bg',
      name: 'Cortar Fundo',
      description: 'Remova o fundo de imagens para criar estampas limpas.',
      icon: Scissors,
      path: '/remove-bg',
      external: false
    },
    {
      id: 'pixel-art',
      name: 'Pixel Art Studio',
      description: 'Crie artes e animações em pixel art quadro a quadro.',
      icon: Grid,
      path: '/pixel-art',
      external: false
    },
    {
      id: 'font-finder',
      name: 'Font Finder',
      description: 'Teste e visualize fontes do Google Fonts.',
      icon: Type,
      path: '/font-finder',
      external: false
    },
    {
      id: 'ai-studio',
      name: 'Aplicativo AI Studio',
      description: 'Acesse nossa ferramenta exclusiva criada no Google AI Studio.',
      icon: Bot,
      path: 'https://ai.studio/apps/drive/1lHBVljSBNQYF2-BjhfvXGPPGKNNUqRUn',
      external: true
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
        {tools.map((tool) => (
          tool.external ? (
            <a 
              key={tool.id}
              href={tool.path}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col items-start gap-4 hover:border-primary/50 hover:bg-zinc-800 hover:shadow-lg hover:shadow-primary/5 transition group"
            >
              <div className="w-full flex justify-between items-start">
                  <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:scale-110 transition duration-300">
                    <tool.icon size={32} />
                  </div>
                  <ExternalLink size={20} className="text-zinc-600 group-hover:text-white transition" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{tool.description}</p>
              </div>
            </a>
          ) : (
            <Link 
              key={tool.id}
              to={tool.path}
              className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl flex flex-col items-start gap-4 hover:border-primary/50 hover:bg-zinc-800 hover:shadow-lg hover:shadow-primary/5 transition group"
            >
              <div className="bg-primary/10 p-3 rounded-lg text-primary group-hover:scale-110 transition duration-300">
                <tool.icon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{tool.name}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{tool.description}</p>
              </div>
            </Link>
          )
        ))}
      </div>
    </div>
  );
}
