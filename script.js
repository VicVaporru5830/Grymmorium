//** -------------- SCRIPT.JS COMPLETO (AEROSPACE) -------------- **//

/* ============================
   script.js — Tema Aerospace
   ============================
   - Google Maps 2D
   - Mapbox GL 3D (walk mode)
   - IA Aerospace (chat)
   - YouTube Aerospace
   - Streaming (R2/S3)
   - Stripe
   - 2FA
================================ */

//////////////////////
// MANEJO GLOBAL DE ERRORES
//////////////////////
window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada no manejada:', event.reason);
});

//////////////////////
// BASE DEL API
//////////////////////
const API_BASE = window.location.origin;

//////////////////////
// 2FA SIMPLE
//////////////////////
async function enviarCodigo() {
  const email = prompt("Ingresa tu correo para enviarte el código de acceso:");
  if (!email) return alert("Debes ingresar un correo.");

  try {
    const r = await fetch(`${API_BASE}/enviar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await r.json();
    if (!r.ok) return alert("Error: " + data.error);
    alert("Código enviado a tu correo ✈️");
  } catch (error) {
    console.error("Error enviando código:", error);
    alert("Error al enviar el código. Revisa la consola.");
  }
}

async function verificarCodigo() {
  const codigo = document.getElementById("codigo").value;
  const msg = document.getElementById("verificacion-msg");
  if (!codigo) {
    msg.style.color = "red";
    msg.innerText = "Ingresa el código de acceso";
    return;
  }
  msg.innerText = "Verificando...";
  try {
    const r = await fetch(`${API_BASE}/verificar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo })
    });
    const data = await r.json();
    if (r.ok) {
      msg.style.color = "green";
      msg.innerText = "Código correcto ✓";
    } else {
      msg.style.color = "red";
      msg.innerText = data.error;
    }
  } catch (error) {
    msg.style.color = "red";
    msg.innerText = "Error al verificar";
    console.error(error);
  }
}
window.enviarCodigo = enviarCodigo;
window.verificarCodigo = verificarCodigo;

//////////////////////
// GOOGLE MAPS (2D)
//////////////////////
function initMap() {
  try {
    const ubicacion = { lat: 19.4326, lng: -99.1332 };
    const el = document.getElementById("map");
    if (!el || !window.google?.maps) return;
    const map = new google.maps.Map(el, { zoom: 10, center: ubicacion });
    new google.maps.Marker({ position: ubicacion, map });
  } catch (error) {
    const errEl = document.getElementById("map-error");
    if (errEl) errEl.innerText = "Error cargando Google Maps: " + error.message;
    console.error(error);
  }
}
window.initMap = initMap;

//////////////////////
// IA AEROSPACE (CHAT)
//////////////////////
async function preguntarIA() {
  const pregunta = document.getElementById("pregunta")?.value || "";
  const chatBox = document.getElementById("chat-messages");
  if (!pregunta) return;

  // Mensaje de usuario
  const msgUser = document.createElement("div");
  msgUser.className = "chat-message";
  msgUser.innerText = "👤 " + pregunta;
  chatBox.appendChild(msgUser);

  // Mensaje de estado
  const msgIA = document.createElement("div");
  msgIA.className = "chat-message";
  msgIA.innerText = "Procesando consulta aeroespacial...";
  chatBox.appendChild(msgIA);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    msgIA.innerText = "🤖 " + (data.respuesta || "Sin respuesta");
  } catch (error) {
    msgIA.innerText = "Error IA: " + error.message;
  }

  document.getElementById("pregunta").value = "";
}
window.preguntarIA = preguntarIA;

