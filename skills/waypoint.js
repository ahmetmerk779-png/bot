const { addWaypoint, getWaypoint, getWaypoints, deleteWaypoint } = require('../memory/memoryManager');
const { sleep } = require('../utils/helpers');

async function execute(bot, params) {
  const action = params[0]?.toLowerCase();
  const name = params[1];
  const coords = params.slice(2).map(Number);

  // 1. Waypoint Ekleme (add veya kaydet)
  if (action === 'add' || action === 'kaydet' || action === 'ekle') {
    if (!name) return 'Waypoint adı belirtilmedi. Örnek: waypoint add ev 100 64 200';
    if (coords.length < 3 || coords.some(isNaN)) {
      return 'Geçerli koordinatlar girin. Örnek: waypoint add ev 100 64 200';
    }
    // Eğer koordinat verilmemişse mevcut konumu al
    let finalCoords = coords;
    if (coords.length === 0 || coords.every(c => c === 0)) {
      finalCoords = [
        Math.round(bot.entity.position.x),
        Math.round(bot.entity.position.y),
        Math.round(bot.entity.position.z)
      ];
    }
    const result = addWaypoint(name, finalCoords);
    bot.chat(`📍 ${name} waypoint'i eklendi. Koordinat: ${finalCoords.join(', ')}`);
    return `${name} waypoint'i kaydedildi.`;
  }

  // 2. Waypoint Gitme (go veya git)
  if (action === 'go' || action === 'git') {
    if (!name) return 'Waypoint adı belirtilmedi. Örnek: waypoint git ev';
    const waypoint = getWaypoint(name);
    if (!waypoint) return `${name} isimli waypoint bulunamadı.`;
    const [x, y, z] = waypoint.coords;
    bot.chat(`🚀 ${name} waypoint'ine gidiliyor: ${x}, ${y}, ${z}`);
    try {
      await bot.pathfinder.goto({ x, y, z });
      return `${name} waypoint'ine varıldı.`;
    } catch (err) {
      return `Yol bulunamadı: ${err.message}`;
    }
  }

  // 3. Waypoint Listeleme (list)
  if (action === 'list' || action === 'liste') {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) return 'Kayıtlı waypoint yok.';
    const list = waypoints.map(w => `${w.name} (${w.coords.join(', ')})`).join('\n');
    bot.chat(`📋 Kayıtlı waypoint'ler:\n${list}`);
    return list;
  }

  // 4. Waypoint Silme (delete veya sil)
  if (action === 'delete' || action === 'sil') {
    if (!name) return 'Waypoint adı belirtilmedi. Örnek: waypoint sil ev';
    const waypoint = getWaypoint(name);
    if (!waypoint) return `${name} isimli waypoint bulunamadı.`;
    deleteWaypoint(name);
    bot.chat(`🗑️ ${name} waypoint'i silindi.`);
    return `${name} waypoint'i silindi.`;
  }

  // 5. Waypoint Temizleme (clear)
  if (action === 'clear' || action === 'temizle') {
    const waypoints = getWaypoints();
    if (waypoints.length === 0) return 'Silinecek waypoint yok.';
    clearWaypoints();
    bot.chat('🧹 Tüm waypoint'ler temizlendi.');
    return 'Tüm waypoint'ler temizlendi.';
  }

  // 6. Mevcut konumu waypoint olarak kaydet (kısayol: waypoint ev)
  if (!action || action === 'burayı' || action === 'burası') {
    // Eğer sadece isim verilmişse mevcut konumu al
    const waypointName = action || name || 'hedef';
    const coords = [
      Math.round(bot.entity.position.x),
      Math.round(bot.entity.position.y),
      Math.round(bot.entity.position.z)
    ];
    addWaypoint(waypointName, coords);
    bot.chat(`📍 ${waypointName} waypoint'i mevcut konumdan eklendi. Koordinat: ${coords.join(', ')}`);
    return `${waypointName} waypoint'i kaydedildi (mevcut konum).`;
  }

  return `Geçersiz komut. Kullanım: waypoint [add|go|list|delete|clear] <isim> <x y z>`;
}

module.exports = { execute };
