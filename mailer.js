// mailer.js — Funcional + temática astral
const sg = require("@sendgrid/mail");
const { generateReceiptPDF } = require("./pdf");

if (!process.env.SENDGRID_API_KEY) {
  console.warn("⚠️ SENDGRID_API_KEY no definida.");
} else {
  sg.setApiKey(process.env.SENDGRID_API_KEY);
}

// ===========================
// ENVÍO DE RECIBO (Stripe)
// ===========================
async function sendReceiptEmail({ session, lineItems }) {
  const buyer =
    session?.customer_details?.email || session?.customer_email || null;

  if (!buyer) {
    console.warn("Sin email en la sesión. No se envía ticket.");
    return;
  }

  const ivaRate = process.env.IVA_RATE ? Number(process.env.IVA_RATE) : 0.16;

  const seller = {
    name: process.env.SELLER_NAME || "Grymmorium",
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
    console.error("Error generando PDF:", e);
  }

  const amount = ((session?.amount_total || 0) / 100).toFixed(2);
  const currency = (session?.currency || "mxn").toUpperCase();

  const html = `
<h3>✨ Gracias por tu ofrenda</h3>
<p>Tu donación ha sido recibida por el Cónclave Astral.</p>
<p><b>Total canalizado:</b> ${amount} ${currency}</p>
<p>Adjuntamos tu Recibo Arcano (PDF).</p>
`;

  const attachments = [];

  if (pdfBuffer) {
    attachments.push({
      content: pdfBuffer.toString("base64"),
      filename: `Recibo-${session?.id}.pdf`,
      type: "application/pdf",
      disposition: "attachment",
    });
  }

  await sg.send({
    to: buyer,
    from: process.env.MAIL_FROM,
    subject: "🔮 Tu Recibo Arcano — Grymmorium",
    html,
    attachments,
  });
}

// ===========================
// 2FA
// ===========================
async function sendVerificationCode(email, code) {
  const html = `
<h3>🔐 Sello de Verificación</h3>
<p>Tu código mágico es:</p>
<h2>${code}</h2>
<p>Válido por 5 minutos.</p>
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
``