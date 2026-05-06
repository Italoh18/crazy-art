import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// PWA Audit Logs
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('PWA Audit: Checking Service Worker Status...');
    console.log('PWA Audit: Controller:', navigator.serviceWorker.controller ? 'Active' : 'NULL (Wait for refresh or check skipWaiting/clientsClaim)');
    
    navigator.serviceWorker.ready.then((registration) => {
      console.log('PWA Audit: Service Worker Ready. Scope:', registration.scope);
    });

    // Requested Debug Alert
    setTimeout(() => {
      alert(
        "SW Controller: " + (navigator.serviceWorker.controller ? "YES" : "NO")
      );
    }, 3000);
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA Audit: beforeinstallprompt FIRED. App is installable.');
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);