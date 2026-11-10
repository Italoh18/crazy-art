import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Scissors, Printer, Download, Check, 
  FileText, Sparkles, AlertCircle, Eye, SlidersHorizontal
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Molde } from '../types';

interface MoldesTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialSubcategory?: string;
}

export const MOLDE_CATEGORIES = [
  { id: 'comum', name: 'Comum', sub: ['redonda', 'V', 'polo'] },
  { id: 'blk-fem', name: 'Baby Look Feminina', sub: ['redonda', 'V', 'polo'] },
  { id: 'raglan', name: 'Raglan', sub: ['redonda', 'V', 'polo'] },
  { id: 'moleton', name: 'Moleton' },
  { id: 'short', name: 'Short' },
  { id: 'calça', name: 'Calça' },
  { id: 'avental', name: 'Avental' },
  { id: 'mascara', name: 'Máscara' }
];

export const SIZES_INFANTIL = ['t2', 't4', 't6', 't8', 't10', 't12', 't14', 't16'];
export const SIZES_TRADICIONAL = ['P', 'M', 'G', 'GG', 'XG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'];
export const SIZES_BABY_LOOK = ['P', 'M', 'G', 'GG', 'XG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'];

export const formatSizeLabel = (size: string): string => {
  if (size.startsWith('t')) {
    const num = size.replace('t', '');
    return `Tam ${num.padStart(2, '0')}`;
  }
  return size;
};

// Helper para converter URL de imagem para Base64 com segurança para jsPDF
const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataURL);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
      setTimeout(() => resolve(null), 2500);
    } catch {
      resolve(null);
    }
  });
};

