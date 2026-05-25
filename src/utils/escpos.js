/**
 * Génération ESC/POS côté navigateur (relais Chrome / téléphone).
 * Même format que le serveur — port 9100 en sortie imprimante.
 */

function stripAccents(str) {
  return String(str ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function encodeLatin1(str) {
  const s = stripAccents(str);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out.push(c <= 255 ? c : 63);
  }
  return out;
}

export function generateEscPosBytes(ticket, width = 32) {
  const bytes = [];
  const add = (str) => bytes.push(...encodeLatin1(str));
  const addBytes = (arr) => bytes.push(...arr);

  const drawLine = () => add(`${'-'.repeat(width)}\n`);
  const padLeftRight = (left, right) => {
    const spaces = Math.max(0, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };
  const padCenterStr = (str, w) => {
    if (str.length >= w) return str.slice(0, w);
    const left = Math.floor((w - str.length) / 2);
    return ' '.repeat(left) + str + ' '.repeat(w - str.length - left);
  };

  addBytes([0x1B, 0x40]);
  addBytes([0x1B, 0x74, 19]);

  addBytes([0x1B, 0x61, 0x01]);
  addBytes([0x1B, 0x45, 0x01]);
  addBytes([0x1D, 0x21, 0x11]);
  add(`${(ticket.shop?.name || 'BOUTIDIDACT').toUpperCase()}\n`);

  addBytes([0x1D, 0x21, 0x00]);
  addBytes([0x1B, 0x45, 0x00]);
  if (ticket.shop?.address) add(`${ticket.shop.address}\n`);
  if (ticket.shop?.siret) add(`SIRET : ${ticket.shop.siret}\n`);
  if (ticket.shop?.tva) add(`TVA : ${ticket.shop.tva}\n`);
  drawLine();

  addBytes([0x1B, 0x61, 0x00]);
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timeStr = now.toLocaleTimeString('fr-FR');
  add(`${padLeftRight(`Ticket : ${ticket.ticketId || `T-${Date.now()}`}`, dateStr)}\n`);
  if (ticket.saleId) {
    add(`${padLeftRight(`Vente : #${ticket.saleId}`, timeStr)}\n`);
  } else {
    add(`${padLeftRight('', timeStr)}\n`);
  }
  drawLine();

  const nameW = Math.floor(width * 0.55);
  const qtyW = Math.floor(width * 0.15);
  const totalW = width - nameW - qtyW;
  add(`${'Article'.padEnd(nameW)}${padCenterStr('Qte', qtyW)}${'Total'.padStart(totalW)}\n`);
  drawLine();

  (ticket.items || []).forEach((it) => {
    const name = String(it.name || '').slice(0, nameW - 1).padEnd(nameW);
    const qty = padCenterStr(String(it.quantity || 1), qtyW);
    const lineTotal = `${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)} EUR`;
    add(`${name}${qty}${lineTotal.padStart(totalW)}\n`);
    if (Number(it.quantity || 1) > 1) {
      add(`   ${Number(it.price || 0).toFixed(2)} EUR / unite\n`);
    }
  });
  drawLine();

  addBytes([0x1B, 0x61, 0x02]);
  addBytes([0x1B, 0x45, 0x01]);
  addBytes([0x1D, 0x21, 0x11]);
  add(`TOTAL TTC : ${Number(ticket.total || 0).toFixed(2)} EUR\n`);
  addBytes([0x1D, 0x21, 0x00]);
  addBytes([0x1B, 0x45, 0x00]);

  addBytes([0x1B, 0x61, 0x00]);
  add(`Paiement : ${ticket.payment || 'CB'}\n`);
  drawLine();

  addBytes([0x1B, 0x61, 0x01]);
  add(`${padCenterStr('Ticket non valable comme facture', width)}\n`);
  add(`${padCenterStr(`Edite le ${dateStr} a ${timeStr}`, width)}\n\n\n\n`);

  addBytes([0x1D, 0x56, 0x41, 0x00]);

  return new Uint8Array(bytes);
}

export function escPosToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/** Hex continu sans espaces (fallback ePOS) */
export function escPosToHexCompact(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

export function buildEposEscPosSoap(hexPayload) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
<command>${hexPayload}</command>
</epos-print>
</soapenv:Body>
</soapenv:Envelope>`;
}

export function buildEposTextSoap(ticket) {
  const shop = stripAccents((ticket.shop?.name || 'BOUTIDIDACT').toUpperCase());
  const lines = [
    `<text width="2" height="2" lang="fr">${shop}&#10;</text>`,
    '<text lang="fr">--------------------------------&#10;</text>',
    `<text lang="fr">TICKET : ${stripAccents(ticket.ticketId || 'N/A')}&#10;</text>`,
    '<text lang="fr">--------------------------------&#10;</text>',
  ];
  (ticket.items || []).forEach((it) => {
    const qty = Number(it.quantity) || 1;
    const total = (Number(it.price || 0) * qty).toFixed(2);
    lines.push(`<text lang="fr">${qty}x ${stripAccents(it.name)}  ${total} EUR&#10;</text>`);
  });
  lines.push(
    '<text lang="fr">--------------------------------&#10;</text>',
    `<text width="2" height="2" lang="fr">TOTAL: ${Number(ticket.total || 0).toFixed(2)} EUR&#10;</text>`,
    `<text lang="fr">Paiement : ${stripAccents(ticket.payment || 'CB')}&#10;</text>`,
    '<cut type="feed"/>',
  );
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
${lines.join('\n')}
</epos-print>
</soapenv:Body>
</soapenv:Envelope>`;
}

export function isPrivateIp(ip) {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(String(ip || '').trim());
}

export function guessBridgeCandidates(printerIp) {
  const parts = String(printerIp || '').trim().split('.');
  if (parts.length !== 4) return [];
  const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const host = parseInt(parts[3], 10);
  const extras = [host, 1, 47, 100, 20, 50, 10, 2, 3];
  return [...new Set(extras.map((n) => `http://${base}.${n}:3001`))];
}
