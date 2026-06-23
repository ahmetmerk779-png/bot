require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.use(express.json());
app.use(express.static('public'));

app.post('/api/composer', async (req, res) => {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: req.body.task }],
            model: "llama3-70b-8192", // Llama'nın en güçlü modeli
        });
        res.json({ success: true, message: chatCompletion.choices[0].message.content });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Llama aktif!'));
