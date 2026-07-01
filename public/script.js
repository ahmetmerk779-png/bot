const socket = io();

// DOM
const logContainer = document.getElementById('logContainer');
const commandInput = document.getElementById('commandInput');
const sendBtn = document.getElementById('sendCommand');
const botName = document.getElementById('botName');
const serverInfo = document.getElementById('serverInfo');
const health = document.getElementById('health');
const food = document.getElementById('food');
const coords = document.getElementById('coords');
const ping = document.getElementById('ping');
const radarCanvas = document.getElementById('radarCanvas');
const ctx = radarCanvas.getContext('2d');

// ============ LOG ============
function addLog(type, message) {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry type-${type}`;
  entry.innerHTML = `<span class="time">[${time}]</span> ${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// ============ KOMUT ============
function sendCommand(command) {
  if (!command) return;
  socket.emit('command', command);
  addLog('komut', `📨 ${command}`);
  commandInput.value = '';
}

commandInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendCommand(commandInput.value);
});
sendBtn.addEventListener('click', () => sendCommand(commandInput.value));

// ============ HIZLI KOMUTLAR ============
let quickCommands = [];

function loadQuickCommands() {
  try {
    const stored = localStorage.getItem('quickCommands');
    if (stored) {
      quickCommands = JSON.parse(stored);
    } else {
      quickCommands = [
        { label: '🔍 Keşfet', command: 'explore' },
        { label: '⏹️ Durdur', command: 'stopFollow' },
        { label: '⛏️ Elmas Ara', command: 'mine diamond_ore' },
        { label: '👀 Gözlem', command: 'observe' },
        { label: '🍖 Yemek Ye', command: 'eat' }
      ];
      saveQuickCommands();
    }
  } catch (err) { console.error(err); }
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
    delBtn.className = 'delete-quick-btn';
    delBtn.textContent = '✕';
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

// ============ AYARLAR ============
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

// ============ RADAR ============
function drawRadar(entities) {
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const centerX = w/2;
  const centerY = h/2;
  const radius = Math.min(w, h) / 2 - 10;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a1a';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = '#2a4a5a';
  ctx.lineWidth = 1;
  for (let r = radius / 4; r < radius; r += radius / 4) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
    ctx.stroke();
  }

  ctx.strokeStyle = '#2a4a5a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.stroke();

  ctx.fillStyle = '#00d4ff';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '8px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Bot', centerX, centerY - 10);

  entities.forEach(e => {
    if (e.distance > 20) return;
    const angle = Math.atan2(e.z, e.x);
    const r = (e.distance / 20) * radius;
    const x = centerX + Math.sin(angle) * r;
    const y = centerY - Math.cos(angle) * r;

    let color = '#888';
    if (e.type === 'player') color = '#44ff88';
    else if (e.type === 'mob') {
      if (e.name.includes('zombie') || e.name.includes('skeleton') || e.name.includes('spider')) color = '#ff4444';
      else color = '#ffcc44';
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(e.name || '?', x, y - 8);
  });
}

// ============ ENVANTER ============
function updateInventory(items) {
  const list = document.getElementById('inventoryList');
  if (!list) return;
  list.innerHTML = items.map(i =>
    `<li>${i.name} x${i.count} ${i.durability > 0 ? `(Hasarlı: ${i.durability})` : ''}</li>`
  ).join('');
}

// ============ TARİHÇE ============
function updateHistory(data) {
  const list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = data.slice(-20).map(h =>
    `<li>${new Date(h.time).toLocaleTimeString()} - ${h.event} ${h.block ? '🔹 '+h.block : ''} ${h.coords ? '📍 '+h.coords : ''}</li>`
  ).join('');
}

// ============ KEŞİFLER ============
function updateDiscoveries(data) {
  const list = document.getElementById('discoveriesList');
  if (!list) return;
  list.innerHTML = data.map(d =>
    `<li>${new Date(d.time).toLocaleTimeString()} - ${d.type} 📍 ${d.coords}</li>`
  ).join('');
}

// ============ SOHBET GEÇMİŞİ ============
function updateChatHistory(data) {
  const list = document.getElementById('chatHistoryList');
  if (!list) return;
  list.innerHTML = data.slice(-20).map(c =>
    `<li>${new Date(c.time).toLocaleTimeString()} - ${c.type}: ${c.message}</li>`
  ).join('');
}

// ============ SOCKET ============
socket.on('log', (data) => addLog(data.type, data.message));
socket.on('botStatus', (data) => {
  if (data.botName) botName.textContent = data.botName;
  if (data.server) serverInfo.textContent = data.server;
  if (data.health !== undefined) health.textContent = data.health;
  if (data.food !== undefined) food.textContent = data.food;
  if (data.coords) coords.textContent = data.coords;
});
socket.on('ping', (data) => { ping.textContent = data; });
socket.on('radarData', (data) => drawRadar(data));
socket.on('inventory', (data) => updateInventory(data));

// ============ SAYFA YÜKLENİNCE ============
async function loadHistory() {
  try {
    const response = await fetch('/api/history');
    const data = await response.json();
    updateHistory(data);
  } catch (err) {}
}

async function loadDiscoveries() {
  try {
    const response = await fetch('/api/discoveries');
    const data = await response.json();
    updateDiscoveries(data);
  } catch (err) {}
}

async function loadChatHistory() {
  try {
    const response = await fetch('/api/chat-history');
    const data = await response.json();
    updateChatHistory(data);
  } catch (err) {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadQuickCommands();
  loadConfig();
  loadHistory();
  loadDiscoveries();
  loadChatHistory();
  addLog('sistem', '🚀 Dashboard bağlandı.');
  addLog('sistem', '💡 Doğal dilde komut gönderebilirsiniz.');
});
