import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Square, Download, FileText, Check } from 'lucide-react';

export const MontagemMoldeDetailsSection = ({ order }: { order: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

    const description = order.description || '';
    if (!description.startsWith('MONTAGEM DE MOLDE:')) return null;

    const parts = description.split('\n\nPAPEL DE IMPRESSÃO:');
    const details = parts[0].replace('MONTAGEM DE MOLDE:\n', '').trim();
    const rest = parts[1] || '';
    
    const [paper, replicasPart] = rest.split('\n\nREPLICAS');
    const paperSize = paper ? paper.trim() : '';

    const replicasStr = replicasPart ? replicasPart.split('):\n')[1] : '';
    const replicasLines = replicasStr ? replicasStr.split('\n').filter(Boolean) : [];

    const handleToggleCheck = (index: number, textToCopy: string) => {
        const newChecked = new Set(checkedItems);
        if (!newChecked.has(index)) {
            // Só copia para a área de transferência se for a primeira vez clicando
            navigator.clipboard.writeText(textToCopy).catch(() => {});
        }
        
        if (newChecked.has(index)) {
            newChecked.delete(index);
        } else {
            newChecked.add(index);
        }
        setCheckedItems(newChecked);
    };

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden mt-4 shadow-lg animate-fade-in">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex justify-between items-center bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors"
                title="Ver detalhes do Pedido"
            >
                <span className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText size={16} className="text-amber-500" /> Detalhes do Pedido
                </span>
                {isOpen ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
            </button>

            {isOpen && (
                <div className="p-4 space-y-4 border-t border-white/5">
                    {/* Descrição e Info Base */}
                    {details && (
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">Descrição / Detalhes Adicionais</span>
                            <p className="text-zinc-300 text-xs whitespace-pre-wrap leading-relaxed">{details}</p>
                        </div>
                    )}
                    
                    {paperSize && (
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Papel de Impressão Solicitado</span>
                            <span className="text-white text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded inline-block mt-1">{paperSize}</span>
                        </div>
                    )}

                    {/* Arquivo URL (logo_url) */}
                    {(order.logo_url && order.logo_url.startsWith('http')) && (
                        <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                            <span className="text-xs text-zinc-400">Arquivo de Referência Enviado</span>
                            <a 
                                href={order.logo_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors border border-zinc-700 hover:border-zinc-500"
                                title="Fazer download ou visualizar"
                            >
                                <Download size={14} /> Baixar Arquivo
                            </a>
                        </div>
                    )}

                    {/* Lista (Colunas + Checkbox) */}
                    {replicasLines.length > 0 && (
                        <div className="pt-2">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">Lista de Produção (Clique no item para copiar para prancheta)</span>
                            <div className="space-y-2">
                                {replicasLines.map((line: string, index: number) => {
                                    // Linha esperada: "- G | NOME | 10 | CONJUNTO: ..."
                                    const cleanLine = line.replace(/^- /, '');
                                    const isChecked = checkedItems.has(index);

                                    return (
                                        <div 
                                            key={index}
                                            onClick={() => handleToggleCheck(index, cleanLine)}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none
                                                ${isChecked 
                                                    ? 'bg-emerald-900/10 border-emerald-500/20 text-zinc-500 opacity-60' 
                                                    : 'bg-zinc-900/80 border-white/5 text-zinc-300 hover:border-primary/50'
                                                }
                                            `}
                                            title={isChecked ? "Desmarcar (Já copiado)" : "Clique para copiar este item"}
                                        >
                                            <div className={`${isChecked ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                                {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </div>
                                            <div className="flex-1 text-xs font-mono break-all whitespace-pre-wrap font-medium">
                                                {cleanLine}
                                            </div>
                                            {isChecked && <Check size={14} className="text-emerald-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
