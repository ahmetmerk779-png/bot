const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoEat = require('mineflayer-auto-eat');
const tool = require('mineflayer-tool').plugin;
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const Vec3 = require('vec3');

let botConfig = {
    host: 'oyna.aesirmc.com',
    port: 25565,
    username: 'myshoue',
    auth: 'offline',
    version: '1.20.4'
};

let aiConfig = { enabled: false, apiKey: '', model: 'gryphe/mythomax-l2-13b:free' };
let modules = { farming: true, mining: true, combat: true, autoEat: true, afkMove: true, aiChat: false };
let stats = { cropsPlanted: 0, cropsHarvested: 0, blocksMined: 0, diamondsFound: 0, ironFound: 0, goldFound: 0, enemiesKilled: 0 };
let logs = [];
let botInstance = null;
let reconnectTimer = null;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

function addLog(msg, type = 'info') {
    const entry = { time: new Date().toLocaleTimeString(), msg, type };
    logs.unshift(entry);
    if (logs.length > 100) logs.pop();
    io.emit('log', entry);
    console.log(`[${entry.time}] ${msg}`);
}

function stopBot() {
    if (botInstance) { botInstance.end(); botInstance = null; }
    if (reconnectTimer) clearTimeout(reconnectTimer);
}

function startBot() {
    stopBot();
    addLog(`Starting bot: ${botConfig.username} | ${botConfig.auth} | ${botConfig.version} | ${botConfig.host}:${botConfig.port}`);
    botInstance = mineflayer.createBot({
        host: botConfig.host,
        port: botConfig.port,
        username: botConfig.username,
        auth: botConfig.auth,
        version: botConfig.version
    });
    botInstance.loadPlugin(pathfinder);
    botInstance.loadPlugin(pvp);
    botInstance.loadPlugin(autoEat);
    botInstance.loadPlugin(tool);

    botInstance.once('spawn', () => {
        addLog(`Bot spawned at ${botConfig.host}:${botConfig.port}`);
        mineflayerViewer(botInstance, { port: 3001, firstPerson: true, viewDistance: 6 });
        addLog('3D Viewer started on port 3001');
        if (modules.farming) startFarming();
        if (modules.mining) startMining();
        if (modules.combat) startCombat();
    });

    botInstance.on('end', () => {
        addLog('Disconnected, reconnecting in 10 seconds', 'error');
        reconnectTimer = setTimeout(() => startBot(), 10000);
    });
    botInstance.on('error', (err) => addLog(`Error: ${err.message}`, 'error'));
    
    botInstance.on('chat', async (username, msg) => {
        if (username === botInstance.username) return;
        addLog(`${username}: ${msg}`, 'chat');
        if (msg.startsWith('!')) {
            const cmd = msg.slice(1).split(' ')[0];
            switch(cmd) {
                case 'stats': botInstance.chat(`Mined:${stats.blocksMined} Diamonds:${stats.diamondsFound} Kills:${stats.enemiesKilled}`); break;
                case 'pos': const p = botInstance.entity.position; botInstance.chat(`X:${p.x.toFixed(0)} Y:${p.y.toFixed(0)} Z:${p.z.toFixed(0)}`); break;
                case 'follow': modules.followTarget = username; botInstance.chat(`Following ${username}`); break;
                case 'stop': modules.followTarget = null; botInstance.chat('Stopped'); break;
                default: botInstance.chat('Commands: !stats, !pos, !follow, !stop');
            }
        } else if (modules.aiChat && aiConfig.enabled && aiConfig.apiKey) {
            const reply = await aiChat(msg, username);
            if (reply) botInstance.chat(reply);
        }
    });

    setInterval(() => {
        if (modules.followTarget && botInstance && botInstance.entity) {
            const player = botInstance.players[modules.followTarget];
            if (player && player.entity) botInstance.pathfinder.setGoal(new goals.GoalFollow(player.entity, 3), true);
        }
    }, 1000);

    setInterval(() => {
        if (modules.afkMove && botInstance && botInstance.entity) {
            const actions = ['forward', 'back', 'left', 'right'];
            const action = actions[Math.floor(Math.random() * actions.length)];
            botInstance.setControlState(action, true);
            setTimeout(() => botInstance.setControlState(action, false), 600);
            if (Math.random() > 0.8) {
                botInstance.setControlState('jump', true);
                setTimeout(() => botInstance.setControlState('jump', false), 200);
            }
        }
    }, 6000);

    botInstance.on('health', () => { if (modules.autoEat && botInstance.food < 14 && botInstance) botInstance.autoEat.eat(); });

    function startFarming() {
        setInterval(() => {
            if (!modules.farming || !botInstance || !botInstance.entity) return;
            const wheat = botInstance.findBlock({ matching: b => b.name === 'wheat', maxDistance: 32 });
            if (wheat) {
                botInstance.tool.equipForBlock(wheat, () => {
                    botInstance.dig(wheat, (err) => {
                        if (!err) {
                            stats.cropsHarvested++;
                            addLog('Farming: Wheat harvested');
                            setTimeout(() => {
                                if (!botInstance || !botInstance.entity) return;
                                const below = botInstance.blockAt(wheat.position.offset(0, -1, 0));
                                if (below && below.name.includes('farmland')) {
                                    const seeds = botInstance.inventory.items.find(i => i.name === 'wheat_seeds');
                                    if (seeds) {
                                        botInstance.equip(seeds, 'hand');
                                        botInstance.placeBlock(below, new Vec3(0, 1, 0), () => { stats.cropsPlanted++; addLog('Farming: Wheat planted'); });
                                    }
                                }
                            }, 500);
                        }
                    });
                });
            }
        }, 15000);
    }

    function startMining() {
        setInterval(() => {
            if (!modules.mining || !botInstance || !botInstance.entity) return;
            const ores = ['diamond_ore', 'iron_ore', 'gold_ore', 'emerald_ore', 'coal_ore'];
            let target = null;
            for (const ore of ores) { target = botInstance.findBlock({ matching: b => b.name === ore, maxDistance: 32 }); if (target) break; }
            if (target) {
                botInstance.tool.equipForBlock(target, () => {
                    botInstance.dig(target, (err) => {
                        if (!err) {
                            stats.blocksMined++;
                            if (target.name === 'diamond_ore') stats.diamondsFound++;
                            if (target.name === 'iron_ore') stats.ironFound++;
                            if (target.name === 'gold_ore') stats.goldFound++;
                            addLog(`Mining: ${target.name} mined`);
                        }
                    });
                });
            } else {
                const below = botInstance.blockAt(botInstance.entity.position.offset(0, -1, 0));
                if (below && below.name !== 'bedrock') {
                    botInstance.tool.equipForBlock(below, () => {
                        botInstance.dig(below, () => { stats.blocksMined++; addLog('Mining: Digging down'); });
                    });
                }
            }
        }, 8000);
    }

    function startCombat() {
        botInstance.on('entityHurt', (entity) => {
            if (!modules.combat || entity !== botInstance.entity) return;
            const attacker = botInstance.nearestEntity(e => e.position.distanceTo(botInstance.entity.position) < 5 && e.type === 'mob');
            if (attacker) { botInstance.pvp.attack(attacker); addLog(`Combat: Attacking ${attacker.name}`); }
        });
        setInterval(() => {
            if (!modules.combat || !botInstance || !botInstance.entity) return;
            const hostile = botInstance.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(botInstance.entity.position) < 16 && ['zombie','skeleton','spider','creeper'].includes(e.name));
            if (hostile) { botInstance.pvp.attack(hostile); addLog(`Combat: Engaging ${hostile.name}`); }
        }, 3000);
        botInstance.on('entityGone', (entity) => { if (entity === botInstance.pvp.target) { stats.enemiesKilled++; addLog('Combat: Enemy defeated'); } });
    }
}

