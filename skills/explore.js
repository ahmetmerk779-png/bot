const { getDiscoveries, addDiscovery } = require('../memory/memoryManager');
const { sleep } = require('../utils/helpers'); // Yardımcı fonksiyon (aşağıda)

let exploring = false;
let exploreInterval = null;
let currentTarget = null;

async function execute(bot, params) {
  // Eğer "durdur" veya "stop" parametresi geldiyse keşfi durdur
  if (params[0] === 'durdur' || params[0] === 'stop') {
    stopExploring(bot);
    return 'Keşif modu durduruldu.';
  }

  // Zaten keşif modu aktifse
  if (exploring) {
    return 'Zaten keşif modu aktif.';
  }

  // Keşif modunu başlat
  exploring = true;
  bot.chat('Keşif modu başlatılıyor, etrafı keşfediyorum...');
  
  // Ana keşif döngüsünü başlat
  exploreLoop(bot);
  
  return 'Keşif modu başlatıldı.';
}

async function exploreLoop(bot) {
  while (exploring) {
    try {
      // 1. Rastgele bir hedef belirle (100-300 blok uzakta)
      const angle = Math.random() * 2 * Math.PI;
      const distance = 100 + Math.random() * 200;
      const targetX = bot.entity.position.x + Math.cos(angle) * distance;
      const targetZ = bot.entity.position.z + Math.sin(angle) * distance;
      const targetY = bot.entity.position.y; // Mevcut yükseklikte kal

      currentTarget = { x: targetX, y: targetY, z: targetZ };
      
      bot.chat(`Keşif: ${targetX.toFixed(0)}, ${targetZ.toFixed(0)} koordinatlarına gidiyorum...`);

      // 2. Hedefe git (pathfinder ile)
      await bot.pathfinder.goto({ x: targetX, y: targetY, z: targetZ });

      // 3. Hedefe varınca gözlem yap
      const observation = await require('./observe').execute(bot);
      console.log('Keşif Gözlemi:', observation);

      // 4. Önemli yerleri tespit et (köy, mağara, su, yüksek dağ)
      await detectPointsOfInterest(bot);

      // 5. Kısa bekle
      await sleep(2000);

    } catch (err) {
      console.error('Keşif hatası:', err.message);
      // Takıldıysa farklı bir yöne gitmeyi dene
      if (err.message.includes('unreachable')) {
        bot.chat('Yol bulunamadı, farklı bir yöne gidiyorum...');
        // Rastgele zıpla veya 90 derece dön
        bot.setControlState('jump', true);
        await sleep(500);
        bot.setControlState('jump', false);
        // Mevcut hedefi iptal et, yeni hedef belirlenecek
      }
      await sleep(5000);
    }
  }
}

async function detectPointsOfInterest(bot) {
  // 1. Köy tespiti (köylü veya köy yapıları)
  const villagers = Object.values(bot.entities).filter(e => 
    e.type === 'mob' && e.name === 'villager'
  );
  if (villagers.length > 0) {
    const coords = [villagers[0].position.x, villagers[0].position.y, villagers[0].position.z];
    addDiscovery('village', coords, 'Köy');
    bot.chat(`🏘️ Köy bulundu! Koordinat: ${coords.join(', ')}`);
  }

  // 2. Mağara tespiti (karanlık alanlar veya yeraltı girişi)
  // Basitçe, bot'un altındaki blok yüzeyden 5 blok aşağıdaysa mağara olabilir
  const blockBelow = bot.blockAt(bot.entity.position.offset(0, -5, 0));
  if (blockBelow && blockBelow.name === 'air') {
    const coords = [bot.entity.position.x, bot.entity.position.y, bot.entity.position.z];
    addDiscovery('cave', coords, 'Mağara Girişi');
    bot.chat(`🕳️ Mağara girişi bulundu! Koordinat: ${coords.join(', ')}`);
  }

  // 3. Su tespiti
  const waterBlocks = Object.values(bot.entities).filter(e => 
    e.type === 'object' && e.name === 'water'
  );
  if (waterBlocks.length > 0) {
    const coords = [waterBlocks[0].position.x, waterBlocks[0].position.y, waterBlocks[0].position.z];
    addDiscovery('water', coords, 'Su Kaynağı');
    bot.chat(`💧 Su kaynağı bulundu! Koordinat: ${coords.join(', ')}`);
  }

  // 4. Yüksek dağ tespiti (bot'un yüksekliği 80'den fazla)
  if (bot.entity.position.y > 80) {
    const coords = [bot.entity.position.x, bot.entity.position.y, bot.entity.position.z];
    addDiscovery('mountain', coords, 'Yüksek Dağ');
    bot.chat(`⛰️ Yüksek dağ bulundu! Koordinat: ${coords.join(', ')}`);
  }

  // 5. Değerli bloklar (demir, altın, elmas)
  const valuableBlocks = ['iron_ore', 'gold_ore', 'diamond_ore'];
  for (const blockType of valuableBlocks) {
    const block = bot.findBlock({
      matching: b => b.name === blockType,
      maxDistance: 20
    });
    if (block) {
      const coords = [block.position.x, block.position.y, block.position.z];
      addDiscovery('valuable', coords, blockType);
      bot.chat(`💎 ${blockType} bulundu! Koordinat: ${coords.join(', ')}`);
    }
  }
}

function stopExploring(bot) {
  exploring = false;
  if (exploreInterval) {
    clearInterval(exploreInterval);
    exploreInterval = null;
  }
  bot.chat('Keşif modu durduruldu.');
  currentTarget = null;
}

// Yardımcı: Bot'un keşif modunda olup olmadığını kontrol et
function isExploring() {
  return exploring;
}

// Yardımcı: Mevcut hedefi döndür
function getCurrentTarget() {
  return currentTarget;
}

module.exports = { 
  execute, 
  stopExploring, 
  isExploring, 
  getCurrentTarget 
};
