const mineflayer = require('mineflayer');
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp').plugin;
const autoEat = require('mineflayer-auto-eat');
const tool = require('mineflayer-tool').plugin;

// ========== KONFIGURASYON ==========
const config = {
    host: 'aesirmc.asmp.fun',
    port: 25565,
    username: 'SENIN_HESAP_ADIN',
    auth: 'offline'
};

const bot = mineflayer.createBot(config);
bot.loadPlugin(pathfinder);
bot.loadPlugin(pvp);
bot.loadPlugin(autoEat);
bot.loadPlugin(tool);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// ========== İSTATİSTİKLER ==========
let stats = {
    cropsPlanted: 0,
    cropsHarvested: 0,
    blocksMined: 0,
    diamondsFound: 0,
    ironFound: 0,
    goldFound: 0,
    emeraldFound: 0,
    coalFound: 0,
    enemiesKilled: 0,
    deaths: 0,
    chatMessages: 0,
    afkTime: 0,
    startTime: Date.now(),
    xpGained: 0,
    levelsGained: 0
};

// ========== MODÜL DURUMLARI ==========
let modules = {
    farming: true,
    mining: true,
    combat: true,
    autoEat: true,
    afkMove: true,
    autoChat: true,
    autoReconnect: true,
    economyTracker: true,
    inventoryManager: true,
    pathFinder: true,
    skinChanger: false,
    shaderEnabled: false,
    language: 'tr',
    aiChat: true
};

// ========== DİL DESTEĞİ ==========
const translations = {
    tr: {
        farming: 'FARMING',
        mining: 'MINING',
        combat: 'COMBAT',
        active: 'ACTIVE',
        off: 'OFF',
        planted: 'PLANTED',
        harvested: 'HARVESTED',
        mined: 'MINED',
        diamonds: 'DIAMONDS',
        kills: 'KILLS'
    },
    en: {
        farming: 'FARMING',
        mining: 'MINING',
        combat: 'COMBAT',
        active: 'ACTIVE',
        off: 'OFF',
        planted: 'PLANTED',
        harvested: 'HARVESTED',
        mined: 'MINED',
        diamonds: 'DIAMONDS',
        kills: 'KILLS'
    }
};

function t(key) {
    return translations[modules.language][key] || key;
}

// ========== CANLI LOG ==========
let logs = [];

function addLog(msg, type = 'info') {
    const logEntry = { time: new Date().toLocaleTimeString(), msg, type };
    logs.unshift(logEntry);
    if (logs.length > 100) logs.pop();
    io.emit('log', logEntry);
    console.log(`[${logEntry.time}] ${msg}`);
}

// ========== AI SOHBET (OpenRouter) ==========
async function aiChat(message, sender) {
    if (!modules.aiChat) return null;
    try {
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'gryphe/mythomax-l2-13b:free',
            messages: [
                { role: 'system', content: 'You are a helpful Minecraft bot assistant. Respond shortly and naturally.' },
                { role: 'user', content: `${sender} said: ${message}. Reply as a Minecraft bot.` }
            ]
        }, {
            headers: {
                'Authorization': 'Bearer YOUR_OPENROUTER_API_KEY',
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].message.content;
    } catch (err) {
        addLog(`AI Error: ${err.message}`, 'error');
        return null;
    }
}

// ========== SOHBET DİNLEME ==========
bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    stats.chatMessages++;
    addLog(`Chat: ${username}: ${message}`, 'chat');
    
    if (message.startsWith('!')) {
        const cmd = message.slice(1).split(' ')[0];
        switch(cmd) {
            case 'help':
                bot.chat('Commands: !stats, !modules, !toggle, !pos, !follow, !stop, !come');
                break;
            case 'stats':
                bot.chat(`Stats: ${stats.blocksMined} mined, ${stats.diamondsFound} diamonds, ${stats.enemiesKilled} kills`);
                break;
            case 'modules':
                const active = Object.entries(modules).filter(([k,v]) => v === true).map(([k]) => k).join(', ');
                bot.chat(`Active modules: ${active}`);
                break;
            case 'pos':
                const pos = bot.entity.position;
                bot.chat(`Position: X:${Math.floor(pos.x)} Y:${Math.floor(pos.y)} Z:${Math.floor(pos.z)}`);
                break;
            case 'follow':
                const player = bot.players[username];
                if (player) {
                    modules.following = username;
                    bot.chat(`Following ${username}`);
                }
                break;
            case 'stop':
                modules.following = null;
                bot.chat('Stopped following');
                break;
            case 'come':
                modules.following = username;
                break;
            default:
                if (modules.aiChat) {
                    const aiResponse = await aiChat(message, username);
                    if (aiResponse) bot.chat(aiResponse);
                }
        }
    }
});

// ========== FARMING MODÜLÜ ==========
let farmingInterval = null;
function startFarming() {
    if (farmingInterval) clearInterval(farmingInterval);
    farmingInterval = setInterval(() => {
        if (!modules.farming) return;
        const wheatBlock = bot.findBlock({ matching: (block) => block.name === 'wheat', maxDistance: 32 });
        if (wheatBlock) {
            bot.tool.equipForBlock(wheatBlock, () => {
                bot.dig(wheatBlock, (err) => {
                    if (!err
