import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON body parsing with a generous size limit
app.use(express.json({ limit: '10mb' }));

// Lazy initializer for GoogleGenAI to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in the environment variables. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Map art styles to descriptive prompt modifiers
const STYLE_MODIFIERS: Record<string, string> = {
  'photorealistic': 'photorealistic, highly detailed, 8k resolution, professional photography, cinematic lighting, sharp focus',
  'digital-art': 'digital art, highly detailed, vibrant colors, clean vector lines, trending on artstation',
  'anime': 'anime style, hand-drawn, aesthetic illustration, vibrant colors, detailed studio ghibli anime aesthetic',
  'watercolor': 'beautiful watercolor painting style, soft hand-painted edges, wet-on-wet textured watercolor paper, artistic bleed',
  '3d-render': 'detailed 3D render, octane render style, trending on artstation, blender, volumetric lighting, smooth surfaces',
  'cyberpunk': 'cyberpunk aesthetic, futuristic city, neon glowing lights, dark ambient atmosphere, high-tech details, synthwave',
  'oil-painting': 'classic oil painting style, visible thick canvas brush strokes, classical art feel, rich textures and colors',
  'fantasy': 'epic fantasy illustration, magical glowing elements, mythical scene, highly detailed, dreamlike wonderland',
  'comic-book': 'vintage comic book illustration style, bold ink outlines, hand-drawn half-tone print texture, dramatic pop art lighting',
};

// API Route: Generate Image
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'none' } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    // Lazy load the Gemini client and handle missing key error
    let ai: GoogleGenAI;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Gemini API key is missing.' });
      return;
    }

    // Build the final prompt by attaching style descriptions
    let finalPrompt = prompt.trim();
    if (style && style !== 'none' && STYLE_MODIFIERS[style]) {
      finalPrompt = `${finalPrompt}, ${STYLE_MODIFIERS[style]}`;
    }

    console.log(`Generating image for prompt: "${prompt.substring(0, 50)}..." with style: ${style}, aspectRatio: ${aspectRatio}`);

    // Call Gemini Image Generation (using gemini-2.5-flash-image)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: finalPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    // Extract the base64 image data
    let base64Data: string | null = null;
    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Data = part.inlineData.data;
          break;
        }
      }
    }

    if (!base64Data) {
      // If we got text instead of image or empty response
      const responseText = response.text || '';
      console.error('No image data returned from model.', responseText);
      res.status(500).json({ 
        error: 'Model did not return image data.', 
        details: responseText || 'Perhaps the prompt triggered safety filters.'
      });
      return;
    }

    res.json({
      success: true,
      imageUrl: `data:image/png;base64,${base64Data}`,
    });

  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: 'An error occurred while generating the image.',
      details: error.message || String(error)
    });
  }
});

// Configure Vite middleware or serve static bundle based on production flag
async function initializeServer() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Running in development mode. Mounting Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in production mode. Serving static assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error('Failed to start server:', err);
});
