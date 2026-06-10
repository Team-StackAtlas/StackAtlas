import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Search, X } from 'lucide-react';
import { SUPPLEMENTS, BRANDS, STACKS, Post, Domain, addPost } from '../data/mockData';
import { cn } from '../lib/utils';


type CreateType = 'Dispatch' | 'Signal';
type EntityType = 'supplement' | 'brand' | 'stack';
type EntityOption = { id: string; name: string; type: EntityType; categories: string[] };
type BearingMode = 'dispatch' | 'signal';
type Dose = { amount: string; unit: string };
type Duration = { amount: string; unit: string };
type Frequency = { preset: string; everyAmount: string; everyUnit: string };
type SubstanceProtocol = { dose: Dose; frequency: Frequency };

type FormErrors = Partial<Record<'entity' | 'title' | 'content' | 'dose' | 'frequency' | 'duration' | 'bearings', string>>;

const MIN_DISPATCH_BODY_CHARS = 100;
const DOSE_UNITS = ['mcg', 'mg', 'g', 'IU', 'mL', 'cc', 'capsules', 'tablets', 'scoops', 'drops'];
const DURATION_UNITS = ['days', 'weeks', 'months', 'years'];
const FREQUENCY_PRESETS = ['Daily', 'Twice daily', 'Three times daily', 'Every other day', 'Once weekly', 'Twice weekly', 'Three times weekly', 'As needed', 'Pre-workout', 'Before bed', 'Custom cycle'];
const FREQUENCY_CYCLE_UNITS = ['days', 'weeks', 'months'];

const BEARING_GROUPS = [
  { name: 'Mind', bearings: ['Focus', 'Memory', 'Mood', 'Stress', 'Anxiety', 'Nootropics'] },
  { name: 'Body', bearings: ['Energy', 'Recovery', 'Endurance', 'Strength', 'Fat Loss', 'Muscle Gain'] },
  { name: 'Vitality', bearings: ['Sleep', 'Hormones', 'Testosterone', 'Longevity', 'Gut Health'] },
  { name: 'Practice', bearings: ['Supplements', 'Fasting', 'Biohacking'] },
  { name: 'Discussion', bearings: ['Question', 'Protocol Review', 'Product Experience', 'Research'] },
];

const SIGNAL_ONLY_BEARINGS = ['Question', 'Protocol Review', 'Product Experience', 'Research'];

const CATEGORY_BEARING_SUGGESTIONS: Record<string, string[]> = {
  Focus: ['Focus', 'Energy', 'Nootropics'],
  Memory: ['Memory', 'Focus', 'Nootropics'],
  Mood: ['Mood', 'Stress', 'Anxiety'],
  Sleep: ['Sleep', 'Stress', 'Recovery'],
  Stress: ['Stress', 'Anxiety', 'Mood'],
  Recovery: ['Recovery', 'Sleep', 'Strength'],
  'Strength & Muscle': ['Strength', 'Muscle Gain', 'Recovery'],
  Strength: ['Strength', 'Muscle Gain', 'Recovery'],
  Endurance: ['Endurance', 'Energy', 'Recovery'],
  'Fat Loss': ['Fat Loss', 'Energy', 'Metabolic Health'],
  Longevity: ['Longevity', 'Biohacking', 'Supplements'],
  Hormones: ['Hormones', 'Testosterone', 'Mood'],
  'Gut Health': ['Gut Health', 'Mood', 'Supplements'],
  'Metabolic Health': ['Energy', 'Fat Loss', 'Longevity'],
  'Sexual Health': ['Hormones', 'Testosterone', 'Mood'],
};

const CURATED_COMPANION_PAIRS = [
  ['bpc-157', 'tb-500'],
  ['caffeine', 'l-theanine'],
];

const makeEmptyProtocol = (): SubstanceProtocol => ({
  dose: { amount: '', unit: 'mg' },
  frequency: { preset: '', everyAmount: '', everyUnit: 'days' },
});

const formatDose = (dose: Dose) => `${dose.amount} ${dose.unit}`.trim();

