import React from 'react';
import { Settings2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFilters } from '../context/FilterContext';
import { TYPE_TAGS, StatusClassification, AdministrationMethod } from '../data/mockData';

const ADMIN_METHODS: AdministrationMethod[] = ['👄 Oral', '💉 Injectable', '🧴 Topical', '👅 Sublingual'];
const STATUSES: StatusClassification[] = ['🟢 Baseline', '🔵 Clinical', '🟣 Frontier', '🟡 Unregulated', '🟠 Restricted', '🔴 Illicit'];

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const {
    activeAdmins,
    activeStatuses,
    toggleAdmin,
    toggleStatus
  } = useFilters();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Advanced Search
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Panel: Administration */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">Administration</h3>
            <div className="space-y-2">
              {ADMIN_METHODS.map(admin => {
                const isActive = activeAdmins.includes(admin);
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
                    <span>{admin}</span>
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

          {/* Right Panel: Status */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4 uppercase tracking-wider">Status</h3>
            <div className="space-y-2">
              {STATUSES.map(status => {
                const isActive = activeStatuses.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                      isActive 
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 shadow-sm" 
                        : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    <span>{status}</span>
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

        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
