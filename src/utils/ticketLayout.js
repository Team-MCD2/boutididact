/**
 * Mise en page ticket par blocs réordonnables (aperçu écran + persistance cloud).
 */
import { DEFAULT_TICKET_TEMPLATE, mergeTicketTemplate } from './ticketTemplate';

export const BLOCK_CATALOG = {
  shop_name: { label: 'Nom du commerce', fixed: true },
  logo: { label: 'Logo', fixed: false },
  shop_subtitle: { label: 'Sous-titre', fixed: true },
  shop_info: { label: 'Adresse / SIRET / TVA', fixed: true },
  divider: { label: 'Ligne de séparation', fixed: false },
  ticket_meta: { label: 'N° ticket & date', fixed: true },
  items: { label: 'Liste des articles', fixed: true },
  total: { label: 'Total TTC', fixed: true },
  tax_detail: { label: 'Détail TVA', fixed: true },
  payment: { label: 'Mode de paiement', fixed: true },
  footer: { label: 'Message de fin', fixed: true },
  legal: { label: 'Mentions légales', fixed: true },
  custom_text: { label: 'Texte libre', fixed: false },
  qrcode: { label: 'Code QR', fixed: false },
  spacer: { label: 'Espace vide', fixed: false },
};

const uid = () => `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const DEFAULT_TICKET_BLOCKS = [
  { id: 'logo', type: 'logo', enabled: false, logoData: '', maxWidth: 280 },
  { id: 'shop_name', type: 'shop_name', enabled: true },
  { id: 'shop_subtitle', type: 'shop_subtitle', enabled: true },
  { id: 'shop_info', type: 'shop_info', enabled: true },
  { id: 'div1', type: 'divider', enabled: true },
  { id: 'ticket_meta', type: 'ticket_meta', enabled: true },
  { id: 'div2', type: 'divider', enabled: true },
  { id: 'items', type: 'items', enabled: true },
  { id: 'div3', type: 'divider', enabled: true },
  { id: 'total', type: 'total', enabled: true },
  { id: 'tax_detail', type: 'tax_detail', enabled: true },
  { id: 'payment', type: 'payment', enabled: true },
  { id: 'div4', type: 'divider', enabled: true },
  { id: 'footer', type: 'footer', enabled: true },
  { id: 'legal', type: 'legal', enabled: true },
];

export function createBlock(type) {
  const base = { id: uid(), type, enabled: true };
  switch (type) {
    case 'logo':
      return { ...base, logoData: '', maxWidth: 280 };
    case 'custom_text':
      return { ...base, text: 'Votre texte ici', align: 'center', bold: false };
    case 'qrcode':
      return { ...base, content: 'https://boutididact.com', size: 6 };
    case 'spacer':
      return { ...base, lines: 2 };
    case 'divider':
      return { ...base };
    default:
      return base;
  }
}

export function mergeTicketLayout(settings = {}) {
  const blocks = Array.isArray(settings?.ticketLayout?.blocks)
    ? settings.ticketLayout.blocks.map((b) => ({ ...b }))
  : null;
  return {
    version: 1,
    blocks: blocks && blocks.length > 0 ? blocks : DEFAULT_TICKET_BLOCKS.map((b) => ({ ...b })),
  };
}

export function moveBlock(blocks, index, direction) {
  const next = [...blocks];
  const j = index + direction;
  if (j < 0 || j >= next.length) return next;
  const tmp = next[index];
  next[index] = next[j];
  next[j] = tmp;
  return next;
}

/** Réordonne par glisser-déposer : déplace l’élément `fromIndex` vers `toIndex`. */
export function reorderBlocks(blocks, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= blocks.length) {
    return blocks;
  }
  const next = [...blocks];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** Blocs supprimables (sections ajoutées ou optionnelles). */
export function canRemoveBlock(block) {
  const meta = BLOCK_CATALOG[block?.type];
  if (!meta || meta.fixed) return false;
  return ['custom_text', 'divider', 'spacer', 'qrcode', 'logo'].includes(block.type);
}

export function removeBlock(blocks, id) {
  return blocks.filter((b) => b.id !== id);
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

/** Aperçu écran : lignes texte + éléments riches (logo, QR) */
export function renderLayoutPreview(ticket, layout, width = 32) {
  const shop = ticket.shop || {};
  const tpl = shop.ticketTemplate || mergeTicketTemplate({});
  const elements = [];
  const pushText = (text, cls = '') => elements.push({ kind: 'text', text, cls });
  const draw = () => pushText('-'.repeat(width), 'line');

  const blocks = (layout?.blocks || DEFAULT_TICKET_BLOCKS).filter((b) => b.enabled !== false);

  for (const block of blocks) {
    switch (block.type) {
      case 'logo':
        if (block.logoData) {
          elements.push({ kind: 'image', src: block.logoData, alt: 'Logo' });
        } else {
          pushText(padCenter('[ Logo — ajoutez une image ]', width), 'muted');
        }
        break;

      case 'shop_name':
        pushText(padCenter((shop.name || 'BOUTIQUE').toUpperCase(), width), 'header');
        break;

      case 'shop_subtitle':
        if (tpl.headerSubtitle?.trim()) {
          pushText(padCenter(tpl.headerSubtitle.trim(), width), 'subtitle');
        }
        break;

      case 'shop_info':
        if (tpl.showAddress !== false && shop.address) pushText(shop.address, 'muted');
        if (tpl.showSiret !== false && shop.siret) pushText(`SIRET : ${shop.siret}`, 'muted');
        if (tpl.showTva !== false && shop.tva) pushText(`TVA : ${shop.tva}`, 'muted');
        break;

      case 'divider':
        draw();
        break;

      case 'ticket_meta': {
        const now = ticket._previewDate || new Date();
        const dateStr = now.toLocaleDateString('fr-FR');
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        pushText(padLeftRight(`Ticket : ${ticket.ticketId || '—'}`, dateStr, width));
        if (ticket.saleId) {
          pushText(padLeftRight(`Vente : #${ticket.saleId}`, timeStr, width));
        } else {
          pushText(padLeftRight('', timeStr, width));
        }
        break;
      }

      case 'items': {
        const nameW = Math.floor(width * 0.55);
        const qtyW = Math.floor(width * 0.15);
        const totalW = width - nameW - qtyW;
        pushText('Article'.padEnd(nameW) + padCenter('Qte', qtyW) + 'Total'.padStart(totalW), 'table-head');
        draw();
        (ticket.items || []).forEach((it) => {
          const name = String(it.name || '').slice(0, nameW - 1).padEnd(nameW);
          const qty = padCenter(String(it.quantity || 1), qtyW);
          const lineTotal = `${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2)} €`;
          pushText(name + qty + lineTotal.padStart(totalW));
        });
        break;
      }

      case 'total':
        pushText(padLeftRight('', `TOTAL TTC : ${Number(ticket.total || 0).toFixed(2)} €`, width), 'total');
        break;

      case 'tax_detail':
        if (tpl.showTaxDetail !== false && ticket.taxBreakdown?.length) {
          pushText('Détail TVA :', 'muted');
          ticket.taxBreakdown.forEach((t) => {
            pushText(`  TVA ${t.rate}%  HT ${Number(t.base).toFixed(2)}  TVA ${Number(t.tax).toFixed(2)}`, 'muted');
          });
        }
        break;

      case 'payment':
        pushText(`Paiement : ${ticket.payment || 'CB'}`);
        break;

      case 'footer':
        if (tpl.footer?.trim()) pushText(padCenter(tpl.footer.trim(), width), 'footer');
        break;

      case 'legal':
        if (tpl.legalLine?.trim()) pushText(padCenter(tpl.legalLine.trim(), width), 'legal');
        if (tpl.showEditedAt !== false) {
          const now = ticket._previewDate || new Date();
          pushText(
            padCenter(
              `Édité le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
              width,
            ),
            'legal',
          );
        }
        break;

      case 'custom_text': {
        const lines = String(block.text || '').split('\n');
        const align = block.align || 'center';
        lines.forEach((line) => {
          const t = align === 'center' ? padCenter(line, width) : line;
          pushText(t, block.bold ? 'header' : '');
        });
        break;
      }

      case 'qrcode':
        elements.push({
          kind: 'qrcode',
          content: block.content || 'https://',
          label: block.content || '',
        });
        break;

      case 'spacer':
        for (let i = 0; i < (block.lines || 1); i++) pushText('', 'muted');
        break;

      default:
        break;
    }
  }

  return elements;
}
