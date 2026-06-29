// AI Minecraft Bot - Tam Çalışan Sürüm
require('dotenv').config();
const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { loadConfig } = require('./config');
const { io } = require('./server');
const axios = require('axios');

let bot = null;
let config = loadConfig();
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let isFollowing = false;
let followTarget = null;
let followInterval = null;

// ============ AI SORGU ============
async function askAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: `Sen Minecraft'ta yaşayan bir yapay zeka ajanısın. 
          Yeteneklerin: move <x> <y> <z> (koordinata git), mine <blok> (blok kaz), combat <hedef> (saldır), 
          chat <mesaj> (sohbet et), follow <oyuncu> (takip et), stopFollow (takibi durdur), eat (yemek ye), observe (gözlem yap).
          Kullanıcı doğal dilde komut verecek. JSON formatında cevap ver: {"action": "komut", "params": ["param"]}
          Sadece JSON cevap ver, başka bir şey yazma.` },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI hatası:', error.response?.data || error.message);
    return null;
  }
}

// ============ BOT OLUŞTUR ============
function createBot() {
  console.log(`🔄 Bağlanılıyor: ${config.serverHost}:${config.serverPort}`);

  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botName + (reconnectAttempts > 0 ? `_${reconnectAttempts}` : ''),
    version: config.version,
    auth: config.auth,
    viewDistance: config.renderDistance
  });

  // Pathfinder plugin'ini yükle
  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    console.log(`✅ ${bot.username} giriş yaptı!`);
    reconnectAttempts = 0;
    io.emit('log', { type: 'sistem', message: `✅ ${bot.username} giriş yaptı!` });
    updateStatus();
  });

  bot.once('spawn', () => {
    console.log('✅ Spawn oldu!');
    io.emit('log', { type: 'sistem', message: '✅ Spawn oldu!' });
    // Pathfinder hareket ayarları
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    // 5 saniye sonra AI döngüsü başlasın
    setTimeout(aiLoop, 5000);
  });

  bot.on('error', (err) => {
    console.error('❌ Hata:', err.message);
    io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
  });

  bot.on('end', (reason) => {
    console.log(`⚠️ Bağlantı kesildi: ${reason}`);
    io.emit('log', { type: 'sistem', message: `⚠️ Bağlantı kesildi: ${reason}` });
    stopFollow();
    reconnect();
  });

  bot.on('kicked', (reason) => {
    console.log(`👢 Atıldı: ${reason}`);
    io.emit('log', { type: 'sistem', message: `👢 Atıldı: ${reason}` });
    stopFollow();
    reconnect();
  });

  bot.on('message', (message) => {
    io.emit('log', { type: 'sohbet', message: `📩 ${message.toString()}` });
  });

  bot.on('move', updateStatus);
}

// ============ AI DÖNGÜSÜ ============
async function aiLoop() {
  while (true) {
    try {
      if (!bot || !bot._client || bot._client.state !== 'connected') {
        await sleep(5000);
        continue;
      }

      // Gözlem yap
      const observation = await observe();
      io.emit('log', { type: 'bot', message: `👀 ${observation}` });

      // AI'ya sor
      const aiResponse = await askAI(observation);
      if (!aiResponse) {
        await sleep(5000);
        continue;
      }

      console.log('🧠 AI:', aiResponse);
      io.emit('log', { type: 'ai', message: `🧠 ${aiResponse}` });

      // JSON parse et
      let action, params;
      try {
        const parsed = JSON.parse(aiResponse);
        action = parsed.action;
        params = parsed.params || [];
      } catch {
        const match = aiResponse.match(/{.*}/s);
        if (match) {
          const parsed = JSON.parse(match[0]);
          action = parsed.action;
          params = parsed.params || [];
        } else {
          io.emit('log', { type: 'ai', message: `⚠️ Geçersiz cevap: ${aiResponse}` });
          await sleep(3000);
          continue;
        }
      }

      // Yeteneği çalıştır
      await executeAction(action, params);

      await sleep(3000);
    } catch (err) {
      console.error('AI Döngü hatası:', err.message);
      await sleep(5000);
    }
  }
}

// ============ GÖZLEM ============
async function observe() {
  const entities = Object.values(bot.entities);
  const players = entities.filter(e => e.type === 'player').map(e => e.username);
  const mobs = entities.filter(e => e.type === 'mob').map(e => e.name);
  const pos = bot.entity.position;
  return `Gözlem: Oyuncular: ${players.join(', ') || 'Yok'}, Canavarlar: ${mobs.join(', ') || 'Yok'}, Koordinat: (${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}), Can: ${bot.health}, Açlık: ${bot.food}`;
}

