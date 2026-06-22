require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
const PROJECTS_DIR = path.join(__dirname, 'projects');

// Klasör yoksa oluştur
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

app.post('/api/composer', async (req, res) => {
    const { task } = req.body;
    const files = fs.readdirSync(PROJECTS_DIR);
    
    // Proje bağlamını oluştur
    let context = "MEVCUT PROJE DOSYALARI:\n";
    files.forEach(f => {
        const content = fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf8');
        context += `\n--- DOSYA: ${f} ---\n${content}\n`;
    });

    try {
        const response = await model.generateContent(`
            Sen bir Cursor Composer'sın. Aşağıdaki proje yapısını analiz et ve kullanıcının isteğini yerine getir.
            ${context}
            İSTEK: ${task}
            
            KURAL: Değiştireceğin her dosya için [EDIT: dosya_adi] kod_blogu [/EDIT] bloğu kullan.
            Tüm dosya içeriğini tam ve eksiksiz yaz.
        `);

        const output = response.response.text();
        const editRegex = /\[EDIT: (.+?)\]([\s\S]*?)\[\/EDIT\]/g;
        let match;
        let modifiedFiles = [];

        while ((match = editRegex.exec(output)) !== null) {
            fs.writeFileSync(path.join(PROJECTS_DIR, match[1].trim()), match[2].trim());
            modifiedFiles.push(match[1].trim());
        }

        res.json({ success: true, modified: modifiedFiles, raw: output });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(3000, () => console.log('Composer sunucusu 3000 portunda aktif.'));
