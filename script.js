//** -------------- SCRIPT.JS COMPLETO (MAGIA + CORREGIDO) -------------- **/

/* ============================
   script.js — Tema Magia Arcana
   ============================
   - Google Maps 2D
   - Mapbox GL 3D (walk mode)
   - IA mágica
   - YouTube mágico
   - Facebook
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
  const email = prompt("Ingresa tu correo para enviarte el código mágico:");

  if (!email) return alert("Debes ingresar un correo.");

  try {
    const r = await fetch(`${API_BASE}/enviar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await r.json();

    if (!r.ok) return alert("Error: " + data.error);

    alert("Código mágico enviado a tu correo ✨");
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
    msg.innerText = "Ingresa el código arcano";
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
// IA MÁGICA (CLIENTE)
//////////////////////
async function preguntarIA() {
  const pregunta = document.getElementById("pregunta")?.value || "";
  const respuestaBox = document.getElementById("respuesta");

  if (!pregunta) return;

  respuestaBox.innerText = "Invocando sabiduría arcana...";

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

//////////////////////
// YOUTUBE (CLIENTE)
//////////////////////
async function cargarVideosYouTube() {
  const contenedor = document.getElementById("youtube-videos");
  const errorBox = document.getElementById("youtube-error");

  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando videos mágicos...";

  try {
    const res = await fetch(`${API_BASE}/youtube`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error desconocido");

    errorBox.innerText = "";

    data.items.forEach((item) => {
      if (item.id?.kind === "youtube#video") {
        const vid = item.id.videoId;
        const title = item.snippet?.title || "Video mágico";

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
// FACEBOOK
//////////////////////
function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

async function cargarPostsFacebook() {
  const contenedor = document.getElementById("facebook-posts");
  const errorBox = document.getElementById("facebook-error");

  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando publicaciones mágicas...";

  try {
    const res = await fetch(`${API_BASE}/facebook`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Error desconocido");

    errorBox.innerText = "";

    data.data.forEach((post) => {
      const msg = post.message ? escapeHtml(post.message) : "[Sin mensaje]";
      const link = post.permalink_url || "#";

      contenedor.innerHTML += `
        <div class="fb-post">
          <p>${msg}</p>
          <a href="${link}" target="_blank">Ver en Facebook</a>
        </div>
      `;
    });

  } catch (err) {
    errorBox.innerText = "Error Facebook: " + err.message;
  }
}
window.cargarPostsFacebook = cargarPostsFacebook;

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

      const thumb = card.querySelector(".hover-video");

      card.addEventListener("mouseenter", () => {
        thumb.currentTime = 0;
        thumb.play().catch(() => {});
      });

      card.addEventListener("mouseleave", () => {
        thumb.pause();
        thumb.currentTime = 0;
      });

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
      alert("Ingresa tu correo para enviarte el recibo mágico.");
      emailInput?.focus();
      return;
    }

    const items = [{ name: "Donación Mágica", qty: 1, price: 12.0 }];

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
// MAPBOX 3D — CORREGIDO
//////////////////////
let MAPBOX_TOKEN = "";

async function loadMapboxTokenAndInit() {
  const err = document.getElementById("map3d-error");

  try {
    const r = await fetch(`${API_BASE}/config/mapbox`, { cache: "no-store" });
    const { mapboxToken, error } = await r.json();

    if (!r.ok || !mapboxToken || error)
      throw new Error(error || "MAPBOX_PUBLIC_TOKEN ausente");

    if (!window.mapboxgl)
      throw new Error("Mapbox GL JS no cargado");

    MAPBOX_TOKEN = mapboxToken;

    initMap3DWalk();

  } catch (e) {
    err.textContent = "Mapbox no inicializó: " + e.message;
    console.error(e);
  }
}

function initMap3DWalk() {
  mapboxgl.accessToken = MAPBOX_TOKEN;

  const el = document.getElementById("map3d");
  if (!el) return;

  try {
    const map = new mapboxgl.Map({
      container: "map3d",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-99.1332, 19.4326],
      zoom: 16,
      pitch: 60,
      bearing: 40,
      antialias: true
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.FullscreenControl());

    const hint = document.createElement("div");
    Object.assign(hint.style, {
      position: "absolute",
      right: "10px",
      bottom: "10px",
      background: "rgba(0,0,0,.7)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      fontSize: "11px",
      pointerEvents: "none",
      zIndex: "1000"
    });
    hint.textContent = "🎮 Click para activar | W/A/S/D mover | Ratón mirar | Q/E altura | Shift correr";
    el.appendChild(hint);

    map.on("load", () => {
      map.setFog({ range: [0.5, 10], color: "#dcd6ff" });

      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14
      });

      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.3 });

      map.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#aaa",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.6
        }
      });

      setupFirstPerson(map, el);
    });

  } catch (err) {
    console.error(err);
  }
}

function setupFirstPerson(map, containerEl) {
  let pos = { lng: map.getCenter().lng, lat: map.getCenter().lat, alt: 20 };
  let yaw = map.getBearing() * Math.PI / 180;
  let pitch = -10 * Math.PI / 180;
  let speed = 3.0;

  const sprint = 2.0;
  const deg = Math.PI / 180;
  const EARTH_R = 6378137;

  const keys = new Set();
  let pointerLocked = false;
  let lastTs = performance.now();
  let isMoving = false;

  containerEl.addEventListener("click", () => {
    if (!pointerLocked) containerEl.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = (document.pointerLockElement === containerEl);
    if (!pointerLocked) isMoving = false;
  });

  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked) return;

    const sens = 0.0025;
    yaw -= e.movementX * sens;
    pitch -= e.movementY * sens;

    const maxPitch = 85 * deg;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
  });

  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (["KeyW", "KeyS", "KeyA", "KeyD", "ShiftLeft"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => keys.delete(e.code));

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrapLng(lng) {
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    return lng;
  }

  function step(dt) {
    if (!pointerLocked) return;

    const fx = Math.cos(yaw);
    const fy = Math.sin(yaw);
    const rx = -Math.sin(yaw);
    const ry = Math.cos(yaw);

    let v = speed * (keys.has("ShiftLeft") ? sprint : 1);
    let dx = 0, dy = 0;

    if (keys.has("KeyW")) { dx += fx * v * dt; dy += fy * v * dt; }
    if (keys.has("KeyS")) { dx -= fx * v * dt; dy -= fy * v * dt; }
    if (keys.has("KeyA")) { dx -= rx * v * dt; dy -= ry * v * dt; }
    if (keys.has("KeyD")) { dx += rx * v * dt; dy += ry * v * dt; }

    const dLat = (dy / EARTH_R) * (180 / Math.PI);
    const dLng = (dx / (EARTH_R * Math.cos(pos.lat * deg))) * (180 / Math.PI);

    pos.lat = clamp(pos.lat + dLat, -85, 85);
    pos.lng = wrapLng(pos.lng + dLng);

    const cam = map.getFreeCameraOptions();
    const mc = mapboxgl.MercatorCoordinate.fromLngLat([pos.lng, pos.lat], pos.alt);

    cam.position = [mc.x, mc.y, mc.z];

    const lookDist = 20;

    const lx = Math.cos(pitch) * Math.cos(yaw);
    const ly = Math.cos(pitch) * Math.sin(yaw);

    const targetLat = pos.lat + (lookDist * ly / EARTH_R) * (180 / Math.PI);
    const targetLng = pos.lng + (lookDist * lx / (EARTH_R * Math.cos(pos.lat * deg))) * (180 / Math.PI);

    cam.lookAtPoint([targetLng, targetLat]);

    map.setFreeCameraOptions(cam);
  }

  function animate(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;
    step(dt);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

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
