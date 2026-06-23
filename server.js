const express = require('express');
const app = express();
const fs = require('fs-extra');

app.use(express.static('public'));
app.use(express.json());

// Komut İşleyici
app.post('/api/execute', (req, res) => {
    const { command } = req.body;
    console.log(`[KOMUT]: ${command}`);
    // Buraya fileManager ve qLearning modülleri bağlanır
    res.json({ message: "İşlem başlatıldı" });
});

app.listen(3000, () => console.log('God Mode Çalışıyor: http://localhost:3000'));
