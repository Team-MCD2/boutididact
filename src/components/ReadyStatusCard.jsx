import React, { useState } from 'react';
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { computeReadiness } from '../utils/readiness';

const LEVEL_STYLES = {
  ready: {
    wrap: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    titleClass: 'text-emerald-950',
  },
  warning: {
    wrap: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-950',
  },
  blocked: {
    wrap: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
    iconClass: 'text-red-600',
    titleClass: 'text-red-950',
  },
};

export default function ReadyStatusCard({ settings, health, session, onFix }) {
  const [open, setOpen] = useState(false);
  const { level, title, subtitle, items } = computeReadiness({ settings, health, session });
  const style = LEVEL_STYLES[level];
  const Icon = style.icon;

  return (
    <div className={`rounded-2xl border p-5 ${style.wrap}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 text-left"
      >
        <div className={`mt-1 w-3 h-3 rounded-full shrink-0 ${style.dot} ${level === 'ready' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon size={20} className={style.iconClass} />
            <h3 className={`text-lg font-black ${style.titleClass}`}>{title}</h3>
          </div>
          <p className="text-sm font-medium text-slate-600 mt-1">{subtitle}</p>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-2 text-sm">
              <span className={it.ok ? 'text-emerald-600' : 'text-amber-700'}>{it.ok ? '✓' : '○'}</span>
              <div>
                <span className="font-bold text-slate-800">{it.label}</span>
                {it.hint && !it.ok && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{it.hint}</p>
                )}
              </div>
            </li>
          ))}
          {level !== 'ready' && onFix && (
            <li className="pt-2">
              <button
                type="button"
                onClick={onFix}
                className="text-xs font-black text-indigo-700 underline"
              >
                Ouvrir l&apos;assistant d&apos;installation
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
