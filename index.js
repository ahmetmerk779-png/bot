const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

// God Mode Zeka Modülü
const GodMode = {
    talk: (msg) => {
        msg = msg.toLowerCase();
        if (msg.includes("merhaba")) return "Selam! God Mode aktif, emrindeyim.";
        if (msg.includes("hata")) return "Logları tarıyorum... Sistemin otonom analiz süreci başlatıldı.";
        return "Komutun işlendi: " + msg + ". Başka ne yapmamı istersin?";
    }
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    const reply = GodMode.talk(message);
    console.log(`[SİSTEM]: ${message} -> ${reply}`);
    res.json({ reply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`God Mode ${PORT} portunda aktif.`));
