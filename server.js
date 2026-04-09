// ============================================================
// Minecraft AFK Bot Kontrol Paneli - Render'a Hazır, Mobil Uyumlu
// ============================================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// --- Sunucu Ayarları ---
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // isteğe bağlı

// Ana sayfa - Mobil uyumlu arayüz (Tailwind CSS)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>AFK Bot Kontrol Paneli</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        #log-container::-webkit-scrollbar { width: 6px; }
        #log-container::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 8px; }
    </style>
</head>
<body class="bg-gray-900 text-gray-100 font-sans antialiased p-4 md:p-6">
    <div class="max-w-6xl mx-auto">
        <!-- Başlık ve Durum -->
        <div class="flex flex-wrap items-center justify-between mb-6 gap-3">
            <h1 class="text-3xl font-bold text-white flex items-center gap-2">
                <span id="status-indicator" class="w-3 h-3 rounded-full bg-gray-500"></span>
                AFK Bot Panel
            </h1>
            <div class="flex gap-2">
                <button id="connect-btn" class="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-semibold shadow-md transition text-sm md:text-base">Bağlan</button>
                <button id="disconnect-btn" class="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-semibold shadow-md transition text-sm md:text-base">Bağlantıyı Kes</button>
            </div>
        </div>

        <!-- Ayarlar Kartları -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-800 rounded-xl p-4 shadow-lg">
                <h2 class="text-xl font-semibold mb-3 text-indigo-300">🔑 Hesap Ayarları</h2>
                <div class="space-y-3">
                    <div><label class="block text-sm font-medium text-gray-400 mb-1">E-posta / Kullanıcı Adı</label><input type="text" id="username" value="bot@example.com" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"></div>
                    <div><label class="block text-sm font-medium text-gray-400 mb-1">Şifre</label><input type="password" id="password" value="sifreniz" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"></div>
                    <div><label class="block text-sm font-medium text-gray-400 mb-1">Hesap Türü</label><select id="authType" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"><option value="mojang">Mojang</option><option value="microsoft" selected>Microsoft</option><option value="offline">Çevrimdışı</option></select></div>
                </div>
            </div>
            <div class="bg-gray-800 rounded-xl p-4 shadow-lg">
                <h2 class="text-xl font-semibold mb-3 text-indigo-300">🌍 Sunucu Ayarları</h2>
                <div class="space-y-3">
                    <div><label class="block text-sm font-medium text-gray-400 mb-1">Sunucu Adresi</label><input type="text" id="serverIp" value="localhost" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"></div>
                    <div><label class="block text-sm font-medium text-gray-400 mb-1">Port</label><input type="number" id="serverPort" value="25565" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"></div>
                    <div><label class="block text-sm font-medium text-gray-400 mb-1">Sürüm (opsiyonel)</label><input type="text" id="version" placeholder="1.20.4" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"></div>
                </div>
            </div>
        </div>

        <!-- Durum Paneli -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div class="bg-gray-800 rounded-xl p-4 shadow-lg"><span class="text-gray-400 text-sm">❤️ Can</span><div class="text-2xl font-bold" id="health">--</div><div class="w-full bg-gray-700 rounded-full h-2.5 mt-1"><div id="health-bar" class="bg-red-500 h-2.5 rounded-full" style="width:0%"></div></div></div>
            <div class="bg-gray-800 rounded-xl p-4 shadow-lg"><span class="text-gray-400 text-sm">🍗 Açlık</span><div class="text-2xl font-bold" id="food">--</div><div class="w-full bg-gray-700 rounded-full h-2.5 mt-1"><div id="food-bar" class="bg-amber-500 h-2.5 rounded-full" style="width:0%"></div></div></div>
            <div class="bg-gray-800 rounded-xl p-4 shadow-lg"><span class="text-gray-400 text-sm">📍 Konum</span><div class="text-lg font-mono" id="position">---</div></div>
            <div class="bg-gray-800 rounded-xl p-4 shadow-lg"><span class="text-gray-400 text-sm">👥 Oyuncu / Ping</span><div class="text-lg font-mono"><span id="players">0</span> | <span id="ping">0</span>ms</div></div>
        </div>

        <!-- Sohbet Kutusu -->
        <div class="bg-gray-800 rounded-xl p-4 shadow-lg mb-6">
            <h3 class="text-lg font-semibold mb-2 text-indigo-300">💬 Sohbet & Komut Gönder</h3>
            <div class="flex gap-2"><input type="text" id="chat-input" placeholder="Mesaj veya /komut" class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"><button id="send-chat-btn" class="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-semibold transition">Gönder</button></div>
        </div>

        <!-- Log Alanı -->
        <div class="bg-gray-800 rounded-xl p-4 shadow-lg">
            <h3 class="text-lg font-semibold mb-2 text-indigo-300">📋 Canlı Aktivite Kaydı</h3>
            <div id="log-container" class="bg-gray-900 rounded-lg p-3 h-64 overflow-y-auto font-mono text-sm border border-gray-700"><div class="text-gray-400">Sistem başlatıldı. Bot bağlantısı bekleniyor...</div></div>
        </div>
    </div>

    <script>
        const socket = io();
        const statusIndicator = document.getElementById('status-indicator');
        const healthEl = document.getElementById('health'), healthBar = document.getElementById('health-bar');
        const foodEl = document.getElementById('food'), foodBar = document.getElementById('food-bar');
        const positionEl = document.getElementById('position'), playersEl = document.getElementById('players'), pingEl = document.getElementById('ping');
        const logContainer = document.getElementById('log-container');

        function addLog(message, type = 'info') {
            const entry = document.createElement('div');
            const time = new Date().toLocaleTimeString();
            let colorClass = 'text-gray-300';
            if (type === 'error') colorClass = 'text-red-400';
            else if (type === 'success') colorClass = 'text-green-400';
            else if (type === 'chat') colorClass = 'text-yellow-300';
            entry.innerHTML = \`<span class="text-gray-500">[\${time}]</span> <span class="\${colorClass}">\${message}</span>\`;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
            if (logContainer.children.length > 100) logContainer.removeChild(logContainer.children[0]);
        }

        socket.on('bot-status', (data) => {
            if (data.connected) {
                statusIndicator.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
                healthEl.textContent = data.health + ' / 20'; healthBar.style.width = (data.health/20*100)+'%';
                foodEl.textContent = data.food + ' / 20'; foodBar.style.width = (data.food/20*100)+'%';
                positionEl.textContent = data.position ? \`\${Math.round(data.position.x)} \${Math.round(data.position.y)} \${Math.round(data.position.z)}\` : '---';
                playersEl.textContent = data.players || '0'; pingEl.textContent = data.ping || '0';
            } else {
                statusIndicator.className = 'w-3 h-3 rounded-full bg-gray-500';
                healthEl.textContent = '--'; foodEl.textContent = '--'; positionEl.textContent = '---'; playersEl.textContent = '0'; pingEl.textContent = '0';
            }
        });

        socket.on('log', (msg) => addLog(msg.message, msg.type));

        document.getElementById('connect-btn').addEventListener('click', () => {
            socket.emit('connect-bot', {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
                authType: document.getElementById('authType').value,
                host: document.getElementById('serverIp').value,
                port: parseInt(document.getElementById('serverPort').value) || 25565,
                version: document.getElementById('version').value || false
            });
            addLog('Bağlanma isteği gönderildi...', 'info');
        });

        document.getElementById('disconnect-btn').addEventListener('click', () => {
            socket.emit('disconnect-bot');
            addLog('Bağlantı kesme isteği gönderildi.', 'info');
        });

        document.getElementById('send-chat-btn').addEventListener('click', () => {
            const msg = document.getElementById('chat-input').value.trim();
            if (msg) { socket.emit('send-chat', msg); document.getElementById('chat-input').value = ''; }
        });

        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { document.getElementById('send-chat-btn').click(); }
        });

        // Sayfa yüklendiğinde sunucudan mevcut durumu al
        socket.emit('get-status');
    </script>
</body>
</html>
  `);
});

