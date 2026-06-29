async function execute(bot) {
  const table = bot.findBlock({
    matching: block => block.name === 'crafting_table',
    maxDistance: 5
  });
  if (!table) return 'Üretim masası bulunamadı.';
  try {
    await bot.openCraftingTable(table);
    return 'Üretim masası açıldı. Şimdi craft komutunu kullanabilirsin.';
  } catch (err) {
    return `Üretim masası açılamadı: ${err.message}`;
  }
}

module.exports = { execute };
