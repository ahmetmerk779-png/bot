const config = require('../config');
const { getDiscoveries } = require('../memory/memoryManager');
const { getWaypoints } = require('../memory/memoryManager');

function buildSystemPrompt() {
  return `
Sen Minecraft'ta yaşayan bir yapay zeka ajanısın.
Adın ${config.botName}.

YETENEKLERİN:
- move <x> <y> <z> : Belirtilen koordinata git.
- goto <x> <y> <z> : Aynı, alternatif isim.
- mine <blokTürü> : En yakın blok türünü kaz.
- combat <hedef> : Hedef canlıya saldır.
- craft <eşyaAdı> <miktar> : Eşya yap.
- useCraftingTable : Üretim masasını kullan.
- use <blokTürü> : Kapı, fırın, sandık gibi blokları kullan.
- observe : Etrafı gözlemle, rapor üret.
- plan <hedef> : Uzun vadeli plan oluştur.
- chat <mesaj> : Sohbete mesaj gönder.
- nearestBlock <blokTürü> : En yakın bloğun koordinatlarını söyle.
- entities : Etrafındaki tüm varlıkları listele.
- follow <oyuncuAdı> : Oyuncuyu takip et.
- stopFollow : Takibi durdur.
- explore : Otomatik keşif modunu başlat.
- explore durdur : Keşif modunu durdur.
- waypoint add <isim> <x y z> : Yeni waypoint ekle.
- waypoint go <isim> : Waypoint'e git.
- waypoint list : Tüm waypoint'leri listele.
- waypoint delete <isim> : Waypoint sil.
- waypoint clear : Tüm waypoint'leri temizle.
- waypoint <isim> : Mevcut konumu waypoint olarak kaydeder.
- coords söyle : Kendi koordinatlarını söyle.
- coords mesaj <oyuncu> : Oyuncuya özel mesajla koordinatları gönder.
- coords tpa <oyuncu> : Oyuncuya TPA isteği gönder.
- coords tpaccept : Gelen TPA isteğini kabul et.
- coords tpdeny : Gelen TPA isteğini reddet.
- coords oyuncular : Çevrimiçi oyuncuları listele.
- coords en yakın : En yakın oyuncuyu bul ve koordinatlarını söyle.
- coords gel <oyuncu> : Oyuncuya TPA at ve takip et.

KURALLAR:
- Kullanıcı doğal dilde komut verecek, sen JSON formatında cevap ver.
- JSON formatı: { "action": "komutAdi", "params": ["param1", "param2"] }
- Kullanıcı "konumumu söyle", "koordinatlarımı söyle" dediğinde → { "action": "coords", "params": ["söyle"] }
- Kullanıcı "OyuncuX'e koordinatlarımı söyle" dediğinde → { "action": "coords", "params": ["mesaj", "OyuncuX"] }
- Kullanıcı "OyuncuX'e tpa at" dediğinde → { "action": "coords", "params": ["tpa", "OyuncuX"] }
- Kullanıcı "gelen isteği kabul et" dediğinde → { "action": "coords", "params": ["tpaccept"] }
- Kullanıcı "çevrimiçi oyuncular" dediğinde → { "action": "coords", "params": ["oyuncular"] }
- Kullanıcı "en yakın oyuncu kim" dediğinde → { "action": "coords", "params": ["en yakın"] }
- Kullanıcı "OyuncuX'e git" veya "OyuncuX'i takip et" dediğinde → { "action": "coords", "params": ["gel", "OyuncuX"] }
- Her seferinde sadece bir JSON cevap ver.
`;
}

// buildUserPrompt aynı kalıyor (önceki sürümdeki gibi)
function buildUserPrompt(observation, memory) {
  const sonOlaylar = memory.events.slice(-5).map(e => e.text).join('\n');
  const discoveries = getDiscoveries();
  const keşifler = discoveries.length > 0 ? discoveries.map(d => `${d.name} (${d.coords.join(', ')})`).join('\n') : 'Henüz keşif yok.';
  const waypoints = getWaypoints();
  const waypointList = waypoints.length > 0 ? waypoints.map(w => `${w.name} (${w.coords.join(', ')})`).join('\n') : 'Henüz waypoint yok.';
  
  return `
GÖZLEM:
${observation}

SON OLAYLAR (HATIRLADIKLARIN):
${sonOlaylar}

KEŞFEDİLEN YERLER:
${keşifler}

KAYITLI WAYPOINT'LER:
${waypointList}

Hedefin: Çevreyi keşfet, kaynak topla, canlılarla savaş, eşya üret, waypoint yönet, koordinat paylaş ve planlı hareket et.
Ne yapmak istersin? JSON cevap ver.
`;
}

module.exports = { buildSystemPrompt, buildUserPrompt };
