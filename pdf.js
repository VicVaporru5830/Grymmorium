// pdf.js – versión temática de magia
const PDFDocument = require('pdfkit');

function money(n, currency = 'MXN', locale = 'es-MX') {
  const val = (Number(n || 0) / 100);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val);
}

function formatDate(d = new Date(), locale = 'es-MX') {
  return new Date(d).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
}

async function generateReceiptPDF({ session, lineItems, ivaRate = 0.16, seller = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const currency = (session?.currency || 'mxn').toUpperCase();
      const buyerEmail = session?.customer_details?.email || session?.customer_email || '';
      const sessionId = session?.id || '';
      const createdAt = session?.created ? new Date(session.created * 1000) : new Date();

      let subtotalCents = 0;
      const items = (Array.isArray(lineItems) ? lineItems : []).map(it => {
        const qty = Number(it?.quantity || 1);
        const desc = it?.description || 'Hechizo Arcano';
        const unitCents = it?.price?.unit_amount ?? Math.round((it?.amount_total || 0) / qty);
        const lineSubtotal = it?.amount_subtotal ?? (unitCents * qty);
        subtotalCents += lineSubtotal;
        return { qty, desc, unitCents, lineSubtotal };
      });

      const ivaCents = Math.round(subtotalCents * ivaRate);
      const totalCents = subtotalCents + ivaCents;

      // ========================
      // ENCABEZADO MÁGICO
      // ========================
      doc
        .fontSize(24)
        .fillColor('#4b148a')
        .text(seller?.name || 'MAGIA ARCANA', { continued: false })
        .moveDown(0.2);

      doc.fontSize(10).fillColor('#000');
      if (seller?.taxId) doc.text(`Registro Arcano: ${seller.taxId}`);
      if (seller?.address) doc.text(`Torre: ${seller.address}`);
      if (seller?.email) doc.text(`Contacto místico: ${seller.email}`);
      doc.moveDown(1);

      doc
        .fontSize(18)
        .fillColor('#4b148a')
        .text('Recibo de Transacción Mágica', { align: 'right' })
        .moveDown(0.5);

      doc.fontSize(10).fillColor('#000');
      doc.text(`Folio del hechizo: ${sessionId}`, { align: 'right' });
      doc.text(`Fecha del ritual: ${formatDate(createdAt)}`, { align: 'right' });
      doc.text(`Mago comprador: ${buyerEmail}`, { align: 'right' });
      doc.moveDown(1.2);

      // ========================
      // TABLA ARCANA
      // ========================
      const startX = 40;
      let y = doc.y;

      doc.fontSize(12).text('Descripción del Artefacto', startX, y).text('Cant.', 320, y).text('P. Unit.', 380, y).text('Importe', 470, y);
      y += 18;
      doc.moveTo(startX, y).lineTo(555, y).strokeColor('#4b148a').stroke();
      y += 10;

      doc.fontSize(10).fillColor('#000');

      items.forEach(row => {
        doc.text(row.desc, startX, y, { width: 270 });
        doc.text(String(row.qty), 320, y, { width: 40, align: 'right' });
        doc.text(money(row.unitCents, currency), 360, y, { width: 90, align: 'right' });
        doc.text(money(row.lineSubtotal, currency), 450, y, { width: 100, align: 'right' });
        y += 18;
      });

      y += 8;
      doc.moveTo(320, y).lineTo(555, y).strokeColor('#bbb').stroke();
      y += 10;

      // Totales mágicos
      doc.fontSize(11);
      doc.text('Subtotal mágico:', 360, y, { width: 90, align: 'right' });
      doc.text(money(subtotalCents, currency), 450, y, { width: 100, align: 'right' });
      y += 16;

      doc.text(`Energía Arcana (${Math.round(ivaRate * 100)}%):`, 360, y, { width: 90, align: 'right' });
      doc.text(money(ivaCents, currency), 450, y, { width: 100, align: 'right' });
      y += 16;

      doc.fontSize(12).fillColor('#4b148a').text('TOTAL DEL RITUAL:', 360, y, { width: 90, align: 'right' });
      doc.fontSize(12).fillColor('#4b148a').text(money(totalCents, currency), 450, y, { width: 100, align: 'right' });
      doc.fillColor('#000');

      y += 30;
      doc.fontSize(9).fillColor('#555').text(
        'Gracias por utilizar los servicios arcano-comerciales. Conserva este recibo: es un registro místico no fiscal. Para factura mundana, contacta al gremio mágico.',
        startX, y, { width: 515 }
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateReceiptPDF, money, formatDate };