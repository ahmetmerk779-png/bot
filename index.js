// ... mevcut kodlar

// branchMine durumunu kontrol etmek için loop'a ekle
const { isBranchMining, getProgress } = require('./skills/branchMine');

async function loop() {
  while (true) {
    try {
      // Eğer keşif modu aktifse, explore skill'i zaten çalışıyor
      if (isExploring()) {
        await sleep(1000);
        continue;
      }

      // Eğer branch mining aktifse, progress'i gönder
      if (isBranchMining()) {
        const progress = getProgress();
        if (progress) {
          io.emit('branchMineProgress', progress);
        }
        await sleep(1000);
        continue;
      }

      // Normal döngü: gözlem yap, AI'ya sor, komut uygula
      // ... (mevcut loop kodu)
      
    } catch (err) {
      console.error('Döngü hatası:', err);
      await sleep(5000);
    }
  }
}
