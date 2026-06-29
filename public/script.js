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
  socket.emit('command', { command });
  addLog('komut', `📨 ${command}`);
  commandInput.value = '';
}

// Enter ile gönder
commandInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendCommand(commandInput.value);
});
sendBtn.addEventListener('click', () => sendCommand(commandInput.value));

// Hızlı komut butonları
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => sendCommand(btn.dataset.command));
});

// ============ WAYPOINT ============
document.getElementById('addWpBtn')?.addEventListener('click', () => {
  const name = document.getElementById('wpName').value || 'hedef';
  const x = document.getElementById('wpX').value || 0;
  const y = document.getElementById('wpY').value || 64;
  const z = document.getElementById('wpZ').value || 0;
  sendCommand(`waypoint add ${name} ${x} ${y} ${z}`);
});
document.getElementById('saveCurrentBtn')?.addEventListener('click', () => {
  const name = document.getElementById('wpName').value || 'hedef';
  sendCommand(`waypoint ${name}`);
});
document.getElementById('goWpBtn')?.addEventListener('click', () => {
  const name = document.getElementById('wpGoName').value;
  if (!name) return alert('Waypoint adı girin.');
  sendCommand(`waypoint go ${name}`);
});
document.getElementById('listWpBtn')?.addEventListener('click', () => {
  sendCommand('waypoint list');
});

// ============ AYARLARI KAYDET ============
document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    botName: document.getElementById('setBotName').value,
    serverHost: document.getElementById('setServerHost').value,
    serverPort: parseInt(document.getElementById('setServerPort').value),
    version: document.getElementById('setVersion').value,
    auth: document.getElementById('setAuth').value,
    renderDistance: parseInt(document.getElementById('setRenderDistance').value)
  };
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(() => {
    addLog('sistem', '✅ Ayarlar kaydedildi, bot yeniden başlatılıyor...');
    setTimeout(() => location.reload(), 3000);
  })
  .catch(err => addLog('hata', `❌ ${err.message}`));
});

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

socket.on('waypointsUpdate', (data) => {
  const list = document.getElementById('waypointList');
  if (!list) return;
  list.innerHTML = data.map(w => `<li><strong>${w.name}</strong> - ${w.coords.join(', ')}</li>`).join('');
});

socket.on('discoveriesUpdate', (data) => {
  const list = document.getElementById('discoveriesList');
  if (!list) return;
  list.innerHTML = data.map(d => `<li>${d.name} - ${d.coords.join(', ')}</li>`).join('');
});

// Başlangıç
addLog('sistem', '🚀 Dashboard bağlantı kuruldu.');
addLog('sistem', '💡 Doğal dilde komut gönderebilirsiniz.');
