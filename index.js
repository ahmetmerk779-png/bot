require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Proje klasörünü ana dizinde garanti altına al
const PROJECTS_DIR = path.join(__dirname, 'projects');
if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR);
}

app.post('/api/composer', async (req, res) => {
    const { task } = req.body;
    try {
        const response = await model.generateContent(`
            Sen bir Minecraft mod geliştiricisi ve asmp bot sistemleri uzmanısın. 
            İstek: ${task}.
            Kural: [EDIT: dosya_adi] kod_icerigi [/EDIT] formatında yanıt ver.
        `);

        const output = response.response.text();
        const editRegex = /\[EDIT: (.+?)\]([\s\S]*?)\[\/EDIT\]/g;
        let match;
        let modifiedFiles = [];

        while ((match = editRegex.exec(output)) !== null) {
            const fileName = match[1].trim();
            fs.writeFileSync(path.join(PROJECTS_DIR, fileName), match[2].trim());
            modifiedFiles.push(fileName);
        }

        res.json({ success: true, modified: modifiedFiles, fullResponse: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Composer motoru aktif.'));
