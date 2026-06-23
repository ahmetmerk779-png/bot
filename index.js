/**
 * God Mode Engine - Main Controller
 * Bu dosya, sistemin tüm parçalarını tek bir noktadan yönetir.
 */

const { monitorSystem } = require('./lib/agent');
const { runBuildPipeline } = require('./lib/autoBuild');
const { saveSnapshot } = require('./lib/fileManager');

async function initSystem() {
    console.log("🚀 God Mode Başlatılıyor...");

    // 1. Dosya sistemini izlemeye başla (Rollback için snapshot al)
    saveSnapshot('./src');
    console.log("✅ Dosya yedeği alındı.");

    // 2. Sistem monitörünü (Hata avcısı) aktif et
    monitorSystem();
    console.log("🔍 Hata avcısı aktif.");

    // 3. Proje derleme hattını kur
    runBuildPipeline('minecraft'); 
    console.log("🛠 Derleme hattı hazır.");
}

// Sistemi başlat
initSystem();

// Hata yönetimi (Sistem çökmesin diye)
process.on('uncaughtException', (err) => {
    console.error("❌ Kritik Hata: ", err.message);
    // Burada sistemi otomatik 'rollback' yapmaya zorlayabilirsin
});
