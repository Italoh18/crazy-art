
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle, 
  X, File as FileIcon, Loader2, Download, FileType 
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
// Fix import for file-saver to support both synthetic default and named exports depending on environment
import * as FileSaverPkg from 'file-saver';

// @ts-ignore
const saveAs = FileSaverPkg.default || FileSaverPkg.saveAs || FileSaverPkg;

// Configura o worker do PDF.js via CDN para evitar problemas de build com Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

type ConversionStatus = 'idle' | 'processing' | 'done' | 'error';

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf')) {
        setFile(selected);
        setStatus('idle');
        setErrorMsg(null);
        setDocxBlob(null);
        setProgress(0);
      } else {
        alert("Por favor, selecione um arquivo PDF válido.");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf')) {
        setFile(selected);
        setStatus('idle');
        setErrorMsg(null);
        setDocxBlob(null);
        setProgress(0);
      }
    }
  };

  const convertToWord = async () => {
    if (!file) return;
    setStatus('processing');
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;
      
      const docChildren: Paragraph[] = [];

      // Itera por cada página do PDF
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Estratégia simples: Coletar todo o texto da página e colocar em parágrafos
        // Melhorias futuras poderiam tentar detectar posições Y para quebras de linha mais precisas
        let lastY = -1;
        let lineText = "";

        // Ordena itens por posição Y (topo para baixo) e depois X (esquerda para direita)
        const items = textContent.items.map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5], // PDF coordinates start from bottom-left usually
            hasEOL: item.hasEOL
        })).sort((a, b) => b.y - a.y || a.x - b.x);

        for (const item of items) {
            // Se a diferença de Y for grande, é uma nova linha
            if (lastY !== -1 && Math.abs(item.y - lastY) > 10) {
                if (lineText.trim()) {
                    docChildren.push(
                        new Paragraph({
                            children: [new TextRun(lineText)],
                            spacing: { after: 200 }
                        })
                    );
                }
                lineText = "";
            }
            
            lineText += item.str + " "; // Adiciona espaço entre palavras
            lastY = item.y;
        }

        // Adiciona última linha da página
        if (lineText.trim()) {
            docChildren.push(
                new Paragraph({
                    children: [new TextRun(lineText)],
                    spacing: { after: 200 }
                })
            );
        }

        // Adiciona quebra de página se não for a última
        if (i < numPages) {
             // Docx não tem page break explícito simples aqui sem seções, 
             // mas podemos adicionar parágrafos vazios ou usar seções.
             // Para simplicidade, apenas adicionamos espaçamento extra.
             docChildren.push(new Paragraph({ text: "", spacing: { after: 400 } }));
        }

        setProgress(10 + Math.round((i / numPages) * 80));
      }

      // Criar Documento DOCX
      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren.length > 0 ? docChildren : [new Paragraph("Não foi possível extrair texto legível deste PDF. Ele pode ser uma imagem escaneada.")]
        }]
      });

      const blob = await Packer.toBlob(doc);
      setDocxBlob(blob);
      setStatus('done');
      setProgress(100);

    } catch (e: any) {
      console.error(e);
      setErrorMsg("Erro na conversão: " + e.message);
      setStatus('error');
    }
  };

  const downloadFile = () => {
    if (docxBlob && file) {
        saveAs(docxBlob, file.name.replace('.pdf', '.docx'));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10 animate-fade-in-up">
            <Link to="/programs" className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-zinc-400 hover:text-white transition backdrop-blur-md">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight font-heading uppercase flex items-center gap-3">
                    <FileText className="text-blue-500" />
                    PDF para Word
                </h1>
                <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">Extração de Texto Instantânea</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Área de Upload */}
            <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`
                    border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[300px] relative overflow-hidden group
                    ${file 
                        ? 'border-blue-500/50 bg-zinc-900/80' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-blue-500/30 hover:bg-zinc-800'
                    }
                `}
            >
                {file ? (
                    <div className="animate-scale-in w-full">
                        <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                            <FileIcon className="text-white w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1 truncate max-w-[250px] mx-auto">{file.name}</h3>
                        <p className="text-blue-400 text-xs font-mono mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        
                        {status === 'processing' && (
                            <div className="w-full max-w-[200px] mx-auto">
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <p className="text-xs text-zinc-400 animate-pulse">Convertendo... {progress}%</p>
                            </div>
                        )}
                        
                        {status === 'done' && (
                             <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex justify-center items-center gap-2">
                                <CheckCircle size={16} /> Conversão Concluída!
                             </div>
                        )}

                        {status === 'error' && (
                             <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 text-left">
                                <AlertTriangle size={16} className="shrink-0" />
                                {errorMsg}
                             </div>
                        )}

                        {status !== 'processing' && (
                            <button 
                                onClick={() => { setFile(null); setStatus('idle'); setDocxBlob(null); }}
                                className="absolute top-4 right-4 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition"
                                title="Remover arquivo"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="pointer-events-none">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500 group-hover:scale-110 transition-transform duration-300">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-300">Arraste seu PDF aqui</h3>
                        <p className="text-zinc-500 text-sm mt-2 mb-6">ou clique para selecionar</p>
                    </div>
                )}

                {!file && (
                    <input 
                        type="file" 
                        accept=".pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                    />
                )}
            </div>

            {/* Controles e Ação */}
            <div className="flex flex-col justify-center space-y-6">
                
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Informações</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                        Esta ferramenta extrai o texto do seu PDF e cria um novo documento Word (.docx). 
                    </p>
                    <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                        <CheckCircle size={14} />
                        <span>Layout de texto preservado (parágrafos)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2 px-3">
                        <AlertTriangle size={14} />
                        <span>Imagens e formatação complexa podem não ser mantidas.</span>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3 animate-fade-in-up">
                    {status === 'done' && docxBlob ? (
                        <button 
                            onClick={downloadFile}
                            className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2 shadow-emerald-500/20"
                        >
                            <Download size={20} /> Baixar Arquivo Word
                        </button>
                    ) : (
                        <button 
                            onClick={convertToWord}
                            disabled={!file || status === 'processing'}
                            className={`w-full py-4 font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 
                                ${!file || status === 'processing' 
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                    : 'bg-white text-black hover:bg-blue-50 hover:scale-105 shadow-white/10'
                                }
                            `}
                        >
                            {status === 'processing' ? <Loader2 className="animate-spin" size={20} /> : <FileType size={20} />} 
                            {status === 'processing' ? 'Processando...' : 'Converter Agora'}
                        </button>
                    )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}
