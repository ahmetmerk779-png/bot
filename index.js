const mineflayer = require('mineflayer');
const config = require('./config');
const { loadMemory, addEvent, addKnowledge } = require('./memory/memoryManager');
const { buildSystemPrompt, buildUserPrompt } = require('./ai/prompt');
const { askGroq } = require('./ai/groq');
const skills = require('./skills');
const { sleep } = require('./utils/helpers');
const { isExploring, stopExploring } = require('./skills/explore');

let memory = loadMemory();
let bot;

function createBot() {
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botName,
    version: config.version,
    viewDistance: config.renderDistance
  });

  bot.on('login', () => {
    console.log(`${config.botName} giriş yaptı.`);
    addEvent(memory, 'Bot oyuna giriş yaptı.');
    loop();
  });

  bot.on('error', (err) => {
    console.error('Bot hatası:', err);
    addEvent(memory, `Hata: ${err.message}`);
  });

  bot.on('end', () => {
    console.log('Bot bağlantısı kesildi, yeniden bağlanılıyor...');
    addEvent(memory, 'Bot bağlantısı kesildi.');
    stopExploring(bot);
    setTimeout(createBot, 5000);
  });
}

async function loop() {
  while (true) {
    try {
      // Eğer keşif modu aktifse, explore skill'i zaten çalışıyor, bu döngüde sadece durumu kontrol et.
      if (isExploring()) {
        await sleep(1000);
        continue;
      }

      // Normal döngü: gözlem yap, AI'ya sor, komut uygula
      const observation = await skills.observe.execute(bot);
      console.log('Gözlem:', observation);
      addEvent(memory, observation);

      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(observation, memory);
      const rawResponse = await askGroq(systemPrompt, userPrompt);
      console.log('AI cevabı:', rawResponse);

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

      // Yeteneği çalıştır
      if (skills[action]) {
        const result = await skills[action].execute(bot, params);
        console.log('Sonuç:', result);
        addEvent(memory, `Yapılan: ${action} ${params.join(' ')} -> ${result}`);
        if (result.includes('kazıldı') || result.includes('yapıldı')) {
          addKnowledge(memory, result);
        }
      } else {
        console.log(`Bilinmeyen yetenek: ${action}`);
        addEvent(memory, `Hatalı komut: ${action}`);
      }

      await sleep(3000);

    } catch (err) {
      console.error('Döngü hatası:', err);
      await sleep(5000);
    }
  }
}

createBot();
