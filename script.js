//////////////////////
// BASE DEL API
//////////////////////
const API_BASE = window.location.origin; // mismo host/puerto del server

//////////////////////
// 2FA SIMPLE
//////////////////////
const codigoCorrecto = "123456";

function verificarCodigo() {
  const codigo = document.getElementById("codigo").value;
  const msg = document.getElementById("verificacion-msg");

  if (codigo === codigoCorrecto) {
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

    new google.maps.Marker({ position: ubicacion, map });
  } catch (error) {
    document.getElementById("map-error").innerText =
      "Error cargando Google Maps: " + error.message;
  }
}
window.initMap = initMap;

//////////////////////
// IA DINOSAURIOS
//////////////////////
async function preguntarIA() {
  const pregunta = document.getElementById("pregunta").value;
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
    respuestaBox.innerText = data.respuesta;
  } catch (error) {
    respuestaBox.innerText = "Error IA: " + error.message;
  }
}

//////////////////////
// YOUTUBE
//////////////////////
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

    if (!data.items || data.items.length === 0) {
      errorBox.innerText = "No se encontraron videos.";
      return;
    }

    data.items.forEach((item) => {
      if (item.id.kind === "youtube#video") {
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
  } catch (err) {
    errorBox.innerText = "Error YouTube: " + err.message;
  }
}

//////////////////////
// FACEBOOK
//////////////////////
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

    if (!data.data || data.data.length === 0) {
      errorBox.innerText = "No se encontraron publicaciones.";
      return;
    }

    data.data.forEach((post) => {
      contenedor.innerHTML += `
        <div class="fb-post">
          <p>${post.message || "[Sin mensaje]"}</p>
          <a href="${post.permalink_url}" target="_blank" rel="noopener noreferrer">
            Ver en Facebook
          </a>
        </div>
      `;
    });
  } catch (err) {
    errorBox.innerText = "Error Facebook: " + err.message;
  }
}

