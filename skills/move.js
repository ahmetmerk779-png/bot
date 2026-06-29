async function execute(bot, params) {
  const [x, y, z] = params.map(Number);
  if (isNaN(x) || isNaN(y) || isNaN(z)) {
    return 'Hatalı koordinatlar.';
  }
  try {
    await bot.pathfinder.goto({ x, y, z });
    return `Koordinata gidildi: ${x}, ${y}, ${z}`;
  } catch (err) {
    return `Hareket edemedi: ${err.message}`;
  }
}

module.exports = { execute };
