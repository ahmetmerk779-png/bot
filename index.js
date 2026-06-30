import mineflayer from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import Movements from 'mineflayer-pathfinder';
import { loadConfig } from './config.js';
import { io } from './server.js';
import { askAI } from './ai.js';
import { sleep, logToFile, readFromFile } from './utils.js';
import fs from 'fs';

// ============ AYARLAR ============
let config = loadConfig();
let bot = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let isFollowing = false;
let followTarget = null;
let followInterval = null;
let isExploring = false;
let exploreInterval = null;
let isBranchMining = false;
let branchMineData = null;
let autoRules = [];
let quickCommands = [];

// ============ HAFIZA ============
let memory = { events: [], knowledge: [] };
const MEMORY_FILE = './data/memory.json';

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch {}
}

function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
  } catch {}
}

loadMemory();

// ============ SİSTEM PROMPT'U ============
const SYSTEM_PROMPT = `
Sen Minecraft'ta yaşayan bir yapay zeka ajanısın. Botun yapabileceği tüm eylemleri ve sunucu komutlarını biliyorsun.

YETENEKLERİN:
- move <x> <y> <z> : Koordinata git
- mine <blok> : Blok kaz (örn: mine diamond_ore)
- combat <hedef> : Canlıya saldır (zombi, iskelet, oyuncu)
- chat <mesaj> : Sohbete mesaj gönder
- follow <oyuncu> : Oyuncuyu takip et
- stopFollow : Takibi durdur
- eat : Envanterdeki yemeği ye
- observe : Etrafı gözlemle, rapor üret
- craft <eşya> <miktar> : Eşya yap (örn: craft diamond_sword 1)
- use <blok> : Blok kullan (kapı, sandık, fırın, üretim masası)
- equip <eşya> <yer> : Eşyayı kuşan
- openContainer <blok> : Sandık/fırın aç
- deposit <eşya> <miktar> : Konteynıra eşya koy
- withdraw <eşya> <miktar> : Konteynırdan eşya al
- drop <eşya> <miktar> : Eşyayı yere at
- wait <saniye> : Bekle
- stop : Tüm işlemleri durdur
- explore : Otomatik keşif başlat
- branchMine <uzunluk> <dalSayısı> <yön> : Branch mining başlat
- click <hedef> <sağ|sol> : NPC'ye veya oyuncuya tıkla
- clickGui <slot> : Açık GUI'de slota tıkla

SUNUCU KOMUTLARI:
/lobby, /hub, /spawn, /shop, /market, /tpa, /tpaccept, /warp, /home, /sethome, /delhome, /msg, /r, /ignore, /list, /ping, /stats, /duel, /party, /guild, /f, /friend, /trade, /pay, /bal, /withdraw, /deposit, /craft, /enchant, /anvil, /repair, /rename, /color, /hat, /nick, /skin, /cape, /pet, /mount, /disguise, /fly, /speed, /gm, /gamemode, /time, /weather, /pvp, /god, /heal, /feed, /clear, /invsee, /enderchest, /back, /tpahere, /tp, /tphere, /tpall, /kick, /ban, /mute, /warn, /report, /help, /rules, /discord, /website, /store, /vote, /claim, /kit, /daily, /quest, /mission, /achievement, /rank, /level, /exp, /skill, /class, /race, /clan, /alliance, /war, /peace, /trade, /auction, /market, /bazaar, /blackmarket, /mine, /farm, /fish, /hunt, /cook, /brew

ÖZEL GUI'LER:
- AesirMC Login: NPC "ASMP" ye tıkla, End Crystal butonuna tıkla.
- Sunucu Seçimi: "Oyuna Gir" butonuna tıkla.
- Lobby Menü: "Oyuna Gir", "Sunucuya Git", "Başla" butonlarına tıkla.

KURALLAR:
- Kullanıcı doğal dilde komut verecek.
- Eğer bir sunucu komutu gerekiyorsa, "/" ile başlayan komut gönder.
- Eğer NPC tıklama gerekiyorsa, "click" kullan.
- Eğer GUI tıklama gerekiyorsa, "clickGui" kullan.
- Eğer normal minecraft işlemi gerekiyorsa, ilgili yeteneği kullan.
- Eğer sohbetse, normal cevap ver.
- Birden fazla adım varsa JSON dizisi olarak cevap ver.
- Sadece JSON cevap ver, başka bir şey yazma.
`;

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

  bot.loadPlugin(pathfinder);

  // ============ OLAYLAR ============
  bot.on('login', () => {
    console.log(`✅ ${bot.username} giriş yaptı!`);
    isConnected = true;
    reconnectAttempts = 0;
    io.emit('botStatus', {
      botName: config.botName,
      server: `${config.serverHost}:${config.serverPort}`,
      health: bot.health,
      food: bot.food,
      coords: `${Math.round(bot.entity.position.x)}, ${Math.round(bot.entity.position.y)}, ${Math.round(bot.entity.position.z)}`
    });
    logToFile('./data/history.json', { type: 'login', message: `${bot.username} giriş yaptı.` });
  });

  bot.once('spawn', () => {
    console.log('✅ Spawn oldu!');
    io.emit('log', { type: 'sistem', message: '✅ Spawn oldu!' });

    // Pathfinder ayarları
    try {
      const mcData = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
    } catch (err) {
      console.error('Pathfinder hatası:', err.message);
    }

    // AesirMC Login
    setTimeout(doAesirLogin, 3000);

    // Radar
    setInterval(() => {
      if (!isConnected) return;
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
      } catch {}
    }, 1000);

    // Envanter
    setInterval(() => {
      if (!isConnected) return;
      try {
        const items = bot.inventory.items().map(i => ({
          name: i.name,
          count: i.count,
          damage: i.metadata
        }));
        io.emit('inventory', items);
      } catch {}
    }, 5000);

    // Ping
    setInterval(() => {
      if (!isConnected || !bot._client) return;
      try {
        const ping = bot._client.latency || 0;
        io.emit('ping', ping);
      } catch {}
    }, 2000);

    // Otomatik kuralları kontrol et
    setInterval(() => {
      if (!isConnected) return;
      checkAutoRules();
    }, 5000);

    // AI döngüsü (pasif, sadece komut geldiğinde çalışır)
    // Web'den gelen komutları dinle
  });

  bot.on('error', (err) => {
    console.error('❌ Hata:', err.message);
    io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
  });

  bot.on('end', (reason) => {
    console.log(`⚠️ Bağlantı kesildi: ${reason}`);
    isConnected = false;
    io.emit('log', { type: 'sistem', message: `⚠️ Bağlantı kesildi: ${reason}` });
    stopFollow();
    stopExplore();
    stopBranchMine();
    reconnect();
  });

  bot.on('kicked', (reason) => {
    console.log(`👢 Atıldı: ${reason}`);
    io.emit('log', { type: 'sistem', message: `👢 Atıldı: ${reason}` });
    stopFollow();
    stopExplore();
    stopBranchMine();
    reconnect();
  });

  bot.on('message', (message) => {
    const msg = message.toString();
    console.log('📩', msg);
    io.emit('log', { type: 'sohbet', message: `📩 ${msg}` });
    logToFile('./data/chat_history.json', { type: 'sunucu', message: msg });
  });

  bot.on('whisper', (username, message) => {
    io.emit('log', { type: 'sohbet', message: `💬 ${username} (özel): ${message}` });
    if (message.toLowerCase().includes('tpa')) {
      bot.chat(`/tpaccept`);
      bot.whisper(username, 'TPA kabul edildi.');
    }
  });

  bot.on('windowOpen', (window) => {
    io.emit('log', { type: 'sistem', message: `🪟 GUI açıldı: ${window.title}` });
    // Özel GUI işlemleri
    if (window.title.includes('Login') || window.title.includes('Giriş') || window.title.includes('Lobby')) {
      // End Crystal slotu genelde 13 veya 22
      try {
        bot.clickWindow(13, 0, 0);
        io.emit('log', { type: 'sistem', message: '🖱️ End Crystal\'e tıklandı.' });
      } catch {}
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

  bot.on('health', () => {
    if (bot.health < 10 && bot.food < 10) {
      executeAction('eat', []);
    }
  });
}

// ============ AESIRMC LOGIN ============
function doAesirLogin() {
  io.emit('log', { type: 'sistem', message: '🔍 NPC aranıyor...' });

  const npc = Object.values(bot.entities).find(e =>
    e.type === 'mob' && (e.name === 'ASMP' || e.username === 'ASMP')
  );

  if (npc) {
    io.emit('log', { type: 'sistem', message: `👤 NPC bulundu: ${npc.name}, tıklanıyor...` });
    bot.lookAt(npc.position.offset(0, 1.6, 0), true, () => {
      bot.activateEntity(npc);
      io.emit('log', { type: 'sistem', message: '✅ NPC\'ye tıklandı.' });
    });
  } else {
    io.emit('log', { type: 'sistem', message: '⚠️ NPC bulunamadı, /lobby komutu gönderiliyor...' });
    bot.chat('/lobby');
  }
}

// ============ WEB KOMUTLARI ============
io.on('botCommand', async (data) => {
  const command = data.command;
  console.log(`📨 Web'den komut: ${command}`);
  io.emit('log', { type: 'komut', message: `📨 ${command}` });
  logToFile('./data/history.json', { type: 'command', command: command });

  // Önce doğrudan komut mu?
  if (command.startsWith('/')) {
    bot.chat(command);
    io.emit('log', { type: 'bot', message: `💬 ${command}` });
    return;
  }

  // AI'ya sor
  const response = await askAI(command, SYSTEM_PROMPT);
  if (response) {
    io.emit('log', { type: 'ai', message: `🧠 ${response}` });
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        for (const action of parsed) {
          await executeAction(action.action, action.params || []);
        }
      } else {
        await executeAction(parsed.action, parsed.params || []);
      }
    } catch (err) {
      // JSON parse edilemedi, normal sohbet cevabı
      if (bot._client?.state === 'connected') {
        bot.chat(response);
        io.emit('log', { type: 'bot', message: `💬 ${response}` });
      }
    }
  }
});

