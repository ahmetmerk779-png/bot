const express = require('express');
const { Groq } = require('groq-sdk');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static('public')); // HTML dosyanı 'public' klasörüne koy

app.post('/api/komut', async (req, res) => {
    const { gorev } = req.body;
    try {
        const chat = await groq.chat.completions.create({
            messages: [{ role: "user", content: `Sen otonom bir yazılımcısın. Şu görevi yapmak için gereken terminal komutunu tek satırda döndür: ${gorev}` }],
            model: "llama3-70b-8192",
        });

        const komut = chat.choices[0].message.content.replace(/`/g, '');
        
        exec(komut, (err, stdout, stderr) => {
            if (err) return res.json({ sonuc: "Hata: " + err.message });
            res.json({ sonuc: "Komut Çalıştı: " + (stdout || "İşlem tamamlandı.") });
        });
    } catch (error) {
        res.json({ sonuc: "AI Hatası: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ajan ${PORT} portunda dinliyor.`));
