const { addWaypoint, getWaypoint, getWaypoints, deleteWaypoint, clearWaypoints } = require('../memory/memoryManager');

async function execute(bot, params) {
  const action = params[0]?.toLowerCase();
  const name = params[1];
  const coordsParam = params.slice(2).map(Number);

  // Hiç parametre yoksa mevcut konumu "hedef" olarak kaydet
  if (!action) {
    const coords = [
      Math.round(bot.entity.position.x),
      Math.round(bot.entity.position.y),
      Math.round(bot.entity.position.z)
    ];
    addWaypoint('hedef', coords);
    bot.chat(`📍 hedef waypoint'i kaydedildi. Koordinat: ${coords.join(', ')}`);
    return 'hedef waypoint\'i kaydedildi.';
  }

  // Waypoint ekleme
  if (action === 'add' || action === 'kaydet' || action === 'ekle') {
    if (!name) return 'Waypoint adı belirtilmedi.';
    let finalCoords = coordsParam;
    if (coordsParam.length < 3 || coordsParam.some(isNaN)) {
      finalCoords = [
        Math.round(bot.entity.position.x),
        Math.round(bot.entity.position.y),
        Math.round(bot.entity.position.z)
      ];
    }
    addWaypoint(name, finalCoords);
    bot.chat(`📍 ${name} waypoint'i eklendi. Koordinat: ${finalCoords.join(', ')}`);
    return `${name} waypoint'i kaydedildi.`;
  }

  // Waypoint'e git
  if (action === 'go' || action === 'git') {
    if (!name) return 'Waypoint adı belirtilmedi.';
    const waypoint = getWaypoint(name);
    if (!waypoint) return `${name} waypoint'i bulunamadı.`;
    const [x, y, z] = waypoint.coords;
    try {
      await bot.pathfinder.goto({ x, y, z });
      return `${name} waypoint'ine varıldı.`;
    } catch (err) {
      return `Yol bulunamadı: ${err.message}`;
    }
  }

  // Waypoint listele
  if (action === 'list' || action === 'liste') {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) return 'Kayıtlı waypoint yok.';
    const list = waypoints.map(w => `${w.name} (${w.coords.join(', ')})`).join('\n');
    bot.chat(`📋 ${list}`);
    return list;
  }

  // Waypoint sil
  if (action === 'delete' || action === 'sil') {
    if (!name) return 'Waypoint adı belirtilmedi.';
    const waypoint = getWaypoint(name);
    if (!waypoint) return `${name} waypoint'i bulunamadı.`;
    deleteWaypoint(name);
    bot.chat(`🗑️ ${name} waypoint'i silindi.`);
    return `${name} waypoint'i silindi.`;
  }

  // Tüm waypoint'leri temizle
  if (action === 'clear' || action === 'temizle') {
    clearWaypoints();
    bot.chat('🧹 Tüm waypoint\'ler temizlendi.');
    return 'Tüm waypoint\'ler temizlendi.';
  }

  // Kısayol: isim verilmişse mevcut konumu o isimle kaydet
  const coords = [
    Math.round(bot.entity.position.x),
    Math.round(bot.entity.position.y),
    Math.round(bot.entity.position.z)
  ];
  addWaypoint(action, coords);
  bot.chat(`📍 ${action} waypoint'i kaydedildi. Koordinat: ${coords.join(', ')}`);
  return `${action} waypoint'i kaydedildi.`;
}

module.exports = { execute };
