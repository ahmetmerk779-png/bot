// skills/follow.js - Oyuncu takip etme
let following = false;
let followTarget = null;
let followInterval = null;

async function execute(bot, params) {
  const playerName = params[0];
  
  if (!playerName || playerName === 'durdur' || playerName === 'stop') {
    if (following) {
      following = false;
      followTarget = null;
      if (followInterval) {
        clearInterval(followInterval);
        followInterval = null;
      }
      bot.chat('Takip durduruldu.');
      return 'Takip durduruldu.';
    }
    return 'Zaten takip yok.';
  }

  const target = bot.players[playerName]?.entity;
  if (!target) {
    bot.chat(`${playerName} bulunamadı.`);
    return `${playerName} bulunamadı.`;
  }

  following = true;
  followTarget = playerName;
  bot.chat(`👤 ${playerName} takip ediliyor...`);

  if (followInterval) {
    clearInterval(followInterval);
  }

  followInterval = setInterval(async () => {
    if (!following || !bot || !bot.entity) {
      clearInterval(followInterval);
      followInterval = null;
      return;
    }
    try {
      const targetEntity = bot.players[followTarget]?.entity;
      if (!targetEntity) {
        bot.chat(`${followTarget} kayboldu, takip durduruldu.`);
        following = false;
        followTarget = null;
        clearInterval(followInterval);
        followInterval = null;
        return;
      }
      const distance = bot.entity.position.distanceTo(targetEntity.position);
      if (distance > 3) {
        await bot.pathfinder.goto(targetEntity.position);
      }
    } catch (err) {
      console.error('Takip hatası:', err.message);
    }
  }, 1000);

  return `${playerName} takip ediliyor.`;
}

module.exports = { execute };
