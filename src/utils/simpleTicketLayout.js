/**
 * Construit la mise en page ticket à partir d'un formulaire simple (sans éditeur de blocs).
 */
import { DEFAULT_TICKET_BLOCKS, mergeTicketLayout } from './ticketLayout';

export function buildLayoutFromSimpleForm({ logoData = '', template = {} }) {
  const blocks = DEFAULT_TICKET_BLOCKS.map((b) => {
    const block = { ...b };
    if (block.type === 'logo') {
      block.enabled = Boolean(logoData);
      block.logoData = logoData || '';
    }
    if (block.type === 'shop_subtitle') {
      block.enabled = Boolean(String(template.headerSubtitle || '').trim());
    }
    if (block.type === 'tax_detail') {
      block.enabled = template.showTaxDetail !== false;
    }
    return block;
  });

  return mergeTicketLayout({ ticketLayout: { blocks } });
}
