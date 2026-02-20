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
// STREAMING (Cloudflare R2)
//////////////////////
function getFileNameFromKey(key) {
  try {
    return (key || '').split('/').pop() || key || 'archivo';
  } catch {
    return key || 'archivo';
  }
}

async function loadVideos() {
  const grid = document.getElementById("videos-grid");
  if (!grid) return;

  grid.innerHTML = "Cargando...";

  try {
    const r = await fetch("/videos");
    const data = await r.json();
    grid.innerHTML = "";

    (data.videos || []).forEach((v) => {
      const fileName = getFileNameFromKey(v.key);
      const card = document.createElement("div");
      card.className = "video-card";
      card.style.maxWidth = "360px";
      card.title = v.key; // tooltip con key completa

      card.innerHTML = `
        <div class="video-wrap">
          <video
            class="hover-video"
            muted
            playsinline
            preload="metadata"
            src="${v.url}">
          </video>

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
          <div><b>Tamaño:</b> ${(v.size / 1024 / 1024).toFixed(1)} MB</div>
          <div><b>Modificado:</b> ${new Date(v.lastModified).toLocaleString()}</div>
        </div>
      `;

      // Reproducción al hover “tipo YouTube”
      const vid = card.querySelector(".hover-video");
      if (vid) {
        // Hover desktop
        card.addEventListener("mouseenter", () => {
          vid.currentTime = 0;
          const p = vid.play();
          // algunos navegadores pueden bloquear; lo ignoramos
          if (p && typeof p.catch === "function") p.catch(() => {});
        });
        card.addEventListener("mouseleave", () => {
          vid.pause();
          vid.currentTime = 0;
        });

        // Soporte táctil (tap para reproducir/pausar)
        card.addEventListener("click", () => {
          if (vid.paused) {
            const p = vid.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          } else {
            vid.pause();
          }
        });
      }

      grid.appendChild(card);
    });

    if (!data.videos || !data.videos.length) {
      grid.innerHTML = "<em>Sin videos</em>";
    }
  } catch (e) {
    grid.innerHTML = "Error al cargar videos";
    console.error(e);
  }
}

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

//////////////////////
// INIT
//////////////////////
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uploadForm")?.addEventListener("submit", handleUpload);
  document.getElementById("refreshBtn")?.addEventListener("click", loadVideos);
  loadVideos(); // carga inicial
});