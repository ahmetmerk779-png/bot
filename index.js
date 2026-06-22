const express = require('express');
const { Groq } = require('groq-sdk');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static('public'));

app.post('/api/komut', async (req, res) => {
    const { gorev } = req.body;
    const dosyalar = fs.readdirSync('.').join(', ');

    try {
        const chat = await groq.chat.completions.create({
            messages: [{ 
                role: "system", 
                content: `Sen üst düzey bir AI Yazılım Mühendisi ve Araştırmacısın. 
                Projedeki mevcut dosyalar: ${dosyalar}. 
                Görevin kullanıcıyla teknik tartışmalar yapmak, fikir üretmek ve kod yazmak.
                Eğer bir sorunu çözmek için terminale ihtiyacın olursa, sadece 'exec: komut' formatını kullan. 
                Bunun dışında normal bir uzman gibi, derinlemesine ve detaylı cevaplar ver.` 
            },
            { role: "user", content: gorev }],
            model: "llama-3.3-70b-versatile",
        });

        const cevap = chat.choices[0].message.content;

        if (cevap.includes('exec:')) {
            const komut = cevap.split('exec:')[1].split('\n')[0].trim();
            exec(komut, (err, stdout) => {
                res.json({ sonuc: cevap + "\n\n--- [Sistem Aksiyonu]: " + (stdout || "İşlem yapıldı.") });
            });
        } else {
            res.json({ sonuc: cevap });
        }
    } catch (error) {
        res.json({ sonuc: "Bir hata oluştu ama ben buradayım: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ajan ${PORT} portunda çalışıyor.`));
