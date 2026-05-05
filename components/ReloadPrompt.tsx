
import React from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {(offlineReady || needRefresh) && (
        <motion.div
           initial={{ y: 100, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           exit={{ y: 100, opacity: 0 }}
           className="fixed bottom-6 right-6 z-[9999] p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               <RefreshCw className={`text-primary ${needRefresh ? 'animate-spin' : ''}`} size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">
                {needRefresh ? 'Nova Atualização!' : 'Pronto para Offline!'}
              </h4>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 leading-relaxed">
                {needRefresh 
                  ? 'Uma nova versão do Crazy Art está disponível para você.' 
                  : 'O site foi baixado e agora funciona mesmo sem internet!'}
              </p>
              
              <div className="mt-4 flex gap-2">
                {needRefresh && (
                  <button
                    onClick={() => updateServiceWorker(true)}
                    className="px-4 py-2 bg-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
                  >
                    Atualizar Agora
                  </button>
                )}
                <button
                  onClick={close}
                  className="px-4 py-2 bg-zinc-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center gap-2"
                >
                  <X size={12} /> {needRefresh ? 'Depois' : 'Entendido'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
