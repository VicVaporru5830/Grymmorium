// mailer.js – versión temática de magia
const sg = require("@sendgrid/mail");
const { generateReceiptPDF } = require("./pdf");

if (!process.env.SENDGRID_API_KEY) {
  console.warn("⚠️ SENDGRID_API_KEY no definida.");
} else {
  sg.setApiKey(process.env.SENDGRID_API_KEY);
}

function asPercent(n) {
  return `${Math.round(Number(n || 0) * 100)}%`;
}

// --------------------------------------------------------
// CORREO DE COMPRA – ESTILO MÁGICO
// --------------------------------------------------------
async function sendReceiptEmail({ session, lineItems }) {
  const buyer =
    session?.customer_details?.email ||
    session?.customer_email ||
    null;

  if (!buyer) {
    console.warn("⚠️ Sin email del mago comprador.");
    return;
  }

  const ivaRate = process.env.IVA_RATE ? Number(process.env.IVA_RATE) : 0.16;

  const seller = {
    name: process.env.SELLER_NAME || "MAGIA ARCANA",
    taxId: process.env.SELLER_TAX_ID || "",
    address: process.env.SELLER_ADDRESS || "Torre Central, Reino Arcano",
    email: process.env.SELLER_EMAIL || process.env.MAIL_FROM
  };

  let pdfBuffer = null;
  try {
    pdfBuffer = await generateReceiptPDF({
      session,
      lineItems,
      ivaRate,
      seller
    });
  } catch (e) {
    console.error("❌ Error generando PDF mágico:", e);
  }

  const amount = ((session?.amount_total || 0) / 100).toFixed(2);
  const currency = (session?.currency || "mxn").toUpperCase();

  const itemsHtml = (lineItems || [])
    .map(i => `<li>${i.quantity || 1} × ${i.description || "Hechizo"} — ${(i.amount_total / 100).toFixed(2)} ${currency}</li>`)
    .join("");

  const html = `
    <h2>✨ Gracias por tu compra mágica ✨</h2>
    <p>Tu ritual de intercambio fue completado con éxito.</p>

    <p><b>Total del ritual:</b> ${amount} ${currency}</p>

    <h3>Artefactos adquiridos:</h3>
    <ul>${itemsHtml}</ul>

    <p><b>ID del conjuro:</b> ${session?.id}</p>
    <p>Adjuntamos tu recibo arcano en PDF con el desglose energético.</p>
  `;

  const text =
    [
      "Gracias por tu compra mágica",
      `Total del ritual: ${amount} ${currency}`,
      "Artefactos:",
      ...(lineItems || []).map(
        i => `- ${i.quantity || 1} × ${i.description || "Hechizo"} — ${(i.amount_total / 100).toFixed(2)} ${currency}`
      ),
      `ID del conjuro: ${session?.id}`,
      `Energía Arcana en PDF: ${asPercent(ivaRate)}`
    ].join("\n");

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      content: pdfBuffer.toString("base64"),
      filename: `Recibo-Magia-${session?.id || "compra"}.pdf`,
      type: "application/pdf",
      disposition: "attachment"
    });
  }

  try {
    await sg.send({
      to: buyer,
      from: process.env.MAIL_FROM,
      subject: "✨ Tu Recibo Arcano (PDF) – Magia Arcana",
      html,
      text,
      attachments
    });

    console.log("📧 Recibo mágico enviado →", buyer);
  } catch (err) {
    console.error("❌ Error SendGrid mágico:", err?.response?.body || err);
  }
}

// --------------------------------------------------------
// 2FA – CÓDIGO MÁGICO
// --------------------------------------------------------
async function sendVerificationCode(email, code) {
  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM no está configurado.");
  }

  const html = `
    <h2>🔮 Tu código de acceso arcano</h2>
    <p>Este es tu código mágico para autenticarte:</p>

    <div style="
      font-size: 34px;
      font-weight: bold;
      background: #efe6ff;
      padding: 20px;
      text-align: center;
      letter-spacing: 6px;
      border-radius: 10px;
      color:#4b148a;
    ">
      ${code}
    </div>

    <p>Válido durante <b>10 minutos</b>.</p>
    <p>Si no solicitaste este ritual, simplemente ignóralo.</p>
  `;

  const text = `Tu código arcano es: ${code}\nVálido 10 minutos.\nSi no lo solicitaste, ignora este mensaje.`

  await sg.send({
    to: email,
    from: process.env.MAIL_FROM,
    subject: "🔮 Código de Acceso Arcano",
    html,
    text
  });

  console.log(`📩 Código mágico enviado → ${email}`);
}

module.exports = {
  sendReceiptEmail,
  sendVerificationCode
};