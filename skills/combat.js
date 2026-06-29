async function execute(bot, params) {
  const targetName = params[0];
  const entity = bot.nearestEntity(e => 
    e.name === targetName || e.type === 'mob' && e.name.includes(targetName)
  );
  if (!entity) return `${targetName} bulunamadı.`;
  try {
    await bot.pvp.attack(entity);
    return `${entity.name} saldırıldı.`;
  } catch (err) {
    return `Savaş hatası: ${err.message}`;
  }
}

module.exports = { execute };
