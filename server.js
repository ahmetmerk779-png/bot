// ============================================================
// Minecraft AFK Bot Kontrol Paneli - Full Özellikli Sürüm
// ============================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const webmap = require('mineflayer-webmap');

// --- Sunucu Ayarları ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// --- Bellekte Kayıtlı Konumlar ---
const savedLocations = new Map();

// --- Bot Değişkenleri (Hata yok) ---
let bot = null;
let botConfig = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let statusInterval = null;
let antiAfkInterval = null;
let currentAntiAfkMode = 'look';

// Otomasyon durumları
let autoEatEnabled = false;
let autoTotemEnabled = false;
let autoFishEnabled = false;
let autoDumpChestEnabled = false;
let autoPvEEnabled = false;

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

function sendInventory() {
  if (!bot || !bot.inventory) return;
  const items = bot.inventory.slots.map((item, slot) => {
    if (!item) return null;
    return { slot, name: item.name, displayName: item.displayName || item.name, count: item.count };
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
        case 'look': bot.look(Math.random() * Math.PI * 2, 0, true); break;
        case 'jump': bot.setControlState('jump', true); setTimeout(() => bot.setControlState('jump', false), 500); break;
        case 'sneak': bot.setControlState('sneak', true); setTimeout(() => bot.setControlState('sneak', false), 800); break;
        case 'walk':
          const rad = Math.random() * Math.PI * 2;
          bot.pathfinder.setGoal(new goals.GoalNear(bot.entity.position.x + Math.cos(rad)*2, bot.entity.position.y, bot.entity.position.z + Math.sin(rad)*2, 1));
          setTimeout(() => bot.pathfinder.stop(), 2000);
          break;
      }
    } catch (e) {}
  }, 5000);
}

// --- Bot Oluşturma (Offline Mod) ---
function createBot(config) {
  if (bot) { bot.end(); bot = null; }

  const options = {
    host: config.host,
    port: config.port,
    username: config.username,
    version: config.version || false,
    auth: 'offline', // SADECE OFFLINE MOD
    hideErrors: false
  };

  bot = mineflayer.createBot(options);
  botConfig = config;

  bot.once('spawn', () => {
    sendLog(`✅ Sunucuya bağlanıldı! (${config.host}:${config.port})`, 'success');
    reconnectAttempts = 0;
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(webmap); // Web harita eklentisi
    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    startAntiAfk();
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => { sendStatus(); sendInventory(); }, 1000);
    sendStatus(); sendInventory();
  });

  bot.on('health', () => {
    sendStatus();
    if (autoEatEnabled && bot.food < 18) {
      const foodItem = bot.inventory.slots.find(s => s && s.name.includes('cooked') || s && s.name.includes('bread'));
      if (foodItem) {
        bot.equip(foodItem, 'hand').then(() => bot.consume()).catch(() => {});
      }
    }
    if (autoTotemEnabled && bot.health < 6) {
      const totem = bot.inventory.slots.find(s => s && s.name === 'totem_of_undying');
      if (totem) bot.equip(totem, 'off-hand');
    }
  });

  bot.on('entityMoved', sendStatus);
  bot.on('playerJoined', (p) => { sendLog(`👤 ${p.username} oyuna katıldı`, 'info'); sendStatus(); });
  bot.on('playerLeft', (p) => { sendLog(`👋 ${p.username} oyundan ayrıldı`, 'info'); sendStatus(); });
  bot.on('chat', (u, m) => { if (u !== bot.username) sendLog(`💬 ${u}: ${m}`, 'chat'); });
  bot.on('whisper', (u, m) => { sendLog(`📩 [Özel] ${u}: ${m}`, 'chat'); bot.whisper(u, 'Üzgünüm, ben bir AFK botuyum.'); });
  bot.on('kicked', (r) => { sendLog(`⛔ Sunucudan atıldı: ${r}`, 'error'); io.emit('bot-status', { connected: false }); clearInterval(statusInterval); clearInterval(antiAfkInterval); attemptReconnect(); });
  bot.on('end', (r) => { sendLog(`🔌 Bağlantı koptu: ${r || 'Bilinmeyen neden'}`, 'error'); io.emit('bot-status', { connected: false }); clearInterval(statusInterval); clearInterval(antiAfkInterval); attemptReconnect(); });
  bot.on('error', (e) => sendLog(`⚠️ Hata: ${e.message}`, 'error'));

  // PvE
  bot.on('entitySpawn', (e) => {
    if (!autoPvEEnabled) return;
    if (e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 5) {
      bot.attack(e);
    }
  });
}

