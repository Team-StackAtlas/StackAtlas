import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, HelpCircle, Search, X } from 'lucide-react';
import { SUPPLEMENTS, BRANDS, Post, Domain, addPost } from '../data/mockData';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { BEARING_GROUPS, CATEGORY_BEARING_SUGGESTIONS, getAllowedBearings } from '../lib/bearings';


type CreateType = 'Dispatch' | 'Signal';
type EntityType = 'supplement' | 'brand' | 'stack';
type EntityOption = { id: string; name: string; type: EntityType; categories: string[] };
type BearingMode = 'dispatch' | 'signal';
type Dose = { amount: string; unit: string };
type Duration = { amount: string; unit: string };
type Frequency = { preset: string; cycleMode: 'every' | 'onOff'; everyAmount: string; everyUnit: string; onAmount: string; onUnit: string; offAmount: string; offUnit: string };
type SubstanceProtocol = { dose: Dose; frequency: Frequency };

type FormErrors = Partial<Record<'auth' | 'entity' | 'title' | 'content' | 'dose' | 'frequency' | 'duration' | 'bearings', string>>;

const MIN_DISPATCH_BODY_CHARS = 100;
const DOSE_UNITS = ['mcg', 'mg', 'g', 'IU', 'mL', 'cc'];
const DURATION_UNITS = ['days', 'weeks', 'months', 'years'];
const FREQUENCY_PRESETS = ['Once daily', 'Twice daily', 'Three times daily', 'Every other day', 'Once weekly', 'Twice weekly', 'Three times weekly', 'Four times weekly', 'Five times weekly', 'Six times weekly', 'As needed', 'Pre-workout', 'Post-workout', 'Before bed', 'Custom cycle'];
const FREQUENCY_CYCLE_UNITS = ['days', 'weeks', 'months'];

const CURATED_COMPANION_PAIRS = [
  ['bpc-157', 'tb-500'],
  ['caffeine', 'l-theanine'],
];

const COMPANION_ALIASES: Record<string, string[]> = {
  'bpc-157': ['bpc-157', 'bpc157', 'bpc 157'],
  'tb-500': ['tb-500', 'tb500', 'tb 500'],
  caffeine: ['caffeine'],
  'l-theanine': ['l-theanine', 'l theanine', 'theanine'],
};

const makeEmptyProtocol = (): SubstanceProtocol => ({
  dose: { amount: '', unit: 'mg' },
  frequency: { preset: '', cycleMode: 'every', everyAmount: '', everyUnit: 'days', onAmount: '', onUnit: 'days', offAmount: '', offUnit: 'days' },
});

const formatDose = (dose: Dose) => `${dose.amount} ${dose.unit}`.trim();

const formatFrequency = (frequency: Frequency) => {
  if (frequency.preset === 'Custom cycle') {
    if (frequency.cycleMode === 'onOff') {
      return frequency.onAmount && frequency.offAmount ? `${frequency.onAmount} ${frequency.onUnit} on, ${frequency.offAmount} ${frequency.offUnit} off` : '';
    }
    return frequency.everyAmount ? `Every ${frequency.everyAmount} ${frequency.everyUnit}` : '';
  }
  return frequency.preset;
};

const formatDuration = (duration: Duration) => `${duration.amount} ${duration.unit}`.trim();

const isPositiveNumber = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0;

function getEntityOptions(kind: 'dispatch' | 'signal'): EntityOption[] {
  const substances = SUPPLEMENTS.map(s => ({ id: s.id, name: s.name, type: 'supplement' as const, categories: s.paths.map(path => path.category) }));
  if (kind === 'dispatch') return substances.sort((a, b) => a.name.localeCompare(b.name));
  const brands = BRANDS.map(b => ({ id: b.id, name: b.name, type: 'brand' as const, categories: b.markers ?? [] }));
  return [...substances, ...brands].sort((a, b) => a.name.localeCompare(b.name));
}

