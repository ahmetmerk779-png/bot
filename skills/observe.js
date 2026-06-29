const { addDiscovery } = require('../memory/memoryManager');

async function execute(bot, params) {
  // Mevcut gözlem kodları...
  const entities = bot.entities;
  const playerNames = Object.values(entities)
    .filter(e => e.type === 'player')
    .map(e => e.username);
  const mobs = Object.values(entities)
    .filter(e => e.type === 'mob')
    .map(e => `${e.name} (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)}, ${e.position.z.toFixed(1)})`);
  
  // Değerli bloklar
  const valuableBlocks = ['iron_ore', 'gold_ore', 'diamond_ore'];
  const foundBlocks = valuableBlocks.filter(type => 
    bot.findBlock({ matching: block => block.name === type, maxDistance: 15 })
  );

  // YENİ: Köy, mağara, su tespiti (gözlem sırasında da yap)
  // Köylü varlığı
  const villagers = Object.values(entities).filter(e => e.type === 'mob' && e.name === 'villager');
  if (villagers.length > 0) {
    const coords = [villagers[0].position.x, villagers[0].position.y, villagers[0].position.z];
    addDiscovery('village', coords, 'Köy');
  }

  // Su varlığı (basitçe, etrafta su blokları var mı?)
  const waterBlocks = Object.values(entities).filter(e => e.type === 'object' && e.name === 'water');
  if (waterBlocks.length > 0) {
    const coords = [waterBlocks[0].position.x, waterBlocks[0].position.y, waterBlocks[0].position.z];
    addDiscovery('water', coords, 'Su');
  }

  let report = `Gözlem Raporu:\n`;
  report += `Oyuncular: ${playerNames.join(', ') || 'Yok'}\n`;
  report += `Canavarlar: ${mobs.join(', ') || 'Yok'}\n`;
  report += `Yakındaki değerli bloklar: ${foundBlocks.join(', ') || 'Yok'}\n`;
  report += `Köylüler: ${villagers.length > 0 ? villagers.map(v => v.position).join(', ') : 'Yok'}\n`;
  report += `Su kaynakları: ${waterBlocks.length > 0 ? waterBlocks.map(w => w.position).join(', ') : 'Yok'}\n`;
  report += `Hedef koordinatı: (${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y.toFixed(1)}, ${bot.entity.position.z.toFixed(1)})\n`;
  report += `Açlık: ${bot.food}, Can: ${bot.health}`;
  return report;
}

module.exports = { execute };
