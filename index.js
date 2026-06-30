// index.js - Ana Bot
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
let loginDone = false;
let afkInterval = null;

// ============ AI SORGU (Mistral) ============
async function askAI(prompt) {
  try {
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: `Sen Minecraft'ta yaşayan bir yapay zeka ajanısın.
          Yeteneklerin: move, mine, combat, chat, follow, stopFollow, eat, observe, craft, use, equip.
          Sunucu komutları: /lobby, /spawn, /hub, /tpa, /tpaccept, /home, /sethome, /delhome, /warp, /kit, /shop, /market, /bal, /pay, /trade, /duel, /party, /guild, /f, /friend, /msg, /r, /ignore, /list, /ping, /stats, /rank, /level, /exp, /quest, /mission, /achievement, /claim, /daily, /vote, /store, /discord, /website, /rules, /help.
          Özel GUI: AesirMC'de NPC "ASMP" ye tıkla, End Crystal butonuna tıkla.
          Kullanıcı doğal dilde komut verecek. JSON formatında cevap ver: {"action": "komut", "params": ["param"]}
          Sadece JSON cevap ver, başka bir şey yazma.` },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
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
    io.emit('log', { type: 'hata', message: `❌ AI hatası: ${error.message}` });
    return null;
  }
}

// ============ BOT OLUŞTUR ============
function createBot() {
  console.log(`🔄 Bağlanılıyor: ${config.serverHost}:${config.serverPort}`);
  io.emit('log', { type: 'sistem', message: `🔄 Bağlanılıyor: ${config.serverHost}` });

  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botName + (reconnectAttempts > 0 ? `_${reconnectAttempts}` : ''),
    version: config.version,
    auth: config.auth,
    viewDistance: config.renderDistance
  });

  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    console.log(`✅ ${bot.username} giriş yaptı!`);
    io.emit('log', { type: 'sistem', message: `✅ ${bot.username} giriş yaptı!` });
    reconnectAttempts = 0;
    loginDone = false;
    updateStatus();
  });

  bot.once('spawn', () => {
    console.log('✅ Spawn oldu!');
    io.emit('log', { type: 'sistem', message: '✅ Spawn oldu!' });

    try {
      const mcData = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
    } catch (err) {
      console.error('Pathfinder ayar hatası:', err.message);
    }

    // AesirMC Login
    setTimeout(() => doAesirLogin(), 3000);

    // Radar başlat
    startRadar();

    // Ping başlat
    startPing();

    // Envanter başlat
    startInventory();

    // AFK başlat (login olunca)
    setTimeout(() => {
      if (!loginDone) {
        bot.chat('Hazırım! Ne yapmamı istersin?');
        io.emit('log', { type: 'bot', message: '💬 Hazırım! Ne yapmamı istersin?' });
      }
    }, 5000);
  });

  bot.on('error', (err) => {
    console.error('❌ Hata:', err.message);
    io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
  });

  bot.on('end', (reason) => {
    console.log(`⚠️ Bağlantı kesildi: ${reason}`);
    io.emit('log', { type: 'sistem', message: `⚠️ Bağlantı kesildi: ${reason}` });
    stopFollow();
    stopAFK();
    reconnect();
  });

  bot.on('kicked', (reason) => {
    console.log(`👢 Atıldı: ${reason}`);
    io.emit('log', { type: 'sistem', message: `👢 Atıldı: ${reason}` });
    stopFollow();
    stopAFK();
    reconnect();
  });

  bot.on('message', (message) => {
    const msg = message.toString();
    console.log('📩', msg);
    io.emit('log', { type: 'sohbet', message: `📩 ${msg}` });
    if (!loginDone && (msg.includes('giriş yaptın') || msg.includes('hoş geldin') || msg.includes('lobby'))) {
      loginDone = true;
      io.emit('log', { type: 'sistem', message: '✅ Login başarılı!' });
      startAFK();
    }
  });

  bot.on('whisper', (username, message) => {
    io.emit('log', { type: 'sohbet', message: `💬 ${username} (özel): ${message}` });
    if (message.toLowerCase().includes('tpa')) {
      bot.chat(`/tpaccept`);
      bot.whisper(username, 'TPA kabul edildi.');
    }
  });

  bot.on('windowOpen', (window) => {
    io.emit('log', { type: 'sistem', message: `🪟 Pencere açıldı: ${window.title}` });
    if (window.title.includes('Login') || window.title.includes('Lobby') || window.title.includes('Menü')) {
      // End Crystal slotu genelde 13 veya 22
      const targetSlot = 13;
      try {
        bot.clickWindow(targetSlot, 0, 0);
        io.emit('log', { type: 'sistem', message: `✅ GUI'de slot ${targetSlot}'e tıklandı.` });
        loginDone = true;
        startAFK();
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ GUI tıklama hatası: ${err.message}` });
      }
    }
  });

  bot.on('move', updateStatus);
}

// ============ AESIRMC LOGIN ============
function doAesirLogin() {
  if (loginDone) return;
  io.emit('log', { type: 'sistem', message: '🔍 NPC aranıyor...' });

  const npc = Object.values(bot.entities).find(e =>
    e.type === 'mob' && (e.name === 'ASMP' || e.username === 'ASMP')
  );

  if (npc) {
    io.emit('log', { type: 'sistem', message: `👤 NPC bulundu: ${npc.name}, tıklanıyor...` });
    bot.lookAt(npc.position.offset(0, 1.6, 0), true, () => {
      bot.activateEntity(npc);
      io.emit('log', { type: 'sistem', message: '✅ NPC\'ye tıklandı.' });
      loginDone = true;
      setTimeout(() => {
        bot.chat('/afk');
        startAFK();
      }, 2000);
    });
  } else {
    io.emit('log', { type: 'sistem', message: '⚠️ NPC bulunamadı, /lobby komutu gönderiliyor...' });
    bot.chat('/lobby');
    setTimeout(() => {
      if (!loginDone) doAesirLogin();
    }, 3000);
  }
}

// ============ AFK ============
function startAFK() {
  if (afkInterval) clearInterval(afkInterval);
  afkInterval = setInterval(() => {
    if (bot && bot._client && bot._client.state === 'connected') {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 200);
    }
  }, 30000);
  io.emit('log', { type: 'sistem', message: '💤 AFK modu aktif.' });
}

function stopAFK() {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
  }
}

// ============ RADAR ============
function startRadar() {
  setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      const entities = Object.values(bot.entities)
        .filter(e => e !== bot.entity)
        .map(e => ({
          name: e.username || e.name || '?',
          type: e.type,
          distance: bot.entity.position.distanceTo(e.position),
          x: e.position.x - bot.entity.position.x,
          z: e.position.z - bot.entity.position.z,
          health: e.health || 0
        }));
      io.emit('radarData', entities);
    } catch (err) { /* sessiz */ }
  }, 1000);
}

// ============ PING ============
function startPing() {
  setInterval(() => {
    if (bot && bot._client && bot._client.state === 'connected') {
      const ping = bot._client.latency || 0;
      io.emit('ping', ping);
    }
  }, 2000);
}

// ============ ENVANTER ============
function startInventory() {
  setInterval(() => {
    if (!bot || !bot.inventory) return;
    try {
      const items = bot.inventory.items().map(item => ({
        name: item.name,
        count: item.count,
        durability: item.durabilityUsed || 0
      }));
      io.emit('inventory', items);
    } catch (err) { /* sessiz */ }
  }, 5000);
}

// ============ KOMUT ÇALIŞTIR ============
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
        io.emit('log', { type: 'hata', message: `❌ Hareket hatası: ${err.message}` });
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
    case 'use': {
      const blockType = params[0];
      const block = bot.findBlock({ matching: b => b.name === blockType, maxDistance: 5 });
      if (!block) {
        bot.chat(`${blockType} bulunamadı.`);
        return;
      }
      try {
        await bot.lookAt(block.position);
        await bot.activateBlock(block);
        bot.chat(`${blockType} kullanıldı.`);
        io.emit('log', { type: 'bot', message: `✅ ${blockType} kullanıldı.` });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    default: {
      // Sunucu komutu ise
      if (action.startsWith('/')) {
        bot.chat(action);
        io.emit('log', { type: 'bot', message: `📨 ${action} gönderildi.` });
      } else {
        io.emit('log', { type: 'ai', message: `❌ Bilinmeyen yetenek: ${action}` });
      }
    }
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
      } catch (err) { /* sessiz */ }
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
    io.emit('log', { type: 'hata', message: '❌ Maksimum yeniden bağlanma denemesi aşıldı.' });
    process.exit(1);
  }
  reconnectAttempts++;
  const wait = reconnectAttempts * 5000;
  console.log(`🔄 ${wait/1000}s sonra yeniden bağlanma ${reconnectAttempts}/${MAX_RECONNECT}...`);
  io.emit('log', { type: 'sistem', message: `🔄 ${wait/1000}s sonra yeniden bağlanma ${reconnectAttempts}/${MAX_RECONNECT}...` });
  setTimeout(createBot, wait);
}

// ============ WEB KOMUTLARI ============
io.on('botCommand', async (data) => {
  const command = data.command;
  console.log(`📨 Web'den komut: ${command}`);
  const response = await askAI(command);
  if (response) {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        for (const step of parsed) {
          await executeAction(step.action, step.params || []);
        }
      } else {
        await executeAction(parsed.action, parsed.params || []);
      }
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