const formatFrequency = (frequency: Frequency) => {
  if (frequency.preset === 'Custom cycle') {
    return frequency.everyAmount ? `Every ${frequency.everyAmount} ${frequency.everyUnit}` : '';
  }
  return frequency.preset;
};

const formatDuration = (duration: Duration) => `${duration.amount} ${duration.unit}`.trim();

const isPositiveNumber = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0;

function getEntityOptions(): EntityOption[] {
  const substances = SUPPLEMENTS.map(s => ({ id: s.id, name: s.name, type: 'supplement' as const, categories: s.paths.map(path => path.category) }));
  const brands = BRANDS.map(b => ({ id: b.id, name: b.name, type: 'brand' as const, categories: b.markers ?? [] }));
  const stacks = STACKS.filter(s => s.status === 'approved').map(s => ({ id: s.id, name: s.name, type: 'stack' as const, categories: s.markers ?? [] }));
  return [...substances, ...brands, ...stacks].sort((a, b) => a.name.localeCompare(b.name));
}

function getEntityDomain(entity: EntityOption | null): Domain {
  if (!entity || entity.type !== 'supplement') return 'All';
  return SUPPLEMENTS.find(s => s.id === entity.id)?.paths[0]?.domain ?? 'All';
}

function getEntityCategory(entity: EntityOption | null) {
  if (!entity || entity.type !== 'supplement') return 'General';
  return SUPPLEMENTS.find(s => s.id === entity.id)?.paths[0]?.category ?? 'General';
}

function getAllowedBearings(mode: BearingMode) {
  return BEARING_GROUPS.flatMap(group => group.bearings).filter(bearing => mode === 'signal' || !SIGNAL_ONLY_BEARINGS.includes(bearing));
}

function getSuggestedBearings(entity: EntityOption | null, mode: BearingMode) {
  const allowed = getAllowedBearings(mode);
  if (!entity) return allowed.slice(0, 5);
  const suggestions = entity.categories.flatMap(category => CATEGORY_BEARING_SUGGESTIONS[category] ?? []);
  return Array.from(new Set(suggestions)).filter(bearing => allowed.includes(bearing)).slice(0, 6);
}

function getCompanionOptions(entity: EntityOption | null) {
  if (!entity || entity.type !== 'supplement') return [];
  return CURATED_COMPANION_PAIRS.flatMap(([a, b]) => {
    if (entity.id === a) return [b];
    if (entity.id === b) return [a];
    return [];
  })
    .map(id => SUPPLEMENTS.find(s => s.id === id))
    .filter((substance): substance is NonNullable<typeof substance> => Boolean(substance));
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-zinc-300">{children}</label>;
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{children}</p>;
}

