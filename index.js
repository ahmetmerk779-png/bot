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
Sen otonom bir Minecraft botusun. Kullanıcının komutlarını SADECE aşağıdaki JSON formatında ver.
ÖNEMLİ KURALLAR:
1. Hedefleri (target) İngilizce Minecraft eşya isimleriyle yaz (Örn: dirt, log, stone).
2. EĞER kullanıcı senden yapamayacağın bir şey isterse (Örneğin: "eşya üret", "kazma yap", "ev yap"), SADECE "chat" eylemini kullan ve "Henüz eşya üretemiyorum, sadece blok kırabilir veya eşya atabilirim." gibi bir cevap ver. JSON yapısını asla bozma!

Eylemler:
1. "chat" - Konuşmak veya yapamadığın bir görevi reddetmek için. (Örn: {"action": "chat", "message": "Bunu yapamam."})
2. "collect" - Bir bloğu kırmak/kazmak için. (Örn: {"action": "collect", "target": "dirt"})
3. "attack" - Bir yaratığa saldırmak için. (Örn: {"action": "attack", "target": "zombie"})
4. "move" - Birinin yanına gitmek için. (Örn: {"action": "move", "target": "player_name"})
5. "drop" - Envanterindeki bir eşyayı atmak/vermek için. (Örn: {"action": "drop", "target": "log"})
6. "stop" - Durmak için.
`;

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

app.post('/connect', (req, res) => {
    const { host, username, version } = req.body;
    if (bot) bot.quit();

    bot = mineflayer.createBot({ host, username, version });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock.plugin);
    bot.loadPlugin(pvp);

    bot.on('spawn', () => console.log('Güncellenmiş Ajan Başlatıldı!'));

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
            
            else if (command.action === 'collect') {
                const searchName = command.target.toLowerCase();
                bot.chat(`Anlaşıldı, içinde '${searchName}' geçen bir blok arıyorum...`);
                
                const targetBlock = bot.findBlock({ 
                    matching: (b) => b.name.toLowerCase().includes(searchName), 
                    maxDistance: 64 
                });
                
                if (targetBlock) {
                    bot.chat(`${targetBlock.name} buldum! Kazıyorum.`);
                    bot.collectBlock.collect(targetBlock, err => {
                        if (err) bot.chat("Kazarken bir sorun çıktı, ağaç çok yüksekte veya önüm kapalı.");
                    });
                } else {
                    bot.chat(`Etrafımda '${searchName}' bulamadım.`);
                }
            } 
            
            else if (command.action === 'attack') {
                const searchName = command.target.toLowerCase();
                bot.chat(`Hedef arıyorum: ${searchName}...`);
                const targetEntity = bot.nearestEntity(e => 
                    (e.name && e.name.toLowerCase().includes(searchName)) || 
                    (e.type === 'player' && e.username && e.username.toLowerCase().includes(searchName))
                );
                
                if (targetEntity) {
                    bot.chat("Hedefi buldum, saldırıyorum!");
                    bot.pvp.attack(targetEntity);
                } else {
                    bot.chat(`Etrafta ${searchName} bulamadım.`);
                }
            }

            // YENİ: EŞYA ATMA MODÜLÜ
            else if (command.action === 'drop') {
                const searchName = command.target.toLowerCase();
                const itemToDrop = bot.inventory.items().find(i => i.name.toLowerCase().includes(searchName));
                
                if (itemToDrop) {
                    bot.chat(`Sana ${itemToDrop.name} atıyorum...`);
                    bot.tossStack(itemToDrop);
                } else {
                    bot.chat(`Envanterimde '${searchName}' bulamadım.`);
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
                bot.chat("Durdum.");
            }

        } catch (error) {
            console.log("YZ İşlem Hatası:", error);
            bot.chat("Bunu nasıl yapacağımı henüz bilmiyorum veya cümleni tam anlayamadım.");
        }
    });

    res.send("Bot Başlatıldı!");
});

server.listen(process.env.PORT || 3000);
