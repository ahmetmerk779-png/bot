const express = require('express');
const { Groq } = require('groq-sdk');
const { Octokit } = require("@octokit/rest");
const fs = require('fs');
const path = require('path');
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.use(express.json());
app.use(express.static('public'));

const PROJECTS_DIR = path.join(__dirname, 'projects');
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);

const EXPERT_MODES = {
    modding: "Sen kıdemli bir Minecraft Mod geliştiricisisin. (Fabric/Forge, Mixins). [CREATE: dosya_adi: içerik] ve [GITHUB: repo: dosya_adi: içerik] komutlarını kullan.",
    design: "Sen bir UI/UX tasarımcısısın. Modern ve estetik arayüz şemaları oluştur.",
    security: "Sen bir siber güvenlik uzmanısın. Kodun açıklarını bul ve zırhla.",
    devops: "Sen bir sistem mimarısın. Ölçeklenebilir altyapılar kurgula."
};

app.post('/api/master-core', async (req, res) => {
    const { task, mode } = req.body;
    
    try {
        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: EXPERT_MODES[mode] || "Sen otonom bir AI mühendisisin." },
                { role: "user", content: task }
            ],
            model: "llama-3.3-70b-versatile"
        });

        const cevap = response.choices[0].message.content;

        // Dosya Oluşturma Yetkisi
        if (cevap.includes('[CREATE:')) {
            const match = cevap.match(/\[CREATE: (.*?): ([\s\S]*?)\]/);
            if (match) fs.writeFileSync(path.join(__dirname, match[1]), match[2]);
        }

        // GitHub Transfer Yetkisi
        if (cevap.includes('[GITHUB:')) {
            const match = cevap.match(/\[GITHUB: (.*?): (.*?): ([\s\S]*?)\]/);
            await octokit.repos.createOrUpdateFileContents({
                owner: 'ahmetmerk779', // Burayı kendi kullanıcı adınla değiştir!
                repo: match[1],
                path: match[2],
                message: 'AI-Forge otomatik güncelleme',
                content: Buffer.from(match[3]).toString('base64')
            });
        }

        res.json({ sonuc: cevap, needsApproval: cevap.includes('?') });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(process.env.PORT || 3000);
