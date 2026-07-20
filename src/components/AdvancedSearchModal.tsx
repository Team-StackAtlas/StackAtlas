import { Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFilters } from '../context/FilterContext';
import { CLASSIFICATIONS, AdministrationMethod } from '../data/mockData';
import { ADMINISTRATION_META } from '../lib/administrationIcons';
import { Modal } from './ui/Modal';

const ADMIN_METHODS: AdministrationMethod[] = ['👄 Oral', '💉 Injectable', '🧴 Topical', '👅 Sublingual'];

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const {
    activeAdmins,
    activeClassifications,
    toggleAdmin,
    toggleClassification
  } = useFilters();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Search"
      icon={<Settings2 className="h-5 w-5" />}
      panelClassName="max-w-2xl"
    >
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2">
          {/* Left Panel: Administration */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">Administration</h3>
            <div className="space-y-2">
              {ADMIN_METHODS.map(admin => {
                const isActive = activeAdmins.includes(admin);
                const meta = ADMINISTRATION_META[admin];
                const AdminIcon = meta.icon;
                return (
                  <button
                    key={admin}
                    onClick={() => toggleAdmin(admin)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 shadow-sm"
                        : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <AdminIcon size={16} className={isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'} />
                      {meta.label}
                    </span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isActive ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-zinc-600"
                    )}>
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Classification */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">Classification</h3>
            <div className="space-y-2">
              {CLASSIFICATIONS.map(classification => {
                const isActive = activeClassifications.includes(classification);
                return (
                  <button
                    key={classification}
                    onClick={() => toggleClassification(classification)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 shadow-sm"
                        : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <span>{classification}</span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isActive ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-zinc-600"
                    )}>
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <button
          onClick={onClose}
          className="rounded-xl bg-emerald-500 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-emerald-600"
        >
          Apply Filters
        </button>
      </div>
    </Modal>
  );
}
