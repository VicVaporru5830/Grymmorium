// mailer.js
// Envío de tickets con SendGrid
// Requiere en .env: SENDGRID_API_KEY, MAIL_FROM, (opcional) SELLER_EMAIL

const sgMail = require('@sendgrid/mail');

if (!process.env.SENDGRID_API_KEY) {
  console.warn('⚠️ SENDGRID_API_KEY no está configurado. El envío de correos fallará.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

function money(n, currency = 'MXN', locale = 'es-MX') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  } catch {
    return `${Number(n || 0).toFixed(2)} ${currency}`;
  }
}

/**
 * Envía ticket de compra por correo
 * @param {Object} param0
 * @param {Object} param0.session - Checkout Session de Stripe
 * @param {Array}  param0.lineItems - Line items (array) de Stripe
 */
async function sendReceiptEmail({ session, lineItems }) {
  if (!process.env.SENDGRID_API_KEY || !process.env.MAIL_FROM) {
    throw new Error('Faltan SENDGRID_API_KEY o MAIL_FROM en variables de entorno');
  }

  const buyerEmail = session?.customer_details?.email;
  const orderId = session?.id || `ORD-${Date.now()}`;
  const currency = (session?.currency || 'mxn').toUpperCase();
  const total = (session?.amount_total || 0) / 100;

  const rows = (lineItems || []).map(li => {
    const name = li.description || 'Artículo';
    const qty = li.quantity || 1;
    const unit = (li.price?.unit_amount || 0) / 100;
    const lineTotal = unit * qty;
    return `
      <tr>
        <td>${name}</td>
        <td style="text-align:center;">${qty}</td>
        <td style="text-align:right;">${money(unit, currency)}</td>
        <td style="text-align:right;">${money(lineTotal, currency)}</td>
      </tr>
    `;
  }).join('');

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden">
    <div style="background:#111827;color:#fff;padding:16px 24px">
      <h2 style="margin:0">Gracias por tu compra 🎉</h2>
      <div>Pedido: <strong>#${orderId}</strong></div>
    </div>
    <div style="padding:20px 24px">
      <p>Este es el detalle de tu compra:</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:1px solid #eee;padding:8px;background:#fafafa">Artículo</th>
            <th style="text-align:right;border-bottom:1px solid #eee;padding:8px;background:#fafafa">Cant.</th>
            <th style="text-align:right;border-bottom:1px solid #eee;padding:8px;background:#fafafa">Precio</th>
            <th style="text-align:right;border-bottom:1px solid #eee;padding:8px;background:#fafafa">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="padding:8px">[Sin detalle disponible]</td></tr>'}
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <tr>
          <td style="text-align:right;padding:8px">Total</td>
          <td style="text-align:right;padding:8px;font-weight:bold">${money(total, currency)}</td>
        </tr>
      </table>

      <p style="color:#6b7280;font-size:14px">
        Si necesitas factura o ayuda, responde a este correo. ¡Gracias por apoyar el proyecto!
      </p>
    </div>
  </div>
  `;

  const toList = [buyerEmail].filter(Boolean);
  const bccList = (process.env.SELLER_EMAIL ? [process.env.SELLER_EMAIL] : []);

  if (!toList.length) {
    throw new Error('No se encontró email del comprador en la sesión de Stripe.');
  }

  await sgMail.send({
    to: toList,
    bcc: bccList,
    from: process.env.MAIL_FROM, // "ARK <no-reply@tudominio.com>"
    subject: `Tu ticket de compra #${orderId}`,
    html
  });
}

module.exports = { sendReceiptEmail };
