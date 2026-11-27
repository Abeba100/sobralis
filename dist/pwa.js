const installButton = document.querySelector('#install-app');
const instructions = document.querySelector('#install-help');
const status = document.querySelector('#offline-status');
const updateButton = document.querySelector('#update-app');
const installedLabel = document.querySelector('#installed-label');
let promptEvent = null;
let registration = null;
let offlineReady = false;
let refreshing = false;
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function installationChanged() {
  const installed = standalone();
  installedLabel.hidden = !installed;
  instructions.hidden = installed;
  installButton.hidden = installed || !promptEvent;
}
function updateStatus() {
  if (offlineReady) {
    status.textContent = navigator.onLine ? '✓ Игры сохранены — можно играть без интернета' : '◉ Вы без интернета. Игры, поиск и таймер доступны';
    status.dataset.ready = 'true';
  } else if (!navigator.onLine) {
    status.textContent = 'Подключитесь к интернету один раз, чтобы сохранить приложение';
  }
}
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  promptEvent = event;
  installationChanged();
});
installButton.addEventListener('click', async () => {
  if (!promptEvent) { instructions.open = true; return; }
  const event = promptEvent;
  promptEvent = null;
  installButton.hidden = true;
  try { await event.prompt(); await event.userChoice; }
  catch { instructions.open = true; }
});
window.addEventListener('appinstalled', () => {
  promptEvent = null;
  installButton.hidden = true;
  instructions.hidden = true;
  installedLabel.hidden = false;
});
window.matchMedia('(display-mode: standalone)').addEventListener('change', installationChanged);
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
installationChanged();
updateStatus();
function offerUpdate() { updateButton.hidden = !registration?.waiting || !navigator.serviceWorker.controller; }
updateButton.addEventListener('click', () => {
  if (!registration?.waiting) return;
  refreshing = true;
  updateButton.disabled = true;
  updateButton.textContent = 'Обновляем…';
  registration.waiting.postMessage({type: 'ACTIVATE_UPDATE'});
});
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) location.reload();
  });
  navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(async reg => {
    registration = reg;
    offerUpdate();
    reg.addEventListener('updatefound', () => {
      reg.installing?.addEventListener('statechange', offerUpdate);
    });
    await navigator.serviceWorker.ready;
    offlineReady = true;
    updateStatus();
  }).catch(() => {
    status.textContent = 'Пока работает онлайн. Офлайн-копия не сохранилась — попробуйте перезагрузить страницу с интернетом';
  });
} else {
  status.textContent = 'Этот браузер не поддерживает офлайн-режим. Откройте сайт в Chrome, Edge или Safari';
}
