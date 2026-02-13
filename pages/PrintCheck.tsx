
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Printer, CheckCircle, AlertTriangle, 
  XCircle, FileText, Image as ImageIcon, Ruler, Maximize, 
  Download, Eye, Palette, ScanLine, Info 
} from 'lucide-react';
import { analyzeImage, analyzePDF, simulatePrintPreview, AnalysisReport } from '../utils/printAnalysis';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import { jsPDF } from 'jspdf';

export default function PrintCheck() {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [targetWidthMm, setTargetWidthMm] = useState<string>('');
  
  // Preview States
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [previewSimulated, setPreviewSimulated] = useState<string | null>(null);
  
  const canvasOriginalRef = useRef<HTMLCanvasElement>(null);
  const canvasSimulatedRef = useRef<HTMLCanvasElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f: File) => {
    if (f.size > 50 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 50MB.");
      return;
    }
    const type = f.type;
    if (type === 'application/pdf' || type.startsWith('image/')) {
      setFile(f);
      setReport(null);
      setPreviewOriginal(null);
      setPreviewSimulated(null);
      setTargetWidthMm('');
    } else {
      alert("Formato não suportado. Use PDF, JPG ou PNG.");
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setIsAnalyzing(true);

    try {
      let result: AnalysisReport;
      const widthMm = parseFloat(targetWidthMm) || 0;

      if (file.type.startsWith('image/')) {
        result = await analyzeImage(file, widthMm > 0 ? widthMm : undefined);
        
        // Gerar Previews
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                setPreviewOriginal(img.src);
                generateSimulatedPreview(img);
            };
        };
        reader.readAsDataURL(file);

      } else {
        result = await analyzePDF(file);
        
        // Renderizar primeira página do PDF para preview
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const imgData = canvas.toDataURL('image/png');
            setPreviewOriginal(imgData);
            
            const img = new Image();
            img.src = imgData;
            img.onload = () => generateSimulatedPreview(img);
        }
      }

      setReport(result);
    } catch (e) {
      console.error(e);
      alert("Erro ao analisar arquivo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSimulatedPreview = (img: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if(!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Aplica filtro de simulação
      simulatePrintPreview(ctx, canvas.width, canvas.height);
      
      setPreviewSimulated(canvas.toDataURL('image/png'));
  };

  const exportReport = () => {
      if(!report) return;
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text("Relatório Print Check - Crazy Art", 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Arquivo: ${report.fileName}`, 20, 40);
      doc.text(`Tipo: ${report.fileType.toUpperCase()}`, 20, 50);
      doc.text(`Tamanho: ${report.fileSizeMb.toFixed(2)} MB`, 20, 60);
      
      doc.setTextColor(report.status === 'ok' ? 'green' : report.status === 'error' ? 'red' : 'orange');
      doc.text(`Status Geral: ${report.status.toUpperCase()}`, 20, 70);
      doc.setTextColor('black');

      doc.text("Dimensões:", 20, 90);
      doc.text(`- Pixels: ${report.dimensions.widthPx} x ${report.dimensions.heightPx}`, 30, 100);
      doc.text(`- Físico: ${report.dimensions.widthMm.toFixed(1)} x ${report.dimensions.heightMm.toFixed(1)} mm`, 30, 110);
      
      if(report.dpi) {
          doc.text(`- Resolução: ${report.dpi} DPI`, 30, 120);
      }

      doc.text("Diagnóstico de Cores:", 20, 140);
      doc.text(`- Espaço: ${report.colors.space}`, 30, 150);
      doc.text(`- Obs: ${report.colors.message}`, 30, 160);

      doc.save("relatorio_print_check.pdf");
  };

  const StatusIcon = ({ status }: { status: string }) => {
      if (status === 'ok') return <CheckCircle className="text-emerald-500 w-8 h-8" />;
      if (status === 'warning') return <AlertTriangle className="text-amber-500 w-8 h-8" />;
      return <XCircle className="text-red-500 w-8 h-8" />;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
        {/* Background Grid */}
        <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="max-w-6xl mx-auto relative z-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10 animate-fade-in-up">
                <Link to="/programs" className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition backdrop-blur-md">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight font-heading uppercase flex items-center gap-3">
                        <Printer className="text-cyan-500" />
                        Print Check
                    </h1>
                    <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">Validador Técnico de Arquivos</p>
                </div>
            </div>

            {/* Main Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Input & Controls */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Dropzone */}
                    <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleFileDrop}
                        className={`
                            border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[300px] relative overflow-hidden group
                            ${file 
                                ? 'border-cyan-500/50 bg-zinc-900/80' 
                                : 'border-zinc-800 bg-zinc-900/50 hover:border-cyan-500/30 hover:bg-zinc-800'
                            }
                        `}
                    >
                        {file ? (
                            <div className="animate-scale-in w-full">
                                <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400">
                                    {file.type.includes('image') ? <ImageIcon size={32} /> : <FileText size={32} />}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{file.name}</h3>
                                <p className="text-zinc-500 text-xs font-mono mb-6">{(file.size / (1024*1024)).toFixed(2)} MB</p>
                                <button 
                                    onClick={() => { setFile(null); setReport(null); }}
                                    className="text-xs text-red-400 hover:text-red-300 underline"
                                >
                                    Remover arquivo
                                </button>
                            </div>
                        ) : (
                            <div className="pointer-events-none">
                                <Upload size={40} className="mx-auto mb-4 text-zinc-600 group-hover:text-cyan-500 transition-colors" />
                                <h3 className="text-base font-bold text-zinc-300">Arraste seu arquivo</h3>
                                <p className="text-zinc-500 text-xs mt-2">PDF, JPG ou PNG (Máx 50MB)</p>
                            </div>
                        )}
                        
                        {!file && (
                            <input 
                                type="file" 
                                accept=".pdf,image/png,image/jpeg"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileSelect}
                            />
                        )}
                    </div>

                    {/* Inputs Adicionais para Imagem */}
                    {file && file.type.startsWith('image/') && !report && (
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl animate-fade-in">
                            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Ruler size={16} className="text-cyan-500" /> Medida Final Desejada
                            </h4>
                            <div className="space-y-2">
                                <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Largura (mm)</label>
                                <input 
                                    type="number" 
                                    placeholder="Ex: 210 (A4)" 
                                    value={targetWidthMm}
                                    onChange={(e) => setTargetWidthMm(e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition font-mono"
                                />
                                <p className="text-[10px] text-zinc-600">Deixe vazio para usar a resolução nativa (72 DPI web ou metadados).</p>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    {file && !report && (
                        <button 
                            onClick={runAnalysis}
                            disabled={isAnalyzing}
                            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest rounded-xl transition shadow-lg shadow-cyan-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? 'Analisando...' : 'Iniciar Verificação'}
                        </button>
                    )}

                    {/* Botão Exportar (Só aparece se tiver report) */}
                    {report && (
                        <button 
                            onClick={exportReport}
                            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-widest rounded-xl transition border border-zinc-700 flex items-center justify-center gap-2"
                        >
                            <Download size={18} /> Baixar Relatório PDF
                        </button>
                    )}
                </div>

                {/* Right Column: Results & Preview */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* Status Dashboard */}
                    {report && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 animate-fade-in">
                            <div className="flex items-start justify-between mb-8 border-b border-zinc-800 pb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Diagnóstico do Arquivo</h2>
                                    <p className="text-zinc-500 text-sm">Baseado em padrões de impressão offset/digital.</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <StatusIcon status={report.status} />
                                    <span className={`text-xs font-bold uppercase tracking-widest mt-2 ${report.status === 'ok' ? 'text-emerald-500' : report.status === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                                        {report.status === 'ok' ? 'Aprovado' : report.status === 'error' ? 'Reprovado' : 'Atenção'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Card DPI */}
                                <div className={`p-4 rounded-xl border ${report.dpi && report.dpi < 300 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase">
                                        <ScanLine size={14} /> Resolução
                                    </div>
                                    <p className="text-2xl font-mono text-white font-bold">{report.dpi ? `${report.dpi} DPI` : 'N/A'}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1">Mínimo recomendado: 300 DPI</p>
                                </div>

                                {/* Card Cores */}
                                <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase">
                                        <Palette size={14} /> Perfil de Cor
                                    </div>
                                    <p className="text-xl text-white font-bold truncate">{report.colors.space}</p>
                                    <p className="text-[10px] text-zinc-500 mt-1 truncate" title={report.colors.message}>{report.colors.message}</p>
                                </div>

                                {/* Card Tamanho */}
                                <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                                    <div className="flex items-center gap-2 mb-2 text-zinc-400 text-xs font-bold uppercase">
                                        <Maximize size={14} /> Dimensões
                                    </div>
                                    <p className="text-xl text-white font-bold font-mono">
                                        {report.dimensions.widthMm.toFixed(0)} x {report.dimensions.heightMm.toFixed(0)} mm
                                    </p>
                                    <p className="text-[10px] text-zinc-500 mt-1">{report.dimensions.widthPx} x {report.dimensions.heightPx} px</p>
                                </div>
                            </div>

                            {/* Detalhes Adicionais */}
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-zinc-400 bg-black/20 p-3 rounded-lg border border-zinc-800">
                                    <Info size={14} className="text-cyan-500" />
                                    <span>
                                        {report.fileType === 'pdf' 
                                            ? `Fontes detectadas: ${report.fonts?.count || 0}. Verifique se todas estão incorporadas.` 
                                            : "Imagens bitmaps podem perder qualidade se ampliadas."}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Previews (Comparativo) */}
                    {previewOriginal && previewSimulated && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 animate-fade-in">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Eye size={16} className="text-cyan-500" /> Simulação de Impressão
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <span className="text-xs text-zinc-500 font-bold block text-center">TELA (RGB Brilhante)</span>
                                    <div className="aspect-square bg-black rounded-xl overflow-hidden border border-zinc-800 relative">
                                        <img src={previewOriginal} alt="Original" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-xs text-zinc-500 font-bold block text-center">IMPRESSÃO (Simulação CMYK Fosco)</span>
                                    <div className="aspect-square bg-white rounded-xl overflow-hidden border border-zinc-200 relative">
                                        <img src={previewSimulated} alt="Simulado" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-10 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 text-center mx-auto max-w-xs">
                                        *Simulação aproximada da perda de brilho e saturação em papel comum.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!report && (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-zinc-700 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                            <Printer size={64} className="opacity-20 mb-4" />
                            <p className="font-medium">Os resultados da análise aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
