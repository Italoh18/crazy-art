
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Calculator, Zap, DollarSign, Clock, AlertTriangle, CheckCircle, 
  Download, Plus, Trash2, Home, Monitor, Lightbulb, Wallet, Briefcase, 
  TrendingUp, Copy, HelpCircle, AlertOctagon 
} from 'lucide-react';
// @ts-ignore
import { jsPDF } from 'jspdf';

// --- TYPES ---
interface Appliance {
  id: string;
  name: string;
  watts: number;
  hoursPerDay: number;
}

interface Equipment {
  id: string;
  name: string;
  value: number;
  lifespanYears: number;
}

interface FixedCost {
  id: string;
  name: string;
  value: number;
}

// --- UTILS (Calculadora Logic) ---
const calculateMonthlyEnergy = (kwhPrice: number, daysWorked: number, appliances: Appliance[]) => {
  const totalKwh = appliances.reduce((acc, app) => {
    // (Potência * Horas * Dias) / 1000
    return acc + ((app.watts * app.hoursPerDay * daysWorked) / 1000);
  }, 0);
  return totalKwh * kwhPrice;
};

const calculateMonthlyDepreciation = (equipment: Equipment[]) => {
  return equipment.reduce((acc, eq) => {
    // Valor / (Anos * 12 meses)
    if (eq.lifespanYears <= 0) return acc;
    return acc + (eq.value / (eq.lifespanYears * 12));
  }, 0);
};

// --- COMPONENTS ---

// 1. INPUT FIELD PADRÃO
const InputField = ({ label, value, onChange, type = "text", placeholder = "", prefix = "", suffix = "" }: any) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-3 text-zinc-500 text-sm">{prefix}</span>}
      <input 
        type={type} 
        value={value} 
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-black/40 border border-zinc-700 rounded-xl py-2.5 text-white focus:border-primary outline-none transition text-sm ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-8' : 'pr-4'}`}
      />
      {suffix && <span className="absolute right-3 top-3 text-zinc-500 text-xs font-bold">{suffix}</span>}
    </div>
  </div>
);

