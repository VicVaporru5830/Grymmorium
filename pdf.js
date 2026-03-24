// pdf.js (tema mágico astral)
const PDFDocument = require('pdfkit');
function money(n, currency = 'MXN', locale = 'es-MX') {
  const val = (Number(n || 0) / 100); // viene en centavos
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val);
}
function formatDate(d = new Date(), locale = 'es-MX') {
  return new Date(d).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}
/**
 * Genera un PDF de ticket/recibo arcano.
 * @param {Object} params
 * @param {Object} params.session - Checkout Session (Stripe webhook)
 * @param {Array} params.lineItems - Line items de Stripe (listLineItems)
 * @param {Number} params.ivaRate - Por ejemplo 0.16 (16%)
 * @param {Object} params.seller - Datos del vendedor { name, taxId, address, email }
 * @returns Buffer del PDF
 */
async function generateReceiptPDF({ session, lineItems, ivaRate = 0.16, seller = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const currency = (session?.currency || 'mxn').toUpperCase();
      const buyerEmail = session?.customer_details?.email || session?.customer_email || '';
      const sessionId = session?.id || '';
      const createdAt = session?.created ? new Date(session.created * 1000) : new Date();

      const items = Array.isArray(lineItems) ? lineItems : [];
      let subtotalCents = 0;
      const normalizedItems = items.map((it) => {
        const qty = Number(it?.quantity || 1);
        const desc = it?.description || 'Artículo';
        const unitCents = it?.price?.unit_amount ?? Math.round((it?.amount_total || 0) / qty);
        const lineSubtotal = it?.amount_subtotal ?? (unitCents * qty);
        subtotalCents += lineSubtotal;
        return { qty, desc, unitCents, lineSubtotal };
      });

      const ivaCents = Math.round(subtotalCents * (ivaRate || 0));
      const totalCents = subtotalCents + ivaCents;

      // Encabezado
      doc
        .fillColor('#0a1a2f')
        .rect(40, 40, 515, 70)
        .fill('#e6f7ff');

      doc.fillColor('#071122').fontSize(20).text(seller?.name || 'Grymmorium', 50, 50, { continued: false });
      let yInfo = 75; doc.fontSize(9);
      if (seller?.taxId) doc.text(`RFC: ${seller.taxId}`, 50, yInfo);
      if (seller?.address) doc.text(seller.address, 50, yInfo += 12);
      if (seller?.email) doc.text(`Contacto: ${seller.email}`, 50, yInfo += 12);

      // Título del documento
      doc.fillColor('#4da6ff').fontSize(16).text('Recibo Arcano de Compra', { align: 'right', continued: false });
      doc.fillColor('#0a1a2f').fontSize(10).text(`Folio: ${sessionId}`, { align: 'right' })
         .text(`Fecha: ${formatDate(createdAt)}`, { align: 'right' })
         .text(`Cliente: ${buyerEmail}`, { align: 'right' });

      doc.moveDown(1);

      // Tabla
      const startX = 40; let y = doc.y + 8;
      doc.fillColor('#0a1a2f').fontSize(12)
         .text('Descripción', startX, y)
         .text('Cant.', 320, y)
         .text('P. Unit.', 380, y)
         .text('Importe', 470, y);
      y += 18;
      doc.moveTo(startX, y).lineTo(555, y).strokeColor('#4da6ff').stroke();
      y += 10;
      doc.fontSize(10).fillColor('#071122');
      normalizedItems.forEach((row) => {
        doc.text(row.desc, startX, y, { width: 270 });
        doc.text(String(row.qty), 320, y, { width: 40, align: 'right' });
        doc.text(money(row.unitCents, currency), 360, y, { width: 90, align: 'right' });
        doc.text(money(row.lineSubtotal, currency), 450, y, { width: 100, align: 'right' });
        y += 18;
      });
      y += 8;
      doc.moveTo(320, y).lineTo(555, y).strokeColor('#b3d9ff').stroke();
      y += 10;

      // Totales
      doc.fontSize(11); doc.fillColor('#0a1a2f');
      doc.text('Subtotal:', 360, y, { width: 90, align: 'right' });
      doc.text(money(subtotalCents, currency), 450, y, { width: 100, align: 'right' });
      y += 16;
      doc.text(`IVA (${Math.round((ivaRate || 0) * 100)}%):`, 360, y, { width: 90, align: 'right' });
      doc.text(money(ivaCents, currency), 450, y, { width: 100, align: 'right' });
      y += 16;
      doc.fontSize(12).fillColor('#4da6ff').text('TOTAL:', 360, y, { width: 90, align: 'right' });
      doc.fontSize(12).fillColor('#4da6ff').text(money(totalCents, currency), 450, y, { width: 100, align: 'right' });
      doc.fillColor('#071122');

      // Nota
      y += 30;
      doc.fontSize(9).fillColor('#314864').text(
        'Gracias por tu ofrenda. Este documento es un recibo no fiscal. Si requieres factura, ponte en contacto con el vendedor.',
        startX, y, { width: 515 }
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateReceiptPDF, money, formatDate };