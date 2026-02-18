
import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já aceitou
    const consent = localStorage.getItem('crazy_cookie_consent');
    if (!consent) {
      // Pequeno delay para animação de entrada ficar suave
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('crazy_cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] flex justify-center pointer-events-none animate-fade-in-up">
      <div className="bg-[#121215]/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col sm:flex-row items-center gap-4 pointer-events-auto">
        <div className="p-3 bg-zinc-800 rounded-xl text-primary shrink-0">
          <Cookie size={24} />
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <h4 className="text-white font-bold text-sm mb-1">Cookies & Dados Locais</h4>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Utilizamos armazenamento local apenas para garantir que seu login e preferências funcionem corretamente. 
            Não vendemos seus dados. Ao continuar, você concorda com isso.
          </p>
        </div>

        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button 
            onClick={handleAccept}
            className="flex-1 sm:flex-none bg-primary hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wide transition shadow-lg shadow-primary/20"
          >
            Entendi
          </button>
          <button 
            onClick={handleAccept} // Fecha também (aceite implícito ou apenas fechar o aviso)
            className="p-2.5 hover:bg-white/10 rounded-xl text-zinc-500 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
