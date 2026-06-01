import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registro do Service Worker para permitir a instalação do site como App (Add to Home Screen)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('Service Worker registrado com sucesso:', registration.scope);

      // Verificação automática de atualizações
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('Nova versão do aplicativo pronta! Atualizando o PWA...');
              }
            }
          };
        }
      };
    }).catch((err) => {
      console.error('Falha ao registrar Service Worker:', err);
    });

    // Quando o Service Worker ativo é substituído por um novo, recarrega a página automaticamente para aplicar as alterações
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('Aplicativo atualizado com sucesso! Recarregando página...');
        window.location.reload();
      }
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);