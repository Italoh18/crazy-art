import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registro do Service Worker para permitir a instalação do site como App (Add to Home Screen)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('Service Worker registrado com sucesso:', registration.scope);
    }).catch((err) => {
      console.error('Falha ao registrar Service Worker:', err);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Remove o loader inicial criado apenas para FCP
const initialLoader = document.getElementById('initial-loader');
if (initialLoader) {
  initialLoader.remove();
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);