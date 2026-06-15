import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from '../hooks/useRequireAccountAction';
import type { ReportTargetType } from '../services/types';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  targetType: ReportTargetType;
  targetId: string;
}

const REPORT_REASONS = [
  'Spam',
  'Abuse / Harassment',
  'Dangerous Advice',
  'False or Misleading Information',
  'Off-topic',
  'Duplicate',
  'Privacy / Personal Info',
  'Illegal or Prohibited Content',
  'Other',
];

export default function ReportModal({ isOpen, onClose, entityName, targetType, targetId }: ReportModalProps) {
  const { isBackendConfigured, services, user } = useAuth();
  const { toast } = useToast();
  const requireAccount = useRequireAccountAction();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !services || !user) return;
    services.reports.getOwn(user.id, targetType, targetId).then((existing) => {
      if (!existing) return;
      setReason(existing.reason);
      setNote(existing.note ?? '');
    }).catch((err) => console.warn('Existing report lookup failed', err));
  }, [isOpen, services, targetId, targetType, user]);

  const handleClose = () => {
    setReason('');
    setNote('');
    setMessage('');
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireAccount()) return;
    if (reason === 'Other' && note.trim().length < 5) {
      setMessage('Please add at least 5 characters for Other.');
      setIsSuccess(false);
      return;
    }
    setSubmitting(true);
    try {
      if (!isBackendConfigured || !services || !user) throw new Error('Report submission requires a configured Supabase session.');
      await services.reports.create(user.id, {
        targetType,
        targetId,
        targetName: entityName,
        reason,
        note: note.trim(),
      });
      toast('Report submitted. Admins will review it.', 'success');
      handleClose();
    } catch (err) {
      console.error('Report submission failed', err);
      setMessage(err instanceof Error ? err.message : 'Failed to submit report.');
      setIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Report ${entityName}`}>
      {isSuccess ? (
        <div className="space-y-4 p-5 text-sm text-slate-600 dark:text-zinc-300">
          <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={18} /> {message}
          </div>
          <button type="button" onClick={handleClose} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 dark:text-zinc-950 dark:hover:bg-emerald-400">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {message && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{message}</div>}
          <div>
            <label htmlFor="reportReason" className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-300">Reason</label>
            <select id="reportReason" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" required>
              <option value="">Select a reason...</option>
              {REPORT_REASONS.map((reportReason) => <option key={reportReason} value={reportReason}>{reportReason}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="reportNote" className="mb-1 block text-sm font-medium text-slate-700 dark:text-zinc-300">Note {reason === 'Other' ? '(Required for Other)' : '(Optional)'}</label>
            <textarea id="reportNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add context for moderators..." className="h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit Report'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
