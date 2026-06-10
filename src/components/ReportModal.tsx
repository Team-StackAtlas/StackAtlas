import { useState, type FormEvent } from 'react';
import { CheckCircle } from 'lucide-react';
import { MockReportTargetType, useMockRole } from '../context/MockRoleContext';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
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

export default function ReportModal({ isOpen, onClose, entityName, targetType, targetId }: ReportModalProps) {
  const { addReport } = useMockRole();
  const { isBackendConfigured, services, user } = useAuth();
  const requireAccount = useRequireAccountAction();
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setCategory('');
    setDetails('');
    setConfirmation('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireAccount()) return;
    setSubmitting(true);
    try {
      if (isBackendConfigured && services && user) {
        await services.reports.create(user.id, {
          targetType,
          targetId: targetId ?? entityName,
          targetName: entityName,
          category,
          details: details.trim(),
        });
      } else {
        addReport({ targetType, targetId, targetName: entityName, category, details: details.trim() });
      }
      setCategory('');
      setDetails('');
      setConfirmation('Report submitted for review.');
    } catch (err) {
      setConfirmation(err instanceof Error ? err.message : 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Report ${entityName}`}>
      {confirmation ? (
        <div className="space-y-4 p-5 text-sm text-slate-600 dark:text-zinc-300">
          <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={18} /> {confirmation}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label htmlFor="reportCategory" className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-300">
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
            <label htmlFor="reportDetails" className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">
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
            <button type="button" onClick={handleClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
