const { sleep } = require('../utils/helpers');

async function execute(bot, params) {
  const action = params[0]?.toLowerCase();
  const target = params[1];

  // 1. Koordinat Paylaşma (share veya paylaş)
  if (action === 'share' || action === 'paylaş' || action === 'konum') {
    if (!target) {
      // Hedef belirtilmemişse genel sohbete koordinatı söyle
      const pos = bot.entity.position;
      bot.chat(`📍 Koordinatlarım: X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}`);
      return `Koordinatlar paylaşıldı: ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`;
    } else {
      // Belirtilen oyuncuya özel mesajla koordinat gönder
      const player = bot.players[target];
      if (!player) return `${target} isimli oyuncu bulunamadı.`;
      const pos = bot.entity.position;
      bot.chat(`/msg ${target} Koordinatlarım: X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}`);
      return `${target}'a koordinatlar gönderildi.`;
    }
  }

  // 2. TPA Atma (tpa veya ışınlan)
  if (action === 'tpa' || action === 'tp' || action === 'ışınlan') {
    if (!target) return 'TPA atılacak oyuncu adı belirtilmedi. Örnek: tpa OyuncuAdı';
    const player = bot.players[target];
    if (!player) return `${target} isimli oyuncu bulunamadı.`;
    
    // /tpa komutunu gönder
    bot.chat(`/tpa ${target}`);
    bot.chat(`/msg ${target} TPA isteği gönderdim.`);
    return `${target}'a TPA isteği gönderildi.`;
  }

  // 3. TPA Kabul (tpaccept)
  if (action === 'accept' || action === 'kabul') {
    bot.chat('/tpaccept');
    return 'TPA isteği kabul edildi.';
  }

  // 4. TPA Reddet (tpdeny)
  if (action === 'deny' || action === 'reddet') {
    bot.chat('/tpdeny');
    return 'TPA isteği reddedildi.';
  }

  // 5. Koordinat Sorgula (where veya nerede)
  if (action === 'where' || action === 'nerede' || action === 'konumum') {
    const pos = bot.entity.position;
    const biome = bot.getBlockAt(pos)?.name || 'bilinmiyor';
    const dimension = bot.game?.dimension || 'overworld';
    const message = `📍 Konumum: X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)} | Biyom: ${biome} | Boyut: ${dimension}`;
    bot.chat(message);
    return message;
  }

  // 6. Yakındaki Oyunculara Konum Söyle (radius)
  if (action === 'nearby' || action === 'yakındakiler') {
    const radius = parseInt(target) || 50;
    const players = Object.values(bot.players).filter(p => {
      if (!p.entity) return false;
      const dist = bot.entity.position.distanceTo(p.entity.position);
      return dist <= radius && p.username !== bot.username;
    });
    if (players.length === 0) return `${radius} blok yakınında oyuncu yok.`;
    const list = players.map(p => `${p.username} (${Math.round(bot.entity.position.distanceTo(p.entity.position))} blok)`).join(', ');
    bot.chat(`📡 Yakındaki oyuncular (${radius} blok): ${list}`);
    return list;
  }

  // 7. Koordinatları Dosyaya Kaydet (log)
  if (action === 'log' || action === 'kaydet') {
    const pos = bot.entity.position;
    const note = params.slice(1).join(' ') || 'not';
    const logEntry = {
      timestamp: Date.now(),
      coords: [Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)],
      note: note,
      dimension: bot.game?.dimension || 'overworld'
    };
    // logs/coords.json dosyasına kaydet
    const fs = require('fs');
    let logs = [];
    try {
      const data = fs.readFileSync('./logs/coords.json', 'utf8');
      logs = JSON.parse(data);
    } catch {}
    logs.push(logEntry);
    fs.writeFileSync('./logs/coords.json', JSON.stringify(logs, null, 2));
    bot.chat(`📝 Koordinat kaydedildi: ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)} - Not: ${note}`);
    return `Koordinat kaydedildi: ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`;
  }

  // 8. Koordinat Listesini Göster (listlogs)
  if (action === 'listlogs' || action === 'kayıtlar') {
    const fs = require('fs');
    try {
      const data = fs.readFileSync('./logs/coords.json', 'utf8');
      const logs = JSON.parse(data);
      if (logs.length === 0) return 'Kayıtlı koordinat yok.';
      const list = logs.slice(-5).map(l => 
        `${new Date(l.timestamp).toLocaleString()}: ${l.coords.join(', ')} - ${l.note}`
      ).join('\n');
      bot.chat(`📋 Son 5 koordinat kaydı:\n${list}`);
      return list;
    } catch {
      return 'Kayıtlı koordinat yok.';
    }
  }

  // 9. GPS Navigasyon (gps veya yoltarifi)
  if (action === 'gps' || action === 'yol' || action === 'tarif') {
    if (!target) return 'Hedef koordinat veya isim belirtilmedi. Örnek: gps ev';
    // Önce waypoint'te ara
    const { getWaypoint } = require('../memory/memoryManager');
    const waypoint = getWaypoint(target);
    if (waypoint) {
      const [x, y, z] = waypoint.coords;
      const dist = Math.round(bot.entity.position.distanceTo({ x, y, z }));
      const direction = getDirection(bot.entity.position, { x, y, z });
      bot.chat(`🧭 ${target} waypoint'ine uzaklık: ${dist} blok, Yön: ${direction}`);
      return `${target} waypoint'i: ${x}, ${y}, ${z} | Uzaklık: ${dist} blok | Yön: ${direction}`;
    }
    // Koordinat olarak dene
    const coords = target.split(' ').map(Number);
    if (coords.length === 3 && coords.every(n => !isNaN(n))) {
      const dist = Math.round(bot.entity.position.distanceTo({ x: coords[0], y: coords[1], z: coords[2] }));
      const direction = getDirection(bot.entity.position, { x: coords[0], y: coords[1], z: coords[2] });
      bot.chat(`🧭 ${target} koordinatlarına uzaklık: ${dist} blok, Yön: ${direction}`);
      return `Koordinat: ${target} | Uzaklık: ${dist} blok | Yön: ${direction}`;
    }
    return `Hedef bulunamadı: ${target}`;
  }

  return `Geçersiz komut. Kullanım: share [oyuncu], tpa <oyuncu>, tpaccept, tpdeny, where, nearby [yarıçap], log [not], listlogs, gps <hedef>`;
}

// Yardımcı: Yön hesaplama
function getDirection(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const angle = Math.atan2(dz, dx) * (180 / Math.PI);
  if (angle >= -22.5 && angle < 22.5) return 'Doğu';
  if (angle >= 22.5 && angle < 67.5) return 'Kuzeydoğu';
  if (angle >= 67.5 && angle < 112.5) return 'Kuzey';
  if (angle >= 112.5 && angle < 157.5) return 'Kuzeybatı';
  if (angle >= 157.5 || angle < -157.5) return 'Batı';
  if (angle >= -157.5 && angle < -112.5) return 'Güneybatı';
  if (angle >= -112.5 && angle < -67.5) return 'Güney';
  if (angle >= -67.5 && angle < -22.5) return 'Güneydoğu';
  return 'Bilinmiyor';
}

module.exports = { execute };
