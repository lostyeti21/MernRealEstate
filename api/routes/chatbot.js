const express = require('express');
const { Configuration, OpenAIApi } = require('openai');

const router = express.Router();

const configuration = new Configuration({
  apiKey: 'your-openai-api-key', // Replace with your OpenAI API key
});
const openai = new OpenAIApi(configuration);

router.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: `You are a chatbot assistant for a real estate website. Answer user questions: ${message}`,
      max_tokens: 150,
    });

    res.json({ reply: response.data.choices[0].text.trim() });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Unable to process the request' });
  }
});

module.exports = router;
