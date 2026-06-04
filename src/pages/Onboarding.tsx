import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Info, ChevronRight } from 'lucide-react';
import { useUserScope, AccessLevel } from '../context/UserScopeContext';
import { Classification } from '../data/mockData';
import { cn } from '../lib/utils';
import AccessBadge from '../components/AccessBadge';

const SCOPES: {
  level: AccessLevel;
  title: string;
  blurb: string;
  unlocks: Classification[];
  icon: typeof ShieldCheck;
  accent: string;
  selected: string;
}[] = [
  {
    level: 'Citizen',
    title: 'Citizen',
    blurb:
      'Everyday essentials and clinically used compounds. A focused view for common supplements and well-established options.',
    unlocks: ['Everyday', 'Clinical'],
    icon: ShieldCheck,
    accent: 'text-emerald-500',
    selected: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500',
  },
  {
    level: 'Explorer',
    title: 'Explorer',
    blurb:
      'Everything in the Atlas, including experimental and frontier compounds with limited or emerging data.',
    unlocks: ['Everyday', 'Clinical', 'Frontier', 'Unknown'],
    icon: ShieldAlert,
    accent: 'text-purple-500',
    selected: 'bg-purple-50 dark:bg-purple-500/10 border-purple-500 ring-1 ring-purple-500',
  },
];

const CLASSIFICATION_REFERENCE: { classification: Classification; name: string; description: string }[] = [
  {
    classification: 'Everyday',
    name: 'Everyday',
    description: 'Widely available, well-studied basics such as vitamins, minerals, and common supplements.',
  },
  {
    classification: 'Clinical',
    name: 'Clinical',
    description: 'Compounds typically used in clinical or medical settings.',
  },
  {
    classification: 'Frontier',
    name: 'Frontier',
    description: 'Experimental or emerging compounds with limited data.',
  },
  {
    classification: 'Unknown',
    name: 'Unknown',
    description: 'Classification has not yet been determined.',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { scope, updateScope } = useUserScope();
  const [selectedLevel, setSelectedLevel] = useState<AccessLevel | null>(scope.accessLevel);

  const handleComplete = () => {
    if (!selectedLevel) return;
    updateScope({ accessLevel: selectedLevel });
    navigate('/map');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
      <div className="w-full max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4 text-slate-900 dark:text-zinc-50">
            Select Your Research Scope
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
            The Atlas ranges from everyday supplements to experimental compounds. Your research scope
            determines which classifications you see.
          </p>
        </div>

        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            {SCOPES.map((option) => (
              <button
                key={option.level}
                onClick={() => setSelectedLevel(option.level)}
                className={cn(
                  'text-left p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-sm',
                  selectedLevel === option.level
                    ? option.selected
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/60',
                )}
              >
                <option.icon className={cn('w-8 h-8 mb-4', option.accent)} />
                <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-zinc-100">{option.title}</h3>
                <p className="text-sm text-slate-600 dark:text-zinc-400 mb-4 leading-relaxed">{option.blurb}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {option.unlocks.map((classification) => (
                    <span
                      key={classification}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      <AccessBadge classification={classification} />
                      {classification}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Info size={16} className="text-slate-400 dark:text-zinc-500" />
              Classifications
            </h4>
            <div className="space-y-3">
              {CLASSIFICATION_REFERENCE.map((entry) => (
                <div key={entry.classification} className="flex items-start gap-3">
                  <AccessBadge classification={entry.classification} className="mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{entry.name}</span>
                    <p className="text-sm text-slate-600 dark:text-zinc-400">{entry.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={handleComplete}
              disabled={!selectedLevel}
              className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors shadow-sm"
            >
              Complete Setup <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
