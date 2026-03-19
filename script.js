/* ============================
   script.js — Proyecto ARK
   ============================
   - SIN Three.js
   - Mapbox GL 3D (modo caminar)
   - Google Maps 2D
   - IA / YouTube / Facebook / Streaming / Stripe / 2FA
================================ */

// =========================
// BASE DEL API
// =========================
const API_BASE = window.location.origin;

// =========================
// 2FA
// =========================
async function enviarCodigo() {
  const email = prompt("Ingresa tu correo para enviarte el código:");
  if (!email) return alert("Debes ingresar un correo.");

  const res = await fetch(`${API_BASE}/enviar-codigo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) return alert("Error: " + data.error);

  alert("Código enviado a tu correo.");
}

async function verificarCodigo() {
  const codigo = document.getElementById("codigo").value;
  const msg = document.getElementById("verificacion-msg");

  msg.innerText = "Verificando...";

  const res = await fetch(`${API_BASE}/verificar-codigo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo }),
  });

  const data = await res.json();

  if (res.ok) {
    msg.style.color = "green";
    msg.innerText = "Código correcto ✔️";
  } else {
    msg.style.color = "red";
    msg.innerText = data.error;
  }
}

window.enviarCodigo = enviarCodigo;
window.verificarCodigo = verificarCodigo;

// =========================
// GOOGLE MAPS
// =========================
function initMap() {
  try {
    const ubicacion = { lat: 19.4326, lng: -99.1332 };
    const el = document.getElementById("map");
    if (!el || !window.google?.maps) return;

    const map = new google.maps.Map(el, {
      zoom: 10,
      center: ubicacion,
    });

    new google.maps.Marker({ position: ubicacion, map });
  } catch (error) {
    const errEl = document.getElementById("map-error");
    if (errEl) errEl.innerText = "Error cargando Google Maps: " + error.message;
  }
}

window.initMap = initMap;

// =========================
// IA (DINOSAURIOS)
// =========================
async function preguntarIA() {
  const pregunta = document.getElementById("pregunta").value.trim();
  const respuestaBox = document.getElementById("respuesta");

  if (!pregunta) return;
  respuestaBox.innerText = "Cargando...";

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error desconocido");

    respuestaBox.innerText = data.respuesta || "Sin respuesta";
  } catch (error) {
    respuestaBox.innerText = "Error IA: " + error.message;
  }
}

window.preguntarIA = preguntarIA;

