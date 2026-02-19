// BOTONES
function irYoutube(){
  window.open("https://www.youtube.com", "_blank");
}

function irFacebook(){
  window.open("https://www.facebook.com", "_blank");
}

// 2FA SIMPLE
const codigoCorrecto = "123456";

function verificarCodigo(){
  const codigo = document.getElementById("codigo").value;
  if(codigo === codigoCorrecto){
    alert("Verificación correcta ✅");
  } else {
    alert("Código incorrecto ❌");
  }
}

// MAPA GOOGLE
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
async function preguntarIA(){
  const pregunta = document.getElementById("pregunta").value;

  const res = await fetch("http://localhost:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta })
  });

  const data = await res.json();
  document.getElementById("respuesta").innerText = data.respuesta;
}

window.initMap = initMap;