const mineflayer = require('mineflayer');
const { pathfinder, goals, Movements } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock');
const pvp = require('mineflayer-pvp').plugin;
const armorManager = require('mineflayer-armor-manager');
const fs = require('fs');
require('dotenv').config();

// --- HAFIZA SİSTEMİ ---
let memories = {};
try {
    if (fs.existsSync('memory.json')) {
        memories = JSON.parse(fs.readFileSync('memory.json', 'utf8'));
    }
} catch (e) { console.log("Hafıza dosyası oluşturuluyor..."); }

function saveMemory() { fs.writeFileSync('memory.json', JSON.stringify(memories, null, 2)); }

// --- BOT BAŞLATMA ---
const bot = mineflayer.createBot({
    host: process.env.SERVER_IP || 'localhost',
    username: 'Ultimate_Agent',
    version: '1.21.1'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock.plugin);
bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);

// --- DEVRİYE MODÜLÜ ---
let isPatrolling = false;
const patrolRoute = ['maden', 'depo', 'ev']; 
let currentPatrolIndex = 0;

async function startPatrol() {
    isPatrolling = true;
    while (isPatrolling) {
        const locName = patrolRoute[currentPatrolIndex];
        if (memories[locName]) {
            bot.chat(`Gidilen durak: ${locName}`);
            await bot.pathfinder.goto(new goals.GoalBlock(memories[locName].x, memories[locName].y, memories[locName].z));
            await new Promise(r => setTimeout(r, 5000));
        }
        currentPatrolIndex = (currentPatrolIndex + 1) % patrolRoute.length;
    }
}

// --- ANA DÖNGÜ (PHYSIC TICK) ---
bot.on('physicTick', () => {
    // 1. Hayatta Kalma
    if (bot.food < 15) {
        const food = bot.inventory.items().find(i => i.name.includes('cooked') || i.name === 'apple');
        if (food) bot.equip(food, 'hand').then(() => bot.consume());
    }

    // 2. Sosyal Farkındalık (Göz Takibi)
    const target = bot.nearestEntity(e => e.type === 'player' && bot.entity.position.distanceTo(e.position) < 8);
    if (target && !bot.pathfinder.isMoving()) {
        bot.lookAt(target.position.offset(0, 1.6, 0));
    }

    // 3. Tehlike (Creeper)
    const danger = bot.nearestEntity(e => e.name === 'creeper' && e.position.distanceTo(bot.entity.position) < 5);
    if (danger) {
        bot.chat("TEHLİKE! KAÇIYORUM!");
        bot.pathfinder.setGoal(new goals.GoalNear(bot.entity.position.x + 10, bot.entity.position.y, bot.entity.position.z + 10, 1));
    }
});

// --- KOMUT SİSTEMİ ---
bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    const args = message.split(' ');

    if (message.startsWith('burayı kaydet ')) {
        memories[args[2]] = bot.entity.position;
        saveMemory();
        bot.chat(`'${args[2]}' kaydedildi.`);
    } 
    else if (args[0] === 'git') {
        const pos = memories[args[1]];
        if (pos) bot.pathfinder.setGoal(new goals.GoalBlock(pos.x, pos.y, pos.z));
    }
    else if (message === 'devriyeyi başlat') {
        startPatrol();
    }
    else if (message === 'devriyeyi durdur') {
        isPatrolling = false;
        bot.pathfinder.setGoal(null);
    }
});

bot.on('spawn', () => bot.chat("Sisteme giriş yaptım. Otonom mod aktif."));
