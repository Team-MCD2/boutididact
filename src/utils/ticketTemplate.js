/** Modèle par défaut de personnalisation du ticket */
export const DEFAULT_TICKET_TEMPLATE = {
  headerSubtitle: '',
  showAddress: true,
  showSiret: true,
  showTva: true,
  showTaxDetail: true,
  footer: 'Merci de votre visite !',
  legalLine: 'Ticket non valable comme facture',
  showEditedAt: true,
};

export function mergeTicketTemplate(fromSettings) {
  return { ...DEFAULT_TICKET_TEMPLATE, ...(fromSettings?.ticketTemplate || {}) };
}

export function loadSettingsWithTemplate() {
  try {
    const raw = localStorage.getItem('boutididact_settings');
    if (!raw) return { ticketTemplate: { ...DEFAULT_TICKET_TEMPLATE } };
    const s = JSON.parse(raw);
    return {
      ...s,
      shopFooter: s.shopFooter ?? s.ticketTemplate?.footer ?? DEFAULT_TICKET_TEMPLATE.footer,
      ticketTemplate: mergeTicketTemplate(s),
    };
  } catch {
    return { ticketTemplate: { ...DEFAULT_TICKET_TEMPLATE } };
  }
}

/** Ticket d'exemple pour l'aperçu */
export function buildSampleTicket(settings = {}) {
  const tpl = mergeTicketTemplate(settings);
  const now = new Date();
  return {
    ticketId: 'APERÇU-001',
    saleId: '12345',
    total: 24.5,
    payment: 'Carte Bancaire',
    taxBreakdown: tpl.showTaxDetail
      ? [{ rate: 10, base: 22.27, tax: 2.23 }]
      : [],
    items: [
      { name: 'Burger Maison', quantity: 1, price: 12.5 },
      { name: 'Frites', quantity: 1, price: 4.0 },
      { name: 'Boisson', quantity: 2, price: 4.0 },
    ],
    shop: {
      name: settings.shopName || 'Ma Boutique',
      address: settings.shopAddress || '12 rue du Commerce, 75001 Paris',
      siret: settings.shopSiret || '123 456 789 00012',
      tva: settings.shopTva || 'FR12 345678901',
      footer: tpl.footer || settings.shopFooter || DEFAULT_TICKET_TEMPLATE.footer,
      ticketTemplate: tpl,
    },
    _previewDate: now,
  };
}

const padCenter = (str, w) => {
  const s = String(str || '');
  if (s.length >= w) return s.slice(0, w);
  const left = Math.floor((w - s.length) / 2);
  return ' '.repeat(left) + s + ' '.repeat(w - s.length - left);
};

const padLeftRight = (left, right, w) => {
  const spaces = Math.max(0, w - left.length - right.length);
  return left + ' '.repeat(spaces) + right;
};

/** Lignes texte 32 colonnes pour l'aperçu écran */
export function buildTicketPreviewLines(ticket, width = 32) {
  const shop = ticket.shop || {};
  const tpl = shop.ticketTemplate || DEFAULT_TICKET_TEMPLATE;
  const lines = [];
  const push = (t, cls = '') => lines.push({ text: t, cls });
  const draw = () => push('-'.repeat(width), 'line');

  const now = ticket._previewDate || new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  push(padCenter((shop.name || 'BOUTIQUE').toUpperCase(), width), 'header');
  if (tpl.headerSubtitle?.trim()) {
    push(padCenter(tpl.headerSubtitle.trim(), width), 'subtitle');
  }
  if (tpl.showAddress && shop.address) push(shop.address, 'muted');
  if (tpl.showSiret && shop.siret) push(`SIRET : ${shop.siret}`, 'muted');
  if (tpl.showTva && shop.tva) push(`TVA : ${shop.tva}`, 'muted');
  draw();

  push(padLeftRight(`Ticket : ${ticket.ticketId || '—'}`, dateStr, width));
  if (ticket.saleId) {
    push(padLeftRight(`Vente : #${ticket.saleId}`, timeStr, width));
  } else {
    push(padLeftRight('', timeStr, width));
  }
  draw();

  const nameW = Math.floor(width * 0.55);
  const qtyW = Math.floor(width * 0.15);
  const totalW = width - nameW - qtyW;
  push(
    'Article'.padEnd(nameW) + padCenter('Qte', qtyW) + 'Total'.padStart(totalW),
    'table-head',
  );
  draw();

  (ticket.items || []).forEach((it) => {
    const name = String(it.name || '').slice(0, nameW - 1).padEnd(nameW);
    const qty = padCenter(String(it.quantity || 1), qtyW);
    const lineTotal = `${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)} €`;
    push(name + qty + lineTotal.padStart(totalW));
    if (Number(it.quantity || 1) > 1) {
      push(`   ${Number(it.price || 0).toFixed(2)} € / unité`, 'muted');
    }
  });
  draw();

  push(padLeftRight('', `TOTAL TTC : ${Number(ticket.total || 0).toFixed(2)} €`, width), 'total');

  if (tpl.showTaxDetail && Array.isArray(ticket.taxBreakdown) && ticket.taxBreakdown.length) {
    push('Détail TVA :', 'muted');
    ticket.taxBreakdown.forEach((t) => {
      push(
        `  TVA ${t.rate}%  HT ${Number(t.base).toFixed(2)}  TVA ${Number(t.tax).toFixed(2)}`,
        'muted',
      );
    });
  }

  push(`Paiement : ${ticket.payment || 'CB'}`);
  draw();

  if (tpl.footer?.trim()) push(padCenter(tpl.footer.trim(), width), 'footer');
  if (tpl.legalLine?.trim()) push(padCenter(tpl.legalLine.trim(), width), 'legal');
  if (tpl.showEditedAt) {
    push(padCenter(`Édité le ${dateStr} à ${timeStr}`, width), 'legal');
  }

  return lines;
}