function getEntityDomain(entity: EntityOption | null): Domain {
  if (!entity || entity.type !== 'supplement') return 'All';
  return SUPPLEMENTS.find(s => s.id === entity.id)?.paths[0]?.domain ?? 'All';
}

function getEntityCategory(entity: EntityOption | null) {
  if (!entity || entity.type !== 'supplement') return 'General';
  return SUPPLEMENTS.find(s => s.id === entity.id)?.paths[0]?.category ?? 'General';
}

function getSuggestedBearings(entity: EntityOption | null, mode: BearingMode) {
  const allowed = getAllowedBearings(mode);
  if (!entity) return [];
  const suggestions = entity.categories.flatMap(category => CATEGORY_BEARING_SUGGESTIONS[category] ?? []);
  return Array.from(new Set(suggestions)).filter(bearing => allowed.includes(bearing)).slice(0, 6);
}

const normalizeCompanionKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

function companionMatches(entity: EntityOption, canonicalId: string) {
  const candidates = [canonicalId, ...(COMPANION_ALIASES[canonicalId] ?? [])].map(normalizeCompanionKey);
  return candidates.includes(normalizeCompanionKey(entity.id)) || candidates.includes(normalizeCompanionKey(entity.name));
}

function getCompanionOptions(entity: EntityOption | null): EntityOption[] {
  if (!entity || entity.type !== 'supplement') return [];
  const companionIds = CURATED_COMPANION_PAIRS.flatMap(([a, b]) => {
    if (companionMatches(entity, a)) return [b];
    if (companionMatches(entity, b)) return [a];
    return [];
  });
  return companionIds.map(id => {
    const supplement = SUPPLEMENTS.find(s => companionMatches({ id: s.id, name: s.name, type: 'supplement', categories: [] }, id));
    return supplement
      ? { id: supplement.id, name: supplement.name, type: 'supplement' as const, categories: supplement.paths.map(path => path.category) }
      : { id, name: id === 'tb-500' ? 'TB-500' : id, type: 'supplement' as const, categories: [] };
  });
}


function InfoTooltip({ label, text }: { label: string; text: string }) {
  return (
    <span className="relative inline-flex">
      <span tabIndex={0} role="button" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} className="peer rounded-full text-slate-400 transition-colors hover:text-slate-700 focus:text-slate-700 focus:outline-none dark:text-zinc-500 dark:hover:text-zinc-200 dark:focus:text-zinc-200" aria-label={label}>
        <HelpCircle size={16} />
      </span>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-medium leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-100 peer-hover:opacity-100 peer-focus:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
        {text}
      </span>
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-zinc-300">{children}</label>;
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{children}</p>;
}

function getEntityTypeLabel(type: EntityType) {
  if (type === 'supplement') return 'Substance';
  if (type === 'brand') return 'Brand';
  return 'Stack';
}

