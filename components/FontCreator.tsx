
import React, { useState, useRef } from 'react';
import { PenTool, Download, Type, Hash, CaseSensitive, Trash2, Upload, Loader2, Languages, ArrowRightLeft, MoveHorizontal } from 'lucide-react';
import { GlyphMap, Stroke } from '../types';
import { DrawingModal } from './DrawingModal';
import { generateTTF, convertOpenTypePathToStrokes, generatePreviewFromStrokes } from '../utils/fontGenerator';
import opentype from 'opentype.js';

const CHAR_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  numbers: '0123456789?!@#$&%+-/*='.split(''),
  accents: 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ'.split('')
};

export const FontCreator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lowercase' | 'uppercase' | 'numbers' | 'accents'>('lowercase');
  const [glyphs, setGlyphs] = useState<GlyphMap>({});
  const [fontName, setFontName] = useState("MinhaFonte");
  const [editingChar, setEditingChar] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Novo Estado: Espaçamento (Tracking)
  const [spacing, setSpacing] = useState(40); // Valor padrão
  
  const fullFontInputRef = useRef<HTMLInputElement>(null);

  const currentChars = CHAR_SETS[activeTab];

  const handleOpenChar = (char: string) => {
    setEditingChar(char);
  };

  const handleSaveChar = (strokes: Stroke[], previewUrl: string) => {
    if (editingChar) {
      setGlyphs(prev => ({
        ...prev,
        [editingChar]: { char: editingChar, strokes, previewUrl }
      }));
      setEditingChar(null);
    }
  };

  const handleNextChar = (strokes: Stroke[], previewUrl: string) => {
    if (editingChar) {
      setGlyphs(prev => ({
        ...prev,
        [editingChar]: { char: editingChar, strokes, previewUrl }
      }));

      const currentIndex = currentChars.indexOf(editingChar);
      if (currentIndex < currentChars.length - 1) {
        setEditingChar(currentChars[currentIndex + 1]);
      } else {
        setEditingChar(null);
      }
    }
  };

  const handleExport = async () => {
    if (Object.keys(glyphs).length === 0) {
      alert("Desenhe pelo menos um caractere para exportar.");
      return;
    }
    
    setIsExporting(true);
    try {
      // Passa o espaçamento para o gerador
      const buffer = await generateTTF(fontName, glyphs, spacing);
      
      const blob = new Blob([buffer], { type: 'font/ttf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fontName.replace(/\s+/g, '-')}.ttf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro exportando fonte:", e);
      alert("Erro ao criar arquivo de fonte.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Lógica de Importação (Simplified for snippet context) ---
  const handleFullFontImport = (e: React.ChangeEvent<HTMLInputElement>) => {
     // Mantido igual ao original...
     const file = e.target.files?.[0];
     if (!file) return;
     // ... (lógica de importação inalterada para brevidade, se precisar posso repetir)
  };

  const getProgress = () => {
    const total = CHAR_SETS.lowercase.length + CHAR_SETS.uppercase.length + CHAR_SETS.numbers.length + CHAR_SETS.accents.length;
    const current = Object.keys(glyphs).length;
    return Math.round((current / total) * 100);
  };

  const isLast = editingChar ? currentChars.indexOf(editingChar) === currentChars.length - 1 : false;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
        <div className="w-full md:w-auto space-y-4">
          <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Nome da Fonte</label>
              <input 
                type="text" 
                value={fontName}
                onChange={(e) => setFontName(e.target.value)}
                className="bg-slate-900 border border-slate-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-64"
                placeholder="Ex: MinhaFonte"
              />
          </div>
          
          {/* Slider de Espaçamento */}
          <div>
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MoveHorizontal className="w-4 h-4 text-blue-400" />
                  Espaçamento entre Letras (Kerning Global)
              </label>
              <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="150" 
                    value={spacing} 
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="w-full md:w-48 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm font-mono text-blue-400 min-w-[3ch]">{spacing}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Aumente para separar mais as letras.</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto flex-wrap justify-end self-end">
          <div className="flex-1 md:flex-none">
             <div className="flex justify-between text-xs text-slate-400 mb-1">
               <span>Progresso</span>
               <span>{getProgress()}%</span>
             </div>
             <div className="h-2 w-full md:w-32 bg-slate-700 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                 style={{ width: `${getProgress()}%` }}
               />
             </div>
          </div>
          
          <button 
            onClick={() => fullFontInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-purple-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar
          </button>
          <input 
             type="file" 
             accept=".ttf,.otf" 
             className="hidden" 
             ref={fullFontInputRef} 
             onChange={handleFullFontImport} 
          />

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Gerando...' : 'Exportar .TTF'}
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button 
          onClick={() => setActiveTab('lowercase')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap
            ${activeTab === 'lowercase' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
          `}
        >
          <span className="text-lg">a-z</span> Minúsculas
        </button>
        <button 
          onClick={() => setActiveTab('uppercase')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap
            ${activeTab === 'uppercase' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
          `}
        >
          <CaseSensitive className="w-5 h-5" /> Maiúsculas
        </button>
        <button 
          onClick={() => setActiveTab('numbers')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap
            ${activeTab === 'numbers' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
          `}
        >
          <Hash className="w-5 h-5" /> Núm. & Símbolos
        </button>
        <button 
          onClick={() => setActiveTab('accents')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap
            ${activeTab === 'accents' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
          `}
        >
          <Languages className="w-5 h-5" /> Acentuação
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {currentChars.map(char => {
          const hasData = !!glyphs[char];
          return (
            <div key={char} className="flex flex-col gap-2">
              <div 
                className={`
                  aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 relative bg-slate-800
                  ${hasData 
                    ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                    : 'border-slate-700 hover:border-slate-500'
                  }
                `}
                onClick={() => handleOpenChar(char)}
              >
                <span className="absolute top-2 left-3 text-xs font-bold text-slate-500">{char}</span>
                
                {hasData ? (
                  <img 
                    src={glyphs[char].previewUrl} 
                    alt={char} 
                    className="w-3/4 h-3/4 object-contain invert"
                    style={{ filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.5))' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-lg bg-slate-700/50" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-blue-500/0 hover:bg-blue-500/10 rounded-xl transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <PenTool className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DrawingModal 
        char={editingChar || ''}
        isOpen={!!editingChar}
        onClose={() => setEditingChar(null)}
        initialStrokes={editingChar && glyphs[editingChar] ? glyphs[editingChar].strokes : []}
        onSave={handleSaveChar}
        onNext={handleNextChar}
        isLast={isLast}
      />
    </div>
  );
};
