// mailer.js — Funcional + estética astral
const sg = require("@sendgrid/mail");
const { generateReceiptPDF } = require("./pdf");

// ===============================
// SENDGRID CONFIG
// ===============================
if (!process.env.SENDGRID_API_KEY) {
  console.warn("⚠️ SENDGRID_API_KEY no definida. No se enviarán correos.");
} else {
  sg.setApiKey(process.env.SENDGRID_API_KEY);
}

// ===============================
// RECIBO ASTRAL (Stripe)
// ===============================
async function sendReceiptEmail({ session, lineItems }) {
  const buyer =
    session?.customer_details?.email ||
    session?.customer_email ||
    null;

  if (!buyer) {
    console.warn("⚠️ Sin email en la sesión. No se envía ticket.");
    return;
  }

  const ivaRate = process.env.IVA_RATE
    ? Number(process.env.IVA_RATE)
    : 0.16;

  const seller = {
    name: process.env.SELLER_NAME || "Círculo Arcano Grymmorium",
    taxId: process.env.SELLER_TAX_ID || "",
    address: process.env.SELLER_ADDRESS || "",
    email: process.env.SELLER_EMAIL || process.env.MAIL_FROM,
  };

  let pdfBuffer = null;
  try {
    pdfBuffer = await generateReceiptPDF({
      session,
      lineItems,
      ivaRate,
      seller,
    });
  } catch (e) {
    console.error("✖ Error generando PDF:", e);
  }

  const amount = ((session?.amount_total || 0) / 100).toFixed(2);
  const currency = (session?.currency || "mxn").toUpperCase();

  const html = `
<h3>✨ Gracias por tu Ofrenda Astral</h3>
<p>El Cónclave ha recibido tu contribución.</p>
<p><b>Total canalizado:</b> ${amount} ${currency}</p>
<p>Adjuntamos tu <i>Recibo Arcano</i> en formato PDF.</p>
`;

  const attachments = [];

  if (pdfBuffer) {
    attachments.push({
      content: pdfBuffer.toString("base64"),
      filename: `Recibo-Astral-${session?.id}.pdf`,
      type: "application/pdf",
      disposition: "attachment",
    });
  }

  await sg.send({
    to: buyer,
    from: process.env.MAIL_FROM,
    subject: "🔮 Recibo Arcano — Círculo Grymmorium",
    html,
    attachments,
  });
}

// ===============================
// ENVÍO DEL SELLO ARCANO (2FA)
// ===============================
async function sendVerificationCode(email, code) {
  const html = `
<h3>🔐 Sello de Verificación Astral</h3>
<p>Tu código mágico es:</p>
<h2 style="letter-spacing:3px;">${code}</h2>
<p>Este sello expira en 5 minutos.</p>
`;

  await sg.send({
    to: email,
    from: process.env.MAIL_FROM,
    subject: "🔐 Sello de Verificación — Grymmorium",
    html,
  });
}

module.exports = {
  sendReceiptEmail,
  sendVerificationCode,
};