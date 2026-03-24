// ======================
// server.js — Grymmorium (Versión Mágica)
// ======================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } =
 require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime-types");

const Stripe = require("stripe");
const stripe = process.env.STRIPE_SECRET_KEY
 ? Stripe(process.env.STRIPE_SECRET_KEY)
 : null;

let sendReceiptEmail = async () => {};
try {
 ({ sendReceiptEmail } = require("./mailer"));
} catch {}

// -----------------------
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// =========================================
// RUTA PRINCIPAL
// =========================================
app.get("/", (req, res) => {
 res.sendFile(path.join(__dirname, "index.html"));
});

// =========================================
// IA — Maestro Arcano
// =========================================
app.post("/chat", async (req, res) => {
 try {
   const { pregunta } = req.body;
   if (!pregunta)
     return res.status(400).json({ error: "Falta la pregunta" });

   const systemPrompt = `
Eres un maestro mago con siglos de experiencia.
Respondes ÚNICAMENTE sobre magia, hechicería, alquimia, rituales, arte arcano, grimorios y conocimiento místico.
Nunca hablas de ciencia, tecnología moderna ni temas mundanos.
Tu tono es místico, antiguo y lleno de sabiduría.
   `;

   const resp = await axios.post(
     "https://router.huggingface.co/v1/chat/completions",
     {
       model: "meta-llama/Llama-3.2-1B-Instruct",
       messages: [
         { role: "system", content: systemPrompt },
         { role: "user", content: pregunta }
       ],
       max_tokens: 350,
       temperature: 0.7
     },
     {
       headers: {
         Authorization: `Bearer ${process.env.HF_API_KEY}`,
         "Content-Type": "application/json"
       }
     }
   );

   const respuesta =
     resp.data?.choices?.[0]?.message?.content?.trim() ??
     "Los vientos arcanos no susurraron respuesta.";

   res.json({ respuesta });
 } catch (err) {
   res.status(500).json({ error: "Error en el conjuro de IA" });
 }
});

// =========================================
// YOUTUBE — Buscar magia
// =========================================
app.get("/youtube", async (_req, res) => {
 try {
   if (!process.env.YOUTUBE_API_KEY)
     return res.status(500).json({ error: "Falta YOUTUBE_API_KEY" });

   const r = await axios.get("https://www.googleapis.com/youtube/v3/search", {
     params: {
       part: "snippet",
       q: "magia rituales alquimia hechicería ocultismo",
       type: "video",
       maxResults: 6,
       key: process.env.YOUTUBE_API_KEY,
     },
   });

   res.json(r.data);
 } catch (err) {
   res.status(500).json({ error: err.message });
 }
});