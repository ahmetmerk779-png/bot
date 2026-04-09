// ============================================================
// Minecraft AFK Bot Kontrol Paneli - Tüm Özellikler Dahil
// ============================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { plugin: guiPlugin } = require('mineflayer-gui');

// --- Sunucu Ayarları ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// --- Bellekte Kayıtlı Konumlar ---
const savedLocations = new Map(); // isim -> { x, y, z }

// --- Bot Değişkenleri ---
let bot = null;
let botConfig = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let statusInterval = null;
let antiAfkInterval = null;
let currentAntiAfkMode = 'look'; // 'look', 'jump', 'sneak', 'walk'

// --- Yardımcı Fonksiyonlar ---
function sendLog(message, type = 'info') {
  io.emit('log', { message, type });
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function sendStatus() {
  if (!bot || !bot.entity) {
    io.emit('bot-status', { connected: false, locations: Array.from(savedLocations.keys()) });
    return;
  }
  try {
    io.emit('bot-status', {
      connected: true,
      health: bot.health,
      food: bot.food,
      position: bot.entity.position,
      players: Object.keys(bot.players).length,
      ping: bot.player ? bot.player.ping : 0,
      locations: Array.from(savedLocations.keys())
    });
  } catch (e) {}
}

// Envanteri gönder
function sendInventory() {
  if (!bot || !bot.inventory) return;
  const items = bot.inventory.slots.map((item, slot) => {
    if (!item) return null;
    return {
      slot,
      name: item.name,
      displayName: item.displayName || item.name,
      count: item.count
    };
  }).filter(i => i !== null);
  io.emit('inventory-update', items);
}

// --- Gelişmiş AntiAFK ---
function startAntiAfk() {
  if (antiAfkInterval) clearInterval(antiAfkInterval);
  antiAfkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      switch (currentAntiAfkMode) {
        case 'look':
          bot.look(Math.random() * Math.PI * 2, 0, true);
          break;
        case 'jump':
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 500);
          break;
        case 'sneak':
          bot.setControlState('sneak', true);
          setTimeout(() => bot.setControlState('sneak', false), 800);
          break;
        case 'walk':
          const rad = Math.random() * Math.PI * 2;
          const dx = Math.cos(rad) * 2;
          const dz = Math.sin(rad) * 2;
          const goal = new goals.GoalNear(bot.entity.position.x + dx, bot.entity.position.y, bot.entity.position.z + dz, 1);
          bot.pathfinder.setGoal(goal);
          setTimeout(() => bot.pathfinder.stop(), 2000);
          break;
      }
    } catch (e) {}
  }, 5000); // 5 saniyede bir
}

// --- Bot Oluşturma ---
function createBot(config) {
  if (bot) {
    bot.end();
    bot = null;
  }

  const options = {
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version || false,
    hideErrors: false
  };

  if (config.authType === 'microsoft') {
    options.auth = 'microsoft';
    options.password = config.password;
  } else if (config.authType === 'mojang') {
    options.auth = 'mojang';
    options.password = config.password;
  } else {
    options.auth = 'offline';
  }

  bot = mineflayer.createBot(options);
  botConfig = config;

  bot.once('spawn', () => {
    sendLog(`✅ Sunucuya bağlanıldı! (${config.host}:${config.port})`, 'success');
    reconnectAttempts = 0;

    bot.loadPlugin(pathfinder);
    bot.loadPlugin(guiPlugin);
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    startAntiAfk();
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => {
      sendStatus();
      sendInventory();
    }, 1000);
    sendStatus();
    sendInventory();
  });

  bot.on('health', () => sendStatus());
  bot.on('entityMoved', () => sendStatus());

  bot.on('playerJoined', (player) => {
    sendLog(`👤 ${player.username} oyuna katıldı`, 'info');
    sendStatus();
  });
  bot.on('playerLeft', (player) => {
    sendLog(`👋 ${player.username} oyundan ayrıldı`, 'info');
    sendStatus();
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    sendLog(`💬 ${username}: ${message}`, 'chat');
  });

  bot.on('whisper', (username, message) => {
    sendLog(`📩 [Özel] ${username}: ${message}`, 'chat');
    bot.whisper(username, 'Üzgünüm, ben bir AFK botuyum.');
  });

  bot.on('kicked', (reason) => {
    sendLog(`⛔ Sunucudan atıldı: ${reason}`, 'error');
    io.emit('bot-status', { connected: false });
    clearInterval(statusInterval);
    clearInterval(antiAfkInterval);
    attemptReconnect();
  });

  bot.on('end', (reason) => {
    sendLog(`🔌 Bağlantı koptu: ${reason || 'Bilinmeyen neden'}`, 'error');
    io.emit('bot-status', { connected: false });
    clearInterval(statusInterval);
    clearInterval(antiAfkInterval);
    attemptReconnect();
  });

  bot.on('error', (err) => {
    sendLog(`⚠️ Hata: ${err.message}`, 'error');
  });

  // Envanter güncellemeleri
  bot.on('windowOpen', (window) => {
    sendLog(`🪟 Pencere açıldı: ${window.title}`, 'info');
    // GUI işlemleri için window objesi panelden kullanılabilir
  });
}

