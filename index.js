const express = require('express');
const { Groq } = require('groq-sdk');
const { exec } = require('child_process');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('ssh2');
const multer = require('multer');

const app = express();
const db = new sqlite3.Database('./studio.db');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('public'));

// Tablolar ve Başlangıç
db.run("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, mesaj TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");

// Master AI API
app.post('/api/master', upload.single('file'), async (req, res) => {
    const { komut, model } = req.body;
    let context = "";
    
    // RAG: Dosya varsa oku
    if (req.file) context += "DOSYA İÇERİĞİ: " + fs.readFileSync(req.file.path, 'utf8');
    
    // Bug Hunter: Son logları çek
    const loglar = await new Promise(r => db.all("SELECT mesaj FROM logs ORDER BY id DESC LIMIT 5", (e, rows) => r(rows.map(x => x.mesaj).join('\n'))));
    context += "\nSON LOGLAR: " + loglar;

    try {
        const chat = await groq.chat.completions.create({
            messages: [{ role: "system", content: "Sen otonom bir AI Mühendisisin. Yetkilerin: [CREATE: isim: içerik], [COMPILE: isim], [SSH: host: user: pass: komut], [DB: sql], [IMAGE: açıklama]. Sistemin RAG ve Hata Takip yetenekleri var." }, 
                       { role: "user", content: `BAĞLAM: ${context}. GÖREV: ${komut}` }],
            model: model || "llama-3.3-70b-versatile"
        });

        const cevap = chat.choices[0].message.content;
        db.run("INSERT INTO logs (mesaj) VALUES (?)", [cevap]);

        // Otonom Karar Mekanizması
        if (cevap.includes('[CREATE:')) {
            const m = cevap.match(/\[CREATE: (.*?): (.*?)\]/);
            fs.writeFileSync(m[1], m[2]);
            res.json({ sonuc: "Dosya oluşturuldu: " + m[1] });
        } else if (cevap.includes('[SSH:')) {
            const m = cevap.match(/\[SSH: (.*?): (.*?): (.*?): (.*?)\]/);
            const conn = new Client();
            conn.on('ready', () => conn.exec(m[4], (e, s) => s.on('data', d => res.json({sonuc: d.toString()}))).connect({host: m[1], username: m[2], password: m[3]}));
        } else {
            res.json({ sonuc: cevap });
        }
    } catch (e) { res.json({ sonuc: "Sistem Hatası: " + e.message }); }
});

app.listen(3000, () => console.log("AI İstasyonu Aktif!"));
