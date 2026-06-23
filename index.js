const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

let bot = mineflayer.createBot({
    host: 'aesirmc.com', port: 25565, username: 'asmp_bot', version: '1.21.8'
});

bot.loadPlugin(pathfinder);
let combatMode = false;

// --- Komut İşleyici ---
app.post('/command', async (req, res) => {
    const { action, blockType } = req.body;
    if (action === 'MINE') {
        const block = bot.findBlock({ matching: (b) => b.name === blockType, maxDistance: 32 });
        if (block) {
            bot.pathfinder.setGoal(new goals.GoalLookAtBlock(block.position, bot.world));
            bot.once('goal_reached', () => bot.dig(block));
        }
    } else if (action === 'DEPOSIT') {
        const chestBlock = bot.findBlock({ matching: (b) => b.name === 'chest', maxDistance: 32 });
        if (chestBlock) {
            const chest = await bot.openChest(chestBlock);
            for (const item of bot.inventory.items()) await chest.deposit(item.type, null, item.count);
            await chest.close();
        }
    } else if (action === 'COMBAT_TOGGLE') combatMode = !combatMode;
    else if (action === 'MOVE_FORWARD') bot.setControlState('forward', true);
    
    res.send({ status: 'OK' });
});

bot.on('entityHurt', (entity) => {
    if (combatMode && entity.username === bot.username) {
        const attacker = bot.nearestEntity(e => e.type === 'player' && e.id !== bot.id);
        if (attacker) { bot.lookAt(attacker.position); bot.attack(attacker); }
    }
});

app.listen(process.env.PORT || 8080);
