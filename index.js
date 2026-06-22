const express = require('express');
const { Groq } = require('groq-sdk');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();

app.use(express.json());
app.use(express.static('public'));
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Dosyaları listele
app.get('/api/dosyalar', (req, res) => res.json(fs.readdirSync('.').filter(f => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.txt'))));

// Dosya oku
app.get('/api/oku', (req, res) => res.send(fs.readFileSync(req.query.file, 'utf8')));

// Kaydet
app.post('/api/save', (req, res) => { fs.writeFileSync(req.body.file, req.body.content); res.send({status: 'ok'}); });

// AI Komut İşleyici
app.post('/api/komut', async (req, res) => {
    const { gorev } = req.body;
    try {
        const chat = await groq.chat.completions.create({
            messages: [{ role: "system", content: "Sen bir otonom yazılım stüdyosu asistanısın. Terminal komutu çalıştırmak istersen 'exec: komut' formatını kullan." }, { role: "user", content: gorev }],
            model: "llama-3.3-70b-versatile",
        });
        const cevap = chat.choices[0].message.content;
        if (cevap.includes('exec:')) {
            exec(cevap.split('exec:')[1].trim(), (err, stdout) => res.json({ sonuc: stdout || "Tamamlandı." }));
        } else {
            res.json({ sonuc: cevap });
        }
    } catch (e) { res.json({ sonuc: "Hata: " + e.message }); }
});

app.listen(process.env.PORT || 3000);