// --- Bot Yönetimi ---
let bot = null;
let botConfig = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let statusInterval = null;
let antiAfkInterval = null;

// Log gönderme yardımcısı
function sendLog(message, type = 'info') {
  io.emit('log', { message, type });
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Durum bilgilerini istemcilere gönder
function sendStatus() {
  if (!bot || !bot.entity) {
    io.emit('bot-status', { connected: false });
    return;
  }
  try {
    io.emit('bot-status', {
      connected: true,
      health: bot.health,
      food: bot.food,
      position: bot.entity.position,
      players: Object.keys(bot.players).length,
      ping: bot.player ? bot.player.ping : 0
    });
  } catch (e) {}
}

// Anti-AFK (baş sallama)
function startAntiAfk() {
  if (antiAfkInterval) clearInterval(antiAfkInterval);
  antiAfkInterval = setInterval(() => {
    if (bot && bot.entity) {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }
  }, 30000); // 30 saniyede bir
}

// Bot oluştur
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

  // Hesap türüne göre auth ayarı
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
    
    // Pathfinder yükle
    bot.loadPlugin(pathfinder);
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    startAntiAfk();
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(sendStatus, 1000);
    sendStatus();
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
    // Otomatik yanıt
    bot.whisper(username, 'Üzgünüm, ben bir AFK botuyum. Şu anda burada değilim.');
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
}

function attemptReconnect() {
  if (!botConfig) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    sendLog(`❌ Yeniden bağlanma denemeleri başarısız. Lütfen manuel bağlanın.`, 'error');
    return;
  }
  reconnectAttempts++;
  const delay = Math.min(30000, 5000 * reconnectAttempts);
  sendLog(`🔄 ${delay/1000} saniye sonra yeniden bağlanılacak... (Deneme ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, 'info');
  setTimeout(() => {
    if (!bot || !bot.entity) {
      createBot(botConfig);
    }
  }, delay);
}

// --- Socket.IO İletişimi ---
io.on('connection', (socket) => {
  sendLog(`📱 Panel bağlantısı kuruldu (${socket.id})`, 'info');
  sendStatus(); // Yeni bağlanan istemciye durumu gönder

  socket.on('connect-bot', (config) => {
    sendLog(`🚀 Bot başlatılıyor: ${config.username}@${config.host}:${config.port}`, 'info');
    botConfig = config;
    createBot(config);
  });

  socket.on('disconnect-bot', () => {
    if (bot) {
      bot.end();
      bot = null;
    }
    clearInterval(statusInterval);
    clearInterval(antiAfkInterval);
    io.emit('bot-status', { connected: false });
    sendLog('🛑 Bot bağlantısı manuel olarak kesildi.', 'info');
  });

  socket.on('send-chat', (message) => {
    if (bot && bot.entity) {
      bot.chat(message);
      sendLog(`📤 Sohbete gönderildi: ${message}`, 'chat');
    } else {
      socket.emit('log', { message: 'Bot bağlı değil!', type: 'error' });
    }
  });

  socket.on('get-status', () => sendStatus());
});

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`🌐 Kontrol Paneli http://localhost:${PORT} adresinde çalışıyor`);
  sendLog('Panel sunucusu başlatıldı.', 'success');
});

// Render uyku modunu engellemek için kendini ping'leme (isteğe bağlı, harici cron önerilir)
// setInterval(() => { http.get('https://SIZIN-APP-ADINIZ.onrender.com'); }, 600000); // 10 dk
