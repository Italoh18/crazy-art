
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Plus, Trash2, Download, MessageCircle, FileText, 
  ArrowLeft, ListChecks, ToggleRight, ToggleLeft 
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Definição da estrutura do item da lista
interface ListItem {
  id: string;
  category: 'unisex' | 'feminina' | 'infantil';
  size: string;
  number: string;
  name: string;
  shortSize: string;
  shortNumber: string;
  quantity: number;
  isSimple: boolean;
}

const sizes = {
  unisex: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1', 'XG2', 'XG3', 'XG4', 'XG5'],
  feminina: ['PP', 'P', 'M', 'G', 'GG', 'EG', 'XG1'],
  infantil: ['RN', '2', '4', '6', '8', '10', '12', '14', '16']
};

export default function PublicListBuilder() {
  const location = useLocation();
  const [list, setList] = useState<ListItem[]>([]);
  const [destinationPhone, setDestinationPhone] = useState('');
  const [listTitle, setListTitle] = useState('Minha Lista de Pedido');
  const [isGlobalSimple, setIsGlobalSimple] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phone = params.get('phone');
    if (phone) {
        setDestinationPhone(phone.replace(/\D/g, ''));
    }
    // Adiciona uma linha inicial
    addListRow();
  }, [location]);

  const toggleGlobalSimpleMode = () => {
      const newValue = !isGlobalSimple;
      setIsGlobalSimple(newValue);
      setList(prev => prev.map(item => ({
          ...item,
          isSimple: newValue,
          quantity: newValue ? (item.quantity || 1) : 1,
          name: newValue ? '' : item.name,
          number: newValue ? '' : item.number
      })));
  };

  const addListRow = () => {
    const newItem: ListItem = {
      id: crypto.randomUUID(),
      category: 'unisex',
      size: 'M',
      number: '',
      name: '',
      shortSize: '',
      shortNumber: '',
      quantity: 1,
      isSimple: isGlobalSimple
    };
    setList(prev => [...prev, newItem]);
  };

  const updateRow = (id: string, field: keyof ListItem, value: any) => {
    setList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeRow = (id: string) => {
    if (list.length <= 1) return;
    setList(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
      return list.reduce((acc, item) => acc + (item.quantity || 1), 0);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(245, 158, 11); // Primary Color (Amber 500)
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("CRAZY ART - Lista de Produção", 105, 13, { align: 'center' });

    // Meta Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Título: ${listTitle}`, 14, 30);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 36);
    doc.text(`Total de Itens: ${calculateTotal()}`, 14, 42);

    // Table Data
    const tableColumn = ["Categoria", "Tam", "Nome", "Número", "Short", "Qtd"];
    const tableRows: any[] = [];

    list.forEach(item => {
      const rowData = [
        item.category.toUpperCase(),
        item.size,
        item.isSimple ? '-' : (item.name || '-'),
        item.isSimple ? '-' : (item.number || '-'),
        item.shortSize ? `${item.shortSize} ${item.shortNumber ? `(#${item.shortNumber})` : ''}` : '-',
        item.quantity
      ];
      tableRows.push(rowData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27] }, // Zinc 900
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });

    doc.save(`${listTitle.replace(/\s+/g, '_')}.pdf`);
    return true;
  };

  const handleSendWhatsApp = () => {
    if (!destinationPhone) {
        const phone = prompt("Digite o número do WhatsApp para enviar (com DDD):", "");
        if (phone) setDestinationPhone(phone.replace(/\D/g, ''));
        else return;
    }

    if (generatePDF()) {
        const message = `Olá! Preenchi a lista "${listTitle}" com ${calculateTotal()} itens.\n\nO arquivo PDF foi baixado no meu dispositivo. Vou anexá-lo agora para você.`;
        const link = `https://wa.me/55${destinationPhone}?text=${encodeURIComponent(message)}`;
        window.open(link, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold font-heading text-white">Criar Lista</h1>
                        <p className="text-zinc-500 text-sm">Preencha os dados e envie o PDF.</p>
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    <input 
                        type="text" 
                        value={listTitle}
                        onChange={(e) => setListTitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                        placeholder="Nome da Lista (ex: Time da Escola)"
                    />
                </div>
            </div>

            {/* List Builder */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center flex-wrap gap-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <ListChecks size={16} /> Itens ({calculateTotal()})
                    </span>
                    <button 
                        onClick={toggleGlobalSimpleMode}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border text-xs font-bold uppercase tracking-wider ${isGlobalSimple ? 'bg-primary/10 border-primary text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}
                    >
                        <span>Lista sem nomes (Qtd)</span>
                        {isGlobalSimple ? <ToggleRight size={18} className="text-primary" /> : <ToggleLeft size={18} />}
                    </button>
                </div>

                <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {list.map((item, idx) => (
                        <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-black/40 rounded-xl border border-zinc-800/50 items-end hover:border-zinc-700 transition">
                            {/* Categoria */}
                            <div className="sm:col-span-2">
                                <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tipo</label>
                                <select 
                                    value={item.category} 
                                    onChange={(e) => updateRow(item.id, 'category', e.target.value as any)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary"
                                >
                                    <option value="unisex">Unisex</option>
                                    <option value="feminina">Feminina</option>
                                    <option value="infantil">Infantil</option>
                                </select>
                            </div>
                            
                            {/* Tamanho */}
                            <div className="sm:col-span-2">
                                <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Tam</label>
                                <select 
                                    value={item.size} 
                                    onChange={(e) => updateRow(item.id, 'size', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary"
                                >
                                    {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            
                            {item.isSimple ? (
                                <div className="sm:col-span-4">
                                    <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Qtd</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={item.quantity || 1} 
                                        onChange={(e) => updateRow(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary font-mono text-center" 
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="sm:col-span-1">
                                        <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nº</label>
                                        <input 
                                            type="text" 
                                            placeholder="00" 
                                            value={item.number} 
                                            onChange={(e) => updateRow(item.id, 'number', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-1 py-2 text-xs text-white outline-none focus:border-primary text-center font-mono" 
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Nome</label>
                                        <input 
                                            type="text" 
                                            placeholder="NOME" 
                                            value={item.name} 
                                            onChange={(e) => updateRow(item.id, 'name', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-2 pr-2 py-2 text-xs text-white outline-none focus:border-primary uppercase" 
                                        />
                                    </div>
                                </>
                            )}

                            <div className="sm:col-span-2">
                                <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">Short</label>
                                <select 
                                    value={item.shortSize} 
                                    onChange={(e) => updateRow(item.id, 'shortSize', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-primary"
                                >
                                    <option value="">-</option>
                                    {sizes[item.category].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            
                            <div className="sm:col-span-1">
                                <label className="block text-[9px] font-bold text-zinc-600 uppercase mb-1">S.Nº</label>
                                <input 
                                    type="text" 
                                    placeholder="00" 
                                    value={item.shortNumber} 
                                    onChange={(e) => updateRow(item.id, 'shortNumber', e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-1 py-2 text-xs text-white outline-none focus:border-primary text-center font-mono" 
                                />
                            </div>

                            <div className="sm:col-span-1 flex items-end h-full pb-0.5">
                                <button onClick={() => removeRow(item.id)} className="w-full p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition flex items-center justify-center"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                    <button onClick={addListRow} className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-primary hover:border-primary/50 transition flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-xs">
                        <Plus size={16} /> Adicionar Linha
                    </button>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={generatePDF}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-3 shadow-lg"
                >
                    <Download size={20} /> Baixar PDF
                </button>
                <button 
                    onClick={handleSendWhatsApp}
                    className="bg-[#25D366] hover:bg-[#1da851] text-white py-4 rounded-2xl font-bold transition flex items-center justify-center gap-3 shadow-lg shadow-green-900/20"
                >
                    <MessageCircle size={20} /> Enviar no WhatsApp
                </button>
            </div>
            
            <p className="text-center text-xs text-zinc-500 max-w-md mx-auto">
                <span className="font-bold text-amber-500">Nota:</span> Ao clicar em "Enviar no WhatsApp", o PDF será baixado automaticamente. Você precisará anexar o arquivo na conversa do WhatsApp que será aberta.
            </p>
        </div>
    </div>
  );
}
