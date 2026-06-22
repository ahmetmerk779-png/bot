const express = require('express');
const { Groq } = require('groq-sdk');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('ssh2');
const multer = require('multer');

const app = express();
const db = new sqlite3.Database('./studio.db');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ dest: '/tmp/' }); // Render'da sadece /tmp klasörü yazılabilir

app.use(express.json());
app.use(express.static('public'));

db.run("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT, ts DATETIME DEFAULT CURRENT_TIMESTAMP)");

app.post('/api/master', upload.single('file'), async (req, res) => {
    const { komut, model } = req.body;
    let context = req.file ? fs.readFileSync(req.file.path, 'utf8') : "";
    
    const logs = await new Promise(r => db.all("SELECT msg FROM logs ORDER BY id DESC LIMIT 5", (e, rows) => r(rows ? rows.map(x => x.msg).join('\n') : "")));

    try {
        const chat = await groq.chat.completions.create({
            messages: [{ role: "system", content: "Sen otonom bir AI Mühendisisin. Yetkilerin: [CREATE: isim: içerik], [COMPILE: isim], [SSH: host: user: pass: komut], [DB: sql]. Sistemde RAG ve Hata Takip yetenekleri aktif." }, 
                       { role: "user", content: `BAĞLAM: ${context}\nSON HATALAR: ${logs}\nGÖREV: ${komut}` }],
            model: model || "llama-3.3-70b-versatile"
        });

        const cevap = chat.choices[0].message.content;
        db.run("INSERT INTO logs (msg) VALUES (?)", [cevap]);

        if (cevap.includes('[CREATE:')) {
            const m = cevap.match(/\[CREATE: (.*?): (.*?)\]/);
            fs.writeFileSync(m[1], m[2]);
            res.json({ sonuc: "Dosya oluşturuldu: " + m[1] });
        } else {
            res.json({ sonuc: cevap });
        }
    } catch (e) { res.json({ sonuc: "Hata: " + e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log("Sistem Aktif!"));
