import { useState, type FormEvent } from 'react';
import { CheckCircle } from 'lucide-react';
import { MockReportTargetType, useMockRole } from '../context/MockRoleContext';
import { Modal } from './ui/Modal';

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

export default function ReportModal({
  isOpen,
  onClose,
  entityName,
  targetType,
  targetId,
}: ReportModalProps) {
  const { addReport } = useMockRole();
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');

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
    <Modal isOpen={isOpen} onClose={handleClose} title={`Report ${entityName}`}>
      {confirmation ? (
        <div className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle size={24} />
          </div>
          <p className="font-semibold text-slate-900 dark:text-zinc-100">{confirmation}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            This mock report is stored locally for Admin and Developer review.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label
              htmlFor="reportCategory"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-300"
            >
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
                <option key={reportCategory} value={reportCategory}>
                  {reportCategory}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reportDetails"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300"
            >
              Details (Optional)
            </label>
            <textarea
              id="reportDetails"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add context for the StackAtlas review queue..."
              className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Submit Report
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
