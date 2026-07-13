import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useLogs } from '../context/LogContext';
import { cn } from '../lib/utils';
import { SUPPLEMENTS, STACKS } from '../data/mockData';

export default function LogIntake() {
  const navigate = useNavigate();
  const { logs, addLog, deleteLog } = useLogs();

  const [view, setView] = useState<'list' | 'form'>('list');
  
  const [intakeType, setIntakeType] = useState<'substance' | 'stack'>('substance');
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mg');
  const [route, setRoute] = useState('Oral');
  const [frequencyNote, setFrequencyNote] = useState('');
  const [linkedGoal, setLinkedGoal] = useState('');
  const [shortNote, setShortNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !date || !time || !dose || !unit || !route) return;

    addLog({
      substanceId: intakeType === 'substance' ? selectedId : undefined,
      stackId: intakeType === 'stack' ? selectedId : undefined,
      date,
      time,
      dose,
      unit,
      route,
      frequencyNote,
      linkedGoal,
      shortNote
    });

    setView('list');
    // reset form
    setSelectedId('');
    setDose('');
    setFrequencyNote('');
    setLinkedGoal('');
    setShortNote('');
  };

  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => view === 'form' ? setView('list') : navigate('/ledger')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-slate-700 dark:text-zinc-300" />
          </button>
          <h1 className="text-lg font-bold">{view === 'form' ? 'New Intake Log' : 'Intake History'}</h1>
        </div>
        {view === 'list' && (
          <button 
            onClick={() => setView('form')}
            className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-full hover:bg-emerald-600 transition-colors"
          >
            Log Intake
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6">
        {view === 'list' ? (
          <div className="space-y-4">
            {sortedLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-zinc-400">
                <p>No intake logs yet.</p>
                <button 
                  onClick={() => setView('form')}
                  className="mt-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-medium"
                >
                  Create your first log
                </button>
              </div>
            ) : (
              sortedLogs.map(log => {
                const substance = SUPPLEMENTS.find(s => s.id === log.substanceId);
                const stack = STACKS.find(s => s.id === log.stackId);
                const name = substance?.name || stack?.name || log.substance || 'Unknown';
                
                return (
                  <div key={log.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-zinc-100">{name}</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{log.date} at {log.time}</p>
                      </div>
                      <button onClick={() => deleteLog(log.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-slate-500 dark:text-zinc-400">Dose:</span> {log.dose} {log.unit}</div>
                      <div><span className="text-slate-500 dark:text-zinc-400">Route:</span> {log.route}</div>
                      {log.frequencyNote && <div className="col-span-2"><span className="text-slate-500 dark:text-zinc-400">Freq:</span> {log.frequencyNote}</div>}
                      {log.linkedGoal && <div className="col-span-2"><span className="text-slate-500 dark:text-zinc-400">Goal:</span> {log.linkedGoal}</div>}
                    </div>
                    {log.shortNote && (
                      <div className="text-sm bg-slate-50 dark:bg-zinc-950 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                        {log.shortNote}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">What are you taking?</h2>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIntakeType('substance'); setSelectedId(''); }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                    intakeType === 'substance' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                  )}
                >
                  Substance
                </button>
                <button
                  type="button"
                  onClick={() => { setIntakeType('stack'); setSelectedId(''); }}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                    intakeType === 'stack' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                  )}
                >
                  Stack
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Select {intakeType === 'substance' ? 'Substance' : 'Stack'} *</label>
                <select
                  required
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                >
                  <option value="">-- Select --</option>
                  {intakeType === 'substance' 
                    ? SUPPLEMENTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    : STACKS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                  }
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">When?</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Date *</label>
                  <input 
                    type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Time *</label>
                  <input 
                    type="time" required value={time} onChange={e => setTime(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Details</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Dose *</label>
                  <input 
                    required value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 500"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Unit *</label>
                  <input 
                    required value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. mg"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Route *</label>
                  <input 
                    required value={route} onChange={e => setRoute(e.target.value)} placeholder="e.g. Oral"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Frequency Note (Optional)</label>
                <input 
                  value={frequencyNote} onChange={e => setFrequencyNote(e.target.value)} placeholder="e.g. 3x a week, as needed"
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Linked Goal (Optional)</label>
                <input 
                  value={linkedGoal} onChange={e => setLinkedGoal(e.target.value)} placeholder="e.g. Better sleep, focus"
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Short Note (Optional)</label>
                <textarea 
                  value={shortNote} onChange={e => setShortNote(e.target.value)} placeholder="Any immediate observations..."
                  rows={3}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all text-slate-900 dark:text-zinc-100 resize-none"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-500 text-white font-medium py-3.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Save Intake Log
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
