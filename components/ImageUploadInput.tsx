import React, { useRef, useState } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  label?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({ 
  value, 
  onChange, 
  placeholder = "https://...", 
  label = "URL da Imagem"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação básica no cliente
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Máximo 5MB permitido.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro no upload');
      }

      onChange(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
        {error && <span className="text-[10px] text-red-500 font-bold animate-pulse">{error}</span>}
      </div>
      
      <div className="relative group">
        <input
          type="text"
          placeholder={placeholder}
          className={`w-full bg-black/40 border ${error ? 'border-red-500/50' : 'border-zinc-700'} rounded-xl pl-10 pr-24 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition group-hover:border-zinc-600`}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <ImageIcon className={`absolute left-3 top-3.5 ${error ? 'text-red-400' : 'text-zinc-600'}`} size={16} />
        
        <div className="absolute right-2 top-1.5 h-9">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-full px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-2 text-xs font-bold transition disabled:opacity-50 border border-zinc-700 hover:border-zinc-600"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="text-[10px]">Enviando...</span>
              </>
            ) : (
              <>
                <Upload size={14} />
                <span>Upload</span>
              </>
            )}
          </button>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleUpload} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Preview opcional compacto abaixo do campo se tiver valor */}
      {value && (
        <div className="mt-2 flex items-center gap-3 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800 animate-fade-in">
          <div className="w-10 h-10 rounded border border-zinc-700 overflow-hidden bg-black shrink-0">
             <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <p className="text-[10px] text-zinc-500 truncate italic flex-1">{value}</p>
        </div>
      )}
    </div>
  );
};
