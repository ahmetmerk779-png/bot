let following = false;
let followTarget = null;

async function execute(bot, params) {
  const playerName = params[0];
  
  if (params[0] === 'durdur' || params[0] === 'stop') {
    following = false;
    bot.chat('Takip durduruldu.');
    return 'Takip durduruldu.';
  }

  if (!playerName) return 'Takip edilecek oyuncu adı belirtilmedi.';
  
  const target = bot.players[playerName]?.entity;
  if (!target) return `${playerName} bulunamadı.`;

  following = true;
  followTarget = playerName;
  bot.chat(`👤 ${playerName} takip ediliyor...`);
  
  followLoop(bot);
  return `${playerName} takip başlatıldı.`;
}

async function followLoop(bot) {
  while (following && followTarget) {
    try {
      const target = bot.players[followTarget]?.entity;
      if (!target) {
        bot.chat(`⚠️ ${followTarget} kayboldu, takip durduruldu.`);
        following = false;
        break;
      }
      const distance = bot.entity.position.distanceTo(target.position);
      if (distance > 5) {
        await bot.pathfinder.goto(target.position);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error('Takip hatası:', err.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

module.exports = { execute };
