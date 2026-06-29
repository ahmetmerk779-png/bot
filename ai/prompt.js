const config = require('../config');
const { getDiscoveries } = require('../memory/memoryManager');

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

KURALLAR:
- Kullanıcı doğal dilde komut verecek, sen JSON formatında cevap ver.
- JSON formatı: { "action": "komutAdi", "params": ["param1", "param2"] }
- Keşif modunda bot kendi kendine hareket eder, kullanıcı başka komut verene kadar devam eder.
- Her seferinde sadece bir JSON cevap ver.
`;
}

function buildUserPrompt(observation, memory) {
  const sonOlaylar = memory.events.slice(-5).map(e => e.text).join('\n');
  const discoveries = getDiscoveries();
  const keşifler = discoveries.length > 0 ? discoveries.map(d => `${d.name} (${d.coords.join(', ')})`).join('\n') : 'Henüz keşif yok.';
  
  return `
GÖZLEM:
${observation}

SON OLAYLAR (HATIRLADIKLARIN):
${sonOlaylar}

KEŞFEDİLEN YERLER:
${keşifler}

Hedefin: Çevreyi keşfet, kaynak topla, canlılarla savaş, eşya üret ve planlı hareket et.
Ne yapmak istersin? JSON cevap ver.
`;
}

module.exports = { buildSystemPrompt, buildUserPrompt };