//////////////////////
// STREAMING (Cloudflare R2)
//////////////////////
function getFileNameFromKey(key) {
  try { return (key || "").split("/").pop() || key || "archivo"; }
  catch { return key || "archivo"; }
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

  try { mainVideo.pause(); } catch {}
  mainVideo.src = videoObj?.url || "";
  mainVideo.currentTime = 0;

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
  if (!grid) return;

  grid.innerHTML = "Cargando...";

  try {
    const r = await fetch(`${API_BASE}/videos`);
    const data = await r.json();
    grid.innerHTML = "";

    const videos = data.videos || [];
    if (!videos.length) {
      grid.innerHTML = "<em>Sin videos</em>";
      setFeatured({ url: "", key: "", size: 0, lastModified: null });
      return;
    }

    let featured = videos[0];
    if (keepKey) {
      const found = videos.find((v) => v.key === keepKey);
      if (found) featured = found;
    }
    setFeatured(featured);

    videos.forEach((v) => {
      const fileName = getFileNameFromKey(v.key);

      const card = document.createElement("div");
      card.className = "video-card";
      card.style.maxWidth = "360px";
      card.title = v.key;

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
          <div><b>Modificado:</b> ${v.lastModified ? new Date(v.lastModified).toLocaleString() : ""}</div>
        </div>
      `;

      const thumb = card.querySelector(".hover-video");
      if (thumb) {
        card.addEventListener("mouseenter", () => {
          thumb.currentTime = 0;
          const p = thumb.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        });
        card.addEventListener("mouseleave", () => {
          thumb.pause();
          thumb.currentTime = 0;
        });
      }

      card.addEventListener("click", async () => {
        setFeatured(v);
        try {
          const head = await fetch(v.url, { method: "HEAD" });
          if (!head.ok) throw new Error(String(head.status));
        } catch {
          await loadVideos(v.key);
        }
      });

      grid.appendChild(card);
    });
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

    const r = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
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
// PAGOS (Stripe Checkout)
//////////////////////
async function pagar() {
  try {
    const emailInput = document.getElementById("buyerEmail");
    const buyerEmail = (emailInput?.value || "").trim();
    if (!buyerEmail) {
      alert("Ingresa tu correo para enviarte el ticket.");
      emailInput?.focus();
      return;
    }

    const items = [{ name: "Donación ARK", qty: 1, price: 12.0 }];

    const res = await fetch(`${window.location.origin}/crear-pago`, {
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
      alert("No se pudo iniciar el pago (sin URL de Stripe)");
    }
  } catch (e) {
    alert("Error al iniciar pago: " + e.message);
    console.error("❌ /crear-pago error:", e);
  }
}

//////////////////////
// VISOR 3D
//////////////////////

let scene;
let camera;
let renderer;
let model;
let controls;

function setModelStatus(msg){
const box=document.getElementById("model-status");
if(box) box.textContent=msg;
}

function init3D(){

const container=document.getElementById("viewer3d");

if(!container || !window.THREE){
console.warn("Three.js no cargado");
return;
}

scene=new THREE.Scene();

scene.background=new THREE.Color(0x111111);

camera=new THREE.PerspectiveCamera(
60,
container.clientWidth/container.clientHeight,
0.1,
2000
);

camera.position.set(2,2,4);

renderer=new THREE.WebGLRenderer({antialias:true});

renderer.setSize(
container.clientWidth,
container.clientHeight
);

renderer.setPixelRatio(window.devicePixelRatio);

container.appendChild(renderer.domElement);

const light=new THREE.HemisphereLight(0xffffff,0x444444,1);
scene.add(light);

const dir=new THREE.DirectionalLight(0xffffff,1);
dir.position.set(5,10,7);
scene.add(dir);

controls=new THREE.OrbitControls(
camera,
renderer.domElement
);

controls.enableDamping=true;

animate3D();

window.addEventListener("resize",()=>{

camera.aspect=
container.clientWidth/
container.clientHeight;

camera.updateProjectionMatrix();

renderer.setSize(
container.clientWidth,
container.clientHeight
);

});

setModelStatus("Visor listo");

}

function animate3D(){

requestAnimationFrame(animate3D);

if(controls) controls.update();

renderer.render(scene,camera);

}

function cargarModelo3D(){

const fileInput=document.getElementById("modelInput");

const file=fileInput.files[0];

if(!file){
alert("Selecciona un modelo");
return;
}

const url=URL.createObjectURL(file);

const ext=file.name.split(".").pop().toLowerCase();

clearModel();

if(ext==="glb"||ext==="gltf"){

const loader=new THREE.GLTFLoader();

loader.load(url,(gltf)=>{

model=gltf.scene;

scene.add(model);

fitModel(model);

});

}

else if(ext==="obj"){

const loader=new THREE.OBJLoader();

loader.load(url,(obj)=>{

model=obj;

scene.add(model);

fitModel(model);

});

}

else if(ext==="stl"){

const loader=new THREE.STLLoader();

loader.load(url,(geometry)=>{

const material=new THREE.MeshStandardMaterial({
color:0x888888
});

model=new THREE.Mesh(geometry,material);

scene.add(model);

fitModel(model);

});

}

else{

alert("Formato no soportado");

}

}

function clearModel(){

if(!model) return;

scene.remove(model);

model=null;

}

function fitModel(object){

const box=new THREE.Box3().setFromObject(object);

const size=new THREE.Vector3();

box.getSize(size);

const maxDim=Math.max(size.x,size.y,size.z);

camera.position.set(0,maxDim,maxDim*2);

controls.target.set(0,0,0);

controls.update();

}

function resetCamara3D(){

if(model) fitModel(model);

}

function toggleFondo3D(){

if(scene.background.getHex()==0x111111){

scene.background=new THREE.Color(0xffffff);

}else{

scene.background=new THREE.Color(0x111111);

}

}