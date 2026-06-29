const socket = io();

// DOM
const logContainer = document.getElementById('logContainer');
const commandInput = document.getElementById('commandInput');
const sendBtn = document.getElementById('sendCommand');

// Durum
const botName = document.getElementById('botName');
const serverInfo = document.getElementById('serverInfo');
const health = document.getElementById('health');
const food = document.getElementById('food');
const coords = document.getElementById('coords');

// ============ LOG EKLE ============
function addLog(type, message) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry type-${type}`;
  entry.innerHTML = `<span class="time">[${time}]</span> ${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// ============ KOMUT GÖNDER ============
function sendCommand(command) {
  if (!command) return;
  socket.emit('command', command);
  commandInput.value = '';
}

commandInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendCommand(commandInput.value);
});
sendBtn.addEventListener('click', () => sendCommand(commandInput.value));

// Hızlı komut butonları
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendCommand(btn.dataset.command);
  });
});

// ============ AYARLARI KAYDET ============
document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    botName: document.getElementById('setBotName').value,
    serverHost: document.getElementById('setServerHost').value,
    serverPort: parseInt(document.getElementById('setServerPort').value),
    version: document.getElementById('setVersion').value,
    auth: document.getElementById('setAuth').value,
    renderDistance: parseInt(document.getElementById('setRenderDistance').value)
  };

  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    addLog('sistem', `✅ ${result.message}`);
    setTimeout(() => location.reload(), 3000);
  } catch (err) {
    addLog('hata', `❌ Ayarlar kaydedilemedi: ${err.message}`);
  }
});

// ============ MEVCUT AYARLARI YÜKLE ============
async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    document.getElementById('setBotName').value = config.botName || '';
    document.getElementById('setServerHost').value = config.serverHost || '';
    document.getElementById('setServerPort').value = config.serverPort || 25565;
    document.getElementById('setVersion').value = config.version || '1.8.9';
    document.getElementById('setAuth').value = config.auth || 'offline';
    document.getElementById('setRenderDistance').value = config.renderDistance || 10;
  } catch (err) {
    addLog('hata', `❌ Ayarlar yüklenemedi: ${err.message}`);
  }
}

// ============ SOCKET OLAYLARI ============
socket.on('log', (data) => {
  addLog(data.type, data.message);
});

socket.on('botStatus', (data) => {
  if (data.botName) botName.textContent = data.botName;
  if (data.server) serverInfo.textContent = data.server;
  if (data.health !== undefined) health.textContent = data.health;
  if (data.food !== undefined) food.textContent = data.food;
  if (data.coords) coords.textContent = data.coords;
});

socket.on('restartBot', () => {
  addLog('sistem', '🔄 Bot yeniden başlatılıyor...');
  setTimeout(() => location.reload(), 2000);
});

// ============ SAYFA YÜKLENİNCE ============
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  addLog('sistem', '🚀 Dashboard bağlantı kuruldu.');
  addLog('sistem', '💡 Doğal dilde komut gönderebilirsiniz.');
  addLog('sistem', '📌 Örnek: "git x 100 z 200", "beni takip et", "sohbet et Merhaba"');
});
