require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Hata vermemesi için en kararlı model:
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const PROJECTS_DIR = path.join(__dirname, 'projects');
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

app.post('/api/composer', async (req, res) => {
    const { task } = req.body;
    try {
        const response = await model.generateContent(`
            Sen bir uzman yazılımcısın. Şu isteği yerine getir: ${task}.
            Kurallar: Sadece [EDIT: dosya_adi] kod_blogu [/EDIT] formatında yanıt ver.
        `);

        const output = response.response.text();
        const editRegex = /\[EDIT: (.+?)\]([\s\S]*?)\[\/EDIT\]/g;
        let match;
        let modifiedFiles = [];

        while ((match = editRegex.exec(output)) !== null) {
            fs.writeFileSync(path.join(PROJECTS_DIR, match[1].trim()), match[2].trim());
            modifiedFiles.push(match[1].trim());
        }

        res.json({ success: true, modified: modifiedFiles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Sistem hazır!'));
