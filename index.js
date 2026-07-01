require('dotenv').config();
const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { loadConfig } = require('./config');
const { io } = require('./server');
const axios = require('axios');
const fs = require('fs');

let bot = null;
let config = loadConfig();
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let isFollowing = false;
let followTarget = null;
let followInterval = null;
let loginDone = false;
let afkInterval = null;
let history = [];
let discoveries = [];
let chatHistory = [];

// ============ YARDIMCI ============
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function saveHistory() {
  fs.writeFileSync('./history.json', JSON.stringify(history, null, 2));
}

function saveDiscoveries() {
  fs.writeFileSync('./discoveries.json', JSON.stringify(discoveries, null, 2));
}

function saveChatHistory() {
  fs.writeFileSync('./chat_history.json', JSON.stringify(chatHistory, null, 2));
}

// ============ AI SORGU (Mistral - Devasa Prompt) ============
async function askAI(prompt) {
  const systemPrompt = `Sen MINDCRAFT seviyesinde bir Minecraft yapay zeka ajanısın.
Tüm Minecraft yeteneklerini, sunucu komutlarını, özel GUI'leri, NPC etkileşimlerini ve oyun mekaniklerini bilirsin.

YETENEKLERİN:
- move <x> <y> <z> : Koordinata git
- mine <blok> : Blok kaz (mine diamond_ore)
- combat <hedef> : Canlıya saldır (zombi, iskelet, oyuncu)
- chat <mesaj> : Sohbet et
- follow <oyuncu> : Oyuncuyu takip et
- stopFollow : Takibi durdur
- eat : Yemek ye
- observe : Etrafı gözlemle (oyuncular, canavarlar, bloklar)
- craft <eşya> <miktar> : Eşya yap
- use <blok> : Blok kullan (kapı, sandık, fırın, üretim masası)
- equip <eşya> <yer> : Eşya kuşan
- drop <eşya> <miktar> : Eşya at
- deposit <eşya> <miktar> : Sandığa koy
- withdraw <eşya> <miktar> : Sandıktan al
- explore : Otomatik keşif modu
- branchMine <uzunluk> <dalSayısı> <yön> : Branch mining
- plan <hedef> : Uzun vadeli plan yap

SUNUCU KOMUTLARI:
/lobby, /hub, /spawn, /home, /sethome, /delhome, /warp, /tpa, /tpaccept, /tp, /tphere, /tpall, /kick, /ban, /mute, /warn, /report, /help, /rules, /discord, /website, /store, /vote, /claim, /kit, /daily, /quest, /mission, /achievement, /rank, /level, /exp, /skill, /class, /race, /clan, /alliance, /war, /peace, /trade, /auction, /market, /bazaar, /blackmarket, /mine, /farm, /fish, /hunt, /cook, /brew, /enchant, /repair, /rename, /color, /hat, /nick, /skin, /cape, /pet, /mount, /disguise, /fly, /speed, /gm, /gamemode, /time, /weather, /pvp, /god, /heal, /feed, /clear, /invsee, /enderchest, /back, /tpahere, /list, /ping, /stats, /duel, /party, /guild, /f, /friend, /msg, /r, /ignore, /pay, /bal, /withdraw, /deposit

ÖZEL GUI'LER:
- AesirMC Login: NPC "ASMP" ye tıkla, End Crystal butonuna tıkla.
- Sunucu Seçimi: "Oyuna Gir" butonuna tıkla.
- Lobby Menü: "Oyuna Gir", "Sunucuya Git", "Başla" butonlarına tıkla.
- Kategori Menüsü: "Survival", "KitPvP", "SkyBlock", "Creative", "Factions", "Prison", "BedWars", "SkyWars", "EggWars", "Build" butonlarına tıkla.

KURALLAR:
- Kullanıcı doğal dilde komut verecek.
- JSON formatında cevap ver: {"action": "komut", "params": ["param"]}
- Birden fazla adım varsa dizi olarak cevap ver: [{"action": "move", "params": ["x","y","z"]}, {"action": "mine", "params": ["diamond_ore"]}]
- Sadece JSON cevap ver, başka bir şey yazma.`;

  try {
    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: config.model || 'mistral-small-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
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

// ============ BOT ============
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
    history.push({ time: Date.now(), event: 'Giriş yapıldı', username: bot.username });
    saveHistory();
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

    setTimeout(() => doAesirLogin(), 3000);
    startRadar();
    startPing();
    startInventory();
    startAutoRules();

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
    history.push({ time: Date.now(), event: 'Bağlantı kesildi', reason });
    saveHistory();
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
    chatHistory.push({ time: Date.now(), type: 'sunucu', message: msg });
    saveChatHistory();

    if (!loginDone && (msg.includes('giriş yaptın') || msg.includes('hoş geldin') || msg.includes('lobby'))) {
      loginDone = true;
      io.emit('log', { type: 'sistem', message: '✅ Login başarılı!' });
      startAFK();
    }

    // Otomatik TPA kabul
    if (msg.includes('tpa') && msg.includes(bot.username)) {
      bot.chat('/tpaccept');
      io.emit('log', { type: 'bot', message: '✅ TPA kabul edildi.' });
    }
  });

  bot.on('whisper', (username, message) => {
    io.emit('log', { type: 'sohbet', message: `💬 ${username} (özel): ${message}` });
    chatHistory.push({ time: Date.now(), type: 'özel', from: username, message });
    saveChatHistory();
    if (message.toLowerCase().includes('tpa')) {
      bot.chat(`/tpaccept`);
      bot.whisper(username, 'TPA kabul edildi.');
    }
  });

  bot.on('windowOpen', (window) => {
    io.emit('log', { type: 'sistem', message: `🪟 Pencere açıldı: ${window.title}` });
    if (window.title.includes('Login') || window.title.includes('Lobby') || window.title.includes('Menü')) {
      // End Crystal slotu 13 veya 22
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

// ============ OTOMATİK KURALLAR ============
function startAutoRules() {
  setInterval(() => {
    if (!bot || !bot.entity) return;
    try {
      // Can düşükse yemek ye
      if (bot.health < 10 && bot.food < 20) {
        const items = bot.inventory.items();
        const food = items.find(i => i.foodPoints > 0);
        if (food) {
          bot.equip(food, 'hand');
          bot.consume();
          io.emit('log', { type: 'sistem', message: '🍖 Otomatik yemek yendi.' });
        }
      }

      // Düşman varsa saldır
      const enemy = bot.nearestEntity(e =>
        e.type === 'mob' && (e.name.includes('zombie') || e.name.includes('skeleton') || e.name.includes('spider'))
      );
      if (enemy && bot.entity.position.distanceTo(enemy.position) < 10) {
        bot.pvp.attack(enemy);
        io.emit('log', { type: 'sistem', message: `⚔️ Otomatik savaş: ${enemy.name}` });
      }
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
        history.push({ time: Date.now(), event: 'Hareket', coords: `${x},${y},${z}` });
        saveHistory();
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
        history.push({ time: Date.now(), event: 'Kazıldı', block: type });
        saveHistory();
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
        history.push({ time: Date.now(), event: 'Savaş', target: entity.name });
        saveHistory();
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
        chatHistory.push({ time: Date.now(), type: 'bot', message: msg });
        saveChatHistory();
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
    case 'craft': {
      const itemName = params[0];
      const count = parseInt(params[1]) || 1;
      try {
        await bot.craft(itemName, count);
        bot.chat(`${count} adet ${itemName} yapıldı.`);
        io.emit('log', { type: 'bot', message: `✅ ${count} adet ${itemName} yapıldı.` });
        history.push({ time: Date.now(), event: 'Eşya yapıldı', item: itemName, count });
        saveHistory();
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'explore': {
      bot.chat('Keşif modu başlatılıyor...');
      io.emit('log', { type: 'bot', message: '🔍 Keşif modu başlatılıyor...' });
      exploreLoop();
      break;
    }
    case 'branchMine': {
      const length = parseInt(params[0]) || 50;
      const branches = parseInt(params[1]) || 5;
      const direction = params[2] || 'kuzey';
      bot.chat(`⛏️ Branch mining başlatılıyor: ${branches} dal, ${length} blok, yön: ${direction}`);
      io.emit('log', { type: 'bot', message: `⛏️ Branch mining başlatılıyor: ${branches} dal, ${length} blok, yön: ${direction}` });
      branchMineLoop(length, branches, direction);
      break;
    }
    default: {
      if (action.startsWith('/')) {
        bot.chat(action);
        io.emit('log', { type: 'bot', message: `📨 ${action} gönderildi.` });
      } else {
        io.emit('log', { type: 'ai', message: `❌ Bilinmeyen yetenek: ${action}` });
      }
    }
  }
}

// ============ KEŞİF DÖNGÜSÜ ============
async function exploreLoop() {
  for (let i = 0; i < 10; i++) {
    if (!bot || !bot.entity) break;
    const angle = Math.random() * 2 * Math.PI;
    const distance = 50 + Math.random() * 100;
    const targetX = bot.entity.position.x + Math.cos(angle) * distance;
    const targetZ = bot.entity.position.z + Math.sin(angle) * distance;
    try {
      await bot.pathfinder.goto({ x: targetX, y: bot.entity.position.y, z: targetZ });
      // Keşif bulgusu
      const villagers = Object.values(bot.entities).filter(e => e.type === 'mob' && e.name === 'villager');
      if (villagers.length > 0) {
        discoveries.push({ time: Date.now(), type: 'köy', coords: `${targetX}, ${bot.entity.position.y}, ${targetZ}` });
        saveDiscoveries();
        bot.chat(`🏘️ Köy bulundu!`);
        io.emit('log', { type: 'bot', message: `🏘️ Köy bulundu!` });
      }
      await sleep(2000);
    } catch (err) { break; }
  }
  bot.chat('✅ Keşif tamamlandı.');
  io.emit('log', { type: 'bot', message: '✅ Keşif tamamlandı.' });
}

// ============ BRANCH MINING ============
async function branchMineLoop(length, branches, direction) {
  const startCoords = { x: bot.entity.position.x, y: bot.entity.position.y, z: bot.entity.position.z };
  const dirMap = { 'kuzey': 0, 'doğu': 1, 'güney': 2, 'batı': 3 };
  const dir = dirMap[direction] || 0;

  for (let b = 0; b < branches; b++) {
    const branchX = startCoords.x + (b * 3);
    const branchZ = startCoords.z;
    try {
      await bot.pathfinder.goto({ x: branchX, y: startCoords.y, z: branchZ });
      for (let i = 0; i < length; i++) {
        let tx = branchX, tz = branchZ;
        switch (dir) {
          case 0: tz = branchZ - i; break;
          case 1: tx = branchX + i; break;
          case 2: tz = branchZ + i; break;
          case 3: tx = branchX - i; break;
        }
        await bot.pathfinder.goto({ x: tx, y: startCoords.y, z: tz });
        // Değerli blokları kaz
        const valuable = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore'];
        for (const v of valuable) {
          const block = bot.findBlock({ matching: b => b.name === v, maxDistance: 3 });
          if (block) { await bot.dig(block); }
        }
      }
      io.emit('log', { type: 'bot', message: `✅ ${b+1}. dal tamamlandı.` });
    } catch (err) { break; }
  }
  bot.chat('✅ Branch mining tamamlandı.');
  io.emit('log', { type: 'bot', message: '✅ Branch mining tamamlandı.' });
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

// ============ DURUM ============
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
  chatHistory.push({ time: Date.now(), type: 'kullanıcı', message: command });
  saveChatHistory();

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
      io.emit('log', { type: 'hata', message: `❌ JSON parse hatası: ${err.message}` });
      // Normal cevap olarak göster
      io.emit('log', { type: 'ai', message: `🧠 ${response}` });
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
