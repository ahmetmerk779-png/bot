const express = require('express');
const { Groq } = require('groq-sdk');
const fs = require('fs');
const { Client } = require('ssh2');
const multer = require('multer');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ dest: '/tmp/' });
const DB_FILE = './data.json';

app.use(express.json());
app.use(express.static('public'));

// JSON "Veritabanı" Yönetimi
const readLogs = () => JSON.parse(fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf8') : '{"logs": []}').logs;
const writeLog = (msg) => {
    let data = JSON.parse(fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf8') : '{"logs": []}');
    data.logs.push(msg);
    fs.writeFileSync(DB_FILE, JSON.stringify(data));
};

app.post('/api/master', upload.single('file'), async (req, res) => {
    const { komut } = req.body;
    let context = req.file ? fs.readFileSync(req.file.path, 'utf8') : "";
    const logs = readLogs().slice(-5).join('\n');

    try {
        const chat = await groq.chat.completions.create({
            messages: [{ role: "system", content: "Sen otonom bir AI Mühendisisin. Yetkilerin: [CREATE: isim: içerik], [SSH: host: user: pass: komut]." }, 
                       { role: "user", content: `BAĞLAM: ${context}\nSON LOGLAR: ${logs}\nGÖREV: ${komut}` }],
            model: "llama-3.3-70b-versatile"
        });

        const cevap = chat.choices[0].message.content;
        writeLog(cevap);

        if (cevap.includes('[CREATE:')) {
            const m = cevap.match(/\[CREATE: (.*?): (.*?)\]/);
            fs.writeFileSync(m[1], m[2]);
            res.json({ sonuc: "Oluşturuldu: " + m[1] });
        } else if (cevap.includes('[SSH:')) {
            const m = cevap.match(/\[SSH: (.*?): (.*?): (.*?): (.*?)\]/);
            const conn = new Client();
            conn.on('ready', () => conn.exec(m[4], (e, s) => s.on('data', d => res.json({sonuc: d.toString()}))).connect({host: m[1], username: m[2], password: m[3]}));
        } else {
            res.json({ sonuc: cevap });
        }
    } catch (e) { res.json({ sonuc: "Hata: " + e.message }); }
});

app.listen(process.env.PORT || 3000, () => console.log("Sistem Aktif!"));
