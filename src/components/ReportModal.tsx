import { useState, type FormEvent } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { MockReportTargetType, useMockRole } from '../context/MockRoleContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  targetType: MockReportTargetType;
  targetId?: string;
}

const REPORT_CATEGORIES = [
  'Incorrect Information',
  'Outdated Information',
  'Safety Concern',
  'Duplicate Entry',
  'Spam / Abuse',
  'Other',
];

export default function ReportModal({ isOpen, onClose, entityName, targetType, targetId }: ReportModalProps) {
  const { addReport } = useMockRole();
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setCategory('');
    setDetails('');
    setConfirmation('');
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    addReport({
      targetType,
      targetId,
      targetName: entityName,
      category,
      details: details.trim(),
    });

    setCategory('');
    setDetails('');
    setConfirmation('Report submitted for review.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">Report {entityName}</h2>
          <button onClick={handleClose} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {confirmation ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle size={24} />
            </div>
            <p className="font-semibold text-slate-900 dark:text-zinc-100">{confirmation}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">This mock report is stored locally for Admin and Developer review.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label htmlFor="reportCategory" className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                Category
              </label>
              <select
                id="reportCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                required
              >
                <option value="">Select a category...</option>
                {REPORT_CATEGORIES.map((reportCategory) => (
                  <option key={reportCategory} value={reportCategory}>{reportCategory}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reportDetails" className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Details (Optional)
              </label>
              <textarea
                id="reportDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add context for the StackAtlas review queue..."
                className="w-full h-24 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
