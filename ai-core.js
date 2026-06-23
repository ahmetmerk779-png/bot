// ai-core.js
const { Configuration, OpenAIApi } = require("openai"); // Gerekirse

async function getDecision(context) {
    // Burada basit bir "düşünce zinciri" mantığı kuruyoruz
    const state = context.inventoryFull ? "Envanter boşaltılmalı" : "Maden kazmaya devam";
    console.log(`[AI Thinking]: ${state}`);
    return state;
}

module.exports = { getDecision };