// ============ AKSİYON ÇALIŞTIR ============
async function executeAction(action, params) {
  switch (action) {
    case 'move':
    case 'goto': {
      const [x, y, z] = params.map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(z)) return;
      try {
        await bot.pathfinder.goto({ x, y, z });
        const msg = `${x}, ${y}, ${z} gidildi.`;
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
        io.emit('log', { type: 'bot', message: `⚠️ ${type} bulunamadı.` });
        return;
      }
      try {
        await bot.dig(block);
        io.emit('log', { type: 'bot', message: `✅ ${type} kazıldı.` });
        logToFile('./data/history.json', { type: 'mine', block: type });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'combat': {
      const target = params[0];
      const entity = bot.nearestEntity(e => e.name === target || e.type === 'mob' && e.name.includes(target));
      if (!entity) {
        io.emit('log', { type: 'bot', message: `⚠️ ${target} bulunamadı.` });
        return;
      }
      try {
        await bot.pvp.attack(entity);
        io.emit('log', { type: 'bot', message: `✅ ${entity.name} saldırıldı.` });
        logToFile('./data/history.json', { type: 'combat', target: entity.name });
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
        logToFile('./data/chat_history.json', { type: 'bot', message: msg });
      }
      break;
    }
    case 'follow': {
      const playerName = params[0];
      if (!playerName) {
        io.emit('log', { type: 'bot', message: '⚠️ Takip edilecek oyuncu adı belirtilmedi.' });
        return;
      }
      const target = bot.players[playerName]?.entity;
      if (!target) {
        io.emit('log', { type: 'bot', message: `⚠️ ${playerName} bulunamadı.` });
        return;
      }
      isFollowing = true;
      followTarget = playerName;
      io.emit('log', { type: 'bot', message: `👤 ${playerName} takip ediliyor.` });
      startFollowLoop();
      break;
    }
    case 'stopFollow': {
      stopFollow();
      io.emit('log', { type: 'bot', message: '⏹️ Takip durduruldu.' });
      break;
    }
    case 'eat': {
      const items = bot.inventory.items();
      const food = items.find(i => i.foodPoints > 0);
      if (!food) {
        io.emit('log', { type: 'bot', message: '⚠️ Yiyecek yok.' });
        return;
      }
      try {
        await bot.equip(food, 'hand');
        await bot.consume();
        io.emit('log', { type: 'bot', message: '🍖 Yemek yendi.' });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'observe': {
      const entities = Object.values(bot.entities);
      const players = entities.filter(e => e.type === 'player').map(e => e.username);
      const mobs = entities.filter(e => e.type === 'mob').map(e => e.name);
      const pos = bot.entity.position;
      const report = `Oyuncular: ${players.join(', ') || 'Yok'}, Canavarlar: ${mobs.join(', ') || 'Yok'}, Koordinat: (${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}), Can: ${bot.health}, Açlık: ${bot.food}`;
      io.emit('log', { type: 'bot', message: `👀 ${report}` });
      break;
    }
    case 'craft': {
      const itemName = params[0];
      const count = parseInt(params[1]) || 1;
      try {
        await bot.craft(itemName, count);
        io.emit('log', { type: 'bot', message: `✅ ${count} adet ${itemName} yapıldı.` });
        logToFile('./data/history.json', { type: 'craft', item: itemName, count: count });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'use': {
      const type = params[0];
      const block = bot.findBlock({ matching: b => b.name === type, maxDistance: 5 });
      if (!block) {
        io.emit('log', { type: 'bot', message: `⚠️ ${type} bulunamadı.` });
        return;
      }
      try {
        await bot.activateBlock(block);
        io.emit('log', { type: 'bot', message: `✅ ${type} kullanıldı.` });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'click': {
      const targetName = params[0];
      const clickType = params[1] || 'right';
      const entity = Object.values(bot.entities).find(e => e.username === targetName || e.name === targetName);
      if (!entity) {
        io.emit('log', { type: 'bot', message: `⚠️ ${targetName} bulunamadı.` });
        return;
      }
      bot.lookAt(entity.position.offset(0, 1.6, 0), true, () => {
        if (clickType === 'right') {
          bot.activateEntity(entity);
          io.emit('log', { type: 'bot', message: `✅ ${targetName}'e sağ tıklandı.` });
        } else {
          bot.attack(entity);
          io.emit('log', { type: 'bot', message: `✅ ${targetName}'e sol tıklandı.` });
        }
      });
      break;
    }
    case 'clickGui': {
      const slot = parseInt(params[0]);
      if (isNaN(slot)) return;
      try {
        bot.clickWindow(slot, 0, 0);
        io.emit('log', { type: 'bot', message: `🖱️ GUI'de ${slot}. slota tıklandı.` });
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
      break;
    }
    case 'explore': {
      startExplore();
      break;
    }
    case 'stopExplore': {
      stopExplore();
      break;
    }
    case 'branchMine': {
      const length = parseInt(params[0]) || 50;
      const branches = parseInt(params[1]) || 5;
      const direction = params[2] || 'kuzey';
      startBranchMine(length, branches, direction);
      break;
    }
    case 'stopBranchMine': {
      stopBranchMine();
      break;
    }
    case 'wait': {
      const seconds = parseInt(params[0]) || 1;
      await sleep(seconds * 1000);
      break;
    }
    case 'stop': {
      stopFollow();
      stopExplore();
      stopBranchMine();
      io.emit('log', { type: 'bot', message: '⏹️ Tüm işlemler durduruldu.' });
      break;
    }
    default: {
      // Sunucu komutu mu?
      if (action.startsWith('/')) {
        bot.chat(action);
        io.emit('log', { type: 'bot', message: `💬 ${action}` });
      } else {
        io.emit('log', { type: 'hata', message: `❌ Bilinmeyen yetenek: ${action}` });
      }
    }
  }
}

// ============ TAKİP ============
function startFollowLoop() {
  if (followInterval) clearInterval(followInterval);
  followInterval = setInterval(async () => {
    if (!isFollowing || !followTarget) return;
    const target = bot.players[followTarget]?.entity;
    if (!target) {
      io.emit('log', { type: 'bot', message: `⚠️ ${followTarget} kayboldu, takip durduruldu.` });
      stopFollow();
      return;
    }
    const distance = bot.entity.position.distanceTo(target.position);
    if (distance > 3) {
      try {
        await bot.pathfinder.goto(target.position);
      } catch {}
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

// ============ KEŞİF ============
function startExplore() {
  if (isExploring) return;
  isExploring = true;
  io.emit('log', { type: 'bot', message: '🔍 Keşif modu başlatıldı.' });
  exploreLoop();
}

async function exploreLoop() {
  while (isExploring) {
    try {
      const angle = Math.random() * 2 * Math.PI;
      const distance = 50 + Math.random() * 100;
      const targetX = bot.entity.position.x + Math.cos(angle) * distance;
      const targetZ = bot.entity.position.z + Math.sin(angle) * distance;
      await bot.pathfinder.goto({ x: targetX, y: bot.entity.position.y, z: targetZ });
      await executeAction('observe', []);
      await sleep(2000);
    } catch (err) {
      io.emit('log', { type: 'hata', message: `❌ Keşif hatası: ${err.message}` });
      await sleep(5000);
    }
  }
}

function stopExplore() {
  isExploring = false;
  io.emit('log', { type: 'bot', message: '⏹️ Keşif durduruldu.' });
}

// ============ BRANCH MINING ============
function startBranchMine(length, branches, direction) {
  if (isBranchMining) return;
  isBranchMining = true;
  branchMineData = { length, branches, direction, current: 0 };
  io.emit('log', { type: 'bot', message: `⛏️ Branch mining başlatıldı: ${branches} dal, ${length} blok, yön: ${direction}` });
  branchMineLoop();
}

async function branchMineLoop() {
  while (isBranchMining && branchMineData.current < branchMineData.branches) {
    try {
      const offset = branchMineData.current * 3;
      const startX = bot.entity.position.x + offset;
      const startZ = bot.entity.position.z;
      await bot.pathfinder.goto({ x: startX, y: bot.entity.position.y, z: startZ });
      for (let i = 0; i < branchMineData.length && isBranchMining; i++) {
        const targetX = startX + (branchMineData.direction === 'doğu' ? i : branchMineData.direction === 'batı' ? -i : 0);
        const targetZ = startZ + (branchMineData.direction === 'kuzey' ? -i : branchMineData.direction === 'güney' ? i : 0);
        await bot.pathfinder.goto({ x: targetX, y: bot.entity.position.y, z: targetZ });
        await mineValuableBlocks();
        await sleep(500);
      }
      branchMineData.current++;
      io.emit('log', { type: 'bot', message: `✅ ${branchMineData.current}. dal tamamlandı.` });
    } catch (err) {
      io.emit('log', { type: 'hata', message: `❌ Branch mining hatası: ${err.message}` });
      await sleep(3000);
    }
  }
  if (isBranchMining) {
    io.emit('log', { type: 'bot', message: '🎉 Branch mining tamamlandı!' });
    stopBranchMine();
  }
}

async function mineValuableBlocks() {
  const blocks = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore', 'lapis_ore'];
  for (const type of blocks) {
    const block = bot.findBlock({ matching: b => b.name === type, maxDistance: 3 });
    if (block) {
      try {
        await bot.dig(block);
        io.emit('log', { type: 'bot', message: `💎 ${type} bulundu ve kazıldı.` });
        logToFile('./data/discoveries.json', { type: 'valuable', block: type, coords: [block.position.x, block.position.y, block.position.z] });
      } catch {}
    }
  }
}

function stopBranchMine() {
  isBranchMining = false;
  branchMineData = null;
  io.emit('log', { type: 'bot', message: '⏹️ Branch mining durduruldu.' });
}

// ============ OTOMATİK KURALLAR ============
function checkAutoRules() {
  // Örnek kurallar
  if (bot.health < 10 && bot.food < 10) {
    executeAction('eat', []);
  }
  // Düşman varsa saldır
  const enemy = Object.values(bot.entities).find(e =>
    e.type === 'mob' && ['zombie', 'skeleton', 'spider', 'creeper'].includes(e.name)
  );
  if (enemy && bot.health > 10) {
    executeAction('combat', [enemy.name]);
  }
}

// ============ YENİDEN BAĞLAN ============
function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    io.emit('log', { type: 'hata', message: '❌ Maksimum yeniden bağlanma denemesi aşıldı.' });
    process.exit(1);
  }
  reconnectAttempts++;
  const wait = reconnectAttempts * 5000;
  io.emit('log', { type: 'sistem', message: `🔄 ${wait/1000}s sonra yeniden bağlanma ${reconnectAttempts}/${MAX_RECONNECT}...` });
  setTimeout(createBot, wait);
}

// ============ BAŞLAT ============
createBot();

process.on('SIGINT', () => {
  console.log('🛑 Kapatılıyor...');
  if (bot) bot.end();
  process.exit(0);
});
