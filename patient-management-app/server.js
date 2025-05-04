const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 12001;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Routes
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const apiKey = req.body.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Read the audio file as base64
    const audioData = fs.readFileSync(audioFile.path, { encoding: 'base64' });
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Create the content parts for the API request
    const prompt = "Generate a transcript of the speech in French.";
    
    // Create a part for the audio data
    const audioPart = {
      inlineData: {
        data: audioData,
        mimeType: audioFile.mimetype
      }
    };
    
    // Send the request to Gemini
    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    
    // Delete the temporary file
    fs.unlinkSync(audioFile.path);
    
    // Return the transcription
    const transcription = response.text() || "Impossible de transcrire l'audio";
    res.json({ transcription: transcription });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { apiKey, transcription } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    if (!transcription) {
      return res.status(400).json({ error: 'Transcription is required' });
    }

    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Create the prompt for analysis
    const prompt = `
    Analyse la transcription médicale suivante et extrait les informations structurées.
    
    IMPORTANT: Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.
    Format exact requis:
    {
      "symptoms": "Liste détaillée des symptômes",
      "diagnosis": "Diagnostic possible basé sur les symptômes",
      "medications": "Médicaments mentionnés ou recommandés",
      "tests": "Tests médicaux recommandés"
    }
    
    Transcription: ${transcription}
    `;

    // Send the request to Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Parse the JSON response
    let jsonResponse;
    try {
      // Try to extract JSON from the response text
      // First, look for JSON-like structure in the text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        // Try to parse the matched JSON
        jsonResponse = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON structure found, throw an error
        throw new Error('No JSON structure found in response');
      }
    } catch (e) {
      console.error('JSON parsing error:', e);
      console.log('Response text:', responseText);
      
      // If the response is not valid JSON, create a default response
      return res.json({ 
        symptoms: "Impossible d'analyser la réponse JSON",
        diagnosis: "Impossible d'analyser la réponse JSON",
        medications: "Veuillez vérifier la transcription",
        tests: "Veuillez vérifier la transcription"
      });
    }

    // Return the analysis
    res.json(jsonResponse);
  } catch (error) {
    console.error('Error analyzing transcription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`Access the application at https://work-2-hgnznzdhogwuyjoe.prod-runtime.all-hands.dev`);
});