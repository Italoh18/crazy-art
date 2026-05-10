import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // If running inside the app, don't show the prompt
    if (standalone) return;

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      checkAndShowPrompt();
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, beforeinstallprompt doesn't fire, so we check and show after a delay
    if (ios && !standalone) {
      setTimeout(() => {
        checkAndShowPrompt();
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const checkAndShowPrompt = () => {
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    // Only show if never dismissed or dismissed more than a week ago
    if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
      setShowPrompt(true);
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt && !isIOS) return;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Just inform the user for iOS since we can't trigger it programmatically
      alert('No Safari, toque no botão de Compartilhar (o quadrado com uma seta para cima) e selecione "Adicionar à Tela de Início".');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl z-[100] flex gap-4 items-start"
        >
          <div className="p-3 bg-zinc-800 rounded-xl text-primary shrink-0 hidden sm:block">
            <Smartphone size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold mb-1 text-sm uppercase tracking-wider">App CrazyArt</h3>
            <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
              Instale ou atualize nosso app para uma experiência mais rápida. Se você está com problemas, reinstalar resolve na hora!
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handleInstall}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 flex items-center gap-2 transition"
              >
                <Download size={14} /> 
                {isIOS ? 'Como Instalar?' : 'Instalar / Atualizar'}
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-zinc-500 hover:text-white p-1">
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