function attemptReconnect() {
  if (!botConfig) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    sendLog(`❌ Yeniden bağlanma denemeleri başarısız.`, 'error');
    return;
  }
  reconnectAttempts++;
  const delay = Math.min(30000, 5000 * reconnectAttempts);
  sendLog(`🔄 ${delay/1000}s sonra yeniden bağlanılacak... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'info');
  setTimeout(() => {
    if (!bot || !bot.entity) createBot(botConfig);
  }, delay);
}

// --- Socket.IO ---
io.on('connection', (socket) => {
  sendLog(`📱 Panel bağlantısı kuruldu (${socket.id})`, 'info');
  sendStatus();
  if (bot) sendInventory();

  socket.on('connect-bot', (config) => {
    sendLog(`🚀 Bot başlatılıyor: ${config.username}@${config.host}:${config.port}`, 'info');
    botConfig = config;
    createBot(config);
  });

  socket.on('disconnect-bot', () => {
    if (bot) bot.end();
    bot = null;
    clearInterval(statusInterval);
    clearInterval(antiAfkInterval);
    io.emit('bot-status', { connected: false });
    sendLog('🛑 Bot manuel olarak durduruldu.', 'info');
  });

  socket.on('send-chat', (message) => {
    if (bot && bot.entity) {
      bot.chat(message);
      sendLog(`📤 Sohbet: ${message}`, 'chat');
    }
  });

  // Konum Kaydet
  socket.on('save-location', (name) => {
    if (!bot || !bot.entity) return;
    const pos = bot.entity.position;
    savedLocations.set(name, { x: pos.x, y: pos.y, z: pos.z });
    sendLog(`📍 "${name}" konumu kaydedildi: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`, 'success');
    sendStatus();
  });

  // Kayıtlı konuma git
  socket.on('goto-location', (name) => {
    if (!bot || !bot.entity) return;
    const loc = savedLocations.get(name);
    if (!loc) return sendLog(`❌ "${name}" bulunamadı`, 'error');
    const goal = new goals.GoalBlock(loc.x, loc.y, loc.z);
    bot.pathfinder.setGoal(goal);
    sendLog(`🚶 "${name}" konumuna gidiliyor...`, 'info');
  });

  // Manuel koordinata git
  socket.on('goto-coords', (coords) => {
    if (!bot || !bot.entity) return;
    const { x, y, z } = coords;
    const goal = new goals.GoalBlock(x, y, z);
    bot.pathfinder.setGoal(goal);
    sendLog(`🚶 Koordinata gidiliyor: ${x} ${y} ${z}`, 'info');
  });

  // Kayıtlı konumu sil
  socket.on('delete-location', (name) => {
    savedLocations.delete(name);
    sendLog(`🗑️ "${name}" konumu silindi`, 'info');
    sendStatus();
  });

  // AntiAFK modu değiştir
  socket.on('set-antiafk-mode', (mode) => {
    currentAntiAfkMode = mode;
    sendLog(`🛡️ AntiAFK modu: ${mode}`, 'success');
    startAntiAfk();
  });

  // GUI: Nether Yıldızı ile menü aç ve oyun seç
  socket.on('select-game', async (data) => {
    if (!bot || !bot.entity) return sendLog('Bot bağlı değil!', 'error');
    const { itemName, gameName } = data; // itemName: 'Nether Yıldızı', gameName: 'Skyblock'
    try {
      // Envanterde eşyayı bul
      const item = bot.inventory.slots.find(slot => slot && slot.displayName.includes(itemName));
      if (!item) return sendLog(`❌ Envanterde "${itemName}" bulunamadı`, 'error');

      // Eşyayı seç ve sağ tıkla
      await bot.equip(item, 'hand');
      bot.activateItem();

      // GUI'nin açılmasını bekle
      await bot.waitForWindow(5000).then(async (window) => {
        sendLog(`🪟 GUI açıldı: ${window.title}`, 'success');
        // Oyun modunu bul
        const gameSlot = window.slots.findIndex(slot => slot && slot.displayName.includes(gameName));
        if (gameSlot === -1) {
          sendLog(`❌ "${gameName}" GUI'de bulunamadı`, 'error');
          return window.close();
        }
        await bot.clickWindow(gameSlot, 0, 0);
        sendLog(`🎮 "${gameName}" seçildi!`, 'success');
        window.close();
      }).catch(() => {
        sendLog(`❌ GUI zaman aşımına uğradı`, 'error');
      });
    } catch (e) {
      sendLog(`⚠️ GUI hatası: ${e.message}`, 'error');
    }
  });

  // Envanter yenileme isteği
  socket.on('refresh-inventory', () => sendInventory());

  // Durum yenileme
  socket.on('get-status', () => {
    sendStatus();
    sendInventory();
  });
});

