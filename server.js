require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {
  const { pregunta } = req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Eres un experto en historia." },
      { role: "user", content: pregunta }
    ]
  });

  res.json({ respuesta: completion.choices[0].message.content });
});

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});