/**
 * Mise en page ticket : formulaire simple + sections réordonnables.
 */
import { DEFAULT_TICKET_BLOCKS, mergeTicketLayout } from './ticketLayout';

export function blocksFromSettings(settings = {}) {
  return mergeTicketLayout(settings).blocks;
}

/** Met à jour logo / sous-titre / TVA dans la liste de blocs existante. */
export function syncBlocksWithForm(blocks, { logoData = '', template = {} }) {
  return blocks.map((block) => {
    if (block.type === 'logo') {
      const hasLogo = Boolean(logoData);
      return { ...block, enabled: hasLogo, logoData: logoData || '' };
    }
    if (block.type === 'shop_subtitle') {
      return {
        ...block,
        enabled: Boolean(String(template.headerSubtitle || '').trim()),
      };
    }
    if (block.type === 'tax_detail') {
      return { ...block, enabled: template.showTaxDetail !== false };
    }
    return block;
  });
}

export function buildLayoutFromBlocks(blocks) {
  return mergeTicketLayout({ ticketLayout: { blocks } });
}

/** Ancien helper : layout par défaut + options simples. */
export function buildLayoutFromSimpleForm({ logoData = '', template = {}, blocks = null }) {
  const base = blocks || DEFAULT_TICKET_BLOCKS.map((b) => ({ ...b }));
  const synced = syncBlocksWithForm(base, { logoData, template });
  return buildLayoutFromBlocks(synced);
}
