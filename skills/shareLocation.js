const { getWaypoint } = require('../memory/memoryManager');
const { sleep } = require('../utils/helpers');

async function execute(bot, params) {
  const action = params[0]?.toLowerCase();
  const targetPlayer = params[1];

  // 1. Kendi konumunu söyle (share veya konum)
  if (action === 'share' || action === 'konum' || action === 'söyle') {
    const coords = [
      Math.round(bot.entity.position.x),
      Math.round(bot.entity.position.y),
      Math.round(bot.entity.position.z)
    ];
    const message = `📍 Benim konumum: X:${coords[0]}, Y:${coords[1]}, Z:${coords[2]}`;
    
    // Eğer hedef oyuncu belirtilmişse özel mesaj gönder
    if (targetPlayer) {
      bot.whisper(targetPlayer, message);
      return `${targetPlayer}'a konum bilgisi gönderildi: ${coords.join(', ')}`;
    } else {
      bot.chat(message);
      return `Konum paylaşıldı: ${coords.join(', ')}`;
    }
  }

  // 2. TPA at (tpa)
  if (action === 'tpa' || action === 'tpaat') {
    if (!targetPlayer) return 'Lütfen tpa atılacak oyuncunun adını belirtin. Örnek: tpa OyuncuAdı';
    bot.chat(`/tpa ${targetPlayer}`);
    bot.whisper(targetPlayer, `🔮 Sana tpa atıyorum. Kabul eder misin?`);
    return `${targetPlayer}'a tpa atıldı.`;
  }

  // 3. TPA kabul (tpaccept)
  if (action === 'tpaccept' || action === 'kabul') {
    bot.chat(`/tpaccept`);
    return 'TPA kabul edildi.';
  }

  // 4. TPA reddet (tpadeny)
  if (action === 'tpadeny' || action === 'reddet') {
    bot.chat(`/tpadeny`);
    return 'TPA reddedildi.';
  }

  // 5. Bana gel (call veya çağır) - Bot kendi koordinatlarını söyler ve tpa atar
  if (action === 'call' || action === 'çağır' || action === 'gel') {
    if (!targetPlayer) return 'Lütfen çağrılacak oyuncunun adını belirtin. Örnek: çağır OyuncuAdı';
    const coords = [
      Math.round(bot.entity.position.x),
      Math.round(bot.entity.position.y),
      Math.round(bot.entity.position.z)
    ];
    bot.whisper(targetPlayer, `📍 Bana gelmek ister misin? Konumum: X:${coords[0]} Y:${coords[1]} Z:${coords[2]}. /tpa ${bot.username} yazabilirsin.`);
    bot.chat(`/tpa ${targetPlayer}`); // Bot, oyuncuya tpa atar
    return `${targetPlayer} çağrıldı ve tpa atıldı. Konum: ${coords.join(', ')}`;
  }

  // 6. Neredesin? (where veya nerede) - Kendi konumunu söyler
  if (action === 'where' || action === 'nerede' || action === 'konumum') {
    const coords = [
      Math.round(bot.entity.position.x),
      Math.round(bot.entity.position.y),
      Math.round(bot.entity.position.z)
    ];
    const message = `📍 Şu an konumum: X:${coords[0]}, Y:${coords[1]}, Z:${coords[2]}`;
    if (targetPlayer) {
      bot.whisper(targetPlayer, message);
      return `${targetPlayer}'a konumum söylendi: ${coords.join(', ')}`;
    } else {
      bot.chat(message);
      return `Konumum: ${coords.join(', ')}`;
    }
  }

  // 7. Waypoint'e göre konum paylaş (waypointShare)
  if (action === 'waypoint' || action === 'wp') {
    const wpName = targetPlayer;
    if (!wpName) return 'Waypoint adı belirtilmedi. Örnek: waypoint ev';
    const waypoint = getWaypoint(wpName);
    if (!waypoint) return `${wpName} isimli waypoint bulunamadı.`;
    const [x, y, z] = waypoint.coords;
    const message = `📍 ${wpName} waypoint konumu: X:${x}, Y:${y}, Z:${z}`;
    bot.chat(message);
    return `${wpName} waypoint konumu paylaşıldı: ${x}, ${y}, ${z}`;
  }

  // Geçersiz komut
  return `Geçersiz komut. Kullanım: 
  - konum [oyuncu] : Konumunu söyle
  - nerede [oyuncu] : Konumunu söyle (alternatif)
  - tpa <oyuncu> : Oyuncuya tpa at
  - tpaccept : TPA kabul et
  - tpadeny : TPA reddet
  - çağır <oyuncu> : Oyuncuyu çağır (tpa at + konum söyle)
  - waypoint <isim> : Waypoint konumunu paylaş`;
}

module.exports = { execute };
