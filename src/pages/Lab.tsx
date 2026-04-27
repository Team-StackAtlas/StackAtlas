import { CalendarDays, Calculator, AlertTriangle, Scale, ShieldAlert, Activity, GitCompare, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import Calendar from '../components/Calendar';
import { useNavigate } from 'react-router-dom';

export default function Lab() {
  const navigate = useNavigate();

  const toolGroups = [
    {
      title: 'Calculators',
      tools: [
        { id: 'half-life-calculator', name: 'Half-Life Calculator', icon: Calculator, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { id: 'dosage-calculator', name: 'Dosage Calculator', icon: Scale, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      ]
    },
    {
      title: 'Safety & Checks',
      tools: [
        { id: 'interaction-checker', name: 'Interaction Checker', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { id: 'legality-checker', name: 'Legality Checker', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
        { id: 'risk-score-generator', name: 'Risk Score Generator', icon: Activity, color: 'text-orange-400', bg: 'bg-orange-500/10' },
      ]
    },
    {
      title: 'Comparisons',
      tools: [
        { id: 'substance-comparison-tool', name: 'Substance Comparison Tool', icon: GitCompare, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        { id: 'brand-comparison-tool', name: 'Brand Comparison Tool', icon: GitCompare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { id: 'stack-comparison-tool', name: 'Stack Comparison Tool', icon: Layers, color: 'text-violet-400', bg: 'bg-violet-500/10' },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8 px-4 pt-6 max-w-3xl mx-auto w-full transition-colors duration-200">
      {/* Calendar View Card */}
      <div className="mb-8">
        <Calendar />
      </div>

      <div className="space-y-8">
        {toolGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mb-4 px-2">{group.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => navigate(`/lab/${tool.id}`)}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-all group text-left shadow-sm"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110", tool.bg)}>
                    <tool.icon size={20} className={tool.color} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200 group-hover:text-slate-900 dark:group-hover:text-zinc-50 transition-colors">{tool.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
