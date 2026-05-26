import React, { useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Image,
  QrCode,
  Type,
  Minus,
} from 'lucide-react';
import { BLOCK_CATALOG, createBlock, moveBlock } from '../utils/ticketLayout';

const ADDABLE = [
  { type: 'logo', icon: Image, label: 'Logo' },
  { type: 'custom_text', icon: Type, label: 'Texte libre' },
  { type: 'qrcode', icon: QrCode, label: 'Code QR' },
  { type: 'divider', icon: Minus, label: 'Ligne' },
  { type: 'spacer', icon: Minus, label: 'Espace vide' },
];

export default function TicketBlockEditor({ blocks, setBlocks, selectedId, setSelectedId }) {
  const fileRef = useRef(null);
  const selected = blocks.find((b) => b.id === selectedId) || null;
  const selectedIndex = blocks.findIndex((b) => b.id === selectedId);

  const updateBlock = (id, patch) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id) => {
    const b = blocks.find((x) => x.id === id);
    if (b && BLOCK_CATALOG[b.type]?.fixed) return;
    const next = blocks.filter((x) => x.id !== id);
    setBlocks(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const addBlock = (type) => {
    const block = createBlock(type);
    setBlocks([...blocks, block]);
    setSelectedId(block.id);
  };

  const handleLogoFile = (e, blockId) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 120000) {
      alert('Image trop lourde (max ~120 Ko). Utilisez un logo simple noir et blanc.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateBlock(blockId, { logoData: reader.result, enabled: true });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ADDABLE.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addBlock(type)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-100 text-xs font-bold hover:bg-indigo-100 transition"
          >
            <Plus size={14} />
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        Réorganisez les blocs avec les flèches. Les sections grisées sont fixes (articles, total…).
      </p>

      <ul className="space-y-2">
        {blocks.map((block, index) => {
          const meta = BLOCK_CATALOG[block.type] || { label: block.type, fixed: false };
          const active = block.id === selectedId;
          return (
            <li
              key={block.id}
              className={`rounded-2xl border p-3 flex items-center gap-2 transition ${
                active ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white'
              } ${block.enabled === false ? 'opacity-50' : ''}`}
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => setBlocks(moveBlock(blocks, index, -1))}
                  className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Monter"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={index === blocks.length - 1}
                  onClick={() => setBlocks(moveBlock(blocks, index, 1))}
                  className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                  aria-label="Descendre"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => setSelectedId(block.id)}
              >
                <span className="text-sm font-bold text-slate-800 block truncate">{meta.label}</span>
                {block.type === 'custom_text' && (
                  <span className="text-[10px] text-slate-500 truncate block">{block.text}</span>
                )}
                {block.type === 'qrcode' && (
                  <span className="text-[10px] text-slate-500 truncate block">{block.content}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => updateBlock(block.id, { enabled: block.enabled === false })}
                className="p-2 rounded-lg hover:bg-slate-100 shrink-0"
                aria-label={block.enabled === false ? 'Afficher' : 'Masquer'}
              >
                {block.enabled === false ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {!meta.fixed && (
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                  aria-label="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
            Modifier : {BLOCK_CATALOG[selected.type]?.label || selected.type}
          </h3>

          {selected.type === 'logo' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handleLogoFile(e, selected.id)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:border-indigo-400"
              >
                {selected.logoData ? 'Changer le logo' : 'Importer un logo (PNG/JPG)'}
              </button>
              {selected.logoData && (
                <img src={selected.logoData} alt="Logo" className="max-h-24 mx-auto object-contain" />
              )}
            </>
          )}

          {selected.type === 'custom_text' && (
            <>
              <label className="block text-[10px] font-black uppercase text-slate-400">Texte</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={selected.text || ''}
                onChange={(e) => updateBlock(selected.id, { text: e.target.value })}
              />
              <label className="block text-[10px] font-black uppercase text-slate-400">Alignement</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={selected.align || 'center'}
                onChange={(e) => updateBlock(selected.id, { align: e.target.value })}
              >
                <option value="left">Gauche</option>
                <option value="center">Centré</option>
                <option value="right">Droite</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!selected.bold}
                  onChange={(e) => updateBlock(selected.id, { bold: e.target.checked })}
                />
                Texte en gras
              </label>
            </>
          )}

          {selected.type === 'qrcode' && (
            <>
              <label className="block text-[10px] font-black uppercase text-slate-400">Contenu (URL ou texte)</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={selected.content || ''}
                onChange={(e) => updateBlock(selected.id, { content: e.target.value })}
                placeholder="https://votre-site.fr"
              />
              <label className="block text-[10px] font-black uppercase text-slate-400">
                Taille ({selected.size || 6})
              </label>
              <input
                type="range"
                min={3}
                max={12}
                value={selected.size || 6}
                onChange={(e) => updateBlock(selected.id, { size: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </>
          )}

          {selected.type === 'spacer' && (
            <>
              <label className="block text-[10px] font-black uppercase text-slate-400">Lignes vides</label>
              <input
                type="number"
                min={1}
                max={8}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={selected.lines || 1}
                onChange={(e) => updateBlock(selected.id, { lines: parseInt(e.target.value, 10) || 1 })}
              />
            </>
          )}

          {selectedIndex >= 0 && (
            <p className="text-[10px] text-slate-400">Position {selectedIndex + 1} / {blocks.length}</p>
          )}
        </div>
      )}
    </div>
  );
}
