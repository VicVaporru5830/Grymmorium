require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");
const axios = require("axios");

const app = express();

////////////////////////////////////////////////////
// MIDDLEWARES
////////////////////////////////////////////////////
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

////////////////////////////////////////////////////
// VALIDACIÓN DE KEYS
////////////////////////////////////////////////////
console.log("OPENAI:", process.env.OPENAI_API_KEY ? "✅ Cargada" : "❌ No cargada");
console.log("YOUTUBE:", process.env.YOUTUBE_API_KEY ? "✅ Cargada" : "❌ No cargada");
console.log("FACEBOOK:", process.env.FB_ACCESS_TOKEN ? "✅ Cargada" : "❌ No cargada");

////////////////////////////////////////////////////
// INICIALIZAR OPENAI
////////////////////////////////////////////////////
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

////////////////////////////////////////////////////
// RUTA PRINCIPAL
////////////////////////////////////////////////////
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

////////////////////////////////////////////////////
// CHAT IA DINOSAURIOS
////////////////////////////////////////////////////
app.post("/chat", async (req, res) => {
  try {
    const { pregunta } = req.body;

    if (!pregunta) {
      return res.status(400).json({ error: "La pregunta es obligatoria" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "API Key de OpenAI no definida" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto en dinosaurios. Solo respondes preguntas sobre dinosaurios."
        },
        { role: "user", content: pregunta }
      ],
      max_tokens: 300
    });

    res.json({
      respuesta: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("Error IA:", error.response?.data || error.message);
    res.status(500).json({ error: "Error en OpenAI" });
  }
});

////////////////////////////////////////////////////
// YOUTUBE API
////////////////////////////////////////////////////
app.get("/youtube", async (req, res) => {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      return res.status(500).json({ error: "YouTube API Key no definida" });
    }

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: "dinosaurios",
          type: "video",
          maxResults: 6,
          key: process.env.YOUTUBE_API_KEY
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("Error YouTube:", error.response?.data || error.message);
    res.status(500).json({ error: "Error en YouTube API" });
  }
});

////////////////////////////////////////////////////
// FACEBOOK GRAPH API
////////////////////////////////////////////////////
app.get("/facebook", async (req, res) => {
  try {
    if (!process.env.FB_PAGE_ID || !process.env.FB_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Credenciales Facebook no definidas" });
    }

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${process.env.FB_PAGE_ID}/posts`,
      {
        params: {
          fields: "message,permalink_url",
          access_token: process.env.FB_ACCESS_TOKEN
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error("Error Facebook:", error.response?.data || error.message);
    res.status(500).json({ error: "Error en Facebook Graph API" });
  }
});

////////////////////////////////////////////////////
// INICIAR SERVIDOR
////////////////////////////////////////////////////
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});