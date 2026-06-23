const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static('public'));

// GEMMA'NIN BİLGİ BANKASI (CodeBase)
const knowledgeBase = {
    projects: ["Minecraft Modu", "Roblox Script", "Web Arayüzü"],
    skills: ["JavaScript", "Node.js", "Lua", "CSS/HTML"],
    persona: "Gemma, şeffaf arayüzü ve otonom hata yakalama becerisine sahip, minimalist bir yapay zeka."
};

function gemmaBrain(message) {
    const msg = message.toLowerCase();
    
    // Proje Bilgisi
    if (msg.includes("projeler")) return `Şu an üzerinde çalıştığımız projeler: ${knowledgeBase.projects.join(", ")}. Hangisine odaklanalım?`;
    
    // Teknik Bilgi
    if (msg.includes("hangi dilleri biliyorsun")) return `Benim temel yeteneklerim: ${knowledgeBase.skills.join(", ")}.`;
    
    // Kişilik Bilgisi
    if (msg.includes("kimsin")) return knowledgeBase.persona;

    // Genel Sohbet
    if (msg.includes("merhaba")) return "Selam! Gemma devrede. Kod tabanımızı (CodeBase) incelemeye hazırım.";
    
    return "CodeBase'imde bu konu hakkında detaylı bilgi yok, ancak üzerinde çalışmamı istediğin bir kod bloğu varsa hemen analiz edebilirim!";
}

app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    const reply = gemmaBrain(message);
    res.json({ reply });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gemma Knowledge-Base ile aktif.`));
