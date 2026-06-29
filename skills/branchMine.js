const { sleep } = require('../utils/helpers');

let branchMining = false;
let currentBranch = 0;
let totalBranches = 0;
let branchLength = 0;
let startCoords = null;
let currentDirection = 0;
let branchInterval = null;

async function execute(bot, params) {
  if (params[0] === 'durdur' || params[0] === 'stop') {
    stopBranchMining(bot);
    return 'Branch mining durduruldu.';
  }

  if (branchMining) return 'Zaten branch mining aktif.';

  const length = parseInt(params[0]) || 50;
  const branches = parseInt(params[1]) || 5;
  const direction = params[2] || 'kuzey';

  const directionMap = { 'kuzey': 0, 'doğu': 1, 'güney': 2, 'batı': 3 };
  currentDirection = directionMap[direction.toLowerCase()] || 0;

  startCoords = {
    x: Math.round(bot.entity.position.x),
    y: Math.round(bot.entity.position.y),
    z: Math.round(bot.entity.position.z)
  };

  branchLength = length;
  totalBranches = branches;
  currentBranch = 0;
  branchMining = true;

  if (bot._client?.state === 'connected') {
    bot.chat(`⛏️ Branch mining başlatılıyor: ${totalBranches} dal, ${branchLength} blok, yön: ${direction}`);
  }
  branchLoop(bot);
  return `Branch mining başlatıldı.`;
}

async function branchLoop(bot) {
  while (branchMining && currentBranch < totalBranches) {
    try {
      const branchStartX = startCoords.x + (currentBranch * 3);
      const branchStartZ = startCoords.z;

      await bot.pathfinder.goto({ x: branchStartX, y: startCoords.y, z: branchStartZ });
      if (bot._client?.state === 'connected') bot.chat(`📏 ${currentBranch + 1}. dal başlıyor...`);

      for (let i = 0; i < branchLength && branchMining; i++) {
        let targetX = branchStartX, targetZ = branchStartZ;
        switch (currentDirection) {
          case 0: targetZ = branchStartZ - i; break;
          case 1: targetX = branchStartX + i; break;
          case 2: targetZ = branchStartZ + i; break;
          case 3: targetX = branchStartX - i; break;
        }

        await bot.pathfinder.goto({ x: targetX, y: startCoords.y, z: targetZ });
        await mineValuableBlocks(bot);

        bot.setControlState('jump', true);
        await sleep(100);
        bot.setControlState('jump', false);
        await sleep(200);
      }

      if (bot._client?.state === 'connected') bot.chat(`✅ ${currentBranch + 1}. dal tamamlandı!`);
      currentBranch++;
      await sleep(2000);

    } catch (err) {
      console.error('Branch mining hatası:', err.message);
      bot.setControlState('jump', true);
      await sleep(500);
      bot.setControlState('jump', false);
      await sleep(1000);
    }
  }

  if (branchMining && currentBranch >= totalBranches) {
    if (bot._client?.state === 'connected') bot.chat('🎉 Tüm branch mining tamamlandı!');
    stopBranchMining(bot);
  }
}

async function mineValuableBlocks(bot) {
  const blocks = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore', 'lapis_ore', 'redstone_ore'];
  for (const blockType of blocks) {
    const block = bot.findBlock({ matching: b => b.name === blockType, maxDistance: 3 });
    if (block) {
      try {
        if (bot._client?.state === 'connected') bot.chat(`💎 ${blockType} bulundu!`);
        await bot.dig(block);
        await sleep(500);
      } catch (err) {
        console.error(`Blok kazılamadı:`, err.message);
      }
    }
  }
}

// ============ GÜVENLİ DURDURMA ============
function stopBranchMining(bot) {
  branchMining = false;
  if (branchInterval) {
    clearInterval(branchInterval);
    branchInterval = null;
  }
  if (bot && bot._client && bot._client.state === 'connected') {
    bot.chat('⛔ Branch mining durduruldu.');
  }
  currentBranch = 0;
}

function isBranchMining() { return branchMining; }
function getProgress() {
  if (!branchMining) return null;
  return { currentBranch, totalBranches, progress: Math.round((currentBranch / totalBranches) * 100) };
}

module.exports = { execute, stopBranchMining, isBranchMining, getProgress };
