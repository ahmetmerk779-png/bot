require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

// API Anahtarı
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// TAM MODEL YOLU TANIMI (404 hatasını kesin çözer)
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

const PROJECTS_DIR = path.join(__dirname, 'projects');
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

app.post('/api/composer', async (req, res) => {
    try {
        const { task } = req.body;
        const result = await model.generateContent(task);
        const text = result.response.text();
        
        // Basit bir dosya yazma
        fs.writeFileSync(path.join(PROJECTS_DIR, 'sonuc.txt'), text);
        
        res.json({ success: true, message: text });
    } catch (err) {
        console.error("DEBUG HATA:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Sistem 3000 portunda çalışıyor.'));
