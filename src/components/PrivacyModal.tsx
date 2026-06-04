import { Shield } from 'lucide-react';
import { Modal } from './ui/Modal';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy & Data"
      icon={<Shield size={20} className="text-emerald-500" />}
    >
      <div className="space-y-4 p-6 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
        <p>Your data is encrypted and never sold. You control your visibility.</p>
      </div>
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          onClick={onClose}
          className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
