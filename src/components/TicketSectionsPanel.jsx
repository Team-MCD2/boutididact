import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Type, Minus, QrCode, GripVertical, Trash2 } from 'lucide-react';
import {
  BLOCK_CATALOG,
  createBlock,
  canRemoveBlock,
  removeBlock,
  reorderBlocks,
} from '../utils/ticketLayout';

const ADD_SECTIONS = [
  { type: 'custom_text', icon: Type, label: 'Message personnalisé' },
  { type: 'divider', icon: Minus, label: 'Ligne de séparation' },
  { type: 'spacer', icon: Minus, label: 'Espace vide' },
  { type: 'qrcode', icon: QrCode, label: 'Code QR' },
];

export default function TicketSectionsPanel({ blocks, setBlocks }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const addSection = (type) => {
    setBlocks([...blocks, createBlock(type)]);
  };

  const toggleEnabled = (id) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || BLOCK_CATALOG[b.type]?.fixed) return;
    setBlocks(blocks.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  };

  const updateBlock = (id, patch) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (id) => {
    const b = blocks.find((x) => x.id === id);
    if (!b || !canRemoveBlock(b)) return;
    if (!window.confirm('Supprimer cette section du ticket ?')) return;
    setBlocks(removeBlock(blocks, id));
  };

  const onDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && index !== overIndex) setOverIndex(index);
  };

  const onDrop = (e, toIndex) => {
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(from) && from !== toIndex) {
      setBlocks(reorderBlocks(blocks, from, toIndex));
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const onDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        Glissez les sections avec la souris pour les réorganiser. Masquez ou supprimez les blocs optionnels.
        Les articles et le total restent toujours affichés.
      </p>

      <ul className="space-y-2">
        {blocks.map((block, index) => {
          const meta = BLOCK_CATALOG[block.type] || { label: block.type, fixed: false };
          const isFixed = meta.fixed;
          const enabled = block.enabled !== false;
          const removable = canRemoveBlock(block);
          const isDragging = dragIndex === index;
          const isDropTarget = overIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <li
              key={block.id}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDrop(e, index)}
              onDragEnd={onDragEnd}
              className={`rounded-2xl border p-3 transition ${
                isDragging ? 'opacity-40 scale-[0.98]' : ''
              } ${isDropTarget ? 'ring-2 ring-indigo-400 border-indigo-300' : ''} ${
                enabled ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 rounded-xl hover:bg-white cursor-grab active:cursor-grabbing text-slate-400 shrink-0 touch-none"
                  aria-label="Glisser pour réorganiser"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={18} />
                </button>

                <span className="flex-1 text-sm font-bold text-slate-800 min-w-0 truncate select-none">
                  {meta.label}
                </span>

                {isFixed ? (
                  <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Obligatoire</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleEnabled(block.id)}
                      className={`p-2 rounded-xl shrink-0 ${enabled ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}
                      aria-label={enabled ? 'Masquer' : 'Afficher'}
                    >
                      {enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    {removable && (
                      <button
                        type="button"
                        onClick={() => deleteBlock(block.id)}
                        className="p-2 rounded-xl shrink-0 text-red-600 bg-red-50 hover:bg-red-100"
                        aria-label="Supprimer la section"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </>
                )}
              </div>

              {enabled && block.type === 'custom_text' && (
                <textarea
                  rows={2}
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={block.text || ''}
                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                  placeholder="Ex : Retrouvez-nous sur Instagram @maboutique"
                />
              )}

              {enabled && block.type === 'qrcode' && (
                <input
                  type="url"
                  className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={block.content || ''}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder="https://votre-site.fr"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-full mb-1">
          Ajouter une section
        </span>
        {ADD_SECTIONS.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addSection(type)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-100 text-xs font-bold hover:bg-indigo-100"
          >
            <Plus size={14} />
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
