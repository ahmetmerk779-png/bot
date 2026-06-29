const { addWaypoint, getWaypoint, getWaypoints, deleteWaypoint, clearWaypoints } = require('../memory/memoryManager');

async function execute(bot, params) {
  const action = params[0]?.toLowerCase();
  const name = params[1];
  const coords = params.slice(2).map(Number);

  if (action === 'add' || action === 'kaydet' || action === 'ekle') {
    if (!name) return 'Waypoint adı belirtilmedi.';
    let finalCoords = coords;
    if (coords.length < 3 || coords.some(isNaN)) {
      finalCoords = [Math.round(bot.entity.position.x), Math.round(bot.entity.position.y), Math.round(bot.entity.position.z)];
    }
    addWaypoint(name, finalCoords);
    bot.chat(`📍 ${name} waypoint'i eklendi.`);
    return `${name} waypoint'i kaydedildi.`;
  }

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

  if (action === 'list' || action === 'liste') {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) return 'Kayıtlı waypoint yok.';
    const list = waypoints.map(w => `${w.name} (${w.coords.join(', ')})`).join('\n');
    bot.chat(`📋 ${list}`);
    return list;
  }

  if (action === 'delete' || action === 'sil') {
    if (!name) return 'Waypoint adı belirtilmedi.';
    const waypoint = getWaypoint(name);
    if (!waypoint) return `${name} waypoint'i bulunamadı.`;
    deleteWaypoint(name);
    bot.chat(`🗑️ ${name} waypoint'i silindi.`);
    return `${name} waypoint'i silindi.`;
  }

  if (action === 'clear' || action === 'temizle') {
    clearWaypoints();
    bot.chat('🧹 Tüm waypoint\'ler temizlendi.');
    return 'Tüm waypoint\'ler temizlendi.';
  }

  // Kısayol: waypoint isim
  const waypointName = action || name || 'hedef';
  const coords = [Math.round(bot.entity.position.x), Math.round(bot.entity.position.y), Math.round(bot.entity.position.z)];
  addWaypoint(waypointName, coords);
  bot.chat(`📍 ${waypointName} waypoint'i kaydedildi.`);
  return `${waypointName} waypoint'i kaydedildi.`;
}

module.exports = { execute };
