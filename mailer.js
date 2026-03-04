// mailer.js
const sg = require("@sendgrid/mail");

sg.setApiKey(process.env.SENDGRID_API_KEY);

async function sendReceiptEmail({ session, lineItems }) {
  const buyer = session.customer_details.email;
  const amount = (session.amount_total / 100).toFixed(2);
  const currency = session.currency.toUpperCase();

  const itemsHtml = lineItems
    .map(i => `<li>${i.quantity} × ${i.description} — ${(i.amount_total / 100).toFixed(2)} ${currency}</li>`)
    .join("");

  const html = `
    <h2>Gracias por tu compra</h2>
    <p>Tu pago fue procesado correctamente.</p>
    <p><b>Monto:</b> ${amount} ${currency}</p>
    <h3>Detalles:</h3>
    <ul>${itemsHtml}</ul>
    <p>Folio Stripe: ${session.id}</p>
  `;

  await sg.send({
    to: buyer,
    from: process.env.MAIL_FROM,
    subject: "Tu ticket de compra (ARK)",
    html
  });

  // Copia opcional al vendedor
  if (process.env.SELLER_EMAIL) {
    await sg.send({
      to: process.env.SELLER_EMAIL,
      from: process.env.MAIL_FROM,
      subject: "Nueva compra ARK",
      html
    });
  }
}

module.exports = { sendReceiptEmail };