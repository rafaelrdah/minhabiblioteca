// Service Worker simples para permitir a instalação do PWA
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
  // Deixa as requisições passarem normalmente
});
