//////////////////////
// 2FA SIMPLE
//////////////////////
const codigoCorrecto = "123456";

function verificarCodigo(){
  const codigo = document.getElementById("codigo").value;
  const msg = document.getElementById("verificacion-msg");

  if(codigo === codigoCorrecto){
    msg.innerText = "Verificación correcta ✅";
    msg.style.color = "green";
  } else {
    msg.innerText = "Código incorrecto ❌";
    msg.style.color = "red";
  }
}

//////////////////////
// GOOGLE MAPS
//////////////////////
function initMap() {
  try {
    const ubicacion = { lat: 19.4326, lng: -99.1332 };

    const map = new google.maps.Map(document.getElementById("map"), {
      zoom: 10,
      center: ubicacion,
    });

    new google.maps.Marker({
      position: ubicacion,
      map: map,
    });

  } catch (error) {
    document.getElementById("map-error").innerText =
      "Error cargando Google Maps: " + error.message;
  }
}
window.initMap = initMap;

//////////////////////
// IA DINOSAURIOS
//////////////////////
async function preguntarIA(){
  const pregunta = document.getElementById("pregunta").value;
  const respuestaBox = document.getElementById("respuesta");

  if(!pregunta) return;
  respuestaBox.innerText = "Cargando...";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    respuestaBox.innerText = data.respuesta;

  } catch(error){
    respuestaBox.innerText = "Error IA: " + error.message;
  }
}

//////////////////////
// YOUTUBE
//////////////////////
async function cargarVideosYouTube(){
  const contenedor = document.getElementById("youtube-videos");
  const errorBox = document.getElementById("youtube-error");

  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando videos...";

  try {
    const res = await fetch("/youtube");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    errorBox.innerText = "";

    if(!data.items || data.items.length === 0){
      errorBox.innerText = "No se encontraron videos.";
      return;
    }

    data.items.forEach(item => {
      if(item.id.kind === "youtube#video"){
        contenedor.innerHTML += `
          <div class="video">
            <iframe width="300" height="170"
              src="https://www.youtube.com/embed/${item.id.videoId}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
            <p>${item.snippet.title}</p>
          </div>
        `;
      }
    });

  } catch(err){
    errorBox.innerText = "Error YouTube: " + err.message;
  }
}

//////////////////////
// FACEBOOK
//////////////////////
async function cargarPostsFacebook(){
  const contenedor = document.getElementById("facebook-posts");
  const errorBox = document.getElementById("facebook-error");

  contenedor.innerHTML = "";
  errorBox.innerText = "Cargando publicaciones...";

  try{
    const res = await fetch("/facebook");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    errorBox.innerText = "";

    if(!data.data || data.data.length === 0){
      errorBox.innerText = "No se encontraron publicaciones.";
      return;
    }

    data.data.forEach(post => {
      contenedor.innerHTML += `
        <div class="fb-post">
          <p>${post.message || "[Sin mensaje]"}</p>
          <a href="${post.permalink_url}" target="_blank" rel="noopener noreferrer">
            Ver en Facebook
          </a>
        </div>
      `;
    });

  } catch(err){
    errorBox.innerText = "Error Facebook: " + err.message;
  }
}

