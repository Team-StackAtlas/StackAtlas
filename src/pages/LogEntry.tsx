import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Activity, AlertTriangle, Dumbbell, Droplet, Calendar as CalendarIcon, Angry, Frown, Meh, Smile, Laugh, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type LogType = 'sleep' | 'mood' | 'symptoms' | 'side_effects' | 'workout' | 'bloodwork';

const LOG_TYPES: Record<LogType, { title: string; icon: LucideIcon; color: string; bg: string }> = {
  sleep: { title: 'Sleep', icon: Moon, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  mood: { title: 'Mood', icon: Sun, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  symptoms: { title: 'Symptoms', icon: Activity, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  side_effects: { title: 'Side Effects', icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  workout: { title: 'Workout', icon: Dumbbell, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  bloodwork: { title: 'Bloodwork', icon: Droplet, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
};

export default function LogEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') as LogType) || 'mood';
  
  const config = LOG_TYPES[type];
  const Icon = config.icon;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [value, setValue] = useState<number | string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to context/backend
    navigate('/log');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} className="text-slate-700 dark:text-zinc-300" />
        </button>
        <h1 className="text-lg font-bold">Log {config.title}</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center py-8 mb-6">
          <div className={cn("h-20 w-20 rounded-full flex items-center justify-center mb-4", config.bg, config.color)}>
            <Icon size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">How's your {config.title.toLowerCase()}?</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <CalendarIcon size={16} /> Date
            </label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
            />
          </div>

          {type === 'sleep' && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block">Hours of Sleep</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max="14" 
                  step="0.5"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full accent-blue-500"
                />
                <span className="text-xl font-bold w-16 text-center">{value || 0}h</span>
              </div>
              
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block mt-6">Sleep Quality</label>
              <div className="flex gap-2">
                {['Poor', 'Fair', 'Good', 'Excellent'].map(q => (
                  <button
                    key={q}
                    type="button"
                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-blue-500"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'mood' && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block">How are you feeling?</label>
              <div className="flex justify-between gap-2">
                {[
                  { icon: Angry, label: 'Awful', color: 'text-red-500 dark:text-red-400' },
                  { icon: Frown, label: 'Bad', color: 'text-orange-500 dark:text-orange-400' },
                  { icon: Meh, label: 'Okay', color: 'text-slate-400 dark:text-zinc-500' },
                  { icon: Smile, label: 'Good', color: 'text-emerald-500 dark:text-emerald-400' },
                  { icon: Laugh, label: 'Great', color: 'text-emerald-600 dark:text-emerald-400' },
                ].map(m => (
                  <button
                    key={m.label}
                    type="button"
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-amber-500 flex-1"
                  >
                    <m.icon size={26} className={m.color} />
                    <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(type === 'symptoms' || type === 'side_effects') && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block">Select {config.title}</label>
              <div className="flex flex-wrap gap-2">
                {['Headache', 'Nausea', 'Fatigue', 'Dizziness', 'Anxiety', 'Insomnia', 'Brain Fog', 'Stomach Ache'].map(s => (
                  <button
                    key={s}
                    type="button"
                    className="px-4 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-rose-500"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block mt-6">Severity</label>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">Mild</span>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  className="w-full accent-rose-500"
                />
                <span className="text-xs text-slate-500">Severe</span>
              </div>
            </div>
          )}

          {type === 'workout' && (
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block">Workout Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Weightlifting', 'Cardio', 'Yoga', 'HIIT', 'Sports', 'Other'].map(w => (
                  <button
                    key={w}
                    type="button"
                    className="py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors focus:ring-2 focus:ring-emerald-500"
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Duration (min)</label>
                  <input 
                    type="number" 
                    placeholder="45"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Intensity</label>
                  <select className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {type === 'bloodwork' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 text-sm mb-4">
                Upload your bloodwork results or enter key markers manually.
              </div>
              
              <button type="button" className="w-full py-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                <Droplet size={24} />
                <span className="font-medium">Upload PDF or Image</span>
              </button>

              <div className="pt-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-700 dark:text-zinc-300">Key Markers</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Testosterone (ng/dL)</label>
                    <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-slate-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Free Testosterone (pg/mL)</label>
                    <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-slate-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Estradiol (pg/mL)</label>
                    <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-slate-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Vitamin D (ng/mL)</label>
                    <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-slate-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">TSH (mIU/L)</label>
                    <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-slate-900 dark:text-zinc-100" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Cortisol (mcg/dL)</label>
                    <input type="number" className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-500/50 text-slate-900 dark:text-zinc-100" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300 block mb-2">Additional Notes</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other details..."
              className="w-full h-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
            >
              Save {config.title} Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
