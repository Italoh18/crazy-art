import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Type, Search, Copy, Check } from 'lucide-react';

const GOOGLE_FONTS_URL = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat&family=Dancing+Script&family=Lato&family=Lobster&family=Lora&family=Merriweather&family=Montserrat&family=Open+Sans&family=Oswald&family=Pacifico&family=Playfair+Display&family=Poppins&family=Roboto&family=Roboto+Slab&family=Satisfy&display=swap";

const fonts = [
  { name: 'Roboto', category: 'Sans Serif', family: 'Roboto, sans-serif' },
  { name: 'Open Sans', category: 'Sans Serif', family: '"Open Sans", sans-serif' },
  { name: 'Montserrat', category: 'Sans Serif', family: 'Montserrat, sans-serif' },
  { name: 'Lato', category: 'Sans Serif', family: 'Lato, sans-serif' },
  { name: 'Poppins', category: 'Sans Serif', family: 'Poppins, sans-serif' },
  { name: 'Playfair Display', category: 'Serif', family: '"Playfair Display", serif' },
  { name: 'Merriweather', category: 'Serif', family: 'Merriweather, serif' },
  { name: 'Lora', category: 'Serif', family: 'Lora, serif' },
  { name: 'Roboto Slab', category: 'Serif', family: '"Roboto Slab", serif' },
  { name: 'Oswald', category: 'Display', family: 'Oswald, sans-serif' },
  { name: 'Bebas Neue', category: 'Display', family: '"Bebas Neue", sans-serif' },
  { name: 'Lobster', category: 'Display', family: 'Lobster, cursive' },
  { name: 'Dancing Script', category: 'Handwriting', family: '"Dancing Script", cursive' },
  { name: 'Pacifico', category: 'Handwriting', family: 'Pacifico, cursive' },
  { name: 'Caveat', category: 'Handwriting', family: 'Caveat, cursive' },
  { name: 'Satisfy', category: 'Handwriting', family: 'Satisfy, cursive' },
];

export default function FontFinder() {
  const [previewText, setPreviewText] = useState('Crazy Art Studio');
  const [fontSize, setFontSize] = useState(32);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedFont, setCopiedFont] = useState<string | null>(null);

  // Load fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = GOOGLE_FONTS_URL;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const handleCopy = (fontName: string) => {
    navigator.clipboard.writeText(fontName);
    setCopiedFont(fontName);
    setTimeout(() => setCopiedFont(null), 2000);
  };

  const filteredFonts = selectedCategory === 'All' 
    ? fonts 
    : fonts.filter(f => f.category === selectedCategory);

  return (
    <div className="min-h-screen bg-zinc-950 text-text p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/programs" className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition">
            <ArrowLeft size={24} />
          </Link>
          <div className="flex items-center space-x-3">
             <div className="bg-primary/10 p-2 rounded-lg">
                <Type className="text-primary" size={24} />
             </div>
             <h1 className="text-3xl font-bold text-white tracking-tight">Font Finder</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Controls */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl sticky top-6 z-30 backdrop-blur-md bg-zinc-900/90">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Text Input */}
                <div className="md:col-span-6 relative">
                    <input 
                        type="text" 
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        placeholder="Digite seu texto aqui..."
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                    />
                    <Search className="absolute left-3 top-3.5 text-zinc-500" size={20} />
                </div>

                {/* Font Size Slider */}
                <div className="md:col-span-3 flex items-center space-x-3">
                    <span className="text-xs text-zinc-500 font-medium">Size</span>
                    <input 
                        type="range" 
                        min="12" 
                        max="96" 
                        value={fontSize} 
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-amber-400"
                    />
                    <span className="text-xs text-zinc-400 w-8">{fontSize}px</span>
                </div>

                {/* Category Filter */}
                <div className="md:col-span-3">
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                    >
                        <option value="All">Todas as Categorias</option>
                        <option value="Sans Serif">Sans Serif</option>
                        <option value="Serif">Serif</option>
                        <option value="Display">Display</option>
                        <option value="Handwriting">Handwriting</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Fonts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFonts.map((font) => (
                <div key={font.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition group flex flex-col h-full relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-zinc-500 text-sm font-medium">{font.name}</h3>
                            <span className="text-xs text-zinc-600 px-2 py-0.5 rounded bg-zinc-800 mt-1 inline-block">{font.category}</span>
                        </div>
                        <button 
                            onClick={() => handleCopy(font.name)}
                            className="text-zinc-600 hover:text-primary transition p-2 rounded-full hover:bg-zinc-800"
                            title="Copiar nome da fonte"
                        >
                            {copiedFont === font.name ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center min-h-[100px] overflow-hidden break-words w-full">
                        <p 
                            style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
                            className="text-white text-center leading-tight transition-all duration-200"
                        >
                            {previewText || 'Crazy Art'}
                        </p>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}