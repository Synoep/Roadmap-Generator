const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const port = 3001;

// OpenAI API endpoint
const GPT_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Use the GPT API key
const GPT_API_KEY = process.env.GPT_API_KEY;

// Add a test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    apiKeyPresent: !!GPT_API_KEY,
    apiKeyPrefix: GPT_API_KEY ? GPT_API_KEY.substring(0, 7) : 'not found'
  });
});

app.post('/v1', async (req, res) => {
  try {
    // Check if API key is configured
    if (!GPT_API_KEY) {
      console.error('OpenAI API key is not configured');
      return res.status(500).json({ error: 'OpenAI API key is not configured' });
    }

    const topic = req.body.topic;
    console.log('Received request for topic:', topic);

    const prompt = `Generate a comprehensive roadmap for learning ${topic}. Include all necessary topics, concepts, and steps from beginner to advanced levels.

    The roadmap should be structured in this format:
    [
        {
            "title": "${topic} Roadmap",
            "sections": [
              {
                "title": "Section Title",
                "items": [
                  "Item 1",
                  "Item 2"
                ]
              }
            ]
        }
    ]
    
    Provide only the JSON array, no additional text.`;

    console.log('Making request to OpenAI API...');
    
    try {
      // Make a request to the OpenAI API
      const response = await axios.post(GPT_API_ENDPOINT, {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an AI roadmap generator. Always respond with valid JSON arrays containing roadmap data."
          },
          {
                     role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${GPT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Received response from OpenAI:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      if (response.data.choices && response.data.choices.length > 0) {
        const content = response.data.choices[0].message.content;
        try {
          const parsedContent = JSON.parse(content);
          console.log('Successfully parsed JSON response');
          res.json(parsedContent);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          console.error('Raw content:', content);
          res.status(500).json({ error: 'Invalid response format', details: error.message });
        }
      } else {
        console.error('No choices in response:', response.data);
        res.status(500).json({ error: 'Failed to generate response', details: 'No choices in response' });
      }
    } catch (apiError) {
      console.error('OpenAI API Error:', {
        message: apiError.message,
        response: apiError.response ? {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: apiError.response.data
        } : 'No response data'
      });
      res.status(500).json({ 
        error: 'OpenAI API Error', 
        details: apiError.response?.data?.error?.message || apiError.message
      });
    }
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('API Key status:', GPT_API_KEY ? 'Present' : 'Missing');
  console.log('API Key prefix:', GPT_API_KEY ? GPT_API_KEY.substring(0, 7) : 'not found');
});
