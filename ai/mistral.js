// ai/mistral.js - Mistral API ile iletişim
const axios = require('axios');
const config = require('../config');

async function askMistral(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      config.mistralUrl,
      {
        model: config.mistralModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.mistralApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Mistral hatası:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { askMistral };
