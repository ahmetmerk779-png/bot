const socket = io();
const logContainer = document.getElementById('logContainer');
const commandInput = document.getElementById('commandInput');
const sendBtn = document.getElementById('sendCommand');

function addLog(type, message) {
  const time = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.className = `log-entry type-${type}`;
  div.innerHTML = `<span style="color:#666">[${time}]</span> ${message}`;
  logContainer.appendChild(div);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function sendCommand(cmd) {
  if (!cmd) return;
  socket.emit('command', cmd);
  addLog('komut', `📨 ${cmd}`);
  commandInput.value = '';
}

sendBtn.addEventListener('click', () => sendCommand(commandInput.value));
commandInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendCommand(commandInput.value);
});

document.querySelectorAll('#quick button').forEach(btn => {
  btn.addEventListener('click', () => sendCommand(btn.dataset.cmd));
});

// Ayarları yükle
fetch('/api/config').then(r => r.json()).then(cfg => {
  document.getElementById('setBotName').value = cfg.botName || '';
  document.getElementById('setServerHost').value = cfg.serverHost || '';
  document.getElementById('setServerPort').value = cfg.serverPort || 25565;
  document.getElementById('setVersion').value = cfg.version || '1.8.9';
  document.getElementById('setAuth').value = cfg.auth || 'offline';
});

// Ayarları kaydet
document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    botName: document.getElementById('setBotName').value,
    serverHost: document.getElementById('setServerHost').value,
    serverPort: parseInt(document.getElementById('setServerPort').value),
    version: document.getElementById('setVersion').value,
    auth: document.getElementById('setAuth').value
  };
  fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(() => {
    addLog('sistem', '✅ Ayarlar kaydedildi. Bot yeniden başlatılıyor...');
    setTimeout(() => location.reload(), 3000);
  });
});

socket.on('log', (data) => addLog(data.type, data.message));
socket.on('botCommand', (cmd) => addLog('komut', `📨 ${cmd}`));

addLog('sistem', '🚀 Bağlandı.');
addLog('sistem', '💡 Komutlar: move, mine, combat, follow, stopfollow, chat, eat, observe, explore');
