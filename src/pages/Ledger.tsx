import { Pill, Activity, Smile, Dumbbell, FileText, Layers, CheckSquare, Clock, Shield, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

export default function Ledger() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8 px-4 pt-6 max-w-3xl mx-auto w-full transition-colors duration-200">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 mb-2">Ledger</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Record your daily data and track your protocols.</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* Section A: Daily Check-In */}
        <section>
          <div className="mb-4 px-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare size={16} className="text-emerald-500" />
              Daily Check-In
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Quick daily entries for subjective well-being.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Mood', type: 'mood', icon: Smile, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' },
              { name: 'Symptoms', type: 'symptoms', icon: Activity, color: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20' },
              { name: 'Recovery', type: 'recovery', icon: Dumbbell, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' },
            ].map((action) => (
              <button
                key={action.name}
                onClick={() => navigate(`/log/entry?type=${action.type}`)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-105 active:scale-95",
                  action.color,
                  "hover:opacity-80"
                )}
              >
                <action.icon size={24} className="mb-2 opacity-80" />
                <span className="text-xs font-semibold text-center leading-tight">{action.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Section B: Structured Log */}
        <section>
          <div className="mb-4 px-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              Structured Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Formal entries tied to exact intake, dose, and timing.</p>
          </div>
          <Link
            to="/log/intake"
            className="flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm group"
          >
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Pill size={24} className="text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-zinc-100">Log Intake</h4>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Record a specific dose of a substance or stack.</p>
            </div>
          </Link>
        </section>

        {/* Section C: Private Notes */}
        <section>
          <div className="mb-4 px-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={16} className="text-amber-500" />
              Private Notes
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Personal, unstructured observations and thoughts.</p>
          </div>
          <Link
            to="/log/notes"
            className="flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm group"
          >
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText size={24} className="text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-zinc-100">My Notes</h4>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Write and manage your private research notes.</p>
            </div>
          </Link>
        </section>

        {/* Section D: Stack Tracking */}
        <section>
          <div className="mb-4 px-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Layers size={16} className="text-purple-500" />
              Stack Tracking
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Track the progress and efficacy of a full stack over time.</p>
          </div>
          <Link
            to="/log/stack-progress"
            className="flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm group"
          >
            <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Activity size={24} className="text-purple-500" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-zinc-100">Log Stack Progress</h4>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Evaluate how a specific stack is performing for you.</p>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
