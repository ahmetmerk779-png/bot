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

commandInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendCommand(commandInput.value);
});
sendBtn.addEventListener('click', () => sendCommand(commandInput.value));

// ============ HIZLI KOMUT YÖNETİMİ ============
let quickCommands = [];

function loadQuickCommands() {
  try {
    const stored = localStorage.getItem('quickCommands');
    if (stored) {
      quickCommands = JSON.parse(stored);
    } else {
      quickCommands = [
        { label: '🔍 Keşfet', command: 'explore' },
        { label: '⏹️ Durdur', command: 'explore durdur' },
        { label: '⛏️ Elmas Ara', command: 'branchMine 50 5 kuzey' },
        { label: '⏹️ Kazmayı Durdur', command: 'branchMine durdur' },
        { label: '👀 Gözlem', command: 'observe' },
        { label: '🍖 Yemek Ye', command: 'eat' }
      ];
      saveQuickCommands();
    }
  } catch (err) {
    console.error('Quick commands yüklenemedi:', err);
  }
  renderQuickCommands();
}

function saveQuickCommands() {
  localStorage.setItem('quickCommands', JSON.stringify(quickCommands));
}

function renderQuickCommands() {
  const container = document.getElementById('quickCommandsList');
  if (!container) return;
  container.innerHTML = '';
  quickCommands.forEach((item, index) => {
    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline-block';
    wrapper.style.margin = '5px';
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = item.label;
    btn.dataset.command = item.command;
    btn.addEventListener('click', () => sendCommand(item.command));
    wrapper.appendChild(btn);
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.className = 'delete-quick-btn';
    delBtn.style.marginLeft = '5px';
    delBtn.style.background = '#ff4444';
    delBtn.style.color = '#fff';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '50%';
    delBtn.style.width = '20px';
    delBtn.style.height = '20px';
    delBtn.style.cursor = 'pointer';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      quickCommands.splice(index, 1);
      saveQuickCommands();
      renderQuickCommands();
      addLog('sistem', `🗑️ "${item.label}" silindi.`);
    });
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
  });
}

document.getElementById('addQuickBtn')?.addEventListener('click', () => {
  const label = document.getElementById('newQuickLabel').value.trim();
  const command = document.getElementById('newQuickCommand').value.trim();
  if (!label || !command) {
    addLog('hata', '❌ Buton adı ve komut girmelisiniz.');
    return;
  }
  quickCommands.push({ label, command });
  saveQuickCommands();
  renderQuickCommands();
  document.getElementById('newQuickLabel').value = '';
  document.getElementById('newQuickCommand').value = '';
  addLog('sistem', `✅ "${label}" komutu eklendi.`);
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

// ============ SAYFA YÜKLENİNCE ============
document.addEventListener('DOMContentLoaded', () => {
  loadQuickCommands();
  loadConfig();
  addLog('sistem', '🚀 Dashboard bağlantı kuruldu.');
  addLog('sistem', '💡 Doğal dilde komut gönderebilirsiniz.');
});
