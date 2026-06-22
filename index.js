require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

// API Anahtarı kontrolü
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Modele erişimi daha garanti bir yolla sağlıyoruz
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const PROJECTS_DIR = path.join(__dirname, 'projects');
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

app.post('/api/composer', async (req, res) => {
    const { task } = req.body;
    if (!task) return res.status(400).json({ error: "Görev boş olamaz." });

    try {
        const result = await model.generateContent(task);
        const responseText = result.response.text();

        // Basit bir dosya oluşturucu mantığı
        const fileName = "output.txt"; 
        fs.writeFileSync(path.join(PROJECTS_DIR, fileName), responseText);

        res.json({ success: true, message: "Dosya oluşturuldu: " + fileName, content: responseText });
    } catch (err) {
        console.error("AI Hatası:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Composer motoru aktif!'));
