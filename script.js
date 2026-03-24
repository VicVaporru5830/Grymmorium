async function preguntarIA() {
 const pregunta = document.getElementById("pregunta").value;
 const respuestaBox = document.getElementById("respuesta");
 respuestaBox.innerText = "Invocando al oráculo...";

 try {
   const res = await fetch(`/chat`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ pregunta }),
   });

   const data = await res.json();
   respuestaBox.innerText = data.respuesta;
 } catch {
   respuestaBox.innerText = "El espíritu no respondió...";
 }
}