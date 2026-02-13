
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, FileType, RefreshCw, Download, 
  CheckCircle, AlertTriangle, X, File as FileIcon, ChevronRight, Layers, Image as ImageIcon 
} from 'lucide-react';
// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import { jsPDF } from 'jspdf';

type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export default function CdrConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{version?: string, type: 'zip' | 'riff' | null} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.toLowerCase().endsWith('.cdr')) {
        setFile(selected);
        setStatus('idle');
        setPreviewUrl(null);
        setErrorMsg(null);
        setExtractedData(null);
        // Iniciar análise automática ao selecionar
        processCdrFile(selected);
      } else {
        alert("Por favor, selecione um arquivo .CDR válido.");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.name.toLowerCase().endsWith('.cdr')) {
        setFile(selected);
        setStatus('idle');
        setPreviewUrl(null);
        setErrorMsg(null);
        setExtractedData(null);
        processCdrFile(selected);
      }
    }
  };

  const processCdrFile = async (cdrFile: File) => {
    setStatus('processing');
    setErrorMsg(null);

    try {
        const arrayBuffer = await cdrFile.arrayBuffer();
        const view = new Uint8Array(arrayBuffer);

        // Verifica assinatura ZIP (PK..)
        if (view[0] === 0x50 && view[1] === 0x4B) {
            setExtractedData({ type: 'zip', version: 'CorelDRAW X4+ (Moderno)' });
            
            const zip = new JSZip();
            const content = await zip.loadAsync(arrayBuffer);
            
            // Tenta encontrar o thumbnail em caminhos comuns do Corel
            // Corel salva previews em 'metadata/thumbnails/thumbnail.png' ou 'previews/thumbnail.png'
            let thumbFile = content.file(/thumbnail\.png$/i)[0]; // Busca flexível
            
            if (!thumbFile) {
                // Tenta buscar qualquer PNG ou BMP grande
                const images = content.file(/\.(png|bmp)$/i);
                if (images.length > 0) {
                    // Pega o maior arquivo, geralmente é o preview de página inteira
                    thumbFile = images.sort((a: any, b: any) => (b._data?.uncompressedSize || 0) - (a._data?.uncompressedSize || 0))[0];
                }
            }

            if (thumbFile) {
                const blob = await thumbFile.async('blob');
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
                setStatus('done');
            } else {
                setErrorMsg("Arquivo CDR válido, mas sem visualização interna (thumbnail) salva.");
                setStatus('error');
            }

        } else if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46) {
            // RIFF Header (Versões antigas pré-X4)
            setExtractedData({ type: 'riff', version: 'CorelDRAW Legacy (Binário)' });
            setErrorMsg("Este é um arquivo CorelDRAW antigo (formato binário RIFF). O navegador não consegue processar este formato diretamente sem um servidor.");
            setStatus('error');
        } else {
            setErrorMsg("Formato de arquivo não reconhecido ou corrompido.");
            setStatus('error');
        }

    } catch (e: any) {
        console.error(e);
        setErrorMsg("Erro ao ler o arquivo: " + e.message);
        setStatus('error');
    }
  };

  const generatePDF = () => {
    if (!previewUrl) return;
    
    setStatus('processing');
    
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
        const pdf = new jsPDF({
            orientation: img.width > img.height ? 'l' : 'p',
            unit: 'px',
            format: [img.width, img.height]
        });

        pdf.addImage(img, 'PNG', 0, 0, img.width, img.height);
        pdf.save(`${file?.name.replace('.cdr', '')}_convertido.pdf`);
        setStatus('done');
    };
  };

  const downloadPreview = () => {
      if (!previewUrl) return;
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `${file?.name.replace('.cdr', '')}_preview.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-green-900/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10 animate-fade-in-up">
            <Link to="/programs" className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition backdrop-blur-md">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight font-heading uppercase flex items-center gap-3">
                    <RefreshCw className="text-emerald-500" />
                    CDR Converter (Web)
                </h1>
                <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">Extração Instantânea de CDR para PDF/PNG</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Área de Upload */}
            <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[300px] relative overflow-hidden
                    ${file 
                        ? 'border-emerald-500/50 bg-zinc-900/80' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-800'
                    }
                `}
            >
                {previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center animate-scale-in">
                        <img src={previewUrl} alt="CDR Preview" className="max-w-full max-h-[300px] object-contain rounded shadow-2xl" />
                        <button 
                            onClick={() => { setFile(null); setPreviewUrl(null); }}
                            className="absolute top-0 right-0 p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : file ? (
                    <div className="animate-scale-in">
                        <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                            <FileIcon className="text-white w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1 truncate max-w-[250px]">{file.name}</h3>
                        <p className="text-emerald-400 text-xs font-mono mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        
                        {status === 'processing' && <p className="text-sm text-zinc-400 animate-pulse">Analisando estrutura do arquivo...</p>}
                        
                        {status === 'error' && (
                             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                                <AlertTriangle size={16} className="shrink-0" />
                                {errorMsg}
                             </div>
                        )}

                        {status !== 'processing' && (
                            <button 
                                onClick={() => { setFile(null); setPreviewUrl(null); }}
                                className="text-zinc-500 hover:text-white text-sm flex items-center gap-2 mx-auto mt-4 transition"
                            >
                                <X size={16} /> Trocar Arquivo
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="pointer-events-none">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-300">Arraste seu arquivo .CDR</h3>
                        <p className="text-zinc-500 text-sm mt-2 mb-6">Suporte para CorelDRAW X4 ou superior (Arquivos Compactados)</p>
                    </div>
                )}

                {!file && (
                    <input 
                        type="file" 
                        accept=".cdr"
                        ref={fileInputRef}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                )}
            </div>

            {/* Controles e Informações */}
            <div className="flex flex-col justify-center space-y-6">
                
                {/* Info do Arquivo */}
                {extractedData && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-fade-in">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Detalhes do Arquivo</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400 text-sm">Formato Detectado</span>
                                <span className="text-white font-bold text-sm bg-zinc-800 px-2 py-1 rounded border border-zinc-700">{extractedData.type?.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-zinc-400 text-sm">Compatibilidade</span>
                                <span className={extractedData.type === 'zip' ? "text-emerald-400 font-bold text-sm" : "text-red-400 font-bold text-sm"}>
                                    {extractedData.version}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Botões de Ação */}
                {previewUrl ? (
                    <div className="space-y-3 animate-fade-in-up">
                        <button 
                            onClick={generatePDF}
                            disabled={status === 'processing'}
                            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <FileType size={20} /> Salvar como PDF
                        </button>
                        <button 
                            onClick={downloadPreview}
                            className="w-full py-4 bg-zinc-800 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 border border-zinc-700"
                        >
                            <ImageIcon size={20} /> Baixar Imagem (PNG)
                        </button>
                    </div>
                ) : (
                    <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center text-zinc-500">
                        <p className="text-sm mb-2">Aguardando arquivo...</p>
                        <p className="text-xs opacity-60">Selecione um arquivo .CDR para ver as opções de conversão.</p>
                    </div>
                )}

                {/* Aviso Técnico */}
                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <CheckCircle className="text-blue-500 shrink-0" size={18} />
                    <p className="text-[10px] text-blue-400/80 leading-relaxed">
                        <strong>Tecnologia Client-Side:</strong> Esta ferramenta extrai a pré-visualização de alta qualidade incorporada nos arquivos CorelDRAW (X4+). Isso garante conversão instantânea e segura, sem enviar seus arquivos para nenhum servidor.
                    </p>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}
