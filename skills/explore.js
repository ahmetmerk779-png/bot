const { addDiscovery } = require('../memory/memoryManager');
const { sleep } = require('../utils/helpers');

let exploring = false;
let currentTarget = null;

async function execute(bot, params) {
  if (params[0] === 'durdur' || params[0] === 'stop') {
    stopExploring(bot);
    return 'Keşif modu durduruldu.';
  }

  if (exploring) {
    return 'Zaten keşif modu aktif.';
  }

  exploring = true;
  bot.chat('Keşif modu başlatılıyor...');
  exploreLoop(bot);
  return 'Keşif modu başlatıldı.';
}

async function exploreLoop(bot) {
  while (exploring) {
    try {
      const angle = Math.random() * 2 * Math.PI;
      const distance = 100 + Math.random() * 200;
      const targetX = bot.entity.position.x + Math.cos(angle) * distance;
      const targetZ = bot.entity.position.z + Math.sin(angle) * distance;
      const targetY = bot.entity.position.y;

      currentTarget = { x: targetX, y: targetY, z: targetZ };
      await bot.pathfinder.goto({ x: targetX, y: targetY, z: targetZ });
      
      await detectPointsOfInterest(bot);
      await sleep(2000);

    } catch (err) {
      console.error('Keşif hatası:', err.message);
      if (err.message.includes('unreachable')) {
        bot.setControlState('jump', true);
        await sleep(500);
        bot.setControlState('jump', false);
      }
      await sleep(5000);
    }
  }
}

async function detectPointsOfInterest(bot) {
  const villagers = Object.values(bot.entities).filter(e => e.type === 'mob' && e.name === 'villager');
  if (villagers.length > 0) {
    const coords = [villagers[0].position.x, villagers[0].position.y, villagers[0].position.z];
    addDiscovery('village', coords, 'Köy');
    if (bot._client?.state === 'connected') bot.chat(`🏘️ Köy bulundu!`);
  }

  const blockBelow = bot.blockAt(bot.entity.position.offset(0, -5, 0));
  if (blockBelow && blockBelow.name === 'air') {
    const coords = [bot.entity.position.x, bot.entity.position.y, bot.entity.position.z];
    addDiscovery('cave', coords, 'Mağara');
    if (bot._client?.state === 'connected') bot.chat(`🕳️ Mağara bulundu!`);
  }

  const valuableBlocks = ['iron_ore', 'gold_ore', 'diamond_ore'];
  for (const blockType of valuableBlocks) {
    const block = bot.findBlock({ matching: b => b.name === blockType, maxDistance: 20 });
    if (block) {
      const coords = [block.position.x, block.position.y, block.position.z];
      addDiscovery('valuable', coords, blockType);
      if (bot._client?.state === 'connected') bot.chat(`💎 ${blockType} bulundu!`);
    }
  }
}

// ============ GÜVENLİ DURDURMA ============
function stopExploring(bot) {
  exploring = false;
  // Sadece bot bağlıysa mesaj gönder
  if (bot && bot._client && bot._client.state === 'connected') {
    bot.chat('Keşif modu durduruldu.');
  }
  currentTarget = null;
}

function isExploring() { return exploring; }
function getCurrentTarget() { return currentTarget; }

module.exports = { execute, stopExploring, isExploring, getCurrentTarget };
