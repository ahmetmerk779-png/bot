// index.js - Ana bot dosyası (3D Viewer ile)
require('dotenv').config();
const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer'); // YENİ
const config = require('./config');
const { loadMemory, addEvent, addKnowledge } = require('./memory/memoryManager');
const { buildSystemPrompt, buildUserPrompt } = require('./ai/prompt');
const { askGroq } = require('./ai/groq');
const skills = require('./skills');
const { sleep } = require('./utils/helpers');
const { isExploring, stopExploring } = require('./skills/explore');
const { isBranchMining, getProgress, stopBranchMining } = require('./skills/branchMine');

const { io } = require('./server');

let bot = null;
let memory = loadMemory();
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// ============ BOT OLUŞTUR ============
function createBot() {
  const botConfig = {
    host: config.serverHost,
    port: config.serverPort,
    username: config.botName,
    version: config.version,
    viewDistance: config.renderDistance,
    auth: config.auth
  };

  bot = mineflayer.createBot(botConfig);

  bot.on('login', () => {
    console.log(`${config.botName} giriş yaptı.`);
    isConnected = true;
    reconnectAttempts = 0;
    addEvent(memory, 'Bot oyuna giriş yaptı.');
    if (bot._client?.state === 'connected') bot.chat('Merhaba!');
    
    // Web'e durum gönder
    io.emit('botStatus', {
      botName: config.botName,
      server: `${config.serverHost}:${config.serverPort}`,
      health: bot.health,
      food: bot.food,
      coords: `${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)}`
    });
    loop();
  });

  bot.once('spawn', () => {
    console.log('Bot spawn oldu, 3D viewer başlatılıyor...');
    addEvent(memory, 'Bot spawn oldu.');
    
    // ============ 3D VIEWER'ı BAŞLAT ============
    try {
      // Render'da çalışıyorsak viewer'ı ana port üzerinden proxy'le
      // https://github.com/PrismarineJS/prismarine-viewer
      mineflayerViewer(bot, { 
        port: config.port || 3000,
        firstPerson: false, // false = üçüncü şahıs, true = botun gözünden
        viewDistance: 6 // Görüş mesafesi (chunk)
      });
      console.log('✅ 3D Viewer başlatıldı!');
      io.emit('log', { type: 'sistem', message: '🎮 3D Viewer aktif!' });
    } catch (err) {
      console.error('Viewer hatası:', err.message);
      io.emit('log', { type: 'hata', message: `❌ Viewer hatası: ${err.message}` });
    }
  });

  // ... (diğer bot olayları aynen kalacak)
}

// ... (loop ve diğer fonksiyonlar aynen kalacak)

// Bot'u başlat
createBot();

// Web sunucusunu başlat
require('./server');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Kapatılıyor...');
  if (bot) bot.end();
  process.exit(0);
});
