import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit2, Plus, NotebookPen } from 'lucide-react';
import { useLogs, type PrivateNote } from '../context/LogContext';
import { SUPPLEMENTS, STACKS } from '../data/mockData';
import { EmptyState } from '../components/EmptyState';

export default function LogNotes() {
  const navigate = useNavigate();
  const { notes, addNote, editNote, deleteNote } = useLogs();

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkedSubstanceId, setLinkedSubstanceId] = useState('');
  const [linkedStackId, setLinkedStackId] = useState('');
  const [linkedDate, setLinkedDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    if (editingId) {
      editNote(editingId, { title, body, linkedSubstanceId, linkedStackId, linkedDate });
    } else {
      addNote({ title, body, linkedSubstanceId, linkedStackId, linkedDate });
    }

    setView('list');
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBody('');
    setLinkedSubstanceId('');
    setLinkedStackId('');
    setLinkedDate('');
  };

  const handleEdit = (note: PrivateNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setBody(note.body);
    setLinkedSubstanceId(note.linkedSubstanceId || '');
    setLinkedStackId(note.linkedStackId || '');
    setLinkedDate(note.linkedDate || '');
    setView('form');
  };

  const sortedNotes = [...notes].sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            if (view === 'form') {
              setView('list');
              resetForm();
            } else {
              navigate('/ledger');
            }
          }} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft size={20} className="text-slate-700 dark:text-zinc-300" />
          </button>
          <h1 className="text-lg font-bold">{view === 'form' ? (editingId ? 'Edit Note' : 'New Note') : 'Private Notes'}</h1>
        </div>
        {view === 'list' && (
          <button 
            onClick={() => setView('form')}
            className="flex items-center gap-1 px-4 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-full hover:bg-amber-600 transition-colors"
          >
            <Plus size={16} /> New Note
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6">
        {view === 'list' ? (
          <div className="space-y-4">
            {sortedNotes.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title="No private notes yet"
                description="Keep private notes on substances, stacks, or your own protocol. Only you can see them."
                action={{ label: 'Create your first note', onClick: () => setView('form') }}
              />
            ) : (
              sortedNotes.map(note => {
                const substance = SUPPLEMENTS.find(s => s.id === note.linkedSubstanceId);
                const stack = STACKS.find(s => s.id === note.linkedStackId);
                
                return (
                  <div key={note.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-zinc-100">{note.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {new Date(note.dateCreated).toLocaleDateString()}
                          {note.lastEdited !== note.dateCreated && ` (Edited ${new Date(note.lastEdited).toLocaleDateString()})`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(note)} className="p-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteNote(note.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap mb-3">
                      {note.body}
                    </p>

                    {(substance || stack || note.linkedDate) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {substance && <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">Substance: {substance.name}</span>}
                        {stack && <span className="px-2 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md">Stack: {stack.name}</span>}
                        {note.linkedDate && <span className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md">Date: {note.linkedDate}</span>}
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
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Title *</label>
                <input 
                  required value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title"
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-slate-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Body *</label>
                <textarea 
                  required value={body} onChange={e => setBody(e.target.value)} placeholder="Write your private note here..."
                  rows={8}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-slate-900 dark:text-zinc-100 resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Links (Optional)</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Link to Substance</label>
                  <select
                    value={linkedSubstanceId}
                    onChange={e => { setLinkedSubstanceId(e.target.value); setLinkedStackId(''); }}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  >
                    <option value="">-- None --</option>
                    {SUPPLEMENTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Link to Stack</label>
                  <select
                    value={linkedStackId}
                    onChange={e => { setLinkedStackId(e.target.value); setLinkedSubstanceId(''); }}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  >
                    <option value="">-- None --</option>
                    {STACKS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5 block">Link to Date</label>
                  <input 
                    type="date" value={linkedDate} onChange={e => setLinkedDate(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-slate-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-amber-500 text-white font-medium py-3.5 rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
            >
              Save Note
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
