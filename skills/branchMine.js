const { sleep } = require('../utils/helpers');
const { addEvent, addKnowledge } = require('../memory/memoryManager');

let branchMining = false;
let branchInterval = null;
let currentBranch = 0;
let totalBranches = 0;
let branchLength = 0;
let startCoords = null;
let currentDirection = 0; // 0: kuzey, 1: doğu, 2: güney, 3: batı

async function execute(bot, params) {
  // Eğer "durdur" parametresi geldiyse branch mining'i durdur
  if (params[0] === 'durdur' || params[0] === 'stop') {
    stopBranchMining(bot);
    return 'Branch mining durduruldu.';
  }

  // Zaten branch mining aktifse
  if (branchMining) {
    return 'Zaten branch mining aktif.';
  }

  // Parametreleri al: uzunluk, dal sayısı, yön
  const length = parseInt(params[0]) || 50; // Varsayılan 50 blok
  const branches = parseInt(params[1]) || 5; // Varsayılan 5 dal
  const direction = params[2] || 'kuzey'; // Varsayılan kuzey

  // Yönü belirle
  const directionMap = {
    'kuzey': 0,
    'doğu': 1,
    'güney': 2,
    'batı': 3
  };
  currentDirection = directionMap[direction.toLowerCase()] || 0;

  // Başlangıç koordinatlarını kaydet
  startCoords = {
    x: Math.round(bot.entity.position.x),
    y: Math.round(bot.entity.position.y),
    z: Math.round(bot.entity.position.z)
  };

  branchLength = length;
  totalBranches = branches;
  currentBranch = 0;

  branchMining = true;
  bot.chat(`⛏️ Branch mining başlatılıyor: ${totalBranches} dal, ${branchLength} blok uzunluğunda, yön: ${direction}`);

  // Branch mining döngüsünü başlat
  branchLoop(bot);

  return `Branch mining başlatıldı. ${totalBranches} dal, ${branchLength} blok uzunluğunda.`;
}

async function branchLoop(bot) {
  while (branchMining && currentBranch < totalBranches) {
    try {
      // 1. Dal başlangıç pozisyonuna git
      const branchStartX = startCoords.x + (currentBranch * 3); // Her dal arasında 3 blok boşluk
      const branchStartZ = startCoords.z;

      // Dal başlangıcına git (yukarıdan)
      await bot.pathfinder.goto({
        x: branchStartX,
        y: startCoords.y,
        z: branchStartZ
      });

      bot.chat(`📏 ${currentBranch + 1}. dal başlıyor...`);

      // 2. Dal boyunca ilerle ve kaz
      for (let i = 0; i < branchLength && branchMining; i++) {
        // İlerleme yönünü hesapla
        let targetX = branchStartX;
        let targetZ = branchStartZ;

        switch (currentDirection) {
          case 0: // Kuzey
            targetZ = branchStartZ - i;
            break;
          case 1: // Doğu
            targetX = branchStartX + i;
            break;
          case 2: // Güney
            targetZ = branchStartZ + i;
            break;
          case 3: // Batı
            targetX = branchStartX - i;
            break;
        }

        // Hedefe git
        await bot.pathfinder.goto({
          x: targetX,
          y: startCoords.y,
          z: targetZ
        });

        // Çevredeki değerli blokları kontrol et (demir, altın, elmas, zümrüt)
        await mineValuableBlocks(bot);

        // Zıplama ile ilerle (branch mining verimliliği için)
        bot.setControlState('jump', true);
        await sleep(100);
        bot.setControlState('jump', false);

        // Her 5 blokta bir ilerleme durumunu göster
        if (i % 5 === 0 && i > 0) {
          bot.chat(`📊 ${currentBranch + 1}. dal: ${i}/${branchLength} blok ilerlendi`);
        }

        await sleep(200);
      }

      // 3. Dal tamamlandı
      bot.chat(`✅ ${currentBranch + 1}. dal tamamlandı!`);

      // 4. Bir sonraki dala geç
      currentBranch++;

      // Dal arası kısa bekle
      await sleep(2000);

    } catch (err) {
      console.error('Branch mining hatası:', err.message);
      bot.chat(`⚠️ Branch mining hatası: ${err.message}`);
      // Takıldıysa zıpla ve devam et
      bot.setControlState('jump', true);
      await sleep(500);
      bot.setControlState('jump', false);
      await sleep(1000);
    }
  }

  // Tüm dallar tamamlandı
  if (branchMining && currentBranch >= totalBranches) {
    bot.chat('🎉 Tüm branch mining tamamlandı!');
    addEvent(bot, 'Branch mining tamamlandı.');
    addKnowledge(bot, `Branch mining tamamlandı: ${totalBranches} dal, ${branchLength} blok uzunluğunda.`);
    stopBranchMining(bot);
  }
}

async function mineValuableBlocks(bot) {
  // Değerli blok listesi
  const valuableBlocks = [
    'diamond_ore', 'iron_ore', 'gold_ore', 
    'emerald_ore', 'lapis_ore', 'redstone_ore',
    'coal_ore', 'copper_ore'
  ];

  for (const blockType of valuableBlocks) {
    // Bot'un etrafındaki blokları kontrol et (3 blok yarıçap)
    const block = bot.findBlock({
      matching: b => b.name === blockType,
      maxDistance: 3
    });

    if (block) {
      try {
        bot.chat(`💎 ${blockType} bulundu! Kazılıyor...`);
        await bot.dig(block);
        bot.chat(`✅ ${blockType} kazıldı. Envantere eklendi.`);
        addKnowledge(bot, `${blockType} kazıldı.`);
        
        // Kazma işlemi başarılı olduğunda kısa bekle
        await sleep(500);
      } catch (err) {
        console.error(`Blok kazılamadı (${blockType}):`, err.message);
      }
    }
  }
}

function stopBranchMining(bot) {
  branchMining = false;
  if (branchInterval) {
    clearInterval(branchInterval);
    branchInterval = null;
  }
  bot.chat('⛔ Branch mining durduruldu.');
  currentBranch = 0;
}

function isBranchMining() {
  return branchMining;
}

function getProgress() {
  if (!branchMining) return null;
  return {
    currentBranch: currentBranch,
    totalBranches: totalBranches,
    progress: Math.round((currentBranch / totalBranches) * 100)
  };
}

module.exports = { 
  execute, 
  stopBranchMining, 
  isBranchMining, 
  getProgress 
};
