async function execute(bot, params) {
  const items = bot.inventory.items();
  const foodItems = items.filter(item => item.foodPoints > 0);
  if (foodItems.length === 0) return 'Yiyecek bulunamadı.';

  const bestFood = foodItems.sort((a, b) => b.foodPoints - a.foodPoints)[0];
  try {
    await bot.equip(bestFood, 'hand');
    await bot.consume();
    return `${bestFood.name} yendi.`;
  } catch (err) {
    return `Yemek yenemedi: ${err.message}`;
  }
}

module.exports = { execute };
