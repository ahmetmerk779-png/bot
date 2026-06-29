async function execute(bot, params) {
  const itemName = params[0];
  const count = parseInt(params[1]) || 1;
  try {
    await bot.craft(itemName, count);
    return `${count} adet ${itemName} yapıldı.`;
  } catch (err) {
    return `Üretim hatası: ${err.message}`;
  }
}

module.exports = { execute };