export default function MoldesTableModal({
  isOpen,
  onClose,
  initialCategory = 'comum',
  initialSubcategory = 'redonda'
}: MoldesTableModalProps) {
  const { moldes } = useData();

  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeSubcategory, setActiveSubcategory] = useState(initialSubcategory);
  const [activeSize, setActiveSize] = useState('G');
  const [activeTab, setActiveTab] = useState<'view' | 'export'>('view');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Seleções para Impressão e PDF
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [includeTradicional, setIncludeTradicional] = useState(true);
  const [includeInfantil, setIncludeInfantil] = useState(true);
  const [includeBabyLook, setIncludeBabyLook] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const currentCategoryObj = MOLDE_CATEGORIES.find(c => c.id === activeCategory) || MOLDE_CATEGORIES[0];

  const currentGrade = useMemo(() => {
    if (activeCategory === 'blk-fem') return SIZES_BABY_LOOK;
    return [...SIZES_INFANTIL, ...SIZES_TRADICIONAL];
  }, [activeCategory]);

  const currentMolde = useMemo(() => {
    return moldes.find(m => 
      m.category === activeCategory && 
      (currentCategoryObj.sub ? m.subcategory === activeSubcategory : true)
    );
  }, [moldes, activeCategory, activeSubcategory, currentCategoryObj]);

  // Monta as folhas A4 a serem impressas ou baixadas conforme a seleção
  interface A4SheetData {
    moldeName: string;
    category: string;
    subcategory?: string;
    gradeName: string;
    gradeKey: 'infantil' | 'tradicional' | 'baby-look';
    sizes: string[];
    measurements: Record<string, { height?: string; width?: string; sleeve?: string; shoulder?: string; collar?: string }>;
    image_url?: string;
  }

  const generatedSheets = useMemo<A4SheetData[]>(() => {
    const sheets: A4SheetData[] = [];
    const moldesToProcess: { molde: Molde | undefined; catName: string; catId: string; sub?: string }[] = [];

    if (exportScope === 'current') {
      moldesToProcess.push({
        molde: currentMolde,
        catName: currentCategoryObj.name,
        catId: currentCategoryObj.id,
        sub: currentCategoryObj.sub ? activeSubcategory : undefined
      });
    } else {
      // Todos os moldes configurados
      MOLDE_CATEGORIES.forEach(cat => {
        if (cat.sub) {
          cat.sub.forEach(sub => {
            const found = moldes.find(m => m.category === cat.id && m.subcategory === sub);
            moldesToProcess.push({
              molde: found,
              catName: cat.name,
              catId: cat.id,
              sub
            });
          });
        } else {
          const found = moldes.find(m => m.category === cat.id);
          moldesToProcess.push({
            molde: found,
            catName: cat.name,
            catId: cat.id
          });
        }
      });
    }

    moldesToProcess.forEach(item => {
      const moldeName = item.sub ? `${item.catName} (${item.sub})` : item.catName;
      const measurements = item.molde?.measurements || {};
      const img = item.molde?.image_url;

      if (item.catId === 'blk-fem') {
        // Baby Look Feminina
        if (includeBabyLook) {
          sheets.push({
            moldeName,
            category: item.catId,
            subcategory: item.sub,
            gradeName: 'Baby Look Feminina (Adulto P ao XG5)',
            gradeKey: 'baby-look',
            sizes: SIZES_BABY_LOOK,
            measurements,
            image_url: img
          });
        }
      } else {
        // Tradicional / Adulto
        if (includeTradicional) {
          sheets.push({
            moldeName,
            category: item.catId,
            subcategory: item.sub,
            gradeName: 'Grade Tradicional / Adulto (P ao XG5)',
            gradeKey: 'tradicional',
            sizes: SIZES_TRADICIONAL,
            measurements,
            image_url: img
          });
        }
        // Infantil (apenas para moldes que suportam infantil)
        if (includeInfantil && item.catId !== 'avental') {
          sheets.push({
            moldeName,
            category: item.catId,
            subcategory: item.sub,
            gradeName: 'Grade Infantil (Tam 02 ao 16)',
            gradeKey: 'infantil',
            sizes: SIZES_INFANTIL,
            measurements,
            image_url: img
          });
        }
      }
    });

    return sheets;
  }, [exportScope, currentMolde, currentCategoryObj, activeSubcategory, moldes, includeTradicional, includeInfantil, includeBabyLook]);

  // Função nativa de Impressão A4
  const handlePrint = () => {
    if (generatedSheets.length === 0) {
      alert('Selecione pelo menos uma grade para impressão.');
      return;
    }
    window.print();
  };

  // Função de Download do PDF A4
  const handleDownloadPDF = async () => {
    if (generatedSheets.length === 0) {
      alert('Selecione pelo menos uma grade para baixar o PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < generatedSheets.length; i++) {
        if (i > 0) doc.addPage();
        const sheet = generatedSheets[i];

        // Cabeçalho institucional
        doc.setFillColor(24, 24, 27);
        doc.rect(0, 0, 210, 28, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(234, 179, 8); // Gold / Primary
        doc.text('CRAZY ART', 15, 13);

        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('TABELA OFICIAL DE MEDIDAS E MOLDES', 15, 20);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(161, 161, 170);
        doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 195, 13, { align: 'right' });
        doc.text(`Folha ${i + 1} de ${generatedSheets.length}`, 195, 20, { align: 'right' });

        // Bloco de Identificação da Peça e Grade
        doc.setDrawColor(220, 220, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 34, 180, 22, 2, 2, 'FD');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(`Molde: ${sheet.moldeName.toUpperCase()}`, 20, 43);

        doc.setFontSize(10);
        doc.setTextColor(202, 138, 4); // Amarelo/Dourado escuro para contraste
        doc.text(`Divisão: ${sheet.gradeName.toUpperCase()}`, 20, 51);

        // Se houver imagem do molde, tenta carregar e desenhar
        let startTableY = 64;
        if (sheet.image_url) {
          try {
            const base64Img = await getBase64ImageFromUrl(sheet.image_url);
            if (base64Img) {
              // Desenha moldura de imagem técnica
              doc.setDrawColor(220, 220, 225);
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(15, 62, 180, 50, 2, 2, 'FD');
              doc.addImage(base64Img, 'JPEG', 60, 64, 90, 46, undefined, 'FAST');
              startTableY = 120;
            }
          } catch {
            // Em caso de falha de imagem externa, segue sem quebrar o PDF
          }
        }

        // Tabela de Medidas (Folha A4)
        doc.setFillColor(30, 41, 59);
        doc.rect(15, startTableY, 180, 10, 'F');

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        
        doc.text('TAMANHO', 22, startTableY + 6.5);
        doc.text('ALTURA (cm)', 60, startTableY + 6.5);
        doc.text('LARGURA (cm)', 95, startTableY + 6.5);
        doc.text('MANGA (cm)', 130, startTableY + 6.5);
        doc.text('OMBRO (cm)', 158, startTableY + 6.5);
        doc.text('GOLA (cm)', 182, startTableY + 6.5);

        let rowY = startTableY + 10;
        doc.setFontSize(9);

        sheet.sizes.forEach((size, idx) => {
          const m = sheet.measurements[size] || {};
          const isEven = idx % 2 === 0;

          doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
          doc.rect(15, rowY, 180, 9, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.line(15, rowY + 9, 195, rowY + 9);

          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(formatSizeLabel(size), 22, rowY + 6);

          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          doc.text(String(m.height || '-'), 60, rowY + 6);
          doc.text(String(m.width || '-'), 95, rowY + 6);
          doc.text(String(m.sleeve || '-'), 130, rowY + 6);
          doc.text(String(m.shoulder || '-'), 158, rowY + 6);
          doc.text(String(m.collar || '-'), 182, rowY + 6);

          rowY += 9;
        });

        // Rodapé de Observações e Normas da Grade
        const notesY = Math.min(rowY + 12, 260);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('OBSERVAÇÕES E TOLERÂNCIAS:', 15, notesY);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('• Medidas expressas em centímetros (cm), referentes à peça pronta e estendida.', 15, notesY + 5);
        doc.text('• Pode ocorrer tolerância industrial de variação de até ± 1,0 cm em decorrência de costura e encolhimento têxtil.', 15, notesY + 9);
        doc.text('• Padrão Crazy Art desenvolvido para sublimação total, serigrafia, DTF e bordado computadorizado.', 15, notesY + 13);

        // Barra inferior de encerramento
        doc.setDrawColor(203, 213, 225);
        doc.line(15, 280, 195, 280);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Crazy Art • www.crazyart.com.br • WhatsApp: (16) 99414-2665', 105, 286, { align: 'center' });
      }

      const fileName = `tabela_moldes_crazy_art_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF dos moldes:', err);
      alert('Houve um problema ao compilar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Visualização de Impressão Nativa (A4 Sheets Isoladas) */}
      <div id="moldes-print-area" className="hidden print:block fixed inset-0 bg-white text-black z-[999999] p-0 m-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body > *:not(#moldes-print-area) {
              display: none !important;
            }
            #moldes-print-area {
              display: block !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            .a4-page-break {
              page-break-after: always;
              break-after: page;
              min-height: 270mm;
              box-sizing: border-box;
              padding: 6mm;
            }
          }
        ` }} />

        {generatedSheets.map((sheet, sIdx) => (
          <div key={sIdx} className="a4-page-break flex flex-col justify-between font-sans">
            <div>
              {/* Top Banner */}
              <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-widest uppercase">CRAZY ART</h1>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Tabela Oficial de Medidas e Moldes</p>
                </div>
                <div className="text-right text-[9px] font-medium text-gray-600">
                  <p>Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                  <p>Folha {sIdx + 1} de {generatedSheets.length}</p>
                </div>
              </div>

              {/* Molde & Grade Title */}
              <div className="bg-gray-100 border border-gray-300 rounded p-3 mb-4">
                <h2 className="text-base font-black uppercase text-black">
                  MOLDE: {sheet.moldeName}
                </h2>
                <p className="text-xs font-bold uppercase text-gray-800">
                  {sheet.gradeName}
                </p>
              </div>

              {/* Imagem do Molde (se existir) */}
              {sheet.image_url && (
                <div className="mb-4 flex justify-center border border-gray-200 rounded p-2 bg-gray-50 h-36">
                  <img src={sheet.image_url} alt={sheet.moldeName} className="h-full object-contain" />
                </div>
              )}

              {/* Tabela de Medidas */}
              <table className="w-full border-collapse border border-gray-400 text-xs mb-6">
                <thead>
                  <tr className="bg-gray-800 text-white font-bold text-[10px] uppercase">
                    <th className="border border-gray-400 px-3 py-2 text-left">Tamanho</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Altura (cm)</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Largura (cm)</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Manga (cm)</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Ombro (cm)</th>
                    <th className="border border-gray-400 px-3 py-2 text-center">Gola (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.sizes.map((size, rowIdx) => {
                    const m = sheet.measurements[size] || {};
                    return (
                      <tr key={size} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-1.5 font-bold text-gray-900">
                          {formatSizeLabel(size)}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center font-medium">
                          {m.height || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center font-medium">
                          {m.width || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center font-medium">
                          {m.sleeve || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center font-medium">
                          {m.shoulder || '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-1.5 text-center font-medium">
                          {m.collar || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Informações Técnicas */}
              <div className="text-[9px] text-gray-600 space-y-1">
                <p className="font-bold text-gray-800">INFORMAÇÕES DE CONFECÇÃO:</p>
                <p>• Medidas em centímetros (cm), referentes à peça pronta e esticada.</p>
                <p>• Tolerância operacional de até ± 1,0 cm decorrente do processo de costura e corte.</p>
                <p>• Padrão técnico Crazy Art para serigrafia, DTF, sublimação e bordados.</p>
              </div>
            </div>

            {/* Rodapé da Folha A4 */}
            <div className="pt-3 border-t border-gray-400 text-center text-[9px] text-gray-500">
              Crazy Art Estamparia Digital • www.crazyart.com.br • WhatsApp: (16) 99414-2665
            </div>
          </div>
        ))}
      </div>

      {/* Modal Interativo na Tela */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 print:hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[92vh] max-h-[820px]"
        >
          {/* Header Superior do Modal */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                <Scissors size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  Tabela de Medidas & Moldes
                  <span className="text-[10px] font-bold bg-primary text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Crazy Art
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Consulte os tamanhos oficiais ou imprima e baixe cada grade em folhas A4
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Abas Alternadoras */}
              <div className="bg-zinc-800/80 p-1 rounded-xl flex items-center text-xs font-bold">
                <button
                  onClick={() => setActiveTab('view')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'view' ? 'bg-primary text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Eye size={14} />
                  <span className="hidden sm:inline">Visualizar</span>
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'export' ? 'bg-primary text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Printer size={14} />
                  <span>Imprimir / PDF</span>
                </button>
              </div>

              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          {activeTab === 'view' ? (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar de Categorias */}
              <div className="w-full md:w-60 bg-black/40 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-zinc-800/70">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    Modelos de Peças
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                  {MOLDE_CATEGORIES.map(cat => {
                    const isSelected = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          if (cat.sub) setActiveSubcategory(cat.sub[0]);
                          else setActiveSubcategory('');
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-primary text-black shadow-md font-black' 
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Área Central: Subcategorias + Imagem + Medidas */}
              <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/50">
                {/* Subcategorias (Golas) */}
                {currentCategoryObj.sub && (
                  <div className="p-3 bg-black/30 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-2">Gola:</span>
                    {currentCategoryObj.sub.map(sub => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubcategory(sub)}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                          activeSubcategory === sub 
                            ? 'bg-zinc-700 text-white shadow' 
                            : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/60'
                        }`}
                      >
                        {sub === 'redonda' ? 'Gola Redonda' : sub === 'V' ? 'Gola V' : 'Gola Polo'}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                  {/* Foto Técnica do Molde */}
                  <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center bg-black/20 overflow-y-auto">
                    <div className="w-full max-w-md h-64 sm:h-80 rounded-2xl border border-zinc-800 bg-black/50 p-4 flex items-center justify-center relative overflow-hidden">
                      {currentMolde?.image_url ? (
                        <img 
                          src={currentMolde.image_url} 
                          alt={currentCategoryObj.name} 
                          className="max-w-full max-h-full object-contain" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-zinc-600">
                          <Scissors size={48} />
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sem Foto do Molde</p>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium text-center mt-3 max-w-sm">
                      Molde técnico com pontos de referência: Altura total, Largura de tórax, Manga, Ombro e Gola.
                    </p>
                  </div>

                  {/* Visualização de Medidas */}
                  <div className="w-full lg:w-96 bg-black/40 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col overflow-hidden">
                    <div className="p-3.5 border-b border-zinc-800 bg-black/30 flex items-center justify-between shrink-0">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          {currentCategoryObj.name} {activeSubcategory ? `(${activeSubcategory})` : ''}
                        </h4>
                        <span className="text-[10px] text-zinc-400">Medidas em centímetros (cm)</span>
                      </div>

                      <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          onClick={() => setViewMode('table')}
                          className={`px-2 py-1 rounded ${viewMode === 'table' ? 'bg-primary text-black' : 'text-zinc-400'}`}
                        >
                          Tabela
                        </button>
                        <button
                          onClick={() => setViewMode('cards')}
                          className={`px-2 py-1 rounded ${viewMode === 'cards' ? 'bg-primary text-black' : 'text-zinc-400'}`}
                        >
                          Ficha
                        </button>
                      </div>
                    </div>

                    {/* Modo Tabela Completa */}
                    {viewMode === 'table' ? (
                      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-bold">
                              <th className="pb-2 pl-2">Tam</th>
                              <th className="pb-2 text-center">Alt</th>
                              <th className="pb-2 text-center">Larg</th>
                              <th className="pb-2 text-center">Manga</th>
                              <th className="pb-2 text-center">Ombro</th>
                              <th className="pb-2 text-center pr-2">Gola</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {currentGrade.map(size => {
                              const m = (currentMolde?.measurements?.[size] || {}) as { height?: string; width?: string; sleeve?: string; shoulder?: string; collar?: string };
                              const isSelected = activeSize === size;
                              return (
                                <tr 
                                  key={size}
                                  onClick={() => setActiveSize(size)}
                                  className={`cursor-pointer transition hover:bg-zinc-800/50 ${isSelected ? 'bg-primary/10 text-white font-bold' : 'text-zinc-300'}`}
                                >
                                  <td className="py-2.5 pl-2 font-black text-primary">
                                    {formatSizeLabel(size)}
                                  </td>
                                  <td className="py-2.5 text-center">{m.height || '-'}</td>
                                  <td className="py-2.5 text-center">{m.width || '-'}</td>
                                  <td className="py-2.5 text-center">{m.sleeve || '-'}</td>
                                  <td className="py-2.5 text-center">{m.shoulder || '-'}</td>
                                  <td className="py-2.5 text-center pr-2">{m.collar || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Modo Ficha / Cards Interativos */
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {currentGrade.map(size => {
                          const m = (currentMolde?.measurements?.[size] || {}) as { height?: string; width?: string; sleeve?: string; shoulder?: string; collar?: string };
                          const isSelected = activeSize === size;
                          return (
                            <button
                              key={size}
                              onClick={() => setActiveSize(size)}
                              className={`w-full p-3 rounded-xl border text-left transition-all ${
                                isSelected 
                                  ? 'bg-zinc-800 border-primary shadow-sm' 
                                  : 'bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-base font-black ${isSelected ? 'text-primary' : 'text-zinc-400'}`}>
                                  {formatSizeLabel(size)}
                                </span>
                                {isSelected && <span className="text-[10px] font-bold text-primary uppercase">Selecionado</span>}
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center">
                                <div className="bg-black/30 p-1 rounded">
                                  <span className="text-[8px] text-zinc-500 font-bold block">ALT</span>
                                  <span className="text-xs font-bold text-white">{m.height || '-'}</span>
                                </div>
                                <div className="bg-black/30 p-1 rounded">
                                  <span className="text-[8px] text-zinc-500 font-bold block">LARG</span>
                                  <span className="text-xs font-bold text-white">{m.width || '-'}</span>
                                </div>
                                <div className="bg-black/30 p-1 rounded">
                                  <span className="text-[8px] text-zinc-500 font-bold block">MANGA</span>
                                  <span className="text-xs font-bold text-white">{m.sleeve || '-'}</span>
                                </div>
                                <div className="bg-black/30 p-1 rounded">
                                  <span className="text-[8px] text-zinc-500 font-bold block">OMBRO</span>
                                  <span className="text-xs font-bold text-white">{m.shoulder || '-'}</span>
                                </div>
                                <div className="bg-black/30 p-1 rounded">
                                  <span className="text-[8px] text-zinc-500 font-bold block">GOLA</span>
                                  <span className="text-xs font-bold text-white">{m.collar || '-'}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Painel de Exportação / Impressão A4 */
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-900/60 custom-scrollbar flex flex-col justify-between">
              <div className="max-w-3xl mx-auto w-full space-y-6">
                <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-2xl p-5">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <SlidersHorizontal size={18} className="text-primary" />
                    Configuração de Impressão e PDF (Folhas A4)
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Selecione quais moldes e divisões de grade deseja gerar. Cada grade será separada em sua própria folha A4 com cabeçalho oficial Crazy Art e tabela completa.
                  </p>
                </div>

                {/* 1. Seleção de Escopo de Moldes */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block">
                    1. Tipos de Molde
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExportScope('current')}
                      className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                        exportScope === 'current'
                          ? 'bg-primary/10 border-primary text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        exportScope === 'current' ? 'border-primary bg-primary text-black' : 'border-zinc-600'
                      }`}>
                        {exportScope === 'current' && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">Molde Atual Selecionado</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {currentCategoryObj.name} {activeSubcategory ? `(${activeSubcategory})` : ''}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExportScope('all')}
                      className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                        exportScope === 'all'
                          ? 'bg-primary/10 border-primary text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        exportScope === 'all' ? 'border-primary bg-primary text-black' : 'border-zinc-600'
                      }`}>
                        {exportScope === 'all' && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">Todos os Moldes do Sistema</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Inclui Comum, Baby Look, Raglan, Moleton, Short, Calça, Avental e Máscara
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Seleção de Grades (Divisão de Folhas A4) */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block">
                    2. Divisão das Grades (Folhas A4)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Tradicional */}
                    <div 
                      onClick={() => setIncludeTradicional(!includeTradicional)}
                      className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                        includeTradicional
                          ? 'bg-primary/10 border-primary text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-xs uppercase text-white">Tradicional / Adulto</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          includeTradicional ? 'bg-primary border-primary text-black' : 'border-zinc-600'
                        }`}>
                          {includeTradicional && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        P, M, G, GG, XG, XG1, XG2, XG3, XG4, XG5
                      </p>
                      <span className="text-[9px] font-bold text-primary mt-2 uppercase">Folha A4 Dedicada</span>
                    </div>

                    {/* Infantil */}
                    <div 
                      onClick={() => setIncludeInfantil(!includeInfantil)}
                      className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                        includeInfantil
                          ? 'bg-primary/10 border-primary text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-xs uppercase text-white">Grade Infantil</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          includeInfantil ? 'bg-primary border-primary text-black' : 'border-zinc-600'
                        }`}>
                          {includeInfantil && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Tamanhos 02, 04, 06, 08, 10, 12, 14 e 16
                      </p>
                      <span className="text-[9px] font-bold text-primary mt-2 uppercase">Folha A4 Dedicada</span>
                    </div>

                    {/* Baby Look Feminina */}
                    <div 
                      onClick={() => setIncludeBabyLook(!includeBabyLook)}
                      className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                        includeBabyLook
                          ? 'bg-primary/10 border-primary text-white'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-xs uppercase text-white">Baby Look Feminina</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          includeBabyLook ? 'bg-primary border-primary text-black' : 'border-zinc-600'
                        }`}>
                          {includeBabyLook && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        P, M, G, GG, XG, XG1, XG2, XG3, XG4, XG5
                      </p>
                      <span className="text-[9px] font-bold text-primary mt-2 uppercase">Folha A4 Dedicada</span>
                    </div>
                  </div>
                </div>

                {/* Resumo de Folhas Geradas */}
                <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-primary" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        {generatedSheets.length === 1 
                          ? '1 Folha A4 será gerada' 
                          : `${generatedSheets.length} Folhas A4 serão geradas`}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Formatado para papel A4 retrato (210 x 297 mm) com margens otimizadas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="max-w-3xl mx-auto w-full pt-6 border-t border-zinc-800 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-5 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
                >
                  Voltar para Tabela
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={generatedSheets.length === 0}
                  className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 border border-zinc-700 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Imprimir Folhas A4
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={generatedSheets.length === 0 || isGeneratingPdf}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Gerando PDF...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Baixar em PDF (A4)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Rodapé Interno do Modal */}
          {activeTab === 'view' && (
            <div className="p-3 sm:p-4 bg-zinc-950/80 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-400">
                Grade: <strong className="text-white">{currentCategoryObj.name}</strong> • 
                Tamanhos: <span className="text-primary font-bold">{currentGrade.length} tamanhos</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('export')}
                  className="px-4 py-2 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 transition flex items-center gap-2 shadow-md shadow-primary/20"
                >
                  <Printer size={14} />
                  Imprimir / Baixar em PDF (A4)
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
