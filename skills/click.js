async function execute(bot, params) {
  const targetName = params[0];
  const clickType = params[1] || 'right';

  const entity = Object.values(bot.entities).find(e => e.username === targetName || e.name === targetName);
  if (!entity) return `${targetName} bulunamadı.`;

  await bot.lookAt(entity.position.offset(0, 1.6, 0));

  if (clickType === 'right') {
    await bot.activateEntity(entity);
    return `${targetName}'e sağ tıklandı.`;
  } else if (clickType === 'left') {
    await bot.attack(entity);
    return `${targetName}'e sol tıklandı.`;
  }
  return 'Geçersiz tıklama türü.';
}

module.exports = { execute };
