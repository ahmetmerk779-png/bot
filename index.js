require('dotenv').config();
const mineflayer = require('mineflayer');
const config = require('./config');
const { loadMemory, addEvent, addKnowledge } = require('./memory/memoryManager');
const { buildSystemPrompt, buildUserPrompt } = require('./ai/prompt');
const { askGroq } = require('./ai/groq');
const skills = require('./skills');
const { sleep } = require('./utils/helpers');
const { isExploring, stopExploring } = require('./skills/explore');
const { isBranchMining, getProgress, stopBranchMining } = require('./skills/branchMine');

let bot = null;
let memory = loadMemory();
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

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
    bot.chat('Merhaba! Ben yapay zeka botuyum.');
    loop();
  });

  bot.on('spawn', () => {
    console.log('Bot spawn oldu.');
    addEvent(memory, 'Bot spawn oldu.');
  });

  bot.on('error', (err) => {
    console.error('Bot hatası:', err.message);
    addEvent(memory, `Hata: ${err.message}`);
  });

  bot.on('end', (reason) => {
    console.log(`Bot bağlantısı kesildi: ${reason}`);
    isConnected = false;
    addEvent(memory, `Bot bağlantısı kesildi: ${reason}`);
    
    stopExploring(bot);
    stopBranchMining(bot);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Yeniden bağlanma denemesi ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
      setTimeout(createBot, 5000 * reconnectAttempts);
    } else {
      console.error('Maksimum yeniden bağlanma denemesine ulaşıldı.');
      addEvent(memory, 'Maksimum yeniden bağlanma denemesine ulaşıldı.');
    }
  });

  bot.on('whisper', (username, message) => {
    console.log(`[ÖZEL] ${username}: ${message}`);
    addEvent(memory, `Özel mesaj: ${username}: ${message}`);
    
    // TPA komutlarını algıla
    if (message.toLowerCase().includes('tpa') || message.toLowerCase().includes('tpa at')) {
      bot.chat(`/tpa ${username}`);
      bot.whisper(username, 'TPA gönderildi.');
    }
    
    // Takip komutlarını algıla
    if (message.toLowerCase().includes('takip et') || message.toLowerCase().includes('follow')) {
      skills.follow.execute(bot, [username]);
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    console.log(`[SOHBET] ${username}: ${message}`);
    addEvent(memory, `Sohbet: ${username}: ${message}`);
  });

  bot.on('health', () => {
    // Can düşükse otomatik yemek ye
    if (bot.health < 10 && bot.food < 10) {
      skills.eat.execute(bot, []);
    }
  });
}

async function loop() {
  while (isConnected) {
    try {
      // Keşif modu kontrolü
      if (isExploring()) {
        await sleep(1000);
        continue;
      }

      // Branch mining kontrolü
      if (isBranchMining()) {
        const progress = getProgress();
        if (progress) {
          console.log(`Branch Mining: ${progress.progress}% (${progress.currentBranch}/${progress.totalBranches})`);
        }
        await sleep(1000);
        continue;
      }

      // Normal döngü
      const observation = await skills.observe.execute(bot);
      console.log('📊 Gözlem:', observation);
      addEvent(memory, observation);

      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(observation, memory);
      const rawResponse = await askGroq(systemPrompt, userPrompt);
      console.log('🧠 AI Cevabı:', rawResponse);

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
          console.log('Geçerli komut bulunamadı.');
          await sleep(3000);
          continue;
        }
      }

      if (skills[action]) {
        const result = await skills[action].execute(bot, params);
        console.log('✅ Sonuç:', result);
        addEvent(memory, `Yapılan: ${action} ${params.join(' ')} -> ${result}`);
        if (result.includes('kazıldı') || result.includes('yapıldı')) {
          addKnowledge(memory, result);
        }
      } else {
        console.log(`❌ Bilinmeyen yetenek: ${action}`);
        addEvent(memory, `Hatalı komut: ${action}`);
      }

      await sleep(3000);

    } catch (err) {
      console.error('🔄 Döngü hatası:', err.message);
      addEvent(memory, `Döngü hatası: ${err.message}`);
      await sleep(5000);
    }
  }
}

// Bot'u başlat
createBot();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Kapatılıyor...');
  if (bot) bot.end();
  process.exit(0);
});
