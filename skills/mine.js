async function execute(bot, params) {
  const blockType = params[0];
  const block = bot.findBlock({
    matching: block => block.name === blockType,
    maxDistance: 10
  });
  if (!block) return `${blockType} bulunamadı.`;
  try {
    await bot.dig(block);
    return `${blockType} kazıldı.`;
  } catch (err) {
    return `Kazılamadı: ${err.message}`;
  }
}

module.exports = { execute };