function EntityCombobox({ label, selected, onSelect, required, placeholder }: {
  label: string;
  selected: EntityOption | null;
  onSelect: (entity: EntityOption | null) => void;
  required?: boolean;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const options = useMemo(() => getEntityOptions(), []);
  const filteredOptions = query.trim()
    ? options.filter(option => option.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  return (
    <div>
      <FieldLabel>{label}{required && <span className="text-red-500"> *</span>}</FieldLabel>
      {selected ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <span className="font-medium text-emerald-700 dark:text-emerald-300">{selected.name} <span className="text-xs capitalize text-emerald-600/70 dark:text-emerald-300/70">{selected.type}</span></span>
          <button type="button" onClick={() => onSelect(null)} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20" aria-label="Clear entity">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-4 focus:border-emerald-500 focus:outline-none dark:border-zinc-700"
          />
          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
              {filteredOptions.length > 0 ? filteredOptions.map(option => (
                <button
                  key={`${option.type}-${option.id}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { onSelect(option); setQuery(''); setIsOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-700"
                >
                  {option.name} <span className="ml-2 text-xs capitalize text-slate-400">{option.type}</span>
                </button>
              )) : (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-zinc-400">No matching entity found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DoseField({ value, onChange }: { value: Dose; onChange: (value: Dose) => void }) {
  return (
    <div>
      <FieldLabel>Dose <span className="text-red-500">*</span></FieldLabel>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input type="number" min="0" step="any" inputMode="decimal" placeholder="250" value={value.amount} onChange={e => onChange({ ...value, amount: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
        <select value={value.unit} onChange={e => onChange({ ...value, unit: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
          {DOSE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      </div>
    </div>
  );
}

function FrequencyField({ value, onChange }: { value: Frequency; onChange: (value: Frequency) => void }) {
  return (
    <div>
      <FieldLabel>Frequency <span className="text-red-500">*</span></FieldLabel>
      <select value={value.preset} onChange={e => onChange({ ...value, preset: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
        <option value="">Select frequency</option>
        {FREQUENCY_PRESETS.map(frequency => <option key={frequency} value={frequency}>{frequency}</option>)}
      </select>
      {value.preset === 'Custom cycle' && (
        <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-zinc-400">Every</span>
          <input type="number" min="1" step="1" inputMode="numeric" placeholder="3" value={value.everyAmount} onChange={e => onChange({ ...value, everyAmount: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-4 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
          <select value={value.everyUnit} onChange={e => onChange({ ...value, everyUnit: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
            {FREQUENCY_CYCLE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function DurationField({ value, onChange }: { value: Duration; onChange: (value: Duration) => void }) {
  return (
    <div>
      <FieldLabel>Duration <span className="text-red-500">*</span></FieldLabel>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input type="number" min="1" step="1" inputMode="numeric" placeholder="8" value={value.amount} onChange={e => onChange({ ...value, amount: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
        <select value={value.unit} onChange={e => onChange({ ...value, unit: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
          {DURATION_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      </div>
    </div>
  );
}

function BearingPicker({ mode, selected, entity, onChange, error }: {
  mode: BearingMode;
  selected: string[];
  entity: EntityOption | null;
  onChange: (bearings: string[]) => void;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBrowsingAll, setIsBrowsingAll] = useState(false);
  const [query, setQuery] = useState('');
  const allowed = getAllowedBearings(mode);
  const suggested = getSuggestedBearings(entity, mode);
  const filtered = query.trim() ? allowed.filter(bearing => bearing.toLowerCase().includes(query.toLowerCase())) : suggested;

  const toggle = (bearing: string) => {
    if (selected.includes(bearing)) {
      onChange(selected.filter(item => item !== bearing));
      return;
    }
    if (selected.length < 5) onChange([...selected, bearing]);
  };

  const groupList = BEARING_GROUPS.map(group => ({ ...group, bearings: group.bearings.filter(bearing => allowed.includes(bearing)) })).filter(group => group.bearings.length > 0);

  return (
    <div>
      <FieldLabel>Bearings <span className="text-red-500">*</span></FieldLabel>
      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.length > 0 ? selected.map(bearing => (
            <button key={bearing} type="button" onClick={() => toggle(bearing)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              {bearing}<X size={12} />
            </button>
          )) : <span className="text-sm text-slate-500 dark:text-zinc-400">Select 1-5 Bearings.</span>}
        </div>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          <span>{isOpen ? 'Close Bearing picker' : 'Open Bearing picker'}</span>
          <ChevronDown size={16} className={cn(isOpen && 'rotate-180')} />
        </button>
        {isOpen && (
          <div className="mt-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Bearings..." className="w-full rounded-xl border border-slate-200 bg-transparent py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{query.trim() ? 'Search results' : 'Suggested'}</p>
              <div className="flex flex-wrap gap-2">
                {filtered.map(bearing => (
                  <button key={bearing} type="button" onClick={() => toggle(bearing)} disabled={!selected.includes(bearing) && selected.length >= 5} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40', selected.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>
                    {selected.includes(bearing) && <Check size={13} className="mr-1 inline" />}{bearing}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => setIsBrowsingAll(true)} className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Browse all Bearings</button>
          </div>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
      {isBrowsingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Browse all Bearings</h3>
              <button type="button" onClick={() => setIsBrowsingAll(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="Close Bearings browser"><X size={18} /></button>
            </div>
            <div className="space-y-5">
              {groupList.map(group => (
                <section key={group.name}>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-zinc-300">{group.name}</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.bearings.map(bearing => (
                      <button key={bearing} type="button" onClick={() => toggle(bearing)} disabled={!selected.includes(bearing) && selected.length >= 5} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40', selected.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>
                        {bearing}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setIsBrowsingAll(false)} className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-600">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Create() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<CreateType | null>(null);
  const [dispatchEntity, setDispatchEntity] = useState<EntityOption | null>(null);
  const [signalEntity, setSignalEntity] = useState<EntityOption | null>(null);
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [dispatchBearings, setDispatchBearings] = useState<string[]>([]);
  const [signalBearings, setSignalBearings] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dispatchData, setDispatchData] = useState({ title: '', content: '', clarification: '' });
  const [signalData, setSignalData] = useState({ title: '', content: '' });
  const [primaryProtocol, setPrimaryProtocol] = useState<SubstanceProtocol>(makeEmptyProtocol);
  const [companionProtocol, setCompanionProtocol] = useState<SubstanceProtocol>(makeEmptyProtocol);
  const [duration, setDuration] = useState<Duration>({ amount: '', unit: 'weeks' });

  const companionOptions = getCompanionOptions(dispatchEntity);
  const companion = companionOptions.find(option => option.id === companionId) ?? null;
  const primarySubstanceName = dispatchEntity?.name ?? 'Substance';

  const selectDispatchEntity = (entity: EntityOption | null) => {
    setDispatchEntity(entity);
    setCompanionId(null);
    setCompanionProtocol(makeEmptyProtocol());
  };

  const validateProtocol = (protocol: SubstanceProtocol) => isPositiveNumber(protocol.dose.amount) && formatFrequency(protocol.frequency) !== '';

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (!dispatchEntity) nextErrors.entity = 'Choose a linked substance, brand, or stack.';
    if (!dispatchData.title.trim()) nextErrors.title = 'Title is required.';
    if (dispatchData.content.trim().length < MIN_DISPATCH_BODY_CHARS) nextErrors.content = `Content / Experience must be at least ${MIN_DISPATCH_BODY_CHARS} characters.`;
    if (!validateProtocol(primaryProtocol) || (companion && !validateProtocol(companionProtocol))) nextErrors.dose = 'Enter a valid numeric dose and structured frequency for each substance.';
    if (!isPositiveNumber(duration.amount)) nextErrors.duration = 'Enter a valid numeric duration.';
    if (dispatchBearings.length < 1 || dispatchBearings.length > 5) nextErrors.bearings = 'Select 1-5 Bearings.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !dispatchEntity) return;

    const protocolEntries = [
      { substanceId: dispatchEntity.type === 'supplement' ? dispatchEntity.id : undefined, substanceName: primarySubstanceName, dose: formatDose(primaryProtocol.dose), frequency: formatFrequency(primaryProtocol.frequency) },
      ...(companion ? [{ substanceId: companion.id, substanceName: companion.name, dose: formatDose(companionProtocol.dose), frequency: formatFrequency(companionProtocol.frequency) }] : []),
    ];
    const durationLabel = formatDuration(duration);
    const postId = `p${Math.round(e.timeStamp)}_${dispatchData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`;
    const newPost: Post = {
      id: postId,
      type: 'Dispatch',
      title: dispatchData.title.trim(),
      content: dispatchData.content.trim(),
      author: { id: 'u1', username: 'admin', isVerified: true },
      domain: getEntityDomain(dispatchEntity),
      category: getEntityCategory(dispatchEntity),
      supplementId: dispatchEntity.type === 'supplement' ? dispatchEntity.id : undefined,
      brandId: dispatchEntity.type === 'brand' ? dispatchEntity.id : undefined,
      stackId: dispatchEntity.type === 'stack' ? dispatchEntity.id : undefined,
      helpfulCount: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      logDetails: { duration: durationLabel, dosage: protocolEntries.map(entry => `${entry.dose} · ${entry.frequency}`).join(' | '), stackIncluded: Boolean(companion) },
      qualityScore: 50,
      bearings: dispatchBearings,
      dispatchProtocol: { entries: protocolEntries, duration: durationLabel, clarification: dispatchData.clarification.trim() || undefined },
    };
    addPost(newPost);
    navigate('/square');
  };

  const handleSignalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (!signalData.title.trim()) nextErrors.title = 'Title is required.';
    if (!signalData.content.trim()) nextErrors.content = 'Body text is required.';
    if (signalBearings.length < 1 || signalBearings.length > 5) nextErrors.bearings = 'Select 1-5 Bearings.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const postId = `p${Math.round(e.timeStamp)}_${signalData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`;
    const newPost: Post = {
      id: postId,
      type: 'Signal',
      title: signalData.title.trim(),
      content: signalData.content.trim(),
      author: { id: 'u1', username: 'admin', isVerified: true },
      domain: getEntityDomain(signalEntity),
      category: signalEntity ? getEntityCategory(signalEntity) : 'General',
      supplementId: signalEntity?.type === 'supplement' ? signalEntity.id : undefined,
      brandId: signalEntity?.type === 'brand' ? signalEntity.id : undefined,
      stackId: signalEntity?.type === 'stack' ? signalEntity.id : undefined,
      helpfulCount: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      qualityScore: 50,
      bearings: signalBearings,
    };
    addPost(newPost);
    navigate('/square');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 md:pb-8">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <button onClick={() => activeType ? setActiveType(null) : navigate(-1)} className="-ml-2 rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="Back">
          <ArrowLeft size={20} className="text-slate-700 dark:text-zinc-300" />
        </button>
        <h1 className="text-lg font-bold">Create</h1>
      </div>

      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        {!activeType ? (
          <div className="mx-auto mt-10 flex min-h-[50vh] max-w-2xl flex-col items-stretch justify-center gap-6 sm:flex-row">
            <button onClick={() => setActiveType('Dispatch')} className="group flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500">
              <h2 className="mb-4 text-2xl font-bold text-slate-800 transition-colors group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400">Dispatch</h2>
              <p className="text-center text-sm leading-relaxed text-slate-500 dark:text-zinc-400">Create a written experience post linked to a substance, brand, or stack.</p>
            </button>
            <button onClick={() => setActiveType('Signal')} className="group flex flex-1 flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-8 transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500">
              <h2 className="mb-4 text-2xl font-bold text-slate-800 transition-colors group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">Signal</h2>
              <p className="text-center text-sm leading-relaxed text-slate-500 dark:text-zinc-400">Share a general or linked thought, question, or discussion with Bearings.</p>
            </button>
          </div>
        ) : activeType === 'Dispatch' ? (
          <form onSubmit={handleDispatchSubmit} className="space-y-8">
            <h2 className="text-2xl font-bold">New Dispatch</h2>
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <EntityCombobox label="Linked entity" selected={dispatchEntity} onSelect={selectDispatchEntity} required placeholder="Search substances, brands, or stacks..." />
              <ErrorText>{errors.entity}</ErrorText>
              {companionOptions.length > 0 && !companion && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Companion substance(s) available</p>
                  {companionOptions.map(option => (
                    <button key={option.id} type="button" onClick={() => setCompanionId(option.id)} className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-zinc-800">Add {option.name} to this Dispatch?</button>
                  ))}
                </div>
              )}
              {companion && (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">Stack-style Dispatch: {primarySubstanceName} + {companion.name}</span>
                  <button type="button" onClick={() => setCompanionId(null)} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20" aria-label="Remove companion"><X size={16} /></button>
                </div>
              )}
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <FieldLabel>Title <span className="text-red-500">*</span></FieldLabel>
                <input value={dispatchData.title} onChange={e => setDispatchData({ ...dispatchData, title: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-lg font-medium focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
                <ErrorText>{errors.title}</ErrorText>
              </div>
              <div>
                <FieldLabel>Content / Experience <span className="text-red-500">*</span></FieldLabel>
                <textarea rows={7} value={dispatchData.content} onChange={e => setDispatchData({ ...dispatchData, content: e.target.value })} placeholder="Describe benefits, side effects, context, and what happened." className="w-full resize-none rounded-xl border border-slate-200 bg-transparent px-4 py-3 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
                <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-zinc-400"><ErrorText>{errors.content}</ErrorText><span>{dispatchData.content.trim().length}/{MIN_DISPATCH_BODY_CHARS} minimum</span></div>
              </div>
              <BearingPicker mode="dispatch" selected={dispatchBearings} entity={dispatchEntity} onChange={setDispatchBearings} error={errors.bearings} />
            </div>

            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-semibold">Dose, frequency, and duration</h3>
              <div className="space-y-4">
                {companion && <h4 className="font-semibold text-slate-800 dark:text-zinc-200">{primarySubstanceName}</h4>}
                <div className="grid gap-4 sm:grid-cols-2"><DoseField value={primaryProtocol.dose} onChange={dose => setPrimaryProtocol({ ...primaryProtocol, dose })} /><FrequencyField value={primaryProtocol.frequency} onChange={frequency => setPrimaryProtocol({ ...primaryProtocol, frequency })} /></div>
                {companion && (
                  <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-zinc-800">
                    <h4 className="font-semibold text-slate-800 dark:text-zinc-200">{companion.name}</h4>
                    <div className="grid gap-4 sm:grid-cols-2"><DoseField value={companionProtocol.dose} onChange={dose => setCompanionProtocol({ ...companionProtocol, dose })} /><FrequencyField value={companionProtocol.frequency} onChange={frequency => setCompanionProtocol({ ...companionProtocol, frequency })} /></div>
                  </div>
                )}
                <DurationField value={duration} onChange={setDuration} />
                <ErrorText>{errors.dose ?? errors.duration}</ErrorText>
                <div>
                  <FieldLabel>Dose/frequency/duration clarification</FieldLabel>
                  <input value={dispatchData.clarification} onChange={e => setDispatchData({ ...dispatchData, clarification: e.target.value })} placeholder="Started at 250 mcg daily, then increased to 500 mcg daily after two weeks." className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
                </div>
              </div>
            </div>
            <div className="flex justify-end"><button type="submit" className="rounded-xl bg-emerald-500 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-600">Submit Dispatch</button></div>
          </form>
        ) : (
          <form onSubmit={handleSignalSubmit} className="space-y-8">
            <h2 className="text-2xl font-bold">New Signal</h2>
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <FieldLabel>Linked entity</FieldLabel>
                {!signalEntity && <p className="mb-2 text-sm font-medium text-slate-500 dark:text-zinc-400">General Signal</p>}
                <EntityCombobox label="Search optional entity" selected={signalEntity} onSelect={setSignalEntity} placeholder="Search substances, brands, or stacks..." />
              </div>
              <div>
                <FieldLabel>Title <span className="text-red-500">*</span></FieldLabel>
                <input value={signalData.title} onChange={e => setSignalData({ ...signalData, title: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-lg font-medium focus:border-blue-500 focus:outline-none dark:border-zinc-700" />
                <ErrorText>{errors.title}</ErrorText>
              </div>
              <div>
                <FieldLabel>Body text <span className="text-red-500">*</span></FieldLabel>
                <textarea rows={7} value={signalData.content} onChange={e => setSignalData({ ...signalData, content: e.target.value })} placeholder="What's on your mind?" className="w-full resize-none rounded-xl border border-slate-200 bg-transparent px-4 py-3 focus:border-blue-500 focus:outline-none dark:border-zinc-700" />
                <ErrorText>{errors.content}</ErrorText>
              </div>
              <BearingPicker mode="signal" selected={signalBearings} entity={signalEntity} onChange={setSignalBearings} error={errors.bearings} />
            </div>
            <div className="flex justify-end"><button type="submit" className="rounded-xl bg-blue-500 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-600">Broadcast Signal</button></div>
          </form>
        )}
      </div>
    </div>
  );
}