function EntityCombobox({ label, kind, selected, selectedLabel, onSelect, onClearSelected, required, placeholder }: {
  label: string;
  kind: 'dispatch' | 'signal';
  selected: EntityOption | null;
  selectedLabel?: string;
  onSelect: (entity: EntityOption | null) => void;
  onClearSelected?: () => void;
  required?: boolean;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => getEntityOptions(kind), [kind]);
  const filteredOptions = query.trim()
    ? options.filter(option => option.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef}>
      <FieldLabel>{label}{required && <span className="text-red-500"> *</span>}</FieldLabel>
      {selected ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <span className="font-medium text-emerald-700 dark:text-emerald-300">{selectedLabel ?? selected.name} <span className="text-xs text-emerald-600/70 dark:text-emerald-300/70">{kind === 'dispatch' ? 'Substance' : getEntityTypeLabel(selected.type)}</span></span>
          <button type="button" onClick={() => onClearSelected ? onClearSelected() : onSelect(null)} className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20" aria-label={onClearSelected ? 'Remove companion substance' : 'Clear entity'}>
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
            onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}
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
                  {option.name} <span className="ml-2 text-xs text-slate-400">{kind === 'dispatch' ? 'Substance' : getEntityTypeLabel(option.type)}</span>
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
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-700">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onChange({ ...value, cycleMode: 'every' })} className={cn('rounded-full border px-3 py-1.5 font-medium', value.cycleMode === 'every' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300')}>Every interval</button>
            <button type="button" onClick={() => onChange({ ...value, cycleMode: 'onOff' })} className={cn('rounded-full border px-3 py-1.5 font-medium', value.cycleMode === 'onOff' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300')}>On / off cycle</button>
          </div>
          {value.cycleMode === 'every' ? (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
              <span className="text-slate-500 dark:text-zinc-400">Every</span>
              <input type="number" min="1" step="1" inputMode="numeric" placeholder="3" value={value.everyAmount} onChange={e => onChange({ ...value, everyAmount: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-4 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
              <select value={value.everyUnit} onChange={e => onChange({ ...value, everyUnit: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
                {FREQUENCY_CYCLE_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center">
              <input type="number" min="1" step="1" inputMode="numeric" placeholder="8" value={value.onAmount} onChange={e => onChange({ ...value, onAmount: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-4 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
              <select value={value.onUnit} onChange={e => onChange({ ...value, onUnit: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
                {FREQUENCY_CYCLE_UNITS.map(unit => <option key={unit} value={unit}>{unit} on</option>)}
              </select>
              <input type="number" min="1" step="1" inputMode="numeric" placeholder="4" value={value.offAmount} onChange={e => onChange({ ...value, offAmount: e.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-4 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
              <select value={value.offUnit} onChange={e => onChange({ ...value, offUnit: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
                {FREQUENCY_CYCLE_UNITS.map(unit => <option key={unit} value={unit}>{unit} off</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DurationField({ value, onChange }: { value: Duration; onChange: (value: Duration) => void }) {
  return (
    <div>
      <FieldLabel>Duration <span className="text-red-500">*</span></FieldLabel>
      <div className="grid max-w-xs grid-cols-[7rem_auto] gap-2">
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
  const [modalQuery, setModalQuery] = useState('');
  const [activeGroupName, setActiveGroupName] = useState<string>('Suggested');
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
  const navItems = suggested.length > 0 ? [{ name: 'Suggested', bearings: suggested }, ...groupList] : groupList;
  const activeGroup = navItems.find(group => group.name === activeGroupName) ?? navItems[0];
  const modalSearchGroups = modalQuery.trim()
    ? groupList.map(group => ({ ...group, bearings: group.bearings.filter(bearing => bearing.toLowerCase().includes(modalQuery.toLowerCase())) })).filter(group => group.bearings.length > 0)
    : [];

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
            <button type="button" onClick={() => { setActiveGroupName(suggested.length > 0 ? 'Suggested' : groupList[0]?.name ?? ''); setIsBrowsingAll(true); }} className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Browse all Bearings</button>
          </div>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
      {isBrowsingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-zinc-800">
              <h3 className="text-xl font-bold">Browse all Bearings</h3>
              <button type="button" onClick={() => setIsBrowsingAll(false)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-zinc-800" aria-label="Close Bearings browser"><X size={18} /></button>
            </div>
            <div className="sticky top-0 z-10 space-y-3 border-b border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={modalQuery} onChange={e => setModalQuery(e.target.value)} placeholder="Search all Bearings..." className="w-full rounded-xl border border-slate-200 bg-transparent py-2 pl-10 pr-3 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.length > 0 ? selected.map(bearing => (
                  <button key={bearing} type="button" onClick={() => toggle(bearing)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                    {bearing}<X size={12} />
                  </button>
                )) : <span className="text-sm text-slate-500 dark:text-zinc-400">No Bearings selected yet.</span>}
              </div>
            </div>
            <div className="grid min-h-0 flex-1 md:grid-cols-[14rem_1fr]">
              {!modalQuery.trim() && (
                <div className="overflow-auto border-b border-slate-200 p-3 dark:border-zinc-800 md:border-b-0 md:border-r">
                  <div className="flex gap-2 overflow-x-auto md:block md:space-y-1">
                    {navItems.map(group => (
                      <button key={group.name} type="button" onClick={() => setActiveGroupName(group.name)} className={cn('whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium md:w-full', activeGroup?.name === group.name ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'text-slate-600 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800')}>
                        {group.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="min-h-0 overflow-auto p-4">
                {modalQuery.trim() ? (
                  <div className="space-y-5">
                    {modalSearchGroups.length > 0 ? modalSearchGroups.map(group => (
                      <section key={group.name}>
                        <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-zinc-300">{group.name}</h4>
                        <div className="flex flex-wrap gap-2">{group.bearings.map(bearing => (
                          <button key={bearing} type="button" onClick={() => toggle(bearing)} disabled={!selected.includes(bearing) && selected.length >= 5} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40', selected.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>{bearing}</button>
                        ))}</div>
                      </section>
                    )) : <p className="text-sm text-slate-500 dark:text-zinc-400">No matching Bearings.</p>}
                  </div>
                ) : (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">{activeGroup?.name}</h4>
                    <div className="flex flex-wrap gap-2">{activeGroup?.bearings.map(bearing => (
                      <button key={bearing} type="button" onClick={() => toggle(bearing)} disabled={!selected.includes(bearing) && selected.length >= 5} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40', selected.includes(bearing) ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800')}>{bearing}</button>
                    ))}</div>
                  </section>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-200 p-4 dark:border-zinc-800">
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
  const { user, profile } = useAuth();
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
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);

  const companionOptions = getCompanionOptions(dispatchEntity);
  const companion = companionOptions.find(option => option.id === companionId) ?? null;
  const primarySubstanceName = dispatchEntity?.name ?? 'Substance';
  const dispatchSelectionLabel = companion ? `${primarySubstanceName} + ${companion.name}` : undefined;

  const selectDispatchEntity = (entity: EntityOption | null) => {
    setDispatchEntity(entity);
    setCompanionId(null);
    setCompanionProtocol(makeEmptyProtocol());
  };

  const validateFrequency = (frequency: Frequency) => {
    if (frequency.preset !== 'Custom cycle') return frequency.preset !== '';
    if (frequency.cycleMode === 'onOff') return isPositiveNumber(frequency.onAmount) && isPositiveNumber(frequency.offAmount);
    return isPositiveNumber(frequency.everyAmount);
  };
  const validateProtocol = (protocol: SubstanceProtocol) => isPositiveNumber(protocol.dose.amount) && validateFrequency(protocol.frequency);

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (!user || !profile) nextErrors.auth = 'Sign in with a complete profile before creating a post.';
    if (!dispatchEntity) nextErrors.entity = 'Choose a Substance.';
    if (!dispatchData.title.trim()) nextErrors.title = 'Title is required.';
    if (dispatchData.content.trim().length < MIN_DISPATCH_BODY_CHARS) nextErrors.content = `Content / Experience must be at least ${MIN_DISPATCH_BODY_CHARS} characters.`;
    if (!validateProtocol(primaryProtocol) || (companion && !validateProtocol(companionProtocol))) nextErrors.dose = 'Enter a valid numeric dose and structured frequency for each substance.';
    if (!isPositiveNumber(duration.amount)) nextErrors.duration = 'Enter a valid numeric duration.';
    if (dispatchBearings.length < 1 || dispatchBearings.length > 5) nextErrors.bearings = 'Select 1-5 Bearings.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !dispatchEntity || !user || !profile) return;

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
      author: { id: user.id, username: profile.username, displayName: profile.displayName, isVerified: profile.isVerified },
      domain: getEntityDomain(dispatchEntity),
      category: getEntityCategory(dispatchEntity),
      supplementId: dispatchEntity.type === 'supplement' ? dispatchEntity.id : undefined,
      brandId: dispatchEntity.type === 'brand' ? dispatchEntity.id : undefined,
      stackId: dispatchEntity.type === 'stack' ? dispatchEntity.id : undefined,
      helpfulCount: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      logDetails: { duration: durationLabel, dosage: protocolEntries.map(entry => `${entry.dose} · ${entry.frequency}`).join(' · '), stackIncluded: Boolean(companion) },
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
    if (!user || !profile) nextErrors.auth = 'Sign in with a complete profile before creating a post.';
    if (!signalData.title.trim()) nextErrors.title = 'Title is required.';
    if (!signalData.content.trim()) nextErrors.content = 'Body text is required.';
    if (signalBearings.length < 1 || signalBearings.length > 5) nextErrors.bearings = 'Select 1-5 Bearings.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !user || !profile) return;

    const postId = `p${Math.round(e.timeStamp)}_${signalData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`;
    const newPost: Post = {
      id: postId,
      type: 'Signal',
      title: signalData.title.trim(),
      content: signalData.content.trim(),
      author: { id: user.id, username: profile.username, displayName: profile.displayName, isVerified: profile.isVerified },
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
        <ErrorText>{errors.auth}</ErrorText>
      </div>

      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        {!activeType ? (
          <div className="mx-auto mt-10 flex min-h-[50vh] max-w-2xl flex-col items-stretch justify-center gap-6 sm:flex-row">
            <div role="button" tabIndex={0} onClick={() => setActiveType('Dispatch')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setActiveType('Dispatch'); }} className="group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-8 text-center transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500">
              <h2 className="mb-3 inline-flex items-center gap-2 text-2xl font-bold text-slate-800 transition-colors group-hover:text-emerald-600 dark:text-zinc-100 dark:group-hover:text-emerald-400">Dispatch <InfoTooltip label="Dispatch details" text="Dispatches help StackAtlas turn real user experiences into useful community data. Use them when you can share what you took, dose, frequency, duration, and enough context for others to compare." /></h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">Log a structured experience with what you took, how much, how often, and what happened.</p>
            </div>
            <div role="button" tabIndex={0} onClick={() => setActiveType('Signal')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setActiveType('Signal'); }} className="group flex flex-1 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-white p-8 text-center transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500">
              <h2 className="mb-3 inline-flex items-center gap-2 text-2xl font-bold text-slate-800 transition-colors group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">Signal <InfoTooltip label="Signal details" text="Signals are freeform community posts. They can be general, or linked to a substance, brand, or stack if you want the post connected to something specific." /></h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">Ask a question, share an observation, or start a discussion.</p>
            </div>
          </div>
        ) : activeType === 'Dispatch' ? (
          <form onSubmit={handleDispatchSubmit} className="space-y-8">
            <h2 className="text-2xl font-bold">New Dispatch</h2>
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <EntityCombobox label="Substance" kind="dispatch" selected={dispatchEntity} selectedLabel={dispatchSelectionLabel} onSelect={selectDispatchEntity} onClearSelected={companion ? () => setCompanionId(null) : undefined} required placeholder="Search substances..." />
              <ErrorText>{errors.entity}</ErrorText>
              {companionOptions.length > 0 && !companion && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Companion substance(s) available</p>
                  {companionOptions.map(option => (
                    <button key={option.id} type="button" onClick={() => setCompanionId(option.id)} className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-zinc-800">Add {option.name} to this Dispatch?</button>
                  ))}
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
                  {!isClarificationOpen ? (
                    <button type="button" onClick={() => setIsClarificationOpen(true)} className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Add dose/frequency note</button>
                  ) : (
                    <div>
                      <FieldLabel>Dose/frequency note</FieldLabel>
                      <textarea rows={3} value={dispatchData.clarification} onChange={e => setDispatchData({ ...dispatchData, clarification: e.target.value })} placeholder="Started at 250 mcg daily, then increased to 500 mcg daily after two weeks." className="w-full resize-none rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-700" />
                    </div>
                  )}
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
                <FieldLabel>Signal entity</FieldLabel>
                {!signalEntity && <p className="mb-2 text-sm font-medium text-slate-500 dark:text-zinc-400">General Signal</p>}
                <EntityCombobox label="Search optional entity" kind="signal" selected={signalEntity} onSelect={setSignalEntity} placeholder="Search substances or brands..." />
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
