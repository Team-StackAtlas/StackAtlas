import { useState } from 'react';
import { GLOSSARY } from '../data/mockData';
import { Modal } from './ui/Modal';

interface WikiModalProps {
  term: string | null;
  onClose: () => void;
}

export function WikiModal({ term, onClose }: WikiModalProps) {
  const definition = term ? GLOSSARY[term.toLowerCase()] : undefined;

  return (
    <Modal
      isOpen={term !== null}
      onClose={onClose}
      title={<span className="capitalize">{term}</span>}
      panelClassName="max-w-sm"
      overlayClassName="z-[60]"
    >
      <div className="p-4">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
          {definition || 'Definition not found.'}
        </p>
      </div>
    </Modal>
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
