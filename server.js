const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json());

// Q-Learning Zeka Modeli
let qTable = { 'idle': { 'analyze': 0, 'fix': 0, 'deploy': 0 } };

// Dosya Sistemi ve Log Okuyucu
app.get('/api/logs', (req, res) => {
    const logs = fs.readFileSync('./logs/latest.log', 'utf8');
    res.json({ logs });
});

// Otomatik Hata Düzeltme & İşleme
app.post('/api/execute', (req, res) => {
    const { command } = req.body;
    // Burada AI logic devreye girer
    console.log(`[SHELL]: Çalıştırılıyor -> ${command}`);
    res.json({ status: "Başarılı", output: "Kod inject edildi." });
});

app.listen(3000, () => console.log('God Mode Fabrika Aktif: http://localhost:3000'));
