// ======================
// server.js — Grymmorium Backend (funcional + tema mágico astral en textos, NO en lógica)
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

// Stripe
const Stripe = require("stripe");
const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Mailer
let sendReceiptEmail = async () => {};
let sendVerificationCode = async () => {};
try {
  ({ sendReceiptEmail, sendVerificationCode } = require("./mailer"));
} catch (e) {
  console.warn("[WARN] mailer no encontrado");
}

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "HEAD", "OPTIONS"],
  })
);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ===========================
// RUTA PRINCIPAL
// ===========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

// ===========================
// IA — (MAGIA ASTRAL)
// ===========================
app.post("/chat", async (req, res) => {
  try {
    const { pregunta } = req.body;
    if (!pregunta)
      return res.status(400).json({ error: "Falta consulta para el oráculo." });

    if (!process.env.HF_API_KEY)
      return res.status(500).json({ error: "Falta HF_API_KEY" });

    const systemPrompt = `
Eres un Oráculo arcano especialista en magia azul astral.
Respondes únicamente sobre alquimia, hechizos, constelaciones, runas y saber astral.
Si te preguntan otra cosa, redirige al conocimiento místico.
    `;

    const resp = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        model: "meta-llama/Llama-3.2-1B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: pregunta },
        ],
        max_tokens: 300,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const respuesta =
      resp.data?.choices?.[0]?.message?.content?.trim() ||
      "El oráculo guarda silencio…";

    res.json({ respuesta });
  } catch (error) {
    console.error("🔥 ERROR IA:", error.response?.data || error.message);
    res.status(500).json({ error: "Fallo interno al consultar el oráculo." });
  }
});

// ===========================
// 2FA ORIGINAL — TOTALMENTE RESTAURADO
// ===========================
let CODIGO_2FA = null;

app.post("/enviar-codigo", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Falta email" });

    // Generar código
    CODIGO_2FA = Math.floor(100000 + Math.random() * 900000).toString();

    // Enviar
    await sendVerificationCode(email, CODIGO_2FA);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "No se pudo enviar el código" });
  }
});

app.post("/verificar-codigo", (req, res) => {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: "Falta código" });

  if (codigo === CODIGO_2FA) {
    CODIGO_2FA = null;
    return res.json({ ok: true });
  }

  res.status(400).json({ error: "Código incorrecto" });
});

// ===========================
// STRIPE — TOTALMENTE RESTAURADO
// ===========================
app.post("/crear-pago", async (req, res) => {
  try {
    const { items, buyerEmail } = req.body;

    if (!stripe) throw new Error("Stripe no configurado");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyerEmail,
      line_items: items.map((i) => ({
        price_data: {
          currency: "mxn",
          product_data: { name: i.name },
          unit_amount: Math.round(i.price * 100),
        },
        quantity: i.qty,
      })),
      success_url: `${req.headers.origin}/?status=success`,
      cancel_url: `${req.headers.origin}/?status=cancel`,
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error("ERROR STRIPE:", e);
    res.status(500).json({ error: e.message });
  }
});

// ===========================
// MAPBOX TOKEN
// ===========================
app.get("/config/mapbox", (_req, res) => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN || "";
  if (!token)
    return res
      .status(500)
      .json({ error: "MAPBOX_PUBLIC_TOKEN no configurado", mapboxToken: "" });

  res.json({ mapboxToken: token });
});

// ===========================
// YOUTUBE (Tema astral)
// ===========================
app.get("/youtube", async (_req, res) => {
  try {
    if (!process.env.YOUTUBE_API_KEY)
      return res.status(500).json({ error: "Falta YOUTUBE_API_KEY" });

    const r = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: "magia astral alquimia hechicería grimorios",
        maxResults: 6,
        type: "video",
        key: process.env.YOUTUBE_API_KEY,
      },
    });

    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===========================
// FACEBOOK (sin cambios estructurales)
// ===========================
app.get("/facebook", async (_req, res) => {
  try {
    if (!process.env.FB_PAGE_ID || !process.env.FB_ACCESS_TOKEN)
      return res.status(500).json({ error: "Faltan credenciales FB" });

    const r = await axios.get(
      `https://graph.facebook.com/${process.env.FB_PAGE_ID}/posts`,
      {
        params: {
          fields: "message,permalink_url,created_time",
          access_token: process.env.FB_ACCESS_TOKEN,
        },
      }
    );

    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===========================
// S3 / R2 — UPLOAD
// ===========================
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const allowedVideoMimes = ["video/mp4", "video/webm", "video/ogg"];

const uploadVideo = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 500 },
  fileFilter: (_req, file, cb) => {
    if (!allowedVideoMimes.includes(file.mimetype))
      return cb(new Error("Formato inválido"));
    cb(null, true);
  },
});

app.post("/upload", uploadVideo.single("video"), async (req, res) => {
  const temp = req.file?.path;

  try {
    if (!process.env.S3_BUCKET)
      return res.status(500).json({ error: "Falta S3_BUCKET" });

    if (!req.file) return res.status(400).json({ error: "No file" });

    const key = `videos/${req.file.filename}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: fs.createReadStream(temp),
        ContentType: req.file.mimetype,
      })
    );

    fs.unlink(temp, () => {});

    res.json({ ok: true, key });
  } catch (e) {
    if (temp) fs.unlink(temp, () => {});
    res.status(500).json({ error: e.message });
  }
});

// ===========================
// LIST VIDEOS
// ===========================
app.get("/videos", async (_req, res) => {
  try {
    if (!process.env.S3_BUCKET)
      return res.status(500).json({ error: "Falta S3_BUCKET" });

    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET,
        Prefix: "videos/",
      })
    );

    const items = list.Contents || [];

    items.sort(
      (a, b) => new Date(b.LastModified) - new Date(a.LastModified)
    );

    const result = await Promise.all(
      items
        .filter((o) => o.Key && !o.Key.endsWith("/"))
        .map(async (obj) => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          url: await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: process.env.S3_BUCKET,
              Key: obj.Key,
            }),
            { expiresIn: 3600 }
          ),
        }))
    );

    res.json({ videos: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===========================
// PUERTO
// ===========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor vivo → http://localhost:${PORT}`);
});
