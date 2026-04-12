const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const autoEat = require('mineflayer-auto-eat');
const viewer = require('prismarine-viewer').mineflayer;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let bot = null;
let botConfig = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Bot oluştur
function createBot(config) {
  if (bot) bot.end();

  const options = {
    host: config.host,
    port: config.port,
    username: config.username,
    auth: 'offline',
    version: config.version || '1.18.2'
  };

  bot = mineflayer.createBot(options);
  botConfig = config;

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoEat);
  bot.loadPlugin(viewer);

  bot.once('spawn', () => {
    console.log(`✅ Bot sunucuya bağlandı: ${config.host}`);
    reconnectAttempts = 0;

    const mcData = require('minecraft-data')(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));

    // Auto eat ayarları
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 14,
      bannedFood: []
    };

    io.emit('bot-status', { connected: true });
    startStatusUpdates();
  });

  bot.on('kicked', (reason) => {
    io.emit('bot-status', { connected: false, reason });
    console.log(`⛔ Atıldı: ${reason}`);
    attemptReconnect();
  });

  bot.on('end', (reason) => {
    io.emit('bot-status', { connected: false });
    console.log(`🔌 Bağlantı koptu: ${reason || 'bilinmeyen'}`);
    attemptReconnect();
  });

  bot.on('error', (err) => console.error(`⚠️ Hata: ${err.message}`));
}

function attemptReconnect() {
  if (!botConfig || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  reconnectAttempts++;
  const delay = Math.min(30000, 5000 * reconnectAttempts);
  console.log(`🔄 ${delay / 1000}s sonra yeniden bağlanıyor...`);
  setTimeout(() => {
    if (!bot || !bot.entity) createBot(botConfig);
  }, delay);
}

let statusInterval;
function startStatusUpdates() {
  if (statusInterval) clearInterval(statusInterval);
  statusInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    io.emit('bot-data', {
      health: bot.health,
      food: bot.food,
      position: bot.entity.position,
      players: Object.keys(bot.players).length,
      ping: bot.player?.ping || 0
    });

    // Envanter verisi
    const items = bot.inventory.slots.map((item, slot) => {
      if (!item) return null;
      return { slot, name: item.name, displayName: item.displayName || item.name, count: item.count };
    }).filter(i => i !== null);
    io.emit('inventory-update', items);
  }, 500);
}

// Socket.IO
io.on('connection', (socket) => {
  console.log('📱 Panel bağlandı');

  socket.on('connect-bot', (config) => {
    createBot(config);
  });

  socket.on('disconnect-bot', () => {
    if (bot) bot.end();
    bot = null;
    botConfig = null;
    io.emit('bot-status', { connected: false });
  });

  socket.on('send-chat', (msg) => {
    if (bot) bot.chat(msg);
  });

  // WASD kontrol
  socket.on('set-control-state', ({ control, state }) => {
    if (bot) bot.setControlState(control, state);
  });

  socket.on('perform-action', (action) => {
    if (!bot) return;
    switch (action) {
      case 'jump':
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 100);
        break;
      case 'sneak':
        bot.setControlState('sneak', true);
        setTimeout(() => bot.setControlState('sneak', false), 100);
        break;
      case 'leftClick':
        const entity = bot.entityAtCursor();
        if (entity) bot.attack(entity);
        break;
      case 'rightClick':
        bot.activateItem();
        break;
    }
  });

  // Envanter işlemleri
  socket.on('use-item', (slot) => {
    if (!bot) return;
    const item = bot.inventory.slots[slot];
    if (item) bot.equip(item, 'hand').then(() => bot.activateItem());
  });

  socket.on('drop-item', (slot) => {
    if (!bot) return;
    const item = bot.inventory.slots[slot];
    if (item) bot.toss(item.type, null, item.count);
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Panel: http://localhost:${PORT}`);
});