//////////////////////
// STREAMING (Cloudflare R2) — con “player” principal
//////////////////////
function getFileNameFromKey(key) {
  try { return (key || '').split('/').pop() || key || 'archivo'; }
  catch { return key || 'archivo'; }
}
function formatBytes(bytes){
  if (bytes === undefined || bytes === null) return '';
  const u = ['B','KB','MB','GB','TB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 1 ? 1 : 0)} ${u[i]}`;
}

/** Coloca un video en el reproductor principal */
function setFeatured(videoObj){
  const mainVideo = document.getElementById('main-video');
  const mainFilename = document.getElementById('main-filename');
  const mainExtra = document.getElementById('main-extra');
  if (!mainVideo) return;

  // Pausa y asigna nueva fuente
  try { mainVideo.pause(); } catch {}
  mainVideo.src = videoObj?.url || '';
  mainVideo.currentTime = 0;

  // Metadata visible
  const name = getFileNameFromKey(videoObj?.key || '');
  mainFilename.textContent = name || 'Video';
  const sizeTxt = formatBytes(videoObj?.size);
  const dateTxt = videoObj?.lastModified ? new Date(videoObj.lastModified).toLocaleString() : '';
  mainExtra.textContent = `${sizeTxt ? `Tamaño: ${sizeTxt} · ` : ''}${dateTxt ? `Modificado: ${dateTxt}` : ''}`;
}

/** Construye tarjetas con hover‑preview y click -> ver en grande */
async function loadVideos() {
  const grid = document.getElementById("videos-grid");
  if (!grid) return;

  grid.innerHTML = "Cargando...";

  try {
    const r = await fetch("/videos");
    const data = await r.json();
    grid.innerHTML = "";

    const videos = data.videos || [];
    if (!videos.length) {
      grid.innerHTML = "<em>Sin videos</em>";
      setFeatured({ url: "", key: "", size: 0, lastModified: null });
      return;
    }

    // Coloca el primero como “featured” al cargar
    setFeatured(videos[0]);

    videos.forEach((v) => {
      const fileName = getFileNameFromKey(v.key);

      const card = document.createElement("div");
      card.className = "video-card";
      card.style.maxWidth = "360px";
      card.title = v.key; // tooltip con la key completa

      // 🔴 MUY IMPORTANTE: el <video> de miniatura debe tener src
      card.innerHTML = `
        <div class="video-wrap">
          <video class="hover-video" muted playsinline preload="metadata" src="${v.url}"></video>

          <div class="play-badge" aria-hidden="true">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="44" opacity=".25"></circle>
              <polygon points="40,30 75,50 40,70"></polygon>
            </svg>
          </div>

          <div class="video-overlay">
            <span class="video-filename">${fileName}</span>
          </div>
        </div>

        <div class="video-meta">
          <div><b>Tamaño:</b> ${formatBytes(v.size)}</div>
          <div><b>Modificado:</b> ${v.lastModified ? new Date(v.lastModified).toLocaleString() : ''}</div>
        </div>
      `;

      // Hover preview (autoplay silencioso al pasar el cursor)
      const thumb = card.querySelector(".hover-video");
      if (thumb) {
        card.addEventListener("mouseenter", () => {
          thumb.currentTime = 0;
          const p = thumb.play();
          if (p && typeof p.catch === "function") p.catch(()=>{});
        });
        card.addEventListener("mouseleave", () => {
          thumb.pause();
          thumb.currentTime = 0;
        });
      }

      // Click -> envía el video al reproductor grande
      card.addEventListener("click", async () => {
        // Intenta cargarlo
        setFeatured(v);

        // (Opcional) Verificación rápida por si la URL ya expiró: hace una HEAD y si falla, refresca
        try {
          const head = await fetch(v.url, { method: 'HEAD' });
          if (!head.ok) throw new Error(String(head.status));
        } catch {
          // Refresca lista para regenerar URLs prefirmadas
          await loadVideos();
        }
      });

      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = "Error al cargar videos";
    console.error(e);
  }
}

/** Subida de archivos al backend (que guarda en R2) */
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

    const r = await fetch("/upload", { method: "POST", body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error de subida");

    status.textContent = "✓ Subido";
    await loadVideos();
  } catch (err) {
    status.textContent = "Error: " + err.message;
  } finally {
    setTimeout(() => (status.textContent = ""), 3000);
    if (input) input.value = "";
  }
}

/** Inicialización */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
  document.getElementById("refreshBtn")?.addEventListener("click", loadVideos);
  loadVideos(); // carga inicial
});

//////////////////////
// INIT
//////////////////////
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
  document.getElementById("refreshBtn")?.addEventListener("click", loadVideos);
  loadVideos(); // carga inicial
});