// 2. RESULT CARD
const ResultCard = ({ title, value, subtext, color = "text-white", icon: Icon }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between h-full relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition ${color}`}>
        {Icon && <Icon size={40} />}
    </div>
    <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider relative z-10">{title}</span>
    <div className="relative z-10">
        <span className={`text-2xl font-black ${color} block mt-1`}>{value}</span>
        {subtext && <span className="text-[10px] text-zinc-600 block mt-1">{subtext}</span>}
    </div>
  </div>
);

export default function PricingCalculator() {
  const [mode, setMode] = useState<'simple' | 'julius'>('simple');

  // --- STATES MODE 1 (SIMPLES) ---
  const [simpleData, setSimpleData] = useState({
    serviceType: '',
    hours: 5,
    hourlyRate: 50,
    complexity: 1, // 1 = Baixa, 1.2 = Média, 1.5 = Alta
    urgency: 1,    // 1 = Normal, 1.2 = Urgente, 1.5 = Emergência
    revisions: 2,
    extraRevisionPrice: 20,
    profitMargin: 20
  });

  // --- STATES MODE 2 (JULIUS) ---
  const [juliusData, setJuliusData] = useState({
    // Config
    kwhPrice: 0.90, // Média Brasil
    daysWorked: 22,
    hoursWorked: 8,
    
    // Meta
    desiredNetIncome: 3000,
    
    // Listas
    costs: [
      { id: '1', name: 'Internet', value: 100 },
      { id: '2', name: 'Adobe Creative Cloud', value: 120 },
      { id: '3', name: 'MEI / Impostos', value: 70 },
    ] as FixedCost[],
    
    appliances: [
      { id: '1', name: 'PC Desktop (Médio)', watts: 400, hoursPerDay: 8 },
      { id: '2', name: 'Monitor 24"', watts: 35, hoursPerDay: 8 },
      { id: '3', name: 'Lâmpada LED', watts: 10, hoursPerDay: 4 },
      { id: '4', name: 'Ar Condicionado (Inverter)', watts: 900, hoursPerDay: 4 },
    ] as Appliance[],

    equipment: [
      { id: '1', name: 'Computador', value: 5000, lifespanYears: 3 },
      { id: '2', name: 'Monitor/Periféricos', value: 1500, lifespanYears: 4 },
      { id: '3', name: 'Cadeira/Mesa', value: 1200, lifespanYears: 5 },
    ] as Equipment[],
    
    desiredProfitMargin: 20 // Margem de segurança/lucro da empresa
  });

  // --- CALCULATIONS SIMPLE ---
  const simpleResults = useMemo(() => {
    const baseCost = simpleData.hours * simpleData.hourlyRate;
    const adjustedCost = baseCost * simpleData.complexity * simpleData.urgency;
    const profitValue = adjustedCost * (simpleData.profitMargin / 100);
    const total = adjustedCost + profitValue;
    
    // Status
    let status = 'saudavel';
    if (simpleData.profitMargin < 10) status = 'perigo';
    else if (simpleData.profitMargin < 20) status = 'atencao';

    return { baseCost, total, profitValue, status };
  }, [simpleData]);

  // --- CALCULATIONS JULIUS ---
  const juliusResults = useMemo(() => {
    // 1. Custos Fixos Totais
    const totalFixed = juliusData.costs.reduce((acc, c) => acc + c.value, 0);
    
    // 2. Energia
    const monthlyEnergyCost = calculateMonthlyEnergy(juliusData.kwhPrice, juliusData.daysWorked, juliusData.appliances);
    
    // 3. Depreciação
    const monthlyDepreciation = calculateMonthlyDepreciation(juliusData.equipment);
    
    // 4. Totais
    const totalMonthlyCost = totalFixed + monthlyEnergyCost + monthlyDepreciation;
    const totalRevenueTarget = totalMonthlyCost + juliusData.desiredNetIncome;
    
    // 5. Hora Técnica
    const monthlyHoursAvailable = juliusData.hoursWorked * juliusData.daysWorked;
    const breakEvenHourlyRate = totalMonthlyCost / monthlyHoursAvailable; // Custo para pagar contas (sem salário)
    const realHourlyRate = totalRevenueTarget / monthlyHoursAvailable; // Custo para pagar contas + salário
    
    // 6. Preço de Venda (com margem de lucro da empresa)
    const idealHourlyRate = realHourlyRate * (1 + (juliusData.desiredProfitMargin / 100));

    return {
      totalFixed,
      monthlyEnergyCost,
      monthlyDepreciation,
      totalMonthlyCost,
      realHourlyRate,
      idealHourlyRate,
      breakEvenHourlyRate,
      monthlyHoursAvailable
    };
  }, [juliusData]);

  // --- HANDLERS (JULIUS) ---
  const addAppliance = () => {
    setJuliusData(prev => ({
      ...prev,
      appliances: [...prev.appliances, { id: crypto.randomUUID(), name: 'Novo Aparelho', watts: 100, hoursPerDay: 4 }]
    }));
  };
  const updateAppliance = (id: string, field: string, val: any) => {
    setJuliusData(prev => ({
      ...prev,
      appliances: prev.appliances.map(a => a.id === id ? { ...a, [field]: val } : a)
    }));
  };
  const removeAppliance = (id: string) => {
    setJuliusData(prev => ({ ...prev, appliances: prev.appliances.filter(a => a.id !== id) }));
  };

  const addFixedCost = () => {
    setJuliusData(prev => ({
      ...prev,
      costs: [...prev.costs, { id: crypto.randomUUID(), name: 'Novo Custo', value: 0 }]
    }));
  };
  const updateFixedCost = (id: string, field: string, val: any) => {
    setJuliusData(prev => ({
      ...prev,
      costs: prev.costs.map(c => c.id === id ? { ...c, [field]: val } : c)
    }));
  };
  const removeFixedCost = (id: string) => {
    setJuliusData(prev => ({ ...prev, costs: prev.costs.filter(c => c.id !== id) }));
  };

  const addEquipment = () => {
    setJuliusData(prev => ({
      ...prev,
      equipment: [...prev.equipment, { id: crypto.randomUUID(), name: 'Novo Equipamento', value: 0, lifespanYears: 2 }]
    }));
  };
  const updateEquipment = (id: string, field: string, val: any) => {
    setJuliusData(prev => ({
      ...prev,
      equipment: prev.equipment.map(e => e.id === id ? { ...e, [field]: val } : e)
    }));
  };
  const removeEquipment = (id: string) => {
    setJuliusData(prev => ({ ...prev, equipment: prev.equipment.filter(e => e.id !== id) }));
  };

  // --- EXPORT PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const purple = "#7C3AED";
    const black = "#000000";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(purple);
    doc.text("Crazy Art | Orçamento", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(black);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, 30);

    if (mode === 'simple') {
        doc.text("MODO SIMPLIFICADO", 20, 45);
        doc.line(20, 47, 190, 47);
        
        let y = 60;
        doc.text(`Serviço: ${simpleData.serviceType || 'Geral'}`, 20, y); y += 10;
        doc.text(`Tempo Estimado: ${simpleData.hours} horas`, 20, y); y += 10;
        doc.text(`Valor Hora Base: R$ ${simpleData.hourlyRate.toFixed(2)}`, 20, y); y += 10;
        doc.text(`Complexidade: ${simpleData.complexity === 1 ? 'Baixa' : simpleData.complexity === 1.2 ? 'Média' : 'Alta'}`, 20, y); y += 10;
        doc.text(`Urgência: ${simpleData.urgency === 1 ? 'Normal' : 'Urgente'}`, 20, y); y += 15;
        
        doc.setFontSize(16);
        doc.text(`TOTAL SUGERIDO: R$ ${simpleResults.total.toFixed(2)}`, 20, y);
    } else {
        doc.text("MODO JULIUS (CUSTOS REAIS)", 20, 45);
        doc.line(20, 47, 190, 47);
        
        let y = 60;
        doc.setFontSize(10);
        doc.text("Custos Mensais Detalhados:", 20, y); y += 10;
        doc.text(`- Custos Fixos: R$ ${juliusResults.totalFixed.toFixed(2)}`, 25, y); y += 7;
        doc.text(`- Energia Elétrica: R$ ${juliusResults.monthlyEnergyCost.toFixed(2)}`, 25, y); y += 7;
        doc.text(`- Depreciação Equipamentos: R$ ${juliusResults.monthlyDepreciation.toFixed(2)}`, 25, y); y += 7;
        doc.text(`- Meta Salário Líquido: R$ ${juliusData.desiredNetIncome.toFixed(2)}`, 25, y); y += 15;
        
        doc.setFontSize(14);
        doc.text("RESULTADOS DA SUA HORA:", 20, y); y += 10;
        doc.setFontSize(12);
        doc.text(`Custo Hora (Break Even): R$ ${juliusResults.breakEvenHourlyRate.toFixed(2)}`, 20, y); y += 10;
        doc.text(`Custo Hora (Com Salário): R$ ${juliusResults.realHourlyRate.toFixed(2)}`, 20, y); y += 10;
        
        doc.setFontSize(16);
        doc.setTextColor(purple);
        doc.text(`PREÇO DE VENDA IDEAL: R$ ${juliusResults.idealHourlyRate.toFixed(2)} / hora`, 20, y + 10);
    }

    doc.save("orcamento_crazy_art.pdf");
  };

  const copySummary = () => {
      const text = mode === 'simple' 
        ? `Orçamento ${simpleData.serviceType}: R$ ${simpleResults.total.toFixed(2)} (${simpleData.hours}h estimadas).`
        : `Minha hora técnica calculada é R$ ${juliusResults.idealHourlyRate.toFixed(2)}.`;
      
      navigator.clipboard.writeText(text);
      alert("Resumo copiado!");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8 animate-fade-in-up">
        <div className="flex items-center gap-4">
            <Link to="/programs" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition">
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight font-heading uppercase flex items-center gap-3">
                    <Calculator className="text-emerald-500" />
                    Calculadora
                </h1>
                <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">Precificação Inteligente</p>
            </div>
        </div>
        
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button 
                onClick={() => setMode('simple')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${mode === 'simple' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
                Simplificado
            </button>
            <button 
                onClick={() => setMode('julius')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${mode === 'julius' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-zinc-500 hover:text-white'}`}
            >
                <Wallet size={14} /> Modo Julius
            </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-2 space-y-6 animate-fade-in">
            
            {/* --- MODO SIMPLES --- */}
            {mode === 'simple' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none"></div>
                    
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Zap size={20} className="text-emerald-500" /> Dados do Projeto</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Tipo de Serviço" placeholder="Ex: Logotipo, Banner..." value={simpleData.serviceType} onChange={(e: any) => setSimpleData({...simpleData, serviceType: e.target.value})} />
                        <InputField label="Tempo Estimado (Horas)" type="number" value={simpleData.hours} onChange={(e: any) => setSimpleData({...simpleData, hours: Number(e.target.value)})} suffix="h" />
                        <InputField label="Valor Hora Desejado" type="number" value={simpleData.hourlyRate} onChange={(e: any) => setSimpleData({...simpleData, hourlyRate: Number(e.target.value)})} prefix="R$" />
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Complexidade</label>
                            <select 
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl py-2.5 px-4 text-white focus:border-emerald-500 outline-none transition text-sm appearance-none cursor-pointer"
                                value={simpleData.complexity}
                                onChange={(e) => setSimpleData({...simpleData, complexity: Number(e.target.value)})}
                            >
                                <option value="1">Baixa (Padrão)</option>
                                <option value="1.2">Média (+20%)</option>
                                <option value="1.5">Alta (+50%)</option>
                                <option value="2">Extrema (2x)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Urgência</label>
                            <select 
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl py-2.5 px-4 text-white focus:border-red-500 outline-none transition text-sm appearance-none cursor-pointer"
                                value={simpleData.urgency}
                                onChange={(e) => setSimpleData({...simpleData, urgency: Number(e.target.value)})}
                            >
                                <option value="1">Normal</option>
                                <option value="1.2">Urgente (+20%)</option>
                                <option value="1.5">Emergência (+50%)</option>
                            </select>
                        </div>

                        <InputField label="Margem de Lucro (%)" type="number" value={simpleData.profitMargin} onChange={(e: any) => setSimpleData({...simpleData, profitMargin: Number(e.target.value)})} suffix="%" />
                    </div>
                </div>
            )}

            {/* --- MODO JULIUS --- */}
            {mode === 'julius' && (
                <div className="space-y-6">
                    {/* Intro Julius */}
                    <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex items-start gap-4">
                        <div className="bg-purple-600 text-white p-3 rounded-xl shrink-0"><Wallet size={24} /></div>
                        <div>
                            <h3 className="font-bold text-white text-sm">Modo Julius Ativado</h3>
                            <p className="text-purple-200 text-xs mt-1 leading-relaxed">"Se você não comprar nada, o desconto é maior." - Mas aqui precisamos gastar para trabalhar. Vamos calcular cada centavo.</p>
                        </div>
                    </div>

                    {/* Meta Financeira */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative">
                        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={16} /> Meta & Jornada</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField label="Salário Líquido Desejado" type="number" prefix="R$" value={juliusData.desiredNetIncome} onChange={(e: any) => setJuliusData({...juliusData, desiredNetIncome: Number(e.target.value)})} />
                            <InputField label="Horas / Dia" type="number" suffix="h" value={juliusData.hoursWorked} onChange={(e: any) => setJuliusData({...juliusData, hoursWorked: Number(e.target.value)})} />
                            <InputField label="Dias / Mês" type="number" suffix="d" value={juliusData.daysWorked} onChange={(e: any) => setJuliusData({...juliusData, daysWorked: Number(e.target.value)})} />
                        </div>
                    </div>

                    {/* Custos Fixos */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Home size={16} /> Custos Fixos Mensais</h2>
                            <button onClick={addFixedCost} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><Plus size={14} /> Add</button>
                        </div>
                        <div className="space-y-2">
                            {juliusData.costs.map((cost) => (
                                <div key={cost.id} className="flex gap-2">
                                    <input className="flex-1 bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-purple-500" value={cost.name} onChange={(e) => updateFixedCost(cost.id, 'name', e.target.value)} />
                                    <div className="relative w-32">
                                        <span className="absolute left-2 top-2 text-zinc-500 text-xs">R$</span>
                                        <input type="number" className="w-full bg-black/40 border border-zinc-700 rounded-lg pl-6 pr-2 py-2 text-white text-xs outline-none focus:border-purple-500" value={cost.value} onChange={(e) => updateFixedCost(cost.id, 'value', Number(e.target.value))} />
                                    </div>
                                    <button onClick={() => removeFixedCost(cost.id)} className="p-2 text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Energia Elétrica */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Lightbulb size={16} /> Energia Elétrica</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase">R$ / kWh:</span>
                                <input type="number" className="w-16 bg-black/40 border border-zinc-700 rounded px-2 py-1 text-xs text-white" value={juliusData.kwhPrice} onChange={(e) => setJuliusData({...juliusData, kwhPrice: Number(e.target.value)})} step="0.01" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1 px-1">
                                <div className="col-span-5">Aparelho</div>
                                <div className="col-span-3">Potência (W)</div>
                                <div className="col-span-3">Horas/Dia</div>
                                <div className="col-span-1"></div>
                            </div>
                            {juliusData.appliances.map((app) => (
                                <div key={app.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5"><input className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" value={app.name} onChange={(e) => updateAppliance(app.id, 'name', e.target.value)} /></div>
                                    <div className="col-span-3"><input type="number" className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" value={app.watts} onChange={(e) => updateAppliance(app.id, 'watts', Number(e.target.value))} /></div>
                                    <div className="col-span-3"><input type="number" className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-yellow-500" value={app.hoursPerDay} onChange={(e) => updateAppliance(app.id, 'hoursPerDay', Number(e.target.value))} /></div>
                                    <div className="col-span-1 flex justify-center"><button onClick={() => removeAppliance(app.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button></div>
                                </div>
                            ))}
                            <button onClick={addAppliance} className="w-full py-2 border border-dashed border-zinc-700 rounded-lg text-xs text-zinc-500 hover:text-yellow-500 hover:border-yellow-500 transition mt-2">+ Adicionar Aparelho</button>
                        </div>
                    </div>

                    {/* Equipamentos (Depreciação) */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2"><Monitor size={16} /> Depreciação (Equipamentos)</h2>
                            <button onClick={addEquipment} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><Plus size={14} /> Add</button>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1 px-1">
                                <div className="col-span-5">Item</div>
                                <div className="col-span-3">Valor (R$)</div>
                                <div className="col-span-3">Vida Útil (Anos)</div>
                                <div className="col-span-1"></div>
                            </div>
                            {juliusData.equipment.map((eq) => (
                                <div key={eq.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5"><input className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-500" value={eq.name} onChange={(e) => updateEquipment(eq.id, 'name', e.target.value)} /></div>
                                    <div className="col-span-3"><input type="number" className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-500" value={eq.value} onChange={(e) => updateEquipment(eq.id, 'value', Number(e.target.value))} /></div>
                                    <div className="col-span-3"><input type="number" className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-500" value={eq.lifespanYears} onChange={(e) => updateEquipment(eq.id, 'lifespanYears', Number(e.target.value))} /></div>
                                    <div className="col-span-1 flex justify-center"><button onClick={() => removeEquipment(eq.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* RESUMO SIMPLES */}
            {mode === 'simple' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-24 shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 font-heading uppercase tracking-wide border-b border-zinc-800 pb-4">Resultado Estimado</h3>
                    
                    <div className="space-y-4 mb-8">
                        <ResultCard 
                            title="Valor Sugerido" 
                            value={`R$ ${simpleResults.total.toFixed(2)}`} 
                            color={simpleResults.status === 'saudavel' ? 'text-emerald-400' : simpleResults.status === 'atencao' ? 'text-amber-400' : 'text-red-400'}
                            icon={DollarSign}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <ResultCard 
                                title="Custo Base" 
                                value={`R$ ${simpleResults.baseCost.toFixed(2)}`} 
                                subtext="Sem margem/adicionais"
                                color="text-zinc-400"
                            />
                            <ResultCard 
                                title="Lucro Real" 
                                value={`R$ ${simpleResults.profitValue.toFixed(2)}`} 
                                color="text-blue-400"
                            />
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${simpleResults.status === 'saudavel' ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-300' : 'bg-amber-900/20 border-amber-500/20 text-amber-300'}`}>
                        {simpleResults.status === 'saudavel' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <div>
                            <p className="text-xs font-bold uppercase">{simpleResults.status === 'saudavel' ? 'Margem Saudável' : 'Margem de Risco'}</p>
                            <p className="text-[10px] opacity-80 mt-1">Este valor cobre suas horas e garante {simpleData.profitMargin}% de lucro para reinvestimento.</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button onClick={handleExportPDF} className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition flex items-center justify-center gap-2">
                            <Download size={16} /> Baixar PDF
                        </button>
                        <button onClick={copySummary} className="w-full bg-zinc-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-zinc-700 transition flex items-center justify-center gap-2">
                            <Copy size={16} /> Copiar Resumo
                        </button>
                    </div>
                </div>
            )}

            {/* RESUMO JULIUS */}
            {mode === 'julius' && (
                <div className="bg-gradient-to-b from-purple-900/20 to-zinc-900 border border-purple-500/30 rounded-3xl p-6 sticky top-24 shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 font-heading uppercase tracking-wide border-b border-purple-500/20 pb-4 text-center">Diagnóstico Financeiro</h3>
                    
                    <div className="space-y-4 mb-8">
                        <div className="text-center mb-6">
                            <p className="text-xs text-purple-300 font-bold uppercase tracking-widest mb-1">Preço de Venda Ideal</p>
                            <p className="text-4xl font-black text-white">R$ {juliusResults.idealHourlyRate.toFixed(2)}<span className="text-sm font-normal text-zinc-500">/h</span></p>
                        </div>

                        <ResultCard 
                            title="Custo Hora Real" 
                            value={`R$ ${juliusResults.realHourlyRate.toFixed(2)}`} 
                            subtext="Para pagar contas + seu salário"
                            color="text-emerald-400"
                            icon={TrendingUp}
                        />
                        <ResultCard 
                            title="Ponto de Equilíbrio" 
                            value={`R$ ${juliusResults.breakEvenHourlyRate.toFixed(2)}`} 
                            subtext="Apenas para pagar as contas"
                            color="text-amber-400"
                        />
                    </div>

                    <div className="space-y-2 text-xs text-zinc-400 border-t border-purple-500/20 pt-4 mb-6">
                        <div className="flex justify-between"><span>Custo Mensal Total:</span> <span className="text-white">R$ {juliusResults.totalMonthlyCost.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Meta Faturamento:</span> <span className="text-white">R$ {(juliusResults.totalMonthlyCost + juliusData.desiredNetIncome).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Horas Disponíveis:</span> <span className="text-white">{juliusResults.monthlyHoursAvailable}h</span></div>
                    </div>

                    <div className="p-4 bg-purple-600 rounded-xl text-white shadow-lg mb-4">
                        <div className="flex items-center gap-2 mb-2 font-bold text-sm uppercase tracking-wider">
                            <HelpCircle size={16} /> Dica do Julius
                        </div>
                        <p className="text-xs leading-relaxed italic opacity-90">
                            "Se você cobrar menos de <span className="font-bold underline">R$ {juliusResults.breakEvenHourlyRate.toFixed(2)}</span> por hora, você está pagando para trabalhar. Desligue o ar condicionado para economizar R$ {(juliusData.appliances.find(a => a.name.includes('Ar'))?.watts || 0) * (juliusData.kwhPrice/1000) * 8 * 22}."
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button onClick={handleExportPDF} className="w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-zinc-200 transition flex items-center justify-center gap-2">
                            <Download size={16} /> Baixar Relatório Completo
                        </button>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}
