const express = require('express');
const http = require('http');
const mineflayer = require('mineflayer');
const { pathfinder, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const pvp = require('mineflayer-pvp').plugin;
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
app.use(express.urlencoded({ extended: true }));

const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });

let bot;

const AI_SYSTEM_PROMPT = `
Sen otonom bir Minecraft botusun. Kullanıcının komutlarını SADECE aşağıdaki JSON formatında ver. Başka hiçbir şey yazma.
ÖNEMLİ: Hedefleri (target) daima küçük harflerle ve Minecraft İngilizce isimleriyle yaz (Örn: dirt, log, stone, zombie, cow, pig). 

Eylemler:
1. "chat" - Sadece konuşmak için. (Örn: {"action": "chat", "message": "Merhaba!"})
2. "collect" - Bir bloğu kırmak/kazmak için. (Örn: {"action": "collect", "target": "dirt"})
3. "attack" - Bir yaratığa saldırmak için. (Örn: {"action": "attack", "target": "zombie"})
4. "move" - Birinin yanına gitmek için. (Örn: {"action": "move", "target": "Ahmet"})
5. "stop" - Durmak için. (Örn: {"action": "stop"})
`;

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock.plugin);
    bot.loadPlugin(pvp);

    bot.on('spawn', () => console.log('Esnek Arama Modüllü Ajan Başlatıldı!'));

    bot.on('chat', async (user, message) => {
        if (user === bot.username) return;

        try {
            const response = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: AI_SYSTEM_PROMPT },
                    { role: "user", content: `${user} diyor ki: ${message}` }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1
            });

            const aiResponse = response.choices[0].message.content.trim();
            console.log("AI Kararı:", aiResponse); 
            const command = JSON.parse(aiResponse);

            if (command.action === 'chat') {
                bot.chat(command.message);
            } 
            
            // YENİ AKILLI KAZMA İŞLEMİ
            else if (command.action === 'collect') {
                const searchName = command.target.toLowerCase();
                bot.chat(`Anlaşıldı, içinde '${searchName}' geçen bir blok arıyorum...`);
                
                // Birebir eşleşme yerine, adının içinde o kelime geçen en yakın bloğu bulur
                const targetBlock = bot.findBlock({ 
                    matching: (b) => b.name.toLowerCase().includes(searchName), 
                    maxDistance: 64 
                });
                
                if (targetBlock) {
                    bot.chat(`${targetBlock.name} buldum! Kazıyorum.`);
                    bot.collectBlock.collect(targetBlock, err => {
                        if (err) bot.chat("Kazarken bir sorun çıktı, yol kapalı veya aletim yok.");
                    });
                } else {
                    bot.chat(`Etrafımda '${searchName}' ile ilgili hiçbir blok bulamadım.`);
                }
            } 
            
            // YENİ AKILLI SALDIRMA İŞLEMİ
            else if (command.action === 'attack') {
                const searchName = command.target.toLowerCase();
                bot.chat(`Hedef arıyorum: ${searchName}...`);
                
                // İsmi benzeyen en yakın varlığa saldırır
                const targetEntity = bot.nearestEntity(e => 
                    (e.name && e.name.toLowerCase().includes(searchName)) || 
                    (e.type === 'player' && e.username && e.username.toLowerCase().includes(searchName))
                );
                
                if (targetEntity) {
                    bot.chat("Hedefi buldum, saldırıyorum!");
                    bot.pvp.attack(targetEntity);
                } else {
                    bot.chat(`Etrafta saldırmak için ${searchName} bulamadım.`);
                }
            }
            
            else if (command.action === 'move') {
                bot.chat(`Yanına geliyorum...`);
                const targetPlayer = bot.players[user]?.entity;
                if (targetPlayer) {
                    bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer, 2), true);
                } else {
                    bot.chat("Seni göremiyorum, çok uzaktasın.");
                }
            } 
            
            else if (command.action === 'stop') {
                bot.pathfinder.setGoal(null);
                bot.pvp.stop();
                bot.chat("Bütün eylemleri durdurdum.");
            }

        } catch (error) {
            console.log("YZ İşlem Hatası:", error);
            bot.chat("Ne demek istediğini anlayamadım veya kelimeyi çeviremedim.");
        }
    });

    res.send("Bot Başlatıldı!");
});

server.listen(process.env.PORT || 3000);
