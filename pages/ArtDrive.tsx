
import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Folder, Image as ImageIcon, FileText, Film, MoreVertical, 
  Search, Grid, List, Download, Trash2, Upload, Plus,
  File, Cloud, ArrowLeft, LayoutGrid, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const folders = [
  { id: 'all', name: 'Todos os Arquivos', icon: LayoutGrid },
  { id: 'logos', name: 'Logotipos', icon: Folder },
  { id: 'estampas', name: 'Estampas', icon: Folder },
  { id: 'mockups', name: 'Mockups 3D', icon: Folder },
  { id: 'vetores', name: 'Vetores', icon: Folder },
  { id: 'social', name: 'Social Media', icon: Folder },
];

export default function ArtDrive() {
  const { driveFiles, loadDriveFiles, addDriveFile, deleteDriveFile } = useData();
  const { role } = useAuth();
  
  const [activeFolder, setActiveFolder] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Upload Form State
  const [newFile, setNewFile] = useState({ name: '', url: '', type: 'image', folder: 'logos' });

  useEffect(() => {
    loadDriveFiles(activeFolder === 'all' ? undefined : activeFolder);
  }, [activeFolder]);

  const filteredFiles = driveFiles.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon size={24} className="text-purple-400" />;
    if (type.includes('video')) return <Film size={24} className="text-red-400" />;
    if (type.includes('pdf')) return <FileText size={24} className="text-orange-400" />;
    return <File size={24} className="text-blue-400" />;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile.url || !newFile.name) return;
    
    await addDriveFile(newFile);
    setIsUploadModalOpen(false);
    setNewFile({ name: '', url: '', type: 'image', folder: activeFolder !== 'all' ? activeFolder : 'logos' });
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#121215] border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
            <Link to="/programs" className="text-zinc-400 hover:text-white transition">
                <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2 font-heading tracking-wide">
                <Cloud className="text-primary" size={20} />
                Crazy Drive
            </h1>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
            {role === 'admin' && (
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full bg-primary hover:bg-amber-600 text-white font-bold py-3 rounded-xl mb-6 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition active:scale-95"
                >
                    <Upload size={18} /> Upload
                </button>
            )}

            <div className="space-y-1">
                <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pastas</p>
                {folders.map(folder => (
                    <button
                        key={folder.id}
                        onClick={() => setActiveFolder(folder.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${activeFolder === folder.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}
                    >
                        <folder.icon size={18} className={activeFolder === folder.id ? 'text-primary' : ''} />
                        {folder.name}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="p-4 border-t border-zinc-800">
            <div className="bg-zinc-900 rounded-xl p-4">
                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                    <span>Armazenamento</span>
                    <span>{driveFiles.length} arquivos</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-1/4 rounded-full"></div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
         {/* Top Bar */}
         <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur z-10 shrink-0">
            <div className="flex-1 max-w-xl relative">
                <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar arquivos..." 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary outline-none transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 ml-4">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                    <Grid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                    <List size={18} />
                </button>
            </div>
         </header>

         {/* File List */}
         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {filteredFiles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                        <Folder size={40} className="opacity-20" />
                    </div>
                    <p>Nenhum arquivo encontrado nesta pasta.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredFiles.map(file => (
                        <div key={file.id} className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition relative">
                            <div className="aspect-square bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                                {file.type === 'image' ? (
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500 group-hover:scale-105" />
                                ) : (
                                    getFileIcon(file.type)
                                )}
                                
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => handleDownload(file.url, file.name)}
                                        className="p-2 bg-white text-black rounded-full hover:scale-110 transition"
                                        title="Baixar / Abrir"
                                    >
                                        <Download size={16} />
                                    </button>
                                    {role === 'admin' && (
                                        <button 
                                            onClick={() => deleteDriveFile(file.id)}
                                            className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="p-3">
                                <h3 className="text-sm font-medium text-white truncate" title={file.name}>{file.name}</h3>
                                <p className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                                    <span className="uppercase">{file.type}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition group">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center shrink-0">
                                    {file.type === 'image' ? <img src={file.url} className="w-full h-full object-cover rounded-lg" /> : getFileIcon(file.type)}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-medium text-white truncate">{file.name}</h3>
                                    <p className="text-[10px] text-zinc-500">{new Date(file.created_at).toLocaleDateString()} • {file.folder}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button 
                                    onClick={() => handleDownload(file.url, file.name)}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg"
                                >
                                    <Download size={18} />
                                </button>
                                {role === 'admin' && (
                                    <button 
                                        onClick={() => deleteDriveFile(file.id)}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
      </main>

      {/* Upload Modal */}
      {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-white">Upload de Arquivo</h2>
                      <button onClick={() => setIsUploadModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleUpload} className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Nome do Arquivo</label>
                          <input 
                            className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" 
                            placeholder="Ex: Logo Oficial.png"
                            value={newFile.name}
                            onChange={e => setNewFile({...newFile, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Link do Arquivo (URL)</label>
                          <input 
                            className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary outline-none" 
                            placeholder="https://..."
                            value={newFile.url}
                            onChange={e => setNewFile({...newFile, url: e.target.value})}
                          />
                          <p className="text-[10px] text-zinc-600 mt-1">Hospede a imagem/arquivo externamente e cole o link aqui.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Pasta</label>
                              <select 
                                className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
                                value={newFile.folder}
                                onChange={e => setNewFile({...newFile, folder: e.target.value})}
                              >
                                  {folders.filter(f => f.id !== 'all').map(f => (
                                      <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tipo</label>
                              <select 
                                className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary outline-none"
                                value={newFile.type}
                                onChange={e => setNewFile({...newFile, type: e.target.value})}
                              >
                                  <option value="image">Imagem</option>
                                  <option value="video">Vídeo</option>
                                  <option value="pdf">PDF</option>
                                  <option value="vector">Vetor (SVG/AI)</option>
                                  <option value="zip">ZIP</option>
                              </select>
                          </div>
                      </div>
                      
                      <div className="pt-4">
                          <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-amber-600 transition">
                              Adicionar ao Drive
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
