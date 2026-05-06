import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Limpeza automática de Service Workers antigos para remover o prompt de notificações push dos clientes
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service Worker antigo removido com sucesso.');
    }
  }).catch((err) => {
    console.error('Erro ao remover Service Worker:', err);
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