//////////////////////
// YOUTUBE (CLIENTE)
//////////////////////
async function cargarVideosYouTube() {
  const contenedor = document.getElementById("youtube-videos");
  const errorBox = document.getElementById("youtube-error");
  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando videos aeroespaciales...";
  try {
    const res = await fetch(`${API_BASE}/youtube`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    errorBox.innerText = "";
    data.items.forEach((item) => {
      if (item.id?.kind === "youtube#video") {
        const vid = item.id.videoId;
        const title = item.snippet?.title || "Video Aerospace";
        contenedor.innerHTML += `
          <div class="video">
            <iframe width="300" height="170"
              src="https://www.youtube.com/embed/${vid}"
              title="${title}"
              frameborder="0"
              allowfullscreen>
            </iframe>
            <p>${title}</p>
          </div>
        `;
      }
    });
  } catch (err) {
    errorBox.innerText = "Error YouTube: " + err.message;
  }
}
window.cargarVideosYouTube = cargarVideosYouTube;

//////////////////////
// STREAMING (R2/S3) + PLAYER
//////////////////////
function getFileNameFromKey(key) {
  try { return (key || "").split("/").pop() || key; }
  catch { return key; }
}

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = bytes;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 1 ? 1 : 0)} ${u[i]}`;
}

function setFeatured(videoObj) {
  const mainVideo = document.getElementById("main-video");
  const mainFilename = document.getElementById("main-filename");
  const mainExtra = document.getElementById("main-extra");
  if (!mainVideo) return;

  mainVideo.pause();
  mainVideo.src = videoObj?.url || "";
  mainVideo.currentTime = 0;
  mainVideo.muted = true;
  mainVideo.play().catch(() => {});

  const name = getFileNameFromKey(videoObj?.key || "");
  const size = formatBytes(videoObj?.size);
  const fecha = videoObj?.lastModified ? new Date(videoObj.lastModified).toLocaleString() : "";

  mainFilename.textContent = name || "Video";
  mainExtra.textContent = `${size ? `Tamaño: ${size} · ` : ""}${fecha ? `Modificado: ${fecha}` : ""}`;

  document.querySelector(".player")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadVideos(keepKey) {
  const grid = document.getElementById("videos-grid");
  grid.innerHTML = "Cargando...";

  try {
    const r = await fetch(`${API_BASE}/videos`);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error");

    grid.innerHTML = "";
    const videos = data.videos || [];

    if (!videos.length) {
      grid.innerHTML = "<em>Sin videos</em>";
      setFeatured({ url: "", key: "", size: 0 });
      return;
    }

    let featured = videos[0];
    if (keepKey) {
      const found = videos.find(v => v.key === keepKey);
      if (found) featured = found;
    }
    setFeatured(featured);

    videos.forEach((v) => {
      const card = document.createElement("div");
      const fileName = getFileNameFromKey(v.key);

      card.className = "video-card";
      card.innerHTML = `
        <div class="video-wrap">
          <video class="hover-video" muted loop playsinline preload="metadata" src="${v.url}"></video>
        </div>
        <div class="video-meta">
          <div><b>${fileName}</b></div>
          <div><b>Tamaño:</b> ${formatBytes(v.size)}</div>
          <div><b>Modificado:</b> ${v.lastModified ? new Date(v.lastModified).toLocaleString() : ""}</div>
        </div>
      `;

      card.addEventListener("click", async () => {
        setFeatured(v);
        try {
          const head = await fetch(v.url, { method: "HEAD" });
          if (!head.ok) throw new Error();
        } catch {
          await loadVideos(v.key);
        }
      });

      grid.appendChild(card);
    });

  } catch (e) {
    console.error(e);
    grid.innerHTML = "Error cargando videos";
  }
}

//////////////////////
// SUBIDA DE VIDEOS
//////////////////////
async function handleUpload(e) {
  e.preventDefault();
  const status = document.getElementById("upload-status");
  const input = document.getElementById("video");
  const file = input?.files?.[0];
  if (!file) return;

  status.textContent = "Subiendo...";
  try {
    const fd = new FormData();
    fd.append("video", file);
    const r = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error de subida");

    status.textContent = "✓ Subido";
    await loadVideos();
  } catch (err) {
    status.textContent = "Error: " + err.message;
  } finally {
    setTimeout(() => (status.textContent = ""), 3000);
    input.value = "";
  }
}

//////////////////////
// PAGOS (Stripe Checkout)
//////////////////////
async function pagar() {
  try {
    const emailInput = document.getElementById("buyerEmail");
    const buyerEmail = (emailInput?.value || "").trim();
    if (!buyerEmail) {
      alert("Ingresa tu correo para enviarte el recibo.");
      emailInput?.focus();
      return;
    }

    const items = [{ name: "Donación Aerospace", qty: 1, price: 12.0 }];
    const res = await fetch(`${API_BASE}/crear-pago`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerEmail, items }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${txt}`);
    }

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("No se pudo iniciar el pago (sin URL)");
    }
  } catch (e) {
    alert("Error al iniciar pago: " + e.message);
    console.error("Stripe error:", e);
  }
}
window.pagar = pagar;

//////////////////////
// MAPBOX 3D — Aerospace
//////////////////////
// (este bloque ya lo tienes completo y no lo tocamos)

//////////////////////
// INIT
//////////////////////
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
  document.getElementById("refreshBtn")?.addEventListener("click", () => loadVideos());

  document.addEventListener("keydown", (e) => {
    const mainVideo = document.getElementById("main-video");
    if (e.code === "Space" && mainVideo) {
      e.preventDefault();
      mainVideo.paused ? mainVideo.play() : mainVideo.pause();
    }
  });

  loadVideos();
  loadMapboxTokenAndInit();
});