// ============ YETENEK ÇALIŞTIR ============
async function executeAction(action, params) {
  switch (action) {
    case 'move':
    case 'goto': {
      const [x, y, z] = params.map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(z)) return 'Hatalı koordinat.';
      try {
        await bot.pathfinder.goto({ x, y, z });
        const msg = `${x}, ${y}, ${z} gidildi.`;
        bot.chat(msg);
        io.emit('log', { type: 'bot', message: `✅ ${msg}` });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'mine': {
      const type = params[0];
      const block = bot.findBlock({ matching: b => b.name === type, maxDistance: 10 });
      if (!block) {
        bot.chat(`${type} bulunamadı.`);
        return;
      }
      try {
        await bot.dig(block);
        bot.chat(`${type} kazıldı.`);
        io.emit('log', { type: 'bot', message: `✅ ${type} kazıldı.` });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'combat': {
      const target = params[0];
      const entity = bot.nearestEntity(e => e.name === target || e.type === 'mob' && e.name.includes(target));
      if (!entity) {
        bot.chat(`${target} bulunamadı.`);
        return;
      }
      try {
        await bot.pvp.attack(entity);
        bot.chat(`${entity.name} saldırıldı.`);
        io.emit('log', { type: 'bot', message: `✅ ${entity.name} saldırıldı.` });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'follow': {
      const playerName = params[0];
      if (!playerName) {
        bot.chat('Takip edilecek oyuncu adı belirtilmedi.');
        return;
      }
      const target = bot.players[playerName]?.entity;
      if (!target) {
        bot.chat(`${playerName} bulunamadı.`);
        return;
      }
      isFollowing = true;
      followTarget = playerName;
      bot.chat(`${playerName} takip ediliyor.`);
      io.emit('log', { type: 'bot', message: `👤 ${playerName} takip ediliyor.` });
      startFollowLoop();
      break;
    }
    case 'stopFollow': {
      stopFollow();
      bot.chat('Takip durduruldu.');
      io.emit('log', { type: 'bot', message: '⏹️ Takip durduruldu.' });
      break;
    }
    case 'eat': {
      const items = bot.inventory.items();
      const food = items.find(i => i.foodPoints > 0);
      if (!food) {
        bot.chat('Yiyecek yok.');
        return;
      }
      try {
        await bot.equip(food, 'hand');
        await bot.consume();
        bot.chat('Yemek yendi.');
        io.emit('log', { type: 'bot', message: '🍖 Yemek yendi.' });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'chat': {
      const msg = params.join(' ');
      if (msg) {
        bot.chat(msg);
        io.emit('log', { type: 'bot', message: `💬 ${msg}` });
      }
      break;
    }
    default:
      io.emit('log', { type: 'ai', message: `❌ Bilinmeyen yetenek: ${action}` });
  }
}

// ============ TAKİP DÖNGÜSÜ ============
function startFollowLoop() {
  if (followInterval) clearInterval(followInterval);
  followInterval = setInterval(async () => {
    if (!isFollowing || !followTarget) return;
    const target = bot.players[followTarget]?.entity;
    if (!target) {
      bot.chat(`${followTarget} kayboldu, takip durduruldu.`);
      stopFollow();
      return;
    }
    const distance = bot.entity.position.distanceTo(target.position);
    if (distance > 3) {
      try {
        await bot.pathfinder.goto(target.position);
      } catch (err) {
        // Sessiz geç
      }
    }
  }, 1000);
}

function stopFollow() {
  isFollowing = false;
  followTarget = null;
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
  }
}

// ============ DURUM GÜNCELLEME ============
function updateStatus() {
  if (!bot || !bot.entity) return;
  io.emit('botStatus', {
    health: bot.health,
    food: bot.food,
    coords: `${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)}`
  });
}

// ============ YENİDEN BAĞLAN ============
function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.log('❌ Maksimum deneme aşıldı.');
    process.exit(1);
  }
  reconnectAttempts++;
  const wait = reconnectAttempts * 5000;
  console.log(`🔄 ${wait/1000}s sonra yeniden bağlanma ${reconnectAttempts}/${MAX_RECONNECT}...`);
  setTimeout(createBot, wait);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============ WEB KOMUTLARI ============
io.on('botCommand', async (data) => {
  const command = data.command;
  console.log(`📨 Web'den komut: ${command}`);
  // Doğrudan AI'ya yönlendir
  const response = await askAI(command);
  if (response) {
    try {
      const parsed = JSON.parse(response);
      await executeAction(parsed.action, parsed.params || []);
    } catch (err) {
      io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
    }
  }
});

// ============ BAŞLAT ============
createBot();

process.on('SIGINT', () => {
  console.log('🛑 Kapatılıyor...');
  if (bot) bot.end();
  process.exit(0);
});
