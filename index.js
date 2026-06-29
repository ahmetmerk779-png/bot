const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalNear, GoalBlock, GoalXZ } = require('mineflayer-pathfinder').goals;
const { loadConfig } = require('./config');
const { io } = require('./server');

const config = loadConfig();
let bot = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let followTarget = null;
let followInterval = null;
let isFollowing = false;

// ============ SKILL'LER ============
const skills = {
  async move(bot, args) {
    const [x, y, z] = args.map(Number);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return 'Hatalı koordinat.';
    await bot.pathfinder.goto(new GoalBlock(x, y, z));
    return `${x}, ${y}, ${z} gidildi.`;
  },
  async mine(bot, args) {
    const type = args[0];
    const block = bot.findBlock({ matching: b => b.name === type, maxDistance: 10 });
    if (!block) return `${type} bulunamadı.`;
    await bot.dig(block);
    return `${type} kazıldı.`;
  },
  async combat(bot, args) {
    const name = args[0];
    const entity = bot.nearestEntity(e => e.name === name || (e.type === 'mob' && e.name.includes(name)));
    if (!entity) return `${name} bulunamadı.`;
    await bot.pvp.attack(entity);
    return `${entity.name} saldırıldı.`;
  },
  async follow(bot, args) {
    const name = args[0];
    if (!name) return 'Oyuncu adı belirt.';
    const player = bot.players[name];
    if (!player || !player.entity) return `${name} bulunamadı.`;
    if (isFollowing) {
      clearInterval(followInterval);
      isFollowing = false;
    }
    followTarget = player.entity;
    isFollowing = true;
    bot.chat(`${name} takip ediliyor.`);
    followInterval = setInterval(() => {
      if (!isFollowing || !followTarget) return;
      const dist = bot.entity.position.distanceTo(followTarget.position);
      if (dist > 3) {
        bot.pathfinder.goto(new GoalNear(followTarget.position.x, followTarget.position.y, followTarget.position.z, 2));
      }
    }, 1000);
    return `${name} takip başladı.`;
  },
  async stopFollow(bot) {
    if (followInterval) clearInterval(followInterval);
    isFollowing = false;
    followTarget = null;
    return 'Takip durduruldu.';
  },
  async chat(bot, args) {
    const msg = args.join(' ');
    if (!msg) return 'Mesaj yaz.';
    bot.chat(msg);
    return `"${msg}" yazıldı.`;
  },
  async eat(bot) {
    const food = bot.inventory.items().find(i => i.foodPoints > 0);
    if (!food) return 'Yiyecek yok.';
    await bot.equip(food, 'hand');
    await bot.consume();
    return 'Yemek yenildi.';
  },
  async observe(bot) {
    const players = Object.keys(bot.players).filter(p => p !== bot.username);
    const mobs = Object.values(bot.entities).filter(e => e.type === 'mob').map(e => e.name);
    return `Oyuncular: ${players.join(', ') || 'Yok'}\nCanavarlar: ${mobs.join(', ') || 'Yok'}\nKonum: ${bot.entity.position}`;
  },
  async explore(bot) {
    // Basit keşif: rastgele git
    const angle = Math.random() * 2 * Math.PI;
    const dist = 20 + Math.random() * 40;
    const x = bot.entity.position.x + Math.cos(angle) * dist;
    const z = bot.entity.position.z + Math.sin(angle) * dist;
    await bot.pathfinder.goto(new GoalXZ(x, z));
    return `Keşif: ${x.toFixed(0)}, ${z.toFixed(0)} gidildi.`;
  }
};

// ============ BOT OLUŞTUR ============
function createBot() {
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botName + (reconnectAttempts > 0 ? `_${reconnectAttempts}` : ''),
    version: config.version,
    auth: config.auth,
    viewDistance: config.renderDistance
  });

  // PATHFINDER YÜKLE (ÇOK ÖNEMLİ!)
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    bot.chat('Hazırım!');
    io.emit('log', { type: 'sistem', message: '✅ Bot hazır, pathfinder aktif.' });
  });

  bot.on('login', () => {
    console.log(`✅ ${bot.username} giriş yaptı.`);
    reconnectAttempts = 0;
    io.emit('log', { type: 'sistem', message: `✅ ${bot.username} giriş yaptı.` });
  });

  bot.on('error', (err) => {
    console.error('❌', err.message);
    io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
  });

  bot.on('end', (reason) => {
    console.log(`⚠️ Bağlantı kesildi: ${reason}`);
    io.emit('log', { type: 'sistem', message: `⚠️ Bağlantı kesildi: ${reason}` });
    if (followInterval) clearInterval(followInterval);
    reconnect();
  });

  bot.on('kicked', (reason) => {
    console.log(`👢 Atıldı: ${reason}`);
    io.emit('log', { type: 'sistem', message: `👢 Atıldı: ${reason}` });
    reconnect();
  });

  bot.on('message', (msg) => {
    io.emit('log', { type: 'sohbet', message: `📩 ${msg.toString()}` });
  });

  bot.on('whisper', (username, message) => {
    io.emit('log', { type: 'sohbet', message: `💬 ${username}: ${message}` });
    if (message.includes('tpa')) {
      bot.chat('/tpaccept');
      bot.whisper(username, 'TPA kabul edildi.');
    }
  });

  // ============ KOMUT DİNLEYİCİ ============
  io.on('botCommand', async (data) => {
    const parts = data.trim().split(' ');
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (!bot || !bot.entity) {
      io.emit('log', { type: 'hata', message: '❌ Bot henüz hazır değil.' });
      return;
    }

    // Özel komutlar
    if (action === 'stopfollow') {
      const result = await skills.stopFollow(bot);
      io.emit('log', { type: 'bot', message: `✅ ${result}` });
      return;
    }

    if (skills[action]) {
      try {
        const result = await skills[action](bot, args);
        io.emit('log', { type: 'bot', message: `✅ ${result}` });
        if (result.includes('gidildi') || result.includes('kazıldı') || result.includes('saldırıldı')) {
          bot.chat(result);
        }
      } catch (err) {
        io.emit('log', { type: 'hata', message: `❌ ${err.message}` });
      }
    } else {
      io.emit('log', { type: 'hata', message: `❌ Bilinmeyen komut: ${action}` });
      bot.chat(`Bilinmeyen komut: ${action}`);
    }
  });

  // AFK: her 30 saniyede zıpla
  setInterval(() => {
    if (bot && bot.entity && bot._client?.state === 'connected' && !isFollowing) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 200);
    }
  }, 30000);

  // Her 2 dakikada /afk
  setInterval(() => {
    if (bot && bot._client?.state === 'connected' && !isFollowing) {
      bot.chat('/afk');
    }
  }, 120000);
}

function reconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    console.log('❌ Maksimum deneme aşıldı.');
    process.exit(1);
  }
  reconnectAttempts++;
  const wait = reconnectAttempts * 5000;
  console.log(`🔄 ${wait/1000}s sonra yeniden denenecek (${reconnectAttempts}/${MAX_RECONNECT})`);
  setTimeout(createBot, wait);
}

// BAŞLAT
createBot();

// Graceful shutdown
process.on('SIGINT', () => {
  if (bot) bot.end();
  process.exit(0);
});
