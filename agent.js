function monitorSystem() {
    setInterval(async () => {
        const logs = await fetch('/api/logs').then(r => r.json());
        if (logs.includes("ERROR")) {
            console.log("Hata Tespit Edildi! Analiz ediliyor...");
            // Otomatik Fix Algoritması
            applyFix(logs);
        }
    }, 5000); // 5 saniyede bir tara
}
