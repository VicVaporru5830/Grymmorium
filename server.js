require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const OpenAI = require("openai");

const app = express();

// 🔹 Middlewares
app.use(cors());
app.use(express.json());

// 🔹 Inicializar OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY no definida. La IA no funcionará.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

// 🔹 Servir archivos estáticos (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname)));

// 🔹 Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🔹 Ruta de chat IA sobre dinosaurios
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
          content: "Eres un experto en dinosaurios. Solo respondes preguntas sobre dinosaurios, sus especies, hábitats, alimentación y curiosidades."
        },
        { role: "user", content: pregunta }
      ],
      max_tokens: 300
    });

    res.json({
      respuesta: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("Error en /chat:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
});

// 🔹 Iniciar servidor con puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});