// =========================
// YOUTUBE
// =========================
async function cargarVideosYouTube() {
  const contenedor = document.getElementById("youtube-videos");
  const errorBox = document.getElementById("youtube-error");

  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando videos...";

  try {
    const res = await fetch(`${API_BASE}/youtube`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error desconocido");

    errorBox.innerText = "";

    if (!data.items?.length) {
      errorBox.innerText = "No se encontraron videos.";
      return;
    }

    data.items.forEach((item) => {
      if (item.id?.kind !== "youtube#video") return;

      const vid = item.id.videoId;
      const title = item.snippet?.title || "Video";

      contenedor.innerHTML += `
        <div class="video">
          <iframe
            width="300" height="170"
            src="https://www.youtube.com/embed/${vid}"
            title="${title}"
            frameborder="0"
            allowfullscreen
          ></iframe>
          <p>${title}</p>
        </div>`;
    });
  } catch (err) {
    errorBox.innerText = "Error YouTube: " + err.message;
  }
}

window.cargarVideosYouTube = cargarVideosYouTube;

// =========================
// FACEBOOK
// =========================
function escapeHtml(s = "") {
  return s.replace(/[&<>\"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function cargarPostsFacebook() {
  const contenedor = document.getElementById("facebook-posts");
  const errorBox = document.getElementById("facebook-error");

  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando publicaciones...";

  try {
    const res = await fetch(`${API_BASE}/facebook`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error desconocido");

    errorBox.innerText = "";

    if (!data.data?.length) {
      errorBox.innerText = "No se encontraron publicaciones.";
      return;
    }

    data.data.forEach((post) => {
      contenedor.innerHTML += `
        <div class="fb-post">
          <p>${escapeHtml(post.message || "[Sin mensaje]")}</p>
          <a href="${post.permalink_url}" target="_blank">Ver en Facebook</a>
        </div>`;
    });
  } catch (err) {
    errorBox.innerText = "Error Facebook: " + err.message;
  }
}

window.cargarPostsFacebook = cargarPostsFacebook;

// =========================
// STREAMING + PLAYER
// =========================
function getFileNameFromKey(key) {
  return key?.split("/").pop() || "archivo";
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < u.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${u[i]}`;
}

function setFeatured(videoObj) {
  const mainVideo = document.getElementById("main-video");
  const mainFilename = document.getElementById("main-filename");
  const mainExtra = document.getElementById("main-extra");

  mainVideo.pause();
  mainVideo.src = videoObj.url;
  mainVideo.currentTime = 0;
  mainVideo.muted = true;
  mainVideo.play().catch(() => {});

  mainFilename.textContent = getFileNameFromKey(videoObj.key);

  mainExtra.textContent =
    `Tamaño: ${formatBytes(videoObj.size)} · ` +
    new Date(videoObj.lastModified).toLocaleString();

  document.querySelector(".player")?.scrollIntoView({ behavior: "smooth" });
}

async function loadVideos(keepKey) {
  const grid = document.getElementById("videos-grid");
  grid.innerHTML = "Cargando...";

  try {
    const res = await fetch(`${API_BASE}/videos`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    grid.innerHTML = "";
    const videos = data.videos;

    if (!videos?.length) {
      grid.innerHTML = "<em>Sin videos</em>";
      return;
    }

    let featured = videos[0];
    if (keepKey) featured = videos.find((v) => v.key === keepKey) || featured;

    setFeatured(featured);

    videos.forEach((v) => {
      const card = document.createElement("div");
      card.className = "video-card";
      card.innerHTML = `
        <div class="video-wrap">
          <video class="hover-video" muted loop src="${v.url}"></video>
        </div>
        <div class="video-meta">
          <b>${getFileNameFromKey(v.key)}</b><br>
          ${formatBytes(v.size)}
        </div>
      `;

      card.addEventListener("click", () => setFeatured(v));
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = "Error al cargar videos";
  }
}

// =========================
// SUBIR VIDEOS
// =========================
async function handleUpload(e) {
  e.preventDefault();

  const status = document.getElementById("upload-status");
  const input = document.getElementById("video");
  const file = input.files[0];

  status.textContent = "Subiendo...";

  try {
    const fd = new FormData();
    fd.append("video", file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    status.textContent = "✔ Subido";
    loadVideos();
    input.value = "";
  } catch (err) {
    status.textContent = "Error: " + err.message;
  }
}

// =========================
// STRIPE
// =========================
async function pagar() {
  const email = document.getElementById("buyerEmail").value.trim();
  if (!email) return alert("Ingresa tu correo.");

  try {
    const res = await fetch(`${API_BASE}/crear-pago`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerEmail: email,
        items: [{ name: "Donación ARK", qty: 1, price: 12 }],
      }),
    });

    const data = await res.json();

    if (data.url) window.location.href = data.url;
    else alert("Error al iniciar pago");
  } catch (e) {
    alert("Error: " + e.message);
  }
}

window.pagar = pagar;

// =========================
// MAPBOX 3D — FIX APLICADO
// =========================
let MAPBOX_TOKEN = "";

async function loadMapboxTokenAndInit() {
  const err = document.getElementById("map3d-error");

  try {
    const res = await fetch(`${API_BASE}/config/mapbox`);
    const { mapboxToken, error } = await res.json();

    if (!mapboxToken) throw new Error(error || "Token ausente");
    if (!window.mapboxgl)
      throw new Error("Mapbox GL JS no cargado (revisa el script)");

    MAPBOX_TOKEN = mapboxToken;
    initMap3DWalk();
  } catch (e) {
    err.textContent = "Mapbox falló: " + e.message;
  }
}

function initMap3DWalk() {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    container: "map3d",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-99.1332, 19.4326],
    zoom: 16,
    pitch: 60,
    bearing: 40,
    antialias: true,
  });

  map.addControl(new mapboxgl.NavigationControl());

  map.on("style.load", () => {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
    });

    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

    setupFirstPerson(map);
  });
}

// =========================
// FREECAMERA FIX
// =========================
function setupFirstPerson(map) {
  let pos = { lng: -99.1332, lat: 19.4326, alt: 20 };
  let yaw = 0, pitch = 0;
  const keys = new Set();
  let last = performance.now();

  window.addEventListener("keydown", (e) => keys.add(e.code));
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  function tick(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    const speed = 10 * dt;

    if (keys.has("KeyW")) pos.lat += speed * 0.0001;
    if (keys.has("KeyS")) pos.lat -= speed * 0.0001;
    if (keys.has("KeyA")) pos.lng -= speed * 0.0001;
    if (keys.has("KeyD")) pos.lng += speed * 0.0001;

    const mc = mapboxgl.MercatorCoordinate.fromLngLat(
      [pos.lng, pos.lat],
      pos.alt
    );

    const cam = map.getFreeCameraOptions();
    cam.position = [mc.x, mc.y, mc.z]; // ← FIX IMPORTANTE

    cam.lookAtPoint([pos.lng, pos.lat]);
    map.setFreeCameraOptions(cam);

    requestAnimationFrame(tick);
  }

  tick(last);
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
  document.getElementById("refreshBtn")?.addEventListener("click", () => loadVideos());
  loadVideos();
  loadMapboxTokenAndInit();
});