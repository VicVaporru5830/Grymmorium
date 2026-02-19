//////////////////////
// BOTONES ANTIGUOS //
//////////////////////
function irYoutube(){
  window.open("https://www.youtube.com", "_blank");
}

function irFacebook(){
  window.open("https://www.facebook.com", "_blank");
}

//////////////////////
// 2FA SIMPLE       //
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
// GOOGLE MAPS       //
//////////////////////
function initMap() {
  const ubicacion = { lat: 19.4326, lng: -99.1332 };

  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: ubicacion,
  });

  new google.maps.Marker({
    position: ubicacion,
    map: map,
  });
}

window.initMap = initMap;

//////////////////////
// CHAT IA DINOSAURIOS //
//////////////////////
async function preguntarIA(){
  const pregunta = document.getElementById("pregunta").value;

  if(!pregunta) return;

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta })
  });

  const data = await res.json();
  document.getElementById("respuesta").innerText = data.respuesta;
}

//////////////////////
// YOUTUBE API       //
//////////////////////
const YT_API_KEY = "TU_YOUTUBE_API_KEY"; // reemplaza con tu key
const YT_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw"; // ejemplo

async function cargarVideosYouTube(){
  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_API_KEY}&channelId=${YT_CHANNEL_ID}&part=snippet,id&order=date&maxResults=3`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const contenedor = document.getElementById("youtube-videos");
    contenedor.innerHTML = "";
    data.items.forEach(item => {
      if(item.id.kind === "youtube#video"){
        contenedor.innerHTML += `
          <div class="video">
            <iframe width="300" height="170" src="https://www.youtube.com/embed/${item.id.videoId}" frameborder="0" allowfullscreen></iframe>
            <p>${item.snippet.title}</p>
          </div>
        `;
      }
    });
  } catch(err){
    console.error("Error YouTube API:", err);
  }
}

//////////////////////
// FACEBOOK API      //
//////////////////////
const FB_PAGE_ID = "cocacola"; // Página pública de ejemplo
const FB_ACCESS_TOKEN = "TU_FACEBOOK_ACCESS_TOKEN"; // reemplaza con tu token

async function cargarPostsFacebook(){
  const url = `https://graph.facebook.com/v16.0/${FB_PAGE_ID}/posts?access_token=${FB_ACCESS_TOKEN}&fields=message,created_time,permalink_url&limit=3`;
  try{
    const res = await fetch(url);
    const data = await res.json();
    const contenedor = document.getElementById("facebook-posts");
    contenedor.innerHTML = "";
    data.data.forEach(post => {
      contenedor.innerHTML += `
        <div class="fb-post">
          <p>${post.message || "[Sin mensaje]"}</p>
          <a href="${post.permalink_url}" target="_blank">Ver en Facebook</a>
        </div>
      `;
    });
  } catch(err){
    console.error("Error Facebook API:", err);
  }
}