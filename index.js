require('dotenv').config();
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const Groq = require('groq-sdk');
const app = express();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.use(express.json());
app.use(express.static('public'));

// Dosya Yönetimi
app.post('/api/fs', (req, res) => {
    const { action, name, content } = req.body;
    if (action === 'list') return res.json(fs.readdirSync('.'));
    if (action === 'read') return res.send(fs.readFileSync(name, 'utf8'));
    if (action === 'write') { fs.writeFileSync(name, content); return res.json({status: 'ok'}); }
});

// Terminal (Kod Çalıştırma)
app.post('/api/run', (req, res) => {
    exec(req.body.cmd, (err, out) => res.json({ out: out || err?.message }));
});

// Yapay Zeka Motoru
app.post('/api/ai', async (req, res) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: "Sadece çalıştırılabilir saf kod ver, açıklama yapma: " + req.body.task }],
            model: "llama-3.3-70b-versatile",
        });
        const code = completion.choices[0].message.content.replace(/```javascript/g, '').replace(/```/g, '');
        res.json({ code });
    } catch (err) {
        res.status(500).json({ code: "// Hata oluştu: " + err.message });
    }
});

app.listen(3000, () => console.log('ASMP Cloud IDE Aktif!'));