// --- Web Arayüzü (Mobil Uyumlu) ---
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>AFK Bot Panel Pro</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style> #log-container::-webkit-scrollbar { width: 6px; } #log-container::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 8px; } </style>
</head>
<body class="bg-gray-900 text-gray-100 p-4 md:p-6">
  <div class="max-w-7xl mx-auto">
    <!-- Başlık -->
    <div class="flex flex-wrap items-center justify-between mb-6 gap-3">
      <h1 class="text-3xl font-bold flex items-center gap-2"><span id="status-indicator" class="w-3 h-3 rounded-full bg-gray-500"></span>AFK Bot Panel Pro</h1>
      <div class="flex gap-2">
        <button id="connect-btn" class="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-semibold">Bağlan</button>
        <button id="disconnect-btn" class="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-semibold">Kes</button>
      </div>
    </div>

    <!-- Ayarlar -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4">
        <h2 class="text-xl font-semibold mb-3 text-indigo-300">🔑 Hesap</h2>
        <div class="space-y-3">
          <input type="text" id="username" placeholder="E-posta" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
          <input type="password" id="password" placeholder="Şifre" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
          <select id="authType" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2"><option value="microsoft">Microsoft</option><option value="mojang">Mojang</option><option value="offline">Çevrimdışı</option></select>
        </div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <h2 class="text-xl font-semibold mb-3 text-indigo-300">🌍 Sunucu</h2>
        <div class="space-y-3">
          <input type="text" id="serverIp" placeholder="IP" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
          <input type="number" id="serverPort" placeholder="Port" value="25565" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
          <input type="text" id="version" placeholder="Sürüm (opsiyonel)" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
        </div>
      </div>
    </div>

    <!-- Durum Kartları -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="bg-gray-800 rounded-xl p-4"><span class="text-gray-400 text-sm">❤️ Can</span><div class="text-2xl font-bold" id="health">--</div><div class="w-full bg-gray-700 rounded-full h-2.5 mt-1"><div id="health-bar" class="bg-red-500 h-2.5 rounded-full" style="width:0%"></div></div></div>
      <div class="bg-gray-800 rounded-xl p-4"><span class="text-gray-400 text-sm">🍗 Açlık</span><div class="text-2xl font-bold" id="food">--</div><div class="w-full bg-gray-700 rounded-full h-2.5 mt-1"><div id="food-bar" class="bg-amber-500 h-2.5 rounded-full" style="width:0%"></div></div></div>
      <div class="bg-gray-800 rounded-xl p-4"><span class="text-gray-400 text-sm">📍 Konum</span><div class="text-lg font-mono" id="position">---</div></div>
      <div class="bg-gray-800 rounded-xl p-4"><span class="text-gray-400 text-sm">👥 / Ping</span><div class="text-lg font-mono"><span id="players">0</span> | <span id="ping">0</span>ms</div></div>
    </div>

    <!-- Hareket ve Kaydetme -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4">
        <h3 class="text-lg font-semibold mb-2 text-indigo-300">💾 Konum Kaydet</h3>
        <div class="flex gap-2"><input type="text" id="loc-name" placeholder="Konum adı" class="flex-1 bg-gray-700 rounded-lg px-3 py-2"><button id="save-loc-btn" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">Kaydet</button></div>
        <div class="mt-3"><label class="text-sm text-gray-400">Kayıtlı Konumlar</label><select id="saved-locs" class="w-full bg-gray-700 rounded-lg px-3 py-2 mt-1"></select></div>
        <div class="flex gap-2 mt-2"><button id="goto-loc-btn" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg">Git</button><button id="delete-loc-btn" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg">Sil</button></div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <h3 class="text-lg font-semibold mb-2 text-indigo-300">🎯 Manuel Koordinat</h3>
        <div class="grid grid-cols-3 gap-2"><input type="number" id="goto-x" placeholder="X" class="bg-gray-700 rounded-lg px-3 py-2"><input type="number" id="goto-y" placeholder="Y" class="bg-gray-700 rounded-lg px-3 py-2"><input type="number" id="goto-z" placeholder="Z" class="bg-gray-700 rounded-lg px-3 py-2"></div>
        <button id="goto-manual-btn" class="mt-3 w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">Koordinata Git</button>
      </div>
    </div>

    <!-- Envanter Görüntüleme -->
    <div class="bg-gray-800 rounded-xl p-4 mb-6">
      <h3 class="text-lg font-semibold mb-2 text-indigo-300">🎒 Envanter</h3>
      <div id="inventory-container" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-2 bg-gray-900 rounded-lg">
        <div class="text-gray-400 col-span-full text-center py-4">Envanter bekleniyor...</div>
      </div>
      <button id="refresh-inv-btn" class="mt-3 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Yenile</button>
    </div>

    <!-- GUI Oyun Seçici + AntiAFK + Sohbet -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4">
        <h3 class="text-lg font-semibold mb-2 text-indigo-300">🕹️ GUI Oyun Seç</h3>
        <input type="text" id="item-name" placeholder="Eşya adı (Nether Yıldızı)" class="w-full bg-gray-700 rounded-lg px-3 py-2 mb-2">
        <input type="text" id="game-name" placeholder="Oyun adı (Skyblock)" class="w-full bg-gray-700 rounded-lg px-3 py-2 mb-2">
        <button id="select-game-btn" class="w-full bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg">Seç ve Gir</button>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <h3 class="text-lg font-semibold mb-2 text-indigo-300">🛡️ AntiAFK Modu</h3>
        <select id="antiafk-mode" class="w-full bg-gray-700 rounded-lg px-3 py-2 mb-2"><option value="look">Kafa Salla</option><option value="jump">Zıpla</option><option value="sneak">Eğil</option><option value="walk">Yürü</option></select>
        <button id="set-antiafk-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg">Ayarla</button>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <h3 class="text-lg font-semibold mb-2 text-indigo-300">💬 Sohbet</h3>
        <input type="text" id="chat-input" placeholder="Mesaj / Komut" class="w-full bg-gray-700 rounded-lg px-3 py-2 mb-2">
        <button id="send-chat-btn" class="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">Gönder</button>
      </div>
    </div>

    <!-- Log -->
    <div class="bg-gray-800 rounded-xl p-4">
      <h3 class="text-lg font-semibold mb-2 text-indigo-300">📋 Canlı Kayıt</h3>
      <div id="log-container" class="bg-gray-900 rounded-lg p-3 h-48 overflow-y-auto font-mono text-sm border border-gray-700"></div>
    </div>
  </div>

  <script>
    const socket = io();
    const logContainer = document.getElementById('log-container');
    function addLog(msg, type='info') {
      const d = document.createElement('div');
      d.innerHTML = \`<span class="text-gray-500">[\${new Date().toLocaleTimeString()}]</span> <span class="\${type==='error'?'text-red-400':type==='success'?'text-green-400':'text-gray-300'}">\${msg}</span>\`;
      logContainer.appendChild(d);
      logContainer.scrollTop = logContainer.scrollHeight;
    }
    socket.on('log', (data) => addLog(data.message, data.type));
    socket.on('bot-status', (data) => {
      document.getElementById('status-indicator').className = data.connected ? 'w-3 h-3 rounded-full bg-green-500 animate-pulse' : 'w-3 h-3 rounded-full bg-gray-500';
      if (data.connected) {
        document.getElementById('health').innerText = data.health + ' / 20';
        document.getElementById('health-bar').style.width = (data.health/20*100)+'%';
        document.getElementById('food').innerText = data.food + ' / 20';
        document.getElementById('food-bar').style.width = (data.food/20*100)+'%';
        document.getElementById('position').innerText = data.position ? \`\${Math.round(data.position.x)} \${Math.round(data.position.y)} \${Math.round(data.position.z)}\` : '---';
        document.getElementById('players').innerText = data.players || '0';
        document.getElementById('ping').innerText = data.ping || '0';
        const select = document.getElementById('saved-locs');
        select.innerHTML = '';
        (data.locations || []).forEach(loc => { const opt = document.createElement('option'); opt.value = loc; opt.text = loc; select.add(opt); });
      }
    });
    socket.on('inventory-update', (items) => {
      const container = document.getElementById('inventory-container');
      container.innerHTML = '';
      if (items.length === 0) container.innerHTML = '<div class="text-gray-400 col-span-full text-center py-4">Envanter boş</div>';
      else items.forEach(item => { container.innerHTML += \`<div class="bg-gray-700 p-2 rounded text-sm"><span class="text-indigo-300">\${item.displayName}</span> x\${item.count} <span class="text-gray-400 text-xs">(Slot \${item.slot})</span></div>\`; });
    });

    document.getElementById('connect-btn').onclick = () => socket.emit('connect-bot', {
      username: document.getElementById('username').value, password: document.getElementById('password').value, authType: document.getElementById('authType').value,
      host: document.getElementById('serverIp').value, port: parseInt(document.getElementById('serverPort').value)||25565, version: document.getElementById('version').value
    });
    document.getElementById('disconnect-btn').onclick = () => socket.emit('disconnect-bot');
    document.getElementById('send-chat-btn').onclick = () => { const m = document.getElementById('chat-input').value.trim(); if(m) { socket.emit('send-chat', m); document.getElementById('chat-input').value = ''; }};
    document.getElementById('save-loc-btn').onclick = () => { const n = document.getElementById('loc-name').value.trim(); if(n) socket.emit('save-location', n); };
    document.getElementById('goto-loc-btn').onclick = () => { const sel = document.getElementById('saved-locs'); if(sel.value) socket.emit('goto-location', sel.value); };
    document.getElementById('delete-loc-btn').onclick = () => { const sel = document.getElementById('saved-locs'); if(sel.value) socket.emit('delete-location', sel.value); };
    document.getElementById('goto-manual-btn').onclick = () => {
      const x = parseInt(document.getElementById('goto-x').value), y = parseInt(document.getElementById('goto-y').value), z = parseInt(document.getElementById('goto-z').value);
      if(!isNaN(x)&&!isNaN(y)&&!isNaN(z)) socket.emit('goto-coords', {x,y,z});
    };
    document.getElementById('set-antiafk-btn').onclick = () => socket.emit('set-antiafk-mode', document.getElementById('antiafk-mode').value);
    document.getElementById('select-game-btn').onclick = () => socket.emit('select-game', { itemName: document.getElementById('item-name').value, gameName: document.getElementById('game-name').value });
    document.getElementById('refresh-inv-btn').onclick = () => socket.emit('refresh-inventory');
    socket.emit('get-status');
  </script>
</body>
</html>
  `);
});

server.listen(PORT, () => console.log(`🌐 Panel http://localhost:${PORT}`));
