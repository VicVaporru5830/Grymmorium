// mailer.js (tema mágico astral)
const sg = require("@sendgrid/mail");
const { generateReceiptPDF } = require("./pdf");

// ===============================
// CONFIG SENDGRID
// ===============================
if (!process.env.SENDGRID_API_KEY) {
  console.warn("⚠️ SENDGRID_API_KEY no está definida. No se enviarán correos.");
} else {
  sg.setApiKey(process.env.SENDGRID_API_KEY);
}

function asPercent(n) { return `${Math.round((Number(n || 0)) * 100)}%`; }

// ===============================
// ENVÍO DEL TICKET DE COMPRA (tema mágico)
// ===============================
async function sendReceiptEmail({ session, lineItems }) {
  const buyer = session?.customer_details?.email || session?.customer_email || null;
  if (!buyer) {
    console.warn("⚠️ Sin email en la sesión. No se envía ticket. session.id:", session?.id);
    return;
  }

  const ivaRate = process.env.IVA_RATE ? Number(process.env.IVA_RATE) : 0.16;
  const seller = {
    name: process.env.SELLER_NAME || "Grymmorium",
    taxId: process.env.SELLER_TAX_ID || "",
    address: process.env.SELLER_ADDRESS || "",
    email: process.env.SELLER_EMAIL || process.env.MAIL_FROM
  };

  // Generar PDF
  let pdfBuffer = null;
  try { pdfBuffer = await generateReceiptPDF({ session, lineItems, ivaRate, seller }); }
  catch (e) { console.error("✖ Error generando PDF:", e); }

  const amount = ((session?.amount_total || 0) / 100).toFixed(2);
  const currency = (session?.currency || "mxn").toUpperCase();
  const itemsHtml = (lineItems || [])
    .map(i => `- ${i.quantity || 1} × ${i.description || "Artículo"} — ${((i.amount_total || 0) / 100).toFixed(2)} ${currency}`)
    .join("\n");

  const html = `
<h3>Gracias por tu ofrenda</h3>
<p>Tu pago fue aceptado por el Cónclave.</p>
<p><b>Total canalizado:</b> ${amount} ${currency}</p>
<h4>Detalle</h4>
<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${itemsHtml}</pre>
<p><b>Folio Stripe:</b> ${session?.id}</p>
<p>Adjuntamos tu <i>recibo arcano</i> (PDF) con desglose de IVA.</p>
`;
  const text = [
    "Gracias por tu ofrenda",
    `Total canalizado: ${amount} ${currency}`,
    "Detalle:",
    ...(lineItems || []).map(i => `- ${(i.quantity || 1)} × ${(i.description || "Artículo")} — ${((i.amount_total || 0)/100).toFixed(2)} ${currency}`),
    `Folio Stripe: ${session?.id}`,
    `IVA aplicado en PDF: ${asPercent(ivaRate)}`
  ].join("\n");

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      content: pdfBuffer.toString('base64'),
      filename: `Recibo-Arcano-${session?.id || 'compra'}.pdf`,
      type: 'application/pdf',
      disposition: 'attachment'
    });
  }

  // Enviar al comprador
  try {
    if (!process.env.MAIL_FROM) throw new Error("MAIL_FROM no está configurado (debe ser sender verificado en SendGrid).");
    const [resp] = await sg.send({
      to: buyer,
      from: process.env.MAIL_FROM,
      subject: "🔮 Tu recibo arcano (PDF) — Grymmorium",
      html,
      text,
      attachments
    });
    console.log("📧 Recibo enviado →", buyer, "\n SendGrid:", resp?.statusCode);
  } catch (err) {
    console.error("✖ SendGrid error (comprador):", err?.response?.body || err?.message || err);
  }

  // Copia al vendedor
  if (process.env.SELLER_EMAIL) {
    try {
      const [copy] = await sg.send({
        to: process.env.SELLER_EMAIL,
        from: process.env.MAIL_FROM,
        subject: "✨ Nueva ofrenda recibida — Grymmorium (PDF adjunto)",
        html,
        text,
        attachments
      });
      console.log("📨 Copia vendedor OK →", process.env.SELLER_EMAIL, "\n SendGrid:", copy?.statusCode);
    } catch (err) {
      console.error("✖ SendGrid error (vendedor):", err?.response?.body || err?.message || err);
    }
  }
}

// ===============================
// 2FA — ENVÍO DEL CÓDIGO POR EMAIL
// ===============================
async function sendVerificationCode(email, code) {
  if (!process.env.MAIL_FROM) {
    throw new Error("MAIL_FROM no está configurado en .env");
  }
  const html = `
<h3>Tu sello de verificación</h3>
<p>Este es tu sello para validar tu identidad en Grymmorium:</p>
<h2 style="letter-spacing:2px;">${code}</h2>
<p>Válido por 5 minutos.</p>
`;
  const text = `Tu sello de verificación es: ${code}`;
  try {
    const [resp] = await sg.send({
      to: email,
      from: process.env.MAIL_FROM,
      subject: "🔐 Sello de Verificación (2FA) — Grymmorium",
      html,
      text
    });
    console.log("📩 Sello 2FA enviado →", email, "\n SendGrid:", resp?.statusCode);
  } catch (err) {
    console.error("✖ Error enviando sello 2FA:", err?.response?.body || err?.message || err);
  }
}

module.exports = { sendReceiptEmail, sendVerificationCode };