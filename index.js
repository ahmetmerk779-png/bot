// index.js - Ana bot dosyası (3D Viewer ile)
require('dotenv').config();
const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
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
const MAX_RECONNECT_ATTEMPTS = 500000;

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
    try {
      mineflayerViewer(bot, {
        port: config.port || 3000,
        firstPerson: false,  // false = üçüncü şahıs, true = botun gözünden
        viewDistance: 6
      });
      console.log('✅ 3D Viewer başlatıldı!');
      io.emit('log', { type: 'sistem', message: '🎮 3D Viewer aktif!' });
    } catch (err) {
      console.error('Viewer hatası:', err.message);
      io.emit('log', { type: 'hata', message: `❌ Viewer hatası: ${err.message}` });
    }
  });

  bot.on('error', (err) => {
    console.error('Bot hatası:', err.message);
    addEvent(memory, `Hata: ${err.message}`);
    io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
  });

  bot.on('end', (reason) => {
    console.log(`Bot bağlantısı kesildi: ${reason}`);
    isConnected = false;
    addEvent(memory, `Bot bağlantısı kesildi: ${reason}`);
    stopExploring(bot);
    stopBranchMining(bot);
    io.emit('log', { type: 'sistem', message: `⚠️ Bağlantı kesildi: ${reason}` });
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Yeniden bağlanma denemesi ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
      setTimeout(createBot, 5000 * reconnectAttempts);
    } else {
      io.emit('log', { type: 'hata', message: '❌ Maksimum yeniden bağlanma denemesi aşıldı.' });
    }
  });

  bot.on('move', () => {
    if (isConnected) {
      io.emit('botStatus', {
        health: bot.health,
        food: bot.food,
        coords: `${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)}`
      });
    }
  });

  bot.on('whisper', (username, message) => {
    io.emit('log', { type: 'sistem', message: `💬 ${username}: ${message}` });
    if (message.toLowerCase().includes('tpa')) {
      if (bot._client?.state === 'connected') {
        bot.chat(`/tpa ${username}`);
        bot.whisper(username, 'TPA gönderildi.');
      }
    }
    if (message.toLowerCase().includes('takip et') || message.toLowerCase().includes('follow')) {
      skills.follow.execute(bot, [username]);
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    io.emit('log', { type: 'sistem', message: `💬 ${username}: ${message}` });
  });

  bot.on('health', () => {
    if (bot.health < 10 && bot.food < 10) {
      skills.eat.execute(bot, []);
    }
  });
}

// ============ BOT KOMUTLARINI DİNLE (WEB'DEN) ============
io.on('botCommand', async (data) => {
  const command = data.command;
  console.log(`📥 Web'den komut: ${command}`);
  const parts = command.trim().split(' ');
  const action = parts[0];
  const params = parts.slice(1);
  if (skills[action]) {
    try {
      const result = await skills[action].execute(bot, params);
      io.emit('log', { type: 'bot', message: `✅ ${result}` });
    } catch (err) {
      io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
    }
  } else {
    io.emit('log', { type: 'ai', message: `🤔 Anlamadım, AI'ya soruyorum...` });
  }
});

// ============ ANA DÖNGÜ ============
async function loop() {
  while (isConnected) {
    try {
      if (isExploring()) {
        await sleep(1000);
        continue;
      }
      if (isBranchMining()) {
        const progress = getProgress();
        if (progress) {
          io.emit('log', { type: 'sistem', message: `⛏️ Branch Mining: %${progress.progress} (${progress.currentBranch}/${progress.totalBranches})` });
        }
        await sleep(1000);
        continue;
      }

      const observation = await skills.observe.execute(bot);
      console.log('📊 Gözlem:', observation);
      addEvent(memory, observation);
      io.emit('log', { type: 'bot', message: `👀 ${observation}` });

      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(observation, memory);
      const rawResponse = await askGroq(systemPrompt, userPrompt);
      console.log('🧠 AI:', rawResponse);

      if (!rawResponse) {
        await sleep(5000);
        continue;
      }

      let action, params;
      try {
        const parsed = JSON.parse(rawResponse);
        action = parsed.action;
        params = parsed.params || [];
      } catch {
        const match = rawResponse.match(/{.*}/s);
        if (match) {
          const parsed = JSON.parse(match[0]);
          action = parsed.action;
          params = parsed.params || [];
        } else {
          io.emit('log', { type: 'ai', message: `⚠️ AI geçersiz cevap verdi` });
          await sleep(3000);
          continue;
        }
      }

      if (skills[action]) {
        const result = await skills[action].execute(bot, params);
        console.log('✅ Sonuç:', result);
        addEvent(memory, `Yapılan: ${action} ${params.join(' ')} -> ${result}`);
        io.emit('log', { type: 'bot', message: `✅ ${result}` });
        if (result.includes('kazıldı') || result.includes('yapıldı')) {
          addKnowledge(memory, result);
        }
      } else {
        io.emit('log', { type: 'hata', message: `❌ Bilinmeyen yetenek: ${action}` });
      }

      await sleep(3000);
    } catch (err) {
      console.error('Döngü hatası:', err.message);
      io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      await sleep(5000);
    }
  }
}

// ============ BOT'U BAŞLAT ============
createBot();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Kapatılıyor...');
  if (bot) bot.end();
  process.exit(0);
});
