// index.js - Tüm sorunlar çözüldü, radar kaldırıldı
require('dotenv').config();
const mineflayer = require('mineflayer');
const config = require('./config');
const { loadMemory, addEvent, addKnowledge } = require('./memory/memoryManager');
const { buildSystemPrompt, buildUserPrompt } = require('./ai/prompt');
const { askGroq } = require('./ai/groq');
const { askOpenRouter } = require('./ai/openrouter');
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

// ============ AI SORGU ============
async function askAI(systemPrompt, userPrompt) {
  if (config.aiProvider === 'openrouter') {
    return await askOpenRouter(systemPrompt, userPrompt);
  } else {
    return await askGroq(systemPrompt, userPrompt);
  }
}

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
    
    // === KONUŞMA TESTİ ===
    setTimeout(() => {
      if (bot._client?.state === 'connected') {
        bot.chat('Merhaba! Ben yapay zeka botuyum.');
        io.emit('log', { type: 'bot', message: '💬 Merhaba! Ben yapay zeka botuyum.' });
      }
    }, 2000);
    
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
    console.log('Bot spawn oldu.');
    addEvent(memory, 'Bot spawn oldu.');
    io.emit('log', { type: 'sistem', message: '✅ Bot spawn oldu.' });
    
    setTimeout(() => {
      if (bot._client?.state === 'connected') {
        bot.chat('Hazırım! Ne yapmamı istersin?');
        io.emit('log', { type: 'bot', message: '💬 Hazırım! Ne yapmamı istersin?' });
      }
    }, 3000);
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

  // === SOHBET DİNLEYİCİLERİ (ÇALIŞIYOR) ===
  bot.on('whisper', (username, message) => {
    console.log(`[ÖZEL] ${username}: ${message}`);
    io.emit('log', { type: 'sistem', message: `💬 ${username} (özel): ${message}` });
    
    // TPA komutları
    if (message.toLowerCase().includes('tpa') || message.toLowerCase().includes('tpa at')) {
      if (bot._client?.state === 'connected') {
        bot.chat(`/tpa ${username}`);
        bot.whisper(username, 'TPA gönderildi.');
        io.emit('log', { type: 'bot', message: `📨 ${username}'a TPA gönderildi.` });
      }
    }
    
    // Takip et
    if (message.toLowerCase().includes('takip et') || message.toLowerCase().includes('follow')) {
      skills.follow.execute(bot, [username]);
    }
    
    // Merhaba cevabı
    if (message.toLowerCase().includes('merhaba') || message.toLowerCase().includes('selam')) {
      bot.whisper(username, 'Merhaba! Nasılsın?');
      io.emit('log', { type: 'bot', message: `💬 ${username}'a: Merhaba! Nasılsın?` });
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[SOHBET] ${username}: ${message}`);
    io.emit('log', { type: 'sistem', message: `💬 ${username}: ${message}` });
    
    // Genel sohbetten takip komutu
    if (message.toLowerCase().includes('takip et') && message.toLowerCase().includes(bot.username)) {
      skills.follow.execute(bot, [username]);
    }
  });

  bot.on('health', () => {
    if (bot.health < 10 && bot.food < 10) {
      skills.eat.execute(bot, []);
    }
  });
}

// ============ WEB'DEN KOMUT DİNLE ============
io.on('botCommand', async (data) => {
  const command = data.command;
  console.log(`📥 Web'den komut: ${command}`);
  io.emit('log', { type: 'komut', message: `📨 ${command}` });
  
  const parts = command.trim().split(' ');
  const action = parts[0];
  const params = parts.slice(1);
  
  if (skills[action]) {
    try {
      const result = await skills[action].execute(bot, params);
      console.log('✅ Sonuç:', result);
      io.emit('log', { type: 'bot', message: `✅ ${result}` });
      if (bot._client?.state === 'connected') {
        bot.chat(`✅ ${result}`);
      }
    } catch (err) {
      io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
    }
  } else {
    io.emit('log', { type: 'ai', message: `🤔 Bilinmeyen komut: ${action}` });
    if (bot._client?.state === 'connected') {
      bot.chat(`Bilinmeyen komut: ${action}`);
    }
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
      const rawResponse = await askAI(systemPrompt, userPrompt);
      console.log('🧠 AI Cevabı:', rawResponse);

      if (!rawResponse) {
        io.emit('log', { type: 'ai', message: '⚠️ AI cevap vermedi, bekleniyor...' });
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
          io.emit('log', { type: 'ai', message: `⚠️ AI geçersiz cevap: ${rawResponse.substring(0, 50)}...` });
          await sleep(3000);
          continue;
        }
      }

      if (skills[action]) {
        const result = await skills[action].execute(bot, params);
        console.log('✅ Sonuç:', result);
        addEvent(memory, `Yapılan: ${action} ${params.join(' ')} -> ${result}`);
        io.emit('log', { type: 'bot', message: `✅ ${result}` });
        if (bot._client?.state === 'connected') {
          bot.chat(`✅ ${result}`);
        }
        if (result.includes('kazıldı') || result.includes('yapıldı')) {
          addKnowledge(memory, result);
        }
      } else {
        io.emit('log', { type: 'hata', message: `❌ Bilinmeyen yetenek: ${action}` });
        if (bot._client?.state === 'connected') {
          bot.chat(`❌ Bilinmeyen komut: ${action}`);
        }
      }

      await sleep(3000);
    } catch (err) {
      console.error('Döngü hatası:', err.message);
      io.emit('log', { type: 'hata', message: `❌ Döngü hatası: ${err.message}` });
      await sleep(5000);
    }
  }
}

// ============ BOT'U BAŞLAT ============
createBot();

process.on('SIGINT', () => {
  console.log('Kapatılıyor...');
  if (bot) bot.end();
  process.exit(0);
});
