import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Search, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { SUPPLEMENTS, BRANDS, Post, Domain, addPost } from '../data/mockData';
import { cn } from '../lib/utils';
import { useUserScope } from '../context/UserScopeContext';
import { useToast } from '../components/ui/ToastProvider';

type CreateType = 'Dispatch' | 'Signal';

const BEARINGS = [
  'Sleep', 'Focus', 'Energy', 'Mood', 'Anxiety', 'Recovery', 'Strength', 'Endurance', 'Longevity', 'Libido'
];

export default function Create() {
  const navigate = useNavigate();
  const { scope } = useUserScope();
  const { toast } = useToast();
  const [activeType, setActiveType] = useState<CreateType | null>(null);

  // Dispatch State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLink, setSelectedLink] = useState<{ id: string, name: string, type: 'supplement' | 'brand' } | null>(null);
  const [dispatchData, setDispatchData] = useState({
    title: '',
    content: '',
    dose: '',
    frequency: '',
    duration: '',
    startDate: '',
    benefits: '',
    sideEffects: '',
    age: '',
    weight: '',
    sex: '',
    goal: ''
  });

  // Signal State
  const [signalData, setSignalData] = useState({
    title: '',
    content: '',
    bearings: [] as string[]
  });

  const getFilteredLinks = () => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const supplements = SUPPLEMENTS.filter(s => s.name.toLowerCase().includes(q)).map(s => ({ id: s.id, name: s.name, type: 'supplement' as const }));
    const brands = BRANDS.filter(b => b.name.toLowerCase().includes(q)).map(b => ({ id: b.id, name: b.name, type: 'brand' as const }));
    return [...supplements, ...brands].slice(0, 5);
  };

  const calculateGoldProgress = () => {
    const fields = ['dose', 'frequency', 'duration', 'startDate', 'benefits', 'sideEffects', 'age', 'weight', 'sex', 'goal'];
    const filled = fields.filter(f => dispatchData[f as keyof typeof dispatchData].trim() !== '').length;
    return {
      percentage: Math.round((filled / fields.length) * 100),
      missing: fields.filter(f => dispatchData[f as keyof typeof dispatchData].trim() === '')
    };
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLink) {
      toast('You must link this Dispatch to an existing substance or brand.', 'error');
      return;
    }
    
    const newPost: Post = {
      id: `p${Date.now()}`,
      type: 'Dispatch',
      title: dispatchData.title,
      content: dispatchData.content,
      structuredContent: {
        dosages: `${dispatchData.dose} ${dispatchData.frequency}`,
        effects: dispatchData.benefits,
        sideEffects: dispatchData.sideEffects,
        personalExperience: dispatchData.content
      },
      author: { id: 'u1', username: 'admin', isVerified: true, age: parseInt(dispatchData.age) || 30 },
      domain: 'All', // Default or derived from selectedLink
      category: 'General',
      supplementId: selectedLink.type === 'supplement' ? selectedLink.id : undefined,
      brandId: selectedLink.type === 'brand' ? selectedLink.id : undefined,
      helpfulCount: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      logDetails: { duration: dispatchData.duration, dosage: dispatchData.dose },
      qualityScore: isGold ? 90 : 50
    };
    
    addPost(newPost);
    navigate('/square');
  };

  const handleSignalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signalData.bearings.length === 0) {
      toast('You must select at least one Bearing.', 'error');
      return;
    }
    
    const newPost: Post = {
      id: `p${Date.now()}`,
      type: 'Signal',
      title: signalData.title,
      content: signalData.content,
      author: { id: 'u1', username: 'admin', isVerified: true, age: 30 },
      domain: 'All',
      category: 'General',
      helpfulCount: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      qualityScore: 50,
      bearings: signalData.bearings
    };
    
    addPost(newPost);
    navigate('/square');
  };

  const toggleBearing = (bearing: string) => {
    setSignalData(prev => {
      if (prev.bearings.includes(bearing)) {
        return { ...prev, bearings: prev.bearings.filter(b => b !== bearing) };
      }
      if (prev.bearings.length >= 5) return prev;
      return { ...prev, bearings: [...prev.bearings, bearing] };
    });
  };

  const progress = calculateGoldProgress();
  const isGold = progress.percentage === 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 pb-24 md:pb-8">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} className="text-slate-700 dark:text-zinc-300" />
        </button>
        <h1 className="text-lg font-bold">Create</h1>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6">
        {!activeType ? (
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-6 min-h-[50vh] max-w-2xl mx-auto mt-10">
            <button 
              onClick={() => setActiveType('Dispatch')}
              className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Dispatch</h2>
                <div className="relative group/tooltip">
                  <HelpCircle size={18} className="text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 dark:bg-zinc-800 text-white text-xs rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 shadow-xl">
                    A structured log linked to a specific substance or brand. Reach Gold status to contribute to global averages.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-zinc-800"></div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 text-center leading-relaxed">Create a detailed, structured log to track your experience and contribute to the community database.</p>
            </button>

            <button 
              onClick={() => setActiveType('Signal')}
              className="flex-1 flex flex-col items-center justify-center p-8 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all group"
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Signal</h2>
                <div className="relative group/tooltip">
                  <HelpCircle size={18} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800 dark:bg-zinc-800 text-white text-xs rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 shadow-xl">
                    An unstructured post to share thoughts, ask questions, or discuss topics using Bearings.
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-zinc-800"></div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400 text-center leading-relaxed">Share a quick update, ask a question, or start a discussion with the community.</p>
            </button>
          </div>
        ) : activeType === 'Dispatch' ? (
          <form onSubmit={handleDispatchSubmit} className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">New Dispatch</h2>
              <button type="button" onClick={() => setActiveType(null)} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">Change Type</button>
            </div>

            {/* Linking Section */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                1. Link to Entity <span className="text-red-500">*</span>
              </h3>
              {selectedLink ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{selectedLink.name} ({selectedLink.type})</span>
                  <button type="button" onClick={() => setSelectedLink(null)} className="text-sm text-emerald-600 hover:underline">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for a substance or brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden z-20">
                      {getFilteredLinks().map(link => (
                        <button
                          key={link.id}
                          type="button"
                          onClick={() => { setSelectedLink(link); setSearchQuery(''); }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-700 text-sm"
                        >
                          {link.name} <span className="text-slate-400 text-xs ml-2 capitalize">{link.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Gold Progress */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  2. Gold Completion
                  <div className="relative group/tooltip">
                    <HelpCircle size={14} className="text-slate-400" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 text-center">
                      {isGold ? "Gold status achieved! This dispatch will contribute to global averages." : `Missing: ${progress.missing.join(', ')}`}
                    </div>
                  </div>
                </h3>
                <span className={cn("font-bold", isGold ? "text-amber-500" : "text-slate-500")}>
                  {progress.percentage}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", isGold ? "bg-amber-500" : "bg-emerald-500")}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              {isGold && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 group/platinum relative w-max">
                  <Star size={12} className="fill-current" /> Gold Status Achieved! 
                  <span className="text-slate-500 dark:text-zinc-400 ml-1 cursor-help underline decoration-dotted">What about Platinum?</span>
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/platinum:opacity-100 group-hover/platinum:visible transition-all z-10">
                    Platinum status requires verified bloodwork and a minimum 6-month log duration. (Informational only, no upgrade logic implemented yet).
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
              <h3 className="font-semibold">3. Details</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Title"
                  required
                  value={dispatchData.title}
                  onChange={e => setDispatchData({...dispatchData, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  placeholder="Content / Experience"
                  required
                  rows={4}
                  value={dispatchData.content}
                  onChange={e => setDispatchData({...dispatchData, content: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Dose (e.g., 200mg)" value={dispatchData.dose} onChange={e => setDispatchData({...dispatchData, dose: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                  <input type="text" placeholder="Frequency (e.g., Daily)" value={dispatchData.frequency} onChange={e => setDispatchData({...dispatchData, frequency: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                  <input type="text" placeholder="Duration (e.g., 4 weeks)" value={dispatchData.duration} onChange={e => setDispatchData({...dispatchData, duration: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                  <input type="date" placeholder="Start Date" value={dispatchData.startDate} onChange={e => setDispatchData({...dispatchData, startDate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                  <input type="text" placeholder="Benefits" value={dispatchData.benefits} onChange={e => setDispatchData({...dispatchData, benefits: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                  <input type="text" placeholder="Side Effects (or 'None')" value={dispatchData.sideEffects} onChange={e => setDispatchData({...dispatchData, sideEffects: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <h4 className="text-sm font-medium text-slate-500 mb-3">Demographics (for Peer Match)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <input type="number" placeholder="Age" value={dispatchData.age} onChange={e => setDispatchData({...dispatchData, age: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                    <input type="text" placeholder="Weight" value={dispatchData.weight} onChange={e => setDispatchData({...dispatchData, weight: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                    <select value={dispatchData.sex} onChange={e => setDispatchData({...dispatchData, sex: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm">
                      <option value="">Sex</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="text" placeholder="Goal" value={dispatchData.goal} onChange={e => setDispatchData({...dispatchData, goal: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-emerald-500 text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors">
                Submit Dispatch
              </button>
            </div>
          </form>
        ) : activeType === 'Signal' ? (
          <form onSubmit={handleSignalSubmit} className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">New Signal</h2>
              <button type="button" onClick={() => setActiveType(null)} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">Change Type</button>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-6">
              <input
                type="text"
                placeholder="Title"
                required
                value={signalData.title}
                onChange={e => setSignalData({...signalData, title: e.target.value})}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-blue-500 text-lg font-medium"
              />

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Select Bearings (1-5) <span className="text-red-500">*</span></h3>
                <div className="flex flex-wrap gap-2">
                  {BEARINGS.map(bearing => {
                    const isSelected = signalData.bearings.includes(bearing);
                    return (
                      <button
                        key={bearing}
                        type="button"
                        onClick={() => toggleBearing(bearing)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                          isSelected 
                            ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" 
                            : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700"
                        )}
                      >
                        {bearing}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                placeholder="What's on your mind?"
                required
                rows={6}
                value={signalData.content}
                onChange={e => setSignalData({...signalData, content: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors">
                Broadcast Signal
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
