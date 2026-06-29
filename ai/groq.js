const axios = require('axios');
const config = require('../config');

async function askGroq(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      config.groqUrl,
      {
        model: config.groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq hatası:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { askGroq };