async function aiChat(msg, sender) {
    if (!aiConfig.apiKey) return null;
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: aiConfig.model,
            messages: [{ role: 'system', content: 'You are a helpful Minecraft bot assistant. Reply shortly and naturally.' }, { role: 'user', content: `${sender} said: ${msg}. Reply as a Minecraft bot.` }]
        }, { headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' } });
        return response.data.choices[0].message.content;
    } catch (err) { addLog(`AI Error: ${err.message}`, 'error'); return null; }
}

app.use(express.json());
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AFK BOT | AESIRMC</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a0f; color: #e1e1e6; font-family: monospace; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
        .card { background: #1a1a24; border: 1px solid #2a2a35; border-radius: 12px; padding: 20px; flex: 1; min-width: 250px; }
        .card h3 { color: #8b5cf6; margin-bottom: 12px; font-size: 14px; }
        input, select, button { background: #0f0f14; border: 1px solid #2a2a35; padding: 10px; border-radius: 8px; color: white; margin: 6px 0; width: 100%; font-size: 13px; }
        button { background: #2a2a35; cursor: pointer; font-weight: bold; }
        button:hover { background: #3a3a45; }
        .log-area { background: #0a0a0f; height: 400px; overflow-y: auto; font-size: 12px; border: 1px solid #2a2a35; border-radius: 8px; padding: 10px; }
        .log-line { padding: 6px 8px; border-bottom: 1px solid #1a1a24; font-family: monospace; }
        .log-time { color: #52525b; margin-right: 10px; }
        .info { color: #3b82f6; }
        .success { color: #22c55e; }
        .error { color: #ef4444; }
        .chat { color: #e1e1e6; }
        .command-bar { display: flex; gap: 10px; margin-top: 10px; }
        .command-bar input { flex: 5; }
        .command-bar button { flex: 1; }
        hr { border-color: #2a2a35; margin: 15px 0; }
    </style>
</head>
<body>
<div class="container">
    <h1>AFK BOT | AESIRMC</h1>
    <div class="row">
        <div class="card">
            <h3>BOT COMMANDS</h3>
            <div class="command-bar">
                <input type="text" id="commandInput" placeholder="Type a command or message...">
                <button onclick="sendCommand()">SEND</button>
            </div>
            <div style="margin-top:10px; font-size:12px; color:#a1a1aa;">
                Available commands: !stats , !pos , !follow , !stop
            </div>
        </div>
        <div class="card">
            <h3>MODULES</h3>
            <button onclick="toggle('farming')">TOGGLE FARMING</button>
            <button onclick="toggle('mining')">TOGGLE MINING</button>
            <button onclick="toggle('combat')">TOGGLE COMBAT</button>
            <button onclick="toggle('autoEat')">TOGGLE AUTO EAT</button>
            <button onclick="toggle('afkMove')">TOGGLE AFK MOVE</button>
            <hr>
            <div id="moduleStatus">Farming: ACTIVE | Mining: ACTIVE | Combat: ACTIVE</div>
        </div>
        <div class="card">
            <h3>STATISTICS</h3>
            <div>Farming: Planted <span id="cropsPlanted">0</span> | Harvested <span id="cropsHarvested">0</span></div>
            <div>Mining: Blocks <span id="blocksMined">0</span> | Diamonds <span id="diamondsFound">0</span></div>
            <div>Combat: Kills <span id="enemiesKilled">0</span></div>
            <div>Position: X <span id="posX">0</span> Y <span id="posY">0</span> Z <span id="posZ">0</span></div>
        </div>
    </div>
    <div class="card">
        <h3>LIVE CONSOLE</h3>
        <div class="log-area" id="logArea"><div class="log-line">system ready</div></div>
    </div>
    <div class="card">
        <h3>3D VIEWER</h3>
        <div><a href="/viewer" target="_blank" style="color:#8b5cf6;">Open 3D Viewer (Bot's Perspective)</a></div>
    </div>
</div>
<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
socket.on('log', (data) => {
    const logDiv = document.getElementById('logArea');
    const entry = document.createElement('div');
    entry.className = 'log-line';
    entry.innerHTML = '<span class="log-time">[' + data.time + ']</span> <span class="' + data.type + '">' + data.msg + '</span>';
    logDiv.prepend(entry);
    if(logDiv.children.length > 100) logDiv.removeChild(logDiv.lastChild);
});
socket.on('stats', (data) => {
    document.getElementById('cropsPlanted').innerText = data.cropsPlanted;
    document.getElementById('cropsHarvested').innerText = data.cropsHarvested;
    document.getElementById('blocksMined').innerText = data.blocksMined;
    document.getElementById('diamondsFound').innerText = data.diamondsFound;
    document.getElementById('enemiesKilled').innerText = data.enemiesKilled;
    document.getElementById('posX').innerText = data.posX;
    document.getElementById('posY').innerText = data.posY;
    document.getElementById('posZ').innerText = data.posZ;
});
socket.on('modules', (data) => {
    document.getElementById('moduleStatus').innerHTML = 'Farming: ' + (data.farming ? 'ACTIVE' : 'OFF') + ' | Mining: ' + (data.mining ? 'ACTIVE' : 'OFF') + ' | Combat: ' + (data.combat ? 'ACTIVE' : 'OFF');
});
function sendCommand() {
    const input = document.getElementById('commandInput');
    const cmd = input.value;
    if(cmd.trim()) {
        fetch('/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd }) });
        input.value = '';
    }
}
function toggle(module) { fetch('/toggle/' + module); }
</script>
</body>
</html>
    `);
});

app.get('/viewer', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>3D Viewer</title><style>body{margin:0;overflow:hidden;background:#000;}</style></head><body><canvas id="canvas"></canvas><script>const ws=new WebSocket('ws://'+location.hostname+':3001');ws.binaryType='arraybuffer';</script></body></html>`);
});

app.post('/command', (req, res) => {
    const cmd = req.body.command;
    if (botInstance && botInstance.chat) {
        botInstance.chat(cmd);
        addLog(`Command sent: ${cmd}`, 'chat');
    }
    res.json({ success: true });
});

app.get('/toggle/:module', (req, res) => {
    const m = req.params.module;
    if (modules[m] !== undefined) { modules[m] = !modules[m]; addLog(`${m} toggled: ${modules[m] ? 'ON' : 'OFF'}`); io.emit('modules', modules); }
    res.json({ [m]: modules[m] });
});

app.get('/stats', (req, res) => {
    res.json({
        cropsPlanted: stats.cropsPlanted, cropsHarvested: stats.cropsHarvested,
        blocksMined: stats.blocksMined, diamondsFound: stats.diamondsFound,
        enemiesKilled: stats.enemiesKilled,
        posX: botInstance && botInstance.entity ? Math.floor(botInstance.entity.position.x) : 0,
        posY: botInstance && botInstance.entity ? Math.floor(botInstance.entity.position.y) : 0,
        posZ: botInstance && botInstance.entity ? Math.floor(botInstance.entity.position.z) : 0
    });
});

setInterval(() => {
    io.emit('stats', {
        cropsPlanted: stats.cropsPlanted, cropsHarvested: stats.cropsHarvested,
        blocksMined: stats.blocksMined, diamondsFound: stats.diamondsFound,
        enemiesKilled: stats.enemiesKilled,
        posX: botInstance && botInstance.entity ? Math.floor(botInstance.entity.position.x) : 0,
        posY: botInstance && botInstance.entity ? Math.floor(botInstance.entity.position.y) : 0,
        posZ: botInstance && botInstance.entity ? Math.floor(botInstance.entity.position.z) : 0
    });
    io.emit('modules', modules);
}, 2000);

startBot();
server.listen(PORT, () => { console.log(`Dashboard: http://localhost:${PORT}`); addLog(`Server started on port ${PORT}`); });