function attemptReconnect() {
  if (!botConfig || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  reconnectAttempts++;
  const delay = Math.min(30000, 5000 * reconnectAttempts);
  sendLog(`🔄 ${delay/1000}s sonra yeniden bağlanılacak...`, 'info');
  setTimeout(() => { if (!bot || !bot.entity) createBot(botConfig); }, delay);
}

// --- Socket.IO İletişimi ---
io.on('connection', (socket) => {
  sendLog(`📱 Panel bağlantısı kuruldu`, 'info');
  sendStatus(); if (bot) sendInventory();

  socket.on('connect-bot', (c) => {
    botConfig = c;
    createBot(c);
  });
  socket.on('disconnect-bot', () => {
    botConfig = null;
    if (bot) bot.end();
    bot = null;
    clearInterval(statusInterval);
    clearInterval(antiAfkInterval);
    io.emit('bot-status', { connected: false });
    sendLog('🛑 Bot durduruldu.', 'info');
  });
  socket.on('send-chat', (m) => { if (bot) bot.chat(m); });
  socket.on('save-location', (n) => { if (bot) { const p = bot.entity.position; savedLocations.set(n, { x: p.x, y: p.y, z: p.z }); sendStatus(); } });
  socket.on('goto-location', (n) => { if (bot) { const l = savedLocations.get(n); if (l) bot.pathfinder.setGoal(new goals.GoalBlock(l.x, l.y, l.z)); } });
  socket.on('delete-location', (n) => { savedLocations.delete(n); sendStatus(); });
  socket.on('set-antiafk-mode', (m) => { currentAntiAfkMode = m; startAntiAfk(); });

  // Canlı Kontrol
  socket.on('set-control-state', (data) => { if (bot) bot.setControlState(data.control, data.state); });
  socket.on('perform-action', (data) => {
    if (!bot) return;
    switch (data.action) {
      case 'jump': bot.setControlState('jump', true); setTimeout(() => bot.setControlState('jump', false), 100); break;
      case 'leftClick': const e = bot.entityAtCursor(); if (e) bot.attack(e); break;
      case 'rightClick': bot.activateItem(); break;
    }
  });

  // Envanter işlemleri
  socket.on('move-item', ({ fromSlot, toSlot }) => {
    if (bot) {
      bot.clickWindow(fromSlot, 0, 0);
      setTimeout(() => bot.clickWindow(toSlot, 0, 0), 50);
    }
  });
  socket.on('use-item', (slot) => {
    if (bot) { const item = bot.inventory.slots[slot]; if (item) bot.equip(item, 'hand').then(() => bot.activateItem()); }
  });
  socket.on('drop-item', (slot) => {
    if (bot) { const item = bot.inventory.slots[slot]; if (item) bot.toss(item.type, null, item.count); }
  });

  // Otomasyon toggle
  socket.on('toggle-auto', (type, state) => {
    if (type === 'eat') autoEatEnabled = state;
    if (type === 'totem') autoTotemEnabled = state;
    if (type === 'pve') autoPvEEnabled = state;
    sendLog(`⚙️ ${type} ${state ? 'AÇIK' : 'KAPALI'}`, 'success');
  });
});

// --- Web Arayüzü (Tamamen Yeniden Tasarlandı) ---
app.get('/', (req, res) => { res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>AFK Bot Pro</title>
  <script src="https://cdn.tailwindcss.com"></script><script src="/socket.io/socket.io.js"></script>
  <style> .sidebar-transition { transition: transform 0.3s ease; } </style>
</head>
<body class="bg-gray-900 text-white h-screen flex overflow-hidden">
  <!-- Hamburger Butonu -->
  <button id="menuBtn" class="fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg lg:hidden">☰</button>

  <!-- Sidebar -->
  <aside id="sidebar" class="sidebar-transition fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 p-4 transform -translate-x-full lg:translate-x-0 lg:static lg:inset-auto">
    <h2 class="text-xl font-bold mb-4 text-indigo-400">AFK Bot Panel</h2>
    <nav class="space-y-1">
      <button data-tab="dashboard" class="w-full text-left p-2 rounded bg-blue-600 hover:bg-blue-700">🏠 Dashboard</button>
      <button data-tab="map" class="w-full text-left p-2 rounded bg-green-600 hover:bg-green-700">🗺️ Canlı Harita</button>
      <button data-tab="inventory" class="w-full text-left p-2 rounded bg-yellow-600 hover:bg-yellow-700">🎒 Envanter</button>
      <button data-tab="control" class="w-full text-left p-2 rounded bg-purple-600 hover:bg-purple-700">🎮 Canlı Kontrol</button>
      <button data-tab="automation" class="w-full text-left p-2 rounded bg-pink-600 hover:bg-pink-700">⚙️ Otomasyonlar</button>
      <button data-tab="settings" class="w-full text-left p-2 rounded bg-gray-600 hover:bg-gray-700">🔧 Ayarlar</button>
    </nav>
  </aside>

  <!-- Ana İçerik -->
  <main class="flex-1 p-4 overflow-y-auto">
    <!-- Dashboard Sekmesi -->
    <div id="tab-dashboard" class="tab-content">
      <h1 class="text-2xl font-bold mb-4">Dashboard</h1>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-gray-800 p-4 rounded"><span class="text-gray-400">❤️ Can</span><div id="health" class="text-2xl">--</div><div class="w-full bg-gray-700 h-2 mt-1"><div id="health-bar" class="bg-red-500 h-2" style="width:0%"></div></div></div>
        <div class="bg-gray-800 p-4 rounded"><span class="text-gray-400">🍗 Açlık</span><div id="food" class="text-2xl">--</div><div class="w-full bg-gray-700 h-2 mt-1"><div id="food-bar" class="bg-amber-500 h-2" style="width:0%"></div></div></div>
        <div class="bg-gray-800 p-4 rounded"><span class="text-gray-400">📍 Konum</span><div id="position" class="text-lg font-mono">---</div></div>
        <div class="bg-gray-800 p-4 rounded"><span class="text-gray-400">👥 / Ping</span><div id="players" class="text-lg">0 | <span id="ping">0</span>ms</div></div>
      </div>
      <div class="mt-4 flex gap-2"><input id="username" placeholder="Kullanıcı Adı" class="bg-gray-700 p-2 rounded"><input id="serverIp" placeholder="IP" class="bg-gray-700 p-2 rounded"><input id="serverPort" value="25565" class="bg-gray-700 p-2 rounded w-20"><button id="connectBtn" class="bg-green-600 p-2 rounded">Bağlan</button><button id="disconnectBtn" class="bg-red-600 p-2 rounded">Kes</button></div>
      <div class="mt-2"><input id="version" placeholder="Sürüm (örn: 1.18.2)" class="bg-gray-700 p-2 rounded w-full"></div>
    </div>

    <!-- Harita Sekmesi -->
    <div id="tab-map" class="tab-content hidden"><h1 class="text-2xl font-bold mb-4">Canlı Harita</h1><iframe id="mapFrame" src="/map" class="w-full h-[80vh] border-0 rounded"></iframe></div>

    <!-- Envanter Sekmesi -->
    <div id="tab-inventory" class="tab-content hidden"><h1 class="text-2xl font-bold mb-4">Envanter</h1><div id="invGrid" class="grid grid-cols-9 gap-1"></div></div>

    <!-- Canlı Kontrol Sekmesi -->
    <div id="tab-control" class="tab-content hidden">
      <h1 class="text-2xl font-bold mb-4">Canlı Kontrol</h1>
      <div class="flex flex-col items-center">
        <div class="grid grid-cols-3 gap-2 w-48">
          <div></div><button id="moveForward" class="bg-gray-700 p-4 rounded">▲</button><div></div>
          <button id="moveLeft" class="bg-gray-700 p-4 rounded">◀</button><button id="moveBack" class="bg-gray-700 p-4 rounded">▼</button><button id="moveRight" class="bg-gray-700 p-4 rounded">▶</button>
        </div>
        <div class="flex gap-2 mt-4">
          <button id="jumpBtn" class="bg-blue-600 p-4 rounded">Zıpla</button>
          <button id="sneakBtn" class="bg-yellow-600 p-4 rounded">Eğil</button>
          <button id="leftClickBtn" class="bg-red-600 p-4 rounded">Sol Tık</button>
          <button id="rightClickBtn" class="bg-green-600 p-4 rounded">Sağ Tık</button>
        </div>
      </div>
    </div>

    <!-- Otomasyon Sekmesi -->
    <div id="tab-automation" class="tab-content hidden">
      <h1 class="text-2xl font-bold mb-4">Otomasyonlar</h1>
      <div class="space-y-2">
        <label class="flex items-center gap-2"><input type="checkbox" id="autoEat"> Otomatik Yemek Yeme</label>
        <label class="flex items-center gap-2"><input type="checkbox" id="autoTotem"> Otomatik Totem</label>
        <label class="flex items-center gap-2"><input type="checkbox" id="autoPvE"> Otomatik Saldırı (PvE)</label>
      </div>
    </div>

    <!-- Ayarlar Sekmesi -->
    <div id="tab-settings" class="tab-content hidden">
      <h1 class="text-2xl font-bold mb-4">Ayarlar</h1>
      <select id="antiafkMode" class="bg-gray-700 p-2 rounded"><option value="look">Kafa Salla</option><option value="jump">Zıpla</option><option value="sneak">Eğil</option><option value="walk">Yürü</option></select>
      <button id="setAntiafk" class="bg-indigo-600 p-2 rounded mt-2">AntiAFK Ayarla</button>
    </div>
  </main>
  <script>
    const socket = io();
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    menuBtn.onclick = () => sidebar.classList.toggle('-translate-x-full');

    // Sekme değiştirme
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
        if (btn.dataset.tab === 'map') document.getElementById('mapFrame').src = '/map';
        sidebar.classList.add('-translate-x-full'); // Mobilde menüyü kapat
      };
    });

    // Bot durumu
    socket.on('bot-status', (d) => {
      if (d.connected) {
        document.getElementById('health').innerText = d.health + '/20';
        document.getElementById('health-bar').style.width = (d.health/20*100)+'%';
        document.getElementById('food').innerText = d.food + '/20';
        document.getElementById('food-bar').style.width = (d.food/20*100)+'%';
        document.getElementById('position').innerText = d.position ? Math.round(d.position.x)+' '+Math.round(d.position.y)+' '+Math.round(d.position.z) : '---';
        document.getElementById('players').innerHTML = (d.players||0)+' | <span id="ping">'+(d.ping||0)+'</span>ms';
      }
    });

    // Bağlan / Kes
    document.getElementById('connectBtn').onclick = () => socket.emit('connect-bot', {
      username: document.getElementById('username').value,
      host: document.getElementById('serverIp').value,
      port: parseInt(document.getElementById('serverPort').value)||25565,
      version: document.getElementById('version').value
    });
    document.getElementById('disconnectBtn').onclick = () => socket.emit('disconnect-bot');

    // Canlı Kontrol
    function holdControl(control, state) { socket.emit('set-control-state', { control, state }); }
    ['forward','back','left','right'].forEach(c => {
      const btn = document.getElementById('move' + c.charAt(0).toUpperCase() + c.slice(1));
      if(btn) {
        btn.addEventListener('mousedown', () => holdControl(c, true));
        btn.addEventListener('mouseup', () => holdControl(c, false));
        btn.addEventListener('mouseleave', () => holdControl(c, false));
      }
    });
    document.getElementById('jumpBtn').onclick = () => socket.emit('perform-action', { action: 'jump' });
    document.getElementById('sneakBtn').addEventListener('mousedown', () => holdControl('sneak', true));
    document.getElementById('sneakBtn').addEventListener('mouseup', () => holdControl('sneak', false));
    document.getElementById('leftClickBtn').onclick = () => socket.emit('perform-action', { action: 'leftClick' });
    document.getElementById('rightClickBtn').onclick = () => socket.emit('perform-action', { action: 'rightClick' });

    // Otomasyon
    document.getElementById('autoEat').onchange = e => socket.emit('toggle-auto', 'eat', e.target.checked);
    document.getElementById('autoTotem').onchange = e => socket.emit('toggle-auto', 'totem', e.target.checked);
    document.getElementById('autoPvE').onchange = e => socket.emit('toggle-auto', 'pve', e.target.checked);

    // AntiAFK
    document.getElementById('setAntiafk').onclick = () => socket.emit('set-antiafk-mode', document.getElementById('antiafkMode').value);

    // Envanter render (basit)
    socket.on('inventory-update', items => {
      const grid = document.getElementById('invGrid');
      grid.innerHTML = '';
      for(let i=0; i<45; i++) {
        const item = items.find(it => it.slot === i);
        grid.innerHTML += `<div class="bg-gray-700 p-1 text-xs h-12">${item ? item.displayName + ' x'+item.count : ''}</div>`;
      }
    });
  </script>
</body>
</html>
`); });

server.listen(PORT, () => console.log(`🌐 Panel http://localhost:${PORT}`));
