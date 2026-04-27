import { useState } from 'react';
import { GLOSSARY } from '../data/mockData';
import { X } from 'lucide-react';

interface WikiModalProps {
  term: string | null;
  onClose: () => void;
}

export function WikiModal({ term, onClose }: WikiModalProps) {
  if (!term) return null;

  const definition = GLOSSARY[term.toLowerCase()];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50 capitalize">{term}</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-slate-700 dark:text-zinc-300 text-sm leading-relaxed">
            {definition || 'Definition not found.'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface WikiTextProps {
  text: string;
}

export default function WikiText({ text }: WikiTextProps) {
  const [activeTerm, setActiveTerm] = useState<string | null>(null);

  if (!text) return null;

  const terms = Object.keys(GLOSSARY);
  
  // Create a regex to match any glossary term (case-insensitive, whole words)
  const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
  
  const parts = text.split(regex);

  return (
    <>
      <span>
        {parts.map((part, i) => {
          const lowerPart = part.toLowerCase();
          if (terms.includes(lowerPart)) {
            return (
              <span
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTerm(lowerPart);
                }}
                className="text-emerald-600 dark:text-emerald-400 underline decoration-emerald-300 dark:decoration-emerald-500/50 decoration-dotted underline-offset-4 cursor-pointer hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
      <WikiModal term={activeTerm} onClose={() => setActiveTerm(null)} />
    </>
  );
}
