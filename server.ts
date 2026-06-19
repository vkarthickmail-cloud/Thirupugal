import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables
dotenv.config();

let aiClient: GoogleGenAI | null = null;

// Lazy initialize Google Gen AI safely to prevent app crash on missing keys
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json({ limit: "50mb" }));

  // API 1: Chatbot (Scholarly Guide Interface)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, modelType } = req.body;
      const ai = getAiClient();

      // Configure roles
      const systemInstruction = 
        "You are an erudite Tamil literature scholar and an expert in Thiruppugazh (the 15th-century sacred hymns of Saint Arunagirinathar). " +
        "Your role is to explain the meter (Santham), grammar, historical/philosophical context (Advaita philosophy, Shaiva Siddhanta, Kaumaram), " +
        "and line-by-line meanings. Always speak in a respectful, deep, and inspiring tone. " +
        "Provide your responses with both elegant, simple Tamil and clear, scholarly English explanations. " +
        "If the user asks for any other Thiruppugazh song not currently in the pre-populated list, retrieve or output its lyrics and explain it line-by-line in Tamil and English.";

      // Select model
      // Use gemini-3.1-pro-preview for complex literature queries, gemini-3.5-flash for general
      const selectedModel = modelType === "pro" ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";

      // Transform history to the expected structure
      const contents = history ? history.map((h: any) => ({
        role: h.role,
        parts: [{ text: h.text }]
      })) : [];

      // Append new message
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: error.message || "An error occurred with the AI Companion." });
    }
  });

  // API 2: Text-to-Speech (Dynamic Verse Recital)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      const ai = getAiClient();

      const selectedVoice = voice || "Kore"; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: `Read this text clearly: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio data returned by the text-to-speech engine.");
      }

      res.json({ audio: base64Audio });
    } catch (error: any) {
      console.error("TTS error:", error);
      res.status(500).json({ error: error.message || "Failed to generate audio playback." });
    }
  });

  // API 3: High-Quality Image Generation (Divine Art Studio)
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, size } = req.body;
      const ai = getAiClient();

      // Ensure appropriate resolution selection
      const imageSize = size === "4K" ? "4K" : size === "2K" ? "2K" : "1K";

      const finalPrompt = `Divine Tamil spiritual watercolor or digital realistic painting of: ${prompt}. Majestic, sacred, pristine detailed art, glowing warm lighting, 8k resolution, cinematic composition.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [{ text: finalPrompt }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize,
          },
        },
      });

      let base64Image: string | null = null;
      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }

      if (!base64Image) {
        throw new Error("No image data returned from high-quality image model.");
      }

      res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate visual art." });
    }
  });

  // Check if API key is in env for the frontend status indicator
  app.get("/api/config-status", (req, res) => {
    res.json({ hasKey: !!process.env.GEMINI_API_KEY });
  });

  // API 4: Dynamic Song Search & Loader (Provides access to ALL 1300+ Thiruppugazh songs via Gemini AI)
  app.post("/api/load-custom-song", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || !query.trim()) {
        return res.status(400).json({ error: "Search query is required." });
      }

      const ai = getAiClient();

      const systemPrompt = `
You are an expert Thiruppugazh researcher. The user wants to retrieve the full details of any Thiruppugazh song requested by name, first lines, or number, or a description (e.g. "Apakara Nindhai", "Muthari Venmulai", or "song from Chidambaram").
Analyze the query and identify the exact historic Thiruppugazh hymn. If the query is vague, find a real popular Thiruppugazh song matching the query context.
You MUST respond with a single valid JSON object that fits the following TypeScript interface EXACTLY:

interface SongLine {
  tamil: string; // The original Tamil lyrics of this line (ensure correct ancient Tamil spellings, e.g. "கைத்தல நிறைகனி யப்பமொ டவல்பொரி")
  transliteration: string; // Dynamic English pronunciation transliteration
  meaningTa: string; // Simple modern Tamil word meaning / explanation
  meaningEn: string; // High-quality scholarly English line meaning
}

interface Song {
  id: string; // Clean kebab-case ID (e.g. "muthari-venmulai")
  titleTa: string; // Song title in Tamil (e.g. "முத்தரி வெண்முளை")
  titleEn: string; // Song title in English (e.g. "Muthari Venmulai")
  location: string; // Restrict to the historic temple shrine or "Common" / "Pothu" (e.g. "Tiruchendur", "Swamimalai", "Pazhani", "Chidambaram")
  santham: string; // The precise metric layout / rhythm in Tamil and English (e.g. "தானன தனதன (Thanaana Thanathana)")
  introductionTa: string; // Beautiful 1-2 sentence Tamil intro describing the song's spiritual importance
  introductionEn: string; // Beautiful 1-2 sentence scholarly English intro
  lines: SongLine[]; // Exactly 4 to 8 key lines of the historic song representing the verse
  totalMeaningTa: string; // Complete summary of meaning in simple Tamil
  totalMeaningEn: string; // Complete summary of meaning in scholarly English
  youtubeId: string; // A real youtube video ID for this song or a likely stable query fallback ID (e.g., "7Yp4TfSmf-s" or "sR69fN6tZ3Q")
  kaumaramUrl: string; // Related URL on kaumaram.org (defaults to "https://www.kaumaram.com")
}

Return ONLY standard JSON. No markdown backticks, no comments, no additional text outside the JSON block.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: `Retrieve Thiruppugazh Song for query: "${query}"` }] }],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1, // low temperature for precise factual structure
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "";
      const cleanJson = responseText.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const songData = JSON.parse(cleanJson);
      
      // Basic runtime check
      if (!songData.id || !songData.titleTa || !songData.lines) {
        throw new Error("Retrieved structure was incomplete.");
      }

      res.json(songData);
    } catch (error: any) {
      console.error("Custom song load error:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve the requested Thiruppugazh from archives." });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
