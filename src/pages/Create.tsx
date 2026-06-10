import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Search, X } from 'lucide-react';
import { BRANDS, STACKS, SUPPLEMENTS, type Post } from '../data/mockData';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase/client';
import { listDraftPosts, saveCommunityPost, uploadPostImage, type CommunityPostInput, type EntityType } from '../services/community';
import { BEARING_GROUPS, DISPATCH_BEARINGS, SIGNAL_BEARINGS, getSuggestedBearings } from '../data/communityTaxonomy';

type CreateType = 'Dispatch' | 'Signal';
type LinkOption = { id: string; name: string; type: EntityType };

const emptyDispatch = {
  title: '',
  content: '',
  dose: '',
  frequency: '',
  duration: '',
  startDate: '',
  productsUsed: '',
  quality: '',
  shipping: '',
  testing: '',
  value: '',
  buyAgain: '',
  sideEffects: '',
  shareAge: false,
  shareWeight: false,
  bearings: [] as string[],
};

const emptySignal = { title: '', content: '', bearings: [] as string[], entityId: '', entityType: '' as EntityType | '' };

export default function Create() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile, isBackendConfigured, user } = useAuth();
  const [activeType, setActiveType] = useState<CreateType | null>((searchParams.get('type') as CreateType) || null);
  const [draftId, setDraftId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLink, setSelectedLink] = useState<LinkOption | null>(null);
  const [dispatchData, setDispatchData] = useState(emptyDispatch);
  const [signalData, setSignalData] = useState(emptySignal);
  const [doseHistoryOpen, setDoseHistoryOpen] = useState(false);
  const [doseHistory, setDoseHistory] = useState([{ label: '', dose: '', frequency: '' }]);
  const [stackDosing, setStackDosing] = useState<Record<string, { dose: string; frequency: string }>>({});
  const [images, setImages] = useState<string[]>([]);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Post[]>([]);

  const linkOptions = useMemo<LinkOption[]>(() => [
    ...SUPPLEMENTS.map((item) => ({ id: item.id, name: item.name, type: 'substance' as const })),
    ...STACKS.filter((stack) => stack.status === 'approved').map((item) => ({ id: item.id, name: item.name, type: 'stack' as const })),
    ...BRANDS.map((item) => ({ id: item.id, name: item.name, type: 'brand' as const })),
  ], []);

  useEffect(() => {
    if (!isBackendConfigured || !supabase || !user) return;
    listDraftPosts(supabase, user.id).then(setDrafts).catch(() => {});
  }, [isBackendConfigured, user?.id]);

  const filteredLinks = searchQuery
    ? linkOptions.filter((link) => link.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  const selectedStack = selectedLink?.type === 'stack' ? STACKS.find((stack) => stack.id === selectedLink.id) : null;
  const suggestedBearings = getSuggestedBearings(selectedLink?.type ?? null, selectedLink?.id ?? null, activeType ?? 'Signal');

  useEffect(() => {
    if (!selectedStack) return;
    setStackDosing(Object.fromEntries(selectedStack.substances.map((substance) => [substance.id, stackDosing[substance.id] ?? { dose: '', frequency: '' }])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStack?.id]);

  const currentBearings = activeType === 'Dispatch' ? dispatchData.bearings : signalData.bearings;
  const setCurrentBearings = (bearings: string[]) => {
    if (activeType === 'Dispatch') setDispatchData((prev) => ({ ...prev, bearings }));
    if (activeType === 'Signal') setSignalData((prev) => ({ ...prev, bearings }));
  };

  const toggleBearing = (bearing: string) => {
    const allowed = activeType === 'Dispatch' ? DISPATCH_BEARINGS : SIGNAL_BEARINGS;
    if (!(allowed as readonly string[]).includes(bearing)) return;
    if (currentBearings.includes(bearing)) setCurrentBearings(currentBearings.filter((item) => item !== bearing));
    else if (currentBearings.length < 5) setCurrentBearings([...currentBearings, bearing]);
  };

  const buildInput = (status: 'draft' | 'published'): CommunityPostInput | null => {
    if (!activeType) return null;
    if (activeType === 'Dispatch') {
      return {
        id: draftId,
        type: 'Dispatch',
        status,
        title: dispatchData.title,
        content: dispatchData.content,
        entityType: selectedLink?.type ?? null,
        entityId: selectedLink?.id ?? null,
        bearings: dispatchData.bearings,
        dose: dispatchData.dose,
        frequency: dispatchData.frequency,
        duration: dispatchData.duration,
        startDate: dispatchData.startDate,
        sideEffects: dispatchData.sideEffects.split(',').map((item) => item.trim()).filter(Boolean),
        doseHistory: doseHistory.filter((item) => item.label || item.dose || item.frequency),
        stackDosing: selectedStack?.substances.map((substance) => ({
          substanceId: substance.id,
          substanceName: substance.name,
          dose: stackDosing[substance.id]?.dose ?? '',
          frequency: stackDosing[substance.id]?.frequency ?? '',
        })) ?? [],
        brandDetails: selectedLink?.type === 'brand' ? {
          productsUsed: dispatchData.productsUsed,
          quality: dispatchData.quality,
          shipping: dispatchData.shipping,
          testing: dispatchData.testing,
          value: dispatchData.value,
          buyAgain: dispatchData.buyAgain,
        } : undefined,
        sharedAge: dispatchData.shareAge ? profile?.age ?? null : null,
        sharedWeight: dispatchData.shareWeight && profile?.weight ? `${profile.weight} lbs` : null,
        imageUrls: images,
      };
    }
    const signalLink = signalData.entityType && signalData.entityId ? { type: signalData.entityType, id: signalData.entityId } : null;
    return {
      id: draftId,
      type: 'Signal',
      status,
      title: signalData.title,
      content: signalData.content,
      entityType: signalLink?.type ?? null,
      entityId: signalLink?.id ?? null,
      bearings: signalData.bearings,
      imageUrls: images,
    };
  };

  useEffect(() => {
    if (!isBackendConfigured || !supabase || !profile || !activeType) return;
    const input = buildInput('draft');
    if (!input || (!input.title && !input.content && !input.entityId && input.bearings.length === 0 && images.length === 0)) return;
    const timeout = window.setTimeout(() => {
      setAutosaveState('saving');
      saveCommunityPost(supabase!, input, profile)
        .then((id) => {
          setDraftId(id);
          setAutosaveState('saved');
        })
        .catch(() => setAutosaveState('idle'));
    }, 1200);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, dispatchData, signalData, selectedLink, images, doseHistory, stackDosing, isBackendConfigured, profile?.id]);

  const validate = () => {
    if (!activeType) return false;
    const input = buildInput('published');
    if (!input) return false;
    if (!input.title.trim() || !input.content.trim()) return toast('Title and written experience are required.', 'error'), false;
    if (input.bearings.length < 1 || input.bearings.length > 5) return toast('Select 1–5 Bearings.', 'error'), false;
    if (activeType === 'Dispatch') {
      if (!selectedLink) return toast('A Dispatch must link to an approved substance, stack, or brand.', 'error'), false;
      if (selectedLink.type === 'substance' && (!dispatchData.dose.trim() || !dispatchData.frequency.trim() || !(dispatchData.duration.trim() || dispatchData.startDate.trim()))) return toast('Substance Dispatches require dose, frequency, and duration or start date.', 'error'), false;
      if (selectedLink.type === 'stack') {
        if (!(dispatchData.duration.trim() || dispatchData.startDate.trim())) return toast('Stack Dispatches require duration or start date.', 'error'), false;
        const missing = selectedStack?.substances.some((substance) => !stackDosing[substance.id]?.dose.trim() || !stackDosing[substance.id]?.frequency.trim());
        if (missing) return toast('Each stack component needs a dose and frequency.', 'error'), false;
      }
      if (selectedLink.type === 'brand' && (!dispatchData.productsUsed.trim() || !(dispatchData.duration.trim() || dispatchData.startDate.trim()))) return toast('Brand Dispatches require products used and duration or start date.', 'error'), false;
    }
    return true;
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || images.length >= 4 || !user) return;
    const selected = Array.from(files).slice(0, 4 - images.length);
    if (!isBackendConfigured || !supabase) {
      setImages((prev) => [...prev, ...selected.map((file) => URL.createObjectURL(file))].slice(0, 4));
      return;
    }
    try {
      const urls = await Promise.all(selected.map((file) => uploadPostImage(supabase!, user.id, file)));
      setImages((prev) => [...prev, ...urls].slice(0, 4));
    } catch {
      toast('Could not upload image.', 'error');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !validate()) return;
    const input = buildInput('published');
    if (!input) return;
    setSubmitting(true);
    try {
      if (isBackendConfigured && supabase) await saveCommunityPost(supabase, input, profile);
      toast(`${activeType} published.`);
      navigate('/square');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not publish post.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const loadDraft = (draft: Post) => {
    setDraftId(draft.id);
    setActiveType(draft.type);
    setImages(draft.images ?? []);
    if (draft.type === 'Dispatch') {
      const linkType = draft.supplementId ? 'substance' : draft.stackId ? 'stack' : draft.brandId ? 'brand' : null;
      const linkId = draft.supplementId ?? draft.stackId ?? draft.brandId ?? '';
      const link = linkType ? linkOptions.find((option) => option.type === linkType && option.id === linkId) ?? null : null;
      setSelectedLink(link);
      setDispatchData({
        ...emptyDispatch,
        title: draft.title,
        content: draft.content,
        dose: draft.logDetails?.dosage ?? '',
        duration: draft.logDetails?.duration ?? '',
        sideEffects: draft.sideEffects?.join(', ') ?? '',
        bearings: draft.bearings ?? [],
      });
      setDoseHistory(draft.doseHistory?.length ? draft.doseHistory : [{ label: '', dose: '', frequency: '' }]);
      setStackDosing(Object.fromEntries((draft.stackDosing ?? []).map((item) => [item.substanceId, { dose: item.dose, frequency: item.frequency }])));
    } else {
      setSignalData({ title: draft.title, content: draft.content, bearings: draft.bearings ?? [], entityId: draft.entityId ?? '', entityType: (draft.entityType as EntityType) ?? '' });
    }
  };

  const renderBearingPicker = () => {
    const groups = Object.entries(BEARING_GROUPS).filter(([group]) => activeType === 'Signal' || group !== 'Signal-only Discussion');
    return (
      <div className="space-y-4">
        {suggestedBearings.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Suggested for this link</h4>
            <div className="flex flex-wrap gap-2">{suggestedBearings.map(renderBearingButton)}</div>
          </section>
        )}
        {groups.map(([group, bearings]) => (
          <section key={group}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">{group}</h4>
            <div className="flex flex-wrap gap-2">{bearings.map(renderBearingButton)}</div>
          </section>
        ))}
      </div>
    );
  };

  const renderBearingButton = (bearing: string) => {
    const selected = currentBearings.includes(bearing);
    return <button key={bearing} type="button" onClick={() => toggleBearing(bearing)} className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', selected ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800')}>{bearing}</button>;
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 md:pb-8">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <button onClick={() => navigate(-1)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold">Create</h1>
        <span className="ml-auto text-xs text-slate-500 dark:text-zinc-500">{autosaveState === 'saving' ? 'Saving draft…' : autosaveState === 'saved' ? 'Draft saved' : ''}</span>
      </div>

      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        {!activeType ? (
          <div className="space-y-8">
            {drafts.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Your drafts</h2>
                <div className="space-y-2">{drafts.map((draft) => <button key={draft.id} type="button" onClick={() => loadDraft(draft)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-zinc-800 dark:hover:bg-zinc-800"><span>{draft.title || 'Untitled draft'}</span><span className="text-xs text-slate-500">{draft.type}</span></button>)}</div>
              </section>
            )}
            <div className="mx-auto mt-10 flex min-h-[50vh] max-w-2xl flex-col items-stretch justify-center gap-6 sm:flex-row">
              {(['Dispatch', 'Signal'] as CreateType[]).map((type) => <button key={type} onClick={() => setActiveType(type)} className="flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-emerald-500 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"><h2 className="mb-3 text-2xl font-bold">{type}</h2><p className="text-center text-sm leading-relaxed text-slate-500 dark:text-zinc-400">{type === 'Dispatch' ? 'Write a structured experience report linked to one approved entity.' : 'Share a short freeform community post.'}</p></button>)}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">New {activeType}</h2><button type="button" onClick={() => setActiveType(null)} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">Change Type</button></div>

            {activeType === 'Dispatch' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 font-semibold">Link one approved entity</h3>
                {selectedLink ? <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><span>{selectedLink.name} · {selectedLink.type}</span><button type="button" onClick={() => setSelectedLink(null)}><X size={16} /></button></div> : <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search substances, stacks, or brands" className="w-full rounded-xl border border-slate-200 bg-transparent py-2 pl-10 pr-4 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />{filteredLinks.length > 0 && <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">{filteredLinks.map((link) => <button key={`${link.type}-${link.id}`} type="button" onClick={() => { setSelectedLink(link); setSearchQuery(''); }} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-700">{link.name} <span className="ml-2 text-xs capitalize text-slate-400">{link.type}</span></button>)}</div>}</div>}
              </section>
            )}

            {activeType === 'Signal' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-3 font-semibold">Optional link</h3>
                <select value={`${signalData.entityType}:${signalData.entityId}`} onChange={(e) => { const [type, id] = e.target.value.split(':') as [EntityType | '', string]; setSignalData((prev) => ({ ...prev, entityType: type, entityId: id ?? '' })); }} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-zinc-700">
                  <option value=":">General Signal — no entity</option>
                  {linkOptions.map((link) => <option key={`${link.type}-${link.id}`} value={`${link.type}:${link.id}`}>{link.name} · {link.type}</option>)}
                </select>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <input required value={activeType === 'Dispatch' ? dispatchData.title : signalData.title} onChange={(e) => activeType === 'Dispatch' ? setDispatchData({ ...dispatchData, title: e.target.value }) : setSignalData({ ...signalData, title: e.target.value })} placeholder="Title" className="mb-4 w-full border-0 bg-transparent text-xl font-semibold outline-none placeholder:text-slate-400" />
              <textarea required rows={8} value={activeType === 'Dispatch' ? dispatchData.content : signalData.content} onChange={(e) => activeType === 'Dispatch' ? setDispatchData({ ...dispatchData, content: e.target.value }) : setSignalData({ ...signalData, content: e.target.value })} placeholder={activeType === 'Dispatch' ? 'Write the experience first. What changed, what surprised you, and what should others know?' : 'What do you want to share with the community?'} className="w-full resize-none rounded-xl border border-slate-200 bg-transparent px-4 py-3 leading-relaxed focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
            </section>

            {activeType === 'Dispatch' && selectedLink && (
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="font-semibold">Dose and timing</h3>
                {selectedLink.type === 'stack' && selectedStack ? <div className="space-y-3">{selectedStack.substances.map((substance) => <div key={substance.id} className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800"><div className="mb-2 text-sm font-medium">{substance.name}</div><div className="grid gap-3 sm:grid-cols-2"><input placeholder="Dose / amount" value={stackDosing[substance.id]?.dose ?? ''} onChange={(e) => setStackDosing({ ...stackDosing, [substance.id]: { ...stackDosing[substance.id], dose: e.target.value } })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input placeholder="Frequency / schedule" value={stackDosing[substance.id]?.frequency ?? ''} onChange={(e) => setStackDosing({ ...stackDosing, [substance.id]: { ...stackDosing[substance.id], frequency: e.target.value } })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /></div></div>)}</div> : selectedLink.type === 'brand' ? <div className="grid gap-3 sm:grid-cols-2"><input placeholder="Product or products used" value={dispatchData.productsUsed} onChange={(e) => setDispatchData({ ...dispatchData, productsUsed: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-zinc-700" /><input placeholder="Duration or start date" value={dispatchData.duration} onChange={(e) => setDispatchData({ ...dispatchData, duration: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-zinc-700" /></div> : <div className="grid gap-3 sm:grid-cols-3"><input placeholder="Current dose / amount" value={dispatchData.dose} onChange={(e) => setDispatchData({ ...dispatchData, dose: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-zinc-700" /><input placeholder="Frequency / schedule" value={dispatchData.frequency} onChange={(e) => setDispatchData({ ...dispatchData, frequency: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-zinc-700" /><input placeholder="Duration or start date" value={dispatchData.duration} onChange={(e) => setDispatchData({ ...dispatchData, duration: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-zinc-700" /></div>}
                <button type="button" onClick={() => setDoseHistoryOpen(!doseHistoryOpen)} className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{doseHistoryOpen ? 'Hide dose history' : 'Dose changed over time'}</button>
                {doseHistoryOpen && <div className="space-y-2">{doseHistory.map((row, index) => <div key={index} className="grid gap-2 sm:grid-cols-3"><input placeholder="Week 1 / Current" value={row.label} onChange={(e) => setDoseHistory(doseHistory.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input placeholder="Dose" value={row.dose} onChange={(e) => setDoseHistory(doseHistory.map((item, i) => i === index ? { ...item, dose: e.target.value } : item))} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input placeholder="Frequency" value={row.frequency} onChange={(e) => setDoseHistory(doseHistory.map((item, i) => i === index ? { ...item, frequency: e.target.value } : item))} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /></div>)}<button type="button" onClick={() => setDoseHistory([...doseHistory, { label: '', dose: '', frequency: '' }])} className="text-xs font-medium text-slate-500">Add another change</button></div>}
                {selectedLink.type === 'brand' && <div className="grid gap-3 sm:grid-cols-2"><input placeholder="Quality notes" value={dispatchData.quality} onChange={(e) => setDispatchData({ ...dispatchData, quality: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input placeholder="Shipping / customer service" value={dispatchData.shipping} onChange={(e) => setDispatchData({ ...dispatchData, shipping: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input placeholder="Testing / COA" value={dispatchData.testing} onChange={(e) => setDispatchData({ ...dispatchData, testing: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /><input placeholder="Price / value / buy again?" value={dispatchData.value} onChange={(e) => setDispatchData({ ...dispatchData, value: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" /></div>}
                <input placeholder="Side effects (optional, comma-separated)" value={dispatchData.sideEffects} onChange={(e) => setDispatchData({ ...dispatchData, sideEffects: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-zinc-400"><label><input type="checkbox" checked={dispatchData.shareAge} onChange={(e) => setDispatchData({ ...dispatchData, shareAge: e.target.checked })} /> Attach age</label><label><input type="checkbox" checked={dispatchData.shareWeight} onChange={(e) => setDispatchData({ ...dispatchData, shareWeight: e.target.checked })} /> Attach weight</label></div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h3 className="mb-3 font-semibold">Bearings <span className="text-red-500">*</span></h3>{renderBearingPicker()}</section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"><h3 className="mb-3 font-semibold">Images</h3><div className="grid gap-3 sm:grid-cols-4">{images.map((image) => <div key={image} className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800"><img src={image} alt="Upload preview" className="h-28 w-full object-cover" /><button type="button" onClick={() => setImages(images.filter((item) => item !== image))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X size={14} /></button></div>)}{images.length < 4 && <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-zinc-700"><ImagePlus size={22} /><span>Add image</span><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} /></label>}</div></section>

            <div className="flex justify-end"><button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-60">Publish {activeType}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
