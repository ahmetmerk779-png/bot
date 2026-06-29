const { sleep } = require('../utils/helpers');

async function execute(bot, params) {
  const action = params[0]?.toLowerCase();
  const target = params[1];

  // 1. Koordinatları söyle (kendi koordinatlarını)
  if (action === 'söyle' || action === 'soyle' || action === 'göster' || action === 'goster') {
    const coords = bot.entity.position;
    const message = `📍 Koordinatlarım: X: ${coords.x.toFixed(1)}, Y: ${coords.y.toFixed(1)}, Z: ${coords.z.toFixed(1)}`;
    bot.chat(message);
    return message;
  }

  // 2. Belirli bir oyuncuya koordinatları özel mesaj olarak gönder
  if (action === 'mesaj' || action === 'msg' || action === 'whisper') {
    if (!target) return 'Hedef oyuncu adı belirtilmedi. Örnek: coords mesaj Oyuncu123';
    const player = bot.players[target];
    if (!player) return `${target} isimli oyuncu bulunamadı.`;
    
    const coords = bot.entity.position;
    const message = `Koordinatlarım: X: ${coords.x.toFixed(1)}, Y: ${coords.y.toFixed(1)}, Z: ${coords.z.toFixed(1)}`;
    bot.whisper(target, message);
    return `${target} adlı oyuncuya koordinatlar gönderildi.`;
  }

  // 3. TPA at (belirtilen oyuncuya ışınlanma isteği gönder)
  if (action === 'tpa' || action === 'tpaat' || action === 'tpa at') {
    if (!target) return 'Hedef oyuncu adı belirtilmedi. Örnek: coords tpa Oyuncu123';
    const player = bot.players[target];
    if (!player) return `${target} isimli oyuncu bulunamadı.`;
    
    bot.chat(`/tpa ${target}`);
    return `${target} adlı oyuncuya TPA isteği gönderildi.`;
  }

  // 4. TPA kabul et (gelen TPA isteğini kabul et)
  if (action === 'tpaccept' || action === 'kabul' || action === 'tpaccept') {
    bot.chat('/tpaccept');
    return 'TPA isteği kabul edildi.';
  }

  // 5. TPA reddet (gelen TPA isteğini reddet)
  if (action === 'tpdeny' || action === 'reddet' || action === 'tpdeny') {
    bot.chat('/tpdeny');
    return 'TPA isteği reddedildi.';
  }

  // 6. Tüm çevrimiçi oyuncuları listele ve hangisinin yakın olduğunu söyle
  if (action === 'oyuncular' || action === 'players') {
    const players = Object.keys(bot.players).filter(name => name !== bot.username);
    if (players.length === 0) return 'Çevrimiçi başka oyuncu yok.';
    
    const playerList = players.map(name => {
      const player = bot.players[name];
      const entity = player?.entity;
      if (entity) {
        const dist = bot.entity.position.distanceTo(entity.position);
        return `${name} (${dist.toFixed(1)} blok uzaklıkta)`;
      }
      return name;
    });
    const message = `📋 Çevrimiçi oyuncular: ${playerList.join(', ')}`;
    bot.chat(message);
    return message;
  }

  // 7. En yakın oyuncuyu bul ve koordinatlarını söyle
  if (action === 'en yakın' || action === 'enyakin' || action === 'nearest') {
    let nearest = null;
    let nearestDist = Infinity;
    for (const name of Object.keys(bot.players)) {
      if (name === bot.username) continue;
      const player = bot.players[name];
      if (player?.entity) {
        const dist = bot.entity.position.distanceTo(player.entity.position);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { name, pos: player.entity.position };
        }
      }
    }
    if (!nearest) return 'Yakında hiç oyuncu yok.';
    const message = `👤 En yakın oyuncu: ${nearest.name} (${nearestDist.toFixed(1)} blok) - Koordinat: X: ${nearest.pos.x.toFixed(1)}, Y: ${nearest.pos.y.toFixed(1)}, Z: ${nearest.pos.z.toFixed(1)}`;
    bot.chat(message);
    return message;
  }

  // 8. Bir oyuncuya "gel" deyince bot ona doğru gitmeye çalışsın (follow + tpa kombinasyonu)
  if (action === 'gel' || action === 'git' || action === 'follow') {
    if (!target) return 'Hedef oyuncu adı belirtilmedi. Örnek: coords gel Oyuncu123';
    const player = bot.players[target];
    if (!player) return `${target} isimli oyuncu bulunamadı.`;
    if (!player.entity) return `${target} oyuncusu görüş alanında değil, TPA deneyebilirsin.`;
    
    // Önce tpa at, sonra takip et (isteğe bağlı)
    bot.chat(`/tpa ${target}`);
    await sleep(2000);
    // Takip etmeye çalış
    const { follow } = require('./follow');
    await follow.execute(bot, [target]);
    return `${target} oyuncusuna doğru gidiliyor...`;
  }

  // 9. Yardım mesajı
  if (action === 'yardım' || action === 'help') {
    return `📖 Koordinat Komutları:
- coords söyle / göster : Kendi koordinatlarını söyle.
- coords mesaj <oyuncu> : Bir oyuncuya özel mesajla koordinatları gönder.
- coords tpa <oyuncu> : Oyuncuya TPA isteği gönder.
- coords tpaccept : Gelen TPA isteğini kabul et.
- coords tpdeny : Gelen TPA isteğini reddet.
- coords oyuncular : Çevrimiçi oyuncuları listele.
- coords en yakın : En yakın oyuncuyu bul.
- coords gel <oyuncu> : Oyuncuya TPA at ve takip et.
- coords yardım : Bu mesajı göster.`;
  }

  // Varsayılan: Eğer hiçbir parametre yoksa kendi koordinatlarını söyle
  if (!action) {
    return await execute(bot, ['söyle']);
  }

  return `Geçersiz komut. Kullanım: coords [söyle|mesaj|tpa|tpaccept|tpdeny|oyuncular|en yakın|gel|yardım] <opsiyonel hedef>`;
}

module.exports = { execute };
