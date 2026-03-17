// ======================
// server.js — ARK Backend
// ======================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const mime = require("mime-types");

// Stripe
const Stripe = require("stripe");
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Mailer opcional
let sendReceiptEmail = async () => {};
try {
  ({ sendReceiptEmail } = require("./mailer"));
} catch (e) {
  console.warn("[WARN] mailer no encontrado, usando función vacía");
}

const app = express();
app.set("trust proxy", 1);

// Utilitario
function getBaseUrl(req) {
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.get("host") || "")
    .split(",")[0].trim();
  return `${proto}://${host}`;
}

// Logging de environment vars
console.log("===== VARIABLES DE ENTORNO =====");
[
  "HF_API_KEY",
  "YOUTUBE_API_KEY",
  "FB_PAGE_ID",
  "FB_ACCESS_TOKEN",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ENDPOINT",
  "S3_FORCE_PATH_STYLE",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "BASE_URL",
  "SENDGRID_API_KEY",
  "MAIL_FROM",
  "SELLER_EMAIL",
  "MAPBOX_PUBLIC_TOKEN",
].forEach(v => console.log(v, process.env[v] ? "✔️" : "❌"));
console.log("==================================");

// Middlewares
app.use(cors({ origin: true, methods: ["GET", "POST", "HEAD", "OPTIONS"] }));
app.use(express.static(path.join(__dirname)));

// STRIPE WEBHOOK (DEBE IR ANTES)
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      if (!stripe) return res.status(500).send("Stripe no configurado");

      const sig = req.headers["stripe-signature"];
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        let lineItems = { data: [] };
        try {
          lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        } catch {}

        try {
          await sendReceiptEmail({
            session,
            lineItems: lineItems.data,
          });
        } catch {}
      }

      return res.json({ received: true });
    } catch {
      return res.status(200).end();
    }
  }
);

// Ahora sí JSON
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

// ======================
// MAPBOX CONFIG ENDPOINT
// ======================
app.get("/config/mapbox", (_req, res) => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN || "";

  if (!token) {
    return res.status(500).json({
      mapboxToken: "",
      error: "MAPBOX_PUBLIC_TOKEN no configurado",
    });
  }

  if (!token.startsWith("pk.")) {
    return res.status(500).json({
      mapboxToken: "",
      error: "MAPBOX_PUBLIC_TOKEN debe ser un token público (pk.*)",
    });
  }

  res.json({ mapboxToken: token });
});

// =================
// IA (HuggingFace)
// =================
app.post("/chat", async (req, res) => {
  try {
    if (!process.env.HF_API_KEY) return res.status(500).json({ error: "Falta HF_API_KEY" });

    const { pregunta } = req.body;
    if (!pregunta) return res.status(400).json({ error: "Falta pregunta" });

    const r = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        messages: [
          { role: "system", content: "Eres experto en dinosaurios." },
          { role: "user", content: pregunta },
        ],
        max_tokens: 250,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const txt = r.data?.choices?.[0]?.message?.content?.trim();
    res.json({ respuesta: txt || "Sin respuesta" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============
// YOUTUBE
// ===============
app.get("/youtube", async (_req, res) => {
  try {
    if (!process.env.YOUTUBE_API_KEY)
      return res.status(500).json({ error: "Falta YOUTUBE_API_KEY" });

    const r = await axios.get("https://www.googleapis.com/youtube/v3/search", {
      params: {
        part: "snippet",
        q: "Animales prehistóricos documentales",
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

// ===============
// FACEBOOK
// ===============
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// S3/R2 SETUP
// ===============================
const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

// Disk temp
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${uuidv4()}${ext}`);
  },
});

// ==================
// UPLOAD VIDEO
// ==================
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

    if (!req.file)
      return res.status(400).json({ error: "No file" });

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
  } catch (err) {
    if (temp) fs.unlink(temp, () => {});
    res.status(500).json({ error: err.message });
  }
});

// ==================
// LIST VIDEOS
// ==================
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
    items.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified));

    const result = await Promise.all(
      items
        .filter(obj => obj.Key && !obj.Key.endsWith("/"))
        .map(async obj => ({
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// PUERTO
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});