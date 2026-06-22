const express = require('express');
const { Groq } = require('groq-sdk');
const { exec } = require('child_process');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static('public'));

app.post('/api/komut', async (req, res) => {
    const { gorev } = req.body;
    try {
        // Ajanı daha akıllı ve sınırları belli bir moda alıyoruz
        const chat = await groq.chat.completions.create({
            messages: [{ 
                role: "system", 
                content: "Sen uzman bir Linux sistem yöneticisi ve yazılım geliştiricisisin. Sana verilen her görevi terminal komutlarıyla gerçekleştir. Sadece komutu döndür. Açıklama yapma. Asla `nmap`, `ping` gibi gereksiz araçlar çalıştırma. Dosya oluşturmak için 'echo', dosya yazmak için 'printf', paket kurmak için 'npm install' kullan." 
            },
            { role: "user", content: gorev }],
            model: "llama-3.3-70b-versatile",
        });

        const komut = chat.choices[0].message.content.replace(/`/g, '');
        
        exec(komut, (err, stdout, stderr) => {
            if (err) return res.json({ sonuc: "Hata: " + err.message });
            res.json({ sonuc: stdout || "Görev başarıyla tamamlandı: " + komut });
        });
    } catch (error) {
        res.json({ sonuc: "AI Hatası: " + error.message });
    }
});

app.listen(process.env.PORT || 3000);
