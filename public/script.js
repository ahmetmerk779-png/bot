const socket = io();

// DOM
const logContainer = document.getElementById('logContainer');
const commandInput = document.getElementById('commandInput');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');

// Durum elementleri
const botNameDisplay = document.getElementById('botNameDisplay');
const serverDisplay = document.getElementById('serverDisplay');
const healthDisplay = document.getElementById('healthDisplay');
const foodDisplay = document.getElementById('foodDisplay');
const coordsDisplay = document.getElementById('coordsDisplay');

// Modal
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');

// ============ LOG ============
function addLog(type, message) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry type-${type}`;
  entry.innerHTML = `<span class="time">[${time}]</span> ${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// ============ SOCKET ============
socket.on('log', (data) => {
  addLog(data.type || 'sistem', data.message);
});

socket.on('botStatus', (data) => {
  if (data.botName) botNameDisplay.textContent = data.botName;
  if (data.server) serverDisplay.textContent = data.server;
  if (data.health !== undefined) healthDisplay.textContent = data.health;
  if (data.food !== undefined) foodDisplay.textContent = data.food;
  if (data.coords) coordsDisplay.textContent = data.coords;
  if (data.status) {
    statusDiv.textContent = data.status;
    statusDiv.style.borderColor = data.status === 'Çevrimiçi' ? '#00ff88' : '#ffaa00';
    statusDiv.style.background = data.status === 'Çevrimiçi' ? '#00ff8844' : '#ffaa0044';
  }
});

socket.on('waypointsUpdate', (data) => {
  const list = document.getElementById('wpList');
  if (!list) return;
  list.innerHTML = data.map(w => `<li>📍 ${w.name} (${w.coords.join(', ')})</li>`).join('');
});

socket.on('discoveriesUpdate', (data) => {
  const list = document.getElementById('discList');
  if (!list) return;
  list.innerHTML = data.map(d => `<li>🗺️ ${d.name} (${d.coords.join(', ')})</li>`).join('');
});

// ============ KOMUT GÖNDER ============
function sendCommand(cmd) {
  if (!cmd.trim()) return;
  socket.emit('command', { command: cmd });
  addLog('komut', `📨 ${cmd}`);
  commandInput.value = '';
}

sendBtn.addEventListener('click', () => sendCommand(commandInput.value));
commandInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendCommand(commandInput.value);
});

// ============ HIZLI KOMUTLAR ============
document.querySelectorAll('.qbtn').forEach(btn => {
  btn.addEventListener('click', () => sendCommand(btn.dataset.cmd));
});

// ============ AYARLAR MODAL ============
document.getElementById('settingsBtn').addEventListener('click', () => {
  settingsModal.style.display = 'flex';
  // Mevcut ayarları doldur (varsa)
  fetch('/api/config')
    .then(res => res.json())
    .then(cfg => {
      document.getElementById('serverHost').value = cfg.serverHost || '';
      document.getElementById('serverPort').value = cfg.serverPort || 25565;
      document.getElementById('serverVersion').value = cfg.version || '1.8.9';
      document.getElementById('botName').value = cfg.botName || '';
      document.getElementById('authType').value = cfg.auth || 'offline';
    })
    .catch(() => {});
});

closeSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

saveSettings.addEventListener('click', () => {
  const data = {
    serverHost: document.getElementById('serverHost').value,
    serverPort: parseInt(document.getElementById('serverPort').value) || 25565,
    version: document.getElementById('serverVersion').value,
    botName: document.getElementById('botName').value,
    auth: document.getElementById('authType').value
  };
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(() => {
    settingsModal.style.display = 'none';
    addLog('sistem', '✅ Ayarlar kaydedildi, bot yeniden bağlanıyor...');
    // Bot'u yeniden başlatmak için reload veya socket eventi
    socket.emit('reconnectBot');
  })
  .catch(err => addLog('hata', `Ayarlar kaydedilemedi: ${err.message}`));
});

// ============ BAŞLANGIÇ ============
addLog('sistem', '🚀 Dashboard bağlantı kuruldu.');
addLog('sistem', '💡 Bot komutları doğal dilde gönderebilirsiniz.');
