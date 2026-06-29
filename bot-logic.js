const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const { Vec3 } = require('vec3');

let isMuted = false;

function findEntityByName(bot, isim) {
    const allEntities = Object.values(bot.entities);
    return allEntities.find(e => e.type === 'player' && e.username && e.username.toLowerCase().includes(isim.toLowerCase()));
}

function createBot(username, host, port) {
    const bot = mineflayer.createBot({ host, port: parseInt(port), username, version: '1.21.1' });
    bot.loadPlugin(pathfinder);
    bot.loadPlugin(collectBlock);

    bot.on('end', () => setTimeout(() => createBot(username, host, port), 5000));

    const actions = {
        kir: async (blokIsmi) => {
            const b = bot.findBlock({ matching: (bl) => bl.name === blokIsmi });
            if (b) await bot.collectBlock.collect(b);
        },
        saldir: async (isim) => {
            const mob = findEntityByName(bot, isim);
            if (mob) bot.attack(mob);
        },
        npcBul: async (isim) => {
            const npc = findEntityByName(bot, isim);
            if (npc) bot.pathfinder.setGoal(new goals.GoalFollow(npc, 1), true);
        },
        sagTikla: async (isim) => {
            const npc = findEntityByName(bot, isim);
            if (npc) bot.activateEntity(npc);
        },
        tiklaSlot: async (slot) => {
            if (bot.currentWindow) await bot.clickWindow(parseInt(slot), 0, 0);
        },
        komutKullan: async (komut) => {
            bot.chat(`/${komut}`);
        },
        esyaAt: async (isim, miktar) => {
            const item = bot.inventory.items().find(i => i.name === isim);
            if (item) await bot.toss(item.type, null, parseInt(miktar) || 1);
        }
    };

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return;

        // Mute Sistemi
        if (message.includes('!sessiz')) { isMuted = true; return; }
        if (message.includes('!konus')) { isMuted = false; return; }
        if (isMuted) return;

        // Login Sistemi
        if (message.includes('login')) bot.chat('/login ŞİFREN');

        // AI İşleme (JSON ise aksiyon al, değilse konuş)
        if (message.startsWith('{') && message.endsWith('}')) {
            try {
                const data = JSON.parse(message);
                if (actions[data.action]) await actions[data.action](...data.args);
            } catch (e) { bot.chat("Komut hatası!"); }
        }
    });

    return bot;
}

module.exports = { createBot };
