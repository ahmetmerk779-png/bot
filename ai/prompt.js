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
- branchMine <uzunluk> <dalSayısı> <yön> : Branch mining başlat (örn: branchMine 50 5 kuzey).
- branchMine durdur : Branch mining'i durdur.

KURALLAR:
- Kullanıcı doğal dilde komut verecek, sen JSON formatında cevap ver.
- JSON formatı: { "action": "komutAdi", "params": ["param1", "param2"] }
- Kullanıcı "elmas ara", "branch mining yap", "tünel kaz" gibi doğal dilde konuşursa, bunu branchMine komutuna çevir.
- Örnek: "elmas ara" → { "action": "branchMine", "params": ["50", "5", "kuzey"] }
- Örnek: "tünel kaz 30 3 güney" → { "action": "branchMine", "params": ["30", "3", "güney"] }
- Örnek: "kazmayı durdur" → { "action": "branchMine", "params": ["durdur"] }
- Her seferinde sadece bir JSON cevap ver.
`;
}

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

Hedefin: Çevreyi keşfet, kaynak topla (özellikle elmas), canlılarla savaş, eşya üret, waypoint yönet ve planlı hareket et.
Ne yapmak istersin? JSON cevap ver.
`;
}

module.exports = { buildSystemPrompt, buildUserPrompt };
